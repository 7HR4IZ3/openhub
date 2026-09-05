import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Context = QueryCtx | MutationCtx;

export async function canReadCommunityPost(ctx: Context, post: Doc<"posts">, userId: Id<"users"> | null) {
  if (post.communityId === undefined) return true;
  const community = await ctx.db.get(post.communityId);
  if (!community) return false;
  if (community.visibility === "public") return true;
  if (userId === null) return false;
  const membership = await ctx.db.query("communityMemberships")
    .withIndex("by_communityId_and_userId", (q) => q.eq("communityId", community._id).eq("userId", userId))
    .unique();
  return membership?.status === "active";
}

export async function canPublishToCommunity(ctx: Context, communityId: Id<"communities">, userId: Id<"users">) {
  const community = await ctx.db.get(communityId);
  if (!community) throw new Error("Community is not available");
  const membership = await ctx.db.query("communityMemberships")
    .withIndex("by_communityId_and_userId", (q) => q.eq("communityId", communityId).eq("userId", userId))
    .unique();
  if (membership?.status !== "active") throw new Error("Join this community before publishing");
  return community;
}
