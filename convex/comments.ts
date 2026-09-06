import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { canViewPostWithContext } from "./post-access";
import { isPostSuppressed } from "./trust-helpers";
import { createMentions } from "./mention-helpers";

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
  moderationState: v.optional(v.union(v.literal("visible"), v.literal("hidden"), v.literal("removed"))),
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

const commentPageValidator = v.object({
  page: v.array(commentViewValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
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
    if (post === null || !await canViewPostWithContext(ctx, post, userId) || await isPostSuppressed(ctx, post, userId)) return [];

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
    return await Promise.all(comments.filter((comment) => !isCommentSuppressed(comment)).map((comment) => toCommentView(ctx, comment)));
  },
});

export const listPage = query({
  args: { postId: v.id("posts"), paginationOpts: paginationOptsValidator },
  returns: commentPageValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (post === null || !await canViewPostWithContext(ctx, post, userId) || await isPostSuppressed(ctx, post, userId)) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const result = await ctx.db.query("comments")
      .withIndex("by_post_status_created_at", (q) => q.eq("postId", args.postId).eq("status", "visible"))
      .order("desc")
      .paginate(boundedPagination(args.paginationOpts));
    const visible = result.page.filter((comment) => !isCommentSuppressed(comment));
    return {
      page: await Promise.all(visible.map((comment) => toCommentView(ctx, comment))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
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
    if (post === null || !await canViewPostWithContext(ctx, post, userId) || await isPostSuppressed(ctx, post, userId)) {
      throw new Error("Post is not available");
    }
    assertCommentBody(args.body);

    let parent: Doc<"comments"> | null = null;
    if (args.parentId !== undefined) {
      parent = await ctx.db.get(args.parentId);
      if (
        parent === null ||
        parent.postId !== post._id ||
        parent.status !== "visible" ||
        isCommentSuppressed(parent)
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
    await createMentions(ctx, args.body, userId, { kind: "comment", commentId, postId: post._id });

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

export const update = mutation({
  args: { commentId: v.id("comments"), body: v.string() },
  returns: commentViewValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const comment = await ctx.db.get(args.commentId);
    if (comment === null || comment.status !== "visible" || isCommentSuppressed(comment)) throw new Error("Comment is not available");
    if (comment.authorId !== userId) throw new Error("Only the author can edit this comment");
    assertCommentBody(args.body);
    await ctx.db.patch(comment._id, { body: args.body, updatedAt: Date.now() });
    const oldMentions = await ctx.db.query("mentions")
      .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
      .take(50);
    for (const mention of oldMentions) await ctx.db.delete(mention._id);
    await createMentions(ctx, args.body, userId, { kind: "comment", commentId: comment._id, postId: comment.postId });
    const updated = await ctx.db.get(comment._id);
    if (updated === null) throw new Error("Comment could not be updated");
    return await toCommentView(ctx, updated);
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
    const mentions = await ctx.db.query("mentions")
      .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
      .take(50);
    for (const mention of mentions) await ctx.db.delete(mention._id);
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

function isCommentSuppressed(comment: Doc<"comments">) {
  return comment.moderationState === "hidden" || comment.moderationState === "removed";
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 30;
  return Math.max(1, Math.min(Math.floor(value), 50));
}

function assertCommentBody(body: string) {
  if (body.trim().length === 0) throw new Error("A comment needs text");
  if (new TextEncoder().encode(body).length > 16_000) throw new Error("Comment text exceeds storage limit");
}

function boundedPagination(options: PaginationOptions): PaginationOptions {
  if (!Number.isInteger(options.numItems) || options.numItems < 1 || options.numItems > 50) {
    throw new Error("Page size must be an integer from 1 to 50");
  }
  return {
    numItems: options.numItems,
    cursor: options.cursor,
    maximumRowsRead: 100,
    maximumBytesRead: 256_000,
  };
}
