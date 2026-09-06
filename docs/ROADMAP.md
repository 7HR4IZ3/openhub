# OpenHub delivery roadmap

The complete product is divided into vertical milestones. Each milestone must end with a usable, tested, deployable increment. These milestones are intended to be stored as Linear milestones with implementation issues beneath them.

## Milestone 0 — Foundation and product contract

### Outcome

A clean Next.js + Convex project with the OpenHub documents, design tokens, route skeleton, provider interface, and security boundaries established.

### Scope

- Repository and branch conventions
- Next.js App Router shell
- Convex project wiring
- GitHub OAuth design and callback contract
- Base shadcn/ui setup
- Mobile viewport foundation
- Provider adapter interfaces
- Initial schema boundaries
- Environment variable contract
- CI checks for typecheck, lint, test, and build

### Acceptance criteria

- Local app starts cleanly.
- Convex functions compile with validators.
- No provider secret is exposed to the browser.
- Design and architecture docs are committed.
- Preview deployment path is documented.

### Progress

The web verification workflow, non-secret `/api/health` endpoint, Convex
component wiring, and deployment environment contract are committed. Cloud
codegen and production verification remain blocked until a Convex deployment
is linked.

## Milestone 1 — Identity and repository exploration

### Outcome

An authenticated user can sign in with GitHub, view an imported OpenHub profile, discover repositories, and browse a repository through a responsive read-only workspace.

### Progress

The public exploration slice, read-only repository surfaces, and an encrypted
user-scoped private browsing path are implemented: server-side GitHub search,
public metadata, directory navigation, commit-resolved Monaco viewing,
branch/tag selection, commit history, issues, pull requests, releases,
contributors, license context, and authenticated private file browsing. The
remaining M1 blockers are Convex cloud deployment, live OAuth configuration,
provider-neutral public caching, and dependency/activity surfaces.

### Scope

- GitHub OAuth
- Profile import
- Repository search and metadata
- Trending repository seed/feed
- Repository page
- File tree
- Read-only Monaco editor
- Branch, ref, and commit selection
- README, commits, branches, tags, releases, issues, pull requests, contributors, dependencies, license, and activity surfaces
- Stable file and line links
- Public/private access isolation

### Acceptance criteria

- Public repository browsing works without leaking credentials.
- An authorized private repository is visible only to the authorized user.
- A file link resolves to the correct commit and line range.
- Mobile browsing does not require desktop-only interactions.

## Milestone 2 — Code-native social layer

### Outcome

Users can publish source-backed snippets, diffs, questions, reviews, and discussions and interact with them.

### Progress

The source-aware composer and Convex post contract are implemented. A reader
can select lines in the repository editor, open a focused composer, re-fetch
the commit-pinned attributed snapshot, publish, and open the resulting post
detail. The social backend and reader UI cover comments/replies, reactions,
bookmarks, reposts/quotes, notifications, diffs, mentions, Markdown-ish body
rendering, and public/following/trending feed reads when Convex is linked.
Media and richer attachment types remain open.

### Scope

- Post composer
- Read-only embedded editor block
- Snippet source snapshots
- Diff posts
- Text and Markdown posts
- Images, videos, GIFs, polls, links, terminal output, and attachments
- Likes, comments, reposts, quote-posts, bookmarks, saves, and shares
- Mentions and file/line references
- Post detail pages
- Realtime comment and notification updates

### Acceptance criteria

- A selected source range creates a stable, attributed post.
- Public posts cannot contain private source references.
- Comments support Markdown, code blocks, replies, and source references.
- Feed interactions update in realtime.

### Implementation note

Source and diff mutations accept only a bounded request draft, then verify the
public GitHub repository, commit, blob, line range, license, owner, and
canonical URL in a server-side action before an internal mutation stores the
immutable snapshot. Provider expansion still needs equivalent verification
implementations.

## Milestone 3 — Profiles, feeds, communities, and curation

### Outcome

OpenHub becomes a usable social discovery network rather than only a repository viewer.

### Progress

The first curation slice is implemented: GitHub-imported profiles, bounded
repository sync and public profile repository/post trails, editable profile
context, public/private lists, people/repository/topic/category follows,
following and trending feed queries, public/private community discovery and
creation, membership controls, list target resolution, and public community
detail routes. Private list sharing and community post streams remain open.

### Scope

- Full profiles
- Following people, repositories, topics, and categories
- Following feed
- For You feed
- Public and private lists
- Public and private communities
- Community moderators and rules
- Bookmarks and saved projects
- Notifications

### Acceptance criteria

- A user can follow a repository and see relevant updates.
- A user can create and manage a private list.
- A user can create a public or private community.
- Community content has separate moderation and visibility rules.

