# OpenHub setup

This guide covers the local foundation. It deliberately stops short of claiming
that GitHub OAuth or private repository access is configured until a real Convex
deployment and OAuth application are connected.

## Prerequisites

- Node.js 20.9 or newer
- npm
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

The credential is read only by the Next.js server adapter. It is never exposed
through a `NEXT_PUBLIC_` variable, returned to the browser, or used to authorize
private repositories in the public search route. The public route filters any
private result returned by a broadly scoped credential as a second boundary.

With this value configured:

- `/explore` can search public GitHub repositories.
- `/repos/<owner>/<name>` can open repository metadata and the default branch.
- Directory links load the corresponding tree.
- File links open a commit-resolved, read-only Monaco view.

## Run Convex locally

OpenHub uses the checked-in Convex CLI binary and an anonymous local Convex
backend for development. This does not create a cloud project or require a
Convex account. The first run downloads the local backend runtime, generates
`convex/_generated/`, and writes `.env.local`.

```bash
npm run dev:local
```

For separate terminals, start the backend with `npm run convex:local`, then run
`npm run prepare:convex` if needed and start the frontend with `npm run
dev:frontend`. `.env.local` is private and is not committed.

If the local backend binary cannot be downloaded, the CLI will stop before it
can write `CONVEX_URL`; this is an environment/network limitation, not a valid
local deployment. Keep the code generation step on hold until the binary is
available, or authenticate a cloud deployment for production setup.

The local backend is intentionally separate from production. Vercel cannot use
the anonymous local URL; production will need a real Convex deployment and
`NEXT_PUBLIC_CONVEX_URL` configured in Vercel.

Set the following variables on the Convex deployment, not in committed files:

- `AUTH_GITHUB_ID` — GitHub OAuth App client ID
- `AUTH_GITHUB_SECRET` — GitHub OAuth App client secret
- `OPENHUB_TOKEN_ENCRYPTION_KEY` — base64-encoded 32-byte AES-GCM key for the encrypted GitHub access token used by private browsing

## GitHub OAuth App

Create a GitHub OAuth App with the Convex Auth callback URL:

```text
https://<your-convex-deployment>.convex.site/api/auth/callback/github
```

The initial authorization request is GitHub-only and requests identity, email,
organization context, and the classic `repo` scope for repositories the user is
authorized to read. GitHub’s classic OAuth `repo` permission is broad and can
include write capability; OpenHub never exposes that token to the browser and
never calls write endpoints. Replace this with a GitHub App or an equivalently
constrained authorization model before broad production rollout.

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
   and regenerate `_generated/` with `node_modules/.bin/convex deploy`.
2. Create the GitHub OAuth App and set its credentials on Convex.
3. Configure `OPENHUB_TOKEN_ENCRYPTION_KEY` before enabling private repository
   browsing; do not expose raw tokens or enable provider write operations.
4. Regenerate `convex/_generated/` from the linked deployment and run a full
   browser verification pass for authenticated post interactions.

The GitHub repository and Vercel project already exist. The public repository
workspace does not remove the separate authorization requirement for private
repositories.
