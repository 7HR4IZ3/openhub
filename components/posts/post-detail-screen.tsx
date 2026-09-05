"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Code2,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  UserRound,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PostBody } from "@/components/posts/post-body";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PostId = Id<"posts">;

export function PostDetailScreen({
  postId,
  convexConfigured,
}: {
  postId: string;
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <PostSetupState />;

  return <ConnectedPostDetailScreen postId={postId as PostId} />;
}

function ConnectedPostDetailScreen({ postId }: { postId: PostId }) {
  const { isAuthenticated } = useConvexAuth();
  const post = useQuery(api.posts.byId, { postId });
  const comments = useQuery(api.comments.list, { postId, limit: 50 });
  const viewer = useQuery(api.social.viewerState, { postId });
  const toggleLike = useMutation(api.social.toggleLike);
  const toggleBookmark = useMutation(api.social.toggleBookmark);
  const toggleRepost = useMutation(api.social.toggleRepost);
  const createComment = useMutation(api.comments.create);

  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: Id<"comments">;
    handle: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "like" | "bookmark" | "repost" | "comment" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (post === undefined || comments === undefined || viewer === undefined) {
    return <PostLoadingState />;
  }

  if (post === null) return <PostNotFoundState />;

  const liked = viewer?.liked ?? post.viewer.liked;
  const bookmarked = viewer?.bookmarked ?? post.viewer.bookmarked;
  const reposted = viewer?.reposted ?? post.viewer.reposted;
  const commentCount = comments.length === 0 ? post.commentCount : Math.max(post.commentCount, comments.length);

  async function runAction(
    action: "like" | "bookmark" | "repost",
    callback: () => Promise<unknown>,
  ) {
    if (!isAuthenticated) return;
    setError(null);
    setPendingAction(action);
    try {
      await callback();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action could not be completed");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || commentDraft.trim().length === 0) return;

    setError(null);
    setPendingAction("comment");
    try {
      if (replyTo === null) {
        await createComment({ postId, body: commentDraft });
      } else {
        await createComment({
          postId,
          body: commentDraft,
          parentId: replyTo.id,
        });
      }
      setCommentDraft("");
      setReplyTo(null);
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Comment could not be posted");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-foreground dark:bg-[#111310]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[232px_minmax(0,680px)_304px]">
        <aside className="sticky top-0 hidden h-screen flex-col justify-between px-5 py-6 lg:flex">
          <div>
            <Link href="/home" className="text-sm font-semibold tracking-[-0.03em]">
              OpenHub
            </Link>
            <nav className="mt-12 space-y-1" aria-label="Post navigation">
              <Link href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]">
                <ArrowLeft className="h-[18px] w-[18px]" />
                Back to home
              </Link>
              <Link href="/explore" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]">
                <Code2 className="h-[18px] w-[18px]" />
                Explore source
              </Link>
            </nav>
          </div>
          <p className="px-3 text-xs leading-5 text-muted-foreground">Source first. Conversation second.</p>
        </aside>

        <section className="min-h-screen border-x border-black/[0.08] bg-[#fbfbf9] dark:border-white/[0.08] dark:bg-[#151714]">
          <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-black/[0.08] bg-[#fbfbf9]/90 px-5 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#151714]/90 sm:px-7">
            <Link href="/home" className="rounded-full p-1.5 text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">OpenHub / post</p>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.035em]">Technical context</h1>
            </div>
          </header>

          <article className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] text-xs font-semibold text-[#8f432b] dark:bg-white/[0.08] dark:text-[#f0b38d]">
                {initials(post.author.displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold">{post.author.displayName}</span>
                  <span className="text-muted-foreground">@{post.author.handle}</span>
                  <span className="text-muted-foreground">·</span>
                  <time className="text-muted-foreground" dateTime={new Date(post.createdAt).toISOString()}>
                    {formatDate(post.createdAt)}
                  </time>
                </div>
                <span className="mt-2 inline-flex rounded-full bg-[#e9e6dc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f432b] dark:bg-[#20251f] dark:text-[#f0b38d]">
                  {post.type}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <PostBody body={post.body} />
            </div>

            {post.sourceReference ? <SourceReferenceCard source={post.sourceReference} /> : null}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-black/[0.08] pt-4 dark:border-white/[0.08]">
              <ActionButton
                icon={Heart}
                label={liked ? "Liked" : "Like"}
                count={post.likeCount}
                active={liked}
                disabled={!isAuthenticated || pendingAction !== null}
                onClick={() => void runAction("like", () => toggleLike({ postId }))}
              />
              <ActionButton
                icon={MessageCircle}
                label="Comment"
                count={commentCount}
                disabled={pendingAction !== null}
                onClick={() => document.getElementById("comment-box")?.focus()}
              />
              <ActionButton
                icon={Repeat2}
                label={reposted ? "Reposted" : "Repost"}
                count={post.repostCount}
                active={reposted}
                disabled={!isAuthenticated || pendingAction !== null}
                onClick={() => void runAction("repost", () => toggleRepost({ postId }))}
              />
              <ActionButton
                icon={Bookmark}
                label={bookmarked ? "Saved" : "Save"}
                active={bookmarked}
                disabled={!isAuthenticated || pendingAction !== null}
                onClick={() => void runAction("bookmark", () => toggleBookmark({ postId }))}
              />
            </div>

            {!isAuthenticated ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                <Link href="/signin" className="font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Sign in with GitHub</Link> to join the conversation.
              </p>
            ) : null}
          </article>

          <section className="p-5 sm:p-7" aria-labelledby="comments-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Contextual discussion</p>
                <h2 id="comments-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">What do you notice?</h2>
              </div>
              <span className="text-xs text-muted-foreground">{commentCount} {commentCount === 1 ? "reply" : "replies"}</span>
            </div>

            <form onSubmit={submitComment} className="mt-5 rounded-2xl border border-black/[0.1] bg-[#f7f7f4] p-4 dark:border-white/[0.1] dark:bg-[#111310]">
              {replyTo ? (
                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Replying to @{replyTo.handle}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="font-semibold hover:text-foreground">Cancel</button>
                </div>
              ) : null}
              <textarea
                id="comment-box"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={isAuthenticated ? "Add useful context, a question, or a counterexample…" : "Sign in to add context…"}
                disabled={!isAuthenticated || pendingAction !== null}
                rows={3}
                className="w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Markdown and code blocks are welcome.</p>
                {isAuthenticated ? (
                  <Button type="submit" size="sm" className="rounded-full" disabled={commentDraft.trim().length === 0 || pendingAction !== null}>
                    <Send className="h-3.5 w-3.5" />
                    {pendingAction === "comment" ? "Posting…" : "Reply"}
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-full"><Link href="/signin">Sign in</Link></Button>
                )}
              </div>
            </form>

            {error ? (
              <p role="alert" className="mt-4 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>
            ) : null}

            <div className="mt-6 divide-y divide-black/[0.08] dark:divide-white/[0.08]">
              {comments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/[0.12] px-5 py-10 text-center dark:border-white/[0.12]">
                  <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">No context yet</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Be the first reader to add a useful observation.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <article key={comment._id} className={cn("py-5 first:pt-0", comment.parentId && "ml-5 border-l border-black/[0.1] pl-4 dark:border-white/[0.1]")}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] text-[10px] font-semibold text-[#8f432b] dark:bg-white/[0.08] dark:text-[#f0b38d]">
                        {initials(comment.author.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-semibold">{comment.author.displayName}</span>
                          <span className="text-muted-foreground">@{comment.author.handle}</span>
                          <span className="text-muted-foreground">·</span>
                          <time className="text-muted-foreground" dateTime={new Date(comment.createdAt).toISOString()}>{formatDate(comment.createdAt)}</time>
                        </div>
                        <PostBody body={comment.body} />
                        <button type="button" onClick={() => setReplyTo({ id: comment._id, handle: comment.author.handle })} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                          <MessageCircle className="h-3.5 w-3.5" /> Reply
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <aside className="hidden px-5 py-6 xl:block">
          <div className="sticky top-6 space-y-5">
            <section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Conversation rule</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Keep the source close. Good replies explain a tradeoff, ask a specific question, or help the next reader.</p>
            </section>
            <section className="rounded-2xl bg-[#e9e6dc] p-5 dark:bg-[#20251f]">
              <p className="text-sm font-semibold">Read the original context</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Every source-backed post keeps its commit, file, line range, and original owner attached.</p>
              {post.sourceReference ? (
                <a href={post.sourceReference.canonicalUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                  Open source <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

function SourceReferenceCard({
  source,
}: {
  source: {
    repositoryFullName: string;
    originalOwner: string;
    path: string;
    commitSha: string;
    startLine: number;
    endLine: number;
    language?: string;
    canonicalUrl: string;
    licenseSpdxId?: string;
    sourceSnapshot: string;
  };
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-black/[0.1] bg-[#f0efe9] dark:border-white/[0.1] dark:bg-[#0f120f]" aria-label="Source reference">
      <div className="flex flex-col gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.08] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Code2 className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
            <span className="truncate font-mono">{source.path}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {source.repositoryFullName} · lines {source.startLine}–{source.endLine} · {source.commitSha.slice(0, 7)}
          </p>
        </div>
        <a href={source.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-xs leading-6 sm:text-sm"><code>{source.sourceSnapshot}</code></pre>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-black/[0.08] px-4 py-3 text-[11px] text-muted-foreground dark:border-white/[0.08]">
        <span>Original owner: @{source.originalOwner}</span>
        {source.language ? <span>Language: {source.language}</span> : null}
        {source.licenseSpdxId ? <span>License: {source.licenseSpdxId}</span> : null}
      </div>
    </section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  count,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/[0.06]",
        active && "text-[#9b4d31] dark:text-[#e99970]",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined ? <span className="font-mono text-[10px]">{formatCount(count)}</span> : null}
    </button>
  );
}

function PostSetupState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-5 py-12 dark:bg-[#111310]">
      <section className="w-full max-w-xl rounded-3xl border border-black/[0.1] bg-[#fbfbf9] p-7 dark:border-white/[0.1] dark:bg-[#151714] sm:p-10">
        <Code2 className="h-6 w-6 text-[#b45e3c] dark:text-[#e99970]" />
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Post detail</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">The conversation layer is ready to connect.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">This deployment needs its Convex URL before it can load source-backed posts, comments, and realtime interactions.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link href="/explore">Explore repositories</Link></Button>
          <Button asChild variant="outline" className="rounded-full bg-transparent"><Link href="/signin">Connect GitHub</Link></Button>
        </div>
      </section>
    </main>
  );
}

function PostLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-5 dark:bg-[#111310]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-[#e9e6dc] dark:bg-[#20251f]" />
        <p className="mt-4 text-sm text-muted-foreground">Loading source-backed conversation…</p>
      </div>
    </main>
  );
}

function PostNotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f4] px-5 dark:bg-[#111310]">
      <section className="max-w-md text-center">
        <UserRound className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em]">This post is not available.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">It may be private, deleted, or not connected to this OpenHub deployment.</p>
        <Button asChild className="mt-6 rounded-full"><Link href="/home"><ArrowLeft className="h-4 w-4" /> Back to home</Link></Button>
      </section>
    </main>
  );
}

function initials(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "OH";
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
