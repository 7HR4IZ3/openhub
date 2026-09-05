import type { DiffContext, SourceReferenceDraft } from "../lib/source-references";

/** All stored attribution and text comes from GitHub, never the submitted draft. */
export async function verifyPublicSource(input: SourceReferenceDraft): Promise<SourceReferenceDraft> {
  const parts = input.repositoryFullName.split("/");
  if (input.provider !== "github" || parts.length !== 2 ||
      !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part)) ||
      !/^[a-f0-9]{40}$/i.test(input.commitSha) || !input.path ||
      input.path.startsWith("/") || input.path.split("/").some((part) => part === ".." || !part) ||
      !Number.isSafeInteger(input.startLine) || !Number.isSafeInteger(input.endLine) ||
      input.startLine < 1 || input.endLine < input.startLine) {
    throw new Error("Invalid immutable GitHub source reference");
  }
  const token = process.env.GITHUB_PUBLIC_TOKEN;
  if (!token) throw new Error("Public GitHub access is not configured on the backend");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      query: `query Source($owner:String!,$name:String!,$commit:String!,$file:String!){
        repository(owner:$owner,name:$name){id nameWithOwner isPrivate owner{login}
          primaryLanguage{name} licenseInfo{spdxId}
          commit:object(expression:$commit){__typename oid}
          file:object(expression:$file){__typename ... on Blob{text byteSize}}
        }
      }`,
      variables: { owner: parts[0], name: parts[1], commit: input.commitSha, file: `${input.commitSha}:${input.path}` },
    }),
  });
  if (!response.ok) throw new Error("GitHub source lookup failed");
  const result = await response.json() as {
    errors?: unknown[];
    data?: { repository: null | { id: string; nameWithOwner: string; isPrivate: boolean;
      owner: { login: string }; primaryLanguage: { name: string } | null;
      licenseInfo: { spdxId: string } | null;
      commit: { __typename: string; oid: string } | null;
      file: { __typename: string; text?: string | null; byteSize?: number } | null;
    } };
  };
  const repo = result.data?.repository;
  if (result.errors?.length || !repo || repo.isPrivate ||
      repo.commit?.__typename !== "Commit" || repo.commit.oid.toLowerCase() !== input.commitSha.toLowerCase() ||
      repo.file?.__typename !== "Blob" || typeof repo.file.text !== "string" ||
      (repo.file.byteSize ?? Infinity) > 512_000) {
    throw new Error("Source must be a public text file at an existing commit (maximum 512 KB)");
  }
  const lines = repo.file.text.split(/\r?\n/);
  if (input.endLine > lines.length) throw new Error("Source lines are outside the file");
  const snapshot = lines.slice(input.startLine - 1, input.endLine).join("\n");
  if (!snapshot.trim() || new TextEncoder().encode(snapshot).length > 64_000) {
    throw new Error("Select a nonempty source range smaller than 64 KB");
  }
  const sha = repo.commit.oid;
  return {
    provider: "github", repositoryId: repo.id, repositoryFullName: repo.nameWithOwner,
    originalOwner: repo.owner.login, path: input.path, commitSha: sha,
    startLine: input.startLine, endLine: input.endLine,
    ...(repo.primaryLanguage ? { language: repo.primaryLanguage.name } : {}),
    ...(repo.licenseInfo ? { licenseSpdxId: repo.licenseInfo.spdxId } : {}),
    canonicalUrl: `https://github.com/${repo.nameWithOwner}/blob/${sha}/${input.path.split("/").map(encodeURIComponent).join("/")}#L${input.startLine}-L${input.endLine}`,
    visibility: "public", sourceSnapshot: snapshot,
  };
}

