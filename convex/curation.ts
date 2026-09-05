import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { v, type Infer, type Validator } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  visibility, itemTarget, followTarget, listDocument, itemDocument,
  communityDocument, membershipDocument, followDocument, membershipStatus, role,
} from "./curation-schema";

function pageValidator<T extends Validator<unknown, "required", string>>(document: T) {
  return v.object({ page: v.array(document), isDone: v.boolean(), continueCursor: v.string() });
}

function bounded(options: PaginationOptions): PaginationOptions {
  if (!Number.isInteger(options.numItems) || options.numItems < 1 || options.numItems > 50) {
    throw new Error("Page size must be an integer from 1 to 50");
  }
  return { numItems: options.numItems, cursor: options.cursor, maximumRowsRead: 100, maximumBytesRead: 256_000 };
}

function pageResult<T>(result: { page: T[]; isDone: boolean; continueCursor: string }) {
  return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
}

function clean(value: string, maximum: number, allowEmpty = false) {
  const text = value.trim();
  if ((!allowEmpty && text.length === 0) || text.length > maximum) throw new Error("Invalid text length");
  return text;
}

async function viewer(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null || await ctx.db.get(userId) === null) throw new Error("Not signed in");
  return userId;
}

async function ownedList(ctx: QueryCtx, listId: Id<"lists">) {
  const userId = await viewer(ctx);
  const list = await ctx.db.get(listId);
  if (!list || list.ownerId !== userId) throw new Error("List is not available");
  return list;
}

async function readableList(ctx: QueryCtx, listId: Id<"lists">) {
  const list = await ctx.db.get(listId);
  const userId = await getAuthUserId(ctx);
  return list && (list.visibility === "public" || list.ownerId === userId) ? list : null;
}

function targetKey(target: Infer<typeof itemTarget> | Infer<typeof followTarget>): string {
  switch (target.kind) {
    case "repo": return `repo:${target.repositoryId}`;
    case "post": return `post:${target.postId}`;
    case "person": return `person:${target.userId}`;
    case "community": return `community:${target.communityId}`;
    default: return `${target.kind}:${target.slug}`;
  }
}

// Lists currently store public targets only. Never infer private access from
// authentication; check quoted/source content too, with a hard depth limit.
async function publicItem(ctx: QueryCtx, target: Infer<typeof itemTarget>): Promise<boolean> {
  if (target.kind === "repo") return (await ctx.db.get(target.repositoryId))?.visibility === "public";
  if (target.kind === "person") {
    return (await ctx.db.get(target.userId)) !== null &&
      (await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", target.userId)).unique()) !== null;
  }
  if (target.kind === "community") return (await ctx.db.get(target.communityId))?.visibility === "public";
  let postId: Id<"posts"> | undefined = target.postId;
  for (let depth = 0; postId && depth < 8; depth++) {
    const post: Doc<"posts"> | null = await ctx.db.get(postId);
    if (!post || post.visibility !== "public") return false;
    if (post.communityId !== undefined && (await ctx.db.get(post.communityId))?.visibility !== "public") return false;
    if (post.sourceReferenceId) {
      const source = await ctx.db.get(post.sourceReferenceId);
      if (!source || source.visibility !== "public") return false;
      const repo = await ctx.db.query("repositories")
        .withIndex("by_provider_repository", q => q.eq("provider", source.provider).eq("providerRepositoryId", source.repositoryId)).unique();
      if (!repo || repo.visibility !== "public") return false;
    }
    if (post.diffReferenceId) {
      const diff = await ctx.db.get(post.diffReferenceId);
      if (!diff || diff.visibility !== "public") return false;
      const repo = await ctx.db.query("repositories")
        .withIndex("by_provider_repository", q => q.eq("provider", diff.provider).eq("providerRepositoryId", diff.repositoryId)).unique();
      if (!repo || repo.visibility !== "public") return false;
    }
    postId = post.quoteOfId;
  }
  return postId === undefined;
}

export const discoverLists = query({
  args: { ownerId: v.optional(v.id("users")), paginationOpts: paginationOptsValidator },
  returns: pageValidator(listDocument),
  handler: async (ctx, args) => {
    const rows = args.ownerId
      ? ctx.db.query("lists").withIndex("by_ownerId_and_visibility", q => q.eq("ownerId", args.ownerId!).eq("visibility", "public"))
      : ctx.db.query("lists").withIndex("by_visibility", q => q.eq("visibility", "public"));
    return pageResult(await rows.order("desc").paginate(bounded(args.paginationOpts)));
  },
});

export const myLists = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator(listDocument),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    return pageResult(await ctx.db.query("lists").withIndex("by_ownerId", q => q.eq("ownerId", userId)).order("desc").paginate(bounded(args.paginationOpts)));
  },
});

