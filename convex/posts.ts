import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyPublicDiff, verifyPublicSource } from "./github-source";
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

const feedModeValidator = v.union(
  v.literal("forYou"),
  v.literal("following"),
  v.literal("trending"),
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
  repositoryName: v.string(),
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

const diffReferenceValidator = v.object({
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
  visibility: v.literal("public"),
  baseSnapshot: v.string(),
  headSnapshot: v.string(),
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

const quotedPostValidator = v.object({
  _id: v.id("posts"),
  type: postTypeValidator,
  body: v.string(),
  createdAt: v.number(),
  author: postAuthorValidator,
  sourceReference: v.union(sourceReferenceValidator, v.null()),
  diffReference: v.union(diffReferenceValidator, v.null()),
});

const postDetailValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  type: postTypeValidator,
  body: v.string(),
  sourceReferenceId: v.optional(v.id("sourceReferences")),
  diffReferenceId: v.optional(v.id("diffReferences")),
  quoteOfId: v.optional(v.id("posts")),
  visibility: visibilityValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  likeCount: v.number(),
  commentCount: v.number(),
  repostCount: v.number(),
  author: postAuthorValidator,
  sourceReference: v.union(sourceReferenceValidator, v.null()),
  diffReference: v.union(diffReferenceValidator, v.null()),
  quotedPost: v.union(quotedPostValidator, v.null()),
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

export const feed = query({
  args: { mode: feedModeValidator, limit: v.optional(v.number()) },
  returns: v.array(postDetailValidator),
  handler: async (ctx, { mode, limit }) => {
    const userId = await getAuthUserId(ctx);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_visibility_created_at", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(100);
    const visible = mode === "following" ? await followingPosts(ctx, posts, userId) : posts;
    const ordered = mode === "trending"
      ? rankTrendingPosts(visible)
      : mode === "forYou"
        ? await rankForYouPosts(ctx, visible, userId)
        : visible;
    return await Promise.all(ordered.slice(0, clampLimit(limit)).map((post) => toPostDetail(ctx, post, userId)));
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
    if (post === null || !(await canViewPost(ctx, post, userId))) return null;

    return await toPostDetail(ctx, post, userId);
  },
});

export const byAuthor = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(postDetailValidator),
  handler: async (ctx, { userId, limit }) => {
    const posts = await ctx.db.query("posts")
      .withIndex("by_author_visibility_created_at", (q) => q.eq("authorId", userId).eq("visibility", "public"))
      .order("desc").take(clampLimit(limit));
    return await Promise.all(posts.map((post) => toPostDetail(ctx, post, null)));
  },
});

export const byRepository = query({
  args: { provider: v.string(), providerRepositoryId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(postDetailValidator),
  handler: async (ctx, { provider, providerRepositoryId, limit }) => {
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", provider).eq("providerRepositoryId", providerRepositoryId)).unique();
    if (!repository || repository.visibility !== "public") return [];

    const sourceReferences = await ctx.db.query("sourceReferences")
      .withIndex("by_repository_commit_path", (q) => q.eq("repositoryId", providerRepositoryId))
      .order("desc").take(80);
    const diffReferences = await ctx.db.query("diffReferences")
      .withIndex("by_repository_created_at", (q) => q.eq("repositoryId", providerRepositoryId))
      .order("desc").take(80);
    const sourcePosts = await Promise.all(sourceReferences
      .filter((source) => source.provider === provider && source.visibility === "public")
      .map((source) => ctx.db.query("posts")
        .withIndex("by_source_reference_created_at", (q) => q.eq("sourceReferenceId", source._id))
        .order("desc").take(4)));
    const diffPosts = await Promise.all(diffReferences
      .filter((diff) => diff.provider === provider && diff.visibility === "public")
      .map((diff) => ctx.db.query("posts")
        .withIndex("by_diff_reference_created_at", (q) => q.eq("diffReferenceId", diff._id))
        .order("desc").take(4)));
    const posts = [...new Map([...sourcePosts.flat(), ...diffPosts.flat()]
      .filter((post) => post.visibility === "public")
      .map((post) => [post._id, post])).values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, clampLimit(limit));
    const userId = await getAuthUserId(ctx);
    return await Promise.all(posts.map((post) => toPostDetail(ctx, post, userId)));
  },
});

export const create = mutation({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    sourceReference: v.optional(sourceReferenceInputValidator),
    diffReference: v.optional(diffReferenceInputValidator),
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    if (new TextEncoder().encode(args.body).length > 64_000) {
      throw new Error("Post text exceeds storage limit");
    }
    if (args.body.trim().length === 0 && args.sourceReference === undefined && args.diffReference === undefined) {
      throw new Error("A post needs text or a source reference");
    }

    if (args.sourceReference !== undefined) {
      validateSourceReference(args.sourceReference, args.visibility);
      // Client-supplied visibility and attribution are not trustworthy.
      throw new Error("Use the verified source publishing action");
    }
    if (args.diffReference !== undefined) {
      validateDiffReference(args.diffReference);
      throw new Error("Use the verified diff publishing action");
    }

    const now = Date.now();
    const postId = await ctx.db.insert("posts", {
      authorId: userId,
      type: args.type,
      body: args.body,
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

export const createSource = action({
  args: { type: postTypeValidator, body: v.string(), visibility: visibilityValidator,
    sourceReference: sourceReferenceInputValidator },
  returns: postValidator,
  handler: async (ctx, args): Promise<Doc<"posts">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (new TextEncoder().encode(args.body).length > 64_000) throw new Error("Post text exceeds storage limit");
    if (new TextEncoder().encode(JSON.stringify(args.sourceReference)).length > 100_000) throw new Error("Source reference exceeds request limit");
    const sourceReference = await verifyPublicSource(args.sourceReference);
    const post = await ctx.runMutation(internal.posts.persistVerifiedSource, { ...args, sourceReference, authorId: userId });
    const repository = await ctx.runQuery(internal.repositories.byProviderRepositoryInternal, {
      provider: sourceReference.provider,
      providerRepositoryId: sourceReference.repositoryId,
    });
    if (repository) await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId: repository._id });
    return post;
  },
});

export const createDiff = action({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    diffReference: diffReferenceInputValidator,
  },
  returns: postValidator,
  handler: async (ctx, args): Promise<Doc<"posts">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (new TextEncoder().encode(args.body).length > 64_000) throw new Error("Post text exceeds storage limit");
    if (new TextEncoder().encode(JSON.stringify(args.diffReference)).length > 2_000_000) throw new Error("Diff reference exceeds request limit");
    const diffReference = await verifyPublicDiff(args.diffReference);
    const post = await ctx.runMutation(internal.posts.persistVerifiedDiff, { ...args, diffReference, authorId: userId });
    const repository = await ctx.runQuery(internal.repositories.byProviderRepositoryInternal, {
      provider: diffReference.provider,
      providerRepositoryId: diffReference.repositoryId,
    });
    if (repository) await ctx.runAction(internal.discovery.refreshPublicSignals, { repositoryId: repository._id });
    return post;
  },
});

export const persistVerifiedSource = internalMutation({
  args: { type: postTypeValidator, body: v.string(), visibility: visibilityValidator,
    sourceReference: sourceReferenceInputValidator, authorId: v.id("users") },
  returns: postValidator,
  handler: async (ctx, args) => {
    validateSourceReference(args.sourceReference, args.visibility);
    if (await ctx.db.get(args.authorId) === null) throw new Error("Author is not available");
    await ensurePublicRepository(ctx, args.sourceReference);
    const now = Date.now();
    const sourceReferenceId = await ctx.db.insert("sourceReferences", {
      ...args.sourceReference, verifiedAt: now, createdAt: now,
    });
    const id = await ctx.db.insert("posts", {
      authorId: args.authorId, type: args.type, body: args.body, visibility: args.visibility,
      sourceReferenceId, createdAt: now, updatedAt: now, likeCount: 0, commentCount: 0, repostCount: 0,
    });
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found after creation");
    return post;
  },
});

export const persistVerifiedDiff = internalMutation({
  args: {
    type: postTypeValidator,
    body: v.string(),
    visibility: visibilityValidator,
    diffReference: diffReferenceInputValidator,
    authorId: v.id("users"),
  },
  returns: postValidator,
  handler: async (ctx, args) => {
    validateDiffReference(args.diffReference);
    if (await ctx.db.get(args.authorId) === null) throw new Error("Author is not available");
    await ensurePublicRepository(ctx, args.diffReference);
    const { repositoryName: _repositoryName, ...storedReference } = args.diffReference;
    const now = Date.now();
    const diffReferenceId = await ctx.db.insert("diffReferences", {
      ...storedReference,
      verifiedAt: now,
      createdAt: now,
    });
    const id = await ctx.db.insert("posts", {
      authorId: args.authorId,
      type: args.type,
      body: args.body,
      visibility: args.visibility,
      diffReferenceId,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    });
    const post = await ctx.db.get(id);
    if (!post) throw new Error("Post not found after creation");
    return post;
  },
});

async function ensurePublicRepository(
  ctx: MutationCtx,
  source: {
    provider: string;
    repositoryId: string;
    repositoryFullName: string;
    originalOwner: string;
    path: string;
    language?: string;
    licenseSpdxId?: string;
  },
) {
  if (source.provider !== "github") throw new Error("Only GitHub sources are supported");
  const [ownerLogin, name] = source.repositoryFullName.split("/");
  if (!ownerLogin || !name || ownerLogin !== source.originalOwner) throw new Error("Source repository is invalid");
  const existing = await ctx.db.query("repositories")
    .withIndex("by_provider_repository", (q) => q.eq("provider", source.provider).eq("providerRepositoryId", source.repositoryId)).unique();
  if (existing) {
    if (existing.visibility !== "public" || existing.fullName.toLowerCase() !== source.repositoryFullName.toLowerCase()) {
      throw new Error("Source repository is not public");
    }
    return existing;
  }
  const now = Date.now();
  const id = await ctx.db.insert("repositories", {
    provider: "github",
    providerRepositoryId: source.repositoryId,
    ownerLogin,
    name,
    fullName: source.repositoryFullName,
    url: `https://github.com/${encodeURIComponent(ownerLogin)}/${encodeURIComponent(name)}`,
    visibility: "public",
    ...(source.language === undefined ? {} : { primaryLanguage: source.language }),
    stars: 0,
    forks: 0,
    openIssues: 0,
    ...(source.licenseSpdxId === undefined ? {} : { licenseSpdxId: source.licenseSpdxId }),
    topics: [],
    updatedAt: now,
    indexedAt: now,
  });
  return await ctx.db.get(id);
}

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
    if (new TextEncoder().encode(args.body).length > 64_000) {
      throw new Error("Quote text exceeds storage limit");
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
  const sourceReference = await readableSourceReference(ctx, post);
  const diffReference = await readableDiffReference(ctx, post);
  const quotedPost = post.quoteOfId === undefined
    ? null
    : await toQuotedPostDetail(ctx, post.quoteOfId);

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
    quotedPost,
    viewer: { liked, bookmarked, reposted },
  };
}

