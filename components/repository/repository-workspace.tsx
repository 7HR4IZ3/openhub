"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  ReaderIcon as BookOpen,
  BookmarkIcon as Bookmark,
  MagicWandIcon as Bot,
  CheckIcon as Check,
  ChevronRightIcon as ChevronRight,
  DotFilledIcon as CircleDot,
  CopyIcon as Copy,
  ExternalLinkIcon as ExternalLink,
  FileTextIcon as FileCode2,
  FileTextIcon as FileText,
  ArchiveIcon as Folder,
  OpenInNewWindowIcon as FolderOpen,
  Share2Icon as GitBranch,
  Share2Icon as GitFork,
  SwitchIcon as GitCompareArrows,
  GitHubLogoIcon as Github,
  HeartIcon as Heart,
  LockClosedIcon as LockKeyhole,
  HamburgerMenuIcon as Menu,
  ChatBubbleIcon as MessageSquare,
  StarIcon as Star,
  Cross2Icon as X,
} from "@radix-ui/react-icons";

import type { AppIcon } from "@/components/ui/icon";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  SourceCodeViewer,
  type CodeSelection,
} from "@/components/repository/source-code-viewer";
import {
  SourceExplainer,
  type ExplainableSource,
} from "@/components/ai/source-explainer";
import { RepositoryAnalyzer } from "@/components/ai/repository-analyzer";
import { RepositorySurfacePanel } from "@/components/repository/repository-surface-panel";
import { RepositoryAnalyticsPanel } from "@/components/repository/repository-analytics-panel";
import { RepositorySponsorship } from "@/components/repository/repository-sponsorship";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  NormalizedRepository,
  RepositoryFile,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "@/lib/providers/types";

type RepositoryWorkspaceProps = {
  repository: NormalizedRepository;
  convexConfigured: boolean;
  sourceRef: string;
  treePath: string;
  entries: RepositoryTreeEntry[];
  file: RepositoryFile | null;
  surfaces: RepositorySurfaces;
  workspaceBasePath?: string;
};

export function RepositoryWorkspace(props: RepositoryWorkspaceProps) {
  if (!props.convexConfigured) {
    return <RepositoryWorkspaceView {...props} storedRepositoryId={null} />;
  }
  return <ConnectedRepositoryWorkspace {...props} />;
}

function ConnectedRepositoryWorkspace({
  repository,
  convexConfigured,
  ...props
}: RepositoryWorkspaceProps) {
  const storedRepositoryId = useQuery(
    api.discovery.byProviderRepository,
    repository.visibility === "public"
      ? {
          provider: repository.provider,
          providerRepositoryId: repository.providerRepositoryId,
        }
      : "skip",
  );
  const track = useMutation(api.analytics.track);

  useEffect(() => {
    if (!storedRepositoryId) return;
    void track({
      eventName: "repository_view",
      repositoryId: storedRepositoryId,
    });
  }, [storedRepositoryId, track]);

  useEffect(() => {
    if (!storedRepositoryId || !props.file) return;
    void track({
      eventName: "file_view",
      repositoryId: storedRepositoryId,
      path: props.file.path,
    });
  }, [props.file, storedRepositoryId, track]);

  return (
    <RepositoryWorkspaceView
      repository={repository}
      convexConfigured={convexConfigured}
      {...props}
      storedRepositoryId={storedRepositoryId}
    />
  );
}

