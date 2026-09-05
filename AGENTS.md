# OpenHub Codex implementation guide

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product priority

Prioritize repository discovery, code understanding, and high-quality technical discussion. Treat AI as an explanation tool, not a content-generation engine.

## Engineering rules

- Before any UI work, read `docs/UI_GUIDANCE.md` and the three linked taste skills in full. The user's minimalist skill is the primary visual direction; product usability and accessibility override marketing-only rules. Audit before redesigning. Preserve routes and the OpenHub wordmark.

- Keep the application buildable after every milestone.
- Use Next.js App Router and server components by default; isolate interactive surfaces as client components.
- Keep GitHub and other provider calls behind server-side adapters.
- Never expose provider access tokens to the browser.
- Treat GitHub as the source of truth for repository code.
- Store code references by provider, repository, commit SHA, path, and line range.
- Private repository content must never enter public feeds, search, recommendations, or snippets.
- Use Convex for application data, realtime queries, scheduled work, storage, search, and server functions.
- Use Convex object-form functions with runtime argument and return validators.
- Add an index for every recurring Convex read path and paginate growing collections.
- Use `null` rather than `undefined` in Convex values.
- Use `@convex-dev/agent` for AI threads and `@convex-dev/workflow` for durable multi-step work.
- Do not add another realtime service, database, queue, or object store without documenting a concrete reason.
- Use shadcn/ui primitives and semantic design tokens. Keep normal UI typography separate from code typography.
- Check desktop and mobile layouts for every user-facing feature.

## Delivery rules

Each Linear issue should be implemented as a vertical slice where possible. Before closing an issue:

1. Update the relevant document.
2. Run typecheck, lint, tests, and production build.
3. Check authorization and private-content behavior.
4. Verify mobile layout.
5. Commit with a focused message.
6. Link the commit or pull request in Linear.