async function toQuotedPostDetail(ctx: QueryCtx, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || post.visibility !== "public") return null;
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", post.authorId))
    .unique();
  return {
    _id: post._id,
    type: post.type,
    body: post.body,
    createdAt: post.createdAt,
    author: profile === null
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
    sourceReference: await readableSourceReference(ctx, post),
    diffReference: await readableDiffReference(ctx, post),
  };
}

async function readableSourceReference(
  ctx: QueryCtx,
  post: Doc<"posts">,
) {
  if (post.sourceReferenceId === undefined) return null;
  const source = await ctx.db.get(post.sourceReferenceId);
  if (!source || source.visibility !== "public") return null;
  const repository = await ctx.db.query("repositories")
    .withIndex("by_provider_repository", (q) => q.eq("provider", source.provider).eq("providerRepositoryId", source.repositoryId)).unique();
  if (!repository || repository.visibility !== "public" || repository.fullName.toLowerCase() !== source.repositoryFullName.toLowerCase()) return null;
  return source;
}

async function readableDiffReference(
  ctx: QueryCtx,
  post: Doc<"posts">,
) {
  if (post.diffReferenceId === undefined) return null;
  const diff = await ctx.db.get(post.diffReferenceId);
  if (!diff || diff.visibility !== "public") return null;
  const repository = await ctx.db.query("repositories")
    .withIndex("by_provider_repository", (q) => q.eq("provider", diff.provider).eq("providerRepositoryId", diff.repositoryId)).unique();
  if (!repository || repository.visibility !== "public" || repository.fullName.toLowerCase() !== diff.repositoryFullName.toLowerCase()) return null;
  return diff;
}

