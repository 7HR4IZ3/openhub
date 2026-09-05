export type SourceReferenceDraft = {
  provider: string;
  repositoryId: string;
  repositoryFullName: string;
  originalOwner: string;
  path: string;
  commitSha: string;
  startLine: number;
  endLine: number;
  language?: string;
  canonicalUrl: string;
  licenseSpdxId?: string;
  visibility: "public" | "private";
  sourceSnapshot: string;
};

export type SourceContext = SourceReferenceDraft & {
  repositoryName: string;
};

export type DiffContext = {
  provider: string;
  repositoryId: string;
  repositoryFullName: string;
  originalOwner: string;
  path: string;
  baseCommitSha: string;
  headCommitSha: string;
  language?: string;
  canonicalUrl: string;
  licenseSpdxId?: string;
  visibility: "public" | "private";
  baseSnapshot: string;
  headSnapshot: string;
};

export type DiffDisplayContext = DiffContext & {
  repositoryName: string;
};
