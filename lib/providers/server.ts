import "server-only";

import type { ProviderId, RepositoryProvider } from "./types";
import { createGitHubProvider } from "./github";
import { createBitbucketProvider, createCodebergProvider, createGitLabProvider } from "./public-hosts";

/**
 * Public repository browsing uses a separately governed server credential.
 * It is deliberately not the authenticated user's provider credential.
 * Private results are filtered at the route boundary before they reach a
 * browser or public discovery surface.
 */
export function getPublicGitHubProvider() {
  const token = process.env.GITHUB_PUBLIC_TOKEN?.trim();
  return token ? createGitHubProvider(token) : null;
}

export function getPublicProvider(provider: ProviderId): RepositoryProvider | null {
  if (provider === "github") return getPublicGitHubProvider();
  if (provider === "gitlab") return createGitLabProvider();
  if (provider === "bitbucket") return createBitbucketProvider();
  return createCodebergProvider();
}
