import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { canReadCommunityPost } from "./community-access";

export function canViewPost(
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  if (post.deletedAt !== undefined) return false;
  if ((post.moderationState === "hidden" || post.moderationState === "removed") && post.authorId !== userId) return false;
  if (post.communityId !== undefined && post.authorId !== userId) return false;
  if (post.visibility === "public") return true;

  // This synchronous helper is intentionally fail-closed. Query and mutation
  // handlers should use canViewPostWithContext so followers-only visibility
  // can consult the follow graph.
  return userId !== null && post.authorId === userId;
}

export async function canViewPostWithContext(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  if (post.deletedAt !== undefined) return false;
  if ((post.moderationState === "hidden" || post.moderationState === "removed") && post.authorId !== userId) return false;
  if (post.communityId !== undefined && !(await canReadCommunityPost(ctx, post, userId))) return false;
  if (post.visibility === "public") return true;
  if (userId === null) return false;
  if (post.authorId === userId) return true;
  if (post.visibility !== "followers") return false;
  return (await ctx.db.query("follows")
    .withIndex("by_userId_and_targetKey", (q) =>
      q.eq("userId", userId).eq("targetKey", `person:${post.authorId}`),
    )
    .unique()) !== null;
}

export async function canInteractWithPost(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  return canViewPostWithContext(ctx, post, userId);
}
