import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Infer } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { evidenceValidator } from "./discovery-schema";
import { calculateRepositoryRank, MAX_CANDIDATES, rankRepositories, SIGNAL_TTL_MS } from "../lib/discovery-ranking";

type Evidence = Infer<typeof evidenceValidator>;
const targetValidator = v.object({
  owner: v.string(), name: v.string(), providerRepositoryId: v.string(),
});

const endorserIdentityValidator = v.object({
  userId: v.id("users"),
  githubUserId: v.string(),
  login: v.string(),
});

const publicEndorsementValidator = v.object({
  _id: v.id("discoveryEndorsements"),
  _creationTime: v.number(),
  repositoryId: v.id("repositories"),
  githubUserId: v.string(),
  githubLogin: v.string(),
  permission: v.union(v.literal("write"), v.literal("maintain"), v.literal("admin")),
  verifiedAt: v.number(),
  expiresAt: v.number(),
  evidenceUrl: v.string(),
  credentialKind: v.union(v.literal("owner_public"), v.literal("user_scoped")),
  createdAt: v.number(),
});

export const publicTarget = internalQuery({
  args: { repositoryId: v.id("repositories") },
  returns: v.union(targetValidator, v.null()),
  handler: async (ctx, { repositoryId }) => {
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") return null;
    return { owner: repository.ownerLogin, name: repository.name, providerRepositoryId: repository.providerRepositoryId };
  },
});

export const endorserIdentity = internalQuery({
  args: {},
  returns: v.union(endorserIdentityValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const account = await ctx.db.query("providerAccounts")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", "github")).unique();
    if (!account || account.status !== "active") return null;
    return { userId, githubUserId: account.providerUserId, login: account.login };
  },
});

export const staleRepositories = internalQuery({
  args: {},
  returns: v.array(v.id("repositories")),
  handler: async (ctx) => {
    const cutoff = Date.now() - SIGNAL_TTL_MS;
    const repositories = await ctx.db.query("repositories")
      .withIndex("by_visibility_updated", (q) => q.eq("visibility", "public"))
      .order("desc").take(50);
    const result: Array<import("./_generated/dataModel").Id<"repositories">> = [];
    for (const repository of repositories) {
      if (repository.provider !== "github" || result.length >= 10) continue;
      const signal = await ctx.db.query("discoverySignals")
        .withIndex("by_repositoryId", (q) => q.eq("repositoryId", repository._id)).unique();
      if (!signal || signal.observedAt <= cutoff || !signal.available) result.push(repository._id);
    }
    return result;
  },
});

export const beginRefresh = internalMutation({
  args: { repositoryId: v.id("repositories") },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { repositoryId }) => {
    const existing = await ctx.db.query("discoverySignals")
      .withIndex("by_repositoryId", (q) => q.eq("repositoryId", repositoryId)).unique();
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.visibility !== "public" || repository.provider !== "github") {
      if (existing) await ctx.db.patch(existing._id, { available: false, evidence: null, rank: null });
      return null;
    }
    const now = Date.now();
    if (existing?.available && existing.observedAt > now - SIGNAL_TTL_MS) return null;
    if (existing && !existing.available && existing.refreshStartedAt > now - 30_000) return null;
    // Monotonic generation rejects late responses from overlapping refreshes.
    const refreshStartedAt = Math.max(now, (existing?.refreshStartedAt ?? 0) + 1);
    const value = { repositoryId, visibility: "public" as const, available: false,
      refreshStartedAt, observedAt: 0, evidence: null, rank: null };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("discoverySignals", value);
    return refreshStartedAt;
  },
});

export const persistSignals = internalMutation({
  args: { evidence: evidenceValidator, refreshStartedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { evidence, refreshStartedAt }) => {
    const existing = await ctx.db.query("discoverySignals")
      .withIndex("by_repositoryId", (q) => q.eq("repositoryId", evidence.repositoryId)).unique();
    const repository = await ctx.db.get(evidence.repositoryId);
    if (!existing || existing.refreshStartedAt !== refreshStartedAt) return null;
    if (!repository || repository.visibility !== "public" || repository.provider !== "github"
      || `${repository.ownerLogin}/${repository.name}`.toLowerCase() !== evidence.fullName.toLowerCase()) return null;
    const now = Date.now();
    if (!Number.isFinite(evidence.observedAt) || evidence.observedAt > now
      || evidence.observedAt < now - SIGNAL_TTL_MS) throw new ConvexError("Invalid observation time");
    await ctx.db.patch(existing._id, { evidence, observedAt: evidence.observedAt,
      available: true, rank: calculateRepositoryRank(evidence, now) });
    return null;
  },
});

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid GitHub metadata");
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid GitHub count");
  return value;
}
function nullableText(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 200) throw new Error("Invalid GitHub text");
  return value;
}

