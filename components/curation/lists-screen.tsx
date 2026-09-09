"use client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CurationErrorBoundary,
  CurationErrorState,
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import { CurationShell } from "@/components/curation/curation-shell";
import { SectionTabs } from "@/components/ui/section-tabs";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  GlobeIcon as Compass,
  BookmarkIcon as FolderHeart,
  GlobeIcon as Globe2,
  LockClosedIcon as LockKeyhole,
  PlusIcon as Plus,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const tabs = [
  { value: "your", label: "Your lists" },
  { value: "discover", label: "Discover" },
] as const;

type ListTab = (typeof tabs)[number]["value"];

export function ListsScreen({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <ListsSetup />;
  return (
    <CurationErrorBoundary
      fallback={(reset) => (
        <CurationShell active="Lists" eyebrow="lists" title="Curated trails">
          <div className="p-5 sm:p-7">
            <CurationErrorState
              title="Lists could not load."
              body="Try again to reconnect your saved trails."
              onRetry={reset}
            />
          </div>
        </CurationShell>
      )}
    >
      <ConnectedListsScreen />
    </CurationErrorBoundary>
  );
}

function ConnectedListsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<ListTab>("your");
  const discovered = usePaginatedQuery(
    api.curation.discoverLists,
    {},
    { initialNumItems: 20 },
  );

  return (
    <CurationShell
      active="Lists"
      eyebrow="lists"
      title="Curated trails"
      description="Collect repositories, people, posts, and source references into a list with a point of view."
    >
      <SectionTabs
        label="List views"
        items={tabs}
        value={activeTab}
        onChange={setActiveTab}
      >
        <div className="p-5 sm:p-7">
          {activeTab === "your" ? (
            <YourLists isAuthenticated={isAuthenticated} />
          ) : null}
          {activeTab === "discover" ? (
            <DiscoverLists
              lists={discovered.results}
              status={discovered.status}
              loadMore={discovered.loadMore}
            />
          ) : null}
        </div>
      </SectionTabs>
    </CurationShell>
  );
}

function YourLists({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <CurationEmptyState
        className="mt-5"
        icon={FolderHeart}
        eyebrow="Your lists are private"
        title="Sign in to start a trail."
        body="Create public reading paths or private notebooks without exposing your saved context to anyone else."
        action="Connect GitHub"
        actionHref="/signin"
        secondaryAction="Browse repositories"
        secondaryHref="/explore"
      />
    );
  }

  return <ConnectedYourLists />;
}

function ConnectedYourLists() {
  const lists = usePaginatedQuery(
    api.curation.myLists,
    {},
    { initialNumItems: 20 },
  );
  const [creating, setCreating] = useState(false);

  return (
    <div className="mt-5">
      {lists.results.length === 0 && lists.status === "LoadingFirstPage" ? (
        <CurationLoading label="Loading your lists…" />
      ) : null}
      {lists.status.toString() === "Error" ? (
        <CurationErrorState
          title="Your lists could not load."
          body="Try again to reconnect your private trail."
        />
      ) : null}
      {lists.results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.results.map((list) => (
            <ListCard key={list._id} list={list} />
          ))}
        </div>
      ) : lists.status !== "LoadingFirstPage" && lists.status.toString() !== "Error" ? (
        <CurationEmptyState
          icon={FolderHeart}
          eyebrow="No lists yet"
          title="Give your next rabbit hole a shape."
          body="Start with one repository or source-backed post. A good list has a question behind it—what are you trying to understand, compare, or return to?"
          action="Browse repositories"
          actionHref="/explore"
        />
      ) : null}
      {lists.status === "CanLoadMore" || lists.status === "LoadingMore" ? (
        <LoadMoreButton
          status={lists.status}
          onClick={() => lists.loadMore(20)}
          label="Load older lists"
        />
      ) : null}

      <section
        className="mt-7 border-t border-border pt-6"
        aria-labelledby="new-list-heading"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              id="new-list-heading"
              className="mt-2 text-xl font-semibold tracking-[-0.035em]"
            >
              New list
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-md"
            aria-label="Create a list"
            onClick={() => setCreating((value) => !value)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {creating ? (
          <CreateListForm onCreated={() => setCreating(false)} />
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ListVisibilityCard
              icon={Globe2}
              title="Public trail"
              body="Share a path through repositories."
            />
            <ListVisibilityCard
              icon={LockKeyhole}
              title="Private notebook"
              body="Keep a private queue of source and questions."
              privateList
            />
          </div>
        )}
      </section>
    </div>
  );
}

