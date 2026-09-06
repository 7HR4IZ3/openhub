import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyPublicDiff, verifyPublicSource } from "./github-source";
import { canViewPostWithContext } from "./post-access";
import { isPostSuppressed } from "./trust-helpers";
import { createMentions } from "./mention-helpers";
import { canPublishToCommunity } from "./community-access";

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

const diffReferenceInputValidator = v.object({
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
  visibility: sourceVisibilityValidator,
  baseSnapshot: v.string(),
  headSnapshot: v.string(),
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
  verifiedAt: v.optional(v.number()),
});

const postValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  type: postTypeValidator,
  body: v.string(),
  sourceReferenceId: v.optional(v.id("sourceReferences")),
  diffReferenceId: v.optional(v.id("diffReferences")),
  communityId: v.optional(v.id("communities")),
  quoteOfId: v.optional(v.id("posts")),
  deletedAt: v.optional(v.number()),
  moderationState: v.optional(v.union(v.literal("visible"), v.literal("hidden"), v.literal("removed"))),
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
  diffReferenceId: v.optional(v.id("diffReferences")),
  communityId: v.optional(v.id("communities")),
  quoteOfId: v.optional(v.id("posts")),
  deletedAt: v.optional(v.number()),
  moderationState: v.optional(v.union(v.literal("visible"), v.literal("hidden"), v.literal("removed"))),
  visibility: visibilityValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  commentCount: v.number(),
  repostCount: v.number(),
  author: postAuthorValidator,
  sourceReference: v.union(sourceReferenceValidator, v.null()),
  diffReference: v.union(v.object({
    _id: v.id("diffReferences"),
    _creationTime: v.number(),
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
    visibility: sourceVisibilityValidator,
    baseSnapshot: v.string(),
    headSnapshot: v.string(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }), v.null()),
  viewer: v.object({
    liked: v.boolean(),
    bookmarked: v.boolean(),
    reposted: v.boolean(),
  }),
});

const postPageValidator = v.object({
  page: v.array(postDetailValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
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
      .take(Math.min(50, Math.max(limit, limit * 3)));

    const visible = [];
    for (const post of posts) {
      if (!await isPostSuppressed(ctx, post, userId)) visible.push(post);
      if (visible.length === limit) break;
    }
    return await Promise.all(visible.map((post) => toPostDetail(ctx, post, userId)));
  },
});

