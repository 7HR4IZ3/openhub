import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v, type Infer } from "convex/values";
import type { FunctionReference } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { decryptProviderToken } from "./provider-tokens";

const repositoryValidator = v.object({
  provider: v.literal("github"), providerRepositoryId: v.string(), ownerLogin: v.string(), name: v.string(),
  fullName: v.string(), description: v.union(v.string(), v.null()), url: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")), defaultBranch: v.union(v.string(), v.null()),
  primaryLanguage: v.union(v.string(), v.null()), stars: v.number(), forks: v.number(), openIssues: v.number(),
  licenseSpdxId: v.union(v.string(), v.null()), topics: v.array(v.string()), updatedAt: v.string(), createdAt: v.string(),
  pushedAt: v.union(v.string(), v.null()), homepageUrl: v.union(v.string(), v.null()), isArchived: v.boolean(),
  isFork: v.boolean(), watchers: v.number(),
});
const entryValidator = v.object({ name: v.string(), path: v.string(), kind: v.union(v.literal("file"), v.literal("directory"), v.literal("submodule")), oid: v.string(), byteSize: v.union(v.number(), v.null()) });
const fileValidator = v.object({ path: v.string(), commitSha: v.string(), oid: v.string(), text: v.string(), byteSize: v.union(v.number(), v.null()) });
const resultValidator = v.object({ repository: repositoryValidator, sourceRef: v.string(), treePath: v.string(), entries: v.array(entryValidator), file: v.union(fileValidator, v.null()) });

type CacheRefs = {
  get: FunctionReference<"query", "internal", {
    scopeKey: string; provider: "github"; repositoryFullName: string;
    kind: "repository" | "commit" | "tree" | "file"; ref: string; pathKey: string;
  }, Doc<"repositoryCacheEntries"> | null>;
  put: FunctionReference<"mutation", "internal", {
    scopeKey: string; ownerUserId?: Id<"users">; provider: "github";
    repositoryFullName: string; kind: "repository" | "commit" | "tree" | "file";
    ref: string; pathKey: string; commitSha?: string; payload: string;
    etag?: string; lastModified?: string; fetchedAt: number; expiresAt: number; staleUntil: number;
  }, Id<"repositoryCacheEntries">>;
  touch: FunctionReference<"mutation", "internal", { id: Id<"repositoryCacheEntries">; fetchedAt: number; expiresAt: number; staleUntil: number }, null>;
  recordFailure: FunctionReference<"mutation", "internal", { id: Id<"repositoryCacheEntries">; message: string }, null>;
  consumeProviderRequest: FunctionReference<"mutation", "internal", { scopeKey: string; provider: "github"; windowKey: string; requestLimit: number; resetAt: number }, boolean>;
};
const cacheRefs: CacheRefs = (internal as unknown as { repositoryCache: CacheRefs }).repositoryCache;
type PrivateRepositoryView = Infer<typeof resultValidator>;

export const getView = action({
  args: { owner: v.string(), name: v.string(), ref: v.optional(v.string()), path: v.optional(v.string()) },
  returns: resultValidator,
  handler: async (ctx, args): Promise<PrivateRepositoryView> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required");
    const account = await ctx.runQuery(internal.auth.providerTokenForUser, { userId });
    if (account === null) throw new ConvexError("Private GitHub access is not connected");
    const token = await decryptProviderToken(account.encryptedTokenRef);
    if (token === null) throw new ConvexError("Private GitHub access is not available in this deployment");
    validateSegment(args.owner, "owner");
    validateSegment(args.name, "repository");
    const scopeKey = `user:${String(userId)}:github:${account.providerUserId}`;
    const repositoryKey = `${args.owner}/${args.name}`.toLowerCase();
    const identityResponse = await githubJson(
      ctx,
      userId,
      token,
      scopeKey,
      "__account__",
      "repository",
      "identity",
      "",
      "/user",
      300_000,
    );
    const identity = record(identityResponse);
    const identityId = typeof identity.id === "number" ? String(identity.id) : typeof identity.id === "string" ? identity.id : null;
    const identityLogin = typeof identity.login === "string" ? identity.login : null;
    if (identityId !== account.providerUserId || identityLogin?.toLowerCase() !== account.login.toLowerCase()) {
      throw new ConvexError("GitHub identity validation failed");
    }
    const repositoryResponse = await githubJson(
      ctx,
      userId,
      token,
      scopeKey,
      repositoryKey,
      "repository",
      "",
      "",
      `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}`,
      120_000,
    );
    const repository = normalizeRepository(repositoryResponse);
    const requestedRef = safeRef(args.ref) ?? repository.defaultBranch ?? "main";
    const commitResponse = await githubJson(
      ctx,
      userId,
      token,
      scopeKey,
      repositoryKey,
      "commit",
      requestedRef,
      "",
      `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}/commits/${encodeURIComponent(requestedRef)}`,
      120_000,
    );
    const sourceRef = readCommitSha(record(commitResponse));
    const requestedPath = args.path === undefined ? null : safePath(args.path);
    const root = await githubJson(
      ctx,
      userId,
      token,
      scopeKey,
      repositoryKey,
      "tree",
      sourceRef,
      requestedPath ?? "",
      contentsUrl(args.owner, args.name, requestedPath, sourceRef),
      60_000,
    );
    let entries: Array<{ name: string; path: string; kind: "file" | "directory" | "submodule"; oid: string; byteSize: number | null }> = [];
    let file: { path: string; commitSha: string; oid: string; text: string; byteSize: number | null } | null = null;
    let treePath = requestedPath ?? "";

    if (Array.isArray(root)) {
      entries = root.slice(0, 500).map(normalizeEntry);
      const readme = requestedPath === null ? entries.find((entry) => entry.kind === "file" && /^readme(?:\.[^/]+)?$/i.test(entry.name)) : undefined;
      if (readme) {
        file = await readFile(ctx, userId, token, scopeKey, repositoryKey, args.owner, args.name, readme.path, sourceRef, sourceRef);
      }
    } else {
      file = await normalizeFile(root, requestedPath ?? "", sourceRef);
      treePath = parentDirectory(file.path);
      const parent = await githubJson(
        ctx,
        userId,
        token,
        scopeKey,
        repositoryKey,
        "tree",
        sourceRef,
        treePath,
        contentsUrl(args.owner, args.name, treePath || null, sourceRef),
        60_000,
      );
      if (Array.isArray(parent)) entries = parent.slice(0, 500).map(normalizeEntry);
    }

    return { repository, sourceRef, treePath, entries, file };
  },
});

