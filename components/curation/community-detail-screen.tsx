"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { PostBody } from "@/components/posts/post-body";
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ArrowLeft, ArrowUpRight, Code2, Globe2, LockKeyhole, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function CommunityDetailScreen({ communityId }: { communityId: string }) {
  return <ConnectedCommunityDetail communityId={communityId as Id<"communities">} />;
}

function ConnectedCommunityDetail({ communityId }: { communityId: Id<"communities"> }) {
  const community = useQuery(api.curation.getCommunity, { communityId });
  const membership = useQuery(api.curation.membershipState, { communityId });
  const posts = usePaginatedQuery(api.posts.byCommunity, { communityId }, { initialNumItems: 12 });
  const { isAuthenticated } = useConvexAuth();
  const join = useMutation(api.curation.joinCommunity);
  const leave = useMutation(api.curation.leaveCommunity);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (community === undefined) return <CurationShell active="Communities" eyebrow="community" title="Technical circle"><div className="p-5 sm:p-7"><CurationLoading label="Loading this circle…" /></div></CurationShell>;
  if (community === null) return <CurationShell active="Communities" eyebrow="community" title="Technical circle"><CurationEmptyState className="m-5 sm:m-7" icon={Users} eyebrow="Circle unavailable" title="This community is private or no longer exists." body="Private circles are visible only to active members. Return to public discovery to find another source-backed discussion space." action="Discover circles" actionHref="/communities" secondaryAction="Explore repositories" secondaryHref="/explore" /></CurationShell>;

  const active = membership?.status === "active";
  async function toggleMembership() {
    if (!isAuthenticated || pending) return;
    setPending(true);
    setError(null);
    try {
      if (active) await leave({ communityId });
      else await join({ communityId });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Membership could not be updated");
    } finally {
      setPending(false);
    }
  }

  return <CurationShell active="Communities" eyebrow="community" title={community.name} description="A focused space for source-backed discussion." aside={<CurationRail />}>
    <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
      <Link href="/communities" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"><ArrowLeft className="h-3.5 w-3.5" /> All circles</Link>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><Users className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />{community.visibility === "public" ? <><Globe2 className="h-3.5 w-3.5" /> Public circle</> : <><LockKeyhole className="h-3.5 w-3.5" /> Private circle</>}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{community.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{community.description || "A technical circle for source-backed discussion."}</p>
        </div>
        <Button type="button" variant={active ? "secondary" : "default"} className="shrink-0 rounded-full" onClick={() => void toggleMembership()} disabled={!isAuthenticated || pending}>{!isAuthenticated ? "Sign in to join" : pending ? "Saving…" : active ? "Leave circle" : "Join circle"}</Button>
      </div>
      {error ? <p role="alert" className="mt-4 text-xs text-destructive">{error}</p> : null}
    </section>
    <section className="p-5 sm:p-7">
      <div className="rounded-[1.6rem] bg-[#e9e6dc] p-6 dark:bg-[#20251f] sm:p-7"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">Discussion boundary</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.035em]">Keep the source close.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Posts in this circle stay attached to the community boundary. Share a source, question, review, or discussion for the next reader.</p><div className="mt-5 flex flex-wrap gap-2">{active ? <Button asChild className="rounded-full"><Link href={`/compose?communityId=${encodeURIComponent(communityId)}`}>Start a discussion <ArrowUpRight className="h-4 w-4" /></Link></Button> : <Button type="button" className="rounded-full" onClick={() => void toggleMembership()} disabled={!isAuthenticated || pending}>{isAuthenticated ? "Join to post" : "Sign in to join"}</Button>}</div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Signal label="Visibility" value={community.visibility === "public" ? "Public" : "Private"} /><Signal label="Membership" value={active ? "Active" : "Not joined"} /><Signal label="Posts" value={String(posts.results.length)} /></div>
      <div className="mt-10 flex items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Community trail</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Recent context</h3></div>{active ? <Link href={`/compose?communityId=${encodeURIComponent(communityId)}`} className="text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Write <ArrowUpRight className="inline h-3.5 w-3.5" /></Link> : null}</div>
      {posts.results.length === 0 && posts.status === "LoadingFirstPage" ? <div className="mt-5"><CurationLoading label="Loading community context…" /></div> : null}
      {posts.results.length === 0 && posts.status !== "LoadingFirstPage" ? <CurationEmptyState className="mt-5" icon={Code2} eyebrow="No community posts" title="Start with one useful question." body="A good first post names the source, the tradeoff, or the thing you are trying to understand." action={active ? "Write a post" : "Join the circle"} actionHref={active ? `/compose?communityId=${encodeURIComponent(communityId)}` : undefined} /> : null}
      {posts.results.length > 0 ? <div className="mt-5 divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.08]">{posts.results.map((post) => <article key={post._id} className="p-5"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold uppercase tracking-[0.12em] text-[#9b4d31] dark:text-[#e99970]">{post.type}</span><Link href={`/posts/${post._id}`} className="font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div><div className="mt-3"><PostBody body={post.body} lineLinkBase={post.sourceReference?.canonicalUrl} /></div><p className="mt-4 text-xs text-muted-foreground">by @{post.author.handle}</p></article>)}</div> : null}
      {posts.status === "CanLoadMore" || posts.status === "LoadingMore" ? <div className="mt-5 text-center"><Button type="button" variant="ghost" className="rounded-full text-xs" onClick={() => posts.loadMore(12)} disabled={posts.status === "LoadingMore"}>{posts.status === "LoadingMore" ? "Loading…" : "Load more context"}</Button></div> : null}
    </section>
  </CurationShell>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.08]"><p className="text-sm font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}
