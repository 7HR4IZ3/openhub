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
  }): Promise<RepositoryTreeEntry[]>;
  getFile(input: {
    owner: string;
    name: string;
    path: string;
    ref: string;
  }): Promise<RepositoryFile | null>;
}
