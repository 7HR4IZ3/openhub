import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const repositoryValidator = v.object({
  _id: v.id("repositories"),
  _creationTime: v.number(),
  provider: v.string(),
  providerRepositoryId: v.string(),
  ownerLogin: v.string(),
  name: v.string(),
  fullName: v.string(),
  description: v.optional(v.string()),
  url: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  defaultBranch: v.optional(v.string()),
  primaryLanguage: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  openIssues: v.number(),
  licenseSpdxId: v.optional(v.string()),
  topics: v.array(v.string()),
  updatedAt: v.number(),
  indexedAt: v.number(),
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
});

export const byProviderRepository = query({
  args: { provider: v.string(), providerRepositoryId: v.string() },
  returns: v.union(repositoryValidator, v.null()),
  handler: async (ctx, args) => {
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", args.provider).eq("providerRepositoryId", args.providerRepositoryId))
      .unique();
    return repository?.visibility === "public" ? repository : null;
  },
});

export const byProviderRepositoryInternal = internalQuery({
  args: { provider: v.string(), providerRepositoryId: v.string() },
  returns: v.union(repositoryValidator, v.null()),
  handler: async (ctx, args) => {
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", args.provider).eq("providerRepositoryId", args.providerRepositoryId)).unique();
    return repository?.visibility === "public" ? repository : null;
  },
});

export const syncPublicGitHubRepository = action({
  args: { owner: v.string(), name: v.string() },
  returns: repositoryValidator,
  handler: async (ctx, args): Promise<Doc<"repositories">> => {
    if (await getAuthUserId(ctx) === null) throw new ConvexError("Sign in required");
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(args.owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(args.name)) {
      throw new ConvexError("Repository name is invalid");
    }
    const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}`;
    const token = process.env.GITHUB_PUBLIC_TOKEN;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "OpenHub",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new ConvexError("Public repository is unavailable");
    const body = await response.text();
    if (body.length > 100_000) throw new ConvexError("Repository response is too large");
    const metadata = asRecord(JSON.parse(body));
    const fullName = `${args.owner}/${args.name}`;
    if (metadata.private !== false || metadata.visibility !== "public"
      || metadata.disabled !== false || typeof metadata.full_name !== "string"
      || metadata.full_name.toLowerCase() !== fullName.toLowerCase()) {
      throw new ConvexError("Only public repositories can be followed");
    }
    const providerRepositoryId = text(metadata.node_id, 120);
    const ownerLogin = text(asRecord(metadata.owner).login, 39);
    const name = text(metadata.name, 100);
    const description = optionalText(metadata.description, 1000);
    const defaultBranch = optionalText(metadata.default_branch, 255);
    const primaryLanguage = optionalText(metadata.language, 100);
    const license = metadata.license === null ? undefined : optionalText(asRecord(metadata.license).spdx_id, 100);
    const topics = Array.isArray(metadata.topics) && metadata.topics.every((topic) => typeof topic === "string" && topic.length <= 50)
      ? [...new Set(metadata.topics as string[])].slice(0, 20)
      : [];
    const input = {
      providerRepositoryId, ownerLogin, name, fullName: text(metadata.full_name, 200),
      ...(description === undefined ? {} : { description }), url: `https://github.com/${encodeURIComponent(ownerLogin)}/${encodeURIComponent(name)}`,
      ...(defaultBranch === undefined ? {} : { defaultBranch }),
      ...(primaryLanguage === undefined ? {} : { primaryLanguage }),
      stars: count(metadata.stargazers_count), forks: count(metadata.forks_count),
      openIssues: count(metadata.open_issues_count),
      ...(license === undefined ? {} : { licenseSpdxId: license }), topics,
    };
    const repository = await ctx.runMutation(internal.repositories.persistPublic, input);
    await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId: repository._id });
    return repository;
  },
});

export const persistPublic = internalMutation({
  args: repositoryInputValidator,
  returns: repositoryValidator,
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", "github").eq("providerRepositoryId", args.providerRepositoryId)).unique();
    if (existing) {
      if (existing.visibility !== "public" || existing.fullName.toLowerCase() !== args.fullName.toLowerCase()) {
        throw new ConvexError("Repository is not available for public indexing");
      }
      await ctx.db.patch(existing._id, { ...args, provider: "github", visibility: "public", updatedAt: now, indexedAt: now });
      const updated = await ctx.db.get(existing._id);
      if (!updated) throw new ConvexError("Repository could not be refreshed");
      return updated;
    }
    const id = await ctx.db.insert("repositories", { ...args, provider: "github", visibility: "public", updatedAt: now, indexedAt: now });
    const repository = await ctx.db.get(id);
    if (!repository) throw new ConvexError("Repository could not be saved");
    return repository;
  },
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConvexError("Invalid repository response");
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) throw new ConvexError("Invalid repository response");
  return value;
}

function optionalText(value: unknown, maximum: number): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return text(value, maximum);
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 100_000_000) throw new ConvexError("Invalid repository response");
  return value;
}
