"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  GitFork,
  Github,
  Heart,
  LockKeyhole,
  Menu,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  SourceCodeViewer,
  type CodeSelection,
} from "@/components/repository/source-code-viewer";
import { RepositorySurfacePanel } from "@/components/repository/repository-surface-panel";
import { RepositoryDiscussionTrail } from "@/components/repository/repository-discussion-trail";
import { RepositorySignalSummary } from "@/components/discovery/repository-signal-summary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  NormalizedRepository,
  RepositoryFile,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "@/lib/providers/types";

export function RepositoryWorkspace({
  convexConfigured,
  repository,
  sourceRef,
  treePath,
  entries,
  file,
  surfaces,
}: {
  convexConfigured: boolean;
  repository: NormalizedRepository;
  sourceRef: string;
  treePath: string;
  entries: RepositoryTreeEntry[];
  file: RepositoryFile | null;
  surfaces: RepositorySurfaces;
}) {
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectionState, setSelectionState] = useState<{
    fileKey: string;
    selection: CodeSelection | null;
  }>({ fileKey: "", selection: null });
  const fileKey = file ? `${file.commitSha}:${file.path}` : "";
  const selection =
    selectionState.fileKey === fileKey ? selectionState.selection : null;

  const sourceUrl = file
    ? buildGitHubSourceUrl(repository, file.commitSha, file.path, selection)
    : repository.url;
  const discussionHref = file
    ? buildComposeHref(repository, file, selection)
    : null;
  const diffHref = file && surfaces.commits.length >= 2
    ? buildDiffComposeHref(repository, file, surfaces.commits[1].sha, surfaces.commits[0].sha)
    : null;

  async function copySourceUrl() {
    try {
      await navigator.clipboard.writeText(sourceUrl);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-foreground dark:bg-[#111310]">
      <header className="border-b border-black/[0.1] bg-[#f7f7f4]/95 backdrop-blur dark:border-white/[0.1] dark:bg-[#111310]/95">
        <div className="mx-auto max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 text-sm">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Explore
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                <CircleDot className="h-3.5 w-3.5 text-[#b45e3c] dark:text-[#e99970]" />
                Live from GitHub
              </span>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Github className="h-4 w-4" />
                <span>{repository.ownerLogin}</span>
                <span>/</span>
                <span className="font-semibold text-foreground">{repository.name}</span>
                <span className="rounded-full border border-black/[0.12] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-white/[0.14]">
                  read only
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
                {repository.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {repository.description ?? "A repository ready to be understood."}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full bg-transparent">
                <a href={repository.url} target="_blank" rel="noreferrer">
                  Open on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              {convexConfigured ? <RepositoryFollowControl repository={repository} /> : <Button asChild className="rounded-full"><Link href="/signin"><Heart className="h-4 w-4" />Follow</Link></Button>}
              {convexConfigured ? <RepositorySaveControl repository={repository} /> : null}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
            <RepositoryStat icon={Star} label={formatCount(repository.stars)} />
            <RepositoryStat icon={GitFork} label={formatCount(repository.forks)} />
            <RepositoryStat icon={GitBranch} label={refLabel(sourceRef)} />
            {repository.primaryLanguage ? (
              <RepositoryStat icon={CircleDot} label={repository.primaryLanguage} />
            ) : null}
            {repository.licenseSpdxId ? (
              <RepositoryStat icon={BookOpen} label={repository.licenseSpdxId} />
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" />
              Source stays on GitHub
            </span>
          </div>
          {repository.topics.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Repository topics">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Topics</span>
              {repository.topics.slice(0, 12).map((topic) => (
                convexConfigured
                  ? <RepositoryTopicFollowControl key={topic} topic={topic} />
                  : <span key={topic} className="rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] text-muted-foreground dark:border-white/[0.1]">{topic}</span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Repository files
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-transparent"
            onClick={() => setIsTreeOpen((open) => !open)}
            aria-expanded={isTreeOpen}
          >
            {isTreeOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {isTreeOpen ? "Close files" : "Browse files"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            className={cn(
              "h-fit rounded-2xl border border-black/[0.1] bg-[#fbfbf9] dark:border-white/[0.1] dark:bg-[#151714]",
              isTreeOpen ? "block" : "hidden lg:block",
            )}
          >
            <div className="border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{repository.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {treePath ? "/" + treePath : "Repository root"}
                  </p>
                </div>
                <FolderOpen className="h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
              </div>
            </div>
            <div className="max-h-[min(68vh,720px)] overflow-y-auto p-2">
              <FileTree
                entries={entries}
                owner={repository.ownerLogin}
                name={repository.name}
                sourceRef={sourceRef}
                currentPath={file?.path ?? treePath}
                treePath={treePath}
                onNavigate={() => setIsTreeOpen(false)}
              />
            </div>
            <div className="border-t border-black/[0.08] px-4 py-3 text-xs leading-5 text-muted-foreground dark:border-white/[0.08]">
              <div className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>OpenHub never edits or executes this repository.</span>
              </div>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-black/[0.1] bg-[#fbfbf9] dark:border-white/[0.1] dark:bg-[#151714]">
            <div className="flex flex-col gap-3 border-b border-black/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-white/[0.08]">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FileCode2 className="h-4 w-4 shrink-0 text-[#b45e3c] dark:text-[#e99970]" />
                <span className="truncate font-mono text-xs sm:text-sm">
                  {file?.path ?? (treePath ? treePath + "/" : "Select a file")}
                </span>
                {file ? (
                  <span className="hidden shrink-0 rounded-full bg-black/[0.05] px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline dark:bg-white/[0.07]">
                    {shortSha(file.commitSha)}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {file ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={copySourceUrl}
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? "Copied" : "Copy link"}
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
                      <a href={sourceUrl} target="_blank" rel="noreferrer">
                        GitHub
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {file ? (
              <>
                <SourceCodeViewer
                  file={file}
                  primaryLanguage={repository.primaryLanguage}
                  onSelectionChange={(nextSelection) =>
                    setSelectionState({
                      fileKey,
                      selection: nextSelection,
                    })
                  }
                />
                <div className="flex flex-col gap-3 border-t border-black/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-white/[0.08]">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {selection ? (
                      <>
                        <span className="font-semibold text-foreground">
                          Lines {selection.startLineNumber}–{selection.endLineNumber}
                        </span>{" "}
                        selected for discussion.
                      </>
                    ) : (
                      "Select lines in the editor to attach focused context."
                    )}
                  </div>
                  {discussionHref ? (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="shrink-0 rounded-full">
                        <Link href={discussionHref}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          {selection ? "Discuss lines" : "Discuss file"}
                        </Link>
                      </Button>
                      {diffHref ? (
                        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full bg-transparent">
                          <Link href={diffHref}>
                            <GitBranch className="h-3.5 w-3.5" />
                            Compare commits
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex min-h-[min(68vh,720px)] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9e6dc] dark:bg-white/[0.08]">
                  <FileText className="h-5 w-5 text-[#9b4d31] dark:text-[#e99970]" />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">
                  Choose a file to start reading
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  The file tree is the beginning of the trail. Open a source file,
                  pin its commit, and share the exact context later.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-black/[0.1] bg-[#e9e6dc] p-5 dark:border-white/[0.1] dark:bg-[#20251f]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b513d] dark:text-[#e6a07c]">
              Source context
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              {file
                ? "This view is pinned to the commit returned by GitHub, so future code posts can keep a stable source."
                : "Open a file to create a stable, commit-addressed source reference."}
            </p>
          </section>
          <section className="rounded-2xl border border-black/[0.1] p-5 dark:border-white/[0.1]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Next layer
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Follow this project, save it to a list, or discuss a selected line
              once your OpenHub trail is connected.
            </p>
          </section>
        </div>

        {convexConfigured ? <div className="mt-4"><RepositorySignalSummary repository={repository} /></div> : null}

        {convexConfigured ? <RepositoryDiscussionTrail provider={repository.provider} providerRepositoryId={repository.providerRepositoryId} /> : null}

        <RepositorySurfacePanel
          repository={repository}
          sourceRef={sourceRef}
          currentPath={file?.path ?? treePath}
          surfaces={surfaces}
        />
      </div>
    </main>
  );
}

function FileTree({
  entries,
  owner,
  name,
  sourceRef,
  currentPath,
  treePath,
  onNavigate,
}: {
  entries: RepositoryTreeEntry[];
  owner: string;
  name: string;
  sourceRef: string;
  currentPath: string;
  treePath: string;
  onNavigate: () => void;
}) {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const parentPath = parentDirectory(treePath);

  return (
    <div className="space-y-0.5">
      {treePath ? (
        <Link
          href={workspaceHref(owner, name, sourceRef, parentPath)}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Up one level</span>
        </Link>
      ) : null}

      <Link
        href={workspaceHref(owner, name, sourceRef, "")}
        onClick={onNavigate}
        className={cn(
          "mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
          currentPath.length === 0 && "bg-[#b45e3c]/[0.1] text-[#8f432b] dark:bg-[#e99970]/[0.12] dark:text-[#f0b38d]",
        )}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span>Repository root</span>
      </Link>

      {sortedEntries.map((entry) => {
        const href = workspaceHref(owner, name, sourceRef, entry.path);
        const isActive = currentPath === entry.path;
        const Icon = entry.kind === "directory" ? Folder : FileCode2;

        return (
          <Link
            key={entry.path}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
              isActive && "bg-black/[0.06] font-semibold text-foreground dark:bg-white/[0.08]",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                entry.kind === "directory"
                  ? "text-[#b45e3c] dark:text-[#e99970]"
                  : "text-muted-foreground",
              )}
            />
            <span className="min-w-0 flex-1 truncate font-mono">{entry.name}</span>
            {entry.kind === "directory" ? (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            ) : null}
          </Link>
        );
      })}

      {sortedEntries.length === 0 ? (
        <p className="px-2.5 py-4 text-xs leading-5 text-muted-foreground">
          This directory has no readable entries.
        </p>
      ) : null}
    </div>
  );
}

function RepositoryFollowControl({ repository }: { repository: NormalizedRepository }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const cached = useQuery(api.repositories.byProviderRepository, {
    provider: repository.provider,
    providerRepositoryId: repository.providerRepositoryId,
  });
  const syncRepository = useAction(api.repositories.syncPublicGitHubRepository);
  const setFollow = useMutation(api.curation.setFollow);
  const [syncedId, setSyncedId] = useState<Id<"repositories"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const repositoryId = syncedId ?? cached?._id ?? null;
  const following = useQuery(
    api.curation.isFollowing,
    repositoryId === null ? "skip" : { target: { kind: "repo", repositoryId } },
  );

  if (!isAuthenticated) {
    return <Button asChild className="rounded-full"><Link href="/signin"><Heart className="h-4 w-4" />Follow</Link></Button>;
  }

  async function toggle() {
    setBusy(true);
    setError(false);
    try {
      let id = repositoryId;
      if (id === null) {
        if (repository.provider !== "github") throw new Error("Provider is not supported");
        const saved = await syncRepository({ owner: repository.ownerLogin, name: repository.name });
        id = saved._id;
        setSyncedId(id);
      }
      await setFollow({ target: { kind: "repo", repositoryId: id }, following: following !== true });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" onClick={() => void toggle()} disabled={busy || isLoading} className="rounded-full">
      <Heart className={following ? "h-4 w-4 fill-current" : "h-4 w-4"} />
      {busy ? "Saving..." : following ? "Following" : "Follow"}
      {error ? <span className="sr-only">Could not update follow state</span> : null}
    </Button>
  );
}

function RepositorySaveControl({ repository }: { repository: NormalizedRepository }) {
  const { isAuthenticated } = useConvexAuth();
  const cached = useQuery(api.repositories.byProviderRepository, { provider: repository.provider, providerRepositoryId: repository.providerRepositoryId });
  const lists = useQuery(api.curation.myLists, isAuthenticated ? { paginationOpts: { numItems: 30, cursor: null } } : "skip");
  const syncRepository = useAction(api.repositories.syncPublicGitHubRepository);
  const addListItem = useMutation(api.curation.addListItem);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Id<"lists"> | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;
  async function save(listId: Id<"lists">) {
    setBusy(true); setError(false);
    try {
      let repositoryId = cached?._id;
      if (!repositoryId) {
        const synced = await syncRepository({ owner: repository.ownerLogin, name: repository.name });
        repositoryId = synced._id;
      }
      await addListItem({ listId, target: { kind: "repo", repositoryId } });
      setSaved(listId); setOpen(false);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-black/[0.12] px-4 text-sm font-semibold hover:border-[#b45e3c]/60 dark:border-white/[0.12] dark:hover:border-[#e99970]/60"><BookOpen className="h-4 w-4" />{saved ? "Saved" : "Save"}</summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-black/[0.12] bg-[#fbfbf9] p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#151714]"><p className="px-2 py-1 text-xs font-semibold">Save to a list</p>{lists?.page.length ? <div className="mt-2 space-y-1">{lists.page.map((list) => <button key={list._id} type="button" className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" disabled={busy} onClick={() => void save(list._id)}><span className="truncate">{list.title}</span><span className="text-[10px] text-muted-foreground">{list.visibility}</span></button>)}</div> : <Link href="/lists" className="mt-2 block rounded-xl px-2 py-2 text-sm text-[#9b4d31] hover:bg-black/[0.05] dark:text-[#e99970] dark:hover:bg-white/[0.06]">Create your first list</Link>}{error ? <p className="mt-2 px-2 text-xs text-destructive">Could not save this repository.</p> : null}</div>
    </details>
  );
}

function RepositoryTopicFollowControl({ topic }: { topic: string }) {
  const { isAuthenticated } = useConvexAuth();
  const slug = topicSlug(topic);
  const following = useQuery(
    api.curation.isFollowing,
    slug && isAuthenticated ? { target: { kind: "topic", slug } } : "skip",
  );
  const setFollow = useMutation(api.curation.setFollow);
  const [busy, setBusy] = useState(false);

  if (!slug) return <span className="rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] text-muted-foreground dark:border-white/[0.1]">{topic}</span>;

  async function toggle() {
    if (!isAuthenticated) return;
    setBusy(true);
    try {
      await setFollow({ target: { kind: "topic", slug }, following: following !== true });
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return <Link href="/signin" className="rounded-full border border-black/[0.1] px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[#b45e3c]/60 hover:text-foreground dark:border-white/[0.1] dark:hover:border-[#e99970]/60">{topic}</Link>;
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={following === true}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50",
        following === true
          ? "border-[#b45e3c]/60 bg-[#b45e3c]/[0.08] font-semibold text-[#8f432b] dark:border-[#e99970]/60 dark:bg-[#e99970]/[0.1] dark:text-[#f0b38d]"
          : "border-black/[0.1] text-muted-foreground hover:border-[#b45e3c]/60 hover:text-foreground dark:border-white/[0.1] dark:hover:border-[#e99970]/60",
      )}
    >
      {following === true ? "Following " : ""}{topic}
    </button>
  );
}

function topicSlug(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function RepositoryStat({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function workspaceHref(owner: string, name: string, sourceRef: string, path: string) {
  const params = new URLSearchParams({ ref: sourceRef });
  if (path) params.set("path", path);
  return (
    "/repos/" +
    encodeURIComponent(owner) +
    "/" +
    encodeURIComponent(name) +
    "?" +
    params.toString()
  );
}

function buildGitHubSourceUrl(
  repository: NormalizedRepository,
  commitSha: string,
  path: string,
  selection: CodeSelection | null = null,
) {
  const url =
    "https://github.com/" +
    repository.fullName +
    "/blob/" +
    commitSha +
    "/" +
    path.split("/").map(encodeURIComponent).join("/");
  if (selection === null) return url;
  const anchor =
    selection.startLineNumber === selection.endLineNumber
      ? `#L${selection.startLineNumber}`
      : `#L${selection.startLineNumber}-L${selection.endLineNumber}`;
  return url + anchor;
}

function buildComposeHref(
  repository: NormalizedRepository,
  file: RepositoryFile,
  selection: CodeSelection | null,
) {
  const totalLines = Math.max(1, file.text.split(/\r?\n/).length);
  const startLine = selection?.startLineNumber ?? 1;
  const endLine = selection?.endLineNumber ?? totalLines;
  const params = new URLSearchParams({
    owner: repository.ownerLogin,
    name: repository.name,
    path: file.path,
    ref: file.commitSha,
    startLine: String(startLine),
    endLine: String(endLine),
  });
  return "/compose?" + params.toString();
}

function buildDiffComposeHref(
  repository: NormalizedRepository,
  file: RepositoryFile,
  baseCommitSha: string,
  headCommitSha: string,
) {
  const params = new URLSearchParams({
    owner: repository.ownerLogin,
    name: repository.name,
    path: file.path,
    base: baseCommitSha,
    head: headCommitSha,
  });
  return "/compose?" + params.toString();
}

function parentDirectory(path: string) {
  const separator = path.lastIndexOf("/");
  return separator === -1 ? "" : path.slice(0, separator);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function refLabel(value: string) {
  return value.length === 40 ? shortSha(value) : value.replace(/^refs\/heads\//, "");
}

function shortSha(value: string) {
  return value.slice(0, 7);
}
