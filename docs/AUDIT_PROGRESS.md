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
| Source composer | Commit/line selection, source preview, attribution UI, server-verified public snapshot publication, and server-verified two-commit diff publication | Cloud verification, private source authorization, arbitrary diff-line anchors, and broader post types |
| Text/social backend | Authenticated post, reaction, bookmark, repost, comment/reply and notification handlers | Cloud deployment, integration tests, pagination, abuse controls, full UI parity |
| Post detail | Source/diff display, read-only Monaco embeds, quote UI, and social controls exist | Media and direct line-selection discussions |
| Identity | Verified GitHub profile import, profile creation/update flow, public profiles, and follows | Private-repository authorization and richer imported repository/activity context |
| Curation | Persistent lists, list item UI, communities, membership/moderation, topic follows, and connected screens | Private invitations, maintainer moderation and richer activity views |
| Feeds | Recent, following, and bounded engagement-weighted trending query modes; personalized repository recommendations | Pagination and richer negative feedback controls |
| Trust | Basic auth and private-post access helpers | Reports, blocks, mutes, moderation, attribution verification, rate limiting, owner-removal flows |
| Discovery/reputation | Evidence-backed GitHub repository signals, bounded documentation context, diversified recommendations, dismissals, contribution context, achievement storage, and owner-only public maintainer endorsements | Collaborator-level verification, broader activity signals, report correction, and anti-gaming telemetry |
| AI/business/providers | Roadmap and some contracts/post-type labels | AI citations/diagrams/limits, subscriptions, ads, analytics, bounties, GitLab/Bitbucket |

Followers-only posts are visible to their author and users following that author; private posts remain author-only. Realtime refers to app updates/comments/notifications, not implemented direct messages. Labels for tasks or bounties do not constitute escrow or a bounty workflow.

## Verified fixes in this audit

1. Directory/non-text GraphQL objects no longer masquerade as file content.
2. GitHub source paths encode each path segment so `#`, `?` and similar characters cannot change link semantics.
3. Repost state checks only normal repost rows, avoiding unique-query crashes after multiple quotes and incorrect active-state toggles.
4. Private/followers-only posts cannot be reposted, including by their author.
5. Non-public quote creation is rejected before writes, preventing public counters/notifications from exposing that activity.
6. Public source publishing now fails closed unless a Convex action verifies the exact GitHub commit, file, range, attribution, license, and snapshot before an internal mutation writes it. Private source publishing remains disabled.
7. Home remains a public browsing route when auth is configured; compose remains protected.
8. Home/curation responsive grid no longer reserves space for a hidden right rail. Mobile navigation includes Profile and content reserves clearance above the fixed nav.
9. Home's inactive menu control now opens Profile. Connected list/community screens create real records and show public/owned results. Feed tabs use distinct recent, following, and trending query modes.
10. Native system body typography, reduced-motion fallback and shadow-free shared buttons begin the minimalist migration.
11. Six regression tests added; CI now runs them. README and persistent agent instructions point to this report and the UI guide.
12. Public two-commit diff publication verifies exact GitHub commits and file snapshots server-side, stores bounded immutable base/head context, and keeps attribution attached through post, comment, search, feed, and repository discussion views.
13. Trending posts cap each author and suppress duplicate normalized post bodies within the bounded candidate window. Owner endorsement checks use the current public GitHub owner identity and short-lived provider evidence.

Existing source rows, if any, are not automatically verified or migrated by this patch. Review/quarantine legacy snapshots before enabling a public backend. This audit did not access a deployed Convex database.

## UI assessment

The user's three requested skills were read. Minimalist is the primary style. See [UI guidance](UI_GUIDANCE.md) for conflict resolution, source links and the future acceptance checklist. This is an initial correction pass, not a completed visual redesign. Existing Lucide icons, pill CTAs, inconsistent radii, hardcoded colors and repeated decorative labels remain. Marketing guidance does not override Monaco usability.

## Verification and external state

- The previous audit recorded six regression tests covering private/follower visibility, source rejection, quote/repost access, repeatable quotes, and non-text GitHub objects.
- In the current continuation, `tsc --noEmit --incremental false` and `git diff --check` pass. Tests, lint, build, and browser verification were intentionally skipped at the user's request.
- These tests mock framework boundaries and GitHub responses; they are not deployed Convex integration tests or browser end-to-end tests.
- Vercel deployment `dpl_7Y1fyLfz5sbw4QWtnhmBBPgdRfK2` was rechecked as READY. It predates these audit changes. Browser access to `/home` redirects to Vercel sign-in, so visual acceptance was not completed. No protection settings were changed.
- Previous health evidence showed missing Convex and public GitHub configuration. The health route reports configuration presence, not an authenticated dependency probe. Live OAuth/backend functionality remains unverified.
- GitHub PR 1 and stacked PR 2 remain the delivery path. PR 2 is based on PR 1's feature branch, not main. Main does not contain all feature work. No PR was merged during this audit.
- Linear: 7 issues In Review, 8 In Progress, 12 Backlog, 0 Done after the latest code slice. OAuth THR-10 remains In Progress. These reflect incomplete work, not three shipped milestones.

## Known remaining correctness risks

- Cloud-deployed verification of immutable source publishing remains a critical acceptance task. The implementation uses a trusted exact-commit GitHub request, derives metadata/snapshot server-side and writes via an internal mutation. Never trust browser-declared repository visibility.
- Branch-to-commit consistency and annotated refs need regression coverage across all source reads.
- Malformed post/list IDs need graceful not-found handling before invoking typed ID queries.
- Comment/notification timestamp-only cursors can miss tied timestamps; growing collections need stable pagination and load-more UI.
- No complete abuse/rate-limit layer or moderation workflow exists.
- Full Markdown rendering, safe source mentions, quote composition and notification error handling need dedicated vertical tests.
- Diff comments currently attach an exact verified diff context to the parent post; arbitrary changed-line anchors and side-specific line ranges remain open.
- Profile onboarding is implemented in the callback and connected profile view, but cloud OAuth acceptance is still outstanding. Sign-in now presents a setup state instead of invoking auth hooks without a Convex client.
- Provider capability flags and contributor sample wording need a separate accuracy pass.
- The previous Vercel build reported lockfile parsing warnings; root cause is not established. Verify uploaded lockfile integrity in the next deployment.

## Next implementation order

1. Restore full validation in the authorized environment; run CI and review the audit patch before merging.
2. Finish Convex deployment and GitHub OAuth configuration, then verify login, session handling, profile bootstrap and text-post/comment flow end to end.
3. Deploy and verify trusted public-source and diff verification with tampering, privacy and ref-pinning checks; then expand source post types.
4. Complete the minimalist component migration and browser acceptance on mobile/desktop in both themes.
5. Finish discovery reliability and social pagination, then follows/lists/communities as real vertical slices.
6. Add collaborator-level maintainer verification, moderation/report correction, and richer anti-gaming telemetry before AI, sponsorship or promotional features.

No percentage-complete estimate is given because the broad roadmap has no reliable effort denominator. The meaningful next milestone is one safe, tested flow: sign in, discover a repository, read source, publish a verified snippet, and discuss it.
