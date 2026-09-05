import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function canViewPost(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  if (post.visibility === "public") return true;
  if (userId === null || post.authorId === userId) return userId !== null;
  if (post.visibility !== "followers") return false;
  return (await ctx.db.query("follows")
    .withIndex("by_userId_and_targetKey", (q) => q.eq("userId", userId).eq("targetKey", `person:${post.authorId}`))
    .unique()) !== null;
}

export async function canInteractWithPost(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  return canViewPost(ctx, post, userId);
}
