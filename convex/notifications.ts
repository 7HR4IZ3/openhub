import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";

const notificationTypeValidator = v.union(
  v.literal("like"),
  v.literal("comment"),
  v.literal("repost"),
  v.literal("quote"),
  v.literal("mention"),
  v.literal("system"),
);

const notificationActorValidator = v.object({
  profileId: v.union(v.id("profiles"), v.null()),
  handle: v.string(),
  displayName: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
});

const notificationValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  recipientId: v.id("users"),
  actorId: v.optional(v.id("users")),
  type: notificationTypeValidator,
  postId: v.optional(v.id("posts")),
  commentId: v.optional(v.id("comments")),
  createdAt: v.number(),
  readAt: v.optional(v.number()),
  actor: v.union(notificationActorValidator, v.null()),
});

const notificationPageValidator = v.object({
  page: v.array(notificationValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const limit = clampLimit(args.limit);
    const notificationsQuery =
      args.before === undefined
        ? ctx.db
            .query("notifications")
            .withIndex("by_recipient_created_at", (q) =>
              q.eq("recipientId", userId),
            )
        : ctx.db
            .query("notifications")
            .withIndex("by_recipient_created_at", (q) =>
              q.eq("recipientId", userId).lt("createdAt", args.before as number),
            );
    const notifications = await notificationsQuery
      .order("desc")
      .take(limit);

    return await Promise.all(
      notifications.map((notification) => toNotificationView(ctx, notification)),
    );
  },
});

export const listPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: notificationPageValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.query("notifications")
      .withIndex("by_recipient_created_at", (q) => q.eq("recipientId", userId))
      .order("desc")
      .paginate(boundedPagination(args.paginationOpts));
    return {
      page: await Promise.all(result.page.map((notification) => toNotificationView(ctx, notification))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const notification = await ctx.db.get(args.notificationId);
    if (notification === null || notification.recipientId !== userId) {
      throw new Error("Notification is not available");
    }
    if (notification.readAt === undefined) {
      await ctx.db.patch(notification._id, { readAt: Date.now() });
    }
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_created_at", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(200);
    const readAt = Date.now();
    let updated = 0;
    for (const notification of notifications) {
      if (notification.readAt === undefined) {
        await ctx.db.patch(notification._id, { readAt });
        updated += 1;
      }
    }
    return updated;
  },
});

async function toNotificationView(
  ctx: QueryCtx,
  notification: Doc<"notifications">,
) {
  const profile =
    notification.actorId === undefined
      ? null
      : await ctx.db
          .query("profiles")
          .withIndex("by_user_id", (q) => q.eq("userId", notification.actorId as Doc<"users">["_id"]))
          .unique();

  return {
    ...notification,
    actor:
      profile === null
        ? null
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