export const myListChoices = query({
  args: {},
  returns: v.array(listDocument),
  handler: async (ctx) => {
    const userId = await viewer(ctx);
    return await ctx.db.query("lists")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(50);
  },
});

export const getList = query({
  args: { listId: v.id("lists") }, returns: v.union(listDocument, v.null()),
  handler: async (ctx, args) => readableList(ctx, args.listId),
});

export const createList = mutation({
  args: { title: v.string(), description: v.optional(v.string()), visibility }, returns: v.id("lists"),
  handler: async (ctx, args) => {
    const ownerId = await viewer(ctx);
    const now = Date.now();
    return ctx.db.insert("lists", { ownerId, title: clean(args.title, 120), description: clean(args.description ?? "", 2000, true), visibility: args.visibility, createdAt: now, updatedAt: now });
  },
});

export const editList = mutation({
  args: { listId: v.id("lists"), title: v.optional(v.string()), description: v.optional(v.string()), visibility: v.optional(visibility) }, returns: v.null(),
  handler: async (ctx, args) => {
    await ownedList(ctx, args.listId);
    await ctx.db.patch(args.listId, {
      ...(args.title !== undefined ? { title: clean(args.title, 120) } : {}),
      ...(args.description !== undefined ? { description: clean(args.description, 2000, true) } : {}),
      ...(args.visibility !== undefined ? { visibility: args.visibility } : {}), updatedAt: Date.now(),
    });
    return null;
  },
});

export const listItems = query({
  args: { listId: v.id("lists"), paginationOpts: paginationOptsValidator }, returns: pageValidator(v.object({
    _id: v.id("listItems"), _creationTime: v.number(), listId: v.id("lists"), target: itemTarget,
    targetKey: v.string(), createdAt: v.number(), targetLabel: v.string(), targetHref: v.string(),
  })),
  handler: async (ctx, args) => {
    if (!await readableList(ctx, args.listId)) throw new Error("List is not available");
    const result = await ctx.db.query("listItems").withIndex("by_listId", q => q.eq("listId", args.listId)).order("desc").paginate(bounded(args.paginationOpts));
    const resolved = await Promise.all(result.page.map((item) => resolveListItem(ctx, item)));
    // Post-pagination checks keep reads bounded and hide targets made private later.
    return { ...pageResult(result), page: resolved.filter((item): item is NonNullable<typeof item> => item !== null) };
  },
});

async function resolveListItem(ctx: QueryCtx, item: Doc<"listItems">) {
  const target = item.target;
  if (!await publicItem(ctx, target)) return null;
  switch (target.kind) {
    case "repo": {
      const repository = await ctx.db.get(target.repositoryId);
      if (!repository) return null;
      return { ...item, targetLabel: repository.fullName, targetHref: `/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}` };
    }
    case "post": {
      const post = await ctx.db.get(target.postId);
      if (!post) return null;
      return { ...item, targetLabel: `${post.type} · ${post.body.slice(0, 96) || "Source discussion"}`, targetHref: `/posts/${post._id}` };
    }
    case "person": {
      const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("userId", target.userId)).unique();
      if (!profile) return null;
      return { ...item, targetLabel: `${profile.displayName} · @${profile.handle}`, targetHref: `/profile/${encodeURIComponent(profile.handle)}` };
    }
    case "community": {
      const community = await ctx.db.get(target.communityId);
      if (!community) return null;
      return { ...item, targetLabel: community.name, targetHref: `/communities/${community._id}` };
    }
  }
}

