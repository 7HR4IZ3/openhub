import "server-only";

import {
  NormalizedRepository,
  ProviderCapabilities,
  RepositoryCommit,
  RepositoryContributor,
  RepositoryFile,
  RepositoryIssue,
  RepositoryLicense,
  RepositoryProvider,
  RepositoryPullRequest,
  RepositoryRelease,
  RepositoryRef,
  RepositorySearchResult,
  RepositorySurfaces,
  RepositoryTreeEntry,
} from "./types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

const capabilities: ProviderCapabilities = {
  repositorySearch: true,
  repositoryTree: true,
  fileContent: true,
  commits: true,
  diffs: true,
  issues: true,
  pullRequests: true,
  releases: true,
  contributors: true,
  authenticatedPrivateAccess: true,
};

type GitHubGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type RepositoryNode = {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  defaultBranchRef: { name: string } | null;
  primaryLanguage: { name: string } | null;
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  licenseInfo: { spdxId: string | null } | null;
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
  updatedAt: string;
  createdAt: string;
  pushedAt: string | null;
  homepageUrl: string | null;
  isArchived: boolean;
  isFork: boolean;
  watchers: { totalCount: number };
  owner: { login: string };
};

type GitHubActor = {
  login: string;
  avatarUrl: string;
};

type GitHubCommitNode = {
  oid: string;
  abbreviatedOid: string;
  messageHeadline: string;
  committedDate: string;
  url: string;
  author: {
    name: string | null;
    user: GitHubActor | null;
  } | null;
};

type GitHubIssueNode = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author: GitHubActor | null;
};

type GitHubPullRequestNode = GitHubIssueNode & {
  isDraft: boolean;
  mergedAt: string | null;
};

type GitHubReleaseNode = {
  name: string | null;
  tagName: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  isDraft: boolean;
  isPrerelease: boolean;
};

type GitHubRefNode = {
  name: string;
  prefix: string;
  target: { oid: string } | null;
};

type GitHubHistoryObject = {
  oid: string;
  history?: { nodes: GitHubCommitNode[] };
  target?: {
    oid: string;
    history?: { nodes: GitHubCommitNode[] };
  } | null;
};

