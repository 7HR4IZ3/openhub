# OpenHub Convex backend

Convex owns OpenHub’s application data, realtime reads, scheduled work, storage,
search, and authorization boundaries. GitHub remains the source of truth for
repository code and provider-native metadata.

Backend conventions:

- Use object-form Convex functions with argument and return validators.
- Use `getAuthUserId(ctx)` or `ctx.auth.getUserIdentity()` for authorization.
- Use indexes and pagination for recurring or growing reads.
- Keep provider access in server-side actions; never return provider tokens.
- Encrypt user-scoped GitHub OAuth tokens with `OPENHUB_TOKEN_ENCRYPTION_KEY`
  before persisting them; identity-only sign-in remains available if the key is
  absent, while private browsing fails closed.
- Keep private repository data out of public queries and indexes.
- Use internal functions for helpers and scheduled jobs.

The generated files in `_generated/` are checked in so a fresh clone can typecheck.
Once a real Convex deployment is linked, run `npx convex dev` to regenerate them
from the current schema and functions.
