import "server-only";

import type {
  NormalizedRepository,
  ProviderCapabilities,
  RepositoryCommit,
  RepositoryContributor,
  RepositoryFile,
  RepositoryIssue,
  RepositoryLicense,
  RepositoryProvider,
  RepositoryPullRequest,
  RepositoryRef,
  RepositoryRelease,
  RepositorySearchResult,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "./types";

type JsonRecord = Record<string, unknown>;

const publicCapabilities: ProviderCapabilities = {
  repositorySearch: true,
  repositoryTree: true,
  fileContent: true,
  commits: true,
  diffs: false,
  issues: true,
  pullRequests: true,
  releases: true,
  contributors: false,
  authenticatedPrivateAccess: false,
};

export function createGitLabProvider(): RepositoryProvider {
  return {
    id: "gitlab",
    displayName: "GitLab",
    capabilities: { ...publicCapabilities, contributors: true },
    searchRepositories: async ({ query, first = 20 }) => {
      const values = await gitLabJson<unknown[]>(`/projects?search=${encodeURIComponent(query)}&simple=true&per_page=${clamp(first)}&order_by=last_activity_at&sort=desc`);
      return { items: values.filter(isRecord).map(normalizeGitLabRepository).filter(isRepository), hasNextPage: false, cursor: null };
    },
    getRepository: async ({ owner, name }) => {
      const value = await tryJson(() => gitLabJson<unknown>(`/projects/${encodeURIComponent(`${owner}/${name}`)}`));
      return value === null ? null : normalizeGitLabRepository(value);
    },
    getTree: async ({ owner, name, ref, path = "" }) => {
      const query = new URLSearchParams({ ref, per_page: "100", order_by: "name", sort: "asc" });
      if (path) query.set("path", path);
      const values = await gitLabJson<unknown[]>(`/projects/${encodeURIComponent(`${owner}/${name}`)}/repository/tree?${query}`);
      return values.filter(isRecord).map(normalizeGitLabEntry).filter(isEntry);
    },
    getFile: async ({ owner, name, path, ref }) => {
      const value = await tryJson(() => gitLabJson<unknown>(`/projects/${encodeURIComponent(`${owner}/${name}`)}/repository/files/${encodePath(path)}?ref=${encodeURIComponent(ref)}`));
      if (!value) return null;
      return normalizeGitLabFile(value, path, ref, owner, name);
    },
    getRepositorySurfaces: async ({ owner, name, ref }) => getGitLabSurfaces(owner, name, ref),
  };
}

export function createBitbucketProvider(): RepositoryProvider {
  return {
    id: "bitbucket",
    displayName: "Bitbucket",
    capabilities: publicCapabilities,
    searchRepositories: async ({ query, first = 20 }) => {
      const data = await bitbucketJson<unknown>(`/repositories?q=${encodeURIComponent(`name~"${query.replaceAll('"', "")}"`)}&pagelen=${clamp(first)}`);
      const values = recordArray(data, "values");
      return { items: values.map(normalizeBitbucketRepository).filter(isRepository), hasNextPage: false, cursor: null };
    },
    getRepository: async ({ owner, name }) => {
      const value = await tryJson(() => bitbucketJson<unknown>(`/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`));
      return value === null ? null : normalizeBitbucketRepository(value);
    },
    getTree: async ({ owner, name, ref, path = "" }) => {
      const data = await tryJson(() => bitbucketJson<unknown>(bitbucketSourcePath(owner, name, ref, path) + "?pagelen=100"));
      return recordArray(data, "values").map(normalizeBitbucketEntry).filter(isEntry);
    },
    getFile: async ({ owner, name, path, ref }) => {
      const response = await tryRaw(bitbucketSourcePath(owner, name, ref, path));
      if (!response || response.contentType.includes("application/json")) return null;
      const text = await response.text();
      if (text.length > 700_000) throw new Error("This file is too large to browse");
      const commitSha = isSha(ref) ? ref : await bitbucketHeadCommit(owner, name, ref);
      return { path, commitSha, oid: `${commitSha}:${path}`, text, byteSize: new TextEncoder().encode(text).byteLength };
    },
    getRepositorySurfaces: async ({ owner, name, ref }) => getBitbucketSurfaces(owner, name, ref),
  };
}

export function createCodebergProvider(): RepositoryProvider {
  return {
    id: "codeberg",
    displayName: "Codeberg",
    capabilities: publicCapabilities,
    searchRepositories: async ({ query, first = 20 }) => {
      const data = await codebergJson<unknown>(`/repos/search?q=${encodeURIComponent(query)}&limit=${clamp(first)}`);
      const values = recordArray(data, "data");
      return { items: values.map(normalizeCodebergRepository).filter(isRepository), hasNextPage: false, cursor: null };
    },
    getRepository: async ({ owner, name }) => {
      const value = await tryJson(() => codebergJson<unknown>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`));
      return value === null ? null : normalizeCodebergRepository(value);
    },
    getTree: async ({ owner, name, ref, path = "" }) => {
      const suffix = path ? `/contents/${encodePath(path)}` : "/contents";
      const data = await tryJson(() => codebergJson<unknown>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${suffix}?ref=${encodeURIComponent(ref)}`));
      return (Array.isArray(data) ? data : []).filter(isRecord).map(normalizeCodebergEntry).filter(isEntry);
    },
    getFile: async ({ owner, name, path, ref }) => {
      const value = await tryJson(() => codebergJson<unknown>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`));
      if (!value) return null;
      return normalizeCodebergFile(value, path, ref, owner, name);
    },
    getRepositorySurfaces: async ({ owner, name, ref }) => getCodebergSurfaces(owner, name, ref),
  };
}

async function getGitLabSurfaces(owner: string, name: string, ref: string): Promise<RepositorySurfaces> {
  const project = encodeURIComponent(`${owner}/${name}`);
  const [branches, tags, commits, issues, mergeRequests, releases, contributors, repository] = await Promise.all([
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/repository/branches?per_page=24`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/repository/tags?per_page=24`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/repository/commits?ref_name=${encodeURIComponent(ref)}&per_page=12`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/issues?state=opened&per_page=8&order_by=updated_at&sort=desc`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/merge_requests?state=opened&per_page=8&order_by=updated_at&sort=desc`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/releases?per_page=6`)),
    tryJson(() => gitLabJson<unknown[]>(`/projects/${project}/repository/contributors?per_page=20`)),
    tryJson(() => gitLabJson<unknown>(`/projects/${project}`)),
  ]);
  const commitRows = (commits ?? []).filter(isRecord);
  return {
    refs: [
      ...(branches ?? []).filter(isRecord).map((row) => gitLabRef(row, "branch")),
      ...(tags ?? []).filter(isRecord).map((row) => gitLabRef(row, "tag")),
    ],
    commits: commitRows.map(normalizeGitLabCommit).filter(isCommit),
    issues: (issues ?? []).filter(isRecord).map((row) => normalizeGitLabIssue(row, "issue")).filter(isIssue),
    pullRequests: (mergeRequests ?? []).filter(isRecord).map((row) => normalizeGitLabIssue(row, "pullRequest")).filter(isPullRequest),
    releases: (releases ?? []).filter(isRecord).map(normalizeGitLabRelease).filter(isRelease),
    contributors: (contributors ?? []).filter(isRecord).map(normalizeGitLabContributor).filter(isContributor),
    license: normalizeGitLabLicense(repository),
    resolvedRefSha: commitRows.length > 0 ? stringValue(commitRows[0]?.id) : null,
  };
}

async function getBitbucketSurfaces(owner: string, name: string, ref: string): Promise<RepositorySurfaces> {
  const workspace = encodeURIComponent(owner);
  const repo = encodeURIComponent(name);
  const base = `/repositories/${workspace}/${repo}`;
  const [branches, tags, commits, issues, pullRequests, repository] = await Promise.all([
    tryJson(() => bitbucketJson<unknown>(`${base}/refs/branches?pagelen=24`)),
    tryJson(() => bitbucketJson<unknown>(`${base}/refs/tags?pagelen=24`)),
    tryJson(() => bitbucketJson<unknown>(`${base}/commits/${encodeURIComponent(ref)}?pagelen=12`)),
    tryJson(() => bitbucketJson<unknown>(`${base}/issues?state="open"&pagelen=8&sort=-updated_on`)),
    tryJson(() => bitbucketJson<unknown>(`${base}/pullrequests?state="OPEN"&pagelen=8&sort=-updated_on`)),
    tryJson(() => bitbucketJson<unknown>(base)),
  ]);
  const commitRows = recordArray(commits, "values");
  return {
    refs: [...recordArray(branches, "values").map((row) => bitbucketRef(row, "branch")), ...recordArray(tags, "values").map((row) => bitbucketRef(row, "tag"))].filter(isRef),
    commits: commitRows.map(normalizeBitbucketCommit).filter(isCommit),
    issues: recordArray(issues, "values").map((row) => normalizeBitbucketIssue(row, "issue")).filter(isIssue),
    pullRequests: recordArray(pullRequests, "values").map((row) => normalizeBitbucketIssue(row, "pullRequest")).filter(isPullRequest),
    releases: [],
    contributors: [],
    license: normalizeBitbucketLicense(repository),
    resolvedRefSha: commitRows.length > 0 ? nestedString(commitRows[0], ["hash"]) : null,
  };
}

async function getCodebergSurfaces(owner: string, name: string, ref: string): Promise<RepositorySurfaces> {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const [branches, tags, commits, issues, pullRequests, releases, repository] = await Promise.all([
    tryJson(() => codebergJson<unknown[]>(`${base}/branches?limit=24`)),
    tryJson(() => codebergJson<unknown[]>(`${base}/tags?limit=24`)),
    tryJson(() => codebergJson<unknown[]>(`${base}/commits?sha=${encodeURIComponent(ref)}&limit=12`)),
    tryJson(() => codebergJson<unknown[]>(`${base}/issues?state=open&limit=8&sort=updated`)),
    tryJson(() => codebergJson<unknown[]>(`${base}/pulls?state=open&limit=8&sort=updated`)),
    tryJson(() => codebergJson<unknown[]>(`${base}/releases?limit=6`)),
    tryJson(() => codebergJson<unknown>(base)),
  ]);
  const commitRows = (commits ?? []).filter(isRecord);
  return {
    refs: [...(branches ?? []).filter(isRecord).map((row) => codebergRef(row, "branch")), ...(tags ?? []).filter(isRecord).map((row) => codebergRef(row, "tag"))],
    commits: commitRows.map(normalizeCodebergCommit).filter(isCommit),
    issues: (issues ?? []).filter(isRecord).map((row) => normalizeCodebergIssue(row, "issue")).filter(isIssue),
    pullRequests: (pullRequests ?? []).filter(isRecord).map((row) => normalizeCodebergIssue(row, "pullRequest")).filter(isPullRequest),
    releases: (releases ?? []).filter(isRecord).map(normalizeCodebergRelease).filter(isRelease),
    contributors: [],
    license: normalizeCodebergLicense(repository),
    resolvedRefSha: commitRows.length > 0 ? stringValue(commitRows[0]?.sha) : null,
  };
}

function normalizeGitLabRepository(value: unknown): NormalizedRepository | null {
  const row = record(value); const namespace = record(row.namespace); const owner = stringValue(namespace?.full_path) ?? stringValue(namespace?.path);
  const name = stringValue(row.name); const fullName = stringValue(row.path_with_namespace) ?? (owner && name ? `${owner}/${name}` : null);
  if (!owner || !name || !fullName) return null;
  const license = recordOrNull(row.license);
  return { provider: "gitlab", providerRepositoryId: String(row.id ?? fullName), ownerLogin: owner, name, fullName, description: nullableString(row.description), url: stringValue(row.web_url) ?? `https://gitlab.com/${fullName}`, visibility: row.visibility === "private" ? "private" : "public", defaultBranch: nullableString(row.default_branch), primaryLanguage: null, stars: numberValue(row.star_count), forks: numberValue(row.forks_count), openIssues: numberValue(row.open_issues_count), licenseSpdxId: stringValue(license?.key) ?? stringValue(license?.spdx_id), topics: arrayStrings(row.topics), updatedAt: dateString(row.last_activity_at), createdAt: dateString(row.created_at), pushedAt: nullableString(row.last_activity_at), homepageUrl: null, isArchived: Boolean(row.archived), isFork: Boolean(row.forked_from_project), watchers: 0 };
}

function normalizeBitbucketRepository(value: unknown): NormalizedRepository | null {
  const row = record(value); const ownerValue = record(row.owner); const owner = stringValue(ownerValue?.nickname) ?? stringValue(ownerValue?.username) ?? stringValue(ownerValue?.display_name);
  const name = stringValue(row.slug) ?? stringValue(row.name); const fullName = stringValue(row.full_name) ?? (owner && name ? `${owner}/${name}` : null); const links = record(row.links); const html = record(links?.html);
  if (!owner || !name || !fullName) return null;
  const mainbranch = record(row.mainbranch); const project = record(row.project);
  return { provider: "bitbucket", providerRepositoryId: stringValue(row.uuid) ?? fullName, ownerLogin: owner, name, fullName, description: nullableString(row.description), url: stringValue(html?.href) ?? `https://bitbucket.org/${fullName}`, visibility: row.is_private === true ? "private" : "public", defaultBranch: nullableString(mainbranch?.name), primaryLanguage: nullableString(row.language), stars: 0, forks: 0, openIssues: 0, licenseSpdxId: stringValue(project?.key), topics: [], updatedAt: dateString(row.updated_on), createdAt: dateString(row.created_on), pushedAt: nullableString(row.updated_on), homepageUrl: null, isArchived: false, isFork: false, watchers: 0 };
}

function normalizeCodebergRepository(value: unknown): NormalizedRepository | null {
  const row = record(value); const ownerValue = record(row.owner); const owner = stringValue(ownerValue?.login) ?? stringValue(row.owner_name); const name = stringValue(row.name); const fullName = stringValue(row.full_name) ?? (owner && name ? `${owner}/${name}` : null); const license = recordOrNull(row.license);
  if (!owner || !name || !fullName) return null;
  return { provider: "codeberg", providerRepositoryId: String(row.id ?? fullName), ownerLogin: owner, name, fullName, description: nullableString(row.description), url: stringValue(row.html_url) ?? `https://codeberg.org/${fullName}`, visibility: row.private === true ? "private" : "public", defaultBranch: nullableString(row.default_branch), primaryLanguage: nullableString(row.language), stars: numberValue(row.stars_count), forks: numberValue(row.forks_count), openIssues: numberValue(row.open_issues_count), licenseSpdxId: stringValue(license?.key) ?? stringValue(license?.spdx_id), topics: arrayStrings(row.topics), updatedAt: dateString(row.updated_at), createdAt: dateString(row.created_at), pushedAt: nullableString(row.updated_at), homepageUrl: nullableString(row.website), isArchived: Boolean(row.archived), isFork: Boolean(row.fork), watchers: numberValue(row.watchers_count) };
}

function normalizeGitLabEntry(value: unknown): RepositoryTreeEntry | null {
  const row = record(value); const path = stringValue(row.path); const name = stringValue(row.name); if (!path || !name) return null;
  return { name, path, kind: row.type === "tree" ? "directory" : row.type === "commit" ? "submodule" : "file", oid: stringValue(row.id) ?? path, byteSize: numberOrNull(row.size) };
}

function normalizeBitbucketEntry(value: unknown): RepositoryTreeEntry | null {
  const row = record(value); const path = stringValue(row.path); const name = stringValue(row.path)?.split("/").pop() ?? null; if (!path || !name) return null;
  const commit = record(row.commit); return { name, path, kind: row.type === "commit_file" ? "file" : row.type === "commit_directory" ? "directory" : row.type === "commit" ? "submodule" : "file", oid: nestedString(row, ["commit", "hash"]) ?? path, byteSize: numberOrNull(row.size) ?? numberOrNull(row.raw) };
}

function normalizeCodebergEntry(value: unknown): RepositoryTreeEntry | null {
  const row = record(value); const path = stringValue(row.path); const name = stringValue(row.name); if (!path || !name) return null;
  return { name, path, kind: row.type === "dir" ? "directory" : row.type === "submodule" ? "submodule" : "file", oid: stringValue(row.sha) ?? path, byteSize: numberOrNull(row.size) };
}

function normalizeGitLabFile(value: unknown, path: string, ref: string, owner: string, name: string): RepositoryFile | null {
  const row = record(value); const content = stringValue(row.content); if (!content) return null; const text = decodeBase64(content); if (text.length > 700_000) throw new Error("This file is too large to browse");
  return { path: stringValue(row.file_path) ?? path, commitSha: isSha(stringValue(row.last_commit_id) ?? "") ? String(row.last_commit_id) : ref, oid: stringValue(row.blob_id) ?? `${owner}/${name}:${path}`, text, byteSize: numberOrNull(row.size) };
}

function normalizeCodebergFile(value: unknown, path: string, ref: string, owner: string, name: string): RepositoryFile | null {
  const row = record(value); const content = stringValue(row.content); if (!content || row.encoding !== "base64") return null; const text = decodeBase64(content); if (text.length > 700_000) throw new Error("This file is too large to browse");
  return { path: stringValue(row.path) ?? path, commitSha: isSha(ref) ? ref : ref, oid: stringValue(row.sha) ?? `${owner}/${name}:${path}`, text, byteSize: numberOrNull(row.size) };
}

function normalizeGitLabCommit(value: unknown): RepositoryCommit | null {
  const row = record(value); const sha = stringValue(row.id); if (!sha) return null; const author = record(row.author); return { sha, abbreviatedSha: stringValue(row.short_id) ?? sha.slice(0, 8), message: stringValue(row.title) ?? stringValue(row.message)?.split("\n")[0] ?? "Commit", committedAt: dateString(row.committed_date), authorName: nullableString(row.author_name), authorLogin: nullableString(author?.username), authorAvatarUrl: nullableString(author?.avatar_url), url: stringValue(row.web_url) ?? "https://gitlab.com" };
}

function normalizeBitbucketCommit(value: unknown): RepositoryCommit | null {
  const row = record(value); const sha = stringValue(row.hash); if (!sha) return null; const author = record(row.author); const user = record(author?.user); const links = record(row.links); const html = record(links?.html); return { sha, abbreviatedSha: sha.slice(0, 8), message: stringValue(row.message)?.split("\n")[0] ?? "Commit", committedAt: dateString(row.date), authorName: stringValue(author?.raw), authorLogin: stringValue(user?.nickname) ?? stringValue(user?.username), authorAvatarUrl: null, url: stringValue(html?.href) ?? "https://bitbucket.org" };
}

function normalizeCodebergCommit(value: unknown): RepositoryCommit | null {
  const row = record(value); const sha = stringValue(row.sha); if (!sha) return null; const commit = record(row.commit); const author = record(commit?.author); const user = record(row.author); return { sha, abbreviatedSha: sha.slice(0, 8), message: stringValue(commit?.message)?.split("\n")[0] ?? "Commit", committedAt: dateString(author?.date), authorName: nullableString(author?.name), authorLogin: stringValue(user?.login), authorAvatarUrl: nullableString(user?.avatar_url), url: stringValue(row.html_url) ?? "https://codeberg.org" };
}

function normalizeGitLabIssue(value: unknown, kind: "issue" | "pullRequest"): RepositoryIssue | RepositoryPullRequest | null {
  const row = record(value); const number = numberValue(row.iid); const title = stringValue(row.title); if (!number || !title) return null; const author = record(row.author); const base = { number, title, url: stringValue(row.web_url) ?? "https://gitlab.com", updatedAt: dateString(row.updated_at), authorLogin: stringValue(author?.username), authorAvatarUrl: nullableString(author?.avatar_url) };
  return kind === "pullRequest" ? { ...base, isDraft: Boolean(row.draft), mergedAt: nullableString(row.merged_at) } : base;
}

function normalizeBitbucketIssue(value: unknown, kind: "issue" | "pullRequest"): RepositoryIssue | RepositoryPullRequest | null {
  const row = record(value); const number = numberValue(row.id); const title = stringValue(row.title); if (!number || !title) return null; const author = record(row.author); const user = record(author?.user); const links = record(row.links); const html = record(links?.html); const base = { number, title, url: stringValue(html?.href) ?? "https://bitbucket.org", updatedAt: dateString(row.updated_on), authorLogin: stringValue(user?.nickname) ?? stringValue(user?.username), authorAvatarUrl: null };
  return kind === "pullRequest" ? { ...base, isDraft: Boolean(row.draft), mergedAt: nullableString(row.merged_on) } : base;
}

function normalizeCodebergIssue(value: unknown, kind: "issue" | "pullRequest"): RepositoryIssue | RepositoryPullRequest | null {
  const row = record(value); const number = numberValue(row.number); const title = stringValue(row.title); if (!number || !title) return null; const user = record(row.user); const base = { number, title, url: stringValue(row.html_url) ?? "https://codeberg.org", updatedAt: dateString(row.updated_at), authorLogin: stringValue(user?.login), authorAvatarUrl: nullableString(user?.avatar_url) };
  return kind === "pullRequest" ? { ...base, isDraft: Boolean(row.draft), mergedAt: nullableString(row.merged_at) } : base;
}

function normalizeGitLabRelease(value: unknown): RepositoryRelease | null {
  const row = record(value); const tagName = stringValue(row.tag_name); if (!tagName) return null; const links = record(row._links); return { name: nullableString(row.name), tagName, url: stringValue(links?.self) ?? "https://gitlab.com", description: nullableString(row.description), publishedAt: nullableString(row.released_at) ?? nullableString(row.created_at), isDraft: false, isPrerelease: false };
}

function normalizeCodebergRelease(value: unknown): RepositoryRelease | null {
  const row = record(value); const tagName = stringValue(row.tag_name) ?? stringValue(row.tag_name); if (!tagName) return null; return { name: nullableString(row.name), tagName, url: stringValue(row.html_url) ?? "https://codeberg.org", description: nullableString(row.body), publishedAt: nullableString(row.published_at), isDraft: Boolean(row.draft), isPrerelease: Boolean(row.prerelease) };
}

function normalizeGitLabContributor(value: unknown): RepositoryContributor | null {
  const row = record(value); const login = stringValue(row.username); const name = nullableString(row.name); if (!login && !name) return null; return { login, name, avatarUrl: nullableString(row.avatar_url), commitCount: numberValue(row.commits) };
}

function gitLabRef(value: unknown, kind: "branch" | "tag"): RepositoryRef {
  const row = record(value); const name = stringValue(row.name) ?? "unknown"; return { name, ref: `${kind === "branch" ? "refs/heads/" : "refs/tags/"}${name}`, kind, targetSha: stringValue(kind === "branch" ? record(row.commit)?.id : row.target) };
}

function bitbucketRef(value: unknown, kind: "branch" | "tag"): RepositoryRef | null {
  const row = record(value); const name = stringValue(row.name); const target = record(row.target); if (!name) return null; return { name, ref: name, kind, targetSha: stringValue(target?.hash) };
}

function codebergRef(value: unknown, kind: "branch" | "tag"): RepositoryRef {
  const row = record(value); const name = stringValue(row.name) ?? "unknown"; return { name, ref: name, kind, targetSha: stringValue(kind === "branch" ? record(row.commit)?.id : row.commit?.toString()) };
}

function normalizeGitLabLicense(value: unknown): RepositoryLicense | null {
  const row = record(value); const license = recordOrNull(row.license); const name = stringValue(license?.name); if (!name) return null; return { name, spdxId: stringValue(license?.key) ?? stringValue(license?.spdx_id), url: stringValue(license?.url) };
}

function normalizeBitbucketLicense(value: unknown): RepositoryLicense | null {
  const row = record(value); const project = record(row.project); const key = stringValue(project?.key); return key ? { name: key, spdxId: key, url: null } : null;
}

function normalizeCodebergLicense(value: unknown): RepositoryLicense | null {
  const row = record(value); const license = recordOrNull(row.license); const name = stringValue(license?.name) ?? stringValue(license?.key); return name ? { name, spdxId: stringValue(license?.key) ?? null, url: stringValue(license?.url) } : null;
}

async function bitbucketHeadCommit(owner: string, name: string, ref: string) {
  const data = await bitbucketJson<unknown>(`/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(ref)}?pagelen=1`);
  return nestedString(recordArray(data, "values")[0] ?? null, ["hash"]) ?? ref;
}

function bitbucketSourcePath(owner: string, name: string, ref: string, path: string) {
  const suffix = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : "";
  return `/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/src/${encodeURIComponent(ref)}${suffix}`;
}

async function gitLabJson<T>(path: string): Promise<T> { return requestJson<T>(`https://gitlab.com/api/v4${path}`); }
async function bitbucketJson<T>(path: string): Promise<T> { return requestJson<T>(`https://api.bitbucket.org/2.0${path}`); }
async function codebergJson<T>(path: string): Promise<T> { return requestJson<T>(`https://codeberg.org/api/v1${path}`); }

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "OpenHub" }, redirect: "error", signal: AbortSignal.timeout(10_000), cache: "force-cache", next: { revalidate: 120 } });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    if (response.status === 403 || response.status === 429) throw new Error(`Provider rate limit reached${retryAfter ? `; retry after ${retryAfter} seconds` : ""}`);
    throw new Error(`Provider request failed with status ${response.status}`);
  }
  const raw = await response.text(); if (raw.length > 1_000_000) throw new Error("Provider response is too large"); return JSON.parse(raw) as T;
}

