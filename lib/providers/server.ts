import "server-only";

import { createGitHubProvider } from "./github";

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
