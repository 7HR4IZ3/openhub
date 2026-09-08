"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowTopRightIcon as ArrowUpRight,
  BookmarkIcon as Bookmark,
  MagicWandIcon as Bot,
  CheckIcon as Check,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  DotFilledIcon as CircleDot,
  CopyIcon as Copy,
  CounterClockwiseClockIcon as HistoryIcon,
  FileTextIcon as FileCode2,
  ArchiveIcon as Folder,
  OpenInNewWindowIcon as FolderOpen,
  SwitchIcon as GitCompareArrows,
  GitHubLogoIcon as Github,
  HeartIcon as Heart,
  HamburgerMenuIcon as Menu,
  MagnifyingGlassIcon as Search,
  ChatBubbleIcon as MessageSquare,
  DotsHorizontalIcon as MoreHorizontal,
  Cross2Icon as X,
} from "@radix-ui/react-icons";

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
import {
  RepositoryRefPicker,
  RepositorySurfacePanel,
} from "@/components/repository/repository-surface-panel";
import { RepositoryAnalyticsPanel } from "@/components/repository/repository-analytics-panel";
import { RepositorySponsorship } from "@/components/repository/repository-sponsorship";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/app/account-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!isTreeOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isTreeOpen]);
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

  const isCopied = copiedUrl === sourceUrl;
  const currentPath = file?.path ?? treePath;
  const isRoot = file === null && treePath.length === 0;
  const latestCommit = surfaces.commits[0] ?? null;
  const [treeQuery, setTreeQuery] = useState("");

  async function copySourceUrl() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(sourceUrl);
      setCopiedUrl(sourceUrl);
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedUrl(null), 1800);
    } catch {
      setCopiedUrl(null);
      setCopyError(true);
    }
  }

  return (
    <main className="gh-repo-page min-h-[100dvh]">
      <header className="gh-repo-header">
        <div className="gh-repo-shell">
          <div className="gh-repo-identity">
            <Link
              href="/explore"
              className="gh-repo-back gh-icon-control"
              aria-label="Back to explore"
              title="Back to explore"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Github
              className="gh-repo-mark h-6 w-6 shrink-0"
              aria-hidden="true"
            />
            <h1 className="gh-repo-title">
              <Link href={basePath} className="gh-link">
                {repository.ownerLogin}
              </Link>
              <span className="gh-slash">/</span>
              <span>{repository.name}</span>
              <span className="gh-visibility">
                {repository.visibility === "public" ? "Public" : "Private"}
              </span>
            </h1>
            <div className="gh-repo-header-actions">
              <div className="gh-account-menu">
                <AccountMenu />
              </div>
              <button
                type="button"
                className="gh-icon-control"
                aria-label="Repository actions"
                title="Repository actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav className="gh-repo-tabs" aria-label="Repository sections">
            <Link href={basePath} className="gh-repo-tab gh-repo-tab-active">
              <FileCode2 className="h-5 w-5" />
              <span>Code</span>
            </Link>
            <a
              href={`${repository.url}/issues`}
              target="_blank"
              rel="noreferrer"
              className="gh-repo-tab"
            >
              <CircleDot className="h-5 w-5" />
              <span>Issues</span>
              {repository.openIssues > 0 ? (
                <span className="gh-issue-count">{repository.openIssues}</span>
              ) : null}
            </a>
          </nav>
        </div>
      </header>

      <div className="gh-repo-shell gh-repo-content">
        {copyError ? (
          <p role="alert" className="gh-inline-alert">
            Link unavailable. Copy it from the provider instead.
          </p>
        ) : null}
        <span role="status" className="sr-only">
          {isCopied ? "Source link copied" : ""}
        </span>

        <div
          className={cn("gh-file-toolbar", isRoot && "gh-file-toolbar-root")}
        >
          {!isRoot ? (
            <Link
              href={workspaceHref(basePath, sourceRef, treePath)}
              className="gh-files-back"
              aria-label="Back to files"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Files</span>
            </Link>
          ) : null}
          <RepositoryRefPicker
            repository={repository}
            sourceRef={sourceRef}
            currentPath={currentPath}
            workspaceBasePath={basePath}
            refs={surfaces.refs}
          />
          {isRoot ? (
            <Button asChild className="gh-code-button">
              <a href={repository.url} target="_blank" rel="noreferrer">
                Code
                <ChevronDown className="h-5 w-5" />
              </a>
            </Button>
          ) : null}
          <button
            type="button"
            className="gh-icon-control gh-toolbar-more"
            aria-label="More repository actions"
            title="More repository actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="gh-icon-control gh-explorer-toggle"
            onClick={() => setIsTreeOpen((open) => !open)}
            aria-expanded={isTreeOpen}
            aria-controls="repository-file-manager"
            aria-label={
              isTreeOpen ? "Close file explorer" : "Open file explorer"
            }
            title={isTreeOpen ? "Close file explorer" : "Open file explorer"}
          >
            {isTreeOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {isTreeOpen ? (
          <button
            type="button"
            className="gh-file-backdrop"
            aria-label="Close file explorer"
            onClick={() => setIsTreeOpen(false)}
          />
        ) : null}

        <div className="gh-page-grid">
          <div className="gh-workspace-grid">
            <aside
              id="repository-file-manager"
              data-open={isTreeOpen}
              className={cn(
                "gh-file-drawer",
                isTreeOpen ? "gh-file-drawer-open" : "gh-file-drawer-closed",
              )}
            >
              <div className="gh-file-drawer-head">
                <div className="min-w-0">
                  <strong>Files</strong>
                  <span>{treePath ? `/${treePath}` : repository.name}</span>
                </div>
                <button
                  type="button"
                  className="gh-icon-control gh-drawer-close"
                  aria-label="Close file explorer"
                  onClick={() => setIsTreeOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <label className="gh-file-search">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="sr-only">Go to file</span>
                <input
                  type="search"
                  value={treeQuery}
                  onChange={(event) => setTreeQuery(event.target.value)}
                  placeholder="Go to file"
                  autoComplete="off"
                />
              </label>
              <div className="gh-file-drawer-scroll">
                <FileTree
                  entries={filterTreeEntries(entries, treeQuery)}
                  sourceRef={sourceRef}
                  currentPath={currentPath}
                  treePath={treePath}
                  basePath={basePath}
                  onNavigate={() => setIsTreeOpen(false)}
                />
              </div>
            </aside>

            <div className="gh-page-main">
              {file || treePath ? (
                <RepositoryBreadcrumb
                  repository={repository}
                  sourceRef={sourceRef}
                  path={file?.path ?? treePath}
                  basePath={basePath}
                  isFile={file !== null}
                />
              ) : null}

              {file ? (
                <>
                  <RepositoryCommitRow commit={latestCommit} />
                  <div className="gh-file-stats">
                    {file.text.split(/\r?\n/).length} lines (
                    {file.text.split(/\r?\n/).length} loc)
                    <span aria-hidden="true">·</span>
                    {formatBytes(file.byteSize)}
                  </div>
                  <section className="gh-code-panel" aria-label="Source code">
                    <div className="gh-code-toolbar">
                      <div
                        className="gh-code-tabs"
                        role="tablist"
                        aria-label="File view"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected="true"
                          className="gh-code-tab gh-code-tab-active"
                        >
                          Code
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected="false"
                          className="gh-code-tab"
                          disabled
                        >
                          Blame
                        </button>
                      </div>
                      <div className="gh-code-actions">
                        <button
                          type="button"
                          className="gh-icon-control"
                          onClick={copySourceUrl}
                          aria-label={
                            isCopied ? "Copied source link" : "Copy source link"
                          }
                          title={
                            isCopied ? "Copied source link" : "Copy source link"
                          }
                        >
                          {isCopied ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                        {convexConfigured &&
                        repository.provider === "github" &&
                        repository.visibility === "public" ? (
                          <button
                            type="button"
                            className="gh-icon-control"
                            onClick={() =>
                              setShowExplainer((visible) => !visible)
                            }
                            disabled={selection === null}
                            aria-label={
                              selection === null
                                ? "Select lines to explain"
                                : "Explain selected lines"
                            }
                            title={
                              selection === null
                                ? "Select lines to explain"
                                : "Explain selected lines"
                            }
                          >
                            <Bot className="h-5 w-5" />
                          </button>
                        ) : null}
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="gh-icon-control"
                          aria-label="Open source on provider"
                          title="Open source on provider"
                        >
                          <ArrowUpRight className="h-5 w-5" />
                        </a>
                        <button
                          type="button"
                          className="gh-icon-control"
                          aria-label="More file actions"
                          title="More file actions"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <SourceCodeViewer
                      file={file}
                      primaryLanguage={repository.primaryLanguage}
                      onSelectionChange={(nextSelection) =>
                        setSelectionState({ fileKey, selection: nextSelection })
                      }
                    />
                    <div className="gh-code-footer">
                      <span className="gh-code-footer-meta">
                        {selection
                          ? `Lines ${selection.startLineNumber}–${selection.endLineNumber}`
                          : shortSha(file.commitSha)}
                      </span>
                      {discussionHref ? (
                        <div className="gh-code-footer-actions">
                          <Button
                            asChild
                            size="sm"
                            className="gh-footer-button"
                          >
                            <Link href={discussionHref}>
                              <MessageSquare className="h-4 w-4" />
                              <span>Discuss</span>
                            </Link>
                          </Button>
                          {diffHref ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="gh-footer-button"
                            >
                              <Link href={diffHref}>
                                <GitCompareArrows className="h-4 w-4" />
                                <span>Diff</span>
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
                      <div className="gh-explainer">
                        <SourceExplainer
                          source={buildExplainableSource(
                            repository,
                            file,
                            selection,
                          )}
                        />
                      </div>
                    ) : null}
                  </section>
                </>
              ) : (
                <div className="gh-directory-view">
                  <RepositoryCommitRow commit={latestCommit} />
                  <RepositoryDirectoryList
                    repository={repository}
                    sourceRef={sourceRef}
                    treePath={treePath}
                    entries={entries}
                    basePath={basePath}
                    showHeader={treePath.length > 0}
                    latestCommitAt={latestCommit?.committedAt ?? null}
                    onNavigate={() => setIsTreeOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>

          <aside className="gh-context-drawer">
            <details>
              <summary
                className="gh-context-summary"
                aria-label="Open repository context"
                title="Open repository context"
              >
                <CircleDot className="h-5 w-5" aria-hidden="true" />
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="gh-context-content">
                {convexConfigured && repository.provider === "github" ? (
                  <RepositoryAnalyzer
                    owner={repository.ownerLogin}
                    name={repository.name}
                    sourceRef={sourceRef}
                    repositoryUrl={repository.url}
                    convexConfigured={convexConfigured}
                  />
                ) : null}
                {repository.visibility === "public" &&
                repository.provider === "github" ? (
                  <div className="gh-context-actions">
                    <RepositoryFollowButton
                      repository={repository}
                      convexConfigured={convexConfigured}
                    />
                    <RepositorySaveButton
                      repository={repository}
                      convexConfigured={convexConfigured}
                    />
                  </div>
                ) : null}
                <RepositorySurfacePanel
                  repository={repository}
                  surfaces={surfaces}
                />
                {convexConfigured ? (
                  <RepositorySponsorship repositoryId={storedRepositoryId} />
                ) : null}
                {convexConfigured ? (
                  <RepositoryAnalyticsPanel repositoryId={storedRepositoryId} />
                ) : null}
              </div>
            </details>
          </aside>
        </div>
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
      <Button asChild>
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
      <Button asChild>
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
      <Button asChild variant="outline" className="bg-transparent">
        <Link href="/signin">
          <Bookmark className="h-4 w-4" /> Save
        </Link>
      </Button>
    );
  }
  return (
    <ConnectedRepositorySaveButton
      key={repository.provider + ":" + repository.providerRepositoryId}
      repository={repository}
    />
  );
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
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" className="bg-transparent">
        <Link href="/signin">
          <Bookmark className="h-4 w-4" /> Save
        </Link>
      </Button>
    );
  }

  async function saveToList(listId: Id<"lists">) {
    if (pending || saved.has(listId)) return;
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
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            <Bookmark />
            Save
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 max-w-[calc(100vw-2rem)]"
        >
          <DropdownMenuLabel>Save to a list</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {lists === undefined ? (
            <DropdownMenuItem disabled>Loading lists…</DropdownMenuItem>
          ) : lists.length === 0 ? (
            <DropdownMenuItem asChild>
              <Link href="/lists">
                Create a list <ArrowUpRight />
              </Link>
            </DropdownMenuItem>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {lists.map((list) => (
                <DropdownMenuItem
                  key={list._id}
                  className="min-h-11 justify-between gap-3"
                  disabled={pending || saved.has(list._id)}
                  onSelect={(event) => {
                    event.preventDefault();
                    void saveToList(list._id);
                  }}
                >
                  <span className="min-w-0 truncate">{list.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {saved.has(list._id) ? "Saved" : list.visibility}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" className="sr-only">
        {pending
          ? "Saving repository…"
          : saved.size > 0
            ? "Repository saved to your list"
            : ""}
      </span>
      {error ? (
        <p role="alert" className="mt-2 max-w-64 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RepositoryCommitRow({
  commit,
}: {
  commit: RepositorySurfaces["commits"][number] | null;
}) {
  if (commit === null) return null;

  const author = commit.authorLogin ?? commit.authorName ?? "Anonymous";
  return (
    <a
      href={commit.url}
      target="_blank"
      rel="noreferrer"
      className="gh-commit-row"
      title={commit.message}
    >
      <span className="gh-avatar" aria-hidden="true">
        {initials(author)}
      </span>
      <span className="gh-commit-author">
        <strong>{author}</strong>
        <span>{formatRelativeDate(commit.committedAt)}</span>
      </span>
      <span className="gh-commit-message">{commit.message}</span>
      <span className="gh-commit-actions" aria-hidden="true">
        <MoreHorizontal className="h-5 w-5" />
        <HistoryIcon className="h-5 w-5" />
      </span>
    </a>
  );
}

function RepositoryBreadcrumb({
  repository,
  sourceRef,
  path,
  basePath,
  isFile,
}: {
  repository: NormalizedRepository;
  sourceRef: string;
  path: string;
  basePath: string;
  isFile: boolean;
}) {
  const segments = path.split("/").filter(Boolean);
  return (
    <nav className="gh-breadcrumb" aria-label="Repository path">
      <Link href={workspaceHref(basePath, sourceRef, "")} className="gh-link">
        {repository.name}
      </Link>
      {segments.map((segment, index) => {
        const segmentPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const isCurrentFile = isFile && isLast;
        return (
          <span key={segmentPath} className="gh-breadcrumb-segment">
            <span className="gh-breadcrumb-slash" aria-hidden="true">
              /
            </span>
            {isCurrentFile ? (
              <strong className="gh-breadcrumb-current">{segment}</strong>
            ) : (
              <Link
                href={workspaceHref(basePath, sourceRef, segmentPath)}
                className="gh-link"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
      {isFile ? (
        <button
          type="button"
          className="gh-icon-control gh-copy-path"
          aria-label="Copy file path"
          title="Copy file path"
          onClick={() => void navigator.clipboard?.writeText(path)}
        >
          <Copy className="h-5 w-5" />
        </button>
      ) : null}
    </nav>
  );
}

function RepositoryDirectoryList({
  repository,
  sourceRef,
  treePath,
  entries,
  basePath,
  showHeader,
  latestCommitAt,
  onNavigate,
}: {
  repository: NormalizedRepository;
  sourceRef: string;
  treePath: string;
  entries: RepositoryTreeEntry[];
  basePath: string;
  showHeader: boolean;
  latestCommitAt: string | null;
  onNavigate: () => void;
}) {
  const { prefetch, navigate } = useRepositoryNavigation(onNavigate);
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const parentPath = parentDirectory(treePath);
  const rows = treePath
    ? [
        {
          name: "..",
          path: parentPath,
          kind: "directory" as const,
          oid: "parent",
          byteSize: null,
          parent: true,
        },
        ...sortedEntries.map((entry) => ({ ...entry, parent: false })),
      ]
    : sortedEntries.map((entry) => ({ ...entry, parent: false }));

  return (
    <div className="gh-file-list">
      {showHeader ? (
        <div className="gh-file-list-header">
          <span>Name</span>
          <span>Last commit date</span>
        </div>
      ) : null}
      {rows.map((entry) => {
        const href = workspaceHref(basePath, sourceRef, entry.path);
        const Icon = entry.kind === "directory" ? Folder : FileCode2;
        return (
          <Link
            key={entry.parent ? "parent" : entry.path}
            href={href}
            onClick={(event) => navigate(event, href)}
            onMouseEnter={() => prefetch(href)}
            onFocus={() => prefetch(href)}
            onTouchStart={() => prefetch(href)}
            className={cn("gh-file-row", entry.parent && "gh-file-row-parent")}
          >
            <span className="gh-file-name">
              {entry.parent ? (
                <ChevronRight className="h-5 w-5 rotate-180 text-muted-foreground" />
              ) : (
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 truncate">{entry.name}</span>
            </span>
            <span className="gh-file-date">
              {entry.parent ? "" : formatRelativeDate(latestCommitAt)}
            </span>
          </Link>
        );
      })}
      {rows.length === 0 ? (
        <p className="gh-file-empty">This directory is empty.</p>
      ) : null}
      {!treePath && rows.length > 0 ? (
        <div className="gh-file-list-footer">
          <Link
            href={workspaceHref(basePath, sourceRef, "")}
            className="gh-link"
          >
            View all files
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function useRepositoryNavigation(onNavigate: () => void) {
  const router = useRouter();
  const prefetchedHrefs = useRef(new Set<string>());

  function prefetch(href: string) {
    if (prefetchedHrefs.current.has(href)) return;
    prefetchedHrefs.current.add(href);
    void router.prefetch(href);
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    prefetch(href);
    onNavigate();
    void router.push(href);
  }

  return { prefetch, navigate };
}

function filterTreeEntries(entries: RepositoryTreeEntry[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return entries;
  return entries.filter((entry) =>
    entry.path.toLowerCase().includes(normalizedQuery),
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
  const { prefetch, navigate } = useRepositoryNavigation(onNavigate);
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const parentPath = parentDirectory(treePath);

  return (
    <div className="gh-tree">
      {treePath ? (
        <Link
          href={workspaceHref(basePath, sourceRef, parentPath)}
          onClick={(event) =>
            navigate(event, workspaceHref(basePath, sourceRef, parentPath))
          }
          onMouseEnter={() =>
            prefetch(workspaceHref(basePath, sourceRef, parentPath))
          }
          onFocus={() =>
            prefetch(workspaceHref(basePath, sourceRef, parentPath))
          }
          onTouchStart={() =>
            prefetch(workspaceHref(basePath, sourceRef, parentPath))
          }
          className="gh-tree-row"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Up one level</span>
        </Link>
      ) : null}

      <Link
        href={workspaceHref(basePath, sourceRef, "")}
        onClick={(event) =>
          navigate(event, workspaceHref(basePath, sourceRef, ""))
        }
        onMouseEnter={() => prefetch(workspaceHref(basePath, sourceRef, ""))}
        onFocus={() => prefetch(workspaceHref(basePath, sourceRef, ""))}
        onTouchStart={() => prefetch(workspaceHref(basePath, sourceRef, ""))}
        data-active={currentPath.length === 0 ? "true" : "false"}
        className={cn(
          "gh-tree-row gh-tree-root",
          currentPath.length === 0 && "gh-tree-row-active",
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
            onClick={(event) => navigate(event, href)}
            onMouseEnter={() => prefetch(href)}
            onFocus={() => prefetch(href)}
            onTouchStart={() => prefetch(href)}
            data-active={isActive ? "true" : "false"}
            className={cn(
              "gh-tree-row group",
              isActive && "gh-tree-row-active",
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
        <p className="gh-tree-empty">This directory has no readable entries.</p>
      ) : null}
    </div>
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

function shortSha(value: string) {
  return value.slice(0, 7);
}

function formatRelativeDate(value: string | null) {
  if (value === null) return "";
  const timestamp = new Date(value).valueOf();
  if (Number.isNaN(timestamp)) return "";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function formatBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
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
