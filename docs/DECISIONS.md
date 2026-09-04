# OpenHub decisions and open questions

## Locked decisions

- Product name: OpenHub
- Audience: primarily developers, including learners and maintainers
- Scope: all software projects, not a single technical niche
- Initial identity provider: GitHub OAuth only
- Initial source provider: GitHub
- Future sources: GitLab, Bitbucket, Codeberg, and other compatible providers
- Backend: Convex
- Frontend: Next.js and TypeScript
- Hosting: Vercel
- UI foundation: shadcn/ui
- Code viewer: read-only Monaco Editor
- Code execution: not supported
- Code modification: not supported
- Repository creation or GitHub write actions: not supported initially
- Main product goal: repository discovery and technical discussion
- Visual direction: Substack-inspired reading hierarchy with X-like social interaction and GitHub-like code exploration
- Web first, mobile optimized, native mobile later
- PWA: not planned for the first web release
- AI: explanation and analysis only; no code modification or execution
- AI monetization: free limits plus premium subscription
- Monetization: subscriptions, sponsorships, sponsored repositories, ads, and analytics
- No jobs section
- No private messaging in the first release
- Public repository pages are readable without signing in; signing in is required for social actions and personalized features
- Private source references are never publishable to public feeds, search, recommendations, or snippets
- Realtime in the first release means comments, discussion replies, reactions, mentions, and notifications; direct messages remain deferred
- Repository code is accessed live from the provider and may be cached only under the visibility and attribution rules in the architecture and security documents
- The first public product is GitHub-only; additional providers follow validation of the GitHub experience
- Public repository exploration may use a separately governed server-only GitHub credential; it is not a substitute for user-scoped private-repository authorization

## Recommended defaults

- Communities should be discussion and curation spaces, not chat rooms.
- Bounties should begin as listings with external payment or issue links rather than native escrow.
- Organic ranking and paid placement should remain separate.
- Background repository scanning should require maintainer opt-in.
- User-requested analysis of accessible public code can run on demand.

## Decisions still requiring explicit confirmation

1. Which premium billing provider should be used when subscriptions are implemented?
2. What is the preferred launch domain and whether OpenHub requires a trademark review before public promotion?
3. Whether a GitHub App, OAuth token exchange, or another approved server-side connection should provide private-repository access after identity sign-in.
