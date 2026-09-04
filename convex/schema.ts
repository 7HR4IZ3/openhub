import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  providerAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerUserId: v.string(),
    login: v.string(),
    // This is a reference/ciphertext identifier, never a raw provider token.
    encryptedTokenRef: v.optional(v.string()),
    scopes: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("needs_reauth"),
    ),
    lastValidatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_provider", ["userId", "provider"])
    .index("by_provider_account", ["provider", "providerUserId"]),
  profiles: defineTable({
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
  })
    .index("by_user_id", ["userId"])
    .index("by_handle", ["handle"]),
  repositories: defineTable({
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
  })
    .index("by_provider_repository", ["provider", "providerRepositoryId"])
    .index("by_visibility_updated", ["visibility", "updatedAt"]),
  sourceReferences: defineTable({
    provider: v.string(),
    repositoryId: v.string(),
    repositoryFullName: v.string(),
    originalOwner: v.string(),
    path: v.string(),
    commitSha: v.string(),
    startLine: v.number(),
    endLine: v.number(),
    language: v.optional(v.string()),
    canonicalUrl: v.string(),
    licenseSpdxId: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    sourceSnapshot: v.string(),
    createdAt: v.number(),
  }).index("by_repository_commit_path", [
    "repositoryId",
    "commitSha",
    "path",
  ]),
  posts: defineTable({
    authorId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("snippet"),
      v.literal("question"),
      v.literal("review"),
      v.literal("discussion"),
      v.literal("showcase"),
      v.literal("tutorial"),
      v.literal("task"),
      v.literal("bounty"),
    ),
    body: v.string(),
    sourceReferenceId: v.optional(v.id("sourceReferences")),
    visibility: v.union(
      v.literal("public"),
      v.literal("followers"),
      v.literal("private"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
    repostCount: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_author_created_at", ["authorId", "createdAt"])
    .index("by_visibility_created_at", ["visibility", "createdAt"]),
});
