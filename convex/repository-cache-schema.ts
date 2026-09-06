import { defineTable } from "convex/server";
import { v } from "convex/values";

export const repositoryCacheKind = v.union(
  v.literal("repository"),
  v.literal("commit"),
  v.literal("tree"),
  v.literal("file"),
);

export const repositoryCacheDocument = v.object({
  _id: v.id("repositoryCacheEntries"),
  _creationTime: v.number(),
  scopeKey: v.string(),
  ownerUserId: v.optional(v.id("users")),
  provider: v.literal("github"),
  repositoryFullName: v.string(),
  kind: repositoryCacheKind,
  ref: v.string(),
  pathKey: v.string(),
  commitSha: v.optional(v.string()),
  payload: v.string(),
  etag: v.optional(v.string()),
  lastModified: v.optional(v.string()),
  fetchedAt: v.number(),
  expiresAt: v.number(),
  staleUntil: v.number(),
  lastError: v.optional(v.string()),
  updatedAt: v.number(),
});

export const providerRateLimitDocument = v.object({
  _id: v.id("providerRateLimits"),
  _creationTime: v.number(),
  scopeKey: v.string(),
  provider: v.literal("github"),
  windowKey: v.string(),
  requestCount: v.number(),
  requestLimit: v.number(),
  resetAt: v.number(),
  updatedAt: v.number(),
});

export const repositoryCacheTables = {
  repositoryCacheEntries: defineTable({
    scopeKey: v.string(),
    ownerUserId: v.optional(v.id("users")),
    provider: v.literal("github"),
    repositoryFullName: v.string(),
    kind: repositoryCacheKind,
    ref: v.string(),
    pathKey: v.string(),
    commitSha: v.optional(v.string()),
    payload: v.string(),
    etag: v.optional(v.string()),
    lastModified: v.optional(v.string()),
    fetchedAt: v.number(),
    expiresAt: v.number(),
    staleUntil: v.number(),
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_lookup", ["scopeKey", "provider", "repositoryFullName", "kind", "ref", "pathKey"])
    .index("by_scope_updated_at", ["scopeKey", "updatedAt"])
    .index("by_expires_at", ["expiresAt"]),
  providerRateLimits: defineTable({
    scopeKey: v.string(),
    provider: v.literal("github"),
    windowKey: v.string(),
    requestCount: v.number(),
    requestLimit: v.number(),
    resetAt: v.number(),
    updatedAt: v.number(),
  }).index("by_scope_provider_window", ["scopeKey", "provider", "windowKey"]),
};
