import { PostComposer } from "@/components/compose/post-composer";
import { getPublicGitHubProvider } from "@/lib/providers/server";
import type { SourceContext } from "@/lib/source-references";

export const dynamic = "force-dynamic";

type ComposePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { title: "Write a post" };

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const query = await searchParams;
  const request = readSourceRequest(query);
  const loaded =
    request === null
      ? { source: null, error: null }
      : await loadSource(request);

  return (
    <PostComposer
      source={loaded.source}
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
