"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import {
  CurationRail,
  CurationShell,
} from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BookMarked,
  Globe2,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const paginationOpts = {
  paginationOpts: { numItems: 50, cursor: null },
} as const;

export function ListDetailScreen({
  listId,
  convexConfigured,
}: {
  listId: string;
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <ListDetailSetup />;
  return <ConnectedListDetailScreen listId={listId} />;
}

function ConnectedListDetailScreen({ listId }: { listId: string }) {
  const id = listId as Id<"lists">;
  const list = useQuery(api.curation.getList, { listId: id });
  const items = useQuery(api.curation.listItems, {
    listId: id,
    ...paginationOpts,
  });
  const remove = useMutation(api.curation.removeListItem);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (list === undefined || items === undefined)
    return (
      <CurationShell active="Lists" eyebrow="lists" title="Reading trail">
        <div className="p-5 sm:p-7">
          <CurationLoading label="Loading reading trail..." />
        </div>
      </CurationShell>
    );
  if (list === null)
    return (
      <CurationShell active="Lists" eyebrow="lists" title="Reading trail">
        <div className="p-5 sm:p-7">
          <CurationEmptyState
            icon={BookMarked}
            eyebrow="Trail unavailable"
            title="This list is private or no longer exists."
            body="Private lists are visible only to their owner."
            action="Back to lists"
            actionHref="/lists"
          />
        </div>
      </CurationShell>
    );

  async function removeItem(item: Doc<"listItems">) {
    setRemoving(item._id);
    setError(null);
    try {
      await remove({ listId: id, target: item.target });
    } catch {
      setError("This item could not be removed yet.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <CurationShell
      active="Lists"
      eyebrow="lists"
      title={list.title}
      description={
        list.description || "A source-backed trail through software."
      }
      aside={<CurationRail />}
    >
      <section className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
        <Link
          href="/lists"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All lists
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e9e6dc] dark:bg-[#20251f]">
            {list.visibility === "private" ? (
              <LockKeyhole className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
            ) : (
              <Globe2 className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
            )}
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {list.visibility} list
          </span>
        </div>
      </section>
      <section className="p-5 sm:p-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Source trail
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {items.page.length} saved{" "}
              {items.page.length === 1 ? "item" : "items"}
            </h2>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/explore">Find source</Link>
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {items.page.length ? (
          <div className="mt-5 divide-y divide-black/[0.08] rounded-2xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.08]">
            {items.page.map((item) => (
              <div key={item._id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.target.kind === "repo" ? "Repository" : "Post"}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">{item.targetLabel}</p>
                </div>
                <Link href={item.targetHref} className="shrink-0 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                  Open {item.target.kind === "repo" ? "repository" : "post"}
                </Link>
                <button
                  type="button"
                  aria-label="Remove saved item"
                  className="rounded-md p-2 text-muted-foreground hover:bg-black/[0.05] hover:text-destructive dark:hover:bg-white/[0.06]"
                  disabled={removing === item._id}
                  onClick={() => void removeItem(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-black/[0.14] p-6 text-sm leading-6 text-muted-foreground dark:border-white/[0.14]">
            Save a repository from its workspace or add a public post to start
            this trail.
          </div>
        )}
      </section>
    </CurationShell>
  );
}

function ListDetailSetup() {
  return (
    <CurationShell active="Lists" eyebrow="lists" title="Reading trail">
      <div className="p-5 sm:p-7">
        <CurationEmptyState
          icon={BookMarked}
          eyebrow="Backend connection needed"
          title="Reading trails are ready to connect."
          body="Connect the Convex deployment to load saved repository and post context. Nothing is requested while the backend is unavailable."
          action="Browse repositories"
          actionHref="/explore"
          secondaryAction="Connect GitHub"
          secondaryHref="/signin"
        />
      </div>
    </CurationShell>
  );
}
