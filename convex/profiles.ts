import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { decryptProviderToken } from "./provider-tokens";

const profileValidator = v.object({
  _id: v.id("profiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  handle: v.string(),
  displayName: v.string(),
  bio: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  githubLogin: v.optional(v.string()),
  githubProfileUrl: v.optional(v.string()),
  interests: v.array(v.string()),
  portfolioUrl: v.optional(v.string()),
  availability: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const repositoryPreviewValidator = v.object({
  _id: v.id("repositories"),
  providerRepositoryId: v.string(),
  ownerLogin: v.string(),
  name: v.string(),
  fullName: v.string(),
  description: v.union(v.string(), v.null()),
  url: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  defaultBranch: v.union(v.string(), v.null()),
  primaryLanguage: v.union(v.string(), v.null()),
  stars: v.number(),
  forks: v.number(),
  openIssues: v.number(),
  licenseSpdxId: v.union(v.string(), v.null()),
  topics: v.array(v.string()),
  updatedAt: v.number(),
});

const importedRepositoryValidator = v.object({
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
});

export const viewer = query({
  args: {},
  returns: v.union(profileValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const ensure = mutation({
  args: {},
  returns: profileValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    if (existing !== null) return existing;

    const user = await ctx.db.get(userId);
    if (user === null) throw new Error("User was deleted");

    const displayName = user.name ?? "OpenHub developer";
    const baseHandle = normalizeHandle(displayName);
    let handle = baseHandle;
    let suffix = 2;
    while (
      (await ctx.db
        .query("profiles")
        .withIndex("by_handle", (q) => q.eq("handle", handle))
        .unique()) !== null
    ) {
      handle = `${baseHandle}-${suffix}`;
      suffix += 1;
    }

    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      handle,
      displayName,
      avatarUrl: user.image,
      interests: [],
      createdAt: now,
      updatedAt: now,
    });

    const profile = await ctx.db.get(profileId);
    if (profile === null) throw new Error("Profile could not be created");
    return profile;
  },
});

export const update = mutation({
  args: { displayName: v.string(), bio: v.string(), interests: v.array(v.string()),
    portfolioUrl: v.string(), availability: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (!args.displayName.trim() || args.displayName.length > 100 || args.bio.length > 4000 ||
        args.interests.length > 30 || args.interests.some(x => x.length > 60) || args.availability.length > 200)
      throw new Error("Profile fields exceed supported sizes");
    if (args.portfolioUrl) {
      const url = new URL(args.portfolioUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an HTTP or HTTPS portfolio URL");
    }
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", q => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("Create your profile first");
    await ctx.db.patch(profile._id, { ...args, displayName: args.displayName.trim(),
      interests: [...new Set(args.interests.map(x => x.trim().toLowerCase()).filter(Boolean))], updatedAt: Date.now() });
    return null;
  },
});

export const byHandle = query({
  args: { handle: v.string() }, returns: v.union(profileValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.query("profiles")
    .withIndex("by_handle", q => q.eq("handle", args.handle.toLowerCase())).unique(),
});

/**
 * Public profile repository reads deliberately return public repositories only.
 * Private imported repositories are available to the owner through the provider
 * route, never through a public profile query.
 */
export const repositories = query({
  args: { githubLogin: v.string(), limit: v.optional(v.number()) },
  returns: v.array(repositoryPreviewValidator),
  handler: async (ctx, args) => {
    const githubLogin = args.githubLogin.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(githubLogin)) return [];
    const limit = clampLimit(args.limit);
    const rows = await ctx.db
      .query("repositories")
      .withIndex("by_provider_owner_updatedAt", (q) =>
        q.eq("provider", "github").eq("ownerLogin", githubLogin),
      )
      .order("desc")
      .take(Math.min(100, limit * 3));
    return rows
      .filter((repository) => repository.visibility === "public")
      .slice(0, limit)
      .map(toRepositoryPreview);
  },
});

export const syncRepositories = action({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required");
    const account = await ctx.runQuery(internal.auth.providerTokenForUser, { userId });
    if (account === null) throw new ConvexError("GitHub access is not connected");
    const token = await decryptProviderToken(account.encryptedTokenRef);
    if (token === null) throw new ConvexError("Repository import is not available in this deployment");

    const repositories: Array<InferImportedRepository> = [];
    for (let page = 1; page <= 3 && repositories.length < 250; page += 1) {
      const response = await githubJson(token, `/user/repos?visibility=all&affiliation=owner&sort=updated&direction=desc&per_page=100&page=${page}`);
      if (!Array.isArray(response)) throw new ConvexError("GitHub repository import returned invalid data");
      for (const value of response) {
        const normalized = normalizeImportedRepository(value);
        if (normalized !== null) repositories.push(normalized);
      }
      if (response.length < 100) break;
    }

    return await ctx.runMutation(internal.profiles.persistImportedRepositories, { userId, repositories });
  },
});

type InferImportedRepository = {
  providerRepositoryId: string;
  ownerLogin: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  visibility: "public" | "private";
  defaultBranch?: string;
  primaryLanguage?: string;
  stars: number;
  forks: number;
  openIssues: number;
  licenseSpdxId?: string;
  topics: string[];
  updatedAt: number;
};

export const persistImportedRepositories = internalMutation({
  args: { userId: v.id("users"), repositories: v.array(importedRepositoryValidator) },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.userId) === null) throw new ConvexError("User is not available");
    let persisted = 0;
    const now = Date.now();
    for (const repository of args.repositories.slice(0, 250)) {
      const existing = await ctx.db
        .query("repositories")
        .withIndex("by_provider_repository", (q) =>
          q.eq("provider", "github").eq("providerRepositoryId", repository.providerRepositoryId),
        )
        .unique();
      const value = {
        provider: "github",
        providerRepositoryId: repository.providerRepositoryId,
        ownerUserId: args.userId,
        ownerLogin: repository.ownerLogin,
        name: repository.name,
        fullName: repository.fullName,
        ...(repository.description === undefined ? {} : { description: repository.description }),
        url: repository.url,
        visibility: repository.visibility,
        ...(repository.defaultBranch === undefined ? {} : { defaultBranch: repository.defaultBranch }),
        ...(repository.primaryLanguage === undefined ? {} : { primaryLanguage: repository.primaryLanguage }),
        stars: repository.stars,
        forks: repository.forks,
        openIssues: repository.openIssues,
        ...(repository.licenseSpdxId === undefined ? {} : { licenseSpdxId: repository.licenseSpdxId }),
        topics: repository.topics,
        updatedAt: repository.updatedAt,
        indexedAt: now,
      } as const;
      if (existing) await ctx.db.patch(existing._id, value);
      else await ctx.db.insert("repositories", value);
      persisted += 1;
    }
    return persisted;
  },
});