async function tryRaw(url: string) {
  try {
    const response = await fetch(url, { headers: { Accept: "text/plain, application/json", "User-Agent": "OpenHub" }, redirect: "error", signal: AbortSignal.timeout(10_000), cache: "force-cache", next: { revalidate: 86_400 } });
    if (!response.ok) return null;
    return { contentType: response.headers.get("content-type") ?? "", text: () => response.text() };
  } catch { return null; }
}

async function tryJson<T>(request: () => Promise<T>): Promise<T | null> { try { return await request(); } catch { return null; } }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function recordOrNull(value: unknown): JsonRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null; }
function recordArray(value: unknown, key: string): JsonRecord[] { const rows = record(value)[key]; return Array.isArray(rows) ? rows.filter(isRecord) : []; }
function isRecord(value: unknown): value is JsonRecord { return !!value && typeof value === "object" && !Array.isArray(value); }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function nullableString(value: unknown): string | null { return typeof value === "string" ? value : null; }
function numberValue(value: unknown): number { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0; }
function numberOrNull(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null; }
function arrayStrings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : []; }
function dateString(value: unknown): string { return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : new Date(0).toISOString(); }
function nestedString(value: JsonRecord | null, keys: string[]): string | null { let current: unknown = value; for (const key of keys) current = record(current)[key]; return stringValue(current); }
function decodeBase64(value: string) { return Buffer.from(value.replace(/\s/g, ""), "base64").toString("utf8"); }
function encodePath(value: string) { return value.split("/").map(encodeURIComponent).join("/"); }
function isSha(value: string) { return /^[a-f0-9]{40}$/i.test(value); }
function clamp(value: number) { return Math.max(1, Math.min(Math.floor(value), 50)); }
function isRepository(value: NormalizedRepository | null): value is NormalizedRepository { return value !== null; }
function isEntry(value: RepositoryTreeEntry | null): value is RepositoryTreeEntry { return value !== null; }
function isCommit(value: RepositoryCommit | null): value is RepositoryCommit { return value !== null; }
function isIssue(value: RepositoryIssue | null): value is RepositoryIssue { return value !== null; }
function isPullRequest(value: RepositoryPullRequest | RepositoryIssue | null): value is RepositoryPullRequest { return value !== null && "isDraft" in value; }
function isRelease(value: RepositoryRelease | null): value is RepositoryRelease { return value !== null; }
function isContributor(value: RepositoryContributor | null): value is RepositoryContributor { return value !== null; }
function isRef(value: RepositoryRef | null): value is RepositoryRef { return value !== null; }