function optionalNullableText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return nullableText(value) ?? undefined;
}

/** Trusted ingestion only: clients cannot supply evidence or trigger provider traffic. */
export const refreshPublicSignals = internalAction({
  args: { repositoryId: v.id("repositories") },
  returns: v.null(),
  handler: async (ctx, { repositoryId }) => {
    const refreshStartedAt = await ctx.runMutation(internal.discovery.beginRefresh, { repositoryId });
    if (refreshStartedAt === null) return null;
    const target = await ctx.runQuery(internal.discovery.publicTarget, { repositoryId });
    if (!target) return null;
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(target.owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(target.name)) return null;
    const evidenceUrl = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`;
    try {
      // Anonymous request intentionally cannot retrieve private repository metadata.
      // Never use GITHUB_PUBLIC_TOKEN as proof of a user's repository permissions.
      const response = await fetch(evidenceUrl, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" },
        redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const body = await response.text();
      if (body.length > 100_000) return null;
      const metadata = record(JSON.parse(body));
      if (metadata.private !== false || metadata.visibility !== "public" || metadata.disabled !== false) return null;
      if (metadata.node_id !== target.providerRepositoryId && String(count(metadata.id)) !== target.providerRepositoryId) return null;
      const fullName = `${target.owner}/${target.name}`;
      if (typeof metadata.full_name !== "string" || metadata.full_name.toLowerCase() !== fullName.toLowerCase()) return null;
      if (typeof metadata.archived !== "boolean" || typeof metadata.fork !== "boolean") return null;
      if (!Array.isArray(metadata.topics) || metadata.topics.length > 20
        || !metadata.topics.every((topic) => typeof topic === "string" && topic.length <= 50)) return null;
      const pushedAt = metadata.pushed_at === null ? null
        : typeof metadata.pushed_at === "string" ? Date.parse(metadata.pushed_at) : NaN;
      if (pushedAt !== null && (!Number.isFinite(pushedAt) || pushedAt > Date.now())) return null;
      const evidence: Evidence = {
        repositoryId, owner: target.owner, fullName, language: nullableText(metadata.language),
        topics: metadata.topics as string[], stars: count(metadata.stargazers_count), forks: count(metadata.forks_count),
        openIssuesAndPullRequests: count(metadata.open_issues_count), pushedAt,
        archived: metadata.archived, isFork: metadata.fork,
        license: metadata.license === null ? null : nullableText(record(metadata.license).spdx_id),
        documentation: {
          descriptionPresent: typeof metadata.description === "string" && metadata.description.trim().length > 0,
          homepagePresent: typeof metadata.homepage === "string" && metadata.homepage.trim().length > 0,
          wikiEnabled: metadata.has_wiki === true,
          issuesEnabled: metadata.has_issues === true,
          discussionsEnabled: metadata.has_discussions === true,
          repositorySizeKb: metadata.size === undefined ? 0 : count(metadata.size),
        },
        observedAt: Date.now(), evidenceUrl,
      };
      await ctx.runMutation(internal.discovery.persistSignals, { evidence, refreshStartedAt });
    } catch {
      // Unknown visibility, redirects, rate limits and malformed responses stay unavailable.
      // Provider payloads and credentials must not escape in client-facing errors.
      return null;
    }
    return null;
  },
});

export const refreshStaleSignals = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const repositories = await ctx.runQuery(internal.discovery.staleRepositories, {});
    for (const repositoryId of repositories) {
      await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId });
    }
    return null;
  },
});

export const refreshPublicCandidates = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const token = process.env.GITHUB_PUBLIC_TOKEN;
    if (!token) return null;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const query = encodeURIComponent(`is:public archived:false fork:false pushed:>=${since}`);
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=20`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28", Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const body = await response.text();
      if (body.length > 500_000) return null;
      const payload = record(JSON.parse(body));
      if (!Array.isArray(payload.items)) return null;
      for (const itemValue of payload.items.slice(0, 12)) {
        try {
          const item = record(itemValue);
          const owner = record(item.owner);
          const ownerLogin = typeof owner.login === "string" ? owner.login : "";
          const name = typeof item.name === "string" ? item.name : "";
          const fullName = typeof item.full_name === "string" ? item.full_name : "";
          if (item.private !== false || item.visibility !== "public" || item.archived !== false || item.fork !== false
            || typeof item.node_id !== "string" || !/^[a-zA-Z0-9-]{1,39}$/.test(ownerLogin)
            || !/^[a-zA-Z0-9_.-]{1,100}$/.test(name) || fullName.toLowerCase() !== `${ownerLogin}/${name}`.toLowerCase()) continue;
          const description = optionalNullableText(item.description);
          const defaultBranch = optionalNullableText(item.default_branch);
          const language = optionalNullableText(item.language);
          const license = item.license === null || item.license === undefined
            ? undefined : optionalNullableText(record(item.license).spdx_id);
          const topics = Array.isArray(item.topics) && item.topics.every((topic) => typeof topic === "string" && topic.length <= 50)
            ? [...new Set(item.topics as string[])].slice(0, 20) : [];
          const repository = await ctx.runMutation(internal.repositories.persistPublic, {
            providerRepositoryId: item.node_id.slice(0, 120), ownerLogin, name, fullName,
            ...(description === undefined ? {} : { description }),
            url: `https://github.com/${encodeURIComponent(ownerLogin)}/${encodeURIComponent(name)}`,
            ...(defaultBranch === undefined ? {} : { defaultBranch }),
            ...(language === undefined ? {} : { primaryLanguage: language }),
            stars: count(item.stargazers_count), forks: count(item.forks_count), openIssues: count(item.open_issues_count),
            ...(license === undefined ? {} : { licenseSpdxId: license }), topics,
          });
          await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId: repository._id });
        } catch {
          // One malformed or deleted search result must not stop the batch.
          continue;
        }
      }
    } catch {
      return null;
    }
    return null;
  },
});