export async function verifyPublicDiff(input: DiffContext): Promise<DiffContext> {
  const parts = input.repositoryFullName.split("/");
  const validPath = input.path && !input.path.startsWith("/") && !input.path.split("/").some((part) => part === ".." || !part);
  if (input.provider !== "github" || parts.length !== 2 || !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part)) ||
      !/^[a-f0-9]{40}$/i.test(input.baseCommitSha) || !/^[a-f0-9]{40}$/i.test(input.headCommitSha) ||
      input.baseCommitSha.toLowerCase() === input.headCommitSha.toLowerCase() || !validPath) {
    throw new Error("Invalid immutable GitHub diff reference");
  }
  const token = process.env.GITHUB_PUBLIC_TOKEN;
  if (!token) throw new Error("Public GitHub access is not configured on the backend");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      query: `query Diff($owner:String!,$name:String!,$base:String!,$head:String!,$baseFile:String!,$headFile:String!){
        repository(owner:$owner,name:$name){id nameWithOwner isPrivate owner{login} primaryLanguage{name} licenseInfo{spdxId}
          base:object(expression:$base){__typename oid}
          head:object(expression:$head){__typename oid}
          baseFile:object(expression:$baseFile){__typename ... on Blob{text byteSize}}
          headFile:object(expression:$headFile){__typename ... on Blob{text byteSize}}
        }
      }`,
      variables: {
        owner: parts[0], name: parts[1], base: input.baseCommitSha, head: input.headCommitSha,
        baseFile: `${input.baseCommitSha}:${input.path}`, headFile: `${input.headCommitSha}:${input.path}`,
      },
    }),
  });
  if (!response.ok) throw new Error("GitHub diff lookup failed");
  const result = await response.json() as {
    errors?: unknown[];
    data?: { repository: null | {
      id: string; nameWithOwner: string; isPrivate: boolean; owner: { login: string };
      primaryLanguage: { name: string } | null; licenseInfo: { spdxId: string } | null;
      base: { __typename: string; oid: string } | null; head: { __typename: string; oid: string } | null;
      baseFile: { __typename: string; text?: string | null; byteSize?: number } | null;
      headFile: { __typename: string; text?: string | null; byteSize?: number } | null;
    } };
  };
  const repo = result.data?.repository;
  const baseFile = repo?.baseFile ?? null;
  const headFile = repo?.headFile ?? null;
  const baseSnapshot = baseFile?.__typename === "Blob" && typeof baseFile.text === "string" ? baseFile.text : "";
  const headSnapshot = headFile?.__typename === "Blob" && typeof headFile.text === "string" ? headFile.text : "";
  if (result.errors?.length || !repo || repo.isPrivate || repo.base?.__typename !== "Commit" || repo.head?.__typename !== "Commit" ||
      repo.base.oid.toLowerCase() !== input.baseCommitSha.toLowerCase() || repo.head.oid.toLowerCase() !== input.headCommitSha.toLowerCase() ||
      (baseFile !== null && (baseFile.__typename !== "Blob" || typeof baseFile.text !== "string" || (baseFile.byteSize ?? Infinity) > 512_000)) ||
      (headFile !== null && (headFile.__typename !== "Blob" || typeof headFile.text !== "string" || (headFile.byteSize ?? Infinity) > 512_000)) ||
      (!baseSnapshot && !headSnapshot) || new TextEncoder().encode(baseSnapshot).length + new TextEncoder().encode(headSnapshot).length > 800_000) {
    throw new Error("Diff must reference a public text file at two existing commits (maximum 800 KB)");
  }
  return {
    provider: "github", repositoryId: repo.id, repositoryFullName: repo.nameWithOwner,
    originalOwner: repo.owner.login, path: input.path, baseCommitSha: repo.base.oid, headCommitSha: repo.head.oid,
    ...(repo.primaryLanguage ? { language: repo.primaryLanguage.name } : {}),
    ...(repo.licenseInfo ? { licenseSpdxId: repo.licenseInfo.spdxId } : {}),
    canonicalUrl: `https://github.com/${repo.nameWithOwner}/compare/${repo.base.oid}...${repo.head.oid}`,
    visibility: "public", baseSnapshot, headSnapshot,
  };
}
