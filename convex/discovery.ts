import { getAuthUserId } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";
import type { DataModelFromSchemaDefinition, FunctionReference, MutationBuilder, QueryBuilder } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import schema from "./schema";
import { discoveryTables, evidenceValidator, rankValidator } from "./discovery-schema";
import { calculateRepositoryRank, MAX_CANDIDATES, rankRepositories, SIGNAL_TTL_MS } from "../lib/discovery-ranking";

// The discovery tables are composed into the shared schema, while these local
// builder types keep the staged backend module type-safe until Convex regenerates
// its generated API from the deployed schema.
const groundworkSchema = defineSchema({ ...schema.tables, ...discoveryTables });
type DiscoveryModel = DataModelFromSchemaDefinition<typeof groundworkSchema>;
const discoveryQuery = query as QueryBuilder<DiscoveryModel, "public">;
const discoveryMutation = mutation as MutationBuilder<DiscoveryModel, "public">;
const discoveryInternalQuery = internalQuery as QueryBuilder<DiscoveryModel, "internal">;
const discoveryInternalMutation = internalMutation as MutationBuilder<DiscoveryModel, "internal">;
type Evidence = Infer<typeof evidenceValidator>;
const targetValidator = v.object({
  owner: v.string(), name: v.string(), providerRepositoryId: v.string(),
});
const repositoryInputValidator = v.object({
  providerRepositoryId: v.string(),
  ownerLogin: v.string(),
  name: v.string(),
  fullName: v.string(),
  description: v.optional(v.string()),
  url: v.string(),
  defaultBranch: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  openIssues: v.number(),
  licenseSpdxId: v.optional(v.string()),
  topics: v.array(v.string()),
  updatedAt: v.number(),
});
type RepositoryArgs = { repositoryId: Evidence["repositoryId"] };
type DiscoveryRefs = {
  publicTarget: FunctionReference<"query", "internal", RepositoryArgs, Infer<typeof targetValidator> | null>;
  beginRefresh: FunctionReference<"mutation", "internal", RepositoryArgs, number | null>;
  persistSignals: FunctionReference<"mutation", "internal", { evidence: Evidence; refreshStartedAt: number }, null>;
  upsertPublicRepository: FunctionReference<"mutation", "internal", Infer<typeof repositoryInputValidator>, Evidence["repositoryId"]>;
  refreshPublicSignals: FunctionReference<"action", "internal", RepositoryArgs, null>;
};
const refs: DiscoveryRefs = internal.discovery as unknown as DiscoveryRefs;

export const upsertPublicRepository = discoveryInternalMutation({
  args: repositoryInputValidator,
  returns: v.id("repositories"),
  handler: async (ctx, args): Promise<Id<"repositories">> => {
    const existing = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", "github").eq("providerRepositoryId", args.providerRepositoryId))
      .unique();
    const now = Date.now();
    const value = {
      provider: "github",
      providerRepositoryId: args.providerRepositoryId,
      ownerLogin: args.ownerLogin,
      name: args.name,
      fullName: args.fullName,
      ...(args.description === undefined ? {} : { description: args.description }),
      url: args.url,
      visibility: "public" as const,
      ...(args.defaultBranch === undefined ? {} : { defaultBranch: args.defaultBranch }),
      ...(args.primaryLanguage === undefined ? {} : { primaryLanguage: args.primaryLanguage }),
      stars: args.stars,
      forks: args.forks,
      openIssues: args.openIssues,
      ...(args.licenseSpdxId === undefined ? {} : { licenseSpdxId: args.licenseSpdxId }),
      topics: args.topics,
      updatedAt: args.updatedAt,
      indexedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return ctx.db.insert("repositories", value);
  },
});

export const publicTarget = discoveryInternalQuery({
  args: { repositoryId: v.id("repositories") },
  returns: v.union(targetValidator, v.null()),
  handler: async (ctx, { repositoryId }) => {
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.provider !== "github" || repository.visibility !== "public") return null;
    return { owner: repository.ownerLogin, name: repository.name, providerRepositoryId: repository.providerRepositoryId };
  },
});

export const beginRefresh = discoveryInternalMutation({
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
    // Monotonic generation rejects late responses from overlapping refreshes.
    const refreshStartedAt = Math.max(now, (existing?.refreshStartedAt ?? 0) + 1);
    const value = { repositoryId, visibility: "public" as const, available: false,
      refreshStartedAt, observedAt: 0, evidence: null, rank: null };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("discoverySignals", value);
    return refreshStartedAt;
  },
});