export const refreshRepositorySignals = action({
  args: { repositoryId: v.id("repositories") },
  returns: v.null(),
  handler: async (ctx, { repositoryId }) => {
    if (await getAuthUserId(ctx) === null) throw new ConvexError("Sign in required");
    await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId });
    return null;
  },
});

const rankedRepositoryValidator = v.object({
  evidence: evidenceValidator,
  score: v.number(),
  calculatedAt: v.number(),
  version: v.string(),
  explanations: v.array(v.string()),
});

export const recommendations = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(rankedRepositoryValidator),
  handler: async (ctx, { limit = 20 }) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new ConvexError("Limit must be 1-30");
    const userId = await getAuthUserId(ctx);
    if (userId === null || !(await ctx.db.get(userId))) throw new ConvexError("Sign in required");
    const now = Date.now();
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
    const follows = await ctx.db.query("follows").withIndex("by_userId", (q) => q.eq("userId", userId)).take(100);
    const followedRepositories = new Set(follows.flatMap((follow) => follow.target.kind === "repo" ? [follow.target.repositoryId] : []));
    const followedInterests = follows.flatMap((follow) => follow.target.kind === "topic" || follow.target.kind === "category" ? [follow.target.slug] : []);
    const rows = await ctx.db.query("discoverySignals")
      .withIndex("by_visibility_and_available_and_observedAt", (q) => q.eq("visibility", "public")
        .eq("available", true).gt("observedAt", now - SIGNAL_TTL_MS))
      .order("desc").take(MAX_CANDIDATES);
    const candidates: Evidence[] = [];
    for (const row of rows) {
      const repository = await ctx.db.get(row.repositoryId);
      if (!repository || repository.visibility !== "public" || repository.provider !== "github" || !row.evidence
        || `${repository.ownerLogin}/${repository.name}`.toLowerCase() !== row.evidence.fullName.toLowerCase()) continue;
      const dismissal = await ctx.db.query("discoveryDismissals")
        .withIndex("by_userId_and_repositoryId", (q) => q.eq("userId", userId).eq("repositoryId", row.repositoryId)).unique();
      if (!dismissal && !followedRepositories.has(row.repositoryId)) candidates.push(row.evidence);
    }
    return rankRepositories(candidates, { calculatedAt: now, interests: [...(profile?.interests ?? []), ...followedInterests], limit })
      .map((row) => ({ ...row, evidence: candidates.find((item) => item.repositoryId === row.evidence.repositoryId)! }));
  },
});

export const trendingRepositories = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(rankedRepositoryValidator),
  handler: async (ctx, { limit = 20 }) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new ConvexError("Limit must be 1-30");
    const now = Date.now();
    const rows = await ctx.db.query("discoverySignals")
      .withIndex("by_visibility_and_available_and_observedAt", (q) => q.eq("visibility", "public")
        .eq("available", true).gt("observedAt", now - SIGNAL_TTL_MS))
      .order("desc").take(MAX_CANDIDATES);
    const candidates: Evidence[] = [];
    for (const row of rows) {
      const repository = await ctx.db.get(row.repositoryId);
      if (!repository || repository.visibility !== "public" || repository.provider !== "github" || !row.evidence
        || `${repository.ownerLogin}/${repository.name}`.toLowerCase() !== row.evidence.fullName.toLowerCase()) continue;
      candidates.push(row.evidence);
    }
    return rankRepositories(candidates, { calculatedAt: now, limit })
      .map((row) => ({ ...row, evidence: candidates.find((item) => item.repositoryId === row.evidence.repositoryId)! }));
  },
});

