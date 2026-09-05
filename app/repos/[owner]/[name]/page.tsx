import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Github, LockKeyhole } from "lucide-react";

import { RepositoryWorkspace } from "@/components/repository/repository-workspace";
import { Button } from "@/components/ui/button";
import type {
  NormalizedRepository,
  RepositoryFile,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "@/lib/providers/types";
import { getPublicGitHubProvider } from "@/lib/providers/server";

export const dynamic = "force-dynamic";

type RepositoryPageProps = {
  params: Promise<{ owner: string; name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepositoryPage({
  params,
  searchParams,
}: RepositoryPageProps) {
  const { owner, name } = await params;
  const query = await searchParams;

  if (!isRepositorySegment(owner) || !isRepositorySegment(name)) {
    notFound();
  }

  const provider = getPublicGitHubProvider();
  if (provider === null) {
    return <RepositoryUnavailable />;
  }

  const result = await loadRepositoryView(provider, owner, name, query);
  if (result.kind === "not-found") {
    notFound();
  }
  if (result.kind === "error") {
    return <RepositoryError />;
  }

  return (
    <RepositoryWorkspace
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
      repository={result.repository}
      sourceRef={result.sourceRef}
      treePath={result.treePath}
      entries={result.entries}
      file={result.file}
      surfaces={result.surfaces}
    />
  );
}

type RepositoryViewResult =
  | {
      kind: "success";
      repository: NormalizedRepository;
      sourceRef: string;
      treePath: string;
      entries: RepositoryTreeEntry[];
      file: RepositoryFile | null;
      surfaces: RepositorySurfaces;
    }
  | { kind: "not-found" }
  | { kind: "error" };

async function loadRepositoryView(
  provider: NonNullable<ReturnType<typeof getPublicGitHubProvider>>,
  owner: string,
  name: string,
  query: Record<string, string | string[] | undefined>,
): Promise<RepositoryViewResult> {
  try {
    const repository = await provider.getRepository({ owner, name });
    if (repository === null || repository.visibility !== "public") {
      return { kind: "not-found" };
    }

    let sourceRef = safeRef(
      readParam(query.ref),
      repository.defaultBranch ?? "main",
    );
    const fallbackRef = repository.defaultBranch ?? "main";
    let surfaces = emptyRepositorySurfaces();

    try {
      surfaces = await provider.getRepositorySurfaces({ owner, name, ref: sourceRef });
      if (surfaces.resolvedRefSha === null && sourceRef !== fallbackRef) {
        sourceRef = fallbackRef;
        surfaces = await provider.getRepositorySurfaces({
          owner,
          name,
          ref: sourceRef,
        });
      }
    } catch (error) {
      console.error("Repository surfaces failed", error);
    }

    const requestedPath = safePath(readParam(query.path));
    let entries: RepositoryTreeEntry[] = [];
    let file: RepositoryFile | null = null;
    let treePath = requestedPath ?? "";

    if (requestedPath !== null) {
      file = await provider.getFile({
        owner,
        name,
        path: requestedPath,
        ref: sourceRef,
      });
      if (file !== null) treePath = parentDirectory(file.path);
    }

    entries = await provider.getTree({
      owner,
      name,
      ref: sourceRef,
      path: treePath || undefined,
    });

    if (requestedPath === null) {
      const readme = entries.find(
        (entry) => entry.kind === "file" && /^readme(?:\.[^/]+)?$/i.test(entry.name),
      );
      if (readme !== undefined) {
        file = await provider.getFile({
          owner,
          name,
          path: readme.path,
          ref: sourceRef,
        });
      }
    }

    return {
      kind: "success",
      repository,
      sourceRef,
      treePath,
      entries,
      file,
      surfaces,
    };
  } catch (error) {
    console.error("Repository workspace failed", error);
    return { kind: "error" };
  }
}

function emptyRepositorySurfaces(): RepositorySurfaces {
  return {
    refs: [],
    commits: [],
    issues: [],
    pullRequests: [],
    releases: [],
    contributors: [],
    license: null,
    resolvedRefSha: null,
  };
}

function RepositoryUnavailable() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 dark:bg-[#111310] md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to explore
        </Link>
        <section className="my-auto py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9e6dc] dark:bg-white/[0.08]">
            <Github className="h-5 w-5 text-[#9b4d31] dark:text-[#e99970]" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            GitHub provider
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            The reading room is waiting for its source.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Repository browsing is implemented, but this deployment still needs
            its server-side public GitHub credential before it can request source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href="/explore">
                Return to discovery
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <Link href="/signin">Connect GitHub</Link>
            </Button>
          </div>
          <p className="mt-8 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <LockKeyhole className="mt-1 h-4 w-4 shrink-0" />
            The credential belongs on the server only. It is never sent to this page.
          </p>
        </section>
      </div>
    </main>
  );
}

function RepositoryError() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 dark:bg-[#111310] md:px-8 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to explore
        </Link>
        <h1 className="mt-20 text-4xl font-semibold tracking-[-0.05em]">
          GitHub could not open this repository.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          The provider request failed or the selected source is no longer available.
          Try again, or open the original repository directly on GitHub.
        </p>
      </div>
    </main>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isRepositorySegment(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value);
}

function safeRef(value: string | undefined, fallback: string) {
  if (
    value === undefined ||
    value.length === 0 ||
    value.length > 120 ||
    value.includes("..") ||
    !/^[a-zA-Z0-9._/-]+$/.test(value)
  ) {
    return fallback;
  }
  return value;
}

function safePath(value: string | undefined) {
  if (value === undefined || value.length === 0 || value.length > 1000) {
    return null;
  }

  const normalized = value.replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (
    normalized.length === 0 ||
    normalized.includes(String.fromCharCode(0)) ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    return null;
  }
  return normalized;
}

function parentDirectory(path: string) {
  const separator = path.lastIndexOf("/");
  return separator === -1 ? "" : path.slice(0, separator);
}
