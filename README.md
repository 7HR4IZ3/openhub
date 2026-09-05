# OpenHub

OpenHub is a code-native social platform for discovering, understanding, and discussing open-source software.

It uses GitHub as the first repository source, while OpenHub owns the social and discovery layer: feeds, source-backed code posts, discussions, profiles, lists, communities, recommendations, repository signals, and cited AI explanations.

## Product principle

OpenHub should make open-source exploration feel enjoyable and human. It must not become a generic project-promotion feed or an AI-generated content farm.

## Current status

Milestone 0 is complete. The first slices of Milestones 1–3 are now implemented: repository surface tabs for refs, commits, issues, pull requests, releases, contributors, and license context; source-backed post detail with comments, replies, reactions, bookmarks, reposts, quotes, notifications, and a public recent-post feed; and browsing-first profile, lists, communities, and feed entry points. Live GitHub OAuth, private-repository token storage, Convex cloud deployment, persisted follows/lists/communities, and recommendation ranking still require external setup or later vertical slices.

The application is being built in vertical milestones using:

- Next.js and TypeScript
- Convex for data, server functions, realtime updates, storage, search, and scheduled work
- Vercel for deployment
- GitHub GraphQL and REST APIs through server-side provider adapters
- Monaco Editor for the read-only repository explorer
- shadcn/ui for the component foundation

## Documents

- [Setup guide](docs/SETUP.md)
- [Product specification](docs/PRODUCT_SPEC.md)
- [UX and design specification](docs/UX_SPEC.md)
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
- Source: directories can be browsed and files open at a commit-resolved ref in a read-only Monaco editor.
- Attribution: source links point to the exact GitHub repository, commit, and path.
- Privacy: public routes filter private results and never accept a provider token from the browser.

## Source-backed composer slice

- Selection: choose lines in the read-only editor and open a focused composer link.
- Preview: the composer reloads the selected public source at its commit and preserves the original owner, repository, license, and line range.
- Post contract: Convex now has an authenticated post mutation, a public indexed recent-post query, and immutable source snapshot storage.
- Conversation: `/posts/<id>` renders the attributed snapshot and supports authenticated likes, saves, reposts, comments, and threaded replies; `/notifications` reads the realtime notification stream.
- Discovery: when Convex is configured, `/home` includes recent public source-backed posts with links back to their source context.
- Availability: publication becomes active after a Convex deployment is linked; without one, the full draft and source preview remain inspectable but the publish action is gated.

## Quality and deployment checks

- `/api/health` reports non-secret readiness flags for the web, Convex URL, and public GitHub credential.
- `.github/workflows/verify.yml` runs dependency installation, typecheck, lint, and production build on pushes and pull requests.