export const signalsForRepository = query({
  args: { repositoryId: v.id("repositories") },
  returns: v.union(rankedRepositoryValidator, v.null()),
  handler: async (ctx, { repositoryId }) => {
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") return null;
    const signal = await ctx.db.query("discoverySignals")
      .withIndex("by_repositoryId", (q) => q.eq("repositoryId", repositoryId)).unique();
    if (!signal?.available || !signal.evidence || signal.observedAt <= Date.now() - SIGNAL_TTL_MS) return null;
    if (`${repository.ownerLogin}/${repository.name}`.toLowerCase() !== signal.evidence.fullName.toLowerCase()) return null;
    const rank = signal.rank ?? calculateRepositoryRank(signal.evidence, Date.now());
    return { evidence: signal.evidence, ...rank };
  },
});

export const setDismissed = mutation({
  args: { repositoryId: v.id("repositories"), dismissed: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { repositoryId, dismissed }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null || !(await ctx.db.get(userId))) throw new ConvexError("Sign in required");
    const existing = await ctx.db.query("discoveryDismissals")
      .withIndex("by_userId_and_repositoryId", (q) => q.eq("userId", userId).eq("repositoryId", repositoryId)).unique();
    if (!dismissed) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.visibility !== "public" || repository.provider !== "github") throw new ConvexError("Repository unavailable");
    if (!existing) await ctx.db.insert("discoveryDismissals", { userId, repositoryId, createdAt: Date.now() });
    return null;
  },
});

export const endorsementsForRepository = query({
  args: { repositoryId: v.id("repositories") },
  returns: v.array(publicEndorsementValidator),
  handler: async (ctx, { repositoryId }) => {
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") return [];
    return await ctx.db.query("discoveryEndorsements")
      .withIndex("by_repositoryId_and_expiresAt", (q) => q.eq("repositoryId", repositoryId).gt("expiresAt", Date.now()))
      .order("desc")
      .take(20)
      .then((rows) => rows.map(({ userId: _userId, ...endorsement }) => endorsement));
  },
});

export const endorseRepository = action({
  args: { repositoryId: v.id("repositories") },
  returns: v.null(),
  handler: async (ctx, { repositoryId }) => {
    if (await getAuthUserId(ctx) === null) throw new ConvexError("Sign in required");
    const identity = await ctx.runQuery(internal.discovery.endorserIdentity, {});
    const target = await ctx.runQuery(internal.discovery.publicTarget, { repositoryId });
    if (!identity || !target) throw new ConvexError("Verified GitHub identity is required");
    if (identity.login.toLowerCase() !== target.owner.toLowerCase()) {
      throw new ConvexError("Only the verified repository owner can endorse this project");
    }
    const token = process.env.GITHUB_PUBLIC_TOKEN;
    if (!token) throw new ConvexError("Maintainer verification is not configured");
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "OpenHub",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ConvexError("GitHub maintainer verification is unavailable");
    const body = await response.text();
    if (body.length > 100_000) throw new ConvexError("GitHub maintainer verification is unavailable");
    let metadata: Record<string, unknown>;
    try {
      metadata = record(JSON.parse(body));
    } catch {
      throw new ConvexError("GitHub maintainer verification is unavailable");
    }
    const owner = record(metadata.owner);
    if (metadata.private !== false || metadata.visibility !== "public" || metadata.node_id !== target.providerRepositoryId
      || typeof owner.login !== "string" || owner.login.toLowerCase() !== identity.login.toLowerCase()) {
      throw new ConvexError("The signed-in GitHub account is not the current public repository owner");
    }
    const now = Date.now();
    await ctx.runMutation(internal.discovery.persistEndorsement, {
      repositoryId,
      userId: identity.userId,
      githubUserId: identity.githubUserId,
      githubLogin: identity.login,
      permission: "admin",
      verifiedAt: now,
      expiresAt: now + 30 * 86_400_000,
      evidenceUrl: `https://github.com/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`,
      credentialKind: "owner_public",
      createdAt: now,
    });
    return null;
  },
});

export const persistEndorsement = internalMutation({
  args: {
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
    githubUserId: v.string(),
    githubLogin: v.string(),
    permission: v.union(v.literal("write"), v.literal("maintain"), v.literal("admin")),
    verifiedAt: v.number(),
    expiresAt: v.number(),
    evidenceUrl: v.string(),
    credentialKind: v.union(v.literal("owner_public"), v.literal("user_scoped")),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("discoveryEndorsements")
      .withIndex("by_repositoryId_and_userId", (q) => q.eq("repositoryId", args.repositoryId).eq("userId", args.userId)).unique();
    if (existing) await ctx.db.patch(existing._id, args);
    else await ctx.db.insert("discoveryEndorsements", args);
    return null;
  },
});
