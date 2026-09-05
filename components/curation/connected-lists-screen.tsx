"use client";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { BookMarked, Compass, FolderHeart, Globe2, LockKeyhole, Plus, Save } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

type List = Doc<"lists">;
type ListTab = "your" | "shared" | "discover";
const page = { paginationOpts: { numItems: 30, cursor: null } } as const;

export function ConnectedListsScreen() {
  const [activeTab, setActiveTab] = useState<ListTab>("your");
  const tabs: Array<{ value: ListTab; label: string }> = [
    { value: "your", label: "Your lists" },
    { value: "shared", label: "Public trails" },
    { value: "discover", label: "List prompts" },
  ];

  return (
    <CurationShell
      active="Lists"
      eyebrow="lists"
      title="Curated trails"
      description="Collect repositories and source-backed posts into a trail with a point of view."
      aside={<ListsRail />}
    >
      <div className="border-b border-black/[0.08] px-5 pt-4 dark:border-white/[0.08] sm:px-7">
        <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="List views">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative whitespace-nowrap pb-4 text-sm font-medium transition-colors ${activeTab === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
              {activeTab === tab.value ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#b45e3c]" /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 sm:p-7">
        {activeTab === "your" ? <YourLists /> : null}
        {activeTab === "shared" ? <PublicLists /> : null}
        {activeTab === "discover" ? <ListPrompts /> : null}
      </div>
    </CurationShell>
  );
}

function YourLists() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const lists = useQuery(api.curation.myLists, isAuthenticated ? page : "skip");

  if (authLoading || (isAuthenticated && lists === undefined)) return <CurationLoading label="Loading your lists..." />;
  if (!isAuthenticated) {
    return (
      <CurationEmptyState
        icon={FolderHeart}
        eyebrow="Sign in to save"
        title="Give your next rabbit hole a shape."
        body="Connect GitHub to create public trails or a private notebook."
        action="Connect GitHub"
        actionHref="/signin"
        secondaryAction="Browse repositories"
        secondaryHref="/explore"
      />
    );
  }

  return (
    <div>
      {lists && lists.page.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.page.map((list) => <ListCard key={list._id} list={list} />)}
        </div>
      ) : (
        <CurationEmptyState
          icon={FolderHeart}
          eyebrow="No lists yet"
          title="Give your next rabbit hole a shape."
          body="Start with one repository or source-backed post. A good list has a question behind it."
          action="Browse repositories"
          actionHref="/explore"
        />
      )}
      <div className="mt-5">
        <CreateListForm />
      </div>
    </div>
  );
}

function PublicLists() {
  const lists = useQuery(api.curation.discoverLists, page);
  if (lists === undefined) return <CurationLoading label="Finding public trails..." />;
  if (lists.page.length === 0) {
    return (
      <CurationEmptyState
        icon={BookMarked}
        eyebrow="Public trails"
        title="Be the first useful guide."
        body="Public lists will appear here with their source context and curator attribution."
        action="Create a list"
        actionHref="/lists"
      />
    );
  }
  return (
    <div>
      <CurationStatus title="Public by choice" body="OpenHub keeps list ownership and source attribution visible. Private lists stay out of discovery." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {lists.page.map((list) => <ListCard key={list._id} list={list} />)}
      </div>
    </div>
  );
}

function CreateListForm() {
  const createList = useMutation(api.curation.createList);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createList({ title, description, visibility });
      setTitle("");
      setDescription("");
      setOpen(false);
    } catch {
      setError("The list could not be saved. Sign in again and try once more.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create a list
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]">
      <div className="flex items-center gap-2">
        <Save className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />
        <h2 className="text-sm font-semibold">New reading trail</h2>
      </div>
      <label className="mt-5 block text-xs font-semibold" htmlFor="list-title">Title</label>
      <input id="list-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="mt-2 h-10 w-full rounded-xl border border-black/[0.1] bg-transparent px-3 text-sm outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" placeholder="Read the rendering path" />
      <label className="mt-4 block text-xs font-semibold" htmlFor="list-description">Description</label>
      <textarea id="list-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full resize-y rounded-xl border border-black/[0.1] bg-transparent px-3 py-2 text-sm leading-6 outline-none focus:border-[#b45e3c] dark:border-white/[0.1]" placeholder="What should another developer learn from this trail?" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="list-visibility">
          <span>Visibility</span>
          <select id="list-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="rounded-lg border border-black/[0.1] bg-transparent px-2 py-1.5 text-xs text-foreground dark:border-white/[0.1]">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Saving..." : "Create list"}</Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

function ListCard({ list }: { list: List }) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 transition-colors hover:border-[#b45e3c]/50 dark:border-white/[0.08]">
      <div className="flex items-center justify-between gap-3">
        {list.visibility === "private" ? <LockKeyhole className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" /> : <Globe2 className="h-4 w-4 text-[#b45e3c] dark:text-[#e99970]" />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{list.visibility}</span>
      </div>
      <Link href={`/lists/${list._id}`} className="mt-6 block text-base font-semibold tracking-[-0.02em] hover:text-[#9b4d31] dark:hover:text-[#e99970]">{list.title}</Link>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{list.description || "A source-backed trail through software."}</p>
      <p className="mt-5 text-xs text-muted-foreground">Updated {formatDate(list.updatedAt)} <span className="px-1.5">·</span><Link href={`/lists/${list._id}`} className="font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">Open trail</Link></p>
    </article>
  );
}

function ListPrompts() {
  const prompts = [
    ["Trace the request path", "Collect the files that explain one feature from entry point to output."],
    ["Small projects, clear ideas", "Pair approachable repositories with the source files that make them teachable."],
    ["Compare the tradeoffs", "Keep related implementations together and explain what changes between them."],
  ];
  return (
    <div>
      <div className="rounded-[1.6rem] bg-[#e9e6dc] p-6 dark:bg-[#20251f] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">List prompts</p>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em]">Curate a way into the code.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A good trail gives the next reader a reason to open the next file.</p>
      </div>
      <div className="mt-5 grid gap-3">
        {prompts.map(([title, body]) => (
          <article key={title} className="flex gap-4 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
            <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
            <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ListsRail() {
  return <><CurationRail /><section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">List rules</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Public lists keep attribution and source links. Private lists stay out of feeds, search, and recommendations.</p></section></>;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
