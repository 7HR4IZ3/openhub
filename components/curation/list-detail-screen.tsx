"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import {
  CurationRail,
  CurationShell,
} from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  BookmarkIcon as FolderHeart,
  GlobeIcon as Globe2,
  LockClosedIcon as LockKeyhole,
} from "@radix-ui/react-icons";
import Link from "next/link";

export function ListDetailScreen({ listId }: { listId: string }) {
  return <ConnectedListDetail listId={listId as Id<"lists">} />;
}

function ConnectedListDetail({ listId }: { listId: Id<"lists"> }) {
  const list = useQuery(api.curation.getList, { listId });
  const items = usePaginatedQuery(
    api.curation.listItems,
    { listId },
    { initialNumItems: 30 },
  );

  if (
    list === undefined ||
    (items.status === "LoadingFirstPage" && items.results.length === 0)
  ) {
    return (
      <CurationShell active="Lists" eyebrow="list" title="Curated trail">
        <div className="p-5 sm:p-7">
          <CurationLoading label="Loading this trail…" />
        </div>
      </CurationShell>
    );
  }

  if (list === null) {
    return (
      <CurationShell active="Lists" eyebrow="list" title="Curated trail">
        <CurationEmptyState
          className="m-5 sm:m-7"
          icon={FolderHeart}
          eyebrow="Trail unavailable"
          title="This list is private or no longer exists."
          body="Private lists only appear to their owner. Browse public trails or return to discovery."
          action="Browse public trails"
          actionHref="/lists"
          secondaryAction="Explore repositories"
          secondaryHref="/explore"
        />
      </CurationShell>
    );
  }

  return (
    <CurationShell
      active="Lists"
      eyebrow="list"
      title={list.title}
      description={list.description || "A source trail through software."}
      aside={<CurationRail />}
    >
      <div className="border-b border-border p-5 sm:p-7">
        <Link
          href="/lists"
          className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All lists
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <FolderHeart className="h-4 w-4 text-foreground" />
          <span>
            {list.visibility === "public" ? "Public trail" : "Private notebook"}
          </span>
          {list.visibility === "public" ? (
            <Globe2 className="ml-2 h-3.5 w-3.5" />
          ) : (
            <LockKeyhole className="ml-2 h-3.5 w-3.5" />
          )}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Every item keeps its original source boundary. If a repository or post
          becomes private later, it disappears from this trail.
        </p>
      </div>
      <section className="p-5 sm:p-7" aria-labelledby="list-items-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Trail items
            </p>
            <h2
              id="list-items-heading"
              className="mt-2 text-xl font-semibold tracking-[-0.035em]"
            >
              Follow the path
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {items.results.length} loaded
          </span>
        </div>
        {items.results.length === 0 && items.status !== "LoadingFirstPage" ? (
          <CurationEmptyState
            className="mt-5"
            icon={FolderHeart}
            eyebrow="Empty trail"
            title="Add a repository or discussion from discovery."
            body="OpenHub lists become useful when each item answers the question behind the trail."
            action="Explore repositories"
            actionHref="/explore"
          />
        ) : null}
        <div className="mt-5 divide-y divide-black/[0.08] rounded-xl border border-border dark:divide-white/[0.08]">
          {items.results.map((item) => (
            <Link
              key={item._id}
              href={item.targetHref}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary dark:bg-secondary">
                <FolderHeart className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {item.targetLabel}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {item.targetKey} · added {formatDate(item.createdAt)}
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
        {items.status === "CanLoadMore" || items.status === "LoadingMore" ? (
          <div className="mt-5 text-center">
            <Button
              type="button"
              variant="ghost"
              className="rounded-md text-xs"
              onClick={() => items.loadMore(30)}
              disabled={items.status === "LoadingMore"}
            >
              {items.status === "LoadingMore" ? "Loading…" : "Load more items"}
            </Button>
          </div>
        ) : null}
      </section>
    </CurationShell>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