function CreateListForm({ onCreated }: { onCreated: () => void }) {
  const createList = useMutation(api.curation.createList);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createList({ title, description, visibility });
      onCreated();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "The list could not be created",
      );
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 rounded-xl border border-border bg-background p-4 dark:bg-background sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <label className="block min-w-0 space-y-2 text-sm font-medium">
          <span>List title</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="List title"
            maxLength={120}
            required
            autoFocus
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Visibility</span>
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as "public" | "private")
            }
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="public">Public trail</option>
            <option value="private">Private notebook</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this trail trying to help someone understand?"
          maxLength={2000}
          rows={3}
          className="mt-3 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-md"
          onClick={onCreated}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="rounded-md"
          disabled={saving || !title.trim()}
        >
          {saving ? "Creating…" : "Create list"}
        </Button>
      </div>
    </form>
  );
}

function DiscoverLists({
  lists,
  status,
  loadMore,
}: {
  lists: Array<{
    _id: string;
    title: string;
    description: string;
    visibility: "public" | "private";
    updatedAt: number;
  }>;
  status:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted"
    | "Error";
  loadMore: (count: number) => void;
}) {
  return (
    <div>
      {lists.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <ListCard key={list._id} list={list} />
          ))}
        </div>
      ) : status === "LoadingFirstPage" ? (
        <CurationLoading label="Loading public trails…" />
      ) : status.toString() === "Error" ? (
        <CurationErrorState
          title="Public trails could not load."
          body="Try again to refresh discovery."
        />
      ) : (
        <div className="rounded-xl border border-dashed border-black/[0.14] p-5 dark:border-white/[0.14]">
          <div className="flex items-start gap-3">
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">No public trails yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Be the first person to give a repository rabbit hole a useful
                shape.
              </p>
            </div>
          </div>
        </div>
      )}
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <LoadMoreButton
          status={status}
          onClick={() => loadMore(20)}
          label="Load more public trails"
        />
      ) : null}
    </div>
  );
}

function ListCard({
  list,
}: {
  list: {
    _id: string;
    title: string;
    description: string;
    visibility: "public" | "private";
    updatedAt: number;
  };
}) {
  return (
    <Link
      href={`/lists/${list._id}`}
      className="group rounded-xl border border-border p-4 transition-colors hover:border-ring"
    >
      <div className="flex items-center justify-between gap-3">
        <FolderHeart className="h-5 w-5 text-foreground" />
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {list.visibility === "public" ? (
            <Globe2 className="h-3 w-3" />
          ) : (
            <LockKeyhole className="h-3 w-3" />
          )}
          {list.visibility}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] group-hover:underline">
        {list.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
        {list.description || "A source trail through software."}
      </p>
      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-foreground">
        Open <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function LoadMoreButton({
  status,
  onClick,
  label,
}: {
  status: "CanLoadMore" | "LoadingMore";
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="mt-5 text-center">
      <Button
        type="button"
        variant="ghost"
        className="rounded-md text-xs"
        onClick={onClick}
        disabled={status === "LoadingMore"}
      >
        {status === "LoadingMore" ? "Loading…" : label}
      </Button>
    </div>
  );
}

function ListsSetup() {
  return (
    <CurationShell
      active="Lists"
      eyebrow="lists"
      title="Curated trails"
    >
      <div className="p-5 sm:p-7">
        <CurationEmptyState
          icon={FolderHeart}
          eyebrow="Unavailable"
          title="Connect to save lists."
          body="Browse public repositories now, then save a trail after sign-in."
          action="Connect GitHub"
          actionHref="/signin"
          secondaryAction="Browse"
          secondaryHref="/explore"
        />
      </div>
    </CurationShell>
  );
}

function ListVisibilityCard({
  icon: Icon,
  title,
  body,
  privateList = false,
}: {
  icon: typeof Globe2;
  title: string;
  body: string;
  privateList?: boolean;
}) {
  return (
    <article className="rounded-lg bg-secondary/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-foreground" />
        <span className="rounded-md bg-background/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {privateList ? "Only you" : "Public by choice"}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{body}</p>
    </article>
  );
}
