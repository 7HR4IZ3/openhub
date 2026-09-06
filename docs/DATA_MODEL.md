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

Fields include user ID, provider, provider user ID, login, an encrypted token reference (never a raw token), scopes, last validation time, and status.

### `profiles`

OpenHub-specific biography, interests, portfolio links, availability, featured repositories, and privacy settings.

## 3. Repository tables

### `repositories`

Normalized provider repository metadata: provider, provider repository ID, an
optional private owner user ID, owner, name, URL, visibility, default branch,
description, language, topics, license, stars, forks, open issues, and fetch
timestamps. Repository files and trees are read through provider adapters and
may be cached in `repositoryCacheEntries`.

### `repositoryCacheEntries` and `providerRateLimits`

`repositoryCacheEntries` stores bounded GitHub repository, commit, tree, and
file responses. Public cache rows use a public scope; private rows use an
OpenHub-user scope and carry the owning user ID. Cache keys include provider,
repository, kind, ref, and path, with optional commit and conditional-request
metadata. Private rows are never read by public discovery, recommendations,
source publication, or another user's response. `providerRateLimits` keeps a
per-scope request window so an authorized repository gateway fails closed before
it overwhelms GitHub.

### `repositorySignals`

Explainable signal values and evidence: activity, release momentum, maintenance, documentation, contributor diversity, learning suitability, and possible inactivity.

## 4. Source references

### `sourceReferences`

Immutable reference attached to posts, comments, AI citations, and saved selections.

Fields:

- Provider
- Repository ID
- Commit SHA
- Ref name
- File path
- Start line
- End line
- Symbol name when available
- Language
- Canonical provider URL
- Visibility at creation
- Original owner metadata
- Immutable source snapshot captured for the published selection

## 5. Social tables

- `posts` — type, author, body, visibility, source reference, media, AI-assistance state, optional soft-deletion time, moderation state, interaction counters
- `comments` — post or repository context, author, body, parent comment, source reference, moderation state
- `postReactions` — actor, post, reaction type, creation time
- `postBookmarks` — actor, post, creation time
- `postReposts` — actor, original post, optional quote post, repost kind
- `follows` — actor, target type, target ID
- `bookmarks` and `reposts` remain the provider-neutral future names for
  cross-entity targets; the first implementation is post-specific.
- `mentions` — source content, mentioned user, actor, and resolved source IDs; post rows have a dedicated cleanup index
- `notifications` — recipient, event type, source, read state

## 6. Community and curation tables

- `communities`
- `communityMembers`
- `communityModerators`
- `communityPosts`
- `lists`
- `listItems`

The current curation schema also stores follows and community memberships. List
items can target public repositories, posts, people, or communities; target
labels and links are resolved at read time so deleted or private targets do not
leak through a public list.

Communities and lists each have explicit visibility and membership rules.

## 7. Trust and reputation tables

- `reputationSnapshots` — bounded GitHub public-activity samples with evidence URL and expiry
- `reputationEndorsements` — verified maintainer endorsement of a user, repository, permission level, and optional note
- `badges` — badge definition and award record
- `reports` — reporter, target, reason, evidence, status
- `moderationActions` — actor, target, action, reason, provider, timestamp
- `blocks`
- `mutes`
- `keywordFilters`
- `analyticsEvents` — authenticated aggregate reading events; no raw IP or
  provider token is recorded

## 8. AI tables and components

Use the Convex Agent component for conversation and message persistence. The
OpenHub-owned `aiUsage` table stores a bounded per-user daily request/input
budget. Current AI action results carry citations directly; durable OpenHub AI
artifact tables are deferred. AI citations must reference a commit-addressed
code reference.

## 9. Tasks and business tables

- `bounties` — public task context with an external issue/reward URL; OpenHub
  does not hold funds or implement escrow
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
- Repository cache entries by scope, repository, kind, ref, and path
- Provider request windows by scope and provider
- Notifications by recipient and read state
- Reports by status and creation time

The first social schema adds indexes for post/user interaction uniqueness,
post/status/time comment reads, comment parent traversal, quote lookup, and
recipient/time notification reads. Convex-generated types must be regenerated
after a real deployment is linked; the checked-in API declaration is currently
kept in sync manually so the web project can typecheck without cloud access.

Do not include `_creationTime` in a custom Convex index; Convex appends it automatically.
