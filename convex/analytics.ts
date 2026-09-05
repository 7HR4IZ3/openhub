import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { analyticsEventName } from "./analytics-schema";

const summaryValidator = v.object({
  repositoryId: v.id("repositories"), windowDays: v.number(), totalEvents: v.number(), uniqueReaders: v.number(),
  eventsByName: v.array(v.object({ name: v.string(), count: v.number() })),
  popularFiles: v.array(v.object({ path: v.string(), views: v.number() })), calculatedAt: v.number(),
});

export const track = mutation({
  args: { eventName: analyticsEventName, repositoryId: v.optional(v.id("repositories")), postId: v.optional(v.id("posts")), path: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (actorId === null) return null;
    if (args.repositoryId !== undefined) {
      const repository = await ctx.db.get(args.repositoryId);
      if (!repository || repository.visibility !== "public") return null;
    }
    if (args.postId !== undefined) {
      const post = await ctx.db.get(args.postId);
      if (!post || post.visibility !== "public") return null;
    }
    const path = args.path?.trim();
    if (path !== undefined && (path.length > 500 || path.length === 0 || path.startsWith("/"))) throw new ConvexError("Analytics path is invalid");
    const recent = await ctx.db.query("analyticsEvents")
      .withIndex("by_actor_event_created_at", (q) => q.eq("actorId", actorId).eq("eventName", args.eventName))
      .order("desc").take(20);
    const duplicate = recent.some((event) => event.createdAt > Date.now() - 30_000 && event.repositoryId === args.repositoryId && event.postId === args.postId && event.path === path);
    if (!duplicate) await ctx.db.insert("analyticsEvents", { actorId, eventName: args.eventName, ...(args.repositoryId ? { repositoryId: args.repositoryId } : {}), ...(args.postId ? { postId: args.postId } : {}), ...(path ? { path } : {}), createdAt: Date.now() });
    return null;
  },
});

export const repositorySummary = query({
  args: { repositoryId: v.id("repositories"), windowDays: v.optional(v.number()) },
  returns: v.union(summaryValidator, v.null()),
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (viewerId === null) return null;
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.visibility !== "public") return null;
    const account = await ctx.db.query("providerAccounts").withIndex("by_user_provider", (q) => q.eq("userId", viewerId).eq("provider", "github")).unique();
    // Owner analytics are private to the connected GitHub identity. A later
    // provider permission check can broaden this to verified maintainers.
    if (!account || account.status !== "active" || account.login.toLowerCase() !== repository.ownerLogin.toLowerCase()) return null;
    const days = Math.max(1, Math.min(Math.floor(args.windowDays ?? 30), 90));
    const since = Date.now() - days * 86_400_000;
    const events = await ctx.db.query("analyticsEvents").withIndex("by_repository_created_at", (q) => q.eq("repositoryId", args.repositoryId).gt("createdAt", since)).order("desc").take(5_000);
    const names = new Map<string, number>();
    const files = new Map<string, number>();
    const readers = new Set<Id<"users">>();
    for (const event of events) {
      names.set(event.eventName, (names.get(event.eventName) ?? 0) + 1);
      readers.add(event.actorId);
      if (event.eventName === "file_view" && event.path) files.set(event.path, (files.get(event.path) ?? 0) + 1);
    }
    return { repositoryId: args.repositoryId, windowDays: days, totalEvents: events.length, uniqueReaders: readers.size,
      eventsByName: [...names.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      popularFiles: [...files.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 10), calculatedAt: Date.now() };
  },
});
