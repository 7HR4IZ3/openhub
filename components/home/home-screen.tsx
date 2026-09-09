"use client";

import { CurationShell } from "@/components/curation/curation-shell";
import { CurationEmptyState } from "@/components/curation/curation-states";
import {
  RecentPostFeed,
  type PostFeedMode,
} from "@/components/posts/recent-post-feed";
import { RecommendationsPanel } from "@/components/discovery/recommendations-panel";
import {
  CodeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";
import { SectionTabs } from "@/components/ui/section-tabs";
import { Button } from "@/components/ui/button";
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
      title="Home"
    >
      <section className="v2-home-search border-b px-5 py-4 sm:px-8">
        <Link
          href="/explore"
          className="flex min-h-11 items-center gap-3 rounded-full border border-input bg-secondary px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          Search repositories, people, or posts
          <span className="ml-auto" aria-hidden="true">
            →
          </span>
        </Link>
      </section>
      <section className="v2-composer-inline px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            aria-hidden="true"
          >
            OH
          </span>
          <Link href="/compose" className="v2-composer-prompt flex flex-1 items-center px-4 text-sm">
            Share an update with the community
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between pl-12">
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Attach an image">
              <Link href="/compose">
                <ImageIcon />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Write code">
              <Link href="/compose">
                <CodeIcon />
              </Link>
            </Button>
          </div>
          <Button asChild size="sm">
            <Link href="/compose">
              <Pencil2Icon />
              Post
            </Link>
          </Button>
        </div>
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
      {convexConfigured ? (
        <SectionTabs
          label="Home feed"
          items={tabs}
          value={mode}
          onChange={setMode}
        >
          <section className="px-5 py-6 sm:px-8">
            <RecentPostFeed convexConfigured mode={mode} />
          </section>
        </SectionTabs>
      ) : (
        <section className="px-5 py-6 sm:px-8">
          <CurationEmptyState
            icon={CodeIcon}
            eyebrow="Feed unavailable"
            title="Start with a repository."
            body="Explore public source while the social feed is offline."
            action="Explore repositories"
            actionHref="/explore"
          />
        </section>
      )}
    </CurationShell>
  );
}
