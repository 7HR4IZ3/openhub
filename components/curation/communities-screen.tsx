"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CurationEmptyState,
  CurationLoading,
  CurationStatus,
} from "@/components/curation/curation-states";
import {
  CurationRail,
  CurationShell,
} from "@/components/curation/curation-shell";
import { SectionTabs } from "@/components/ui/section-tabs";
import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import {
  ArrowTopRightIcon as ArrowUpRight,
  ReaderIcon as BookOpen,
  CodeIcon as Code2,
  GlobeIcon as Compass,
  GlobeIcon as Globe2,
  LockClosedIcon as LockKeyhole,
  PlusIcon as Plus,
  MagnifyingGlassIcon as Search,
  PersonIcon as Users,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const tabs = [
  { value: "discover", label: "Discover" },
  { value: "following", label: "Your circles" },
  { value: "create", label: "Create" },
] as const;

type CommunityTab = (typeof tabs)[number]["value"];

export function CommunitiesScreen({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <CommunitiesSetup />;
  return <ConnectedCommunitiesScreen />;
}

function ConnectedCommunitiesScreen() {
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<CommunityTab>("discover");
  const communities = usePaginatedQuery(
    api.curation.discoverCommunities,
    {},
    { initialNumItems: 20 },
  );

  return (
    <CurationShell
      active="Communities"
      eyebrow="communities"
      title="Technical circles"
      description="Find people who care about the same layer of software. Communities are for context and discussion, not group chat."
      aside={<CommunitiesRail />}
    >
      <SectionTabs
        label="Community views"
        items={tabs}
        value={activeTab}
        onChange={setActiveTab}
      >
        <div className="p-5 sm:p-7">
          {activeTab === "discover" ? (
            <DiscoverCommunities
              communities={communities.results}
              status={communities.status}
              loadMore={communities.loadMore}
              isAuthenticated={isAuthenticated}
            />
          ) : null}
          {activeTab === "following" ? (
            <FollowingCommunities isAuthenticated={isAuthenticated} />
          ) : null}
          {activeTab === "create" ? (
            <CreateCommunity isAuthenticated={isAuthenticated} />
          ) : null}
        </div>
      </SectionTabs>
    </CurationShell>
  );
}

function DiscoverCommunities({
  communities,
  status,
  loadMore,
  isAuthenticated,
}: {
  communities: Array<{
    _id: string;
    name: string;
    description: string;
    visibility: "public" | "private";
  }>;
  status:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted"
    | "Error";
  loadMore: (count: number) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="mt-5">
      {communities.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {communities.map((community) => (
            <CommunityCard
              key={community._id}
              community={community}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : status === "LoadingFirstPage" ? (
        <CurationLoading label="Loading public circles…" />
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-black/[0.14] p-5 dark:border-white/[0.14]">
          <div className="flex items-start gap-3">
            <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">No public communities yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Create the first circle around a repository layer or a learning
                question.
              </p>
            </div>
          </div>
        </div>
      )}
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="mt-5 text-center">
          <Button
            type="button"
            variant="ghost"
            className="rounded-md text-xs"
            onClick={() => loadMore(20)}
            disabled={status === "LoadingMore"}
          >
            {status === "LoadingMore" ? "Loading…" : "Load more circles"}
          </Button>
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <CommunityIdea
          icon={Code2}
          title="Frontend architecture"
          body="Trace rendering, state, and interaction patterns in public code."
        />
        <CommunityIdea
          icon={BookOpen}
          title="Open source learning"
          body="Share approachable entry points for people reading a codebase for the first time."
        />
        <CommunityIdea
          icon={Compass}
          title="Systems in the wild"
          body="Compare the tradeoffs behind runtimes, tools, and infrastructure."
        />
      </div>
    </div>
  );
}

function CommunityCard({
  community,
  isAuthenticated,
}: {
  community: {
    _id: string;
    name: string;
    description: string;
    visibility: "public" | "private";
  };
  isAuthenticated: boolean;
}) {
  const join = useMutation(api.curation.joinCommunity);
  const leave = useMutation(api.curation.leaveCommunity);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!isAuthenticated || pending) return;
    setPending(true);
    try {
      if (joined)
        await leave({ communityId: community._id as Id<"communities"> });
      else await join({ communityId: community._id as Id<"communities"> });
      setJoined((value) => !value);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <Users className="h-5 w-5 text-foreground" />
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Globe2 className="h-3 w-3" /> Public
        </span>
      </div>
      <Link
        href={`/communities/${community._id}`}
        className="mt-6 block text-base font-semibold tracking-[-0.02em] hover:underline"
      >
        {community.name}
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {community.description ||
          "A technical circle for source-backed discussion."}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant={joined ? "secondary" : "outline"}
          size="sm"
          className="rounded-md"
          onClick={() => void toggle()}
          disabled={!isAuthenticated || pending}
        >
          {!isAuthenticated
            ? "Sign in to join"
            : pending
              ? "Saving…"
              : joined
                ? "Joined"
                : "Join circle"}
        </Button>
        <Link
          href={`/communities/${community._id}`}
          className="text-xs font-semibold text-foreground hover:underline"
        >
          Open circle
        </Link>
      </div>
    </article>
  );
}

function FollowingCommunities({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated)
    return (
      <CurationEmptyState
        className="mt-5"
        icon={Users}
        eyebrow="Your circles"
        title="Sign in to follow a community."
        body="Joined public circles and private invitations will stay in your personal trail."
        action="Connect GitHub"
        actionHref="/signin"
        secondaryAction="Discover communities"
        secondaryHref="/communities"
      />
    );
  return <ConnectedFollowingCommunities />;
}

function ConnectedFollowingCommunities() {
  const communities = usePaginatedQuery(
    api.curation.myCommunities,
    {},
    { initialNumItems: 20 },
  );
  return (
    <div className="mt-5">
      {communities.results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {communities.results.map((row) => (
            <Link
              key={row._id}
              href={`/communities/${row._id}`}
              className="rounded-xl border border-border p-5 transition-colors hover:border-ring"
            >
              <p className="text-sm font-semibold">{row.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your membership is active. Community posts will stay
                source-linked.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                Open circle <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      ) : communities.status === "LoadingFirstPage" ? (
        <CurationLoading label="Loading your circles…" />
      ) : (
        <CurationEmptyState
          icon={Users}
          eyebrow="Your circles"
          title="Follow a community when you find a layer worth staying with."
          body="Your joined public communities and private invitations will appear here. Membership and private discussions will never be exposed through public discovery."
          action="Discover communities"
          actionHref="/communities"
          secondaryAction="Browse repositories"
          secondaryHref="/explore"
        />
      )}
      {communities.status === "CanLoadMore" ||
      communities.status === "LoadingMore" ? (
        <div className="mt-5 text-center">
          <Button
            type="button"
            variant="ghost"
            className="rounded-md text-xs"
            onClick={() => communities.loadMore(20)}
            disabled={communities.status === "LoadingMore"}
          >
            {communities.status === "LoadingMore"
              ? "Loading…"
              : "Load more circles"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CreateCommunity({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated)
    return (
      <CurationEmptyState
        className="mt-5"
        icon={Plus}
        eyebrow="Create a circle"
        title="Sign in to give a technical question a home."
        body="Set a clear topic, write lightweight rules, and keep the source close. Community ownership includes moderation responsibility."
        action="Connect GitHub"
        actionHref="/signin"
        secondaryAction="Read the principles"
        secondaryHref="/product"
      />
    );
  return <CreateCommunityForm />;
}

function CreateCommunityForm() {
  const createCommunity = useMutation(api.curation.createCommunity);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCommunity({ name, description, visibility });
      setCreated(true);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "The community could not be created",
      );
      setSaving(false);
    }
  }

  if (created)
    return (
      <CurationEmptyState
        className="mt-5"
        icon={Users}
        eyebrow="Circle created"
        title="Your community is ready for careful discussion."
        body="Invite people through the community link once you have written the first source-linked prompt."
        action="Discover circles"
        actionHref="/communities"
        secondaryAction="Explore repositories"
        secondaryHref="/explore"
      />
    );
  return (
    <form
      onSubmit={submit}
      className="mt-5 rounded-xl border border-border bg-background p-4 dark:bg-background sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Community name"
          maxLength={120}
          required
          autoFocus
        />
        <select
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value as "public" | "private")
          }
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="public">Public circle</option>
          <option value="private">Private circle</option>
        </select>
      </div>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What technical curiosity belongs here?"
        maxLength={2000}
        rows={4}
        className="mt-3 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          className="rounded-md"
          disabled={saving || !name.trim()}
        >
          {saving ? "Creating…" : "Create community"}
        </Button>
      </div>
    </form>
  );
}

function CommunityIdea({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Code2;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-xl border border-border p-5">
      <Icon className="h-5 w-5 text-foreground" />
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link
        href="/explore"
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
      >
        Find repositories <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function CommunitiesSetup() {
  return (
    <CurationShell
      active="Communities"
      eyebrow="communities"
      title="Technical circles"
      description="Find people who care about the same layer of software."
      aside={<CommunitiesRail />}
    >
      <div className="p-5 sm:p-7">
        <CurationStatus
          tone="accent"
          title="Connect Convex to create communities"
          body="Public browsing stays available. Membership and moderation require the connected backend."
        />
        <CurationEmptyState
          className="mt-5"
          icon={Users}
          eyebrow="Build a circle"
          title="Give a technical question a home."
          body="Browse repositories now, then connect GitHub when you are ready to create a moderated space for source-backed discussion."
          action="Browse repositories"
          actionHref="/explore"
          secondaryAction="Connect GitHub"
          secondaryHref="/signin"
        />
      </div>
    </CurationShell>
  );
}

function CommunitiesRail() {
  return (
    <>
      <CurationRail />
      <section className="rounded-xl border border-border p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Community promise
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Every circle should make it easier to understand a real repository.
          Moderators can keep promotion, harassment, and low-context noise out.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" />
          Private means private.
        </div>
      </section>
    </>
  );
}
