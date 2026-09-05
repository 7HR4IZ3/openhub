import { PostComposer } from "@/components/compose/post-composer";
import { getPublicGitHubProvider } from "@/lib/providers/server";
import type { RepositoryFile } from "@/lib/providers/types";
import type { DiffContext, SourceContext } from "@/lib/source-references";

export const dynamic = "force-dynamic";

type ComposePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { title: "Write a post" };

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const query = await searchParams;
  const diffRequest = readDiffRequest(query);
  const sourceRequest = diffRequest === null ? readSourceRequest(query) : null;
  const loaded = diffRequest !== null
    ? await loadDiff(diffRequest)
    : sourceRequest === null
      ? { source: null, diff: null, error: null }
      : { ...(await loadSource(sourceRequest)), diff: null };

  return (
    <PostComposer
      source={loaded.source}
      diff={loaded.diff}
      sourceError={loaded.error}
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}

type SourceRequest = {
  owner: string;
  name: string;
  path: string;
  ref: string;
  startLine?: number;
  endLine?: number;
};

type DiffRequest = {
  owner: string;
  name: string;
  path: string;
  baseCommitSha: string;
  headCommitSha: string;
};

function readDiffRequest(
  query: Record<string, string | string[] | undefined>,
): DiffRequest | null {
  const base = readParam(query.base);
  const head = readParam(query.head);
  if (base === undefined && head === undefined) return null;

  const owner = readParam(query.owner);
  const name = readParam(query.name);
  const path = safePath(readParam(query.path));
  if (
    owner === undefined ||
    name === undefined ||
    !isRepositorySegment(owner) ||
    !isRepositorySegment(name) ||
    path === null ||
    !safeCommit(base) ||
    !safeCommit(head) ||
    base === head
  ) {
    return { owner: "", name: "", path: "", baseCommitSha: "", headCommitSha: "" };
  }
  return { owner, name, path, baseCommitSha: base, headCommitSha: head };
}

function readSourceRequest(
  query: Record<string, string | string[] | undefined>,
): SourceRequest | null {
  const owner = readParam(query.owner);
  const name = readParam(query.name);
  const path = safePath(readParam(query.path));
  const ref = safeRef(readParam(query.ref));

  if (owner === undefined && name === undefined && path === null && ref === null) {
    return null;
  }

  if (
    owner === undefined ||
    name === undefined ||
    !isRepositorySegment(owner) ||
    !isRepositorySegment(name) ||
    path === null ||
    ref === null
  ) {
    return { owner: "", name: "", path: "", ref: "" };
  }

  const startValue = readParam(query.startLine);
  const endValue = readParam(query.endLine);
  const startLine = parseLine(startValue);
  const endLine = parseLine(endValue);
  if (
    (startValue !== undefined && startLine === undefined) ||
    (endValue !== undefined && endLine === undefined)
  ) {
    return { owner: "", name: "", path: "", ref: "" };
  }

  return { owner, name, path, ref, startLine, endLine };
}

async function loadSource(request: SourceRequest): Promise<{
  source: SourceContext | null;
  error: string | null;
}> {
  if (!request.owner || !request.name || !request.path || !request.ref) {
    return { source: null, error: "The source link is incomplete or invalid." };
  }

  const provider = getPublicGitHubProvider();
  if (provider === null) {
    return {
      source: null,
      error: "GitHub source preview needs the server-side public provider to be configured.",
    };
  }

  try {
    const repository = await provider.getRepository({
      owner: request.owner,
      name: request.name,
    });
    if (repository === null || repository.visibility !== "public") {
      return {
        source: null,
        error: "Only public repository source can be attached here.",
      };
    }

    const file = await provider.getFile({
      owner: request.owner,
      name: request.name,
      path: request.path,
      ref: request.ref,
    });
    if (file === null) {
      return {
        source: null,
        error: "GitHub could not find that file at the selected commit.",
      };
    }

    const lines = file.text.split(/\r?\n/);
    const startLine = clampLine(request.startLine ?? 1, lines.length);
    const endLine = clampLine(request.endLine ?? lines.length, lines.length);
    if (endLine < startLine) {
      return {
        source: null,
        error: "The selected source line range is invalid.",
      };
    }

    return {
      source: {
        provider: "github",
        repositoryId: repository.providerRepositoryId,
        repositoryFullName: repository.fullName,
        repositoryName: repository.name,
        originalOwner: repository.ownerLogin,
        path: file.path,
        commitSha: file.commitSha,
        startLine,
        endLine,
        language: languageForPath(file.path, repository.primaryLanguage),
        canonicalUrl: buildGitHubSourceUrl(
          repository.fullName,
          file.commitSha,
          file.path,
          startLine,
          endLine,
        ),
        licenseSpdxId: repository.licenseSpdxId ?? undefined,
        visibility: "public",
        sourceSnapshot: lines.slice(startLine - 1, endLine).join("\n"),
      },
      error: null,
    };
  } catch (error) {
    console.error("Source attachment failed", error);
    return {
      source: null,
      error: "GitHub could not load that source right now. Try opening the file again.",
    };
  }
}

