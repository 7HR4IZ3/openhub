import { getAuthUserId } from "@convex-dev/auth/server";
import type { FunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { githubSnapshotDocument } from "./reputation-schema";
import { decryptProviderToken } from "./provider-tokens";

const badgeDocument = v.object({
  kind: v.string(),
  label: v.string(),
  description: v.string(),
});

const reputationDocument = v.object({
  userId: v.id("users"),
  score: v.number(),
  sourcePosts: v.number(),
  reviewPosts: v.number(),
  technicalComments: v.number(),
  publicLists: v.number(),
  communitiesBuilt: v.number(),
  githubSnapshot: v.union(githubSnapshotDocument, v.null()),
  githubContributionStatus: v.union(v.literal("sampled"), v.literal("not_synced")),
  maintainerEndorsementCount: v.number(),
  badges: v.array(badgeDocument),
  calculatedAt: v.number(),
});

const endorsementTargetValidator = v.object({
  ownerLogin: v.string(),
  name: v.string(),
  providerRepositoryId: v.string(),
});
type Snapshot = Doc<"reputationSnapshots">;
type ReputationRefs = {
  accountForUser: FunctionReference<"query", "internal", { userId: Id<"users"> }, { login: string } | null>;
  latestGitHubSnapshot: FunctionReference<"query", "internal", { userId: Id<"users"> }, Snapshot | null>;
  persistGitHubSnapshot: FunctionReference<"mutation", "internal", {
    userId: Id<"users">;
    githubLogin: string;
    publicContributionCount: number;
    publicPushCount: number;
    publicPullRequestCount: number;
    publicReviewCount: number;
    publicIssueCount: number;
    evidenceUrl: string;
    observedAt: number;
    expiresAt: number;
  }, Snapshot>;
  endorsementTarget: FunctionReference<"query", "internal", { repositoryId: Id<"repositories"> }, InferEndorsementTarget | null>;
  persistEndorsement: FunctionReference<"mutation", "internal", {
    repositoryId: Id<"repositories">;
    endorsedUserId: Id<"users">;
    endorserId: Id<"users">;
    maintainerPermission: "admin" | "maintain";
    note?: string;
  }, boolean>;
};
type InferEndorsementTarget = { ownerLogin: string; name: string; providerRepositoryId: string };
type ProviderAccount = { login: string; providerUserId: string; encryptedTokenRef: string };
const refs = internal.reputation as unknown as ReputationRefs;
const providerAccountForUser = internal.auth.providerTokenForUser as unknown as FunctionReference<"query", "internal", { userId: Id<"users"> }, ProviderAccount | null>;

export const byUser = query({
  args: { userId: v.id("users") },
  returns: v.union(reputationDocument, v.null()),
  handler: async (ctx, args) => await getReputation(ctx, args.userId),
});

export const viewer = query({
  args: {},
  returns: v.union(reputationDocument, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId === null ? null : await getReputation(ctx, userId);
  },
});

export const endorse = action({
  args: { repositoryId: v.id("repositories"), endorsedUserId: v.id("users"), note: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const endorserId = await getAuthUserId(ctx);
    if (endorserId === null) throw new ConvexError("Sign in required");
    if (endorserId === args.endorsedUserId) throw new ConvexError("You cannot endorse yourself");
    const target = await ctx.runQuery(refs.endorsementTarget, { repositoryId: args.repositoryId });
    if (target === null) throw new ConvexError("Only a public GitHub repository can receive an endorsement");
    const account = await ctx.runQuery(providerAccountForUser, { userId: endorserId });
    if (account === null) throw new ConvexError("Reconnect GitHub before endorsing");
    const token = await decryptProviderToken(account.encryptedTokenRef);
    if (token === null) throw new ConvexError("Verified GitHub authorization is unavailable");

    const identity = record(await githubJson(token, "/user"));
    if (String(identity.id) !== account.providerUserId || typeof identity.login !== "string" || identity.login.toLowerCase() !== account.login.toLowerCase()) {
      throw new ConvexError("GitHub identity validation failed");
    }
    const repository = record(await githubJson(token, `/repos/${encodeURIComponent(target.ownerLogin)}/${encodeURIComponent(target.name)}`));
    const fullName = typeof repository.full_name === "string" ? repository.full_name : "";
    if (repository.private === true || repository.disabled === true || fullName.toLowerCase() !== `${target.ownerLogin}/${target.name}`.toLowerCase()) {
      throw new ConvexError("Repository access could not be verified");
    }
    const permissions = repository.permissions && typeof repository.permissions === "object" && !Array.isArray(repository.permissions)
      ? repository.permissions as Record<string, unknown>
      : null;
    let maintainerPermission: "admin" | "maintain" | null = permissions?.admin === true ? "admin" : permissions?.maintain === true ? "maintain" : null;
    if (maintainerPermission === null) {
      const permissionResponse = record(await githubJson(token, `/repos/${encodeURIComponent(target.ownerLogin)}/${encodeURIComponent(target.name)}/collaborators/${encodeURIComponent(account.login)}/permission`));
      const permission = permissionResponse.permission;
      maintainerPermission = permission === "admin" || permission === "maintain" ? permission : null;
    }
    if (maintainerPermission === null) throw new ConvexError("Only a verified repository maintainer can endorse");
    const note = args.note?.trim().slice(0, 500);
    return await ctx.runMutation(refs.persistEndorsement, {
      repositoryId: args.repositoryId,
      endorsedUserId: args.endorsedUserId,
      endorserId,
      maintainerPermission,
      ...(note ? { note } : {}),
    });
  },
});

export const endorsementTarget = internalQuery({
  args: { repositoryId: v.id("repositories") },
  returns: v.union(endorsementTargetValidator, v.null()),
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") return null;
    return { ownerLogin: repository.ownerLogin, name: repository.name, providerRepositoryId: repository.providerRepositoryId };
  },
});

