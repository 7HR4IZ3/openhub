# OpenHub UX and design specification

## 1. Design direction

OpenHub should combine three recognizable behaviors:

- Substack-like editorial reading: generous hierarchy, strong typography, clear long-form context, and a calm reading surface.
- X-like interaction: fast feed scanning, compact social actions, reposts, quotes, replies, and persistent navigation.
- GitHub/VS Code-like exploration: dense but legible repository navigation, file trees, code tabs, line anchors, and technical metadata.

The result should feel like a serious developer product with a human editorial layer. It should not look like a generic dashboard, a cryptocurrency app, or an AI-generated template.

## 2. Information architecture

Primary navigation:

- Home
- Explore
- Search
- Communities
- Lists
- Notifications
- Profile

Contextual navigation:

- Repository tabs
- Profile tabs
- Community tabs
- Maintainer analytics
- Settings and account connections

## 3. Homepage

Desktop layout:

- Left: primary navigation and account shortcut
- Center: feed and discovery cards
- Right: trending repositories, suggested developers, and lists

Mobile layout:

- Single-column feed
- Compact top bar
- Bottom navigation
- Horizontally scrollable discovery sections only where useful
- No competing nested scroll containers

The homepage should make repository cards visually prominent. A repository card should show a clear description, language, activity, OpenHub signals, and why it is being recommended.

## 4. Repository page

Desktop layout:

- Left: resizable repository file tree
- Center: code viewer or selected repository surface
- Right: metadata, AI explanation, and discussion context

Mobile layout:

- Repository header becomes a compact summary
- File tree opens as a drawer
- Code occupies the main viewport
- README, commits, issues, discussions, and metadata become tabs or sheets
- AI and discussion panels open as full-height sheets

The most important action in the code viewer should be “Share selection” or “Discuss these lines,” not “edit.”

## 5. Social post card

A post card contains:

- Author identity and reputation indicators
- Post type
- Caption or technical context
- Read-only code editor block, diff, or media
- Source attribution
- Repository and commit link
- Social actions

Code should be readable without making the entire card a wall of monospace text. Captions use the normal interface typeface. Mono is reserved for source content, paths, commit identifiers, and technical metadata.

## 6. Composer

The composer should support two entry points:

1. General post composer from the feed.
2. Contextual composer from a selected repository file, function, or line range.

The contextual composer automatically attaches the source reference and lets the user choose snippet, question, review, or discussion.

Source metadata should be visible before publishing. Private references should not expose a public publishing option.

## 7. Visual system

Recommended foundation:

- shadcn/ui primitives
- CSS variables for semantic design tokens
- One primary styling convention per component
- StyleX only for isolated custom primitives if it proves useful
- System or humanist sans-serif for UI and prose
- Monospace font only for code
- Clear light/dark theme support
- Strong contrast for borders, labels, and code chrome
- Restrained color palette with one recognizable OpenHub accent

Do not make every surface a rounded card. Use spacing, dividers, typography, and alignment to create hierarchy. Rounded containers should indicate meaningful boundaries such as a post, a repository panel, or a modal.

## 8. Accessibility and responsive behavior

- Keyboard navigation for repository exploration
- Visible focus states
- Screen-reader labels for editor actions and social controls
- Minimum touch targets suitable for mobile
- Avoid hover-only actions
- Preserve line anchors on narrow screens
- Support reduced motion
- Do not rely on color alone for repository signals or moderation states
- Prevent iOS input zoom by using appropriate form-control typography

## 9. Important empty states

The app should provide useful empty states rather than generic placeholders:

- New user: choose interests and browse curated repositories
- Empty following feed: recommend people, repositories, and topics
- Empty list: explain what can be saved
- No discussion: invite a question tied to a file or line
- AI unavailable: provide a direct repository explanation path and a clear retry state
- Private repository unavailable: never reveal unauthorized repository details
