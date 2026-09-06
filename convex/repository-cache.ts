import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { repositoryCacheDocument, repositoryCacheKind } from "./repository-cache-schema";

const lookupArgs = {
  scopeKey: v.string(),
  provider: v.literal("github"),
  repositoryFullName: v.string(),
  kind: repositoryCacheKind,
  ref: v.string(),
  pathKey: v.string(),
};

export const get = internalQuery({
  args: lookupArgs,
  returns: v.union(repositoryCacheDocument, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositoryCacheEntries")
      .withIndex("by_lookup", (query) =>
        query
          .eq("scopeKey", args.scopeKey)
          .eq("provider", args.provider)
          .eq("repositoryFullName", args.repositoryFullName)
          .eq("kind", args.kind)
          .eq("ref", args.ref)
          .eq("pathKey", args.pathKey),
      )
      .unique();
  },
});

export const put = internalMutation({
  args: {
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
  },
  returns: v.id("repositoryCacheEntries"),
  handler: async (ctx, args) => {
    if (args.payload.length > 900_000) {
      throw new ConvexError("Repository cache payload is too large");
    }
    if (args.expiresAt < args.fetchedAt || args.staleUntil < args.expiresAt) {
      throw new ConvexError("Repository cache expiry is invalid");
    }
    const existing = await ctx.db
      .query("repositoryCacheEntries")
      .withIndex("by_lookup", (query) =>
        query
          .eq("scopeKey", args.scopeKey)
          .eq("provider", args.provider)
          .eq("repositoryFullName", args.repositoryFullName)
          .eq("kind", args.kind)
          .eq("ref", args.ref)
          .eq("pathKey", args.pathKey),
      )
      .unique();
    const now = Date.now();
    const value = {
      scopeKey: args.scopeKey,
      ...(args.ownerUserId === undefined ? {} : { ownerUserId: args.ownerUserId }),
      provider: args.provider,
      repositoryFullName: args.repositoryFullName,
      kind: args.kind,
      ref: args.ref,
      pathKey: args.pathKey,
      ...(args.commitSha === undefined ? {} : { commitSha: args.commitSha }),
      payload: args.payload,
      ...(args.etag === undefined ? {} : { etag: args.etag }),
      ...(args.lastModified === undefined ? {} : { lastModified: args.lastModified }),
      fetchedAt: args.fetchedAt,
      expiresAt: args.expiresAt,
      staleUntil: args.staleUntil,
      updatedAt: now,
    } as const;
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return await ctx.db.insert("repositoryCacheEntries", value);
  },
});

export const touch = internalMutation({
  args: {
    id: v.id("repositoryCacheEntries"),
    fetchedAt: v.number(),
    expiresAt: v.number(),
    staleUntil: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      fetchedAt: args.fetchedAt,
      expiresAt: args.expiresAt,
      staleUntil: args.staleUntil,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordFailure = internalMutation({
  args: { id: v.id("repositoryCacheEntries"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      lastError: args.message.slice(0, 500),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const consumeProviderRequest = internalMutation({
  args: {
    scopeKey: v.string(),
    provider: v.literal("github"),
    windowKey: v.string(),
    requestLimit: v.number(),
    resetAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.requestLimit) || args.requestLimit < 1 || args.requestLimit > 1_000) {
      throw new ConvexError("Provider request limit is invalid");
    }
    const existing = await ctx.db
      .query("providerRateLimits")
      .withIndex("by_scope_provider_window", (query) =>
        query.eq("scopeKey", args.scopeKey).eq("provider", args.provider).eq("windowKey", args.windowKey),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.requestCount >= existing.requestLimit) return false;
      await ctx.db.patch(existing._id, { requestCount: existing.requestCount + 1, updatedAt: now });
      return true;
    }
    await ctx.db.insert("providerRateLimits", {
      scopeKey: args.scopeKey,
      provider: args.provider,
      windowKey: args.windowKey,
      requestCount: 1,
      requestLimit: args.requestLimit,
      resetAt: args.resetAt,
      updatedAt: now,
    });
    return true;
  },
});

export const purgeExpired = internalMutation({
  args: { now: v.number(), limit: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 100), 500));
    const rows = await ctx.db
      .query("repositoryCacheEntries")
      .withIndex("by_expires_at", (query) => query.lt("expiresAt", args.now))
      .take(limit);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});
