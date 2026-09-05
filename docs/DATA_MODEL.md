# OpenHub data model

## 1. Principles

- Provider IDs are preserved alongside OpenHub IDs.
- Source references are immutable at publication time.
- Private visibility is enforced at every read path.
- Feed and search reads are indexed and paginated.
- Provider code is not the authoritative OpenHub data model.

## 2. Identity tables

### `users`

OpenHub account identity keyed to the authentication provider’s subject.

Fields include provider subject, username, display name, avatar, bio, onboarding state, and timestamps.

### `providerAccounts`

Connected source accounts. Initial provider is GitHub.

Fields include user ID, provider, provider user ID, login, an optional encrypted token reference (never a raw token), scopes, last validation time, and status. The current GitHub login callback imports identity and profile data but does not yet persist a user-scoped repository token, so private repository access is intentionally unavailable.

### `profiles`

OpenHub-specific biography, interests, portfolio links, availability, featured repositories, and privacy settings.

## 3. Repository tables

### `repositories`

Normalized provider repository metadata: provider, provider repository ID, owner, name, URL, visibility, default branch, description, language, topics, license, stars, forks, open issues, and indexed/updated times. The current write path only persists verified public GitHub metadata.

### `repositorySnapshots`

Commit-addressed metadata and fetch state. Fields include repository ID, commit SHA, ref, fetched time, file count, tree status, and cache status.

### `repositoryFiles`

Commit-addressed file metadata and optionally cached content. Fields include snapshot ID, path, blob SHA, language, size, content reference, and fetch status.

### `discoverySignals`

Explainable public GitHub signal snapshots: observed metadata evidence, availability, refresh generation, observation time, and a calculated rank with version and explanations. Current evidence covers freshness, capped adoption, topics/language, license presence, bounded documentation context, archive state, and fork state. It does not claim maintenance quality, responsiveness, learning quality, or contributor quality.

## 4. Source references

### `sourceReferences`

Immutable reference attached to posts, comments, AI citations, and saved selections.

Current fields:

- Provider
- Repository ID
- Commit SHA
- File path
- Start line
- End line
- Language
- Canonical provider URL
- Visibility at creation
- SPDX license when available
- Original owner login
- Immutable source snapshot captured for the published selection
- Verification time when written by the server-side public-source action

The current publication path accepts only a public GitHub exact commit and text-file range. The server derives repository, owner, license, URL, visibility, and snapshot fields; browser-supplied metadata is not authoritative.

### `diffReferences`

Immutable public GitHub two-commit file comparisons attached to posts or
comments. A record stores the repository, original owner, path, base and head
commit SHAs, optional language/license context, canonical compare URL, public
visibility, both bounded text snapshots (an empty side represents an added or
deleted file), and server verification time. The server verifies both exact
commits and the file at each commit before publication; the browser cannot
write a diff reference directly.

## 5. Social tables

- `posts` — type, author, body, visibility, source or diff reference, media, AI-assistance state, moderation state, interaction counters
- `comments` — post or repository context, author, body, parent comment, source or diff reference, moderation state
- `postReactions` — actor, post, reaction type, creation time
- `postBookmarks` — actor, post, creation time
- `postReposts` — actor, original post, optional quote post, repost kind
- `follows` — actor, target type, target ID
- `bookmarks` and `reposts` remain the provider-neutral future names for
  cross-entity targets; the first implementation is post-specific.
- `mentions` — source content, mentioned entity, resolved state
- `notifications` — recipient, event type, source, read state

## 6. Community and curation tables

- `communities`
- `communityMemberships` — active or banned membership with owner, moderator, and member roles
- `lists`
- `listItems`
- `follows` — people, public repositories, topics, and categories

Communities and lists each have explicit visibility and membership rules. Private list invitations, community posts, rules, and richer moderation records remain planned.

## 7. Trust and reputation tables

- `contributorReputations` — bounded public GitHub contribution snapshot with evidence and calculation version
- `achievements` — evidence-backed achievement awards
- `discoveryEndorsements` — short-lived verified maintainer endorsement with provider identity, permission, evidence URL, credential kind (`owner_public` today; `user_scoped` reserved for a future least-privilege connection), and audit timestamps
- `reports` — reporter, target, reason, evidence, status
- `moderationActions` — actor, target, action, reason, provider, timestamp
- `blocks`
- `mutes`
- `keywordFilters`

## 8. AI tables and components

Use the Convex agent component for conversation and message persistence. OpenHub-owned records should include:

- `aiSessions`
- `aiUsage`
- `aiCitations`
- `aiArtifacts`

AI citations must reference a commit-addressed source reference. AI persistence is planned; no model or code-execution path is enabled in the current slice.

## 9. Tasks and business tables

- `bounties`
- `sponsorshipLinks`
- `subscriptions`
- `sponsoredPlacements`
- `analyticsEvents`
- `maintainerReports`

The first bounty implementation should record an external payment or issue URL rather than attempting native escrow.

## 10. Required index strategy

Every frequently filtered or ordered access path needs an index. Examples:

- Posts by author and creation time
- Posts by repository and creation time
- Posts by community and creation time
- Comments by post and creation time
- Follows by actor and target
- Bookmarks by user and target
- Repository snapshots by repository and commit
- Files by snapshot and path
- Notifications by recipient and read state
- Reports by status and creation time

The current schema also includes full-text search indexes for public post bodies and profile display names. The first social schema adds indexes for post/user interaction uniqueness,
source- and diff-backed repository discussion lookup, post/status/time comment
reads, comment parent traversal, quote lookup, and recipient/time notification
reads.
Convex-generated types must be regenerated
after a real deployment is linked; the checked-in API declaration is currently
kept in sync manually so the web project can typecheck without cloud access.

Do not include `_creationTime` in a custom Convex index; Convex appends it automatically.
