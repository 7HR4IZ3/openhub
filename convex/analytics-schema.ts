import { defineTable } from "convex/server";
import { v } from "convex/values";

export const analyticsEventName = v.union(
  v.literal("repository_view"), v.literal("file_view"), v.literal("source_discussion"),
  v.literal("post_view"), v.literal("ai_request"), v.literal("bounty_open"),
);

export const analyticsTables = {
  analyticsEvents: defineTable({
    actorId: v.id("users"), eventName: analyticsEventName, repositoryId: v.optional(v.id("repositories")),
    postId: v.optional(v.id("posts")), path: v.optional(v.string()), createdAt: v.number(),
  })
    .index("by_repository_created_at", ["repositoryId", "createdAt"])
    .index("by_actor_event_created_at", ["actorId", "eventName", "createdAt"]),
};
