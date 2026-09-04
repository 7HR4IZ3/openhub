# OpenHub product specification

## 1. Product definition

OpenHub is an independent, code-native social network for developers. It combines:

1. A repository discovery and reading experience inspired by GitHub and code editors.
2. A social feed inspired by X, where code, technical explanations, questions, and reviews are first-class content.
3. An AI-assisted learning layer that explains repositories and code with exact file, line, and commit citations.

Working promise:

> Find interesting software, understand how it works, and discuss the code with people who build it.

OpenHub uses GitHub as its first source of repository information but is not a GitHub product or replacement. GitLab, Bitbucket, Codeberg, and other providers should be supported through a provider abstraction over time.

## 2. Problem

GitHub is excellent for hosting and collaborating on code, but repository discovery and learning often require navigating disconnected surfaces. Social platforms make technical conversation easy but detach discussion from the exact code being discussed.

OpenHub connects those experiences. A user can discover a repository, inspect its file tree, read a function, ask for an explanation, and publish a discussion linked to the exact commit and line range.

## 3. Goals

- Make discovering open-source projects enjoyable.
- Help developers understand unfamiliar code quickly.
- Make code discussions source-backed and contextual.
- Give maintainers qualified visibility without forcing them into a promotion race.
- Build a trustworthy developer identity from GitHub contributions and OpenHub activity.
- Create useful discovery signals beyond stars and follower counts.
- Support public repositories and private repositories that an authenticated user can access.
- Keep the core browsing and social experience free.

## 4. Non-goals

OpenHub will not initially:

- Host or mirror complete repositories as the source of truth.
- Edit files or execute code.
- Create repositories, commits, issues, or pull requests on behalf of users.
- Provide a jobs board.
- Provide private messaging or group chat in the first release.
- Allow one-click generation and publication of AI content.
- Let sponsored placement silently alter organic discovery rankings.

## 5. Primary users

### Developer and learner

Wants to find interesting projects, inspect implementation details, save projects for later, and ask questions about unfamiliar code.

### Maintainer

Wants qualified visibility, contextual discussions, contributor recognition, moderation controls, analytics, sponsorship, and bounty/task distribution.

### Organization

Wants a trustworthy technical presence, repository analytics, sponsored discovery, maintainers’ visibility, and a way to publish tasks or bounties.

## 6. Core user loop

1. Discover a repository through trending projects, posts, recommendations, search, a list, or a community.
2. Open the repository workspace.
3. Browse the tree, README, files, commits, issues, pull requests, releases, dependencies, and contributors.
4. Select a function or line range.
5. Read an AI explanation or share the selection as a source-backed post.
6. Receive comments, reviews, questions, saves, follows, and reposts.
7. Follow related repositories and return to explore more software.

The north-star action is not a like. It is a meaningful exploration session that leads to learning, saving, discussion, or sharing.

## 7. Authentication and identity

- GitHub OAuth is the only initial OpenHub sign-in method.
- One GitHub identity may be connected to one OpenHub account.
- The account imports the user’s GitHub profile, public repositories, languages, public activity, organizations, and relevant contribution signals.
- Users can add OpenHub-specific interests, biography, portfolio links, and availability.
- GitHub provider access and OpenHub identity are separate concepts. A future GitLab or Bitbucket connection may grant repository access without changing the OpenHub identity model.

## 8. Home and discovery

The home experience prioritizes discovery before personal status updates.

Initial feed surfaces:

- Trending repositories
- Trending code posts
- For You recommendations
- Following feed
- New and noteworthy repositories
- Discussions worth reading
- Activity from followed people, repositories, and topics
- Curated OpenHub lists

### Ranking principles

Ranking should use a mixture of:

- Topic and language relevance
- Follow relationships
- Repository freshness and maintenance
- Meaningful reading time
- Saves and repository follows
- Technical comment quality
- Diversity of projects and authors
- Negative feedback such as mute or not interested
- Suspicious activity and repetitive promotion penalties

Likes should not be the sole or dominant quality signal.

## 9. Repository discovery and search

Search should eventually cover:

- Repositories
- Users and organizations
- Posts and snippets
- Discussions
- Files and functions
- Issues and pull requests
- Communities and lists
- Tasks and bounties

Repository filters include language, topics, stars, forks, creation date, last activity, releases, license, contributor count, provider, owner, and activity signals.

Natural-language repository search is intentionally deferred. AI may answer questions inside a repository workspace without becoming the search interface.

### OpenHub signals

OpenHub should show explainable signals rather than pretending to produce an objective quality score:

- Recent activity
- Release momentum
- Maintainer responsiveness
- Contributor diversity
- Documentation depth
- Community activity
- Learning suitability
- Possible inactivity

Every signal must display supporting evidence and the date it was calculated. Stars and forks remain useful adoption indicators but must not define quality alone.

## 10. Repository workspace

### Header

