import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { canReadCommunityPost } from "./community-access";

export async function isPostSuppressed(
  ctx: QueryCtx,
  post: Doc<"posts">,
  viewerId: Id<"users"> | null,
) {
  if (post.deletedAt !== undefined) return true;
  if (!(await canReadCommunityPost(ctx, post, viewerId))) return true;
  if (post.moderationState !== undefined && post.authorId !== viewerId) return true;
  if (viewerId === null) return false;

  const blockedByViewer = await ctx.db.query("blocks")
    .withIndex("by_user_blocked", (q) => q.eq("userId", viewerId).eq("blockedUserId", post.authorId))
    .unique();
  if (blockedByViewer) return true;
  const blockedViewer = await ctx.db.query("blocks")
    .withIndex("by_user_blocked", (q) => q.eq("userId", post.authorId).eq("blockedUserId", viewerId))
    .unique();
  if (blockedViewer) return true;

  const mutedPerson = await ctx.db.query("mutes")
    .withIndex("by_user_target", (q) => q.eq("userId", viewerId).eq("targetKey", `person:${post.authorId}`))
    .unique();
  if (mutedPerson) return true;

  if (post.sourceReferenceId !== undefined) {
    const source = await ctx.db.get(post.sourceReferenceId);
    if (source) {
      const repository = await ctx.db.query("repositories")
        .withIndex("by_provider_repository", (q) => q.eq("provider", source.provider).eq("providerRepositoryId", source.repositoryId))
        .unique();
      if (repository) {
        const mutedRepository = await ctx.db.query("mutes")
          .withIndex("by_user_target", (q) => q.eq("userId", viewerId).eq("targetKey", `repository:${repository._id}`))
          .unique();
        if (mutedRepository) return true;
      }
    }
  }

  const filters = await ctx.db.query("keywordFilters")
    .withIndex("by_user_enabled", (q) => q.eq("userId", viewerId).eq("enabled", true))
    .order("desc")
    .take(50);
  const body = post.body.toLocaleLowerCase();
  return filters.some((filter) => body.includes(filter.phrase));
}
