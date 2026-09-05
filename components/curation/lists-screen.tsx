"use client";

import { Button } from "@/components/ui/button";
import { CurationEmptyState, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BookMarked,
  Compass,
  FolderHeart,
  Globe2,
  LockKeyhole,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const tabs = [
  { value: "your", label: "Your lists" },
  { value: "shared", label: "Shared with you" },
  { value: "discover", label: "Discover" },
] as const;

type ListTab = (typeof tabs)[number]["value"];

export function ListsScreen({ convexConfigured }: { convexConfigured: boolean }) {
  const [activeTab, setActiveTab] = useState<ListTab>("your");

  return (
    <CurationShell
      active="Lists"
      eyebrow="lists"
      title="Curated trails"
      description="Collect repositories, people, posts, and source references into a list with a point of view."
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
              className={cn(
                "relative whitespace-nowrap pb-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                activeTab === tab.value && "text-foreground",
              )}
            >
              {tab.label}
              {activeTab === tab.value ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#b45e3c]" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {(
          <CurationStatus
            title="Lists are a design preview"
            body={convexConfigured ? "List storage, sharing, and creation are not implemented yet." : "List storage, sharing, and creation are not implemented yet. The backend is also not connected."}
          />
        )}
        {activeTab === "your" ? <YourLists /> : null}
        {activeTab === "shared" ? <SharedLists /> : null}
        {activeTab === "discover" ? <DiscoverLists /> : null}
      </div>
    </CurationShell>
  );
}

function YourLists() {
  return (
    <div>
      <CurationEmptyState
        className="mt-5"
        icon={FolderHeart}
        eyebrow="No lists yet"
        title="Give your next rabbit hole a shape."
        body="Start with one repository or source-backed post. A good list has a question behind it—what are you trying to understand, compare, or return to?"
        action="Browse repositories"
        actionHref="/explore"
        secondaryAction="Connect GitHub"
        secondaryHref="/signin"
      />
      <section className="mt-5" aria-labelledby="new-list-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start intentionally</p>
            <h2 id="new-list-heading" className="mt-2 text-xl font-semibold tracking-[-0.035em]">Choose a list shape</h2>
          </div>
          <Plus className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ListVisibilityCard
            icon={Globe2}
            title="Public trail"
            body="Share a useful path through repositories and help someone else start learning."
            action="Connect to create"
          />
          <ListVisibilityCard
            icon={LockKeyhole}
            title="Private notebook"
            body="Keep a personal queue of code, questions, and references while you work through them."
            action="Connect to create"
            privateList
          />
        </div>
      </section>
    </div>
  );
}

function SharedLists() {
  return (
    <CurationEmptyState
      className="mt-5"
      icon={BookMarked}
      eyebrow="Shared lists"
      title="Nothing has been shared with you."
      body="When someone sends you a public trail or invites you to a private one, it will appear here. Private list membership will never leak into public discovery."
      action="Explore public trails"
      actionHref="/explore"
    />
  );
}

function DiscoverLists() {
  const ideas = [
    { title: "Read the rendering path", body: "Trace a feature from the public API to the implementation and its tests.", icon: Compass },
    { title: "Small projects, clear ideas", body: "Collect approachable repositories where the architecture fits in your head.", icon: Sparkles },
    { title: "Maintainer context", body: "Pair source with discussions, release notes, and the people explaining the tradeoffs.", icon: BookMarked },
  ];

  return (
    <div className="mt-5">
      <div className="rounded-[1.6rem] bg-[#e9e6dc] p-6 dark:bg-[#20251f] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">List prompts</p>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em]">Curate a way into the code.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          OpenHub lists are meant to make browsing more generous: fewer project pitches, more useful paths for the next reader.
        </p>
      </div>
      <div className="mt-5 grid gap-3">
        {ideas.map((idea) => (
          <article key={idea.title} className="flex gap-4 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
            <idea.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{idea.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{idea.body}</p>
              <Link href="/explore" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
                Find source material <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ListVisibilityCard({
  icon: Icon,
  title,
  body,
  action,
  privateList = false,
}: {
  icon: typeof Globe2;
  title: string;
  body: string;
  action: string;
  privateList?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
        <span className="rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:border-white/[0.1]">
          {privateList ? "Only you" : "Public by choice"}
        </span>
      </div>
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Button asChild variant="outline" className="mt-5 rounded-full">
        <Link href="/signin">{action}</Link>
      </Button>
    </article>
  );
}

function ListsRail() {
  return (
    <>
      <CurationRail />
      <section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">List rules</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Public lists keep attribution and source links. Private lists stay out of feeds, search, and recommendations.</p>
      </section>
    </>
  );
}
