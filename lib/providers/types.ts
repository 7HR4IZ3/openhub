export type ProviderId = "github" | "gitlab" | "bitbucket" | "codeberg";

export type RepositoryVisibility = "public" | "private";

export type ProviderCapabilities = {
  repositorySearch: boolean;
  repositoryTree: boolean;
  fileContent: boolean;
  commits: boolean;
  diffs: boolean;
  issues: boolean;
  pullRequests: boolean;
  releases: boolean;
  contributors: boolean;
  authenticatedPrivateAccess: boolean;
};

export type NormalizedRepository = {
  provider: ProviderId;
  providerRepositoryId: string;
  ownerLogin: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  visibility: RepositoryVisibility;
  defaultBranch: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  licenseSpdxId: string | null;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  pushedAt: string | null;
  homepageUrl: string | null;
  isArchived: boolean;
  isFork: boolean;
  watchers: number;
};

export type RepositorySearchResult = {
  items: NormalizedRepository[];
  hasNextPage: boolean;
  cursor: string | null;
};

export type RepositoryTreeEntry = {
  name: string;
  path: string;
  kind: "file" | "directory" | "submodule";
  oid: string;
  byteSize: number | null;
};

export type RepositoryFile = {
  path: string;
  commitSha: string;
  oid: string;
  text: string;
  byteSize: number | null;
};

export type RepositoryRef = {
  name: string;
  ref: string;
  kind: "branch" | "tag";
  targetSha: string | null;
};

export type RepositoryCommit = {
  sha: string;
  abbreviatedSha: string;
  message: string;
  committedAt: string;
  authorName: string | null;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  url: string;
};

export type RepositoryIssue = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
};

export type RepositoryPullRequest = RepositoryIssue & {
  isDraft: boolean;
  mergedAt: string | null;
};

export type RepositoryRelease = {
  name: string | null;
  tagName: string;
  url: string;
  description: string | null;
  publishedAt: string | null;
  isDraft: boolean;
  isPrerelease: boolean;
};

export type RepositoryContributor = {
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
  commitCount: number;
};

export type RepositoryLicense = {
  name: string;
  spdxId: string | null;
  url: string | null;
};

export type RepositorySurfaces = {
  refs: RepositoryRef[];
  commits: RepositoryCommit[];
  issues: RepositoryIssue[];
  pullRequests: RepositoryPullRequest[];
  releases: RepositoryRelease[];
  contributors: RepositoryContributor[];
  license: RepositoryLicense | null;
  resolvedRefSha: string | null;
};

export interface RepositoryProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;
  searchRepositories(input: {
    query: string;
    cursor?: string | null;
    first?: number;
  }): Promise<RepositorySearchResult>;
  getRepository(input: {
    owner: string;
    name: string;
  }): Promise<NormalizedRepository | null>;
  getTree(input: {
    owner: string;
    name: string;
    ref: string;
    path?: string;
  }): Promise<RepositoryTreeEntry[]>;
  getFile(input: {
    owner: string;
    name: string;
    path: string;
    ref: string;
  }): Promise<RepositoryFile | null>;
  getRepositorySurfaces(input: {
    owner: string;
    name: string;
    ref: string;
  }): Promise<RepositorySurfaces>;
}