function toRepositoryPreview(repository: Doc<"repositories">) {
  return {
    _id: repository._id,
    providerRepositoryId: repository.providerRepositoryId,
    ownerLogin: repository.ownerLogin,
    name: repository.name,
    fullName: repository.fullName,
    description: repository.description ?? null,
    url: repository.url,
    visibility: repository.visibility,
    defaultBranch: repository.defaultBranch ?? null,
    primaryLanguage: repository.primaryLanguage ?? null,
    stars: repository.stars,
    forks: repository.forks,
    openIssues: repository.openIssues,
    licenseSpdxId: repository.licenseSpdxId ?? null,
    topics: repository.topics,
    updatedAt: repository.updatedAt,
  };
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(Math.floor(value), 30));
}

async function githubJson(token: string, path: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "OpenHub",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  if (raw.length > 3_000_000) throw new ConvexError("GitHub response is too large");
  if (!response.ok) throw new ConvexError("GitHub repository import failed");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ConvexError("GitHub repository import returned invalid data");
  }
}

function normalizeImportedRepository(value: unknown): InferImportedRepository | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const owner = row.owner && typeof row.owner === "object" && !Array.isArray(row.owner)
    ? row.owner as Record<string, unknown>
    : null;
  const providerRepositoryId = typeof row.node_id === "string" ? row.node_id : typeof row.id === "number" ? String(row.id) : null;
  const ownerLogin = owner && typeof owner.login === "string" ? owner.login : null;
  const name = typeof row.name === "string" ? row.name : null;
  const fullName = typeof row.full_name === "string" ? row.full_name : null;
  const url = typeof row.html_url === "string" ? row.html_url : null;
  const updatedAt = typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN;
  if (!providerRepositoryId || !ownerLogin || !name || !fullName || !url || !Number.isFinite(updatedAt)) return null;
  const license = row.license && typeof row.license === "object" && !Array.isArray(row.license)
    ? row.license as Record<string, unknown>
    : null;
  const topics = Array.isArray(row.topics)
    ? row.topics.filter((topic): topic is string => typeof topic === "string" && topic.length > 0 && topic.length <= 50).slice(0, 50)
    : [];
  return {
    providerRepositoryId,
    ownerLogin,
    name,
    fullName,
    ...(typeof row.description === "string" ? { description: row.description.slice(0, 2_000) } : {}),
    url,
    visibility: row.private === true ? "private" : "public",
    ...(typeof row.default_branch === "string" ? { defaultBranch: row.default_branch } : {}),
    ...(typeof row.language === "string" ? { primaryLanguage: row.language } : {}),
    stars: safeCount(row.stargazers_count),
    forks: safeCount(row.forks_count),
    openIssues: safeCount(row.open_issues_count),
    ...(license && typeof license.spdx_id === "string" ? { licenseSpdxId: license.spdx_id } : {}),
    topics,
    updatedAt,
  };
}

function safeCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function normalizeHandle(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return normalized || "developer";
}
