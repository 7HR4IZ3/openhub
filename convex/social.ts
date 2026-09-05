import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canInteractWithPost, canViewPost } from "./post-access";

const interactionResultValidator = v.object({
  active: v.boolean(),
});

const likeResultValidator = v.object({
  liked: v.boolean(),
  likeCount: v.number(),
});

const repostResultValidator = v.object({
  reposted: v.boolean(),
  repostCount: v.number(),
});

const viewerStateValidator = v.object({
  liked: v.boolean(),
  bookmarked: v.boolean(),
  reposted: v.boolean(),
  likeCount: v.number(),
  repostCount: v.number(),
});

export const viewerState = query({
  args: {
    postId: v.id("posts"),
  },
  returns: v.union(viewerStateValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const post = await ctx.db.get(args.postId);
    if (post === null || !(await canViewPost(ctx, post, userId))) return null;

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
            .unique()) !== null;

    return {
      liked,
      bookmarked,
      reposted,
      likeCount: post.likeCount,
      repostCount: post.repostCount,
    };
  },
});

export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
  },
  returns: likeResultValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const post = await ctx.db.get(args.postId);
    if (post === null || !(await canInteractWithPost(ctx, post, userId))) {
      throw new Error("Post is not available");
    }

    const existing = await ctx.db
      .query("postReactions")
      .withIndex("by_post_user_kind", (q) =>
        q.eq("postId", post._id).eq("userId", userId).eq("kind", "like"),
      )
      .unique();

    if (existing === null) {
      const now = Date.now();
      await ctx.db.insert("postReactions", {
        postId: post._id,
        userId,
        kind: "like",
        createdAt: now,
      });
      await ctx.db.patch(post._id, { likeCount: post.likeCount + 1 });
      if (post.authorId !== userId) {
        await ctx.db.insert("notifications", {
          recipientId: post.authorId,
          actorId: userId,
          type: "like",
          postId: post._id,
          createdAt: now,
        });
      }
      return { liked: true, likeCount: post.likeCount + 1 };
    }

    await ctx.db.delete(existing._id);
    const likeCount = Math.max(0, post.likeCount - 1);
    await ctx.db.patch(post._id, { likeCount });
    return { liked: false, likeCount };
  },
});

export const toggleBookmark = mutation({
  args: {
    postId: v.id("posts"),
  },
  returns: interactionResultValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const post = await ctx.db.get(args.postId);
    if (post === null || !(await canInteractWithPost(ctx, post, userId))) {
      throw new Error("Post is not available");
    }

    const existing = await ctx.db
      .query("postBookmarks")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", post._id).eq("userId", userId),
      )
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
      return { active: false };
    }

    await ctx.db.insert("postBookmarks", {
      postId: post._id,
      userId,
      createdAt: Date.now(),
    });
    return { active: true };
  },
});

export const toggleRepost = mutation({
  args: {
    postId: v.id("posts"),
  },
  returns: repostResultValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const post = await ctx.db.get(args.postId);
    if (post === null || post.visibility !== "public") {
      throw new Error("Only public posts can be reposted");
    }

    const existing = await ctx.db
      .query("postReposts")
      .withIndex("by_post_user_kind", (q) =>
        q.eq("postId", post._id).eq("userId", userId).eq("kind", "repost"),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.delete(existing._id);
      const repostCount = Math.max(0, post.repostCount - 1);
      await ctx.db.patch(post._id, { repostCount });
      return { reposted: false, repostCount };
    }

    const now = Date.now();
    await ctx.db.insert("postReposts", {
      postId: post._id,
      userId,
      kind: "repost",
      createdAt: now,
    });
    await ctx.db.patch(post._id, { repostCount: post.repostCount + 1 });
    if (post.authorId !== userId) {
      await ctx.db.insert("notifications", {
        recipientId: post.authorId,
        actorId: userId,
        type: "repost",
        postId: post._id,
        createdAt: now,
      });
    }
    return { reposted: true, repostCount: post.repostCount + 1 };
  },
});
