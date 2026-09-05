# OpenHub progress audit

Date: 2026-09-05. Scope: conversation available in this session, local repository/history, GitHub branch and PR state, Linear issues, Vercel deployment metadata and browser access. This is not a claim to have retrieved every separate historical chat.

## Overall assessment

Early implementation with several coherent vertical slices, not a completed platform or three completed milestones. Feature files, successful compilation and a READY frontend deployment are different from a tested live product.

## Delivery status

| Area | Evidence and present state | Remaining work |
| --- | --- | --- |
| Planning | Product, architecture, security, data, UX and roadmap documents; Linear milestone/issues | Reconcile acceptance criteria with actual live flows |
| Foundation | Next.js, TypeScript, shadcn, Convex Auth wiring, provider contracts, CI, health route | Cloud backend, OAuth and end-to-end acceptance |
| Repository exploration | GitHub adapter, public search, file tree, read-only Monaco, refs/commits/issues/PRs/releases/license surfaces, encrypted authenticated private browsing | Live credential configuration, robust caching/rate limits, large repos, dependency/activity surfaces |
| Source composer | Commit/line selection, server-verified public source/diff snapshots, attribution UI | Provider-equivalent verification, media and richer attachments |
| Text/social backend | Authenticated post, reaction, bookmark, repost, comment/reply and notification handlers | Cloud deployment, integration tests, pagination, abuse controls, full UI parity |
| Post detail | Source display and social controls exist | Full Markdown, Monaco embeds, quote UI, diffs and line discussions |
| Identity | Verified GitHub identity/profile import, imported public repository previews, profile editing, encrypted token boundary | Production OAuth configuration, provider refresh/revocation UI |
| Curation | Public/private lists, people/repository/topic/category follows, communities, membership, list target resolution | Private sharing/invitations and community post streams |
| Feeds | Recent, following and trending post queries; evidence-backed repository recommendations | Full For You ranking, scheduled refresh, stronger diversity and negative feedback |
| Trust | Reports, blocks, mutes, keyword filters, moderation actions/history, source verification | Automated/external moderation, appeals, deletion/export, secret/malware workflows |
| AI/business/providers | Read-only cited source and bounded whole-repository analysis, shared quota, external task/bounty listings, aggregate maintainer analytics, public provider search adapters | Premium billing, ads, sponsorships, maintainer opt-in background scans, GitLab/Bitbucket verification |

Followers-only posts now consult the persisted person-follow graph; private posts remain author-only. Realtime refers to app updates/comments/notifications, not implemented direct messages. Task and bounty listings link to external issue/reward systems and do not constitute escrow.

## Verified fixes in this audit

1. Directory/non-text GraphQL objects no longer masquerade as file content.
2. GitHub source paths encode each path segment so `#`, `?` and similar characters cannot change link semantics.
3. Repost state checks only normal repost rows, avoiding unique-query crashes after multiple quotes and incorrect active-state toggles.
4. Private/followers-only posts cannot be reposted, including by their author.
5. Non-public quote creation is rejected before writes, preventing public counters/notifications from exposing that activity.
6. Source and diff publishing re-fetches public GitHub content at an exact commit and stores provider-derived attribution and snapshots through internal mutations. Unsupported providers and missing backend credentials still fail closed.
7. Home remains a public browsing route when auth is configured; compose remains protected.
8. Home/curation responsive grid no longer reserves space for a hidden right rail. Mobile navigation includes Profile and content reserves clearance above the fixed nav.
9. Home's inactive menu control now opens Profile. Lists/communities always disclose their preview status. Feed tabs no longer silently display the same recent feed as different ranking modes.
10. Native system body typography, reduced-motion fallback and shadow-free shared buttons begin the minimalist migration.
11. Six regression tests added; CI now runs them. README and persistent agent instructions point to this report and the UI guide.
12. Profile repository/post sections now read from bounded Convex queries, with an authenticated GitHub repository import action that preserves private visibility.
13. Repository analysis now samples a commit-pinned set of public files and returns bounded AI orientation/diagram answers with file citations.
14. Maintainer endorsements now require the same-user encrypted GitHub token, immutable GitHub identity validation, and an `admin`/`maintain` permission check.
15. User post edits and soft deletion are authorization-checked; deleted posts are suppressed from every post access path and mention rows are cleaned on edit/delete.

Existing source rows, if any, are not automatically verified or migrated by this patch. Review/quarantine legacy snapshots before enabling a public backend. This audit did not access a deployed Convex database.

## UI assessment

The user's three requested skills were read. Minimalist is the primary style. See [UI guidance](UI_GUIDANCE.md) for conflict resolution, source links and the future acceptance checklist. This is an initial correction pass, not a completed visual redesign. Existing Lucide icons, pill CTAs, inconsistent radii, hardcoded colors and repeated decorative labels remain. Marketing guidance does not override Monaco usability.

## Verification and external state

- `tsc --noEmit --incremental false` passes for the current implementation.
- `git diff --check` passes.
- Tests and browser verification were intentionally deferred for this implementation pass; no live Convex deployment or production OAuth flow is claimed.
- These tests mock framework boundaries and GitHub responses; they are not deployed Convex integration tests or browser end-to-end tests.
- Vercel deployment `dpl_7Y1fyLfz5sbw4QWtnhmBBPgdRfK2` was rechecked as READY. It predates these audit changes. Browser access to `/home` redirects to Vercel sign-in, so visual acceptance was not completed. No protection settings were changed.
- Previous health evidence showed missing Convex and public GitHub configuration. The health route reports configuration presence, not an authenticated dependency probe. Live OAuth/backend functionality remains unverified.
- The implementation branch is `main`; its local tip includes the current vertical slices and is ahead of the previously fetched `origin/main`. No live Convex deployment or production OAuth flow is claimed.
- Linear status is synchronized after the implementation commit; milestone percentages remain planning indicators, not shipped-product claims.

## Known remaining correctness risks

- Private-token encryption depends on a correctly generated 32-byte deployment key and should be rotated through an explicit reauthorization workflow.
- Branch-to-commit consistency and annotated refs need regression coverage across all source reads.
- Malformed post IDs need graceful not-found handling before invoking typed ID queries.
- Comment/notification timestamp-only cursors can miss tied timestamps; growing collections need stable pagination and load-more UI.
- Event ingestion, AI quota, and provider calls still need production-grade rate limiting and operational monitoring.
- Full Markdown rendering, safe source mentions, quote composition and notification error handling need dedicated vertical tests.
- Profile onboarding and token revocation/reconnect are not finished production flows.
- Provider capability flags and contributor sample wording need a separate accuracy pass.
- The previous Vercel build reported lockfile parsing warnings; root cause is not established. Verify uploaded lockfile integrity in the next deployment.

## Next implementation order

1. Restore full validation in the authorized environment; run CI and review the audit patch before merging.
2. Finish Convex deployment and GitHub OAuth configuration, then verify login, encrypted token storage, private browsing, profile bootstrap and text-post/comment flow end to end.
3. Add provider-neutral verification adapters and production rate limits before widening source publication.
4. Complete the minimalist component migration and browser acceptance on mobile/desktop in both themes.
5. Finish premium entitlements, maintainer opt-in background scans, provider-equivalent verification, and provider expansion.

No percentage-complete estimate is given because the broad roadmap has no reliable effort denominator. The meaningful next milestone is one safe, tested flow: sign in, discover a repository, read source, publish a verified snippet, and discuss it.