export const addListItem = mutation({
  args: { listId: v.id("lists"), target: itemTarget }, returns: v.id("listItems"),
  handler: async (ctx, args) => {
    await ownedList(ctx, args.listId);
    if (!await publicItem(ctx, args.target)) throw new Error("Target is not available");
    const key = targetKey(args.target);
    const existing = await ctx.db.query("listItems").withIndex("by_listId_and_targetKey", q => q.eq("listId", args.listId).eq("targetKey", key)).unique();
    if (existing) return existing._id;
    const now = Date.now();
    await ctx.db.patch(args.listId, { updatedAt: now });
    return ctx.db.insert("listItems", { listId: args.listId, target: args.target, targetKey: key, createdAt: now });
  },
});

export const removeListItem = mutation({
  args: { listId: v.id("lists"), target: itemTarget }, returns: v.null(),
  handler: async (ctx, args) => {
    await ownedList(ctx, args.listId);
    const item = await ctx.db.query("listItems").withIndex("by_listId_and_targetKey", q => q.eq("listId", args.listId).eq("targetKey", targetKey(args.target))).unique();
    if (item) { await ctx.db.delete(item._id); await ctx.db.patch(args.listId, { updatedAt: Date.now() }); }
    return null;
  },
});

async function membership(ctx: QueryCtx, communityId: Id<"communities">, userId: Id<"users">) {
  return ctx.db.query("communityMemberships").withIndex("by_communityId_and_userId", q => q.eq("communityId", communityId).eq("userId", userId)).unique();
}

async function communityAccess(ctx: QueryCtx, communityId: Id<"communities">) {
  const community = await ctx.db.get(communityId);
  const userId = await getAuthUserId(ctx);
  const member = userId ? await membership(ctx, communityId, userId) : null;
  const active = member?.status === "active";
  const canRead = !!community && (community.visibility === "public" || (active && userId !== null));
  return { community, userId, member, active, canRead };
}

export const discoverCommunities = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator(communityDocument),
  handler: async (ctx, args) => pageResult(await ctx.db.query("communities").withIndex("by_visibility", q => q.eq("visibility", "public")).order("desc").paginate(bounded(args.paginationOpts))),
});

export const getCommunity = query({
  args: { communityId: v.id("communities") }, returns: v.union(communityDocument, v.null()),
  handler: async (ctx, args) => {
    const access = await communityAccess(ctx, args.communityId);
    return access.canRead ? access.community : null;
  },
});

export const membershipState = query({
  args: { communityId: v.id("communities") },
  returns: v.union(v.object({ role, status: membershipStatus }), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const row = await membership(ctx, args.communityId, userId);
    return row ? { role: row.role, status: row.status } : null;
  },
});

export const createCommunity = mutation({
  args: { name: v.string(), description: v.optional(v.string()), visibility }, returns: v.id("communities"),
  handler: async (ctx, args) => {
    const ownerId = await viewer(ctx);
    const now = Date.now();
    const communityId = await ctx.db.insert("communities", { ownerId, name: clean(args.name, 120), description: clean(args.description ?? "", 2000, true), visibility: args.visibility, createdAt: now, updatedAt: now });
    await ctx.db.insert("communityMemberships", { communityId, userId: ownerId, role: "owner", status: "active", createdAt: now, updatedAt: now });
    return communityId;
  },
});

