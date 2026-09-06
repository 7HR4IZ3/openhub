"use client";

import { useState } from "react";
import {
  useAction,
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowTopRightIcon as ArrowUpRight,
  MinusCircledIcon as Ban,
  BookmarkIcon as Bookmark,
  CheckIcon as Check,
  CodeIcon as Code2,
  SwitchIcon as GitCompareArrows,
  HeartIcon as Heart,
  ChatBubbleIcon as MessageCircle,
  DotsHorizontalIcon as MoreHorizontal,
  Pencil1Icon as Pencil,
  LoopIcon as Repeat2,
  QuoteIcon as Quote,
  PaperPlaneIcon as Send,
  Share1Icon as Share2,
  CheckCircledIcon as ShieldCheck,
  TrashIcon as Trash2,
  PersonIcon as UserRound,
  SpeakerOffIcon as VolumeX,
} from "@radix-ui/react-icons";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import { CurationShell } from "@/components/curation/curation-shell";
import { PostBody } from "@/components/posts/post-body";
import { DiffCodeViewer } from "@/components/repository/diff-code-viewer";
import { SourceExplainer } from "@/components/ai/source-explainer";
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
  const currentUser = useQuery(api.users.viewer);
  const commentsPage = usePaginatedQuery(
    api.comments.listPage,
    { postId },
    { initialNumItems: 30 },
  );
  const comments = commentsPage.results;
  const viewer = useQuery(api.social.viewerState, { postId });
  const toggleLike = useMutation(api.social.toggleLike);
  const toggleBookmark = useMutation(api.social.toggleBookmark);
  const toggleRepost = useMutation(api.social.toggleRepost);
  const createQuote = useMutation(api.posts.createQuote);
  const createComment = useMutation(api.comments.create);

  const [commentDraft, setCommentDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{
    id: Id<"comments">;
    handle: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "like" | "bookmark" | "repost" | "comment" | "quote" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (
    post === undefined ||
    viewer === undefined ||
    (commentsPage.isLoading && comments.length === 0)
  ) {
    return <PostLoadingState />;
  }

  if (post === null) return <PostNotFoundState />;

  const liked = viewer?.liked ?? post.viewer.liked;
  const bookmarked = viewer?.bookmarked ?? post.viewer.bookmarked;
  const reposted = viewer?.reposted ?? post.viewer.reposted;
  const commentCount =
    comments.length === 0
      ? post.commentCount
      : Math.max(post.commentCount, comments.length);

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
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Action could not be completed",
      );
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
      setError(
        commentError instanceof Error
          ? commentError.message
          : "Comment could not be posted",
      );
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
      await createQuote({ postId, body: quoteDraft, visibility: "public" });
      setQuoteDraft("");
      setQuoteOpen(false);
    } catch (quoteError) {
      setError(
        quoteError instanceof Error
          ? quoteError.message
          : "Quote could not be published",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function sharePost() {
    setShareNotice(null);
    const url = window.location.href;
    try {
      const nativeShare = (
        navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
      ).share;
      const usedNativeShare = typeof nativeShare === "function";
      if (usedNativeShare)
        await nativeShare({ title: "OpenHub source discussion", url });
      else await navigator.clipboard.writeText(url);
      setShareNotice(usedNativeShare ? "Shared" : "Link copied");
    } catch {
      setShareNotice(null);
    }
  }

  return (
    <CurationShell active="Home" eyebrow="post" title="Discussion">
      <div className="min-w-0">
        <article className="border-b border-border p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground dark:bg-white/[0.08]">
              {initials(post.author.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{post.author.displayName}</span>
                <span className="text-muted-foreground">
                  @{post.author.handle}
                </span>
                <span className="text-muted-foreground">·</span>
                <time
                  className="text-muted-foreground"
                  dateTime={new Date(post.createdAt).toISOString()}
                >
                  {formatDate(post.createdAt)}
                </time>
              </div>
              <span className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground dark:bg-secondary">
                {post.type}
              </span>
            </div>
          </div>

          <SafetyControls
            postId={post._id}
            authorId={post.authorId}
            isAuthor={currentUser?._id === post.authorId}
            moderationState={post.moderationState}
          />
          <PostOwnerControls
            postId={post._id}
            isAuthor={currentUser?._id === post.authorId}
            initialBody={post.body}
          />

          <div className="mt-6">
            <PostBody
              body={post.body}
              lineLinkBase={post.sourceReference?.canonicalUrl}
            />
          </div>

          {post.sourceReference ? (
            <SourceReferenceCard
              source={post.sourceReference}
              targetUserId={post.authorId}
            />
          ) : null}
          {post.diffReference ? (
            <DiffReferenceCard diff={post.diffReference} />
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <ActionButton
              icon={Heart}
              label={liked ? "Liked" : "Like"}
              count={post.likeCount}
              active={liked}
              disabled={!isAuthenticated || pendingAction !== null}
              onClick={() =>
                void runAction("like", () => toggleLike({ postId }))
              }
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
              onClick={() =>
                void runAction("repost", () => toggleRepost({ postId }))
              }
            />
            <ActionButton
              icon={Quote}
              label="Quote"
              disabled={!isAuthenticated || pendingAction !== null}
              onClick={() => setQuoteOpen((value) => !value)}
            />
            <ActionButton
              icon={Bookmark}
              label={bookmarked ? "Saved" : "Save"}
              active={bookmarked}
              disabled={!isAuthenticated || pendingAction !== null}
              onClick={() =>
                void runAction("bookmark", () => toggleBookmark({ postId }))
              }
            />
            <ActionButton
              icon={Share2}
              label="Share"
              disabled={pendingAction !== null}
              onClick={() => void sharePost()}
            />
          </div>

          {quoteOpen && isAuthenticated ? (
            <form
              onSubmit={submitQuote}
              className="mt-4 rounded-xl border border-border bg-background p-4 dark:bg-background"
            >
              <label htmlFor="quote-box" className="text-xs font-semibold">
                Add your context
              </label>
              <textarea
                id="quote-box"
                value={quoteDraft}
                onChange={(event) => setQuoteDraft(event.target.value)}
                rows={3}
                maxLength={64_000}
                placeholder="Why is this worth opening?"
                className="mt-3 w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-md"
                  disabled={
                    quoteDraft.trim().length === 0 || pendingAction !== null
                  }
                >
                  {pendingAction === "quote" ? "Publishing…" : "Quote post"}
                </Button>
              </div>
            </form>
          ) : null}
          {shareNotice ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {shareNotice}
            </p>
          ) : null}

          {!isAuthenticated ? (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              <Link
                href="/signin"
                className="font-semibold text-foreground hover:underline"
              >
                Sign in with GitHub
              </Link>{" "}
              to join the conversation.
            </p>
          ) : null}
        </article>

        <section className="p-5 sm:p-7" aria-labelledby="comments-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Contextual discussion
              </p>
              <h2
                id="comments-heading"
                className="mt-2 text-xl font-semibold tracking-[-0.035em]"
              >
                What do you notice?
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {commentCount} {commentCount === 1 ? "reply" : "replies"}
            </span>
          </div>

          <form
            onSubmit={submitComment}
            className="mt-5 rounded-xl border border-border bg-background p-4 dark:bg-background"
          >
            {replyTo ? (
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Replying to @{replyTo.handle}</span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="font-semibold hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <textarea
              id="comment-box"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder={
                isAuthenticated
                  ? "Add useful context, a question, or a counterexample…"
                  : "Sign in to add context…"
              }
              disabled={!isAuthenticated || pendingAction !== null}
              rows={3}
              className="w-full resize-y bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Markdown and code blocks are welcome.
              </p>
              {isAuthenticated ? (
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-md"
                  disabled={
                    commentDraft.trim().length === 0 || pendingAction !== null
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                  {pendingAction === "comment" ? "Posting…" : "Reply"}
                </Button>
              ) : (
                <Button asChild size="sm" className="rounded-md">
                  <Link href="/signin">Sign in</Link>
                </Button>
              )}
            </div>
          </form>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-500/[0.08] px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 divide-y divide-black/[0.08] dark:divide-white/[0.08]">
            {comments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/[0.12] px-5 py-10 text-center dark:border-white/[0.12]">
                <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No context yet</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Be the first reader to add a useful observation.
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <article
                  key={comment._id}
                  className={cn(
                    "py-5 first:pt-0",
                    comment.parentId &&
                      "ml-5 border-l border-border pl-4 border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground dark:bg-white/[0.08]">
                      {initials(comment.author.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-semibold">
                          {comment.author.displayName}
                        </span>
                        <span className="text-muted-foreground">
                          @{comment.author.handle}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <time
                          className="text-muted-foreground"
                          dateTime={new Date(comment.createdAt).toISOString()}
                        >
                          {formatDate(comment.createdAt)}
                        </time>
                      </div>
                      <PostBody body={comment.body} />
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTo({
                              id: comment._id,
                              handle: comment.author.handle,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Reply
                        </button>
                        <CommentSafetyControls
                          commentId={comment._id}
                          authorId={comment.authorId}
                          isAuthenticated={isAuthenticated}
                          isAuthor={currentUser?._id === comment.authorId}
                        />
                        <CommentOwnerControls
                          commentId={comment._id}
                          isAuthor={currentUser?._id === comment.authorId}
                          initialBody={comment.body}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
            {(commentsPage.status === "CanLoadMore" ||
              commentsPage.status === "LoadingMore") &&
            comments.length > 0 ? (
              <div className="pt-5 text-center">
                <button
                  type="button"
                  onClick={() => commentsPage.loadMore(30)}
                  disabled={commentsPage.status !== "CanLoadMore"}
                  className="text-xs font-semibold text-foreground hover:underline disabled:opacity-50"
                >
                  {commentsPage.status === "LoadingMore"
                    ? "Loading…"
                    : "Load more replies"}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </CurationShell>
  );
}

function SourceReferenceCard({
  source,
  targetUserId,
}: {
  source: {
    provider: string;
    repositoryId: string;
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
    visibility: "public" | "private";
  };
  targetUserId: Id<"users">;
}) {
  return (
    <section
      className="mt-6 overflow-hidden rounded-xl border border-border bg-muted dark:bg-muted"
      aria-label="Source reference"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Code2 className="h-3.5 w-3.5 text-foreground" />
            <span className="truncate font-mono">{source.path}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {source.repositoryFullName} · lines {source.startLine}–
            {source.endLine} · {source.commitSha.slice(0, 7)}
          </p>
        </div>
        <a
          href={source.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-xs leading-6 sm:text-sm">
        <code>{source.sourceSnapshot}</code>
      </pre>
      <div className="px-4 pb-4">
        <SourceExplainer source={source} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        <span>Original owner: @{source.originalOwner}</span>
        {source.language ? <span>Language: {source.language}</span> : null}
        {source.licenseSpdxId ? (
          <span>License: {source.licenseSpdxId}</span>
        ) : null}
      </div>
      <MaintainerEndorseButton
        provider={source.provider}
        providerRepositoryId={source.repositoryId}
        targetUserId={targetUserId}
      />
    </section>
  );
}

function MaintainerEndorseButton({
  provider,
  providerRepositoryId,
  targetUserId,
}: {
  provider: string;
  providerRepositoryId: string;
  targetUserId: Id<"users">;
}) {
  const { isAuthenticated } = useConvexAuth();
  const repositoryId = useQuery(
    api.discovery.byProviderRepository,
    isAuthenticated ? { provider, providerRepositoryId } : "skip",
  );
  const endorse = useAction(api.reputation.endorse);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (!isAuthenticated || provider !== "github" || !repositoryId) return null;
  const ensuredRepositoryId = repositoryId;
  async function submit() {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const created = await endorse({
        repositoryId: ensuredRepositoryId,
        endorsedUserId: targetUserId,
      });
      setNotice(
        created
          ? "Verified maintainer endorsement added."
          : "This developer is already endorsed for this repository.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Endorsement could not be added",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-[11px] text-muted-foreground">
        Maintainers can attach a verified signal to useful context.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md bg-transparent"
          onClick={() => void submit()}
          disabled={pending}
        >
          {pending ? "Checking…" : "Endorse author"}
        </Button>
        {notice ? (
          <span role="status" className="text-[10px] text-muted-foreground">
            {notice}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PostOwnerControls({
  postId,
  isAuthor,
  initialBody,
}: {
  postId: Id<"posts">;
  isAuthor: boolean;
  initialBody: string;
}) {
  const router = useRouter();
  const updatePost = useMutation(api.posts.update);
  const removePost = useMutation(api.posts.remove);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBody);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isAuthor) return null;

  async function save() {
    if (pending || draft.trim().length === 0) return;
    setPending(true);
    setNotice(null);
    try {
      await updatePost({ postId, body: draft });
      setEditing(false);
      setOpen(false);
      setNotice("Post updated");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Post could not be updated",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (
      pending ||
      !window.confirm("Delete this post? It will no longer appear on OpenHub.")
    )
      return;
    setPending(true);
    setNotice(null);
    try {
      await removePost({ postId });
      router.push("/home");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Post could not be deleted",
      );
      setPending(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
      >
        <Pencil className="h-3.5 w-3.5" /> Manage post
      </button>
      {open ? (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-border bg-background p-3 dark:bg-background">
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label
                htmlFor={`edit-post-${postId}`}
                className="text-xs font-semibold"
              >
                Edit your context
              </label>
              <textarea
                id={`edit-post-${postId}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={64_000}
                rows={5}
                className="mt-2 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-md"
                  onClick={() => {
                    setDraft(initialBody);
                    setEditing(false);
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-md"
                  disabled={pending || draft.trim().length === 0}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md bg-transparent"
                onClick={() => {
                  setDraft(initialBody);
                  setEditing(true);
                }}
                disabled={pending}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md bg-transparent text-red-700 hover:text-red-700 dark:text-red-300"
                onClick={() => void remove()}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
          {notice ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
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
    <section
      className="mt-6 overflow-hidden rounded-xl border border-border bg-muted dark:bg-muted"
      aria-label="Diff reference"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <GitCompareArrows className="h-3.5 w-3.5 text-foreground" />
            <span className="truncate font-mono">{diff.path}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {diff.repositoryFullName} · {diff.baseCommitSha.slice(0, 7)} →{" "}
            {diff.headCommitSha.slice(0, 7)} · @{diff.originalOwner}
          </p>
        </div>
        <a
          href={diff.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          Compare on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <DiffCodeViewer
        path={diff.path}
        baseSnapshot={diff.baseSnapshot}
        headSnapshot={diff.headSnapshot}
        language={diff.language ?? null}
      />
      <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
        Original source remains on GitHub
        {diff.licenseSpdxId ? ` · ${diff.licenseSpdxId}` : ""}.
      </div>
    </section>
  );
}

function SafetyControls({
  postId,
  authorId,
  isAuthor,
  moderationState,
}: {
  postId: Id<"posts">;
  authorId: Id<"users">;
  isAuthor: boolean;
  moderationState?: "visible" | "hidden" | "removed";
}) {
  const createReport = useMutation(api.trust.createReport);
  const setBlock = useMutation(api.trust.setBlock);
  const setMute = useMutation(api.trust.setMute);
  const moderatePost = useMutation(api.trust.moderatePost);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<
    | "spam"
    | "harassment"
    | "hate"
    | "sexual"
    | "malware"
    | "copyright"
    | "privacy"
    | "other"
  >("other");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isModerated =
    moderationState === "hidden" || moderationState === "removed";

  async function act(callback: () => Promise<unknown>, message: string) {
    setPending(true);
    setNotice(null);
    try {
      await callback();
      setNotice(message);
      setReporting(false);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Safety action could not be completed",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col items-end">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Post safety actions</span>
      </button>
      {open ? (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-border bg-background p-3 dark:bg-background">
          <div className="flex flex-wrap gap-2">
            {!isAuthor ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() =>
                    void act(
                      () =>
                        setMute({
                          target: { kind: "person", userId: authorId },
                          muted: true,
                        }),
                      "Author muted",
                    )
                  }
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  Mute
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() =>
                    void act(
                      () =>
                        setBlock({ blockedUserId: authorId, blocked: true }),
                      "Author blocked",
                    )
                  }
                >
                  <Ban className="h-3.5 w-3.5" />
                  Block
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  disabled={pending}
                  onClick={() => setReporting((value) => !value)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Report
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={pending}
                onClick={() =>
                  void act(
                    () =>
                      moderatePost({
                        postId,
                        action: isModerated ? "restore" : "hide",
                        reason: "Author safety control",
                      }),
                    isModerated ? "Post restored" : "Post hidden",
                  )
                }
              >
                {isModerated ? "Restore post" : "Hide post"}
              </Button>
            )}
          </div>
          {reporting ? (
            <form
              className="mt-3 border-t border-border pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void act(
                  () =>
                    createReport({
                      target: { kind: "post", postId },
                      reason,
                      details,
                    }),
                  "Report submitted",
                );
              }}
            >
              <label className="block text-xs font-semibold">
                Reason
                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as typeof reason)
                  }
                  className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="hate">Hate</option>
                  <option value="sexual">Sexual content</option>
                  <option value="malware">Malware or unsafe code</option>
                  <option value="copyright">Copyright</option>
                  <option value="privacy">Privacy</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Add context for the review (optional)"
                className="mt-3 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                size="sm"
                className="mt-3 rounded-md"
                disabled={pending}
              >
                {pending ? "Submitting…" : "Submit report"}
              </Button>
            </form>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentSafetyControls({
  commentId,
  authorId,
  isAuthenticated,
  isAuthor,
}: {
  commentId: Id<"comments">;
  authorId: Id<"users">;
  isAuthenticated: boolean;
  isAuthor: boolean;
}) {
  const createReport = useMutation(api.trust.createReport);
  const setBlock = useMutation(api.trust.setBlock);
  const setMute = useMutation(api.trust.setMute);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isAuthenticated || isAuthor) return null;

  async function act(callback: () => Promise<unknown>, message: string) {
    setPending(true);
    setNotice(null);
    try {
      await callback();
      setNotice(message);
      setReporting(false);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Safety action could not be completed",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-md p-1 text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Comment safety actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-xl border border-border bg-background p-3 dark:bg-background">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              disabled={pending}
              onClick={() =>
                void act(
                  () =>
                    setMute({
                      target: { kind: "person", userId: authorId },
                      muted: true,
                    }),
                  "Author muted",
                )
              }
            >
              <VolumeX className="h-3.5 w-3.5" />
              Mute
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              disabled={pending}
              onClick={() =>
                void act(
                  () => setBlock({ blockedUserId: authorId, blocked: true }),
                  "Author blocked",
                )
              }
            >
              <Ban className="h-3.5 w-3.5" />
              Block
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              disabled={pending}
              onClick={() => setReporting((value) => !value)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Report
            </Button>
          </div>
          {reporting ? (
            <form
              className="mt-3 border-t border-border pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void act(
                  () =>
                    createReport({
                      target: { kind: "comment", commentId },
                      reason: "other",
                      details,
                    }),
                  "Report submitted",
                );
              }}
            >
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Why should this comment be reviewed?"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                size="sm"
                className="mt-2 rounded-md"
                disabled={pending}
              >
                {pending ? "Submitting…" : "Submit report"}
              </Button>
            </form>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="mt-2 text-[10px] leading-4 text-muted-foreground"
            >
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentOwnerControls({
  commentId,
  isAuthor,
  initialBody,
}: {
  commentId: Id<"comments">;
  isAuthor: boolean;
  initialBody: string;
}) {
  const updateComment = useMutation(api.comments.update);
  const removeComment = useMutation(api.comments.remove);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBody);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isAuthor) return null;

  async function save() {
    if (pending || draft.trim().length === 0) return;
    setPending(true);
    setNotice(null);
    try {
      await updateComment({ commentId, body: draft });
      setEditing(false);
      setNotice("Updated");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Comment could not be updated",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending || !window.confirm("Delete this comment?")) return;
    setPending(true);
    setNotice(null);
    try {
      await removeComment({ commentId });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Comment could not be deleted",
      );
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label htmlFor={`edit-comment-${commentId}`} className="sr-only">
            Edit comment
          </label>
          <input
            id={`edit-comment-${commentId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={16_000}
            className="h-7 w-48 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending || draft.trim().length === 0}
            className="text-xs font-semibold text-foreground hover:underline disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setDraft(initialBody);
              setEditing(false);
            }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setDraft(initialBody);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void remove()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-700 dark:hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </>
      )}
      {notice ? (
        <span role="status" className="text-[10px] text-muted-foreground">
          {notice}
        </span>
      ) : null}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  count,
  active,
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
        "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/[0.06]",
        active && "bg-accent text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined ? (
        <span className="font-mono text-[10px]">{formatCount(count)}</span>
      ) : null}
    </button>
  );
}

function PostSetupState() {
  return (
    <CurationShell active="Home" eyebrow="post" title="Discussion">
      <div className="page-section">
        <CurationEmptyState
          icon={Code2}
          eyebrow="Temporarily unavailable"
          title="This conversation cannot load right now."
          body="You can still explore public repositories while discussions are unavailable."
          action="Explore repositories"
          actionHref="/explore"
        />
      </div>
    </CurationShell>
  );
}

function PostLoadingState() {
  return (
    <CurationShell active="Home" eyebrow="post" title="Discussion">
      <div className="page-section">
        <CurationLoading label="Loading conversation…" />
      </div>
    </CurationShell>
  );
}

function PostNotFoundState() {
  return (
    <CurationShell active="Home" eyebrow="post" title="Discussion">
      <div className="page-section">
        <CurationEmptyState
          icon={UserRound}
          eyebrow="Unavailable"
          title="This post is not available."
          body="It may be private or deleted, or you may not have access to it."
          action="Back to home"
          actionHref="/home"
        />
      </div>
    </CurationShell>
  );
}

function initials(value: string) {
  return (
    value
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "OH"
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
