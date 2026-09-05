"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { PostBody } from "@/components/posts/post-body";
import { useQuery } from "convex/react";
import { ArrowUpRight, Code2, GitBranch, MessageCircle } from "lucide-react";
import Link from "next/link";

export function ProfilePostTrail({ userId, own = false }: { userId: Id<"users">; own?: boolean }) {
  const posts = useQuery(api.posts.byAuthor, { userId, limit: 8 });

  if (posts === undefined) return <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7"><CurationLoading label="Loading public posts..." /></section>;
  if (posts.length === 0) return <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7"><CurationEmptyState icon={Code2} eyebrow="Public writing" title={own ? "Your public trail is waiting." : "No public posts yet."} body={own ? "Publish a source-backed snippet, question, or discussion to start a trail others can follow." : "Public source-backed writing will appear here when this developer starts a trail."} action={own ? "Write a post" : "Explore repositories"} actionHref={own ? "/compose" : "/explore"} /></section>;

  return <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="profile-posts-heading"><div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Public writing</p><h2 id="profile-posts-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">Posts and snippets</h2></div><Link href="/home" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open feed <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="mt-5 divide-y divide-black/[0.08] overflow-hidden rounded-2xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.08]">{posts.map((post) => <article key={post._id} className="p-5"><div className="flex items-center gap-2 text-xs"><span className="font-semibold">{post.type}</span><span className="text-muted-foreground">·</span><time className="text-muted-foreground" dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt)}</time></div><div className="mt-3 line-clamp-5"><PostBody body={post.body} /></div>{post.sourceReference ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Code2 className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />{post.sourceReference.repositoryFullName} · {post.sourceReference.path} · L{post.sourceReference.startLine}–L{post.sourceReference.endLine}</p> : post.diffReference ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><GitBranch className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />{post.diffReference.repositoryFullName} · {post.diffReference.path} · {post.diffReference.baseCommitSha.slice(0, 7)} → {post.diffReference.headCommitSha.slice(0, 7)}</p> : null}<div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />{post.commentCount} replies</span><Link href={`/posts/${post._id}`} className="font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open discussion</Link></div></article>)}</div></section>;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
