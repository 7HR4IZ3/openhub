"use client";

import {
  CurationShell,
  CurationRail,
} from "@/components/curation/curation-shell";
import { CurationEmptyState } from "@/components/curation/curation-states";
import {
  RecentPostFeed,
  type PostFeedMode,
} from "@/components/posts/recent-post-feed";
import { RecommendationsPanel } from "@/components/discovery/recommendations-panel";
import { MagnifyingGlassIcon, CodeIcon } from "@radix-ui/react-icons";
import { SectionTabs } from "@/components/ui/section-tabs";
import Link from "next/link";
import { useState } from "react";

const tabs = [
  { label: "For you", value: "recent" },
  { label: "Following", value: "following" },
  { label: "Trending", value: "trending" },
] as const;
export function HomeScreen({
  convexConfigured = false,
}: {
  convexConfigured?: boolean;
}) {
  const [mode, setMode] = useState<PostFeedMode>("recent");
  return (
    <CurationShell
      active="Home"
      eyebrow="home"
      title="Discover"
      aside={<CurationRail />}
    >
      <section className="border-b px-5 py-4 sm:px-8">
        <Link
          href="/explore"
          className="flex min-h-11 items-center gap-3 rounded-md border border-input px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          Search repositories, people, or posts
          <span className="ml-auto" aria-hidden="true">
            →
          </span>
        </Link>
      </section>
      {convexConfigured ? (
        <section className="border-b px-5 py-4 sm:px-8">
          <details>
            <summary className="cursor-pointer py-2 text-sm font-medium">
              Recommended repositories
            </summary>
            <div className="pt-4">
              <RecommendationsPanel convexConfigured />
            </div>
          </details>
        </section>
      ) : null}
      <SectionTabs
        label="Home feed"
        items={tabs}
        value={mode}
        onChange={setMode}
      >
        <section className="px-5 py-6 sm:px-8">
          {convexConfigured ? (
            <RecentPostFeed convexConfigured mode={mode} />
          ) : (
            <CurationEmptyState
              icon={CodeIcon}
              eyebrow="Public browsing is open"
              title="Start with a repository."
              body="The social feed is unavailable right now. You can still explore public repositories and read their source."
              action="Explore repositories"
              actionHref="/explore"
            />
          )}
        </section>
      </SectionTabs>
    </CurationShell>
  );
}
