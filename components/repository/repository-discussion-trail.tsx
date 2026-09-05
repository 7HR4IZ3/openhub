"use client";

import { api } from "@/convex/_generated/api";
import { PostBody } from "@/components/posts/post-body";
import { CurationLoading } from "@/components/curation/curation-states";
import { useQuery } from "convex/react";
import { ArrowUpRight, Code2, GitBranch, MessageCircle } from "lucide-react";
import Link from "next/link";

export function RepositoryDiscussionTrail({ provider, providerRepositoryId }: { provider: string; providerRepositoryId: string }) {
  const repository = useQuery(api.repositories.byProviderRepository, { provider, providerRepositoryId });
  const posts = useQuery(
    api.posts.byRepository,
    repository ? { provider, providerRepositoryId, limit: 8 } : "skip",
  );

  if (repository === undefined || (repository && posts === undefined)) {
    return <section className="mt-4"><CurationLoading label="Loading repository discussions..." /></section>;
  }
  if (!repository || !posts || posts.length === 0) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-black/[0.1] bg-[#fbfbf9] dark:border-white/[0.1] dark:bg-[#151714]" aria-labelledby="repository-discussions-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">OpenHub context</p>
          <h2 id="repository-discussions-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">Discussions around this source</h2>
        </div>
        <Link href="/compose" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Add context <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
        {posts.map((post) => (
          <article key={post._id} className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">{post.author.displayName}</span>
              <Link href={`/profile/${encodeURIComponent(post.author.handle)}`} className="text-muted-foreground hover:underline">@{post.author.handle}</Link>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{post.type}</span>
            </div>
            <div className="mt-3 line-clamp-4"><PostBody body={post.body} /></div>
            {post.sourceReference ? <p className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground"><Code2 className="h-3.5 w-3.5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />{post.sourceReference.path}:L{post.sourceReference.startLine}–L{post.sourceReference.endLine}</p> : null}
            {post.diffReference ? <p className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground"><GitBranch className="h-3.5 w-3.5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />{post.diffReference.path}:{post.diffReference.baseCommitSha.slice(0, 7)} → {post.diffReference.headCommitSha.slice(0, 7)}</p> : null}
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />{post.commentCount} replies</span><Link href={`/posts/${post._id}`} className="inline-flex items-center gap-1 font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open discussion <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          </article>
        ))}
      </div>
    </section>
  );
}
