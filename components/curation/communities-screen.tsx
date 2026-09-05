"use client";

import { Button } from "@/components/ui/button";
import { CurationEmptyState, CurationStatus } from "@/components/curation/curation-states";
import { CurationRail, CurationShell } from "@/components/curation/curation-shell";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  Globe2,
  LockKeyhole,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const tabs = [
  { value: "discover", label: "Discover" },
  { value: "following", label: "Your circles" },
  { value: "create", label: "Create" },
] as const;

type CommunityTab = (typeof tabs)[number]["value"];

export function CommunitiesScreen({ convexConfigured }: { convexConfigured: boolean }) {
  const [activeTab, setActiveTab] = useState<CommunityTab>("discover");

  return (
    <CurationShell
      active="Communities"
      eyebrow="communities"
      title="Technical circles"
      description="Find people who care about the same layer of software. Communities are for context and discussion, not group chat."
      aside={<CommunitiesRail />}
    >
      <div className="border-b border-black/[0.08] px-5 pt-4 dark:border-white/[0.08] sm:px-7">
        <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Community views">
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
        {!convexConfigured ? (
          <CurationStatus
            title="Community discovery is intentionally quiet"
            body="Public community reads and creation actions will connect through Convex. No unauthenticated community can be created from this screen."
          />
        ) : null}
        {activeTab === "discover" ? <DiscoverCommunities /> : null}
        {activeTab === "following" ? <FollowingCommunities /> : null}
        {activeTab === "create" ? <CreateCommunity /> : null}
      </div>
    </CurationShell>
  );
}

function DiscoverCommunities() {
  return (
    <div className="mt-5">
      <div className="flex flex-col gap-4 rounded-[1.6rem] bg-[#e9e6dc] p-6 dark:bg-[#20251f] sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">Browse by layer</p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em]">A place to ask better questions.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Communities will collect repositories, source references, and discussions around a shared technical curiosity.</p>
        </div>
        <Button asChild variant="outline" className="shrink-0 rounded-full bg-transparent">
          <Link href="/explore">
            Browse source <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CommunityIdea icon={Code2} title="Frontend architecture" body="Trace rendering, state, and interaction patterns in public code." />
        <CommunityIdea icon={BookOpen} title="Open source learning" body="Share approachable entry points for people reading a codebase for the first time." />
        <CommunityIdea icon={Compass} title="Systems in the wild" body="Compare the tradeoffs behind runtimes, tools, and infrastructure." />
      </div>
      <div className="mt-5 rounded-2xl border border-dashed border-black/[0.14] p-5 dark:border-white/[0.14]">
        <div className="flex items-start gap-3">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">No public communities indexed yet</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">These are the starting shapes. Once the directory is connected, search will surface real public circles with their rules, moderators, and source trails.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowingCommunities() {
  return (
    <CurationEmptyState
      className="mt-5"
      icon={Users}
      eyebrow="Your circles"
      title="Follow a community when you find a layer worth staying with."
      body="Your joined public communities and private invitations will appear here. Membership and private discussions will never be exposed through public discovery."
      action="Discover communities"
      actionHref="/communities"
      secondaryAction="Browse repositories"
      secondaryHref="/explore"
    />
  );
}

function CreateCommunity() {
  return (
    <div className="mt-5">
      <CurationEmptyState
        icon={Plus}
        eyebrow="Create a circle"
        title="Give a technical question a home."
        body="Set a clear topic, write lightweight rules, and keep the source close. Community creation will require a connected GitHub identity and a moderation owner."
        action="Connect to create"
        actionHref="/signin"
        secondaryAction="Read the principles"
        secondaryHref="/product"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <CommunityVisibilityCard icon={Globe2} title="Public circle" body="Anyone can discover the topic, read the rules, and join the conversation." />
        <CommunityVisibilityCard icon={LockKeyhole} title="Private circle" body="Invite-only context for a team or study group; it stays out of public search and feeds." privateCommunity />
      </div>
    </div>
  );
}

function CommunityIdea({ icon: Icon, title, body }: { icon: typeof Code2; title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link href="/explore" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#9b4d31] hover:underline dark:text-[#e99970]">
        Find repositories <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function CommunityVisibilityCard({
  icon: Icon,
  title,
  body,
  privateCommunity = false,
}: {
  icon: typeof Globe2;
  title: string;
  body: string;
  privateCommunity?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
        <span className="rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:border-white/[0.1]">
          {privateCommunity ? "Invite only" : "Discoverable"}
        </span>
      </div>
      <h3 className="mt-6 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <Button asChild variant="outline" className="mt-5 rounded-full">
        <Link href="/signin">Connect to start</Link>
      </Button>
    </article>
  );
}

function CommunitiesRail() {
  return (
    <>
      <CurationRail />
      <section className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.08]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Community promise</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Every circle should make it easier to understand a real repository. Moderators can keep promotion, harassment, and low-context noise out.</p>
      </section>
    </>
  );
}