export const editCommunity = mutation({
  args: { communityId: v.id("communities"), name: v.optional(v.string()), description: v.optional(v.string()), visibility: v.optional(visibility) }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const community = await ctx.db.get(args.communityId);
    if (!community || community.ownerId !== userId) throw new Error("Community is not available");
    await ctx.db.patch(community._id, {
      ...(args.name !== undefined ? { name: clean(args.name, 120) } : {}),
      ...(args.description !== undefined ? { description: clean(args.description, 2000, true) } : {}),
      ...(args.visibility !== undefined ? { visibility: args.visibility } : {}), updatedAt: Date.now(),
    });
    return null;
  },
});

export const myCommunities = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator(communityDocument),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("communityMemberships").withIndex("by_userId_and_status", q => q.eq("userId", userId).eq("status", "active")).order("desc").paginate(bounded(args.paginationOpts));
    const communities = await Promise.all(result.page.map(row => ctx.db.get(row.communityId)));
    return { ...pageResult(result), page: communities.filter(row => row !== null) };
  },
});

export const joinCommunity = mutation({
  args: { communityId: v.id("communities") }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const community = await ctx.db.get(args.communityId);
    const existing = await membership(ctx, args.communityId, userId);
    if (!community || existing?.status === "banned" || (community.visibility !== "public" && existing?.status !== "active")) throw new Error("Community is not available");
    if (!existing) {
      const now = Date.now();
      await ctx.db.insert("communityMemberships", { communityId: args.communityId, userId, role: "member", status: "active", createdAt: now, updatedAt: now });
    }
    return null;
  },
});

export const leaveCommunity = mutation({
  args: { communityId: v.id("communities") }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const community = await ctx.db.get(args.communityId);
    const existing = await membership(ctx, args.communityId, userId);
    if (community?.ownerId === userId || existing?.role === "owner") throw new Error("Owner must transfer ownership before leaving");
    // A banned user cannot erase their ban by leaving and rejoining.
    if (existing?.status === "active") await ctx.db.delete(existing._id);
    return null;
  },
});

export const listCommunityMembers = query({
  args: { communityId: v.id("communities"), status: v.optional(membershipStatus), paginationOpts: paginationOptsValidator }, returns: pageValidator(membershipDocument),
  handler: async (ctx, args) => {
    const access = await communityAccess(ctx, args.communityId);
    const status = args.status ?? "active";
    // Roster is member-only, including for public communities; bans are staff-only.
    if (!access.community || !access.active || (status === "banned" && access.member?.role === "member")) throw new Error("Community is not available");
    return pageResult(await ctx.db.query("communityMemberships").withIndex("by_communityId_and_status", q => q.eq("communityId", args.communityId).eq("status", status)).paginate(bounded(args.paginationOpts)));
  },
});

export const moderateMembership = mutation({
  args: {
    communityId: v.id("communities"), userId: v.id("users"),
    action: v.union(v.literal("add"), v.literal("remove"), v.literal("ban"), v.literal("unban"), v.literal("promote"), v.literal("demote")),
  }, returns: v.null(),
  handler: async (ctx, args) => {
    await viewer(ctx);
    const access = await communityAccess(ctx, args.communityId);
    if (!access.community || !access.active || !access.member || access.member.role === "member") throw new Error("Community is not available");
    const owner = access.community.ownerId === access.userId && access.member.role === "owner";
    const target = await membership(ctx, args.communityId, args.userId);
    if (args.userId === access.community.ownerId || target?.role === "owner") throw new Error("Owner membership is protected");
    if (!owner && (target?.role === "moderator" || args.action === "promote" || args.action === "demote")) throw new Error("Owner permission required");
    const now = Date.now();
    switch (args.action) {
      case "add":
        if (!await ctx.db.get(args.userId)) throw new Error("User is not available");
        if (target?.status === "banned") throw new Error("Unban member first");
        if (!target) await ctx.db.insert("communityMemberships", { communityId: args.communityId, userId: args.userId, role: "member", status: "active", createdAt: now, updatedAt: now });
        break;
      case "remove":
        if (target?.status === "banned") throw new Error("Use unban to clear a ban");
        if (target) await ctx.db.delete(target._id);
        break;
      case "ban":
        if (!await ctx.db.get(args.userId)) throw new Error("User is not available");
        if (target) await ctx.db.patch(target._id, { role: "member", status: "banned", updatedAt: now });
        else await ctx.db.insert("communityMemberships", { communityId: args.communityId, userId: args.userId, role: "member", status: "banned", createdAt: now, updatedAt: now });
        break;
      case "unban":
        // Removing a ban does not grant access to a private community.
        if (target?.status === "banned") await ctx.db.delete(target._id);
        break;
      case "promote":
      case "demote":
        if (!target || target.status !== "active") throw new Error("Active membership required");
        await ctx.db.patch(target._id, { role: args.action === "promote" ? "moderator" : "member", updatedAt: now });
        break;
    }
    return null;
  },
});