async function readFile(
  ctx: ActionCtx,
  userId: Id<"users">,
  token: string,
  scopeKey: string,
  repositoryKey: string,
  owner: string,
  name: string,
  path: string,
  ref: string,
  commitSha: string,
): Promise<Infer<typeof fileValidator>> {
  const value: unknown = await githubJson(
    ctx,
    userId,
    token,
    scopeKey,
    repositoryKey,
    "file",
    ref,
    path,
    contentsUrl(owner, name, path, ref),
    86_400_000,
  );
  return normalizeFile(value, path, commitSha);
}

async function normalizeFile(value: unknown, fallbackPath: string, commitSha: string) {
  const row = record(value);
  if (row.type !== "file") throw new ConvexError("GitHub returned a non-file object");
  const encoded = typeof row.content === "string" ? row.content.replace(/\s/g, "") : "";
  if (encoded.length > 1_400_000 || row.encoding !== "base64") throw new ConvexError("This file is too large to browse");
  let text = "";
  try {
    text = new TextDecoder().decode(fromBase64(encoded));
  } catch {
    throw new ConvexError("GitHub returned invalid file content");
  }
  if (text.length > 700_000) throw new ConvexError("This file is too large to browse");
  return { path: typeof row.path === "string" ? row.path : fallbackPath, commitSha, oid: readString(row, "sha"), text, byteSize: numberOrNull(row.size) };
}

function normalizeRepository(value: unknown) {
  const row = record(value);
  const owner = record(row.owner);
  const license = row.license === null ? null : row.license === undefined ? null : record(row.license);
  return {
    provider: "github" as const, providerRepositoryId: readString(row, "node_id", String(readNumber(row, "id"))),
    ownerLogin: readString(owner, "login"), name: readString(row, "name"), fullName: readString(row, "full_name"),
    description: stringOrNull(row.description), url: readString(row, "html_url"), visibility: row.private === true ? "private" as const : "public" as const,
    defaultBranch: stringOrNull(row.default_branch), primaryLanguage: stringOrNull(row.language), stars: readNumber(row, "stargazers_count"),
    forks: readNumber(row, "forks_count"), openIssues: readNumber(row, "open_issues_count"), licenseSpdxId: license ? stringOrNull(license.spdx_id) : null,
    topics: Array.isArray(row.topics) ? row.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 50) : [],
    updatedAt: readString(row, "updated_at"), createdAt: readString(row, "created_at"), pushedAt: stringOrNull(row.pushed_at), homepageUrl: stringOrNull(row.homepage),
    isArchived: row.archived === true, isFork: row.fork === true, watchers: readNumber(row, "watchers_count"),
  };
}

function normalizeEntry(value: unknown) {
  const row = record(value);
  const type = row.type === "dir" ? "directory" : row.type === "submodule" ? "submodule" : "file";
  return { name: readString(row, "name"), path: readString(row, "path"), kind: type as "file" | "directory" | "submodule", oid: readString(row, "sha"), byteSize: numberOrNull(row.size) };
}

