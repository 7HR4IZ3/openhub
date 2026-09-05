import { defineTable } from "convex/server";
import { v } from "convex/values";

export const githubSnapshotDocument = v.object({
  _id: v.id("reputationSnapshots"),
  _creationTime: v.number(),
  userId: v.id("users"),
  provider: v.literal("github"),
  githubLogin: v.string(),
  publicContributionCount: v.number(),
  publicPushCount: v.number(),
  publicPullRequestCount: v.number(),
  publicReviewCount: v.number(),
  publicIssueCount: v.number(),
  evidenceUrl: v.string(),
  observedAt: v.number(),
  expiresAt: v.number(),
});

export const reputationTables = {
  reputationSnapshots: defineTable({
    userId: v.id("users"),
    provider: v.literal("github"),
    githubLogin: v.string(),
    publicContributionCount: v.number(),
    publicPushCount: v.number(),
    publicPullRequestCount: v.number(),
    publicReviewCount: v.number(),
    publicIssueCount: v.number(),
    evidenceUrl: v.string(),
    observedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user_provider_observedAt", ["userId", "provider", "observedAt"]),
  reputationEndorsements: defineTable({
    repositoryId: v.id("repositories"),
    endorsedUserId: v.id("users"),
    endorserId: v.id("users"),
    maintainerPermission: v.optional(v.union(v.literal("admin"), v.literal("maintain"))),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_repository_endorsed_user", ["repositoryId", "endorsedUserId"])
    .index("by_endorsed_user_createdAt", ["endorsedUserId", "createdAt"]),
};
