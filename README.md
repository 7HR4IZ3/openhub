# OpenHub

OpenHub is a code-native social platform for discovering, understanding, and discussing open-source software.

It uses GitHub as the first repository source, while OpenHub owns the social and discovery layer: feeds, source-backed code posts, discussions, profiles, lists, communities, recommendations, repository signals, and cited AI explanations.

## Product principle

OpenHub should make open-source exploration feel enjoyable and human. It must not become a generic project-promotion feed or an AI-generated content farm.

## Current status

OpenHub is an early implementation, not a launch-ready platform. Foundation and several repository/social/curation slices exist in code; cloud setup, production authentication, provider coverage, moderation operations, and monetization remain incomplete. See [the audit report](docs/AUDIT_PROGRESS.md) for verified status and limitations. Public source and diff publication now uses a server-side GitHub verification action; it remains unavailable until the Convex deployment has the required GitHub credential.

The application is being built in vertical milestones using:

- Next.js and TypeScript
- Convex for data, server functions, realtime updates, storage, search, and scheduled work
- Vercel for deployment
- GitHub GraphQL and REST APIs through server-side provider adapters
- Monaco Editor for the read-only repository explorer
- shadcn/ui for the component foundation
- Vercel AI SDK and the Convex Agent component for cited, read-only explanations

## Documents

- [Setup guide](docs/SETUP.md)
- [Product specification](docs/PRODUCT_SPEC.md)
- [UX and design specification](docs/UX_SPEC.md)
- [Current UI guidance and audit](docs/UI_GUIDANCE.md)
- [Progress audit](docs/AUDIT_PROGRESS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Security and trust](docs/SECURITY_AND_TRUST.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Decisions and open questions](docs/DECISIONS.md)

## Scope boundary

OpenHub is not a repository host. Repository code remains on GitHub or another supported provider. OpenHub is initially read-only with respect to source repositories: it does not edit files, execute code, create repositories, create pull requests, or replace GitHub’s project-management features.

## Development rule

Each milestone must leave the app buildable, type-safe, mobile-usable, and deployable. Backend changes must follow Convex’s object-form functions, runtime validators, indexed reads, explicit authorization, and pagination rules.

## Local setup

Requirements: Node.js 20.9 or newer, npm, and a Convex deployment for authenticated development.

```bash
npm install
npm run dev:frontend
```

Copy `.env.example` to `.env.local`. Set `GITHUB_PUBLIC_TOKEN` to enable server-side public repository search and browsing. Set `NEXT_PUBLIC_CONVEX_URL` when a Convex deployment is available. GitHub OAuth credentials and callback setup are documented in [Setup](docs/SETUP.md) and [Architecture](docs/ARCHITECTURE.md). Run `npm run typecheck`, `npm run lint`, and `npm run build` before opening a change.

## Repository exploration slice

- Search: `/explore` calls `/api/github/search` through the server-only GitHub adapter.
- Workspace: `/repos/<owner>/<name>` loads public repository metadata and its default branch.
- Private workspace: an authenticated GitHub user can browse an authorized repository through an encrypted server-side token when `OPENHUB_TOKEN_ENCRYPTION_KEY` is configured; private source cannot enter public posts or AI context.
- Source: directories can be browsed and files open at a commit-resolved ref in a read-only Monaco editor.
- Attribution: source links point to the exact GitHub repository, commit, and path.
- Privacy: public routes filter private results and never accept a provider token from the browser.

## Source-backed composer slice

- Selection: choose lines in the read-only editor and open a focused composer link.
- Preview: the composer reloads the selected public source at its commit and preserves the original owner, repository, license, and line range.
- Post contract: Convex now has an authenticated post mutation, a public indexed recent-post query, and immutable source snapshot storage.
- Conversation: `/posts/<id>` renders the attributed snapshot and supports authenticated likes, saves, reposts, comments, and threaded replies; `/notifications` reads the realtime notification stream.
- Profiles: authenticated GitHub repository imports populate bounded public repository trails; public profiles show repository and post context, while private repository metadata stays user-scoped.
- Learning: repository pages can request a bounded, commit-pinned orientation or Mermaid flow map with file citations. AI is read-only, cannot execute or modify source, and shares a daily quota with source explanations.
- Trust: maintainer endorsements validate the same-user encrypted GitHub authorization and require `admin` or `maintain` permission on the repository. Authors can edit or soft-delete their posts.
- Discovery: when Convex is configured, `/home` includes recent public source-backed posts with links back to their source context.
- Availability: publication requires a configured authenticated Convex backend. Source and diff publication re-fetches public GitHub content at the requested commit before storing an immutable snapshot.

## Quality and deployment checks

- `/api/health` reports non-secret readiness flags for the web, Convex URL, and public GitHub credential.
- `.github/workflows/verify.yml` runs dependency installation, typecheck, lint, and production build on pushes and pull requests.
