import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const mentionPattern = /(^|\s)@([a-zA-Z0-9][a-zA-Z0-9_-]{1,39})\b/g;

export async function createMentions(
  ctx: MutationCtx,
  body: string,
  actorId: Id<"users">,
  source: { kind: "post"; postId: Id<"posts"> } | { kind: "comment"; commentId: Id<"comments">; postId: Id<"posts"> },
) {
  const handles = new Set<string>();
  for (const match of body.matchAll(mentionPattern)) handles.add(match[2].toLowerCase());
  if (handles.size === 0) return;

  const now = Date.now();
  let count = 0;
  for (const handle of handles) {
    if (count >= 50) break;
    const profile = await ctx.db.query("profiles").withIndex("by_handle", (q) => q.eq("handle", handle)).unique();
    if (!profile) continue;
    const existing = source.kind === "post"
      ? await ctx.db.query("mentions").withIndex("by_post_user", (q) => q.eq("postId", source.postId).eq("mentionedUserId", profile.userId)).unique()
      : await ctx.db.query("mentions").withIndex("by_comment_user", (q) => q.eq("commentId", source.commentId).eq("mentionedUserId", profile.userId)).unique();
    if (existing) continue;
    await ctx.db.insert("mentions", source.kind === "post"
      ? { sourceKind: "post", postId: source.postId, mentionedUserId: profile.userId, actorId, createdAt: now }
      : { sourceKind: "comment", commentId: source.commentId, mentionedUserId: profile.userId, actorId, createdAt: now });
    if (profile.userId !== actorId) {
      await ctx.db.insert("notifications", {
        recipientId: profile.userId,
        actorId,
        type: "mention",
        ...(source.kind === "post" ? { postId: source.postId } : { postId: source.postId, commentId: source.commentId }),
        createdAt: now,
      });
    }
    count += 1;
  }
}