export const recentPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: postPageValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const result = await ctx.db.query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .paginate(boundedPagination(args.paginationOpts));
    const visible = [];
    for (const post of result.page) {
      if (!await isPostSuppressed(ctx, post, userId)) visible.push(post);
    }
    return {
      page: await Promise.all(visible.map((post) => toPostDetail(ctx, post, userId))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const byAuthor = query({
  args: { userId: v.id("users"), paginationOpts: paginationOptsValidator },
  returns: postPageValidator,
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const profile = await ctx.db.query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();
    if (profile === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.query("posts")
      .withIndex("by_author_created_at", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .paginate(boundedPagination(args.paginationOpts));
    const visible = [];
    for (const post of result.page) {
      if (post.visibility === "public" && !await isPostSuppressed(ctx, post, viewerId)) visible.push(post);
    }
    return {
      page: await Promise.all(visible.map((post) => toPostDetail(ctx, post, viewerId))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const byCommunity = query({
  args: { communityId: v.id("communities"), paginationOpts: paginationOptsValidator },
  returns: postPageValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const community = await ctx.db.get(args.communityId);
    if (!community) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.query("posts")
      .withIndex("by_community_created_at", (q) => q.eq("communityId", args.communityId))
      .order("desc")
      .paginate(boundedPagination(args.paginationOpts));
    const visible = [];
    for (const post of result.page) {
      if (await canViewPostWithContext(ctx, post, userId) && !await isPostSuppressed(ctx, post, userId)) visible.push(post);
    }
    return { page: await Promise.all(visible.map((post) => toPostDetail(ctx, post, userId))), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const following = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(postDetailValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const limit = clampLimit(args.limit);
    const follows = await ctx.db.query("follows")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    if (follows.length === 0) return [];

    const candidates = await ctx.db.query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(Math.min(100, Math.max(40, limit * 6)));
    const visible = [];
    for (const post of candidates) {
      if (await isPostSuppressed(ctx, post, userId)) continue;
      if (!await matchesFollowTarget(ctx, post, follows)) continue;
      visible.push(post);
      if (visible.length === limit) break;
    }
    return await Promise.all(visible.map((post) => toPostDetail(ctx, post, userId)));
  },
});

export const trending = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(postDetailValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limit = clampLimit(args.limit);
    const candidates = await ctx.db.query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(100);
    const scored: Array<{ post: Doc<"posts">; score: number }> = [];
    const now = Date.now();
    for (const post of candidates) {
      if (await isPostSuppressed(ctx, post, userId)) continue;
      const ageHours = Math.max(0, (now - post.createdAt) / 3_600_000);
      const engagement = post.likeCount + post.commentCount * 3 + post.repostCount * 2;
      const freshness = Math.exp(-ageHours / 96);
      scored.push({ post, score: Math.log1p(engagement) * 4 + freshness * 4 });
    }
    scored.sort((a, b) => b.score - a.score || b.post.createdAt - a.post.createdAt);
    return await Promise.all(scored.slice(0, limit).map(({ post }) => toPostDetail(ctx, post, userId)));
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
    if (post === null || !await canViewPostWithContext(ctx, post, userId) || await isPostSuppressed(ctx, post, userId)) return null;

    return await toPostDetail(ctx, post, userId);
  },
});

export const create = mutation({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    communityId: v.optional(v.id("communities")),
    sourceReference: v.optional(sourceReferenceInputValidator),
    diffReference: v.optional(diffReferenceInputValidator),
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    if (new TextEncoder().encode(args.body).length > 64_000) throw new Error("Post text exceeds storage limit");
    if (args.body.trim().length === 0 && args.sourceReference === undefined && args.diffReference === undefined) {
      throw new Error("A post needs text or a source reference");
    }

    if (args.communityId !== undefined) await canPublishToCommunity(ctx, args.communityId, userId);

    if (args.sourceReference !== undefined || args.diffReference !== undefined) {
      if (args.sourceReference !== undefined) validateSourceReference(args.sourceReference, args.visibility);
      if (args.diffReference !== undefined) validateDiffReference(args.diffReference, args.visibility);
      // Client-supplied visibility and attribution are not trustworthy.
      throw new Error("Code publishing requires server-side verification");
    }

    const now = Date.now();
    const postId = await ctx.db.insert("posts", {
      authorId: userId,
      type: args.type,
      body: args.body,
      ...(args.communityId === undefined ? {} : { communityId: args.communityId }),
      visibility: args.visibility,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    });

    const post = await ctx.db.get(postId);
    if (post === null) throw new Error("Post could not be created");
    await createMentions(ctx, args.body, userId, { kind: "post", postId: post._id });
    return post;
  },
});

export const createSource = action({
  args: { type: postTypeValidator, body: v.string(), visibility: visibilityValidator, communityId: v.optional(v.id("communities")),
    sourceReference: sourceReferenceInputValidator },
  returns: postValidator,
  handler: async (ctx, args): Promise<Doc<"posts">> => {
    if (await getAuthUserId(ctx) === null) throw new Error("Not signed in");
    if (new TextEncoder().encode(args.body).length > 64_000) throw new Error("Post text exceeds storage limit");
    const sourceReference = await verifyPublicSource(args.sourceReference);
    return await ctx.runMutation(internal.posts.persistVerifiedSource, { ...args, sourceReference });
  },
});

export const createDiff = action({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    communityId: v.optional(v.id("communities")),
    diffReference: diffReferenceInputValidator,
  },
  returns: postValidator,
  handler: async (ctx, args): Promise<Doc<"posts">> => {
    if (await getAuthUserId(ctx) === null) throw new Error("Not signed in");
    if (new TextEncoder().encode(args.body).length > 64_000) throw new Error("Post text exceeds storage limit");
    const diffReference = await verifyPublicDiff(args.diffReference);
    return await ctx.runMutation(internal.posts.persistVerifiedDiff, { ...args, diffReference });
  },
});

export const persistVerifiedSource = internalMutation({
  args: { type: postTypeValidator, body: v.string(), visibility: visibilityValidator, communityId: v.optional(v.id("communities")),
    sourceReference: sourceReferenceInputValidator },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (args.communityId !== undefined) await canPublishToCommunity(ctx, args.communityId, userId);
    validateSourceReference(args.sourceReference, args.visibility);
    const now = Date.now();
    const sourceReferenceId = await ctx.db.insert("sourceReferences", {
      ...args.sourceReference, verifiedAt: now, createdAt: now,
    });
    const id = await ctx.db.insert("posts", {
      authorId: userId, type: args.type, body: args.body, visibility: args.visibility,
      ...(args.communityId === undefined ? {} : { communityId: args.communityId }),
      sourceReferenceId, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0, repostCount: 0,
    });
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found after creation");
    await createMentions(ctx, args.body, userId, { kind: "post", postId: post._id });
    return post;
  },
});

export const persistVerifiedDiff = internalMutation({
  args: { type: postTypeValidator, body: v.string(), visibility: visibilityValidator, communityId: v.optional(v.id("communities")), diffReference: diffReferenceInputValidator },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (args.communityId !== undefined) await canPublishToCommunity(ctx, args.communityId, userId);
    validateDiffReference(args.diffReference, args.visibility);
    const now = Date.now();
    const diffReferenceId = await ctx.db.insert("diffReferences", { ...args.diffReference, verifiedAt: now, createdAt: now });
    const id = await ctx.db.insert("posts", {
      authorId: userId, type: args.type, body: args.body, visibility: args.visibility,
      ...(args.communityId === undefined ? {} : { communityId: args.communityId }),
      diffReferenceId, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0, repostCount: 0,
    });
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found after creation");
    await createMentions(ctx, args.body, userId, { kind: "post", postId: post._id });
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
    if (args.visibility !== "public") {
      throw new Error("Non-public quotes are not supported yet");
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
    await createMentions(ctx, args.body, userId, { kind: "post", postId: quote._id });
    return quote;
  },
});

export const update = mutation({
  args: { postId: v.id("posts"), body: v.string() },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const post = await ctx.db.get(args.postId);
    if (post === null || post.deletedAt !== undefined) throw new Error("Post is not available");
    if (post.authorId !== userId) throw new Error("Only the author can edit this post");
    assertPostBody(args.body, post.sourceReferenceId !== undefined || post.diffReferenceId !== undefined);
    const now = Date.now();
    await ctx.db.patch(post._id, { body: args.body, updatedAt: now });
    const oldMentions = await ctx.db.query("mentions")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .take(50);
    for (const mention of oldMentions) await ctx.db.delete(mention._id);
    await createMentions(ctx, args.body, userId, { kind: "post", postId: post._id });
    const updated = await ctx.db.get(post._id);
    if (updated === null) throw new Error("Post could not be updated");
    return updated;
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const post = await ctx.db.get(args.postId);
    if (post === null || post.deletedAt !== undefined) return null;
    if (post.authorId !== userId) throw new Error("Only the author can delete this post");
    const now = Date.now();
    await ctx.db.patch(post._id, { deletedAt: now, updatedAt: now });
    const mentions = await ctx.db.query("mentions")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .take(50);
    for (const mention of mentions) await ctx.db.delete(mention._id);
    return null;
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
  const diffReference =
    post.diffReferenceId === undefined
      ? null
      : await ctx.db.get(post.diffReferenceId);

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
    diffReference,
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

function assertPostBody(body: string, hasAttachedSource: boolean) {
  if (new TextEncoder().encode(body).length > 64_000) throw new Error("Post text exceeds storage limit");
  if (body.trim().length === 0 && !hasAttachedSource) throw new Error("A post needs text or a source reference");
}

function validateDiffReference(
  diffReference: { baseCommitSha: string; headCommitSha: string; baseSnapshot: string; headSnapshot: string; visibility: "public" | "private" },
  postVisibility: "public" | "followers" | "private",
) {
  if (!/^[a-f0-9]{40}$/i.test(diffReference.baseCommitSha) || !/^[a-f0-9]{40}$/i.test(diffReference.headCommitSha) ||
      diffReference.baseCommitSha.toLowerCase() === diffReference.headCommitSha.toLowerCase()) {
    throw new Error("Diff commits are invalid");
  }
  if (!diffReference.baseSnapshot && !diffReference.headSnapshot) throw new Error("Diff cannot be empty");
  if (diffReference.visibility === "private" && postVisibility !== "private") throw new Error("Private diff can only be attached to a private post");
}

type FollowRow = Doc<"follows">;

async function matchesFollowTarget(ctx: QueryCtx, post: Doc<"posts">, follows: FollowRow[]) {
  for (const follow of follows) {
    const target = follow.target;
    if (target.kind === "person" && target.userId === post.authorId) return true;
    if (target.kind === "repo" && await postReferencesRepository(ctx, post, target.repositoryId)) return true;
    if ((target.kind === "topic" || target.kind === "category") && await postMatchesTopic(ctx, post, target.slug)) return true;
  }
  return false;
}

async function postReferencesRepository(ctx: QueryCtx, post: Doc<"posts">, repositoryId: Id<"repositories">) {
  const repository = await ctx.db.get(repositoryId);
  if (!repository || repository.visibility !== "public") return false;
  const references = [
    post.sourceReferenceId === undefined ? null : await ctx.db.get(post.sourceReferenceId),
    post.diffReferenceId === undefined ? null : await ctx.db.get(post.diffReferenceId),
  ];
  return references.some((reference) => reference !== null && reference.provider === repository.provider &&
    (reference.repositoryId === repository.providerRepositoryId || reference.repositoryFullName.toLowerCase() === repository.fullName.toLowerCase()));
}

async function postMatchesTopic(ctx: QueryCtx, post: Doc<"posts">, slug: string) {
  const normalized = slug.toLowerCase();
  const references = [
    post.sourceReferenceId === undefined ? null : await ctx.db.get(post.sourceReferenceId),
    post.diffReferenceId === undefined ? null : await ctx.db.get(post.diffReferenceId),
  ];
  for (const reference of references) {
    if (reference?.language?.toLowerCase() === normalized) return true;
    if (!reference) continue;
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", reference.provider).eq("providerRepositoryId", reference.repositoryId)).unique();
    if (repository?.topics.some((topic) => topic.toLowerCase() === normalized) || repository?.primaryLanguage?.toLowerCase() === normalized) return true;
  }
  return false;
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 20;
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
    maximumBytesRead: 512_000,
  };
}
