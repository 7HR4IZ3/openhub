import "server-only";

import type {
  NormalizedRepository,
  RepositoryFile,
  RepositoryProvider,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "./types";

export type RepositoryViewResult =
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

export async function loadRepositoryView(
  provider: RepositoryProvider,
  owner: string,
  name: string,
  query: Record<string, string | string[] | undefined>,
): Promise<RepositoryViewResult> {
  try {
    const repository = await provider.getRepository({ owner, name });
    if (repository === null || repository.visibility !== "public") return { kind: "not-found" };

    let sourceRef = safeRef(readParam(query.ref), repository.defaultBranch ?? "main");
    const fallbackRef = repository.defaultBranch ?? "main";
    let surfaces = emptyRepositorySurfaces();
    try {
      surfaces = await provider.getRepositorySurfaces({ owner, name, ref: sourceRef });
      if (surfaces.resolvedRefSha === null && sourceRef !== fallbackRef) {
        sourceRef = fallbackRef;
        surfaces = await provider.getRepositorySurfaces({ owner, name, ref: sourceRef });
      }
    } catch (error) {
      console.error("Repository surfaces failed", error);
    }

    const requestedPath = safePath(readParam(query.path));
    let entries: RepositoryTreeEntry[] = [];
    let file: RepositoryFile | null = null;
    let treePath = requestedPath ?? "";

    if (requestedPath !== null) {
      file = await provider.getFile({ owner, name, path: requestedPath, ref: sourceRef });
      if (file !== null) treePath = parentDirectory(file.path);
    }

    entries = await provider.getTree({ owner, name, ref: sourceRef, path: treePath || undefined });

    return { kind: "success", repository, sourceRef, treePath, entries, file, surfaces };
  } catch (error) {
    console.error("Repository workspace failed", error);
    return { kind: "error" };
  }
}

export function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isRepositorySegment(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value);
}

export function isRepositoryOwner(value: string, provider: string) {
  if (provider === "gitlab") return value.split("/").every(isRepositorySegment) && value.length <= 240;
  return isRepositorySegment(value);
}

function safeRef(value: string | undefined, fallback: string) {
  if (value === undefined || value.length === 0 || value.length > 120 || value.includes("..") || !/^[a-zA-Z0-9._/-]+$/.test(value)) return fallback;
  return value;
}

function safePath(value: string | undefined) {
  if (value === undefined || value.length === 0 || value.length > 1000) return null;
  const normalized = value.replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (normalized.length === 0 || normalized.includes(String.fromCharCode(0)) || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return null;
  return normalized;
}

function parentDirectory(path: string) {
  const separator = path.lastIndexOf("/");
  return separator === -1 ? "" : path.slice(0, separator);
}

function emptyRepositorySurfaces(): RepositorySurfaces {
  return { refs: [], commits: [], issues: [], pullRequests: [], releases: [], contributors: [], license: null, resolvedRefSha: null };
}
