# OpenHub architecture

## 1. System boundary

GitHub, GitLab, Bitbucket, and other providers remain the source of truth for repository code and provider-native metadata. OpenHub owns:

- User identity and profile extensions
- Social posts and comments
- Follows, reactions, reposts, and bookmarks
- Communities and lists
- Repository references and cached metadata
- OpenHub signals and recommendations
- AI sessions and cited answers
- Moderation records
- Maintainer analytics
- Sponsorship and subscription records

## 2. Initial stack

- Next.js App Router
- TypeScript
- Vercel deployment
- Convex backend
- GitHub GraphQL API for compound repository queries
- GitHub REST API for provider surfaces that need it
- Monaco Editor in a lazy-loaded client component
- shadcn/ui
- Convex file storage for media unless a concrete requirement justifies another store
- Convex search indexes for OpenHub data and early repository search

## 3. Request and data flow

1. Browser requests an OpenHub page.
2. Next.js renders the route and mounts Convex client components where realtime data is needed.
3. Convex queries and actions read OpenHub data.
4. Server-side provider adapters call GitHub or another provider.
5. Provider responses are normalized into OpenHub’s provider-neutral shapes.
6. Safe metadata and commit-addressed content are cached according to visibility and freshness rules.
7. The UI displays source attribution and a link to the original provider.

Provider tokens must never be sent to the browser. The browser should only receive the data needed to render the authorized view.

The first exploration slice exposes two server-owned entry points:

- `/api/github/search` accepts a bounded repository query and returns public
  normalized results.
- `/repos/<owner>/<name>` loads public metadata, a directory tree, and a
  commit-resolved file through the server-only provider adapter.
- `/compose` can reload a selected public source range at its commit and render
  it in a read-only composer preview before publication.

Both routes use `GITHUB_PUBLIC_TOKEN` for public browsing and filter private
repositories at the public boundary. Authenticated private browsing must use a
different user-scoped authorization path.

### GitHub credential boundary

Convex Auth currently establishes the OpenHub session and normalized identity; it is not, by itself, the product’s durable private-repository credential store. Before private repository browsing is enabled, add an explicit same-GitHub provider connection flow or approved callback extension that stores a server-only, encrypted token reference with least-privilege scope. Do not put the provider token in a profile document, source reference, Convex query result, browser storage, or public cache.

The provider adapter must receive credentials only inside a server-side action or other trusted execution boundary. Public discovery may use a separately governed public-access credential when rate limits and provider terms permit it; an authenticated user’s private access must always be checked against that user’s provider authorization.

`GITHUB_PUBLIC_TOKEN` is an interim operational credential for public repository
discovery only. It must not become the private-repository credential model.

## 4. Provider abstraction

Define a provider interface before adding non-GitHub providers. It should cover capabilities such as:

- Repository lookup
- Repository search
- Tree listing
- File content at a ref or commit
- Branches and tags
- Commits and diffs
- Issues and pull requests
- Releases
- Contributors
- Dependencies and license
- Authenticated private-repository access

Each provider reports capabilities explicitly. OpenHub should not pretend that GitLab or Bitbucket expose exactly the same data as GitHub.

## 5. Caching model

Use two cache classes:

### Public cache

Keyed by provider, repository, ref, path, and commit SHA. It may be reused for public users, subject to provider policies and freshness.

### Authorized private cache

Keyed by the OpenHub user and provider repository authorization. It must never be included in global search, public recommendations, public snippets, public AI context, or another user’s response.

Commit-addressed data is preferred because it gives stable citations.

Use pagination, conditional provider requests, stale-while-revalidate behavior, and explicit cache expiry. Provider rate limits must be treated as a design constraint from the first milestone.

## 6. Convex modules

Suggested module boundaries:

- `auth` — identity and provider connection metadata
- `profiles` — OpenHub profiles and imported GitHub details
- `repositories` — normalized metadata and access-aware repository reads
- `providerActions` — server-side provider calls
- `posts` — post creation, reading, and editing
- `comments` — threaded and line-context comments
- `social` — follows, reactions, bookmarks, reposts, blocks, and mutes
- `feeds` — following, trending, and personalized feed reads
- `communities` — community membership, moderation, and posts
- `lists` — public and private collections
- `signals` — repository signals and recommendation inputs
- `ai` — agent threads, prompts, answers, citations, and usage
- `moderation` — reports, automated decisions, moderator actions, and audit logs
- `bounties` — task and bounty listings
- `analytics` — privacy-conscious event capture and maintainer reporting
- `subscriptions` — premium entitlement and usage limits

Public functions should be minimal. Use internal functions for helpers and scheduled jobs. Every Convex function must use object-form syntax, runtime argument and return validators, indexed reads, and explicit authorization.

The first `posts` module follows this boundary: `posts.recent` reads only the
public visibility index, while `posts.create` requires the signed-in user and
creates a source reference and post atomically. A source-backed post stores the
selected snapshot, provider, original owner, repository, commit, path, line
range, and canonical URL. The current mutation accepts a provider-normalized
source draft; before broad launch, replace that trust boundary with a
server-side provider verification action for every new source reference.

## 7. AI architecture

Use the Convex agent component for AI threads, history, streaming, retries, and tool use. Repository explanations should use a retrieval layer that returns chunks with file path, line range, commit SHA, and provider URL.

AI tools should be read-only:

- List repository files
- Read a file at a specific commit
- Read selected line ranges
- Inspect metadata
- Compare commits
- Read OpenHub discussion context when authorized

AI must not edit or execute repository code.

## 8. Realtime behavior

Convex realtime queries should power:

- Comments
- Discussion replies
- Reactions and counts
- Mentions
- Notifications
- Community activity
- Moderation state updates

Private messaging is deferred. No separate websocket or pub/sub service should be introduced for these features.

## 9. Storage

Use Convex storage for user-uploaded media. Store storage IDs in Convex documents and resolve URLs when reading; do not persist expiring URLs as permanent references.

Repository code should not be treated as user-uploaded media. Cache only the minimum content required for the product experience and preserve provider attribution.

## 10. Vercel deployment

- GitHub repository integration should create preview deployments for branches and pull requests.
- Production should deploy only from the protected main branch.
- Preview validation should run typecheck, lint, unit tests, build, and the core browser flow.
- Environment variables must be configured separately for preview and production.
- Provider secrets, AI keys, and deployment credentials must never be committed.
- Use Vercel observability and runtime logs after the first live deployment.

## 11. Missing supporting decisions

Before production launch, confirm:

- GitHub OAuth application ownership and callback URLs
- Private GitHub token exchange and secure storage design
- Provider API terms and caching limits
- AI model/provider and cost ceiling
- Subscription billing provider
- Advertising and sponsorship policy
- Data deletion and export policy
- Domain and trademark availability
