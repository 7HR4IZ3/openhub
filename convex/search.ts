import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { isPostSuppressed } from "./trust-helpers";

const personResult = v.object({
  _id: v.id("profiles"),
  handle: v.string(),
  displayName: v.string(),
  bio: v.union(v.string(), v.null()),
  avatarUrl: v.union(v.string(), v.null()),
});

const postResult = v.object({
  _id: v.id("posts"),
  type: v.string(),
  body: v.string(),
  createdAt: v.number(),
  authorHandle: v.string(),
  authorName: v.string(),
});

const collectionResult = v.object({
  _id: v.string(),
  title: v.string(),
  description: v.string(),
  visibility: v.string(),
});

export const all = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.object({ people: v.array(personResult), posts: v.array(postResult), lists: v.array(collectionResult), communities: v.array(collectionResult) }),
  handler: async (ctx, args) => {
    const term = args.query.trim();
    if (term.length < 2 || term.length > 200) return { people: [], posts: [], lists: [], communities: [] };
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 8), 20));
    const viewerId = await getAuthUserId(ctx);
    const people = await ctx.db.query("profiles")
      .withSearchIndex("search_display_name", (search) => search.search("displayName", term))
      .take(limit);
    const exactHandle = await ctx.db.query("profiles")
      .withIndex("by_handle", (q) => q.eq("handle", term.toLowerCase()))
      .unique();
    const peopleById = new Map(people.map((profile) => [profile._id, profile]));
    if (exactHandle) peopleById.set(exactHandle._id, exactHandle);

    const candidates = await ctx.db.query("posts")
      .withSearchIndex("search_body", (search) => search.search("body", term).eq("visibility", "public"))
      .take(limit * 3);
    const posts: Array<Doc<"posts"> & { authorHandle: string; authorName: string }> = [];
    for (const post of candidates) {
      if (await isPostSuppressed(ctx, post, viewerId)) continue;
      const author = await authorForSearch(ctx, post.authorId);
      if (!author) continue;
      posts.push({ ...post, authorHandle: author.handle, authorName: author.displayName });
      if (posts.length === limit) break;
    }

    const lists = await ctx.db.query("lists")
      .withSearchIndex("search_title", (search) => search.search("title", term).eq("visibility", "public"))
      .take(limit);
    const communities = await ctx.db.query("communities")
      .withSearchIndex("search_name", (search) => search.search("name", term).eq("visibility", "public"))
      .take(limit);

    return {
      people: [...peopleById.values()].slice(0, limit).map((profile) => ({
        _id: profile._id,
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      })),
      posts: posts.map((post) => ({
        _id: post._id,
        type: post.type,
        body: post.body,
        createdAt: post.createdAt,
        authorHandle: post.authorHandle,
        authorName: post.authorName,
      })),
      lists: lists.map((list) => ({ _id: String(list._id), title: list.title, description: list.description, visibility: list.visibility })),
      communities: communities.map((community) => ({ _id: String(community._id), title: community.name, description: community.description, visibility: community.visibility })),
    };
  },
});

async function authorForSearch(ctx: QueryCtx, userId: Doc<"users">["_id"]) {
  return await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", userId)).unique();
}
