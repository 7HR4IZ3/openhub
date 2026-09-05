# OpenHub progress audit

Date: 2026-09-05. Scope: conversation available in this session, local repository/history, GitHub branch and PR state, Linear issues, Vercel deployment metadata and browser access. This is not a claim to have retrieved every separate historical chat.

## Overall assessment

Early implementation with partial vertical slices, not a completed platform or three completed milestones. The previous README overstated M0 completion and implied source publication would become safe merely by connecting Convex. Those claims are corrected. Feature files, successful compilation and a READY frontend deployment are different from a tested live product.

## Delivery status

| Area | Evidence and present state | Remaining work |
| --- | --- | --- |
| Planning | Product, architecture, security, data, UX and roadmap documents; 27 Linear issues | Reconcile acceptance criteria with actual live flows |
| Foundation | Next.js, TypeScript, shadcn, Convex Auth wiring, provider contracts, CI, health route | Cloud backend, OAuth and end-to-end acceptance |
| Repository exploration | GitHub adapter, public search, file tree, read-only Monaco, refs/commits/issues/PRs/releases/license surfaces | Live credential configuration, robust caching/rate limits, large repos, authorization and private access |
| Source composer | Commit/line selection, source preview and attribution UI | Trusted server-side snapshot verification; publication is now disabled intentionally |
| Text/social backend | Authenticated post, reaction, bookmark, repost, comment/reply and notification handlers | Cloud deployment, integration tests, pagination, abuse controls, full UI parity |
| Post detail | Source display and social controls exist | Full Markdown, Monaco embeds, quote UI, diffs and line discussions |
| Identity | Profile schema and query/UI scaffolding | Verified GitHub profile import, profile creation/update flow, follows |
| Curation | Lists and communities page shells | Storage, queries, creation, membership and sharing permissions |
| Feeds | Recent public-post query and connected home surface | Following graph, real trending, personalization, ranking and explanations |
| Trust | Basic auth and private-post access helpers | Reports, blocks, mutes, moderation, attribution verification, rate limiting, owner-removal flows |
| AI/business/providers | Roadmap and some contracts/post-type labels | AI citations/diagrams/limits, subscriptions, ads, analytics, endorsements, bounties, GitLab/Bitbucket |

Followers-only posts currently remain author-only, deliberately failing closed until the follow graph exists. Realtime refers to app updates/comments/notifications, not implemented direct messages. Labels for tasks or bounties do not constitute escrow or a bounty workflow.

## Verified fixes in this audit

1. Directory/non-text GraphQL objects no longer masquerade as file content.
2. GitHub source paths encode each path segment so `#`, `?` and similar characters cannot change link semantics.
3. Repost state checks only normal repost rows, avoiding unique-query crashes after multiple quotes and incorrect active-state toggles.
4. Private/followers-only posts cannot be reposted, including by their author.
5. Non-public quote creation is rejected before writes, preventing public counters/notifications from exposing that activity.
6. Source publishing fails closed in the backend and is disabled with a clear notice in the composer. Client-supplied source text, attribution and visibility must not be treated as verified facts. This is containment, not the final source-verification implementation.
7. Home remains a public browsing route when auth is configured; compose remains protected.
8. Home/curation responsive grid no longer reserves space for a hidden right rail. Mobile navigation includes Profile and content reserves clearance above the fixed nav.
9. Home's inactive menu control now opens Profile. Lists/communities always disclose their preview status. Feed tabs no longer silently display the same recent feed as different ranking modes.
10. Native system body typography, reduced-motion fallback and shadow-free shared buttons begin the minimalist migration.
11. Six regression tests added; CI now runs them. README and persistent agent instructions point to this report and the UI guide.

Existing source rows, if any, are not automatically verified or migrated by this patch. Review/quarantine legacy snapshots before enabling a public backend. This audit did not access a deployed Convex database.

## UI assessment

The user's three requested skills were read. Minimalist is the primary style. See [UI guidance](UI_GUIDANCE.md) for conflict resolution, source links and the future acceptance checklist. This is an initial correction pass, not a completed visual redesign. Existing Lucide icons, pill CTAs, inconsistent radii, hardcoded colors and repeated decorative labels remain. Marketing guidance does not override Monaco usability.

## Verification and external state

- Six regression tests passed locally: private/follower visibility, unverified source rejection, private quote rejection, private repost rejection, repeatable-quote viewer state, and non-text GitHub objects.
- `git diff --check` passed.
- The subsequent typecheck/lint command was interrupted when the environment reported a network approval cancellation. No successful typecheck, lint or production build is claimed for this revision.
- These tests mock framework boundaries and GitHub responses; they are not deployed Convex integration tests or browser end-to-end tests.
- Vercel deployment `dpl_7Y1fyLfz5sbw4QWtnhmBBPgdRfK2` was rechecked as READY. It predates these audit changes. Browser access to `/home` redirects to Vercel sign-in, so visual acceptance was not completed. No protection settings were changed.
- Previous health evidence showed missing Convex and public GitHub configuration. The health route reports configuration presence, not an authenticated dependency probe. Live OAuth/backend functionality remains unverified.
- GitHub PR 1 and stacked PR 2 remain the delivery path. PR 2 is based on PR 1's feature branch, not main. Main does not contain all feature work. No PR was merged during this audit.
- Linear: 3 issues In Review, 8 In Progress, 16 Backlog, 0 Done. OAuth THR-10 is Backlog. These reflect incomplete work, not three shipped milestones.

## Known remaining correctness risks

- Server-verified immutable source publishing is the next critical backend task; use a trusted provider request at an exact commit, derive metadata/snapshot server-side and write via an internal mutation. Never trust browser-declared repository visibility.
- Branch-to-commit consistency and annotated refs need regression coverage across all source reads.
- Malformed post IDs need graceful not-found handling before invoking typed ID queries.
- Comment/notification timestamp-only cursors can miss tied timestamps; growing collections need stable pagination and load-more UI.
- No complete abuse/rate-limit layer or moderation workflow exists.
- Full Markdown rendering, safe source mentions, quote composition and notification error handling need dedicated vertical tests.
- Profile onboarding is not a finished GitHub identity-import flow.
- Provider capability flags and contributor sample wording need a separate accuracy pass.
- The previous Vercel build reported lockfile parsing warnings; root cause is not established. Verify uploaded lockfile integrity in the next deployment.

## Next implementation order

1. Restore full validation in the authorized environment; run CI and review the audit patch before merging.
2. Finish Convex deployment and GitHub OAuth configuration, then verify login, session handling, profile bootstrap and text-post/comment flow end to end.
3. Implement trusted public-source verification with tampering, privacy and ref-pinning tests; only then re-enable source publishing.
4. Complete the minimalist component migration and browser acceptance on mobile/desktop in both themes.
5. Finish discovery reliability and social pagination, then follows/lists/communities as real vertical slices.
6. Build ranking and trust safeguards before AI, sponsorship or promotional features.

No percentage-complete estimate is given because the broad roadmap has no reliable effort denominator. The meaningful next milestone is one safe, tested flow: sign in, discover a repository, read source, publish a verified snippet, and discuss it.
