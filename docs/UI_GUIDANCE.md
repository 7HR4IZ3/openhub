# OpenHub UI direction and audit

## Authority and sources

Requested by the user on 2026-09-05. Read these sources in full before future UI work:

1. Primary style: [Minimalist UI](https://raw.githubusercontent.com/Leonxlnx/taste-skill/refs/heads/main/skills/minimalist-skill/SKILL.md).
2. Contextual audit: [Taste Skill](https://raw.githubusercontent.com/Leonxlnx/taste-skill/refs/heads/main/skills/taste-skill/SKILL.md).
3. Composition audit: [GPT Taste](https://raw.githubusercontent.com/Leonxlnx/taste-skill/refs/heads/main/skills/gpt-tasteskill/SKILL.md).

These URLs track upstream main and may change. They are references, not locally installed skills. Check changes before adopting new instructions.

## Conflict resolution

Minimalist is primary because the user explicitly selected it. Use the other two for applicable audit checks, not as competing visual systems. GPT Taste's forced GSAP, randomized marketing layouts, and cinematic spacing do not override a usable developer workspace. Taste explicitly excludes code editors and dense product UI. Keep Monaco's native read-only interactions and syntax colors.

Within Minimalist, prefer its explicit no-gradient constraint over its later optional gradient examples. Readable, immediately visible code and feed content takes precedence over scroll-entry animations. Never fabricate randomization output, statistics, contributors, testimonials, or screenshots. Never alter user-authored posts or source code to satisfy stylistic copy rules.

## Design read

Developer discovery and discussion, calm editorial language, shadcn/Radix component foundation. Preserve X-like navigation and Substack-inspired reading comfort, not their branding. Targeted evolution, not replacement of information architecture.

DESIGN_VARIANCE: 4. MOTION_INTENSITY: 2. VISUAL_DENSITY: 5 for the application. Marketing pages may be airier. These are explicit project overrides for browsing usability.

## Visual contract

- Warm neutral canvas, charcoal text, quiet dividers. Pastels only for semantic tags, never large saturated panels.
- Native system sans for interface text; monospace for source, SHAs and shortcuts. Editorial serif only for selected marketing headings after font assets are available, not code or navigation.
- Buttons 4-6px radius, cards 8-12px. Pills reserved for small tags and avatars.
- No ordinary button shadows, decorative gradients, glass cards, or forced scroll effects.
- Radix icons are already installed and are the target family. Existing Lucide usage remains migration debt; do not expand it.
- One theme across each page, maintain light/dark parity. Visible focus, properly labeled controls, 44px practical touch targets, and reduced-motion support.
- Keep public browsing anonymous. Present unavailable features as unavailable, not empty successful states.
- Real data or clearly marked previews. Do not present planned ranking, moderation or AI as working functionality.

## Source audit findings

Before this pass: Arial body stack, warm near-white surfaces, rust accents, charcoal primary buttons, Lucide icons, widespread pill CTAs and 16px cards. The app has primary navigation, public discovery, repository workspace, compose, post detail, notification and curation routes. Preserve these routes and the wordmark.

| Finding                                                       | Audit disposition                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Hidden right rail still occupied a column at 1024-1279px      | Fixed home and curation grid breakpoints                             |
| Mobile profile link omitted; fixed nav could cover content    | Added all six links and bottom content clearance                     |
| Home menu icon had no action                                  | Now links to profile and has an accurate label                       |
| Lists/communities implied connecting Convex would finish them | Always display implementation status                                 |
| Feed tabs implied ranking/following existed                   | Added truthful notices and restricted recent feed to its initial tab |
| Source composer implied safe publication                      | Explicit preview-only state until server verification exists         |
| Ordinary primary button shadows                               | Removed shared variant shadows                                       |
| Body typography and motion fallback                           | Native system stack and reduced-motion override added                |
| Lucide, pill CTAs, hardcoded colors, excessive eyebrow text   | Still requires comprehensive component migration                     |
| Marketing copy competes with discovery content on home        | Still requires content-priority redesign                             |
| Full dark/mobile/keyboard/contrast checks                     | Not yet completed; source inspection is not visual acceptance        |

## Future acceptance gate

Read source skills; record applicable checks and exceptions. Inspect actual rendered pages at 390, 768, 1024 and 1440px, both themes. Verify keyboard focus, zoom/reflow, labels, empty/loading/error states, long repo names and source scrolling. Check no dead controls or dishonest claims. Run regression tests, typecheck, lint, build and Lighthouse. Capture screenshots of actual UI when accessible. Do not mark the whole UI finished based on a build or a code review.

## 2026-09-06 comprehensive redesign

The current request authorizes a visual overhaul while preserving routes, source attribution, permissions, and the OpenHub wordmark. Application dials remain 4 / 2 / 5. The minimalist source wins over cinematic marketing instructions. Native editorial serif is now reserved for introductory headings; interface controls remain system sans and source stays monospace.

- Unified Home, Explore, composer and curation navigation with a compact header, persistent desktop rail, keyboard skip link, active-page semantics, and safe-area-aware mobile navigation.
- Moved Home feed and Explore search above promotional content. Removed repeated marketing blocks and the fabricated landing-page code preview.
- Migrated all Lucide imports to the existing Radix icon dependency without adding packages. Updated shared button and input dimensions, focus treatment, radii and loading skeletons.
- Replaced warm rust UI paint with semantic monochrome tokens and quiet green status surfaces; preserved editor syntax colors.
- Added abortable search, visible search labeling, skeletons, retry states, provider-qualified result keys, and keyboard-operated feed tabs.
- Compact repository headers and file trees keep the reader near the source. Composer retains source verification and all publication controls.

Validation scope: user-supplied brief excludes tests, builds, typecheck, lint, development servers, browser checks, external authentication and deployment. Source review and formatting only; rendered mobile/dark/keyboard acceptance remains unverified. Do not close Linear issues or report visual acceptance without the normal gate. User subsequently authorized incremental local commits.

### Interaction and curation follow-up

Lists and Communities now share a keyboard-operable tab component with roving focus, stable IDs, linked panels, and high-contrast active indicators. Removed repeated promotional panels ahead of list/community results and simplified the notifications toolbar. Sign-in renders a safe unavailable state when the Convex provider is absent. Removed the stale profile rail claim that the follow graph was still planned. Existing auth, privacy and mutation contracts are preserved.

### Reader and discussion follow-up

Post detail now uses the shared navigation shell, fixing the prior tablet layout that reserved an invisible right-hand column. Repository tabs support arrow, Home and End navigation and labeled panels. Monaco follows the selected light/dark theme using its native themes and keeps read-only behavior; smooth scrolling is disabled for reduced-motion consistency. Removed remaining heavy menu shadows and restored the original OpenHub mark unchanged. No backend contracts changed and no runtime validation was performed.

### Consistent unavailable states

Post loading, unavailable and missing states now retain application navigation and use shared skeleton/empty-state components. Placeholder routes use the same reading width and controls. Notification read mutations report failures and prevent repeated mark-all submissions. Momentary post actions no longer announce a false toggle state; true toggles retain pressed semantics.

### Composer width and source feedback

The composer no longer nests a fixed 300px sidebar inside the application content column; source and writing now retain the full reading width, with guidance below. Publication failures are announced and duplicate form submissions are guarded. Repository clipboard feedback is tied to the copied URL, timers are cleaned up, and clipboard failures expose a recovery path.