export const transferCommunityOwnership = mutation({
  args: { communityId: v.id("communities"), userId: v.id("users") }, returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const community = await ctx.db.get(args.communityId);
    const current = await membership(ctx, args.communityId, userId);
    const next = await membership(ctx, args.communityId, args.userId);
    if (!community || community.ownerId !== userId || current?.role !== "owner" || current.status !== "active") throw new Error("Owner permission required");
    if (!next || next.status !== "active" || !await ctx.db.get(args.userId)) throw new Error("Active membership required");
    if (userId === args.userId) return null;
    const now = Date.now();
    await ctx.db.patch(current._id, { role: "moderator", updatedAt: now });
    await ctx.db.patch(next._id, { role: "owner", updatedAt: now });
    await ctx.db.patch(community._id, { ownerId: args.userId, updatedAt: now });
    return null;
  },
});

function normalizedFollow(target: Infer<typeof followTarget>): Infer<typeof followTarget> {
  if (target.kind !== "topic" && target.kind !== "category") return target;
  const slug = clean(target.slug, 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid target slug");
  return { ...target, slug };
}

async function availableFollow(ctx: QueryCtx, target: Infer<typeof followTarget>) {
  if (target.kind === "repo") return publicItem(ctx, target);
  if (target.kind === "person") {
    // A public profile, not a raw auth record, establishes a discoverable person.
    return (await ctx.db.get(target.userId)) !== null && (await ctx.db.query("profiles").withIndex("by_user_id", q => q.eq("userId", target.userId)).unique()) !== null;
  }
  return true;
}

export const setFollow = mutation({
  args: { target: followTarget, following: v.boolean() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const target = normalizedFollow(args.target);
    const key = targetKey(target);
    const existing = await ctx.db.query("follows").withIndex("by_userId_and_targetKey", q => q.eq("userId", userId).eq("targetKey", key)).unique();
    // Removal remains possible when a target is deleted or made private.
    if (!args.following) { if (existing) await ctx.db.delete(existing._id); return false; }
    if ((target.kind === "person" && target.userId === userId) || !await availableFollow(ctx, target)) throw new Error("Target is not available");
    if (!existing) await ctx.db.insert("follows", { userId, target, targetKey: key, createdAt: Date.now() });
    return true;
  },
});

export const isFollowing = query({
  args: { target: followTarget }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const target = normalizedFollow(args.target);
    if (!await availableFollow(ctx, target)) return false;
    return (await ctx.db.query("follows").withIndex("by_userId_and_targetKey", q => q.eq("userId", userId).eq("targetKey", targetKey(target))).unique()) !== null;
  },
});

export const myFollows = query({
  args: { paginationOpts: paginationOptsValidator }, returns: pageValidator(followDocument),
  handler: async (ctx, args) => {
    const userId = await viewer(ctx);
    const result = await ctx.db.query("follows").withIndex("by_userId", q => q.eq("userId", userId)).order("desc").paginate(bounded(args.paginationOpts));
    const visible = await Promise.all(result.page.map(row => availableFollow(ctx, row.target)));
    return { ...pageResult(result), page: result.page.filter((_, index) => visible[index]) };
  },
});
