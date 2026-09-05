import { defineTable } from "convex/server";
import { v } from "convex/values";

export const evidenceValidator = v.object({
  repositoryId: v.id("repositories"),
  owner: v.string(),
  fullName: v.string(),
  language: v.union(v.string(), v.null()),
  topics: v.array(v.string()),
  stars: v.number(),
  forks: v.number(),
  openIssuesAndPullRequests: v.number(),
  pushedAt: v.union(v.number(), v.null()),
  archived: v.boolean(),
  isFork: v.boolean(),
  license: v.union(v.string(), v.null()),
  observedAt: v.number(),
  evidenceUrl: v.string(),
});

export const rankValidator = v.object({
  score: v.number(),
  calculatedAt: v.number(),
  version: v.string(),
  explanations: v.array(v.string()),
});

// Discovery tables are composed into the application schema and are written
// only by trusted provider-refresh actions or authenticated dismissals.
export const discoveryTables = {
  discoverySignals: defineTable({
    repositoryId: v.id("repositories"),
    visibility: v.literal("public"),
    available: v.boolean(),
    refreshStartedAt: v.number(),
    observedAt: v.number(),
    evidence: v.union(evidenceValidator, v.null()),
    rank: v.union(rankValidator, v.null()),
  })
    .index("by_repositoryId", ["repositoryId"])
    .index("by_visibility_and_available_and_observedAt", ["visibility", "available", "observedAt"]),
  discoveryDismissals: defineTable({
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    createdAt: v.number(),
  }).index("by_userId_and_repositoryId", ["userId", "repositoryId"]),
  // No writer is exposed until user-scoped credential resolution is implemented.
  discoveryEndorsements: defineTable({
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
    githubUserId: v.string(),
    githubLogin: v.string(),
    permission: v.union(v.literal("write"), v.literal("maintain"), v.literal("admin")),
    verifiedAt: v.number(),
    expiresAt: v.number(),
    evidenceUrl: v.string(),
    credentialKind: v.literal("user_scoped"),
    createdAt: v.number(),
  })
    .index("by_repositoryId_and_userId", ["repositoryId", "userId"])
    .index("by_repositoryId_and_expiresAt", ["repositoryId", "expiresAt"]),
};