async function githubJson(
  ctx: ActionCtx,
  userId: Id<"users">,
  token: string,
  scopeKey: string,
  repositoryKey: string,
  kind: "repository" | "commit" | "tree" | "file",
  ref: string,
  pathKey: string,
  path: string,
  ttlMs: number,
): Promise<unknown> {
  const cached: Doc<"repositoryCacheEntries"> | null = await ctx.runQuery(cacheRefs.get, {
    scopeKey,
    provider: "github",
    repositoryFullName: repositoryKey,
    kind,
    ref,
    pathKey,
  });
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    try {
      return JSON.parse(cached.payload) as unknown;
    } catch {
      // A malformed cache row is treated as a miss and replaced below.
    }
  }

  try {
    const windowStart = Math.floor(now / 60_000);
    const allowed = await ctx.runMutation(cacheRefs.consumeProviderRequest, {
      scopeKey,
      provider: "github",
      windowKey: String(windowStart),
      requestLimit: 60,
      resetAt: (windowStart + 1) * 60_000,
    });
    if (!allowed) throw new ConvexError("GitHub request limit reached for this private workspace; try again shortly");

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "OpenHub",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;
    const response = await fetch(`https://api.github.com${path}`, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 304 && cached) {
      await ctx.runMutation(cacheRefs.touch, {
        id: cached._id,
        fetchedAt: now,
        expiresAt: now + ttlMs,
        staleUntil: now + ttlMs * 4,
      });
      return JSON.parse(cached.payload) as unknown;
    }
    const raw = await response.text();
    if (response.status === 403 || response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const reset = response.headers.get("x-ratelimit-reset");
      const retryText = retryAfter ? ` Retry after ${retryAfter} seconds.` : reset ? ` Retry after ${new Date(Number(reset) * 1_000).toISOString()}.` : "";
      throw new ConvexError(`GitHub rate limit reached.${retryText}`);
    }
    if (!response.ok) throw new ConvexError(response.status === 404 ? "Private repository or path not found" : "GitHub private access failed");
    if (raw.length > 2_000_000) throw new ConvexError("GitHub response is too large");
    let value: unknown;
    try { value = JSON.parse(raw) as unknown; } catch { throw new ConvexError("GitHub returned invalid data"); }
    if (raw.length <= 900_000) {
      const valueRecord = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
      const commitSha = valueRecord && typeof valueRecord.sha === "string" ? valueRecord.sha : undefined;
      await ctx.runMutation(cacheRefs.put, {
        scopeKey,
        ownerUserId: userId,
        provider: "github",
        repositoryFullName: repositoryKey,
        kind,
        ref,
        pathKey,
        ...(commitSha ? { commitSha } : {}),
        payload: raw,
        ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
        ...(response.headers.get("last-modified") ? { lastModified: response.headers.get("last-modified")! } : {}),
        fetchedAt: now,
        expiresAt: now + ttlMs,
        staleUntil: now + ttlMs * 4,
      });
    }
    return value;
  } catch (error) {
    if (cached && cached.staleUntil > now) {
      try {
        return JSON.parse(cached.payload) as unknown;
      } catch {
        // Fall through to the provider error when the stale payload is invalid.
      }
    }
    if (cached) {
      await ctx.runMutation(cacheRefs.recordFailure, {
        id: cached._id,
        message: error instanceof Error ? error.message : "GitHub request failed",
      });
    }
    throw error;
  }
}

function contentsUrl(owner: string, name: string, path: string | null, ref: string) {
  const suffix = path ? "/" + path.split("/").map(encodeURIComponent).join("/") : "";
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents${suffix}?ref=${encodeURIComponent(ref)}`;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConvexError("Invalid GitHub response");
  return value as Record<string, unknown>;
}
function readString(value: Record<string, unknown>, key: string, fallback?: string) {
  const result = value[key];
  if (typeof result === "string" && result.length > 0) return result;
  if (fallback !== undefined) return fallback;
  throw new ConvexError(`GitHub response is missing ${key}`);
}
function readCommitSha(value: Record<string, unknown>) {
  const sha = readString(value, "sha");
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new ConvexError("GitHub returned an invalid commit");
  return sha;
}
function readNumber(value: Record<string, unknown>, key: string) {
  const result = value[key];
  if (typeof result !== "number" || !Number.isSafeInteger(result) || result < 0) throw new ConvexError(`GitHub response has invalid ${key}`);
  return result;
}
function numberOrNull(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null; }
function stringOrNull(value: unknown) { return typeof value === "string" ? value : null; }
function validateSegment(value: string, label: string) { if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(value)) throw new ConvexError(`Invalid GitHub ${label}`); }
function safeRef(value: string | undefined) { return value && value.length <= 255 && !value.startsWith("/") && !value.includes("..") && !/[\u0000-\u001f\u007f]/.test(value) ? value : undefined; }
function safePath(value: string) { if (value.length > 500 || !value || value.startsWith("/") || value.split("/").some((part) => part === ".." || !part)) throw new ConvexError("Invalid repository path"); return value; }
function parentDirectory(path: string) { const separator = path.lastIndexOf("/"); return separator === -1 ? "" : path.slice(0, separator); }
function fromBase64(value: string) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return bytes; }