export function createGitHubProvider(accessToken: string): RepositoryProvider {
  if (!accessToken.trim()) {
    throw new Error("A GitHub access token is required for provider access");
  }

  return {
    id: "github",
    displayName: "GitHub",
    capabilities,

    async searchRepositories({ query, cursor = null, first = 20 }) {
      const response = await githubGraphQL<{
        search: {
          nodes: Array<RepositoryNode | null>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(
        accessToken,
        `query SearchRepositories($query: String!, $first: Int!, $after: String) {
          search(query: $query, type: REPOSITORY, first: $first, after: $after) {
            nodes {
              ... on Repository {
                id
                name
                nameWithOwner
                description
                url
                isPrivate
                defaultBranchRef { name }
                primaryLanguage { name }
                stargazerCount
                forkCount
                issues(states: OPEN) { totalCount }
                licenseInfo { spdxId }
                repositoryTopics(first: 20) { nodes { topic { name } } }
                updatedAt
                createdAt
                pushedAt
                homepageUrl
                isArchived
                isFork
                watchers { totalCount }
                owner { login }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { query, first: clampPageSize(first), after: cursor },
      );

      return {
        items: response.search.nodes.filter(isRepositoryNode).map(normalizeRepository),
        hasNextPage: response.search.pageInfo.hasNextPage,
        cursor: response.search.pageInfo.endCursor,
      } satisfies RepositorySearchResult;
    },

    async getRepository({ owner, name }) {
      const response = await githubGraphQL<{
        repository: RepositoryNode | null;
      }>(
        accessToken,
        `query GetRepository($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            id
            name
            nameWithOwner
            description
            url
            isPrivate
            defaultBranchRef { name }
            primaryLanguage { name }
            stargazerCount
            forkCount
            issues(states: OPEN) { totalCount }
            licenseInfo { spdxId }
            repositoryTopics(first: 20) { nodes { topic { name } } }
            updatedAt
            createdAt
            pushedAt
            homepageUrl
            isArchived
            isFork
            watchers { totalCount }
            owner { login }
          }
        }`,
        { owner, name },
      );

      return response.repository === null ? null : normalizeRepository(response.repository);
    },

    async getTree({ owner, name, ref, path = "" }) {
      const response = await githubGraphQL<{
        repository: {
          object: {
            __typename: "Tree";
            entries: Array<{
              name: string;
              path: string;
              type: "blob" | "tree" | "commit";
              oid: string;
              byteSize: number | null;
            }>;
          } | null;
        } | null;
      }>(
        accessToken,
        `query GetTree($owner: String!, $name: String!, $expression: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expression) {
              ... on Tree {
                __typename
                entries { name path type oid byteSize }
              }
            }
          }
        }`,
        { owner, name, expression: ref + ":" + path },
      );

      return (response.repository?.object?.entries ?? []).map((entry) => ({
        name: entry.name,
        path: entry.path,
        kind: entry.type === "blob" ? "file" : entry.type === "tree" ? "directory" : "submodule",
        oid: entry.oid,
        byteSize: entry.byteSize,
      })) satisfies RepositoryTreeEntry[];
    },

    async getFile({ owner, name, path, ref }) {
      const response = await githubGraphQL<{
        repository: {
          object: {
            __typename: "Blob";
            oid: string;
            byteSize: number | null;
            text: string | null;
          } | null;
          sourceObject: {
            oid: string;
            target: { oid: string } | null;
          } | null;
        } | null;
      }>(
        accessToken,
        `query GetFile($owner: String!, $name: String!, $expression: String!, $sourceRef: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expression) {
              __typename
              ... on Blob { oid byteSize text }
            }
            sourceObject: object(expression: $sourceRef) {
              oid
              ... on Tag { target { oid } }
            }
          }
        }`,
        {
          owner,
          name,
          expression: `${ref}:${path}`,
          sourceRef: ref,
        },
      );

      const object = response.repository?.object;
      if (object?.__typename !== "Blob" || typeof object.text !== "string") return null;
      const commitSha = isCommitSha(ref)
        ? ref
        : resolveCommitSha(response.repository?.sourceObject);
      if (commitSha === undefined || commitSha === null) {
        throw new Error("GitHub did not return a commit for this source reference");
      }

      return {
        path,
        commitSha,
        oid: object.oid,
        text: object.text,
        byteSize: object.byteSize,
      } satisfies RepositoryFile;
    },

    async getRepositorySurfaces({ owner, name, ref }) {
      const response = await githubGraphQL<{
        repository: {
          branches: {
            nodes: GitHubRefNode[];
          };
          tags: {
            nodes: GitHubRefNode[];
          };
          object: GitHubHistoryObject | null;
          issues: { nodes: GitHubIssueNode[] };
          pullRequests: { nodes: GitHubPullRequestNode[] };
          releases: { nodes: GitHubReleaseNode[] };
          licenseInfo: {
            name: string;
            spdxId: string | null;
            url: string | null;
          } | null;
        } | null;
      }>(
        accessToken,
        `query GetRepositorySurfaces(
          $owner: String!,
          $name: String!,
          $ref: String!,
          $refFirst: Int!,
          $itemFirst: Int!,
          $releaseFirst: Int!,
          $commitFirst: Int!
        ) {
          repository(owner: $owner, name: $name) {
            branches: refs(refPrefix: "refs/heads/", first: $refFirst) {
              nodes { name prefix target { oid } }
            }
            tags: refs(refPrefix: "refs/tags/", first: $refFirst) {
              nodes { name prefix target { oid } }
            }
            object(expression: $ref) {
              oid
              ... on Commit {
                history(first: $commitFirst) {
                  nodes {
                    oid
                    abbreviatedOid
                    messageHeadline
                    committedDate
                    url
                    author { name user { login avatarUrl } }
                  }
                }
              }
              ... on Tag {
                target {
                  oid
                  ... on Commit {
                    history(first: $commitFirst) {
                      nodes {
                        oid
                        abbreviatedOid
                        messageHeadline
                        committedDate
                        url
                        author { name user { login avatarUrl } }
                      }
                    }
                  }
                }
              }
            }
            issues(first: $itemFirst, states: OPEN) {
              nodes { number title url updatedAt author { login avatarUrl } }
            }
            pullRequests(first: $itemFirst, states: OPEN) {
              nodes { number title url updatedAt isDraft mergedAt author { login avatarUrl } }
            }
            releases(first: $releaseFirst) {
              nodes {
                name
                tagName
                url
                description
                publishedAt
                isDraft
                isPrerelease
              }
            }
            licenseInfo { name spdxId url }
          }
        }`,
        {
          owner,
          name,
          ref,
          refFirst: 24,
          itemFirst: 8,
          releaseFirst: 6,
          commitFirst: 12,
        },
      );

      const repository = response.repository;
      if (repository === null) return emptyRepositorySurfaces();

      const commitNodes = historyNodes(repository.object);
      return {
        refs: [...repository.branches.nodes, ...repository.tags.nodes].map(normalizeRef),
        commits: commitNodes.map(normalizeCommit),
        issues: repository.issues.nodes.map(normalizeIssue),
        pullRequests: repository.pullRequests.nodes.map(normalizePullRequest),
        releases: repository.releases.nodes
          .map(normalizeRelease)
          .sort(sortByReleaseDate),
        contributors: normalizeContributors(commitNodes),
        license: repository.licenseInfo === null
          ? null
          : normalizeLicense(repository.licenseInfo),
        resolvedRefSha: resolveCommitSha(repository.object),
      } satisfies RepositorySurfaces;
    },
  };
}

async function githubGraphQL<T>(
  accessToken: string,
  query: string,
  variables: Record<string, string | number | null>,
) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenHub",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GitHubGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(`GitHub API error: ${payload.errors[0]?.message ?? "Unknown error"}`);
  }
  if (payload.data === undefined) throw new Error("GitHub API returned no data");
  return payload.data;
}

function normalizeRepository(repository: RepositoryNode): NormalizedRepository {
  return {
    provider: "github",
    providerRepositoryId: repository.id,
    ownerLogin: repository.owner.login,
    name: repository.name,
    fullName: repository.nameWithOwner,
    description: repository.description,
    url: repository.url,
    visibility: repository.isPrivate ? "private" : "public",
    defaultBranch: repository.defaultBranchRef?.name ?? null,
    primaryLanguage: repository.primaryLanguage?.name ?? null,
    stars: repository.stargazerCount,
    forks: repository.forkCount,
    openIssues: repository.issues.totalCount,
    licenseSpdxId: repository.licenseInfo?.spdxId ?? null,
    topics: repository.repositoryTopics.nodes.map(({ topic }) => topic.name),
    updatedAt: repository.updatedAt,
    createdAt: repository.createdAt,
    pushedAt: repository.pushedAt,
    homepageUrl: repository.homepageUrl,
    isArchived: repository.isArchived,
    isFork: repository.isFork,
    watchers: repository.watchers.totalCount,
  };
}

function isRepositoryNode(node: RepositoryNode | null): node is RepositoryNode {
  return node !== null;
}

function clampPageSize(value: number) {
  return Math.max(1, Math.min(Math.floor(value), 50));
}

function isCommitSha(value: string) {
  return /^[a-f0-9]{40}$/i.test(value);
}

function resolveCommitSha(
  object:
    | { oid: string; target?: { oid: string } | null }
    | null
    | undefined,
) {
  if (object === null || object === undefined) return null;
  return object.target?.oid ?? object.oid;
}

function historyNodes(object: GitHubHistoryObject | null) {
  return object?.history?.nodes ?? object?.target?.history?.nodes ?? [];
}

function normalizeRef(ref: GitHubRefNode): RepositoryRef {
  return {
    name: ref.name,
    ref: ref.prefix + ref.name,
    kind: ref.prefix === "refs/tags/" ? "tag" : "branch",
    targetSha: ref.target?.oid ?? null,
  };
}

function normalizeCommit(commit: GitHubCommitNode): RepositoryCommit {
  return {
    sha: commit.oid,
    abbreviatedSha: commit.abbreviatedOid,
    message: commit.messageHeadline,
    committedAt: commit.committedDate,
    authorName: commit.author?.name ?? null,
    authorLogin: commit.author?.user?.login ?? null,
    authorAvatarUrl: commit.author?.user?.avatarUrl ?? null,
    url: commit.url,
  };
}

function normalizeIssue(issue: GitHubIssueNode): RepositoryIssue {
  return {
    number: issue.number,
    title: issue.title,
    url: issue.url,
    updatedAt: issue.updatedAt,
    authorLogin: issue.author?.login ?? null,
    authorAvatarUrl: issue.author?.avatarUrl ?? null,
  };
}

function normalizePullRequest(
  pullRequest: GitHubPullRequestNode,
): RepositoryPullRequest {
  return {
    ...normalizeIssue(pullRequest),
    isDraft: pullRequest.isDraft,
    mergedAt: pullRequest.mergedAt,
  };
}

function normalizeRelease(release: GitHubReleaseNode): RepositoryRelease {
  return {
    name: release.name,
    tagName: release.tagName,
    url: release.url,
    description: release.description,
    publishedAt: release.publishedAt,
    isDraft: release.isDraft,
    isPrerelease: release.isPrerelease,
  };
}

function normalizeLicense(license: {
  name: string;
  spdxId: string | null;
  url: string | null;
}): RepositoryLicense {
  return {
    name: license.name,
    spdxId: license.spdxId,
    url: license.url,
  };
}

function normalizeContributors(commits: GitHubCommitNode[]): RepositoryContributor[] {
  const contributors = new Map<string, RepositoryContributor>();

  for (const commit of commits) {
    const login = commit.author?.user?.login ?? null;
    const name = commit.author?.name ?? null;
    const key = login ?? `name:${name ?? "anonymous"}`;
    const existing = contributors.get(key);

    if (existing === undefined) {
      contributors.set(key, {
        login,
        name,
        avatarUrl: commit.author?.user?.avatarUrl ?? null,
        commitCount: 1,
      });
    } else {
      existing.commitCount += 1;
    }
  }

  return [...contributors.values()]
    .sort((a, b) => b.commitCount - a.commitCount)
    .slice(0, 12);
}

function sortByReleaseDate(a: RepositoryRelease, b: RepositoryRelease) {
  return dateValue(b.publishedAt) - dateValue(a.publishedAt);
}

function dateValue(value: string | null) {
  const parsed = value === null ? Number.NaN : Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