export const persistEndorsement = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    endorsedUserId: v.id("users"),
    endorserId: v.id("users"),
    maintainerPermission: v.union(v.literal("admin"), v.literal("maintain")),
    note: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (args.endorsedUserId === args.endorserId) throw new ConvexError("You cannot endorse yourself");
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") throw new ConvexError("Repository is unavailable");
    if (await ctx.db.get(args.endorsedUserId) === null) throw new ConvexError("Developer is not available");
    const existing = await ctx.db.query("reputationEndorsements")
      .withIndex("by_repository_endorsed_user", (q) => q.eq("repositoryId", args.repositoryId).eq("endorsedUserId", args.endorsedUserId))
      .unique();
    if (existing) return false;
    await ctx.db.insert("reputationEndorsements", {
      repositoryId: args.repositoryId,
      endorsedUserId: args.endorsedUserId,
      endorserId: args.endorserId,
      maintainerPermission: args.maintainerPermission,
      ...(args.note ? { note: args.note.slice(0, 500) } : {}),
      createdAt: Date.now(),
    });
    return true;
  },
});

export const latestGitHubSnapshot = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(githubSnapshotDocument, v.null()),
  handler: async (ctx, args) => await ctx.db.query("reputationSnapshots")
    .withIndex("by_user_provider_observedAt", (q) => q.eq("userId", args.userId).eq("provider", "github"))
    .order("desc")
    .first(),
});

export const persistGitHubSnapshot = internalMutation({
  args: {
    userId: v.id("users"), githubLogin: v.string(), publicContributionCount: v.number(),
    publicPushCount: v.number(), publicPullRequestCount: v.number(), publicReviewCount: v.number(), publicIssueCount: v.number(),
    evidenceUrl: v.string(), observedAt: v.number(), expiresAt: v.number(),
  },
  returns: githubSnapshotDocument,
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("reputationSnapshots", { provider: "github", ...args });
    const snapshot = await ctx.db.get(id);
    if (!snapshot) throw new ConvexError("Contribution snapshot could not be stored");
    return snapshot;
  },
});

export const refreshGitHub = action({
  args: {},
  returns: githubSnapshotDocument,
  handler: async (ctx): Promise<Snapshot> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required");
    const account = await ctx.runQuery(refs.accountForUser, { userId });
    if (!account) throw new ConvexError("GitHub identity is not connected");
    const current = await ctx.runQuery(refs.latestGitHubSnapshot, { userId });
    if (current && current.expiresAt > Date.now() && current.githubLogin.toLowerCase() === account.login.toLowerCase()) return current;
    const evidenceUrl = `https://api.github.com/users/${encodeURIComponent(account.login)}/events/public`;
    const response = await fetch(`${evidenceUrl}?per_page=100`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" }, redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new ConvexError("GitHub contribution sample is unavailable");
    const raw = await response.text();
    if (raw.length > 500_000) throw new ConvexError("GitHub contribution sample is too large");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new ConvexError("GitHub contribution sample is invalid");
    let publicPushCount = 0;
    let publicPullRequestCount = 0;
    let publicReviewCount = 0;
    let publicIssueCount = 0;
    for (const event of parsed.slice(0, 100)) {
      if (!event || typeof event !== "object" || Array.isArray(event)) continue;
      const type = (event as { type?: unknown }).type;
      if (type === "PushEvent") publicPushCount += 1;
      else if (type === "PullRequestEvent") publicPullRequestCount += 1;
      else if (type === "PullRequestReviewEvent" || type === "PullRequestReviewCommentEvent") publicReviewCount += 1;
      else if (type === "IssuesEvent" || type === "IssueCommentEvent") publicIssueCount += 1;
    }
    const snapshot = await ctx.runMutation(refs.persistGitHubSnapshot, {
      userId, githubLogin: account.login,
      publicContributionCount: publicPushCount + publicPullRequestCount + publicReviewCount + publicIssueCount,
      publicPushCount, publicPullRequestCount, publicReviewCount, publicIssueCount,
      evidenceUrl, observedAt: Date.now(), expiresAt: Date.now() + 3_600_000,
    });
    return snapshot;
  },
});

