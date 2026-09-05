import type { DiffContext, SourceReferenceDraft } from "../lib/source-references";

const MAX_SOURCE_FILE_BYTES = 512_000;

/** All stored attribution and text comes from GitHub, never the submitted draft. */
export async function verifyPublicSource(input: SourceReferenceDraft): Promise<SourceReferenceDraft> {
  const parts = input.repositoryFullName.split("/");
  const pathParts = input.path.split("/");
  if (input.provider !== "github" || parts.length !== 2 ||
      parts[0].length > 39 || parts[1].length > 100 ||
      !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part)) ||
      !/^[a-f0-9]{40}$/i.test(input.commitSha) || input.path.length === 0 || input.path.length > 1_000 ||
      input.path.startsWith("/") || pathParts.some((part) => part === ".." || part === "." || !part || /[\\\u0000-\u001f]/.test(part)) ||
      !Number.isSafeInteger(input.startLine) || !Number.isSafeInteger(input.endLine) ||
      input.startLine < 1 || input.startLine > 1_000_000 || input.endLine < input.startLine || input.endLine > 1_000_000) {
    throw new Error("Invalid immutable GitHub source reference");
  }
  const token = process.env.GITHUB_PUBLIC_TOKEN;
  if (!token) throw new Error("Public GitHub access is not configured on the backend");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenHub",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "error",
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
  const responseText = await response.text();
  if (responseText.length > 1_000_000) throw new Error("GitHub source lookup failed");
  let result: {
    errors?: unknown[];
    data?: { repository: null | { id: string; nameWithOwner: string; isPrivate: boolean;
      owner: { login: string }; primaryLanguage: { name: string } | null;
      licenseInfo: { spdxId: string } | null;
      commit: { __typename: string; oid: string } | null;
      file: { __typename: string; text?: string | null; byteSize?: number | null } | null;
    } };
  };
  try {
    result = JSON.parse(responseText) as typeof result;
  } catch {
    throw new Error("GitHub source lookup failed");
  }
  const repo = result.data?.repository;
  if (result.errors?.length || !repo || typeof repo.id !== "string" || typeof repo.nameWithOwner !== "string" ||
      typeof repo.isPrivate !== "boolean" || typeof repo.owner?.login !== "string" ||
      (repo.primaryLanguage !== null && typeof repo.primaryLanguage?.name !== "string") ||
      (repo.licenseInfo !== null && typeof repo.licenseInfo?.spdxId !== "string") || repo.isPrivate ||
      repo.nameWithOwner.toLowerCase() !== input.repositoryFullName.toLowerCase() ||
      repo.commit?.__typename !== "Commit" || typeof repo.commit.oid !== "string" || repo.commit.oid.toLowerCase() !== input.commitSha.toLowerCase() ||
      repo.file?.__typename !== "Blob" || typeof repo.file.text !== "string" ||
      new TextEncoder().encode(repo.file.text).length > MAX_SOURCE_FILE_BYTES ||
      (repo.file.byteSize !== undefined && repo.file.byteSize !== null
        && (!Number.isSafeInteger(repo.file.byteSize) || repo.file.byteSize < 0 || repo.file.byteSize > MAX_SOURCE_FILE_BYTES))) {
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

export async function verifyPublicDiff(input: Omit<DiffContext, "provider"> & { provider: string }): Promise<DiffContext> {
  const parts = input.repositoryFullName.split("/");
  if (
    input.provider !== "github" ||
    parts.length !== 2 ||
    !parts.every((part) => /^[a-zA-Z0-9_.-]+$/.test(part)) ||
    parts[0].length > 39 ||
    parts[1].length > 100 ||
    !isSafeSourcePath(input.path) ||
    !/^[a-f0-9]{40}$/i.test(input.baseCommitSha) ||
    !/^[a-f0-9]{40}$/i.test(input.headCommitSha) ||
    input.baseCommitSha.toLowerCase() === input.headCommitSha.toLowerCase()
  ) {
    throw new Error("Invalid immutable GitHub diff reference");
  }

  const token = process.env.GITHUB_PUBLIC_TOKEN;
  if (!token) throw new Error("Public GitHub access is not configured on the backend");

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenHub",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      query: `query Diff($owner:String!,$name:String!,$base:String!,$head:String!,$baseFile:String!,$headFile:String!){
        repository(owner:$owner,name:$name){
          id nameWithOwner isPrivate owner{login}
          primaryLanguage{name} licenseInfo{spdxId}
          baseCommit:object(expression:$base){__typename oid}
          headCommit:object(expression:$head){__typename oid}
          baseFile:object(expression:$baseFile){__typename ... on Blob{text byteSize}}
          headFile:object(expression:$headFile){__typename ... on Blob{text byteSize}}
        }
      }`,
      variables: {
        owner: parts[0],
        name: parts[1],
        base: input.baseCommitSha,
        head: input.headCommitSha,
        baseFile: `${input.baseCommitSha}:${input.path}`,
        headFile: `${input.headCommitSha}:${input.path}`,
      },
    }),
  });
  if (!response.ok) throw new Error("GitHub diff lookup failed");
  const responseText = await response.text();
  if (responseText.length > 2_000_000) throw new Error("GitHub diff lookup failed");

  let result: {
    errors?: unknown[];
    data?: {
      repository: null | {
        id: string;
        nameWithOwner: string;
        isPrivate: boolean;
        owner: { login: string };
        primaryLanguage: { name: string } | null;
        licenseInfo: { spdxId: string | null } | null;
        baseCommit: { __typename: string; oid: string } | null;
        headCommit: { __typename: string; oid: string } | null;
        baseFile: { __typename: string; text?: string | null; byteSize?: number | null } | null;
        headFile: { __typename: string; text?: string | null; byteSize?: number | null } | null;
      };
    };
  };
  try {
    result = JSON.parse(responseText) as typeof result;
  } catch {
    throw new Error("GitHub diff lookup failed");
  }

  const repo = result.data?.repository;
  const baseSnapshot = repo ? verifiedBlobSnapshot(repo.baseFile) : null;
  const headSnapshot = repo ? verifiedBlobSnapshot(repo.headFile) : null;
  if (
    result.errors?.length ||
    !repo ||
    typeof repo.id !== "string" ||
    typeof repo.nameWithOwner !== "string" ||
    typeof repo.isPrivate !== "boolean" ||
    typeof repo.owner?.login !== "string" ||
    (repo.primaryLanguage !== null && typeof repo.primaryLanguage?.name !== "string") ||
    (repo.licenseInfo !== null && repo.licenseInfo?.spdxId !== null && typeof repo.licenseInfo?.spdxId !== "string") ||
    repo.isPrivate ||
    repo.nameWithOwner.toLowerCase() !== input.repositoryFullName.toLowerCase() ||
    repo.baseCommit?.__typename !== "Commit" ||
    repo.headCommit?.__typename !== "Commit" ||
    typeof repo.baseCommit.oid !== "string" ||
    typeof repo.headCommit.oid !== "string" ||
    repo.baseCommit.oid.toLowerCase() !== input.baseCommitSha.toLowerCase() ||
    repo.headCommit.oid.toLowerCase() !== input.headCommitSha.toLowerCase() ||
    baseSnapshot === null ||
    headSnapshot === null ||
    (repo.baseFile === null && repo.headFile === null) ||
    new TextEncoder().encode(baseSnapshot).length + new TextEncoder().encode(headSnapshot).length > 800_000
  ) {
    throw new Error("Diff must reference a public text file at two existing commits (maximum 800 KB)");
  }

  const baseSha = repo.baseCommit.oid;
  const headSha = repo.headCommit.oid;
  return {
    provider: "github",
    repositoryId: repo.id,
    repositoryFullName: repo.nameWithOwner,
    repositoryName: repo.nameWithOwner.split("/")[1] ?? parts[1],
    originalOwner: repo.owner.login,
    path: input.path,
    baseCommitSha: baseSha,
    headCommitSha: headSha,
    ...(repo.primaryLanguage ? { language: repo.primaryLanguage.name } : {}),
    canonicalUrl: `https://github.com/${repo.nameWithOwner}/compare/${baseSha}...${headSha}`,
    ...(repo.licenseInfo?.spdxId ? { licenseSpdxId: repo.licenseInfo.spdxId } : {}),
    visibility: "public",
    baseSnapshot,
    headSnapshot,
  };
}

function isSafeSourcePath(path: string) {
  if (path.length === 0 || path.length > 1_000 || path.startsWith("/")) return false;
  return path.split("/").every((part) => part.length > 0 && part !== "." && part !== ".." && !/[\\\u0000-\u001f]/.test(part));
}

function verifiedBlobSnapshot(
  file: { __typename: string; text?: string | null; byteSize?: number | null } | null,
) {
  if (file === null) return "";
  if (
    file.__typename !== "Blob" ||
    typeof file.text !== "string" ||
    new TextEncoder().encode(file.text).length > MAX_SOURCE_FILE_BYTES ||
    (file.byteSize !== undefined && file.byteSize !== null &&
      (!Number.isSafeInteger(file.byteSize) || file.byteSize < 0 || file.byteSize > MAX_SOURCE_FILE_BYTES))
  ) return null;
  return file.text;
}
