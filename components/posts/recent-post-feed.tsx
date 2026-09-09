"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import {
  ArrowTopRightIcon as ArrowUpRight,
  CodeIcon as Code2,
  SwitchIcon as GitCompareArrows,
  ChatBubbleIcon as MessageCircle,
  LoopIcon as Repeat2,
} from "@radix-ui/react-icons";

import { api } from "@/convex/_generated/api";
import { PostBody } from "@/components/posts/post-body";
import {
  CurationErrorState,
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";

export type PostFeedMode = "recent" | "following" | "trending";

export function RecentPostFeed({
  convexConfigured,
  mode = "recent",
}: {
  convexConfigured: boolean;
  mode?: PostFeedMode;
}) {
  if (!convexConfigured) return null;
  return <ConnectedRecentPostFeed mode={mode} />;
}

function ConnectedRecentPostFeed({ mode }: { mode: PostFeedMode }) {
  const {
    results: posts,
    status,
    isLoading,
    loadMore,
  } = usePaginatedQuery(api.posts.recentPage, mode === "recent" ? {} : "skip", {
    initialNumItems: 12,
  });
  const following = useQuery(
    api.posts.following,
    mode === "following" ? { limit: 12 } : "skip",
  ) as typeof posts | undefined;
  const trending = useQuery(
    api.posts.trending,
    mode === "trending" ? { limit: 12 } : "skip",
  ) as typeof posts | undefined;
  const activePosts =
    mode === "following" ? following : mode === "trending" ? trending : posts;

  if (
    (mode === "recent" && isLoading && posts.length === 0) ||
    (mode !== "recent" && activePosts === undefined)
  ) {
    return (
      <CurationLoading
        label={
          mode === "following"
            ? "Loading your trail…"
            : mode === "trending"
              ? "Finding meaningful momentum…"
              : "Loading source-backed posts…"
        }
      />
    );
  }

  if (mode === "recent" && status.toString() === "Error") {
    return (
      <CurationErrorState
        title="The public trail could not load."
        body="Try again to reconnect recent source-backed posts."
      />
    );
  }

  if (activePosts?.length === 0) {
    return (
      <CurationEmptyState
        icon={Code2}
        eyebrow={
          mode === "following"
            ? "Your trail is quiet"
            : mode === "trending"
              ? "No momentum yet"
              : "The public trail is quiet"
        }
        title={
          mode === "following"
            ? "Follow a person or project to begin."
            : mode === "trending"
              ? "The useful conversations are still gathering."
              : "Be early to a useful conversation."
        }
        body={
          mode === "following"
            ? "Follow developers, repositories, topics, or categories from the places you explore. OpenHub will keep the feed source-backed."
            : mode === "trending"
              ? "Trending favors fresh, constructive conversations with source context over raw engagement."
              : "When people publish source-backed snippets, questions, and reviews, they will appear here with the original repository context attached."
        }
        action={
          mode === "following" ? "Explore repositories" : "Browse repositories"
        }
        actionHref="/explore"
        secondaryAction={
          mode === "following" ? "View public trail" : "Write a post"
        }
        secondaryHref={mode === "following" ? "/home" : "/compose"}
      />
    );
  }

  if (activePosts === undefined)
    return <CurationLoading label="Loading your feed…" />;

  return (
    <div className="v2-feed divide-y divide-border">
      <div className="v2-feed-heading flex items-end justify-between gap-4 p-5 sm:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            {mode === "following"
              ? "Following trail"
              : mode === "trending"
                ? "Meaningful momentum"
                : "Public trail"}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">
            {mode === "following"
              ? "From your chosen trail"
              : mode === "trending"
                ? "Conversations worth opening"
                : "Recent source-backed posts"}
          </h2>
        </div>
        <Link
          href="/compose"
          className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          Add context <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {activePosts.map((post) => (
        <article key={post._id} className="v2-post p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground dark:bg-white/[0.08]">
              {initials(post.author.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
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
              <span className="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground dark:bg-secondary">
                {post.type}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <PostBody
              body={post.body}
              lineLinkBase={post.sourceReference?.canonicalUrl}
            />
          </div>
          {post.sourceReference ? (
            <Link
              href={`/posts/${post._id}`}
              className="v2-source-card mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted p-4 transition-colors hover:border-ring dark:bg-muted"
            >
              <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">
                  {post.sourceReference.path}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.sourceReference.repositoryFullName} · lines{" "}
                  {post.sourceReference.startLine}–
                  {post.sourceReference.endLine} · @
                  {post.sourceReference.originalOwner}
                </p>
              </div>
              <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
          {post.diffReference ? (
            <Link
              href={`/posts/${post._id}`}
              className="v2-source-card mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted p-4 transition-colors hover:border-ring dark:bg-muted"
            >
              <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">
                  {post.diffReference.path}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.diffReference.repositoryFullName} ·{" "}
                  {post.diffReference.baseCommitSha.slice(0, 7)} →{" "}
                  {post.diffReference.headCommitSha.slice(0, 7)} · @
                  {post.diffReference.originalOwner}
                </p>
              </div>
              <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
          <div className="v2-post-actions mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat2 className="h-3.5 w-3.5" /> {post.repostCount}
            </span>
            <Link
              href={`/posts/${post._id}`}
              className="ml-auto font-semibold text-foreground hover:underline"
            >
              Open discussion
            </Link>
          </div>
        </article>
      ))}
      {mode === "recent" &&
      (status === "CanLoadMore" || status === "LoadingMore") ? (
        <div className="p-5 text-center sm:p-7">
          <button
            type="button"
            onClick={() => loadMore(12)}
            className="text-xs font-semibold text-foreground hover:underline disabled:opacity-50"
            disabled={status !== "CanLoadMore"}
          >
            {status === "LoadingMore"
              ? "Loading…"
              : "Load more source-backed posts"}
          </button>
        </div>
      ) : null}
    </div>
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
  }).format(new Date(value));
}
