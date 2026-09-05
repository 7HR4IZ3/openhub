"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { useQuery } from "convex/react";
import { ArrowUpRight, BookMarked, Globe2, LockKeyhole } from "lucide-react";
import Link from "next/link";

const page = { paginationOpts: { numItems: 8, cursor: null } } as const;

export function ProfileListTrail({ userId, own = false }: { userId: Id<"users">; own?: boolean }) {
  const ownedLists = useQuery(api.curation.myLists, own ? page : "skip");
  const publicLists = useQuery(api.curation.discoverLists, own ? "skip" : { ownerId: userId, ...page });
  const lists = own ? ownedLists : publicLists;

  if (lists === undefined) return <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7"><CurationLoading label="Loading curated trails..." /></section>;
  if (lists.page.length === 0) {
    if (!own) return null;
    return <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7"><CurationEmptyState icon={BookMarked} eyebrow="Curated trails" title="Your lists are waiting for a point of view." body="Save a repository or public post into a list to make a useful path for your future self." action="Browse repositories" actionHref="/explore" /></section>;
  }

  return (
    <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7" aria-labelledby="profile-lists-heading">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Curated trails</p><h2 id="profile-lists-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">{own ? "Your lists" : "Public lists"}</h2></div>
        <Link href="/lists" className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open lists <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {lists.page.map((list) => <ProfileListCard key={list._id} list={list} />)}
      </div>
    </section>
  );
}

function ProfileListCard({ list }: { list: Doc<"lists"> }) {
  const Icon = list.visibility === "private" ? LockKeyhole : Globe2;
  return <Link href={`/lists/${list._id}`} className="rounded-2xl border border-black/[0.08] p-5 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08] dark:hover:border-[#e99970]/50"><div className="flex items-center justify-between gap-3"><Icon className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{list.visibility}</span></div><h3 className="mt-5 truncate text-sm font-semibold">{list.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{list.description || "A source-backed trail through software."}</p></Link>;
}
