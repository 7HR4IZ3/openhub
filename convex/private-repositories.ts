import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
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

export const getView = action({
  args: { owner: v.string(), name: v.string(), ref: v.optional(v.string()), path: v.optional(v.string()) },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Sign in required");
    const account = await ctx.runQuery(internal.auth.providerTokenForUser, { userId });
    if (account === null) throw new ConvexError("Private GitHub access is not connected");
    const token = await decryptProviderToken(account.encryptedTokenRef);
    if (token === null) throw new ConvexError("Private GitHub access is not available in this deployment");
    validateSegment(args.owner, "owner");
    validateSegment(args.name, "repository");
    const repositoryResponse = await githubJson(token, `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}`);
    const repository = normalizeRepository(repositoryResponse);
    const requestedRef = safeRef(args.ref) ?? repository.defaultBranch ?? "main";
    const commitResponse = await githubJson(token, `/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.name)}/commits/${encodeURIComponent(requestedRef)}`);
    const sourceRef = readString(record(commitResponse), "sha");
    const requestedPath = args.path === undefined ? null : safePath(args.path);
    const root = await githubJson(token, contentsUrl(args.owner, args.name, requestedPath, requestedRef));
    let entries: Array<{ name: string; path: string; kind: "file" | "directory" | "submodule"; oid: string; byteSize: number | null }> = [];
    let file: { path: string; commitSha: string; oid: string; text: string; byteSize: number | null } | null = null;
    let treePath = requestedPath ?? "";

    if (Array.isArray(root)) {
      entries = root.slice(0, 500).map(normalizeEntry);
      const readme = requestedPath === null ? entries.find((entry) => entry.kind === "file" && /^readme(?:\.[^/]+)?$/i.test(entry.name)) : undefined;
      if (readme) {
        file = await readFile(token, args.owner, args.name, readme.path, requestedRef, sourceRef);
      }
    } else {
      file = await normalizeFile(root, requestedPath ?? "", sourceRef);
      treePath = parentDirectory(file.path);
      const parent = await githubJson(token, contentsUrl(args.owner, args.name, treePath || null, requestedRef));
      if (Array.isArray(parent)) entries = parent.slice(0, 500).map(normalizeEntry);
    }

    return { repository, sourceRef, treePath, entries, file };
  },
});

async function readFile(token: string, owner: string, name: string, path: string, ref: string, commitSha: string) {
  const value = await githubJson(token, contentsUrl(owner, name, path, ref));
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

async function githubJson(token: string, path: string) {
  const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "OpenHub", "X-GitHub-Api-Version": "2022-11-28" }, redirect: "error", signal: AbortSignal.timeout(15_000) });
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new ConvexError("GitHub response is too large");
  if (!response.ok) throw new ConvexError(response.status === 404 ? "Private repository or path not found" : "GitHub private access failed");
  try { return JSON.parse(raw) as unknown; } catch { throw new ConvexError("GitHub returned invalid data"); }
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
