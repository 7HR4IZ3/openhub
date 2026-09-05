"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowUpRight, Code2, GitBranch, MessageCircle, Quote, Repeat2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { PostBody } from "@/components/posts/post-body";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";

export type FeedMode = "forYou" | "following" | "trending";

export function RecentPostFeed({ convexConfigured, mode = "forYou" }: { convexConfigured: boolean; mode?: FeedMode }) {
  if (!convexConfigured) return null;
  return <ConnectedRecentPostFeed mode={mode} />;
}

function ConnectedRecentPostFeed({ mode }: { mode: FeedMode }) {
  const posts = useQuery(api.posts.feed, { mode, limit: 12 });

  if (posts === undefined) {
    return <CurationLoading label="Loading source-backed posts…" />;
  }

  if (posts.length === 0) {
    return (
      <CurationEmptyState
        icon={Code2}
        eyebrow={mode === "following" ? "Your following trail is quiet" : mode === "trending" ? "No trending posts yet" : "The public trail is quiet"}
        title={mode === "following" ? "Follow a developer or repository to shape this lane." : "Be early to a useful conversation."}
        body={mode === "following" ? "Posts from the people and repositories you follow will appear here with their source context attached." : "When people publish source-backed snippets, questions, and reviews, they will appear here with the original repository context attached."}
        action="Browse repositories"
        actionHref="/explore"
        secondaryAction={mode === "following" ? "Build your profile" : "Write a post"}
        secondaryHref={mode === "following" ? "/profile" : "/compose"}
      />
    );
  }

  return (
    <div className="divide-y divide-black/[0.08] rounded-[1.6rem] border border-black/[0.1] bg-[#fbfbf9] dark:divide-white/[0.08] dark:border-white/[0.1] dark:bg-[#151714]">
      <div className="flex items-end justify-between gap-4 p-5 sm:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b513d] dark:text-[#e6a07c]">Public trail</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">{mode === "following" ? "From your trail" : mode === "trending" ? "Trending source-backed posts" : "Recent source-backed posts"}</h2>
        </div>
        <Link href="/compose" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
          Add context <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {posts.map((post) => (
        <article key={post._id} className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] text-[10px] font-semibold text-[#8f432b] dark:bg-white/[0.08] dark:text-[#f0b38d]">
              {initials(post.author.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-semibold">{post.author.displayName}</span>
                <Link href={`/profile/${encodeURIComponent(post.author.handle)}`} className="text-muted-foreground hover:text-foreground hover:underline">@{post.author.handle}</Link>
                <span className="text-muted-foreground">·</span>
                <time className="text-muted-foreground" dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt)}</time>
              </div>
              <span className="mt-2 inline-flex rounded-full bg-[#e9e6dc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f432b] dark:bg-[#20251f] dark:text-[#f0b38d]">
                {post.type}
              </span>
            </div>
          </div>
          <div className="mt-4"><PostBody body={post.body} /></div>
          {post.sourceReference ? (
            <Link href={`/posts/${post._id}`} className="mt-4 flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-[#f0efe9] p-4 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:bg-[#0f120f]">
              <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">{post.sourceReference.path}</p>
                <p className="mt-1 text-xs text-muted-foreground">{post.sourceReference.repositoryFullName} · lines {post.sourceReference.startLine}–{post.sourceReference.endLine} · @{post.sourceReference.originalOwner}</p>
              </div>
              <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ) : post.diffReference ? (
            <Link href={`/posts/${post._id}`} className="mt-4 flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-[#f0efe9] p-4 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:bg-[#0f120f]">
              <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold">{post.diffReference.path}</p>
                <p className="mt-1 text-xs text-muted-foreground">{post.diffReference.repositoryFullName} · {post.diffReference.baseCommitSha.slice(0, 7)} → {post.diffReference.headCommitSha.slice(0, 7)} · @{post.diffReference.originalOwner}</p>
              </div>
              <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
          {post.quotedPost ? (
            <Link href={`/posts/${post.quotedPost._id}`} className="mt-4 block rounded-2xl border border-black/[0.08] p-4 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:hover:border-[#e99970]/50">
              <div className="flex items-center gap-2 text-xs">
                <Quote className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
                <span className="font-semibold">{post.quotedPost.author.displayName}</span>
                <span className="text-muted-foreground">@{post.quotedPost.author.handle}</span>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6">{post.quotedPost.body}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Original {post.quotedPost.type}</p>
            </Link>
          ) : null}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}</span>
            <span className="inline-flex items-center gap-1.5"><Repeat2 className="h-3.5 w-3.5" /> {post.repostCount}</span>
            <Link href={`/posts/${post._id}`} className="ml-auto font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open discussion</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function initials(value: string) {
  return value.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "OH";
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
