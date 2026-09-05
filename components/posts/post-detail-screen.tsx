"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Code2,
  GitBranch,
  Heart,
  ListPlus,
  MessageCircle,
  Quote,
  Repeat2,
  Send,
  Share2,
  UserRound,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PostBody } from "@/components/posts/post-body";
import { DiffCodeViewer } from "@/components/repository/diff-code-viewer";
import { SourceCodeViewer } from "@/components/repository/source-code-viewer";
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
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const post = useQuery(api.posts.byId, { postId });
  const comments = useQuery(api.comments.list, { postId, limit: 50 });
  const viewer = useQuery(api.social.viewerState, { postId });
  const toggleLike = useMutation(api.social.toggleLike);
  const toggleBookmark = useMutation(api.social.toggleBookmark);
  const toggleRepost = useMutation(api.social.toggleRepost);
  const createComment = useMutation(api.comments.create);
  const createQuote = useMutation(api.posts.createQuote);
  const lists = useQuery(api.curation.myLists, isAuthenticated ? { paginationOpts: { numItems: 30, cursor: null } } : "skip");
  const addListItem = useMutation(api.curation.addListItem);

  const [commentDraft, setCommentDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{
    id: Id<"comments">;
    handle: string;
  } | null>(null);
  const [attachSource, setAttachSource] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listSaving, setListSaving] = useState(false);
  const [savedListId, setSavedListId] = useState<Id<"lists"> | null>(null);
  const [shared, setShared] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "like" | "bookmark" | "repost" | "comment" | "quote" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (post === undefined || comments === undefined || viewer === undefined) {
    return <PostLoadingState />;
  }

  if (post === null) return <PostNotFoundState />;

  const postSourceReferenceId = post.sourceReference?._id;
  const postDiffReferenceId = post.diffReference?._id;
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
      const contextReference = attachSource
        ? postSourceReferenceId
          ? { sourceReferenceId: postSourceReferenceId }
          : postDiffReferenceId
            ? { diffReferenceId: postDiffReferenceId }
            : {}
        : {};
      if (replyTo === null) {
        await createComment({ postId, body: commentDraft, ...contextReference });
      } else {
        await createComment({
          postId,
          body: commentDraft,
          parentId: replyTo.id,
          ...contextReference,
        });
      }
      setCommentDraft("");
      setReplyTo(null);
      setAttachSource(false);
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Comment could not be posted");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated || quoteDraft.trim().length === 0) return;

    setError(null);
    setPendingAction("quote");
    try {
      const quote = await createQuote({ postId, body: quoteDraft, visibility: "public" });
      router.push(`/posts/${quote._id}`);
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : "Quote could not be posted");
      setPendingAction(null);
    }
  }

  async function sharePost() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "OpenHub discussion", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  }

  async function saveToList(listId: Id<"lists">) {
    if (!isAuthenticated) return;
    setError(null);
    setListSaving(true);
    try {
      await addListItem({ listId, target: { kind: "post", postId } });
      setSavedListId(listId);
      setListOpen(false);
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "Post could not be added to the list");
    } finally {
      setListSaving(false);
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
                  <Link href={`/profile/${encodeURIComponent(post.author.handle)}`} className="text-muted-foreground hover:text-foreground hover:underline">@{post.author.handle}</Link>
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
            {post.diffReference ? <DiffReferenceCard diff={post.diffReference} /> : null}
            {post.quotedPost ? <QuotedPostCard quote={post.quotedPost} /> : null}

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
              <ActionButton
                icon={Quote}
                label="Quote"
                active={quoteOpen}
                disabled={!isAuthenticated || pendingAction !== null}
                onClick={() => setQuoteOpen((open) => !open)}
              />
              <ActionButton
                icon={ListPlus}
                label={savedListId ? "In list" : "List"}
                active={listOpen || savedListId !== null}
                disabled={!isAuthenticated || pendingAction !== null}
                onClick={() => setListOpen((open) => !open)}
              />
              <ActionButton
                icon={Share2}
                label={shared ? "Copied" : "Share"}
                onClick={() => void sharePost()}
              />
            </div>

            {listOpen ? (
              <div className="mt-4 rounded-2xl border border-black/[0.1] bg-[#f7f7f4] p-4 dark:border-white/[0.1] dark:bg-[#111310]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">Add to a reading trail</p>
                  <Link href="/lists" className="text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Manage lists</Link>
                </div>
                {lists === undefined ? <p className="mt-3 text-xs text-muted-foreground">Loading your lists…</p> : lists.page.length > 0 ? (
                  <div className="mt-3 grid gap-1 sm:grid-cols-2">
                    {lists.page.map((list) => (
                      <button key={list._id} type="button" className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs hover:bg-black/[0.05] disabled:opacity-50 dark:hover:bg-white/[0.06]" disabled={listSaving} onClick={() => void saveToList(list._id)}>
                        <span className="truncate">{list.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{list.visibility}</span>
                      </button>
                    ))}
                  </div>
                ) : <Link href="/lists" className="mt-3 block text-xs text-muted-foreground hover:text-foreground">Create a list to save this post.</Link>}
              </div>
            ) : null}

            {quoteOpen ? (
              <form onSubmit={submitQuote} className="mt-4 rounded-2xl border border-black/[0.1] bg-[#f7f7f4] p-4 dark:border-white/[0.1] dark:bg-[#111310]">
                <label htmlFor="quote-box" className="text-xs font-semibold">Add your perspective</label>
                <textarea
                  id="quote-box"
                  value={quoteDraft}
                  onChange={(event) => setQuoteDraft(event.target.value)}
                  placeholder="What should another developer notice about this?"
                  maxLength={64_000}
                  rows={4}
                  disabled={pendingAction !== null}
                  className="mt-3 w-full resize-y rounded-xl border border-black/[0.1] bg-transparent px-3 py-2 text-sm leading-6 outline-none focus:border-[#b45e3c] dark:border-white/[0.1]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Quotes are public and keep the original post attached.</p>
                  <Button type="submit" size="sm" className="rounded-full" disabled={quoteDraft.trim().length === 0 || pendingAction !== null}>
                    {pendingAction === "quote" ? "Quoting…" : "Quote post"}
                    <Quote className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            ) : null}

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
                maxLength={64_000}
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
              {post.sourceReference || post.diffReference ? <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={attachSource} onChange={(event) => setAttachSource(event.target.checked)} disabled={!isAuthenticated || pendingAction !== null} />Attach the post&apos;s {post.sourceReference ? `source context (${post.sourceReference.path}:${post.sourceReference.startLine}–${post.sourceReference.endLine})` : `diff context (${post.diffReference?.path})`}</label> : null}
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
                          <Link href={`/profile/${encodeURIComponent(comment.author.handle)}`} className="text-muted-foreground hover:text-foreground hover:underline">@{comment.author.handle}</Link>
                          <span className="text-muted-foreground">·</span>
                          <time className="text-muted-foreground" dateTime={new Date(comment.createdAt).toISOString()}>{formatDate(comment.createdAt)}</time>
                        </div>
                        <PostBody body={comment.body} />
                        {comment.sourceReference ? <a href={comment.sourceReference.canonicalUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#f0efe9] px-3 py-2 text-xs text-muted-foreground hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:bg-[#0f120f]"><Code2 className="h-3.5 w-3.5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" /><span className="truncate font-mono">{comment.sourceReference.path}</span><span className="shrink-0">L{comment.sourceReference.startLine}–L{comment.sourceReference.endLine}</span></a> : null}
                        {comment.diffReference ? <a href={comment.diffReference.canonicalUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#f0efe9] px-3 py-2 text-xs text-muted-foreground hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:bg-[#0f120f]"><GitBranch className="h-3.5 w-3.5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" /><span className="truncate font-mono">{comment.diffReference.path}</span><span className="shrink-0">{comment.diffReference.baseCommitSha.slice(0, 7)} → {comment.diffReference.headCommitSha.slice(0, 7)}</span></a> : null}
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
              ) : post.diffReference ? (
                <a href={post.diffReference.canonicalUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                  Open comparison <ArrowUpRight className="h-3.5 w-3.5" />
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
      <SourceCodeViewer
        file={{
          path: source.path,
          commitSha: source.commitSha,
          oid: "source-snapshot",
          text: source.sourceSnapshot,
          byteSize: new TextEncoder().encode(source.sourceSnapshot).byteLength,
        }}
        primaryLanguage={source.language ?? null}
        lineNumberOffset={source.startLine}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-black/[0.08] px-4 py-3 text-[11px] text-muted-foreground dark:border-white/[0.08]">
        <span>Original owner: @{source.originalOwner}</span>
        {source.language ? <span>Language: {source.language}</span> : null}
        {source.licenseSpdxId ? <span>License: {source.licenseSpdxId}</span> : null}
      </div>
    </section>
  );
}

function DiffReferenceCard({
  diff,
}: {
  diff: {
    repositoryFullName: string;
    originalOwner: string;
    path: string;
    baseCommitSha: string;
    headCommitSha: string;
    language?: string;
    canonicalUrl: string;
    licenseSpdxId?: string;
    baseSnapshot: string;
    headSnapshot: string;
  };
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-black/[0.1] bg-[#f0efe9] dark:border-white/[0.1] dark:bg-[#0f120f]" aria-label="Diff reference">
      <div className="flex flex-col gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.08] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Code2 className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
            <span className="truncate font-mono">{diff.path}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {diff.repositoryFullName} · {diff.baseCommitSha.slice(0, 7)} → {diff.headCommitSha.slice(0, 7)}
          </p>
        </div>
        <a href={diff.canonicalUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <DiffCodeViewer
        path={diff.path}
        language={diff.language}
        baseSnapshot={diff.baseSnapshot}
        headSnapshot={diff.headSnapshot}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-black/[0.08] px-4 py-3 text-[11px] text-muted-foreground dark:border-white/[0.08]">
        <span>Original owner: @{diff.originalOwner}</span>
        {diff.language ? <span>Language: {diff.language}</span> : null}
        {diff.licenseSpdxId ? <span>License: {diff.licenseSpdxId}</span> : null}
      </div>
    </section>
  );
}

function QuotedPostCard({
  quote,
}: {
  quote: {
    _id: Id<"posts">;
    type: string;
    body: string;
    createdAt: number;
    author: { handle: string; displayName: string };
    sourceReference: { repositoryFullName: string; path: string; startLine: number; endLine: number } | null;
    diffReference: { repositoryFullName: string; path: string; baseCommitSha: string; headCommitSha: string } | null;
  };
}) {
  return (
    <Link href={`/posts/${quote._id}`} className="mt-6 block rounded-2xl border border-black/[0.1] p-4 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.1] dark:hover:border-[#e99970]/50">
      <div className="flex items-center gap-2 text-xs">
        <Quote className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
        <span className="font-semibold">{quote.author.displayName}</span>
        <span className="text-muted-foreground">@{quote.author.handle}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{quote.type}</span>
      </div>
      <div className="mt-3 line-clamp-5">
        <PostBody body={quote.body} />
      </div>
      {quote.sourceReference ? (
        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
          {quote.sourceReference.repositoryFullName} · {quote.sourceReference.path} · L{quote.sourceReference.startLine}–L{quote.sourceReference.endLine}
        </p>
      ) : null}
      {quote.diffReference ? (
        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">
          {quote.diffReference.repositoryFullName} · {quote.diffReference.path} · {quote.diffReference.baseCommitSha.slice(0, 7)} → {quote.diffReference.headCommitSha.slice(0, 7)}
        </p>
      ) : null}
      <p className="mt-3 text-[11px] text-muted-foreground">Original post from {formatDate(quote.createdAt)}</p>
    </Link>
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