## Milestone 4 — Discovery intelligence and reputation

### Outcome

OpenHub helps users find worthwhile projects using explainable signals and trusted identities.

### Scope

- Repository activity and maintenance signals
- Documentation and learning signals
- Trending repository algorithm
- Trending post algorithm
- Personalized recommendations
- Contributor reputation
- Maintainer verification
- Maintainer endorsements
- Achievement badges
- Anti-gaming safeguards

### Progress

Public repository observation, evidence-backed freshness/adoption/license
signals, diversity-aware recommendations, dismissal controls, trending post
ranking, GitHub public-activity sampling, reputation scores, achievement
badges, and same-user GitHub `admin`/`maintain` endorsement verification are
implemented.

### Acceptance criteria

- Every repository signal has evidence and a calculation date.
- Organic ranking is separate from sponsored placement.
- Maintainer endorsements are restricted to verified maintainers.
- Recommendation feeds contain diversity and negative-feedback controls.

## Milestone 5 — Moderation and trust infrastructure

### Outcome

The platform can safely handle public technical conversation at meaningful scale.

### Scope

- Reports
- Blocks and mutes
- Keyword filters
- Automated moderation
- External moderation integration surface
- Maintainer moderation
- AI-slop controls
- Secret scanning opt-in
- Malware and unsafe-content handling
- Appeals and audit log
- Account and post deletion/export

### Progress

Reports, blocks, mutes, keyword filters, source/repository suppression,
author/maintainer post and comment moderation, and moderation history are
implemented. Automated/external moderation, appeals, secret scanning, malware
classification, and deletion/export remain open.

### Acceptance criteria

- Reported content has a traceable lifecycle.
- Users can mute and block content.
- Maintainers can moderate repository-associated content.
- Private-content tests pass for every public read path.

## Milestone 6 — AI repository workspace

### Outcome

Users can learn from repositories with cited explanations and visual architecture context.

### Scope

- Repository summaries
- File, function, and selection explanations
- Cited answers
- Commit and diff summaries
- Onboarding guides
- Dependency explanations
- Architecture diagrams
- Codebase glossary
- AI usage accounting
- Free limits and premium entitlements
- Maintainer opt-in for background analysis

### Progress

The Convex Agent component and Vercel AI SDK are wired for a read-only source
guide and bounded repository orientation. Explain, summary, and Mermaid diagram
modes re-verify source and return commit/file/line citations. Repository
analysis accepts public files or files authorized through the user's encrypted
GitHub token. Daily free/pro entitlements are enforced in Convex; billing,
diff/commit summaries, and maintainer opt-in background analysis remain open.

### Acceptance criteria

- Answers cite repository, commit, file, and line range.
- AI cannot modify or execute code.
- Private AI context is isolated.
- AI answers stream or update without custom realtime infrastructure.

## Milestone 7 — Maintainer economy and analytics

### Outcome

Maintainers and organizations can measure discovery and responsibly monetize attention.

### Scope

- Task and bounty listings
- External payment/issue links
- Maintainer analytics
- Organization analytics
- Premium subscription
- Sponsored repository placements
- Contextual advertising framework
- Sponsorship links
- Promoted collections and bounties

### Progress

External-link task/bounty listings, a privacy-conscious aggregate maintainer
analytics slice, and owner-managed HTTPS sponsorship links are implemented. The
subscription entitlement boundary is ready for billing, while Stripe
subscriptions, ads, promoted placements, and organization-level permission
verification remain open.

### Acceptance criteria

- Sponsored content is labelled.
- Organic ranking is unaffected by payment.
- Analytics are aggregate and privacy-conscious.
- Bounty status and external links are clear.

## Milestone 8 — Provider expansion and mobile scale

### Outcome

OpenHub expands beyond GitHub and becomes reliable for mobile-first browsing at broader usage.

### Scope

- GitLab adapter
- Bitbucket adapter
- Codeberg or additional provider evaluation
- Capability matrix
- Cross-provider search
- Full-text file and symbol index
- Provider-scoped cache tuning and cleanup
- Mobile performance pass
- Native mobile application discovery

### Acceptance criteria

- Provider-specific capability gaps are visible.
- Public cross-provider repository browsing works.
- Private access requires explicit provider authorization.
- Core browsing remains fast on mobile.

## Definition of done for every milestone

- Product behavior is implemented, not mocked on the primary path.
- Typecheck, lint, unit tests, and build pass.
- Convex deployment is clean.
- Authorization and privacy tests exist for new backend reads and writes.
- Mobile viewport has been checked.
- Documentation is updated.
- A Linear issue links to the relevant implementation commit or pull request.
