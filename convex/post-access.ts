import type { Doc, Id } from "./_generated/dataModel";

export function canViewPost(
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  if (post.visibility === "public") return true;

  // The follow graph is an M3 concern. Until it exists, keep followers-only
  // and private posts visible only to their author rather than overexposing
  // content to an arbitrary signed-in user.
  return userId !== null && post.authorId === userId;
}

export function canInteractWithPost(
  post: Doc<"posts">,
  userId: Id<"users"> | null,
) {
  return canViewPost(post, userId);
}