async function loadDiff(request: DiffRequest): Promise<{
  source: null;
  diff: DiffContext | null;
  error: string | null;
}> {
  if (!request.owner || !request.name || !request.path || !request.baseCommitSha || !request.headCommitSha) {
    return { source: null, diff: null, error: "The diff link is incomplete or invalid." };
  }

  const provider = getPublicGitHubProvider();
  if (provider === null) {
    return {
      source: null,
      diff: null,
      error: "GitHub diff preview needs the server-side public provider to be configured.",
    };
  }

  try {
    const repository = await provider.getRepository({ owner: request.owner, name: request.name });
    if (repository === null || repository.visibility !== "public") {
      return { source: null, diff: null, error: "Only public repositories can be compared here." };
    }

    const [baseFile, headFile] = await Promise.all([
      provider.getFile({ owner: request.owner, name: request.name, path: request.path, ref: request.baseCommitSha }),
      provider.getFile({ owner: request.owner, name: request.name, path: request.path, ref: request.headCommitSha }),
    ]);
    if (baseFile === null && headFile === null) {
      return { source: null, diff: null, error: "GitHub could not find that file at either commit." };
    }
    const baseSnapshot = boundedSnapshot(baseFile);
    const headSnapshot = boundedSnapshot(headFile);
    if (baseSnapshot === null || headSnapshot === null) {
      return { source: null, diff: null, error: "This file is too large to compare in OpenHub." };
    }

    return {
      source: null,
      diff: {
        provider: "github",
        repositoryId: repository.providerRepositoryId,
        repositoryFullName: repository.fullName,
        repositoryName: repository.name,
        originalOwner: repository.ownerLogin,
        path: request.path,
        baseCommitSha: baseFile?.commitSha ?? request.baseCommitSha,
        headCommitSha: headFile?.commitSha ?? request.headCommitSha,
        language: languageForPath(request.path, repository.primaryLanguage),
        canonicalUrl: `https://github.com/${repository.fullName}/compare/${request.baseCommitSha}...${request.headCommitSha}`,
        licenseSpdxId: repository.licenseSpdxId ?? undefined,
        visibility: "public",
        baseSnapshot,
        headSnapshot,
      },
      error: null,
    };
  } catch (error) {
    console.error("Diff attachment failed", error);
    return { source: null, diff: null, error: "GitHub could not load that comparison right now. Try again." };
  }
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isRepositorySegment(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value);
}

function safeRef(value: string | undefined) {
  if (
    value === undefined ||
    value.length === 0 ||
    value.length > 120 ||
    value.includes("..") ||
    !/^[a-zA-Z0-9._/-]+$/.test(value)
  ) {
    return null;
  }
  return value;
}

function safeCommit(value: string | undefined): value is string {
  return value !== undefined && /^[a-f0-9]{40}$/i.test(value);
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
    segments.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return null;
  }
  return normalized;
}

function parseLine(value: string | undefined) {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const line = Number(value);
  return Number.isSafeInteger(line) && line > 0 ? line : undefined;
}

function clampLine(value: number, totalLines: number) {
  return Math.min(Math.max(1, value), Math.max(1, totalLines));
}

function boundedSnapshot(file: RepositoryFile | null) {
  if (file === null) return "";
  if (new TextEncoder().encode(file.text).length > 512_000) return null;
  return file.text;
}

function languageForPath(path: string, primaryLanguage: string | null) {
  const extension = path.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    css: "CSS",
    go: "Go",
    html: "HTML",
    js: "JavaScript",
    jsx: "JavaScript",
    md: "Markdown",
    py: "Python",
    rb: "Ruby",
    rs: "Rust",
    ts: "TypeScript",
    tsx: "TypeScript",
  };
  return languages[extension ?? ""] ?? primaryLanguage ?? undefined;
}

function buildGitHubSourceUrl(
  fullName: string,
  commitSha: string,
  path: string,
  startLine: number,
  endLine: number,
) {
  const anchor =
    startLine === endLine ? `#L${startLine}` : `#L${startLine}-L${endLine}`;
  return `https://github.com/${fullName}/blob/${commitSha}/${path.split("/").map(encodeURIComponent).join("/")}${anchor}`;
}
