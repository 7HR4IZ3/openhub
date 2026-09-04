# OpenHub security, privacy, and trust model

## 1. OAuth and provider tokens

- GitHub OAuth is handled server-side.
- Access tokens never reach client JavaScript.
- Store only encrypted token references or encrypted secrets in the backend.
- Request the smallest provider scopes needed for the current feature.
- Keep GitHub identity login separate from private-repository authorization; do not treat a broad classic OAuth `repo` grant as a read-only permission.
- Revalidate provider access before serving private repository content.
- Revoke and delete provider credentials when a user disconnects an account.
- Never log access tokens, private file contents, or authorization headers.

## 2. Private repository invariant

A user’s permission to read a private repository does not give OpenHub permission to publish that code publicly.

Therefore:

- Private repositories are visible only to authorized users.
- Private repositories are excluded from global search and public recommendations.
- Private files are excluded from public AI context.
- Private-source snippets cannot be published publicly in the initial release.
- Private content is never included in another user’s feed, cache, analytics, or search response.
- If access is lost, the user loses access through OpenHub.
- Unauthorized repository responses should not reveal whether a private repository exists.

## 3. Public source attribution

Every code snippet keeps:

- Original provider
- Repository owner
- Repository name
- File path
- Commit SHA
- Line range
- License metadata when available
- Link to the original source

OpenHub should display the license but avoid interrupting normal reading with unnecessary warnings. Provider and repository terms must still be reviewed before launch.

## 4. User-generated content

- Sanitize Markdown and HTML.
- Escape code content as text.
- Validate uploads by type and size.
- Rate-limit account creation, publishing, reactions, and reports.
- Protect mutation endpoints with authenticated identity checks.
- Prevent users from impersonating provider maintainers.
- Record moderation actions in an audit trail.

## 5. AI trust rules

- AI answers cite exact files and lines whenever possible.
- AI answers show the commit used for analysis.
- AI cannot modify or execute repository code.
- AI-generated content is not automatically published.
- AI-assisted posts may be labelled.
- Private source is not used to train a general model.
- Background repository analysis requires maintainer opt-in.
- Users can report inaccurate or unsafe explanations.

## 6. Moderation

Reportable categories:

- Spam
- Malware
- Credential theft
- Malicious code
- Scams
- Harassment
- Piracy
- Copyright abuse
- Fraudulent bounties
- AI-generated spam

Moderation tools:

- User reports
- Automated classification
- Secret and malware scanning where enabled
- Maintainer moderation for repository-associated content
- Community moderators
- External moderation webhooks or APIs
- Appeals and audit history

## 7. Anti-promotion safeguards

OpenHub must preserve its identity as a place for exploration and technical discussion.

- Sponsored placements are visibly labelled.
- Paid placement does not modify organic repository signals.
- New accounts have reasonable publishing limits.
- Repetitive self-promotion is down-ranked.
- Source-backed discussion is rewarded over empty announcements.
- AI cannot generate bulk posts.
- Users can mute projects, topics, authors, and keywords.

## 8. Data rights

Plan for:

- Account deletion
- Post export
- Data export
- Provider disconnection
- Repository removal requests
- Cache invalidation
- Correction of inaccurate repository signals
- Maintainer controls for background analysis
