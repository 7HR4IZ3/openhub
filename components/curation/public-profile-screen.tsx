"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { ReputationPanel } from "@/components/curation/reputation-panel";
import { RepositoryCard, type RepositoryCardData } from "@/components/curation/profile-screen";
import { PostBody } from "@/components/posts/post-body";
import { Button } from "@/components/ui/button";
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ArrowLeft, ArrowUpRight, Code2, Github, UserRound } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function PublicProfileScreen({ handle }: { handle: string }) {
  const profile = useQuery(api.profiles.byHandle, { handle });
  if (profile === undefined) return <CurationShell active="Profile" eyebrow="profile" title="Developer profile"><div className="p-5 sm:p-7"><CurationLoading label="Loading profile…" /></div></CurationShell>;
  if (profile === null) return <CurationShell active="Profile" eyebrow="profile" title="Developer profile"><CurationEmptyState className="m-5 sm:m-7" icon={UserRound} eyebrow="Profile unavailable" title="This developer profile could not be found." body="The handle may have changed or the profile may not be connected yet." action="Explore repositories" actionHref="/explore" secondaryAction="Return home" secondaryHref="/home" /></CurationShell>;
  return <ConnectedPublicProfile profile={profile} />;
}

function ConnectedPublicProfile({ profile }: { profile: Doc<"profiles"> }) {
  const { isAuthenticated } = useConvexAuth();
  const following = useQuery(api.curation.isFollowing, { target: { kind: "person", userId: profile.userId } });
  const setFollow = useMutation(api.curation.setFollow);
  const posts = usePaginatedQuery(api.posts.byAuthor, { userId: profile.userId }, { initialNumItems: 12 });
  const repositories = useQuery(api.profiles.repositories, profile.githubLogin ? { githubLogin: profile.githubLogin, limit: 12 } : "skip");
  const [pending, setPending] = useState(false);
  const githubUrl = profile.githubProfileUrl ?? `https://github.com/${profile.githubLogin ?? profile.handle}`;

  async function toggleFollow() {
    if (!isAuthenticated || pending) return;
    setPending(true);
    try {
      await setFollow({ target: { kind: "person", userId: profile.userId }, following: !following });
    } finally {
      setPending(false);
    }
  }

  return (
    <CurationShell active="Profile" eyebrow="profile" title={profile.displayName} description={`@${profile.handle}`} aside={<CurationRail />}>
      <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
        <Link href="/home" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"><ArrowLeft className="h-3.5 w-3.5" /> Back to discovery</Link>
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-4"><Avatar profile={profile} /><div className="min-w-0"><p className="text-xs text-muted-foreground">@{profile.handle}{profile.githubLogin ? ` · @${profile.githubLogin} on GitHub` : ""}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{profile.displayName}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{profile.bio || "A developer making sense of software one repository at a time."}</p></div></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-full"><a href={githubUrl} target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> GitHub</a></Button>{isAuthenticated && profile.userId ? <Button type="button" className="rounded-full" variant={following ? "secondary" : "default"} onClick={() => void toggleFollow()} disabled={pending}>{pending ? "Saving…" : following ? "Following" : "Follow"}</Button> : null}</div></div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">{profile.interests.map((interest) => <span key={interest} className="rounded-full bg-[#e9e6dc] px-3 py-1.5 dark:bg-[#20251f]">{interest}</span>)}{profile.availability ? <span className="rounded-full border border-black/[0.1] px-3 py-1.5 dark:border-white/[0.1]">{profile.availability}</span> : null}</div>
      </section>
      <ReputationPanel userId={profile.userId} />
      <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="public-repositories-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public source trail</p><h2 id="public-repositories-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">Repositories</h2></div><span className="text-xs text-muted-foreground">{repositories?.length ?? 0} shown</span></div>
        {repositories === undefined ? <div className="mt-5"><CurationLoading label="Loading public repositories…" /></div> : repositories.length === 0 ? <p className="mt-5 text-sm leading-6 text-muted-foreground">No public repositories have been imported for this profile yet.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{repositories.map((repository: RepositoryCardData) => <RepositoryCard key={repository._id} repository={repository} />)}</div>}
      </section>
      <section className="p-5 sm:p-7" aria-labelledby="public-posts-heading"><div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source-backed writing</p><h2 id="public-posts-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">Public posts</h2></div><span className="text-xs text-muted-foreground">{posts.results.length} loaded</span></div>{posts.results.length === 0 && posts.status === "LoadingFirstPage" ? <div className="mt-5"><CurationLoading label="Loading public posts…" /></div> : null}{posts.results.length === 0 && posts.status !== "LoadingFirstPage" ? <CurationEmptyState className="mt-5" icon={Code2} eyebrow="No public posts" title="This trail has not started here yet." body="Explore the repositories this developer studies, then return when the first useful context is published." action="Explore repositories" actionHref="/explore" /> : null}<div className="mt-5 divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.08]">{posts.results.map((post) => <article key={post._id} className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b4d31] dark:text-[#e99970]">{post.type}</span><Link href={`/posts/${post._id}`} className="text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open <ArrowUpRight className="inline h-3.5 w-3.5" /></Link></div><div className="mt-3"><PostBody body={post.body} lineLinkBase={post.sourceReference?.canonicalUrl} /></div>{post.sourceReference ? <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Code2 className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />{post.sourceReference.repositoryFullName} · {post.sourceReference.path}</p> : null}</article>)}</div>{posts.status === "CanLoadMore" || posts.status === "LoadingMore" ? <div className="mt-5 text-center"><Button type="button" variant="ghost" className="rounded-full text-xs" onClick={() => posts.loadMore(12)} disabled={posts.status === "LoadingMore"}>{posts.status === "LoadingMore" ? "Loading…" : "Load more posts"}</Button></div> : null}</section>
    </CurationShell>
  );
}

function Avatar({ profile }: { profile: Doc<"profiles"> }) {
  const initials = profile.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#e9e6dc] text-lg font-semibold dark:bg-[#20251f]">{profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={64} height={64} className="h-full w-full object-cover" /> : initials || "OH"}</div>;
}
