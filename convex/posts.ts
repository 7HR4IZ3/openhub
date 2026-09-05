import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { canViewPost } from "./post-access";

const postTypeValidator = v.union(
  v.literal("text"),
  v.literal("snippet"),
  v.literal("question"),
  v.literal("review"),
  v.literal("discussion"),
  v.literal("showcase"),
  v.literal("tutorial"),
  v.literal("task"),
  v.literal("bounty"),
);

const visibilityValidator = v.union(
  v.literal("public"),
  v.literal("followers"),
  v.literal("private"),
);

const sourceVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("private"),
);

const sourceReferenceInputValidator = v.object({
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
  visibility: sourceVisibilityValidator,
  sourceSnapshot: v.string(),
});

const sourceReferenceValidator = v.object({
  _id: v.id("sourceReferences"),
  _creationTime: v.number(),
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
  visibility: sourceVisibilityValidator,
  sourceSnapshot: v.string(),
  createdAt: v.number(),
});

const postValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  type: postTypeValidator,
  body: v.string(),
  sourceReferenceId: v.optional(v.id("sourceReferences")),
  quoteOfId: v.optional(v.id("posts")),
  visibility: visibilityValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  commentCount: v.number(),
  repostCount: v.number(),
});

const postAuthorValidator = v.object({
  profileId: v.union(v.id("profiles"), v.null()),
  handle: v.string(),
  displayName: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
  githubLogin: v.union(v.string(), v.null()),
});

const postDetailValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  type: postTypeValidator,
  body: v.string(),
  sourceReferenceId: v.optional(v.id("sourceReferences")),
  quoteOfId: v.optional(v.id("posts")),
  visibility: visibilityValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  commentCount: v.number(),
  repostCount: v.number(),
  author: postAuthorValidator,
  sourceReference: v.union(sourceReferenceValidator, v.null()),
  viewer: v.object({
    liked: v.boolean(),
    bookmarked: v.boolean(),
    reposted: v.boolean(),
  }),
});

export const recent = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(postDetailValidator),
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);
    const userId = await getAuthUserId(ctx);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit);

    return await Promise.all(posts.map((post) => toPostDetail(ctx, post, userId)));
  },
});

export const byId = query({
  args: {
    postId: v.id("posts"),
  },
  returns: v.union(postDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (post === null || !canViewPost(post, userId)) return null;

    return await toPostDetail(ctx, post, userId);
  },
});

export const create = mutation({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    sourceReference: v.optional(sourceReferenceInputValidator),
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    if (args.body.trim().length === 0 && args.sourceReference === undefined) {
      throw new Error("A post needs text or a source reference");
    }

    if (args.sourceReference !== undefined) {
      validateSourceReference(args.sourceReference, args.visibility);
    }

    const now = Date.now();
    const sourceReferenceId =
      args.sourceReference === undefined
        ? undefined
        : await ctx.db.insert("sourceReferences", {
            ...args.sourceReference,
            createdAt: now,
          });

    const postId = await ctx.db.insert("posts", {
      authorId: userId,
      type: args.type,
      body: args.body,
      sourceReferenceId,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    });

    const post = await ctx.db.get(postId);
    if (post === null) throw new Error("Post could not be created");
    return post;
  },
});

export const createQuote = mutation({
  args: {
    postId: v.id("posts"),
    body: v.string(),
    visibility: visibilityValidator,
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (args.body.trim().length === 0) {
      throw new Error("A quote needs text");
    }

    const original = await ctx.db.get(args.postId);
    if (original === null || original.visibility !== "public") {
      throw new Error("Only public posts can be quoted");
    }

    const now = Date.now();
    const quotePostId = await ctx.db.insert("posts", {
      authorId: userId,
      type: "discussion",
      body: args.body,
      quoteOfId: original._id,
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    });

    await ctx.db.insert("postReposts", {
      postId: original._id,
      userId,
      kind: "quote",
      quotePostId,
      createdAt: now,
    });
    await ctx.db.patch(original._id, {
      repostCount: original.repostCount + 1,
    });

    if (original.authorId !== userId) {
      await ctx.db.insert("notifications", {
        recipientId: original.authorId,
        actorId: userId,
        type: "quote",
        postId: original._id,
        createdAt: now,
      });
    }

    const quote = await ctx.db.get(quotePostId);
    if (quote === null) throw new Error("Quote could not be created");
    return quote;
  },
});

async function toPostDetail(
  ctx: QueryCtx,
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", post.authorId))
    .unique();
  const sourceReference =
    post.sourceReferenceId === undefined
      ? null
      : await ctx.db.get(post.sourceReferenceId);

  const liked =
    userId === null
      ? false
      : (await ctx.db
          .query("postReactions")
          .withIndex("by_post_user_kind", (q) =>
            q.eq("postId", post._id).eq("userId", userId).eq("kind", "like"),
          )
          .unique()) !== null;
  const bookmarked =
    userId === null
      ? false
      : (await ctx.db
          .query("postBookmarks")
          .withIndex("by_post_user", (q) =>
            q.eq("postId", post._id).eq("userId", userId),
          )
          .unique()) !== null;
  const reposted =
    userId === null
      ? false
      : (await ctx.db
          .query("postReposts")
          .withIndex("by_post_user_kind", (q) =>
            q.eq("postId", post._id).eq("userId", userId).eq("kind", "repost"),
          )
          .unique()) !== null ||
        (await ctx.db
          .query("postReposts")
          .withIndex("by_post_user_kind", (q) =>
            q.eq("postId", post._id).eq("userId", userId).eq("kind", "quote"),
          )
          .unique()) !== null;

  return {
    ...post,
    author:
      profile === null
        ? {
            profileId: null,
            handle: "developer",
            displayName: "OpenHub developer",
            avatarUrl: null,
            githubLogin: null,
          }
        : {
            profileId: profile._id,
            handle: profile.handle,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl ?? null,
            githubLogin: profile.githubLogin ?? null,
          },
    sourceReference,
    viewer: { liked, bookmarked, reposted },
  };
}

function validateSourceReference(
  sourceReference: {
    startLine: number;
    endLine: number;
    sourceSnapshot: string;
    visibility: "public" | "private";
  },
  postVisibility: "public" | "followers" | "private",
) {
  if (
    !Number.isInteger(sourceReference.startLine) ||
    !Number.isInteger(sourceReference.endLine) ||
    sourceReference.startLine < 1 ||
    sourceReference.endLine < sourceReference.startLine
  ) {
    throw new Error("Source line range is invalid");
  }

  if (sourceReference.sourceSnapshot.trim().length === 0) {
    throw new Error("Source snapshot cannot be empty");
  }

  if (
    sourceReference.visibility === "private" &&
    postVisibility !== "private"
  ) {
    throw new Error("Private source can only be attached to a private post");
  }
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(Math.floor(value), 50));
}
