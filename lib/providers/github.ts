import "server-only";

import {
  NormalizedRepository,
  ProviderCapabilities,
  RepositoryFile,
  RepositoryProvider,
  RepositorySearchResult,
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
  owner: { login: string };
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
          ref: {
            target: { oid: string } | null;
          } | null;
        } | null;
      }>(
        accessToken,
        `query GetFile($owner: String!, $name: String!, $expression: String!, $qualifiedRef: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expression) {
              ... on Blob { __typename oid byteSize text }
            }
            ref(qualifiedName: $qualifiedRef) {
              target { oid }
            }
          }
        }`,
        {
          owner,
          name,
          expression: `${ref}:${path}`,
          qualifiedRef: qualifyRef(ref),
        },
      );

      const object = response.repository?.object;
      if (object === null || object?.text === null || object === undefined) return null;
      const commitSha = isCommitSha(ref)
        ? ref
        : response.repository?.ref?.target?.oid;
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

function qualifyRef(value: string) {
  if (value.startsWith("refs/")) return value;
  return `refs/heads/${value}`;
}