async function followingPosts(
  ctx: QueryCtx,
  posts: Doc<"posts">[],
  userId: Id<"users"> | null,
) {
  if (userId === null) return [];
  const follows = await ctx.db.query("follows")
    .withIndex("by_userId", (q) => q.eq("userId", userId)).take(100);
  const people = new Set<Id<"users">>();
  const repositories = new Set<Id<"repositories">>();
  for (const follow of follows) {
    if (follow.target.kind === "person") people.add(follow.target.userId);
    if (follow.target.kind === "repo") repositories.add(follow.target.repositoryId);
  }
  const result: Doc<"posts">[] = [];
  for (const post of posts) {
    if (people.has(post.authorId)) {
      result.push(post);
      continue;
    }
    if (repositories.size === 0) continue;
    const repository = await repositoryForPost(ctx, post);
    if (repository && repositories.has(repository._id)) result.push(post);
  }
  return result;
}

function rankTrendingPosts(posts: Doc<"posts">[]) {
  const now = Date.now();
  const ranked = [...posts].sort((a, b) => trendingScore(b, now) - trendingScore(a, now) || b.createdAt - a.createdAt);
  const authors = new Map<Id<"users">, number>();
  const fingerprints = new Set<string>();
  const result: Doc<"posts">[] = [];
  for (const post of ranked) {
    const count = authors.get(post.authorId) ?? 0;
    if (count >= 3) continue;
    const fingerprint = trendingFingerprint(post);
    if (fingerprint !== null && fingerprints.has(fingerprint)) continue;
    authors.set(post.authorId, count + 1);
    if (fingerprint !== null) fingerprints.add(fingerprint);
    result.push(post);
  }
  return result;
}