Display repository name, owner, provider, description, stars, forks, primary language, topics, license, latest activity, OpenHub signals, follow, save, and an external provider link.

### Read-only surfaces

- File tree
- README
- Branches
- Tags
- Commits
- Releases
- Issues
- Pull requests
- Discussions
- Contributors
- Dependencies
- License
- Activity
- OpenHub posts
- Tasks and bounties

### Code explorer

- Read-only Monaco editor
- Syntax highlighting
- File tabs
- Breadcrumbs
- Branch and commit selection
- Code and file search
- Code folding
- Line numbers
- Minimap on desktop
- Function and symbol navigation where supported
- Copy link to file, function, line, or line range
- Unified and side-by-side diffs
- Share selected lines
- Discuss selected lines
- Explain file, function, or selection

Stable source references contain provider, repository, commit SHA, path, line range, language, and canonical URL.

## 11. Social content

Posts should feel like X posts with a code-editor attachment as a first-class block.

Supported types:

- Snippet
- Question
- Code review
- Discussion
- Project showcase
- Tutorial
- Bug explanation
- Release announcement
- Technical opinion
- Task
- Bounty

Posts support text, Markdown, code blocks, captions, images, videos, GIFs, polls, links, terminal output, attachments, embedded snippets, and diffs.

### Source-backed code posts

Every code post stores its source permanently:

- Provider
- Repository identifier
- Original owner
- File path
- Commit SHA
- Branch or tag
- Start and end lines
- Programming language
- Original URL
- License metadata when available

This preserves historical accuracy even if the repository changes later.

### Social actions

Users can like, comment, repost, quote-post, bookmark, save to a list, share externally, follow the author, follow the repository, follow topics, mention users, mention repositories, link to files and lines, report, mute, and block.

Comments support Markdown, code blocks, replies, mentions, reactions, and line-specific discussion.

## 12. Profiles, reputation, and achievements

Profiles contain imported GitHub details, OpenHub biography, featured repositories, posts, snippets, discussions, saved public lists, interests, portfolio links, availability, contribution summary, maintainer endorsements, and badges.

Reputation is based primarily on:

- Verified GitHub contributions
- Repository ownership or maintainership
- Maintainer endorsements
- Helpful technical discussions and reviews
- Community moderation and curation

Possible badges include contributor, maintainer, reviewer, educator, curator, and community builder. Follower count alone must not grant reputation.

## 13. Communities and lists

Communities are public or private topic spaces with a feed, rules, pinned resources, moderators, repository collections, and discussion. They are not chat rooms in the first release.

Lists are public or private collections of repositories, developers, posts, snippets, communities, or bounties. Collaborative lists can be added later.

## 14. AI workspace

AI features include repository summaries, file and function explanations, selected-code explanations, dependency explanations, commit and diff summaries, onboarding guides, architecture diagrams, codebase glossaries, entry-point identification, and comparisons between files or repositories.

Answers must cite exact repository, commit, file path, and line range wherever possible.

AI cannot modify code or execute code.

Background scanning and persistent repository analysis require maintainer opt-in. User-requested analysis of public code can run on demand. Private repository analysis remains private to authorized users.

Free users receive limited AI usage. Premium users receive higher limits and advanced analysis. AI-generated content must not be automatically published.

## 15. Tasks, bounties, and sponsorship

Tasks and bounties contain a repository, issue or task link, description, skills, reward, deadline, difficulty, maintainer, and status. The first implementation may link to external payment or escrow rather than holding funds natively.

Revenue options:

- Premium AI and repository intelligence
- Maintainer and organization analytics
- Clearly labelled sponsored repositories
- Developer-focused contextual ads
- Promoted bounties and collections
- External maintainer sponsorship links

Organic ranking and paid placement must remain separate. Ads should not appear inside the code editor.

## 16. Trust and anti-slop requirements

- Anyone can report posts, users, comments, communities, bounties, or ads.
- Prohibit spam, malware, credential theft, malicious code, scams, harassment, piracy, copyright abuse, fraudulent bounties, and AI-generated spam.
- Support block, mute, keyword filtering, and “not interested.”
- Maintainers can moderate content associated with their repositories.
- Allow automated moderation and external moderation integrations.
- Rate-limit new accounts and repetitive promotional publishing.
- Require source metadata for code posts.
- Label sponsored and AI-assisted content when applicable.
- Do not provide one-click bulk AI publishing.

## 17. Success metrics

### North-star metric

Meaningful weekly exploration sessions: a session where a user opens a repository and then reads code, uses an explanation, saves, follows, comments, or publishes a source-backed post.

### Supporting metrics

- Discovery-to-repository-open rate
- Files viewed per repository session
- Snippets created
- Code-post comment rate
- Saves and follows per active user
- Weekly returning explorers
- Seven-day and thirty-day retention
- Maintainer claims and analytics usage
- Premium conversion
- Report and low-quality-content rates
- Outbound clicks to original repositories

The critical trust metric is zero accidental exposure of private repository content.
