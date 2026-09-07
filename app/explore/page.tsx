"use client";

import { CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";
import {
  ArrowTopRightIcon as ArrowUpRight,
  MagnifyingGlassIcon as Search,
  StarIcon as Star,
  Share2Icon as Fork,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { NormalizedRepository } from "@/lib/providers/types";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [results, setResults] = useState<NormalizedRepository[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  useEffect(() => () => request.current?.abort(), []);

  async function search(value: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const normalized = value.trim();
    setSubmittedQuery(normalized || null);
    setResults([]);
    setSearchError(null);
    setIsSearching(Boolean(normalized));
    if (!normalized) return;
    try {
      const response = await fetch(
        "/api/repositories/search?q=" + encodeURIComponent(normalized),
        { cache: "no-store", signal: controller.signal },
      );
      const payload = (await response.json()) as {
        items?: NormalizedRepository[];
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message ?? "Search could not be completed.");
      if (!controller.signal.aborted) setResults(payload.items ?? []);
    } catch (error) {
      if (!controller.signal.aborted)
        setSearchError(
          error instanceof Error
            ? error.message
            : "Search could not be completed right now.",
        );
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  return (
    <CurationShell active="Explore" eyebrow="explore" title="Explore">
      <section className="v2-explore-search border-b px-5 py-4 sm:px-8">
        <form onSubmit={handleSubmit} role="search">
          <label htmlFor="repository-search" className="sr-only">
            Search OpenHub
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="repository-search"
                name="q"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Repository, topic, or language"
                className="h-12 w-full rounded-full border border-input bg-secondary pl-10 pr-3 text-base"
              />
            </div>
            <Button
              type="submit"
              className="h-12 px-4"
              disabled={isSearching}
              aria-label={isSearching ? "Searching" : "Search"}
            >
              <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">
                {isSearching ? "Searching…" : "Search"}
              </span>
            </Button>
          </div>
        </form>
      </section>
      <section
        className="px-5 py-6 sm:px-8"
        aria-live="polite"
        aria-busy={isSearching}
      >
        {submittedQuery ? (
          <>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="min-w-0 break-words text-lg font-semibold">
                Results for “{submittedQuery}”
              </h2>
              {!isSearching && !searchError ? (
                <span className="text-xs text-muted-foreground">
                  {results.length} repositories
                </span>
              ) : null}
            </div>
            {isSearching ? (
              <div role="status">
                <span className="sr-only">Searching repositories</span>
                <div aria-hidden="true" className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="space-y-3 rounded-lg border p-5 motion-safe:animate-pulse"
                    >
                      <div className="h-4 w-2/5 rounded bg-muted" />
                      <div className="h-3 w-4/5 rounded bg-muted" />
                      <div className="h-3 w-3/5 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {searchError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 p-5"
              >
                <h3 className="font-medium">Search is unavailable</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchError}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => void search(submittedQuery)}
                >
                  Try again
                </Button>
              </div>
            ) : null}
            {!isSearching && !searchError && results.length === 0 ? (
              <p className="rounded-lg border p-6 text-sm text-muted-foreground">
                No public repositories matched. Try a shorter name or a
                different topic.
              </p>
            ) : null}
            <div className="space-y-3">
              {results.map((repository) => (
                <RepositoryResultCard
                  key={
                    repository.provider + ":" + repository.providerRepositoryId
                  }
                  repository={repository}
                />
              ))}
            </div>
            <OpenHubSearchResults
              key={submittedQuery}
              query={submittedQuery}
              convexConfigured={convexConfigured}
            />
          </>
        ) : (
          <div className="py-8">
            <p className="text-sm text-muted-foreground">
              Search by project, language, or topic.
            </p>
          </div>
        )}
      </section>
    </CurationShell>
  );
}

function OpenHubSearchResults({
  query,
  convexConfigured,
}: {
  query: string;
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return null;
  return <ConnectedOpenHubSearchResults query={query} />;
}

function ConnectedOpenHubSearchResults({ query }: { query: string }) {
  const results = useQuery(api.search.all, { query, limit: 8 }) as
    | {
        people: Array<{
          _id: string;
          handle: string;
          displayName: string;
          bio: string | null;
        }>;
        posts: Array<{
          _id: string;
          type: string;
          body: string;
          authorHandle: string;
          authorName: string;
          createdAt: number;
        }>;
        lists: Array<{
          _id: string;
          title: string;
          description: string;
          visibility: string;
        }>;
        communities: Array<{
          _id: string;
          title: string;
          description: string;
          visibility: string;
        }>;
      }
    | undefined;
  if (results === undefined)
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Searching OpenHub conversations and people…
      </p>
    );
  if (
    results.people.length === 0 &&
    results.posts.length === 0 &&
    results.lists.length === 0 &&
    results.communities.length === 0
  )
    return null;

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {results.people.length > 0 ? (
        <section aria-labelledby="people-results-heading">
          <p
            id="people-results-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            People
          </p>
          <div className="mt-3 space-y-2">
            {results.people.map((person) => (
              <Link
                key={person._id}
                href={`/profile/${encodeURIComponent(person.handle)}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:border-ring"
              >
                <p className="font-semibold">{person.displayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  @{person.handle}
                </p>
                {person.bio ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {person.bio}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {results.posts.length > 0 ? (
        <section aria-labelledby="post-results-heading">
          <p
            id="post-results-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            OpenHub posts
          </p>
          <div className="mt-3 space-y-2">
            {results.posts.map((post) => (
              <Link
                key={post._id}
                href={`/posts/${post._id}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:border-ring"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{post.authorName}</span>
                  <span className="text-muted-foreground">
                    @{post.authorHandle}
                  </span>
                  <span className="text-muted-foreground">· {post.type}</span>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6">
                  {post.body}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {results.lists.length > 0 ? (
        <section aria-labelledby="list-results-heading">
          <p
            id="list-results-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Public trails
          </p>
          <div className="mt-3 space-y-2">
            {results.lists.map((list) => (
              <Link
                key={list._id}
                href={`/lists/${list._id}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:border-ring"
              >
                <p className="font-semibold">{list.title}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {list.description || "A curated trail through software."}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {results.communities.length > 0 ? (
        <section aria-labelledby="community-results-heading">
          <p
            id="community-results-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Communities
          </p>
          <div className="mt-3 space-y-2">
            {results.communities.map((community) => (
              <Link
                key={community._id}
                href={`/communities/${community._id}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:border-ring"
              >
                <p className="font-semibold">{community.title}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {community.description ||
                    "A technical circle for source-backed discussion."}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RepositoryResultCard({
  repository,
}: {
  repository: NormalizedRepository;
}) {
  return (
    <Link
      href={
        repository.provider === "github"
          ? "/repos/" +
            encodeURIComponent(repository.ownerLogin) +
            "/" +
            encodeURIComponent(repository.name)
          : "/repos/" +
            encodeURIComponent(repository.provider) +
            "/" +
            encodeURIComponent(repository.ownerLogin) +
            "/" +
            encodeURIComponent(repository.name)
      }
      className="group block rounded-xl border border-border p-5 transition-colors hover:border-ring hover:bg-accent dark:hover:border-ring dark:hover:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground">
            {repository.provider} · {repository.fullName}
          </p>
          <h3 className="mt-2 truncate text-lg font-semibold tracking-[-0.025em]">
            {repository.name}
          </h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground dark:group-hover:text-foreground" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
        {repository.description ?? "No description provided by the maintainer."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {repository.primaryLanguage ? (
          <span>{repository.primaryLanguage}</span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <StarIcon />
          {formatCount(repository.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitForkIcon />
          {formatCount(repository.forks)}
        </span>
        {repository.licenseSpdxId ? (
          <span>{repository.licenseSpdxId}</span>
        ) : null}
      </div>
      {repository.topics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {repository.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-black/[0.05] px-2 py-1 text-[11px] text-muted-foreground dark:bg-white/[0.07]"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

function StarIcon() {
  return <Star aria-hidden="true" />;
}

function GitForkIcon() {
  return <Fork aria-hidden="true" />;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
