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
