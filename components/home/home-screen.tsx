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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRef, useState } from "react";

const tabs = [
  { label: "For you", mode: "recent" },
  { label: "Following", mode: "following" },
  { label: "Trending", mode: "trending" },
] as const;
export function HomeScreen({
  convexConfigured = false,
}: {
  convexConfigured?: boolean;
}) {
  const [mode, setMode] = useState<PostFeedMode>("recent");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <CurationShell
      active="Home"
      eyebrow="home"
      title="Discover"
      aside={
        <>
          {convexConfigured ? <RecommendationsPanel convexConfigured /> : null}
          <CurationRail />
        </>
      }
    >
      <section className="page-section">
        <h2 className="editorial-title max-w-xl text-3xl sm:text-4xl">
          Good software rewards curiosity.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Discover repositories and the conversations behind their code.
        </p>
        <Link
          href="/explore"
          className="mt-5 flex min-h-12 items-center gap-3 rounded-md border border-input px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          Search repositories, people, and posts
          <span className="ml-auto" aria-hidden="true">
            →
          </span>
        </Link>
      </section>
      <div
        className="flex gap-6 border-b px-5 sm:px-8"
        role="tablist"
        aria-label="Home feed"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.mode}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            id={`feed-tab-${tab.mode}`}
            role="tab"
            aria-selected={mode === tab.mode}
            aria-controls="feed-panel"
            tabIndex={mode === tab.mode ? 0 : -1}
            onClick={() => setMode(tab.mode)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setMode(tabs[next].mode);
                tabRefs.current[next]?.focus();
              }
            }}
            className={cn(
              "min-h-14 border-b-2 border-transparent text-sm text-muted-foreground transition-colors hover:text-foreground",
              mode === tab.mode &&
                "border-foreground font-semibold text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section
        id="feed-panel"
        role="tabpanel"
        aria-labelledby={`feed-tab-${mode}`}
        tabIndex={0}
        className="px-5 py-6 sm:px-8"
      >
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
    </CurationShell>
  );
}
