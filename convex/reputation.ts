import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

const REPUTATION_TTL_MS = 60 * 60 * 1000;

const reputationValidator = v.object({
  _id: v.id("contributorReputations"),
  _creationTime: v.number(),
  userId: v.id("users"),
  githubLogin: v.string(),
  githubUserId: v.string(),
  contributionCount: v.number(),
  publicRepositoryCount: v.number(),
  score: v.number(),
  observedAt: v.number(),
  evidenceUrl: v.string(),
  version: v.string(),
});

const achievementValidator = v.object({
  _id: v.id("achievements"),
  _creationTime: v.number(),
  userId: v.id("users"),
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  evidenceUrl: v.string(),
  awardedAt: v.number(),
});

export const forUser = query({
  args: { userId: v.id("users") },
  returns: v.union(reputationValidator, v.null()),
  handler: async (ctx, { userId }) => await ctx.db.query("contributorReputations")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).unique(),
});

export const achievementsForUser = query({
  args: { userId: v.id("users") },
  returns: v.array(achievementValidator),
  handler: async (ctx, { userId }) => await ctx.db.query("achievements")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).order("desc").take(50),
});

export const viewerIdentity = internalQuery({
  args: {},
  returns: v.union(v.object({ userId: v.id("users"), login: v.string() }), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
    if (!profile?.githubLogin) return null;
    return { userId, login: profile.githubLogin };
  },
});

export const viewerReputation = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(reputationValidator, v.null()),
  handler: async (ctx, { userId }) => await ctx.db.query("contributorReputations")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).unique(),
});

export const refreshViewer = action({
  args: {},
  returns: reputationValidator,
  handler: async (ctx): Promise<Doc<"contributorReputations">> => {
    if (await getAuthUserId(ctx) === null) throw new ConvexError("Sign in required");
    const identity = await ctx.runQuery(internal.reputation.viewerIdentity, {});
    if (identity === null) throw new ConvexError("Connect GitHub before refreshing reputation");
    const existing = await ctx.runQuery(internal.reputation.viewerReputation, { userId: identity.userId });
    if (existing && existing.observedAt > Date.now() - REPUTATION_TTL_MS) return existing;
    const token = process.env.GITHUB_PUBLIC_TOKEN;
    if (!token) throw new ConvexError("Reputation sync is not configured");
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "OpenHub",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        query: `query($login: String!) { user(login: $login) { id login contributionsCollection { contributionCalendar { totalContributions } } repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 1) { totalCount } } }`,
        variables: { login: identity.login },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ConvexError("GitHub reputation data is unavailable");
    const bodyText = await response.text();
    if (bodyText.length > 100_000) throw new ConvexError("GitHub reputation data is unavailable");
    let body: unknown;
    try {
      body = JSON.parse(bodyText) as unknown;
    } catch {
      throw new ConvexError("GitHub reputation data is unavailable");
    }
    const payload = record(body);
    if (Array.isArray(payload.errors) && payload.errors.length > 0) throw new ConvexError("GitHub reputation data is unavailable");
    const data = record(payload.data);
    const user = record(data.user);
    if (user.login !== identity.login || typeof user.id !== "string") throw new ConvexError("GitHub identity could not be verified");
    const contributions = record(record(user.contributionsCollection).contributionCalendar);
    const contributionCount = safeCount(contributions.totalContributions);
    const publicRepositoryCount = safeCount(record(user.repositories).totalCount);
    const score = calculateReputationScore(contributionCount, publicRepositoryCount);
    const evidenceUrl = `https://github.com/${encodeURIComponent(identity.login)}?tab=overview`;
    return await ctx.runMutation(internal.reputation.persist, {
      userId: identity.userId,
      githubLogin: identity.login,
      githubUserId: user.id,
      contributionCount,
      publicRepositoryCount,
      score,
      observedAt: Date.now(),
      evidenceUrl,
      version: "github-contributions-v1",
    });
  },
});

export const persist = internalMutation({
  args: {
    userId: v.id("users"), githubLogin: v.string(), githubUserId: v.string(),
    contributionCount: v.number(), publicRepositoryCount: v.number(), score: v.number(),
    observedAt: v.number(), evidenceUrl: v.string(), version: v.string(),
  },
  returns: reputationValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("contributorReputations").withIndex("by_userId", (q) => q.eq("userId", args.userId)).unique();
    let id: Id<"contributorReputations">;
    if (existing) {
      await ctx.db.patch(existing._id, args);
      id = existing._id;
    } else {
      id = await ctx.db.insert("contributorReputations", args);
    }
    const contributionBadge = await ctx.db.query("achievements").withIndex("by_userId_and_slug", (q) => q.eq("userId", args.userId).eq("slug", "public-contributor")).unique();
    if (args.contributionCount >= 10 && !contributionBadge) {
      await ctx.db.insert("achievements", {
        userId: args.userId,
        slug: "public-contributor",
        title: "Public contributor",
        description: "Has a verified public GitHub contribution history.",
        evidenceUrl: args.evidenceUrl,
        awardedAt: args.observedAt,
      });
    }
    const repositoryBadge = await ctx.db.query("achievements").withIndex("by_userId_and_slug", (q) => q.eq("userId", args.userId).eq("slug", "repository-builder")).unique();
    if (args.publicRepositoryCount >= 3 && !repositoryBadge) {
      await ctx.db.insert("achievements", {
        userId: args.userId,
        slug: "repository-builder",
        title: "Repository builder",
        description: "Maintains at least three public GitHub repositories.",
        evidenceUrl: args.evidenceUrl,
        awardedAt: args.observedAt,
      });
    }
    const reputation = await ctx.db.get(id);
    if (!reputation) throw new ConvexError("Reputation could not be saved");
    return reputation;
  },
});

function calculateReputationScore(contributions: number, repositories: number) {
  return Math.round(Math.min(100, Math.log10(1 + contributions) * 18 + Math.log10(1 + repositories) * 8) * 100) / 100;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConvexError("Invalid GitHub response");
  return value as Record<string, unknown>;
}

function safeCount(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 10_000_000) throw new ConvexError("Invalid GitHub response");
  return value;
}
