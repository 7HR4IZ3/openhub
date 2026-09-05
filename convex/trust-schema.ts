import { defineTable } from "convex/server";
import { v } from "convex/values";

export const reportTarget = v.union(
  v.object({ kind: v.literal("post"), postId: v.id("posts") }),
  v.object({ kind: v.literal("comment"), commentId: v.id("comments") }),
  v.object({ kind: v.literal("repository"), repositoryId: v.id("repositories") }),
  v.object({ kind: v.literal("user"), userId: v.id("users") }),
);

export const reportReason = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("hate"),
  v.literal("sexual"),
  v.literal("malware"),
  v.literal("copyright"),
  v.literal("privacy"),
  v.literal("other"),
);

export const safetyTarget = v.union(
  v.object({ kind: v.literal("person"), userId: v.id("users") }),
  v.object({ kind: v.literal("repository"), repositoryId: v.id("repositories") }),
  v.object({ kind: v.literal("topic"), slug: v.string() }),
  v.object({ kind: v.literal("category"), slug: v.string() }),
);

export const moderationAction = v.union(
  v.literal("hide"),
  v.literal("restore"),
  v.literal("remove"),
);

export const reportStatus = v.union(
  v.literal("open"),
  v.literal("reviewing"),
  v.literal("actioned"),
  v.literal("dismissed"),
);

export const trustTables = {
  reports: defineTable({
    reporterId: v.id("users"),
    target: reportTarget,
    targetKey: v.string(),
    reason: reportReason,
    details: v.optional(v.string()),
    status: reportStatus,
    reviewerId: v.optional(v.id("users")),
    resolutionNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_reporter_target", ["reporterId", "targetKey"])
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_target_status", ["targetKey", "status"]),
  blocks: defineTable({
    userId: v.id("users"),
    blockedUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user_blocked", ["userId", "blockedUserId"])
    .index("by_blocked_user", ["blockedUserId", "userId"]),
  mutes: defineTable({
    userId: v.id("users"),
    target: safetyTarget,
    targetKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_target", ["userId", "targetKey"])
    .index("by_user_created_at", ["userId", "createdAt"]),
  keywordFilters: defineTable({
    userId: v.id("users"),
    phrase: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_phrase", ["userId", "phrase"])
    .index("by_user_enabled", ["userId", "enabled"])
    .index("by_user_created_at", ["userId", "createdAt"]),
  moderationActions: defineTable({
    actorId: v.id("users"),
    targetKind: v.union(v.literal("post"), v.literal("comment")),
    targetPostId: v.optional(v.id("posts")),
    targetCommentId: v.optional(v.id("comments")),
    action: moderationAction,
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_post_created_at", ["targetPostId", "createdAt"])
    .index("by_comment_created_at", ["targetCommentId", "createdAt"])
    .index("by_actor_created_at", ["actorId", "createdAt"]),
};
