# OpenHub setup

This guide covers the local foundation. It deliberately stops short of claiming
that GitHub OAuth or private repository access is configured until a real Convex
deployment and OAuth application are connected.

## Prerequisites

- Node.js 20.9 or newer
- npm
- A signed-in Convex account and development deployment
- A GitHub OAuth App owned by the OpenHub operator

## Install and run the shell

```bash
npm install
cp .env.example .env.local
npm run dev:frontend
```

The public landing, explore, sign-in, and home shell can be inspected without a
Convex URL. Authenticated flows require `NEXT_PUBLIC_CONVEX_URL`.

## Enable public repository browsing

The first repository exploration slice uses a server-only GitHub credential for
public discovery. Set this in `.env.local` for local work and in the
Vercel Preview/Production environments when deploying:

```text
GITHUB_PUBLIC_TOKEN=<server-only GitHub token>
```

The credential is read by the Next.js server adapter and the Convex public
source/reputation actions. It is never exposed through a `NEXT_PUBLIC_` variable,
returned to the browser, or used to authorize private repositories. The public
route filters any private result returned by a broadly scoped credential as a
second boundary.

With this value configured:

- `/explore` can search public GitHub repositories.
- `/repos/<owner>/<name>` can open repository metadata and the default branch.
- Directory links load the corresponding tree.
- File links open a commit-resolved, read-only Monaco view.

## Link Convex

From the repository root, run:

```bash
npx convex dev
```

The CLI links or creates a development deployment and writes the generated local
environment values. Keep `.env.local` private. Once linked, regenerate the
checked-in Convex client types and functions with the same command.

Set the following variables on the Convex deployment, not in committed files:

- `AUTH_GITHUB_ID` — GitHub OAuth App client ID
- `AUTH_GITHUB_SECRET` — GitHub OAuth App client secret
- `GITHUB_PUBLIC_TOKEN` — server-only token for GitHub GraphQL source/diff
  verification, public repository sync, bounded contribution signals, and
  current public owner checks for maintainer endorsements

## GitHub OAuth App

Create a GitHub OAuth App with the Convex Auth callback URL:

```text
https://<your-convex-deployment>.convex.site/api/auth/callback/github
```

The initial authorization request is GitHub-only and requests identity, email,
and organization context. Private repository access is a separate product
boundary: GitHub’s classic OAuth `repo` permission is broad and can include
write capability, so private browsing remains disabled until OpenHub has a
read-only GitHub App or an equivalently constrained server-side token flow.

## Vercel

Link the GitHub repository to a Vercel project after the repository exists. Add
`NEXT_PUBLIC_CONVEX_URL` separately to Preview and Production environments. The
Convex deployment remains the owner of backend environment variables and data.

Recommended first deployment checks:

```bash
npm run typecheck
npm run lint
npm run build
```

After deployment, use `GET /api/health` as a lightweight smoke check. It returns
only the web status and boolean readiness flags for the Convex URL and public
GitHub credential; it never returns secret values.

## Current external setup blockers

1. Authenticate a Convex account, create/link the OpenHub cloud deployment,
   set its server environment variables, and regenerate `_generated/`.
2. Create the GitHub OAuth App and set its credentials on Convex.
3. Implement the separate authenticated server-side provider-token boundary
   before enabling private repositories; do not expose raw tokens or enable
   provider write operations.
4. Regenerate `convex/_generated/` from the linked deployment and run a full
   browser verification pass for authenticated post interactions.

The GitHub repository and Vercel project already exist. The public repository
workspace does not remove the separate authorization requirement for private
repositories.
