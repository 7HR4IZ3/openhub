import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { canViewPost } from "./post-access";

const commentStatusValidator = v.union(
  v.literal("visible"),
  v.literal("deleted"),
);

const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  postId: v.id("posts"),
  authorId: v.id("users"),
  parentId: v.optional(v.id("comments")),
  body: v.string(),
  status: commentStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
});

const commentAuthorValidator = v.object({
  profileId: v.union(v.id("profiles"), v.null()),
  handle: v.string(),
  displayName: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
});

const commentViewValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  postId: v.id("posts"),
  authorId: v.id("users"),
  parentId: v.optional(v.id("comments")),
  body: v.string(),
  status: v.literal("visible"),
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  author: commentAuthorValidator,
});

export const list = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  returns: v.array(commentViewValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (post === null || !canViewPost(post, userId)) return [];

    const limit = clampLimit(args.limit);
    const commentsQuery =
      args.before === undefined
        ? ctx.db
            .query("comments")
            .withIndex("by_post_status_created_at", (q) =>
              q.eq("postId", args.postId).eq("status", "visible"),
            )
        : ctx.db
            .query("comments")
            .withIndex("by_post_status_created_at", (q) =>
              q
                .eq("postId", args.postId)
                .eq("status", "visible")
                .lt("createdAt", args.before as number),
            );
    const comments = await commentsQuery.order("desc").take(limit);
    return await Promise.all(comments.map((comment) => toCommentView(ctx, comment)));
  },
});

export const create = mutation({
  args: {
    postId: v.id("posts"),
    body: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  returns: commentViewValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const post = await ctx.db.get(args.postId);
    if (post === null || !canViewPost(post, userId)) {
      throw new Error("Post is not available");
    }
    if (args.body.trim().length === 0) {
      throw new Error("A comment needs text");
    }

    let parent: Doc<"comments"> | null = null;
    if (args.parentId !== undefined) {
      parent = await ctx.db.get(args.parentId);
      if (
        parent === null ||
        parent.postId !== post._id ||
        parent.status !== "visible"
      ) {
        throw new Error("Reply target is not available");
      }
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      postId: post._id,
      authorId: userId,
      parentId: args.parentId,
      body: args.body,
      status: "visible",
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
    });
    await ctx.db.patch(post._id, { commentCount: post.commentCount + 1 });

    const recipients = new Set<Id<"users">>([post.authorId]);
    if (parent !== null) recipients.add(parent.authorId);
    for (const recipientId of recipients) {
      if (recipientId !== userId) {
        await ctx.db.insert("notifications", {
          recipientId,
          actorId: userId,
          type: "comment",
          postId: post._id,
          commentId,
          createdAt: now,
        });
      }
    }

    const comment = await ctx.db.get(commentId);
    if (comment === null) throw new Error("Comment could not be created");
    return await toCommentView(ctx, comment);
  },
});

export const remove = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const comment = await ctx.db.get(args.commentId);
    if (comment === null || comment.status !== "visible") return null;
    const post = await ctx.db.get(comment.postId);
    if (
      post === null ||
      (comment.authorId !== userId && post.authorId !== userId)
    ) {
      throw new Error("You cannot remove this comment");
    }

    await ctx.db.patch(comment._id, {
      status: "deleted",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(post._id, {
      commentCount: Math.max(0, post.commentCount - 1),
    });
    return null;
  },
});

async function toCommentView(
  ctx: QueryCtx | MutationCtx,
  comment: Doc<"comments">,
) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", comment.authorId))
    .unique();

  return {
    _id: comment._id,
    _creationTime: comment._creationTime,
    postId: comment.postId,
    authorId: comment.authorId,
    ...(comment.parentId === undefined ? {} : { parentId: comment.parentId }),
    body: comment.body,
    status: "visible" as const,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    likeCount: comment.likeCount,
    author:
      profile === null
        ? {
            profileId: null,
            handle: "developer",
            displayName: "OpenHub developer",
            avatarUrl: null,
          }
        : {
            profileId: profile._id,
            handle: profile.handle,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl ?? null,
          },
  };
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 30;
  return Math.max(1, Math.min(Math.floor(value), 50));
}