function RepositoryWorkspaceView({
  repository,
  convexConfigured,
  sourceRef,
  treePath,
  entries,
  file,
  surfaces,
  workspaceBasePath,
  storedRepositoryId,
}: RepositoryWorkspaceProps & {
  storedRepositoryId: Id<"repositories"> | null | undefined;
}) {
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [selectionState, setSelectionState] = useState<{
    fileKey: string;
    selection: CodeSelection | null;
  }>({ fileKey: "", selection: null });
  const basePath =
    workspaceBasePath ??
    `/repos/${encodeURIComponent(repository.ownerLogin)}/${encodeURIComponent(repository.name)}`;
  const fileKey = file ? `${file.commitSha}:${file.path}` : "";
  const selection =
    selectionState.fileKey === fileKey ? selectionState.selection : null;

  const sourceUrl = file
    ? buildSourceUrl(repository, file.commitSha, file.path, selection)
    : repository.url;
  const discussionHref = file
    ? repository.provider === "github" && repository.visibility === "public"
      ? buildComposeHref(repository, file, selection)
      : null
    : null;
  const diffHref =
    file && repository.provider === "github" && surfaces.commits.length > 1
      ? buildDiffComposeHref(repository, file, surfaces.commits[1].sha)
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
    <main className="min-h-[100dvh] bg-background text-foreground dark:bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur dark:bg-background/95">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
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
                <CircleDot className="h-3.5 w-3.5 text-foreground" />
                Source from {providerDisplayName(repository.provider)}
              </span>
              <Button asChild size="sm" className="rounded-md">
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Github className="h-4 w-4" />
                <span>{repository.ownerLogin}</span>
                <span>/</span>
                <span className="font-semibold text-foreground">
                  {repository.name}
                </span>
                <span className="rounded-full border border-black/[0.12] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] dark:border-white/[0.14]">
                  read only
                </span>
              </div>
              <h1 className="mt-3 max-w-4xl break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                {repository.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {repository.description ??
                  "A repository ready to be understood."}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="rounded-md bg-transparent"
              >
                <a href={repository.url} target="_blank" rel="noreferrer">
                  Open on {providerDisplayName(repository.provider)}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              {repository.visibility === "public" &&
              repository.provider === "github" ? (
                <>
                  <RepositoryFollowButton
                    repository={repository}
                    convexConfigured={convexConfigured}
                  />
                  <RepositorySaveButton
                    repository={repository}
                    convexConfigured={convexConfigured}
                  />
                </>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5" />{" "}
                  {repository.visibility === "private"
                    ? "Private access"
                    : `${providerDisplayName(repository.provider)} browse`}
                </span>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
            <RepositoryStat icon={Star} label={formatCount(repository.stars)} />
            <RepositoryStat
              icon={GitFork}
              label={formatCount(repository.forks)}
            />
            <RepositoryStat icon={GitBranch} label={branchLabel(sourceRef)} />
            {repository.primaryLanguage ? (
              <RepositoryStat
                icon={CircleDot}
                label={repository.primaryLanguage}
              />
            ) : null}
            {repository.licenseSpdxId ? (
              <RepositoryStat
                icon={BookOpen}
                label={repository.licenseSpdxId}
              />
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" />
              Source stays on {providerDisplayName(repository.provider)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Repository files
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md bg-transparent"
            onClick={() => setIsTreeOpen((open) => !open)}
            aria-expanded={isTreeOpen}
          >
            {isTreeOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            {isTreeOpen ? "Close files" : "Browse files"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside
            className={cn(
              "h-fit rounded-xl border border-border bg-card border-border dark:bg-card",
              isTreeOpen ? "block" : "hidden lg:block",
            )}
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {repository.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {treePath ? "/" + treePath : "Repository root"}
                  </p>
                </div>
                <FolderOpen className="h-4 w-4 shrink-0 text-foreground" />
              </div>
            </div>
            <div className="max-h-[min(68vh,720px)] overflow-y-auto p-2">
              <FileTree
                entries={entries}
                sourceRef={sourceRef}
                currentPath={file?.path ?? treePath}
                treePath={treePath}
                basePath={basePath}
                onNavigate={() => setIsTreeOpen(false)}
              />
            </div>
            <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
              <div className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>OpenHub never edits or executes this repository.</span>
              </div>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FileCode2 className="h-4 w-4 shrink-0 text-foreground" />
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
                      className="rounded-md"
                      onClick={copySourceUrl}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {isCopied ? "Copied" : "Copy link"}
                    </Button>
                    {convexConfigured &&
                    repository.provider === "github" &&
                    repository.visibility === "public" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-md"
                        onClick={() => setShowExplainer((visible) => !visible)}
                        disabled={selection === null}
                        title={
                          selection === null
                            ? "Select lines to explain"
                            : "Explain selected lines"
                        }
                      >
                        <Bot className="h-4 w-4" />
                        Explain
                      </Button>
                    ) : null}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-md bg-transparent"
                    >
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
                <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {selection ? (
                      <>
                        <span className="font-semibold text-foreground">
                          Lines {selection.startLineNumber}–
                          {selection.endLineNumber}
                        </span>{" "}
                        selected for discussion.
                      </>
                    ) : (
                      "Select lines in the editor to attach focused context."
                    )}
                  </div>
                  {discussionHref ? (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="shrink-0 rounded-md">
                        <Link href={discussionHref}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          {selection ? "Discuss lines" : "Discuss file"}
                        </Link>
                      </Button>
                      {diffHref ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-md bg-transparent"
                        >
                          <Link href={diffHref}>
                            <GitCompareArrows className="h-3.5 w-3.5" />
                            Discuss diff
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {convexConfigured &&
                repository.provider === "github" &&
                repository.visibility === "public" &&
                showExplainer &&
                selection ? (
                  <div className="px-4 pb-4 sm:px-5">
                    <SourceExplainer
                      source={buildExplainableSource(
                        repository,
                        file,
                        selection,
                      )}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[min(68vh,720px)] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary dark:bg-white/[0.08]">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">
                  Choose a file to start reading
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  The file tree is the beginning of the trail. Open a source
                  file, pin its commit, and share the exact context later.
                </p>
              </div>
            )}
          </section>
        </div>

        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          {file
            ? "Source is pinned to its commit. Select lines to keep the exact context attached to a discussion."
            : "Open a file to read its source and create a permanent reference."}
        </p>

        {convexConfigured &&
        repository.provider === "github" &&
        (repository.visibility === "public" ||
          repository.visibility === "private") ? (
          <div className="mt-4">
            <RepositoryAnalyzer
              owner={repository.ownerLogin}
              name={repository.name}
              sourceRef={sourceRef}
              repositoryUrl={repository.url}
              convexConfigured={convexConfigured}
            />
          </div>
        ) : null}

        <RepositorySurfacePanel
          repository={repository}
          sourceRef={sourceRef}
          currentPath={file?.path ?? treePath}
          surfaces={surfaces}
          workspaceBasePath={basePath}
        />
        {convexConfigured ? (
          <RepositorySponsorship repositoryId={storedRepositoryId} />
        ) : null}
        {convexConfigured ? (
          <RepositoryAnalyticsPanel repositoryId={storedRepositoryId} />
        ) : null}
      </div>
    </main>
  );
}

function RepositoryFollowButton({
  repository,
  convexConfigured,
}: {
  repository: NormalizedRepository;
  convexConfigured: boolean;
}) {
  if (!convexConfigured) {
    return (
      <Button asChild className="rounded-md">
        <Link href="/signin">
          <Heart className="h-4 w-4" />
          Follow
        </Link>
      </Button>
    );
  }
  return <ConnectedRepositoryFollowButton repository={repository} />;
}

function ConnectedRepositoryFollowButton({
  repository,
}: {
  repository: NormalizedRepository;
}) {
  const { isAuthenticated } = useConvexAuth();
  const storedRepositoryId = useQuery(api.discovery.byProviderRepository, {
    provider: repository.provider,
    providerRepositoryId: repository.providerRepositoryId,
  });
  const following = useQuery(
    api.curation.isFollowing,
    storedRepositoryId
      ? { target: { kind: "repo" as const, repositoryId: storedRepositoryId } }
      : "skip",
  );
  const observe = useAction(api.discovery.observePublicRepository);
  const setFollow = useMutation(api.curation.setFollow);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Button asChild className="rounded-md">
        <Link href="/signin">
          <Heart className="h-4 w-4" />
          Follow
        </Link>
      </Button>
    );
  }

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      if (following) {
        if (!storedRepositoryId)
          throw new Error("Repository is not ready to follow");
        await setFollow({
          target: { kind: "repo", repositoryId: storedRepositoryId },
          following: false,
        });
      } else {
        const repositoryId: Id<"repositories"> =
          storedRepositoryId ??
          (await observe({
            owner: repository.ownerLogin,
            name: repository.name,
          }));
        await setFollow({
          target: { kind: "repo", repositoryId },
          following: true,
        });
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Repository follow could not be saved",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        className="rounded-md"
        variant={following ? "secondary" : "default"}
        onClick={() => void toggle()}
        disabled={pending}
      >
        <Heart className="h-4 w-4" />
        {pending ? "Saving…" : following ? "Following" : "Follow"}
      </Button>
      {error ? (
        <span className="max-w-48 text-right text-[10px] leading-4 text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function RepositorySaveButton({
  repository,
  convexConfigured,
}: {
  repository: NormalizedRepository;
  convexConfigured: boolean;
}) {
  if (!convexConfigured) {
    return (
      <Button asChild variant="outline" className="rounded-md bg-transparent">
        <Link href="/signin">
          <Bookmark className="h-4 w-4" /> Save
        </Link>
      </Button>
    );
  }
  return <ConnectedRepositorySaveButton repository={repository} />;
}

function ConnectedRepositorySaveButton({
  repository,
}: {
  repository: NormalizedRepository;
}) {
  const { isAuthenticated } = useConvexAuth();
  const repositoryId = useQuery(api.discovery.byProviderRepository, {
    provider: repository.provider,
    providerRepositoryId: repository.providerRepositoryId,
  });
  const lists = useQuery(
    api.curation.myListChoices,
    isAuthenticated ? {} : "skip",
  ) as
    | Array<{
        _id: Id<"lists">;
        title: string;
        visibility: "public" | "private";
      }>
    | undefined;
  const observe = useAction(api.discovery.observePublicRepository);
  const addItem = useMutation(api.curation.addListItem);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" className="rounded-md bg-transparent">
        <Link href="/signin">
          <Bookmark className="h-4 w-4" /> Save
        </Link>
      </Button>
    );
  }

  async function saveToList(listId: Id<"lists">) {
    setPending(true);
    setError(null);
    try {
      const ensuredRepositoryId: Id<"repositories"> =
        repositoryId ??
        (await observe({
          owner: repository.ownerLogin,
          name: repository.name,
        }));
      await addItem({
        listId,
        target: { kind: "repo", repositoryId: ensuredRepositoryId },
      });
      setSaved((current) => new Set(current).add(listId));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Repository could not be saved",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="rounded-md bg-transparent"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Bookmark className="h-4 w-4" /> Save
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-sm dark:bg-card">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Save to a list
          </p>
          {lists === undefined ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Loading lists…
            </p>
          ) : lists.length === 0 ? (
            <Link
              href="/lists"
              className="block px-2 py-3 text-xs leading-5 text-muted-foreground hover:text-foreground"
            >
              Create a list first{" "}
              <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="mt-1 max-h-56 overflow-y-auto">
              {lists.map((list) => (
                <button
                  key={list._id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                  onClick={() => void saveToList(list._id)}
                  disabled={pending}
                >
                  <span className="min-w-0 truncate">{list.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {saved.has(list._id) ? "Saved" : list.visibility}
                  </span>
                </button>
              ))}
            </div>
          )}
          {error ? (
            <p
              role="alert"
              className="mt-2 px-2 text-[10px] leading-4 text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FileTree({
  entries,
  sourceRef,
  currentPath,
  treePath,
  basePath,
  onNavigate,
}: {
  entries: RepositoryTreeEntry[];
  sourceRef: string;
  currentPath: string;
  treePath: string;
  basePath: string;
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
          href={workspaceHref(basePath, sourceRef, parentPath)}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Up one level</span>
        </Link>
      ) : null}

      <Link
        href={workspaceHref(basePath, sourceRef, "")}
        onClick={onNavigate}
        className={cn(
          "mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
          currentPath.length === 0 &&
            "bg-accent text-foreground dark:bg-accent text-foreground",
        )}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        <span>Repository root</span>
      </Link>

      {sortedEntries.map((entry) => {
        const href = workspaceHref(basePath, sourceRef, entry.path);
        const isActive = currentPath === entry.path;
        const Icon = entry.kind === "directory" ? Folder : FileCode2;

        return (
          <Link
            key={entry.path}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
              isActive &&
                "bg-black/[0.06] font-semibold text-foreground dark:bg-white/[0.08]",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                entry.kind === "directory"
                  ? "text-foreground text-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="min-w-0 flex-1 truncate font-mono">
              {entry.name}
            </span>
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

function RepositoryStat({
  icon: Icon,
  label,
}: {
  icon: AppIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function workspaceHref(basePath: string, sourceRef: string, path: string) {
  const params = new URLSearchParams({ ref: sourceRef });
  if (path) params.set("path", path);
  return basePath + "?" + params.toString();
}

function buildSourceUrl(
  repository: NormalizedRepository,
  commitSha: string,
  path: string,
  selection: CodeSelection | null = null,
) {
  const fullName = repository.fullName
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const root =
    repository.provider === "github"
      ? `https://github.com/${fullName}/blob/${commitSha}`
      : repository.provider === "gitlab"
        ? `https://gitlab.com/${fullName}/-/blob/${commitSha}`
        : repository.provider === "bitbucket"
          ? `https://bitbucket.org/${fullName}/src/${commitSha}`
          : `https://codeberg.org/${fullName}/src/commit/${commitSha}`;
  const url = root + "/" + path.split("/").map(encodeURIComponent).join("/");
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
) {
  const params = new URLSearchParams({
    diffOwner: repository.ownerLogin,
    diffName: repository.name,
    diffPath: file.path,
    baseCommitSha,
    headCommitSha: file.commitSha,
  });
  return "/compose?" + params.toString();
}

function buildExplainableSource(
  repository: NormalizedRepository,
  file: RepositoryFile,
  selection: CodeSelection,
): ExplainableSource {
  const lines = file.text.split(/\r?\n/);
  const startLine = Math.max(
    1,
    Math.min(selection.startLineNumber, lines.length),
  );
  const endLine = Math.max(
    startLine,
    Math.min(selection.endLineNumber, lines.length),
  );
  return {
    provider: repository.provider,
    repositoryId: repository.providerRepositoryId,
    repositoryFullName: repository.fullName,
    originalOwner: repository.ownerLogin,
    path: file.path,
    commitSha: file.commitSha,
    startLine,
    endLine,
    ...(repository.primaryLanguage
      ? { language: repository.primaryLanguage }
      : {}),
    canonicalUrl: buildSourceUrl(repository, file.commitSha, file.path, {
      startLineNumber: startLine,
      endLineNumber: endLine,
    }),
    ...(repository.licenseSpdxId
      ? { licenseSpdxId: repository.licenseSpdxId }
      : {}),
    visibility: "public",
    sourceSnapshot: lines.slice(startLine - 1, endLine).join("\n"),
  };
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

function branchLabel(value: string) {
  return value.length === 40
    ? shortSha(value)
    : value.replace(/^refs\/heads\//, "");
}

function shortSha(value: string) {
  return value.slice(0, 7);
}

function providerDisplayName(provider: NormalizedRepository["provider"]) {
  return provider === "github"
    ? "GitHub"
    : provider === "gitlab"
      ? "GitLab"
      : provider === "bitbucket"
        ? "Bitbucket"
        : "Codeberg";
}