export const persistSignals = discoveryInternalMutation({
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

/** Trusted ingestion only: clients cannot supply evidence or trigger provider traffic. */
export const refreshPublicSignals = internalAction({
  args: { repositoryId: v.id("repositories") },
  returns: v.null(),
  handler: async (ctx, { repositoryId }) => {
    const refreshStartedAt = await ctx.runMutation(refs.beginRefresh, { repositoryId });
    if (refreshStartedAt === null) return null;
    const target = await ctx.runQuery(refs.publicTarget, { repositoryId });
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
        observedAt: Date.now(), evidenceUrl,
      };
      await ctx.runMutation(refs.persistSignals, { evidence, refreshStartedAt });
    } catch {
      // Unknown visibility, redirects, rate limits and malformed responses stay unavailable.
      // Provider payloads and credentials must not escape in client-facing errors.
      return null;
    }
    return null;
  },
});

export const observePublicRepository = action({
  args: { owner: v.string(), name: v.string() },
  returns: v.id("repositories"),
  handler: async (ctx, args): Promise<Id<"repositories">> => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(args.owner) || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(args.name)) {
      throw new ConvexError("Invalid repository name");
    }
    const token = process.env.GITHUB_PUBLIC_TOKEN;
    if (!token) throw new ConvexError("Public GitHub access is not configured");
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ConvexError("Repository is not available");
    const raw = await response.text();
    if (raw.length > 100_000) throw new ConvexError("Repository metadata is too large");
    const metadata = record(JSON.parse(raw));
    if (metadata.private !== false || metadata.visibility !== "public" || metadata.disabled === true) throw new ConvexError("Only public repositories can be discovered");
    const owner = record(metadata.owner);
    const nodeId = typeof metadata.node_id === "string" ? metadata.node_id : String(count(metadata.id));
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name : `${args.owner}/${args.name}`;
    const topics = Array.isArray(metadata.topics) ? metadata.topics.filter((topic): topic is string => typeof topic === "string" && topic.length <= 50).slice(0, 20) : [];
    const updatedAt = typeof metadata.updated_at === "string" ? Date.parse(metadata.updated_at) : NaN;
    const stars = count(metadata.stargazers_count);
    const forks = count(metadata.forks_count);
    const openIssues = count(metadata.open_issues_count);
    if (!Number.isFinite(updatedAt) || updatedAt > Date.now() || typeof owner.login !== "string" || typeof metadata.name !== "string" || typeof metadata.html_url !== "string") throw new ConvexError("Repository metadata is invalid");
    const repositoryId = await ctx.runMutation(refs.upsertPublicRepository, {
      providerRepositoryId: nodeId,
      ownerLogin: owner.login,
      name: metadata.name,
      fullName,
      ...(typeof metadata.description === "string" ? { description: metadata.description.slice(0, 2_000) } : {}),
      url: metadata.html_url,
      ...(typeof metadata.default_branch === "string" ? { defaultBranch: metadata.default_branch } : {}),
      ...(typeof metadata.language === "string" ? { primaryLanguage: metadata.language } : {}),
      stars,
      forks,
      openIssues,
      ...(metadata.license && typeof record(metadata.license).spdx_id === "string" ? { licenseSpdxId: record(metadata.license).spdx_id as string } : {}),
      topics,
      updatedAt,
    });
    await ctx.runAction(refs.refreshPublicSignals, { repositoryId });
    return repositoryId;
  },
});

export const byProviderRepository = discoveryQuery({
  args: { provider: v.string(), providerRepositoryId: v.string() },
  returns: v.union(v.id("repositories"), v.null()),
  handler: async (ctx, args) => {
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", args.provider).eq("providerRepositoryId", args.providerRepositoryId))
      .unique();
    return repository?.visibility === "public" ? repository._id : null;
  },
});

export const recommendations = discoveryQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({ evidence: evidenceValidator, ...rankValidator.fields })),
  handler: async (ctx, { limit = 20 }) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new ConvexError("Limit must be 1–30");
    const userId = await getAuthUserId(ctx);
    if (userId === null || !(await ctx.db.get(userId))) throw new ConvexError("Sign in required");
    const now = Date.now();
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
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
      if (!dismissal) candidates.push(row.evidence);
    }
    return rankRepositories(candidates, { calculatedAt: now, interests: profile?.interests ?? [], limit })
      .map((row) => ({ ...row, evidence: candidates.find((item) => item.repositoryId === row.evidence.repositoryId)! }));
  },
});

export const setDismissed = discoveryMutation({
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
