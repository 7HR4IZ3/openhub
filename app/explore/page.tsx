"use client";

import { OpenHubMark } from "@/components/openhub-mark";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Filter,
  FolderGit2,
  Github,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import type { NormalizedRepository } from "@/lib/providers/types";

const discoveryTracks = [
  { title: "Freshly maintained", body: "Projects with recent releases, commits, and responsive maintainers." },
  { title: "Good to learn from", body: "Readable codebases with documentation and a clear path inward." },
  { title: "Worth a conversation", body: "Repositories surrounded by thoughtful questions, reviews, and ideas." },
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [results, setResults] = useState<NormalizedRepository[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    setSubmittedQuery(normalized || null);
    setResults([]);
    setSearchError(null);

    if (!normalized) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        "/api/github/search?q=" + encodeURIComponent(normalized),
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        items?: NormalizedRepository[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Search could not be completed.");
      }
      setResults(payload.items ?? []);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Search could not be completed right now.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-6 dark:bg-[#111310] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="OpenHub home"><OpenHubMark /></Link>
          <Link href="/signin" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Sign in</Link>
        </header>

        <section className="mt-20 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back home</Link>
          <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#9b4d31] dark:text-[#e99970]"><Compass className="h-4 w-4" /> Explore the discovery map</div>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">The interesting part is usually one layer deeper.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">Search repositories, people, source-backed posts, and the technical conversations that make a project easier to understand.</p>
        </section>

        <form onSubmit={handleSubmit} className="mt-10 flex max-w-2xl gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories, posts, people…" className="h-13 w-full rounded-full border border-black/[0.12] bg-transparent pl-12 pr-5 text-base outline-none transition focus:border-[#b45e3c] dark:border-white/[0.12]" />
          </label>
          <Button type="submit" size="lg" className="h-13 rounded-full px-6" disabled={isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </form>

        {submittedQuery ? (
          <section className="mt-10 max-w-4xl" aria-live="polite">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  GitHub repositories
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                  Results for “{submittedQuery}”
                </h2>
              </div>
              {!isSearching && !searchError ? (
                <span className="text-xs text-muted-foreground">
                  {results.length} {results.length === 1 ? "repository" : "repositories"}
                </span>
              ) : null}
            </div>

            {searchError ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#b45e3c]/50 bg-[#b45e3c]/[0.04] p-5 text-sm">
                <p className="font-semibold">{searchError}</p>
                <p className="mt-2 leading-6 text-muted-foreground">
                  OpenHub keeps provider access on the server and never places
                  repository credentials in the browser.
                </p>
              </div>
            ) : null}

            {!isSearching && !searchError && results.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-black/[0.1] p-6 text-sm text-muted-foreground dark:border-white/[0.1]">
                No public repositories matched this search.
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {results.map((repository) => (
                  <RepositoryResultCard
                    key={repository.providerRepositoryId}
                    repository={repository}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Start with a reason</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Discovery tracks</h2>
            </div>
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {discoveryTracks.map((track, index) => (
              <article key={track.title} className="rounded-2xl border border-black/[0.1] p-6 dark:border-white/[0.1]">
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-14 text-lg font-semibold tracking-[-0.02em]">{track.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{track.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-black/[0.1] bg-black/[0.1] dark:border-white/[0.1] dark:bg-white/[0.1] md:grid-cols-3">
          <DiscoveryStatus icon={TrendingUp} title="Trending repositories" body="Explainable signals instead of a raw star leaderboard." />
          <DiscoveryStatus icon={FolderGit2} title="Repository workspaces" body="Files, commits, issues, and context in one reading surface." />
          <DiscoveryStatus icon={Sparkles} title="Cited explanations" body="Read-only AI that points back to exact source lines." />
        </section>

        <section className="mt-20 flex flex-col gap-5 border-t border-black/[0.1] pt-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.1]">
          <div className="flex items-center gap-3"><Github className="h-4 w-4" /><span>GitHub is the first source. More providers follow the adapter contract.</span></div>
          <Link href="/signin" className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline">Build your trail <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </section>
      </div>
    </main>
  );
}

function RepositoryResultCard({ repository }: { repository: NormalizedRepository }) {
  return (
    <Link
      href={
        "/repos/" +
        encodeURIComponent(repository.ownerLogin) +
        "/" +
        encodeURIComponent(repository.name)
      }
      className="group rounded-2xl border border-black/[0.1] p-5 transition-colors hover:border-[#b45e3c]/60 hover:bg-[#b45e3c]/[0.03] dark:border-white/[0.1] dark:hover:border-[#e99970]/60 dark:hover:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground">
            {repository.fullName}
          </p>
          <h3 className="mt-2 truncate text-lg font-semibold tracking-[-0.025em]">
            {repository.name}
          </h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#9b4d31] dark:group-hover:text-[#e99970]" />
      </div>
      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
        {repository.description ?? "No description provided by the maintainer."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {repository.primaryLanguage ? <span>{repository.primaryLanguage}</span> : null}
        <span className="inline-flex items-center gap-1">
          <StarIcon />
          {formatCount(repository.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitForkIcon />
          {formatCount(repository.forks)}
        </span>
        {repository.licenseSpdxId ? <span>{repository.licenseSpdxId}</span> : null}
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
  return <span aria-hidden="true">★</span>;
}

function GitForkIcon() {
  return <span aria-hidden="true">⑂</span>;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function DiscoveryStatus({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="bg-[#f7f7f4] p-6 dark:bg-[#111310] sm:p-7">
      <Icon className="h-5 w-5 text-[#b45e3c] dark:text-[#e99970]" />
      <h3 className="mt-12 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}