export const accountForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ login: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const account = await ctx.db.query("providerAccounts").withIndex("by_user_provider", (q) => q.eq("userId", args.userId).eq("provider", "github")).unique();
    return account?.status === "active" ? { login: account.login } : null;
  },
});

async function githubJson(token: string, path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const raw = await response.text();
  if (raw.length > 500_000 || !response.ok) throw new ConvexError("GitHub authorization check failed");
  try { return JSON.parse(raw) as unknown; } catch { throw new ConvexError("GitHub authorization check failed"); }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConvexError("GitHub authorization check failed");
  return value as Record<string, unknown>;
}

async function getReputation(ctx: QueryCtx, userId: Id<"users">) {
  if (await ctx.db.get(userId) === null) return null;
  const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
  if (!profile) return null;
  const [posts, comments, lists, communities, snapshot, endorsements] = await Promise.all([
    ctx.db.query("posts").withIndex("by_author_created_at", (q) => q.eq("authorId", userId)).order("desc").take(201),
    ctx.db.query("comments").withIndex("by_author_created_at", (q) => q.eq("authorId", userId)).order("desc").take(201),
    ctx.db.query("lists").withIndex("by_ownerId", (q) => q.eq("ownerId", userId)).order("desc").take(101),
    ctx.db.query("communities").withIndex("by_ownerId", (q) => q.eq("ownerId", userId)).order("desc").take(101),
    ctx.db.query("reputationSnapshots").withIndex("by_user_provider_observedAt", (q) => q.eq("userId", userId).eq("provider", "github")).order("desc").first(),
    ctx.db.query("reputationEndorsements").withIndex("by_endorsed_user_createdAt", (q) => q.eq("endorsedUserId", userId)).order("desc").take(100),
  ]);
  const publicPosts = posts.filter((post) => post.visibility === "public");
  const sourcePosts = publicPosts.filter((post) => post.sourceReferenceId !== undefined || post.diffReferenceId !== undefined).length;
  const reviewPosts = publicPosts.filter((post) => post.type === "review").length;
  const technicalComments = comments.filter((comment) => comment.status === "visible").length;
  const publicLists = lists.filter((list) => list.visibility === "public").length;
  const communitiesBuilt = communities.filter((community) => community.visibility === "public").length;
  const githubScore = snapshot?.publicContributionCount ?? 0;
  const score = Math.min(1000, sourcePosts * 8 + reviewPosts * 6 + Math.min(technicalComments, 100) * 2 + publicLists * 4 + communitiesBuilt * 8 + Math.min(githubScore, 100) * 2);
  const badges = [];
  if (profile.githubLogin) badges.push({ kind: "github-identity", label: "GitHub identity", description: "Connected to a verified GitHub identity." });
  if (sourcePosts > 0) badges.push({ kind: "source-contributor", label: "Source contributor", description: "Published public discussions with immutable source context." });
  if (reviewPosts > 0) badges.push({ kind: "reviewer", label: "Reviewer", description: "Published at least one public code review." });
  if (publicLists > 0) badges.push({ kind: "curator", label: "Curator", description: "Created a public path through software." });
  if (communitiesBuilt > 0) badges.push({ kind: "community-builder", label: "Community builder", description: "Created a public OpenHub community." });
  if (technicalComments >= 10) badges.push({ kind: "conversation-guide", label: "Conversation guide", description: "Added sustained context to technical discussions." });
  const maintainerEndorsementCount = endorsements.length;
  if (maintainerEndorsementCount > 0) badges.push({ kind: "maintainer-endorsed", label: "Maintainer endorsed", description: "Received a verified endorsement from a repository maintainer." });
  return { userId, score: Math.min(1000, score + Math.min(maintainerEndorsementCount, 25) * 12), sourcePosts, reviewPosts, technicalComments, publicLists, communitiesBuilt, githubSnapshot: snapshot ?? null, githubContributionStatus: snapshot ? "sampled" as const : "not_synced" as const, maintainerEndorsementCount, badges, calculatedAt: Date.now() };
}
