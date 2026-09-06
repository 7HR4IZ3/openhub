import "server-only";

import type { NormalizedRepository, RepositorySearchResult } from "./types";

type JsonRecord = Record<string, unknown>;

export async function searchGitLab(query: string): Promise<RepositorySearchResult> {
  const response = await fetch(`https://gitlab.com/api/v4/projects?search=${encodeURIComponent(query)}&simple=true&per_page=20&order_by=last_activity_at&sort=desc`, { headers: { Accept: "application/json", "User-Agent": "OpenHub" }, signal: AbortSignal.timeout(10_000), cache: "force-cache", next: { revalidate: 120 } });
  if (!response.ok) throw new Error(response.status === 429 ? "GitLab search rate limit reached" : "GitLab search failed");
  const data = await response.json() as unknown;
  if (!Array.isArray(data)) return { items: [], hasNextPage: false, cursor: null };
  return { items: data.filter(isRecord).map(normalizeGitLab).filter((item): item is NormalizedRepository => item !== null), hasNextPage: false, cursor: null };
}

export async function searchBitbucket(query: string): Promise<RepositorySearchResult> {
  const response = await fetch(`https://api.bitbucket.org/2.0/repositories/?q=name~"${encodeURIComponent(query.replace(/"/g, ""))}"&pagelen=20`, { headers: { Accept: "application/json", "User-Agent": "OpenHub" }, signal: AbortSignal.timeout(10_000), cache: "force-cache", next: { revalidate: 120 } });
  if (!response.ok) throw new Error(response.status === 429 ? "Bitbucket search rate limit reached" : "Bitbucket search failed");
  const data = await response.json() as unknown;
  const values = isRecord(data) && Array.isArray(data.values) ? data.values : [];
  return { items: values.filter(isRecord).map(normalizeBitbucket).filter((item): item is NormalizedRepository => item !== null), hasNextPage: false, cursor: null };
}

export async function searchCodeberg(query: string): Promise<RepositorySearchResult> {
  const response = await fetch(`https://codeberg.org/api/v1/repos/search?q=${encodeURIComponent(query)}&limit=20`, { headers: { Accept: "application/json", "User-Agent": "OpenHub" }, signal: AbortSignal.timeout(10_000), cache: "force-cache", next: { revalidate: 120 } });
  if (!response.ok) throw new Error(response.status === 429 ? "Codeberg search rate limit reached" : "Codeberg search failed");
  const data = await response.json() as unknown;
  const values = isRecord(data) && Array.isArray(data.data) ? data.data : [];
  return { items: values.filter(isRecord).map(normalizeCodeberg).filter((item): item is NormalizedRepository => item !== null), hasNextPage: false, cursor: null };
}

function normalizeGitLab(value: JsonRecord): NormalizedRepository | null {
  const namespace = isRecord(value.namespace) ? value.namespace : null;
  const owner = stringValue(namespace?.full_path) ?? stringValue(namespace?.path);
  const name = stringValue(value.name);
  const fullName = stringValue(value.path_with_namespace) ?? (owner && name ? `${owner}/${name}` : null);
  const id = stringValue(value.id) ?? stringValue(value.path_with_namespace);
  if (!owner || !name || !fullName || !id) return null;
  return { provider: "gitlab", providerRepositoryId: id, ownerLogin: owner, name, fullName, description: nullableString(value.description), url: stringValue(value.web_url) ?? `https://gitlab.com/${fullName}`, visibility: value.visibility === "private" ? "private" : "public", defaultBranch: nullableString(value.default_branch), primaryLanguage: null, stars: numberValue(value.star_count), forks: numberValue(value.forks_count), openIssues: numberValue(value.open_issues_count), licenseSpdxId: null, topics: arrayStrings(value.topics), updatedAt: stringValue(value.last_activity_at) ?? new Date(0).toISOString(), createdAt: stringValue(value.created_at) ?? new Date(0).toISOString(), pushedAt: stringValue(value.last_activity_at), homepageUrl: null, isArchived: false, isFork: Boolean(value.forked_from_project), watchers: 0 };
}

function normalizeBitbucket(value: JsonRecord): NormalizedRepository | null {
  const ownerValue = isRecord(value.owner) ? value.owner : null;
  const owner = stringValue(ownerValue?.nickname) ?? stringValue(ownerValue?.username) ?? stringValue(ownerValue?.display_name);
  const name = stringValue(value.name);
  const fullNameValue = isRecord(value.full_name) ? null : stringValue(value.full_name);
  const fullName = fullNameValue ?? (owner && name ? `${owner}/${name}` : null);
  const id = stringValue(value.uuid) ?? fullName;
  const links = isRecord(value.links) ? value.links : null; const html = links && isRecord(links.html) ? stringValue(links.html.href) : null;
  if (!owner || !name || !fullName || !id) return null;
  const mainbranch = isRecord(value.mainbranch) ? value.mainbranch : null;
  return { provider: "bitbucket", providerRepositoryId: id, ownerLogin: owner, name, fullName, description: nullableString(value.description), url: html ?? `https://bitbucket.org/${fullName}`, visibility: value.is_private === true ? "private" : "public", defaultBranch: nullableString(mainbranch?.name), primaryLanguage: nullableString(value.language), stars: 0, forks: 0, openIssues: 0, licenseSpdxId: null, topics: [], updatedAt: stringValue(value.updated_on) ?? new Date(0).toISOString(), createdAt: stringValue(value.created_on) ?? new Date(0).toISOString(), pushedAt: stringValue(value.updated_on), homepageUrl: null, isArchived: false, isFork: false, watchers: 0 };
}

function normalizeCodeberg(value: JsonRecord): NormalizedRepository | null {
  const ownerValue = isRecord(value.owner) ? value.owner : null;
  const owner = stringValue(ownerValue?.login) ?? stringValue(value.owner_name);
  const name = stringValue(value.name); const fullName = stringValue(value.full_name) ?? (owner && name ? `${owner}/${name}` : null); const id = stringValue(value.id) ?? fullName;
  if (!owner || !name || !fullName || !id) return null;
  return { provider: "codeberg", providerRepositoryId: id, ownerLogin: owner, name, fullName, description: nullableString(value.description), url: stringValue(value.html_url) ?? `https://codeberg.org/${fullName}`, visibility: value.private === true ? "private" : "public", defaultBranch: nullableString(value.default_branch), primaryLanguage: nullableString(value.language), stars: numberValue(value.stars_count), forks: numberValue(value.forks_count), openIssues: numberValue(value.open_issues_count), licenseSpdxId: null, topics: arrayStrings(value.topics), updatedAt: stringValue(value.updated_at) ?? new Date(0).toISOString(), createdAt: stringValue(value.created_at) ?? new Date(0).toISOString(), pushedAt: stringValue(value.updated_at), homepageUrl: null, isArchived: Boolean(value.archived), isFork: Boolean(value.fork), watchers: numberValue(value.watchers_count) };
}

function isRecord(value: unknown): value is JsonRecord { return !!value && typeof value === "object" && !Array.isArray(value); }
function stringValue(value: unknown) { return typeof value === "string" && value.length > 0 ? value : null; }
function nullableString(value: unknown) { return typeof value === "string" ? value : null; }
function numberValue(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0; }
function arrayStrings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : []; }
