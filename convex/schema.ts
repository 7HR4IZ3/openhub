import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { curationTables } from "./curation-schema";
import { discoveryTables } from "./discovery-schema";

export default defineSchema({
  ...authTables,
  ...curationTables,
  ...discoveryTables,
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
    .index("by_handle", ["handle"])
    .searchIndex("search_display_name", { searchField: "displayName" }),
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
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_repository_commit_path", [
    "repositoryId",
    "commitSha",
    "path",
  ]),
  diffReferences: defineTable({
    provider: v.string(),
    repositoryId: v.string(),
    repositoryFullName: v.string(),
    originalOwner: v.string(),
    path: v.string(),
    baseCommitSha: v.string(),
    headCommitSha: v.string(),
    language: v.optional(v.string()),
    canonicalUrl: v.string(),
    licenseSpdxId: v.optional(v.string()),
    visibility: v.literal("public"),
    baseSnapshot: v.string(),
    headSnapshot: v.string(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_repository_created_at", ["repositoryId", "createdAt"])
    .index("by_base_head_path", ["repositoryId", "baseCommitSha", "headCommitSha", "path"]),
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
    diffReferenceId: v.optional(v.id("diffReferences")),
    quoteOfId: v.optional(v.id("posts")),
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
    .index("by_author_visibility_created_at", ["authorId", "visibility", "createdAt"])
    .index("by_visibility_created_at", ["visibility", "createdAt"])
    .index("by_source_reference_created_at", ["sourceReferenceId", "createdAt"])
    .index("by_diff_reference_created_at", ["diffReferenceId", "createdAt"])
    .index("by_quote_of_created_at", ["quoteOfId", "createdAt"])
    .searchIndex("search_body", { searchField: "body", filterFields: ["visibility"] }),
  postReactions: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    kind: v.literal("like"),
    createdAt: v.number(),
  })
    .index("by_post_user_kind", ["postId", "userId", "kind"])
    .index("by_user_created_at", ["userId", "createdAt"]),
  postBookmarks: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_post_user", ["postId", "userId"])
    .index("by_user_created_at", ["userId", "createdAt"]),
  postReposts: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    kind: v.union(v.literal("repost"), v.literal("quote")),
    quotePostId: v.optional(v.id("posts")),
    createdAt: v.number(),
  })
    .index("by_post_user_kind", ["postId", "userId", "kind"])
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_quote_post", ["quotePostId"]),
  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    parentId: v.optional(v.id("comments")),
    sourceReferenceId: v.optional(v.id("sourceReferences")),
    diffReferenceId: v.optional(v.id("diffReferences")),
    body: v.string(),
    status: v.union(v.literal("visible"), v.literal("deleted")),
    createdAt: v.number(),
    updatedAt: v.number(),
    likeCount: v.number(),
  })
    .index("by_post_status_created_at", ["postId", "status", "createdAt"])
    .index("by_post_author", ["postId", "authorId"])
    .index("by_author_created_at", ["authorId", "createdAt"])
    .index("by_parent_created_at", ["parentId", "createdAt"]),
  notifications: defineTable({
    recipientId: v.id("users"),
    actorId: v.optional(v.id("users")),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("repost"),
      v.literal("quote"),
      v.literal("mention"),
      v.literal("system"),
    ),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_recipient_created_at", ["recipientId", "createdAt"])
    .index("by_recipient_read_created_at", ["recipientId", "readAt", "createdAt"]),
});
