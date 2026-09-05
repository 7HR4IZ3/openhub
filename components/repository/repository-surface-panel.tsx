"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitFork,
  GitPullRequest,
  Globe2,
  History,
  Info,
  PackageOpen,
  Tag,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  NormalizedRepository,
  RepositoryCommit,
  RepositoryContributor,
  RepositoryIssue,
  RepositoryPullRequest,
  RepositoryRef,
  RepositoryRelease,
  RepositorySurfaces,
} from "@/lib/providers/types";

type SurfaceId =
  | "overview"
  | "commits"
  | "issues"
  | "pullRequests"
  | "releases"
  | "contributors";

const surfaceTabs: Array<{
  id: SurfaceId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "commits", label: "Commits", icon: GitCommit },
  { id: "issues", label: "Issues", icon: CircleDot },
  { id: "pullRequests", label: "Pull requests", icon: GitPullRequest },
  { id: "releases", label: "Releases", icon: Tag },
  { id: "contributors", label: "Contributors", icon: Users },
];

export function RepositorySurfacePanel({
  repository,
  sourceRef,
  currentPath,
  surfaces,
}: {
  repository: NormalizedRepository;
  sourceRef: string;
  currentPath: string;
  surfaces: RepositorySurfaces;
}) {
  const [activeSurface, setActiveSurface] = useState<SurfaceId>("overview");

  return (
    <section
      id="repository-surfaces"
      className="mt-4 overflow-hidden rounded-2xl border border-black/[0.1] bg-[#fbfbf9] dark:border-white/[0.1] dark:bg-[#151714]"
    >
      <div className="border-b border-black/[0.08] px-5 py-5 dark:border-white/[0.08] sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">
              Repository surfaces
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              The project around the file
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Read the history, decisions, and people around this source without
              leaving the learning trail.
            </p>
          </div>
          <RepositoryRefPicker
            repository={repository}
            sourceRef={sourceRef}
            currentPath={currentPath}
            refs={surfaces.refs}
          />
        </div>

        <div
          className="mt-6 flex max-w-full gap-1 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="Repository surfaces"
        >
          {surfaceTabs.map((tab) => {
            const Icon = tab.icon;
            const count = surfaceCount(tab.id, surfaces);
            const isActive = activeSurface === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`repository-surface-${tab.id}`}
                onClick={() => setActiveSurface(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.07]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      isActive ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`repository-surface-${activeSurface}`}
        role="tabpanel"
        className="p-5 sm:p-6"
      >
        {activeSurface === "overview" ? (
          <OverviewSurface repository={repository} surfaces={surfaces} />
        ) : null}
        {activeSurface === "commits" ? (
          <CommitSurface commits={surfaces.commits} />
        ) : null}
        {activeSurface === "issues" ? (
          <IssueSurface issues={surfaces.issues} kind="issue" />
        ) : null}
        {activeSurface === "pullRequests" ? (
          <IssueSurface issues={surfaces.pullRequests} kind="pullRequest" />
        ) : null}
        {activeSurface === "releases" ? (
          <ReleaseSurface releases={surfaces.releases} />
        ) : null}
        {activeSurface === "contributors" ? (
          <ContributorSurface contributors={surfaces.contributors} />
        ) : null}
      </div>
    </section>
  );
}

function RepositoryRefPicker({
  repository,
  sourceRef,
  currentPath,
  refs,
}: {
  repository: NormalizedRepository;
  sourceRef: string;
  currentPath: string;
  refs: RepositoryRef[];
}) {
  const branches = refs.filter((ref) => ref.kind === "branch");
  const tags = refs.filter((ref) => ref.kind === "tag");

  return (
    <details className="group relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-black/[0.12] bg-transparent px-3.5 py-2 text-xs font-semibold transition-colors hover:border-[#b45e3c]/60 dark:border-white/[0.12] dark:hover:border-[#e99970]/60">
        <GitBranch className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
        <span className="max-w-40 truncate font-mono">{refLabel(sourceRef)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/[0.12] bg-[#fbfbf9] p-2 shadow-xl dark:border-white/[0.12] dark:bg-[#151714]">
        <div className="px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Read from a ref
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Every file remains read-only and source-backed.
          </p>
        </div>
        <RefGroup
          label="Branches"
          icon={GitBranch}
          refs={branches}
          repository={repository}
          sourceRef={sourceRef}
          currentPath={currentPath}
        />
        <RefGroup
          label="Tags"
          icon={Tag}
          refs={tags}
          repository={repository}
          sourceRef={sourceRef}
          currentPath={currentPath}
        />
        {refs.length === 0 ? (
          <p className="px-2.5 py-3 text-xs text-muted-foreground">
            GitHub did not return any refs for this repository.
          </p>
        ) : null}
      </div>
    </details>
  );
}

function RefGroup({
  label,
  icon: Icon,
  refs,
  repository,
  sourceRef,
  currentPath,
}: {
  label: string;
  icon: LucideIcon;
  refs: RepositoryRef[];
  repository: NormalizedRepository;
  sourceRef: string;
  currentPath: string;
}) {
  if (refs.length === 0) return null;

  return (
    <div className="mt-2 border-t border-black/[0.08] pt-2 dark:border-white/[0.08]">
      <p className="flex items-center gap-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="max-h-48 overflow-y-auto">
        {refs.map((ref) => {
          const isActive = isSameRef(ref, sourceRef);
          return (
            <Link
              key={ref.ref}
              href={workspaceHref(repository, ref.ref, currentPath)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
                isActive && "bg-[#b45e3c]/[0.1] text-[#8f432b] dark:bg-[#e99970]/[0.12] dark:text-[#f0b38d]",
              )}
            >
              <span className="min-w-0 flex-1 truncate font-mono">{ref.name}</span>
              {ref.targetSha ? (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {ref.targetSha.slice(0, 7)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OverviewSurface({
  repository,
  surfaces,
}: {
  repository: NormalizedRepository;
  surfaces: RepositorySurfaces;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <SurfaceFact icon={History} label="Latest push" value={formatDate(repository.pushedAt)} />
        <SurfaceFact icon={Clock3} label="Last updated" value={formatDate(repository.updatedAt)} />
        <SurfaceFact icon={PackageOpen} label="Created" value={formatDate(repository.createdAt)} />
        <SurfaceFact
          icon={GitFork}
          label="Repository shape"
          value={repository.isFork ? "Forked project" : "Original project"}
        />
      </div>

      <div className="rounded-2xl border border-black/[0.08] bg-[#f2f0e9] p-4 dark:border-white/[0.08] dark:bg-[#20251f]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Trust and context
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            {repository.isArchived ? (
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#66856c]" />
            )}
            <span>{repository.isArchived ? "Archived by the maintainer" : "Active repository"}</span>
          </div>
          <div className="flex items-start gap-2">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
            <span>
              {surfaces.license?.name ?? repository.licenseSpdxId ?? "License not detected"}
            </span>
          </div>
          {repository.homepageUrl ? (
            <a
              href={repository.homepageUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Project homepage</span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            </a>
          ) : null}
        </div>
      </div>

      {repository.topics.length > 0 ? (
        <div className="lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Topics
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {repository.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-black/[0.05] px-2.5 py-1.5 text-xs text-muted-foreground dark:bg-white/[0.07]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CommitSurface({ commits }: { commits: RepositoryCommit[] }) {
  if (commits.length === 0) {
    return <SurfaceEmpty icon={GitCommit} title="No commit history returned" body="Try another ref or open the repository on GitHub." />;
  }

  return (
    <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
      {commits.map((commit) => (
        <a
          key={commit.sha}
          href={commit.url}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5"
        >
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-6 group-hover:text-[#9b4d31] dark:group-hover:text-[#e99970]">
              {commit.message}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {commit.authorLogin ? `@${commit.authorLogin}` : commit.authorName ?? "Anonymous contributor"}
              <span className="px-1.5">·</span>
              {formatDate(commit.committedAt)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {commit.abbreviatedSha}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </a>
      ))}
    </div>
  );
}

function IssueSurface({
  issues,
  kind,
}: {
  issues: Array<RepositoryIssue | RepositoryPullRequest>;
  kind: "issue" | "pullRequest";
}) {
  const Icon = kind === "issue" ? CircleDot : GitPullRequest;
  const label = kind === "issue" ? "open issues" : "open pull requests";

  if (issues.length === 0) {
    return <SurfaceEmpty icon={Icon} title={`No ${label} returned`} body="This surface is quiet right now." />;
  }

  return (
    <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
      {issues.map((issue) => {
        const pullRequest = isPullRequest(issue) ? issue : null;
        return (
          <a
            key={`${kind}-${issue.number}`}
            href={issue.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0"
          >
            <Icon className="mt-1 h-4 w-4 shrink-0 text-[#66856c]" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-6 group-hover:text-[#9b4d31] dark:group-hover:text-[#e99970]">
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">#{issue.number}</span>
                {issue.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {issue.authorLogin ? `@${issue.authorLogin}` : "Unknown author"}
                <span className="px-1.5">·</span>
                Updated {formatDate(issue.updatedAt)}
                {pullRequest?.isDraft ? <span className="px-1.5">· Draft</span> : null}
              </p>
            </div>
            <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        );
      })}
    </div>
  );
}

function ReleaseSurface({ releases }: { releases: RepositoryRelease[] }) {
  if (releases.length === 0) {
    return <SurfaceEmpty icon={Tag} title="No releases returned" body="Published releases will appear here when the project has them." />;
  }

  return (
    <div className="divide-y divide-black/[0.08] dark:divide-white/[0.08]">
      {releases.map((release) => (
        <a
          key={release.tagName}
          href={release.url}
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0"
        >
          <Tag className="mt-1 h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold group-hover:text-[#9b4d31] dark:group-hover:text-[#e99970]">
              {release.name ?? release.tagName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{release.tagName}</span>
              <span className="px-1.5">·</span>
              {release.publishedAt ? formatDate(release.publishedAt) : "Unpublished"}
              {release.isPrerelease ? <span className="px-1.5">· Pre-release</span> : null}
            </p>
            {release.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {release.description}
              </p>
            ) : null}
          </div>
          <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      ))}
    </div>
  );
}

function ContributorSurface({ contributors }: { contributors: RepositoryContributor[] }) {
  if (contributors.length === 0) {
    return <SurfaceEmpty icon={Users} title="No recent contributors returned" body="Open a ref with commit history to see the people behind it." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {contributors.map((contributor) => (
        <div
          key={contributor.login ?? contributor.name ?? "anonymous"}
          className="flex items-center gap-3 rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] text-xs font-semibold text-[#8f432b] dark:bg-white/[0.08] dark:text-[#f0b38d]">
            {initials(contributor.login ?? contributor.name ?? "?")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {contributor.login ? `@${contributor.login}` : contributor.name ?? "Anonymous contributor"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {contributor.commitCount} {contributor.commitCount === 1 ? "commit" : "commits"} in this ref
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SurfaceFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.08]">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SurfaceEmpty({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.12] px-6 py-12 text-center dark:border-white/[0.12]">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function surfaceCount(id: SurfaceId, surfaces: RepositorySurfaces) {
  if (id === "overview") return 0;
  return surfaces[id].length;
}

function isPullRequest(
  issue: RepositoryIssue | RepositoryPullRequest,
): issue is RepositoryPullRequest {
  return "isDraft" in issue;
}

function workspaceHref(
  repository: NormalizedRepository,
  sourceRef: string,
  currentPath: string,
) {
  const params = new URLSearchParams({ ref: sourceRef });
  if (currentPath) params.set("path", currentPath);
  return `/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}?${params.toString()}`;
}

function isSameRef(ref: RepositoryRef, sourceRef: string) {
  return (
    ref.ref === sourceRef ||
    ref.name === sourceRef ||
    ref.ref.replace(/^refs\/(?:heads|tags)\//, "") === sourceRef
  );
}

function refLabel(value: string) {
  if (value.length === 40) return value.slice(0, 7);
  return value.replace(/^refs\/(?:heads|tags)\//, "");
}

function formatDate(value: string | null) {
  if (value === null) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "Not available" : parsed.toISOString().slice(0, 10);
}

function initials(value: string) {
  const letters = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return letters || "?";
}
