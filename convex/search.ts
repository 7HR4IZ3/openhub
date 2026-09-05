import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";

const profileResult = v.object({
  _id: v.id("profiles"),
  userId: v.id("users"),
  handle: v.string(),
  displayName: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
  bio: v.union(v.string(), v.null()),
});

const postResult = v.object({
  _id: v.id("posts"),
  type: v.string(),
  body: v.string(),
  createdAt: v.number(),
  author: v.object({ handle: v.string(), displayName: v.string() }),
  source: v.union(v.object({ repositoryFullName: v.string(), path: v.string(), startLine: v.number(), endLine: v.number() }), v.null()),
  diff: v.union(v.object({ repositoryFullName: v.string(), path: v.string(), baseCommitSha: v.string(), headCommitSha: v.string() }), v.null()),
});

const collectionResult = v.object({
  _id: v.union(v.id("lists"), v.id("communities")),
  kind: v.union(v.literal("list"), v.literal("community")),
  title: v.string(),
  description: v.string(),
  owner: v.object({ handle: v.string(), displayName: v.string() }),
});

const resultValidator = v.object({ profiles: v.array(profileResult), posts: v.array(postResult), collections: v.array(collectionResult) });

export const all = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const searchText = args.query.trim();
    if (!searchText || searchText.length > 120 || new TextEncoder().encode(searchText).length > 512) {
      return { profiles: [], posts: [], collections: [] };
    }
    const limit = clampLimit(args.limit);
    const [profileRows, exactProfile, postRows, listRows, communityRows] = await Promise.all([
      ctx.db.query("profiles").withSearchIndex("search_display_name", (q) => q.search("displayName", searchText)).take(limit),
      ctx.db.query("profiles").withIndex("by_handle", (q) => q.eq("handle", searchText.toLowerCase())).unique(),
      ctx.db.query("posts").withSearchIndex("search_body", (q) => q.search("body", searchText).eq("visibility", "public")).take(limit),
      ctx.db.query("lists").withSearchIndex("search_title", (q) => q.search("title", searchText).eq("visibility", "public")).take(limit),
      ctx.db.query("communities").withSearchIndex("search_name", (q) => q.search("name", searchText).eq("visibility", "public")).take(limit),
    ]);
    const profiles = uniqueProfiles([...(exactProfile ? [exactProfile] : []), ...profileRows]).slice(0, limit).map((profile) => ({
      _id: profile._id,
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      bio: profile.bio ?? null,
    }));
    const posts = (await Promise.all(postRows.map((post) => publicPostResult(ctx, post)))).filter((post): post is NonNullable<typeof post> => post !== null).slice(0, limit);
    const collections = (await Promise.all([
      ...listRows.map((list) => collectionResultFor(ctx, list, "list")),
      ...communityRows.map((community) => collectionResultFor(ctx, community, "community")),
    ])).slice(0, limit);
    return { profiles, posts, collections };
  },
});

async function publicPostResult(ctx: QueryCtx, post: Doc<"posts">) {
  let source: { repositoryFullName: string; path: string; startLine: number; endLine: number } | null = null;
  let diff: { repositoryFullName: string; path: string; baseCommitSha: string; headCommitSha: string } | null = null;
  if (post.sourceReferenceId !== undefined) {
    const reference = await ctx.db.get(post.sourceReferenceId);
    if (!reference || reference.visibility !== "public") return null;
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", reference.provider).eq("providerRepositoryId", reference.repositoryId)).unique();
    if (!repository || repository.visibility !== "public" || repository.fullName.toLowerCase() !== reference.repositoryFullName.toLowerCase()) return null;
    source = { repositoryFullName: reference.repositoryFullName, path: reference.path, startLine: reference.startLine, endLine: reference.endLine };
  }
  if (post.diffReferenceId !== undefined) {
    const reference = await ctx.db.get(post.diffReferenceId);
    if (!reference || reference.visibility !== "public") return null;
    const repository = await ctx.db.query("repositories")
      .withIndex("by_provider_repository", (q) => q.eq("provider", reference.provider).eq("providerRepositoryId", reference.repositoryId)).unique();
    if (!repository || repository.visibility !== "public" || repository.fullName.toLowerCase() !== reference.repositoryFullName.toLowerCase()) return null;
    diff = { repositoryFullName: reference.repositoryFullName, path: reference.path, baseCommitSha: reference.baseCommitSha, headCommitSha: reference.headCommitSha };
  }
  const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", post.authorId)).unique();
  return {
    _id: post._id,
    type: post.type,
    body: post.body,
    createdAt: post.createdAt,
    author: { handle: profile?.handle ?? "developer", displayName: profile?.displayName ?? "OpenHub developer" },
    source,
    diff,
  };
}

async function collectionResultFor(
  ctx: QueryCtx,
  collection: Doc<"lists"> | Doc<"communities">,
  kind: "list" | "community",
) {
  const owner = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", collection.ownerId)).unique();
  return {
    _id: collection._id,
    kind,
    title: kind === "list" ? (collection as Doc<"lists">).title : (collection as Doc<"communities">).name,
    description: collection.description,
    owner: { handle: owner?.handle ?? "developer", displayName: owner?.displayName ?? "OpenHub developer" },
  };
}

function uniqueProfiles(profiles: Doc<"profiles">[]) {
  const seen = new Set<Id<"profiles">>();
  return profiles.filter((profile) => {
    if (seen.has(profile._id)) return false;
    seen.add(profile._id);
    return true;
  });
}

function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 8;
  return Math.max(1, Math.min(Math.floor(value), 20));
}