function trendingFingerprint(post: Doc<"posts">) {
  const body = post.body.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 240);
  return body.length === 0 ? null : `${post.type}:${body}`;
}

async function rankForYouPosts(
  ctx: QueryCtx,
  posts: Doc<"posts">[],
  userId: Id<"users"> | null,
) {
  if (userId === null) return posts;
  const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
  const follows = await ctx.db.query("follows").withIndex("by_userId", (q) => q.eq("userId", userId)).take(100);
  const interests = new Set([
    ...(profile?.interests ?? []),
    ...follows.flatMap((follow) => follow.target.kind === "topic" || follow.target.kind === "category" ? [follow.target.slug] : []),
  ].map((interest) => interest.toLowerCase()));
  const followedPeople = new Set(follows.flatMap((follow) => follow.target.kind === "person" ? [follow.target.userId] : []));
  const followedRepositories = new Set(follows.flatMap((follow) => follow.target.kind === "repo" ? [follow.target.repositoryId] : []));
  const ranked = await Promise.all(posts.map(async (post) => {
    let score = post.createdAt / 1_000_000_000_000;
    if (followedPeople.has(post.authorId)) score += 40;
    const repository = await repositoryForPost(ctx, post);
    if (repository?.visibility === "public") {
      if (followedRepositories.has(repository._id)) score += 35;
      if (repository.primaryLanguage && interests.has(repository.primaryLanguage.toLowerCase())) score += 18;
      score += repository.topics.filter((topic) => interests.has(topic.toLowerCase())).length * 12;
      score += 5;
    }
    score += Math.min(12, post.commentCount * 2 + post.repostCount + post.likeCount * 0.5);
    return { post, score };
  }));
  return ranked.sort((a, b) => b.score - a.score || b.post.createdAt - a.post.createdAt).map(({ post }) => post);
}

function trendingScore(post: Doc<"posts">, now: number) {
  const ageHours = Math.max(1, (now - post.createdAt) / 3_600_000);
  const engagement = post.likeCount * 2 + post.commentCount * 4 + post.repostCount * 3;
  const sourceContext = post.sourceReferenceId === undefined && post.diffReferenceId === undefined ? 0 : 6;
  const substantiveBody = Math.min(4, post.body.trim().length / 240);
  return (engagement + sourceContext + substantiveBody) / Math.pow(ageHours, 0.35);
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

function validateDiffReference(diffReference: {
  baseCommitSha: string;
  headCommitSha: string;
  baseSnapshot: string;
  headSnapshot: string;
  visibility: "public";
}) {
  if (
    !/^[a-f0-9]{40}$/i.test(diffReference.baseCommitSha) ||
    !/^[a-f0-9]{40}$/i.test(diffReference.headCommitSha) ||
    diffReference.baseCommitSha.toLowerCase() === diffReference.headCommitSha.toLowerCase() ||
    diffReference.visibility !== "public"
  ) throw new Error("Diff reference is invalid");
  if (diffReference.baseSnapshot.length === 0 && diffReference.headSnapshot.length === 0) {
    throw new Error("Diff cannot be empty");
  }
  if (new TextEncoder().encode(diffReference.baseSnapshot).length + new TextEncoder().encode(diffReference.headSnapshot).length > 800_000) {
    throw new Error("Diff snapshots exceed storage limit");
  }
}

async function repositoryForPost(ctx: QueryCtx, post: Doc<"posts">) {
  if (post.sourceReferenceId !== undefined) {
    const source = await ctx.db.get(post.sourceReferenceId);
    if (source) {
      const repository = await ctx.db.query("repositories")
        .withIndex("by_provider_repository", (q) => q.eq("provider", source.provider).eq("providerRepositoryId", source.repositoryId)).unique();
      if (repository?.visibility === "public" && repository.fullName.toLowerCase() === source.repositoryFullName.toLowerCase()) return repository;
    }
  }
  if (post.diffReferenceId !== undefined) {
    const diff = await ctx.db.get(post.diffReferenceId);
    if (diff) {
      const repository = await ctx.db.query("repositories")
        .withIndex("by_provider_repository", (q) => q.eq("provider", diff.provider).eq("providerRepositoryId", diff.repositoryId)).unique();
      if (repository?.visibility === "public" && repository.fullName.toLowerCase() === diff.repositoryFullName.toLowerCase()) return repository;
    }
  }
  return null;
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(Math.floor(value), 50));
}
