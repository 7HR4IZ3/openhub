import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { ConvexError, v, type Infer, type Validator } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  moderationAction,
  reportReason,
  reportStatus,
  reportTarget,
  safetyTarget,
} from "./trust-schema";

const reportValidator = v.object({
  _id: v.id("reports"),
  _creationTime: v.number(),
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
});

const blockValidator = v.object({
  _id: v.id("blocks"),
  _creationTime: v.number(),
  userId: v.id("users"),
  blockedUserId: v.id("users"),
  createdAt: v.number(),
});

const muteValidator = v.object({
  _id: v.id("mutes"),
  _creationTime: v.number(),
  userId: v.id("users"),
  target: safetyTarget,
  targetKey: v.string(),
  createdAt: v.number(),
});

const keywordFilterValidator = v.object({
  _id: v.id("keywordFilters"),
  _creationTime: v.number(),
  userId: v.id("users"),
  phrase: v.string(),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const moderationActionValidator = v.object({
  _id: v.id("moderationActions"),
  _creationTime: v.number(),
  actorId: v.id("users"),
  targetKind: v.union(v.literal("post"), v.literal("comment")),
  targetPostId: v.optional(v.id("posts")),
  targetCommentId: v.optional(v.id("comments")),
  action: moderationAction,
  reason: v.string(),
  createdAt: v.number(),
});

function pageValidator<T extends Validator<unknown, "required", string>>(document: T) {
  return v.object({ page: v.array(document), isDone: v.boolean(), continueCursor: v.string() });
}

function bounded(options: PaginationOptions): PaginationOptions {
  if (!Number.isInteger(options.numItems) || options.numItems < 1 || options.numItems > 50) {
    throw new ConvexError("Page size must be an integer from 1 to 50");
  }
  return {
    numItems: options.numItems,
    cursor: options.cursor,
    maximumRowsRead: 100,
    maximumBytesRead: 256_000,
  };
}

async function viewer(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null || await ctx.db.get(userId) === null) throw new ConvexError("Not signed in");
  return userId;
}

function clean(value: string, maximum: number, allowEmpty = false) {
  const cleaned = value.trim();
  if ((!allowEmpty && cleaned.length === 0) || cleaned.length > maximum) {
    throw new ConvexError("Text exceeds the supported length");
  }
  return cleaned;
}

function targetKey(target: Infer<typeof reportTarget>): string {
  switch (target.kind) {
    case "post": return `post:${target.postId}`;
    case "comment": return `comment:${target.commentId}`;
    case "repository": return `repository:${target.repositoryId}`;
    case "user": return `user:${target.userId}`;
  }
}

function safetyKey(target: Infer<typeof safetyTarget>): string {
  switch (target.kind) {
    case "person": return `person:${target.userId}`;
    case "repository": return `repository:${target.repositoryId}`;
    case "topic": return `topic:${target.slug}`;
    case "category": return `category:${target.slug}`;
  }
}

async function targetExists(ctx: QueryCtx | MutationCtx, target: Infer<typeof reportTarget>) {
  switch (target.kind) {
    case "post": return (await ctx.db.get(target.postId)) !== null;
    case "comment": return (await ctx.db.get(target.commentId)) !== null;
    case "repository": return (await ctx.db.get(target.repositoryId)) !== null;
    case "user": return (await ctx.db.get(target.userId)) !== null;
  }
}

export const createReport = mutation({
  args: {
    target: reportTarget,
    reason: reportReason,
    details: v.optional(v.string()),
  },
  returns: v.object({ created: v.boolean(), reportId: v.id("reports") }),
  handler: async (ctx, args) => {
    const reporterId = await viewer(ctx);
    if (!(await targetExists(ctx, args.target))) throw new ConvexError("Report target is not available");
    if (args.target.kind === "user" && args.target.userId === reporterId) {
      throw new ConvexError("You cannot report yourself");
    }

    const key = targetKey(args.target);
    const existing = await ctx.db.query("reports")
      .withIndex("by_reporter_target", (q) => q.eq("reporterId", reporterId).eq("targetKey", key))
      .order("desc")
      .take(20);
    const open = existing.find((report) => report.status === "open" || report.status === "reviewing");
    if (open) return { created: false, reportId: open._id };

    const details = args.details === undefined ? undefined : clean(args.details, 2_000, true);
    const now = Date.now();
    const reportId = await ctx.db.insert("reports", {
      reporterId,
      target: args.target,
      targetKey: key,
      reason: args.reason,
      ...(details ? { details } : {}),
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    return { created: true, reportId };
  },
});

export const myReports = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: pageValidator(reportValidator),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("reports")
      .withIndex("by_reporter_target", (q) => q.eq("reporterId", userId))
      .order("desc")
      .paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const closeReport = mutation({
  args: { reportId: v.id("reports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report || report.reporterId !== userId) throw new ConvexError("Report is not available");
    if (report.status === "open" || report.status === "reviewing") {
      const now = Date.now();
      await ctx.db.patch(report._id, { status: "dismissed", updatedAt: now, resolvedAt: now });
    }
    return null;
  },
});

export const setBlock = mutation({
  args: { blockedUserId: v.id("users"), blocked: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    if (userId === args.blockedUserId) throw new ConvexError("You cannot block yourself");
    if (await ctx.db.get(args.blockedUserId) === null) throw new ConvexError("User is not available");
    const existing = await ctx.db.query("blocks")
      .withIndex("by_user_blocked", (q) => q.eq("userId", userId).eq("blockedUserId", args.blockedUserId))
      .unique();
    if (!args.blocked) {
      if (existing) await ctx.db.delete(existing._id);
      return false;
    }
    if (!existing) await ctx.db.insert("blocks", { userId, blockedUserId: args.blockedUserId, createdAt: Date.now() });
    return true;
  },
});

export const isBlocked = query({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (viewerId === null || viewerId === args.userId) return false;
    return (await ctx.db.query("blocks")
      .withIndex("by_user_blocked", (q) => q.eq("userId", viewerId).eq("blockedUserId", args.userId))
      .unique()) !== null;
  },
});

export const myBlocks = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: pageValidator(blockValidator),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("blocks")
      .withIndex("by_user_blocked", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const setMute = mutation({
  args: { target: safetyTarget, muted: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    if (args.target.kind === "person" && args.target.userId === userId) {
      throw new ConvexError("You cannot mute yourself");
    }
    const targetKeyValue = safetyKey(args.target);
    const existing = await ctx.db.query("mutes")
      .withIndex("by_user_target", (q) => q.eq("userId", userId).eq("targetKey", targetKeyValue))
      .unique();
    if (!args.muted) {
      if (existing) await ctx.db.delete(existing._id);
      return false;
    }
    if (args.target.kind === "person" && await ctx.db.get(args.target.userId) === null) {
      throw new ConvexError("User is not available");
    }
    if (args.target.kind === "repository" && await ctx.db.get(args.target.repositoryId) === null) {
      throw new ConvexError("Repository is not available");
    }
    if (!existing) await ctx.db.insert("mutes", {
      userId,
      target: args.target,
      targetKey: targetKeyValue,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const myMutes = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: pageValidator(muteValidator),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("mutes")
      .withIndex("by_user_created_at", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const setKeywordFilter = mutation({
  args: { phrase: v.string(), enabled: v.boolean() },
  returns: v.id("keywordFilters"),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const phrase = clean(args.phrase, 120).toLocaleLowerCase();
    const existing = await ctx.db.query("keywordFilters")
      .withIndex("by_user_phrase", (q) => q.eq("userId", userId).eq("phrase", phrase))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { enabled: args.enabled, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("keywordFilters", {
      userId,
      phrase,
      enabled: args.enabled,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeKeywordFilter = mutation({
  args: { filterId: v.id("keywordFilters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const filter = await ctx.db.get(args.filterId);
    if (!filter || filter.userId !== userId) throw new ConvexError("Filter is not available");
    await ctx.db.delete(filter._id);
    return null;
  },
});

export const myKeywordFilters = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: pageValidator(keywordFilterValidator),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("keywordFilters")
      .withIndex("by_user_created_at", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

async function repositoryOwnerForPost(ctx: QueryCtx | MutationCtx, post: Doc<"posts">) {
  const source = post.sourceReferenceId === undefined ? null : await ctx.db.get(post.sourceReferenceId);
  const diff = post.diffReferenceId === undefined ? null : await ctx.db.get(post.diffReferenceId);
  const reference = source ?? diff;
  if (!reference || reference.provider !== "github" || reference.visibility !== "public") return false;
  const repository = await ctx.db.query("repositories")
    .withIndex("by_provider_repository", (q) => q.eq("provider", reference.provider).eq("providerRepositoryId", reference.repositoryId))
    .unique();
  if (!repository || repository.visibility !== "public") return false;
  const userId = await getAuthUserId(ctx);
  if (userId === null) return false;
  const account = await ctx.db.query("providerAccounts")
    .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", "github"))
    .unique();
  return account?.status === "active" && account.login.toLowerCase() === repository.ownerLogin.toLowerCase();
}

async function canModeratePost(ctx: QueryCtx | MutationCtx, post: Doc<"posts">, userId: Id<"users">) {
  return post.authorId === userId || await repositoryOwnerForPost(ctx, post);
}

export const moderatePost = mutation({
  args: {
    postId: v.id("posts"),
    action: moderationAction,
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || !await canModeratePost(ctx, post, userId)) throw new ConvexError("Moderation permission required");
    const reason = clean(args.reason, 500);
    if (args.action === "restore") {
      await ctx.db.patch(post._id, { moderationState: undefined });
    } else {
      await ctx.db.patch(post._id, { moderationState: args.action === "remove" ? "removed" : "hidden" });
    }
    await ctx.db.insert("moderationActions", {
      actorId: userId,
      targetKind: "post",
      targetPostId: post._id,
      action: args.action,
      reason,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const moderateComment = mutation({
  args: {
    commentId: v.id("comments"),
    action: moderationAction,
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const comment = await ctx.db.get(args.commentId);
    const post = comment === null ? null : await ctx.db.get(comment.postId);
    if (!comment || !post || (comment.authorId !== userId && post.authorId !== userId && !await repositoryOwnerForPost(ctx, post))) {
      throw new ConvexError("Moderation permission required");
    }
    const reason = clean(args.reason, 500);
    if (args.action === "restore") {
      await ctx.db.patch(comment._id, { moderationState: undefined });
    } else {
      await ctx.db.patch(comment._id, { moderationState: args.action === "remove" ? "removed" : "hidden" });
    }
    await ctx.db.insert("moderationActions", {
      actorId: userId,
      targetKind: "comment",
      targetCommentId: comment._id,
      action: args.action,
      reason,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const moderationHistory = query({
  args: {
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    paginationOpts: paginationOptsValidator,
  },
  returns: pageValidator(moderationActionValidator),
  handler: async (ctx, args) => {
    if ((args.postId === undefined) === (args.commentId === undefined)) {
      throw new ConvexError("Choose one moderation target");
    }
    const userId = await viewer(ctx);
    let allowed = false;
    if (args.postId !== undefined) {
      const post = await ctx.db.get(args.postId);
      allowed = post !== null && await canModeratePost(ctx, post, userId);
    } else {
      const comment = await ctx.db.get(args.commentId as Id<"comments">);
      const post = comment === null ? null : await ctx.db.get(comment.postId);
      allowed = comment !== null && post !== null && (comment.authorId === userId || post.authorId === userId || await repositoryOwnerForPost(ctx, post));
    }
    if (!allowed) throw new ConvexError("Moderation permission required");
    const result = args.postId !== undefined
      ? await ctx.db.query("moderationActions").withIndex("by_post_created_at", (q) => q.eq("targetPostId", args.postId)).order("desc").paginate(bounded(args.paginationOpts))
      : await ctx.db.query("moderationActions").withIndex("by_comment_created_at", (q) => q.eq("targetCommentId", args.commentId as Id<"comments">)).order("desc").paginate(bounded(args.paginationOpts));
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
