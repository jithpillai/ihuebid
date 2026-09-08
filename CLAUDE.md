# ihue Bid — project status

**Product**: a generic market-value discovery and offer collection platform (`bid.ihue.in`). A creator publishes a rich listing; participants anonymously say what they think it's worth; responses aggregate into a consensus price, a likely value band, and a confidence level. Full spec: `requirements/ihue-bid-project-requirements-and-solution.md`. Reuse assessment against the sibling project: `requirements/ihue-rating-reuse-assessment.md`.

**Stack**: Next.js 16 + React 19 + TypeScript + Tailwind 4, pnpm, Prisma 7. Auth (email OTP + Google OIDC), session cookies, SES email, Cloudinary media, and the app/server/lib layering were forked from the sibling project `/Users/prijith/proto/ihueRating` — same conventions, ihue-bid-specific domain.

**Credentials note**: `.env.local` intentionally reuses ihueRating's real AWS/SES, Cloudinary, **and Google OAuth** credentials (the user's explicit choice), same Cloudinary cloud with `CLOUDINARY_FOLDER_PREFIX=ihue-bid/development`, same Google OAuth client. `AUTH_SECRET` and `CRON_SECRET` were freshly generated for this app — never shared across apps.

**SES `FromAddress` is IAM-restricted, not just verification-restricted**: the shared IAM user (`atride-ses-sender`) has a policy allowing `ses:SendEmail` only when `ses:FromAddress` exactly matches one of `noreply@atride.in` / `ihue.india@gmail.com` / `noreply@ihue.in` (`StringEquals`, no subdomain/wildcard matching). `noreply@bid.ihue.in` was tried first in production and got a `403 not authorized` — not an SES-domain-verification failure, an IAM policy denial. Fixed by setting `SES_FROM_EMAIL=noreply@ihue.in` directly (on that allowlist already) rather than editing the IAM policy. If a distinct `bid.ihue.in` from-address is ever wanted, that policy's `ses:FromAddress` list needs `noreply@bid.ihue.in` added first — verify by reproducing the raw SES `SendEmail` call locally (SigV4-signed, see git history around this note) rather than trusting the app's generic `EMAIL_DELIVERY_UNAVAILABLE` error message, which swallows the real reason.

**Google OAuth redirect URI is per-domain, not per-account**: reusing ihueRating's OAuth client works immediately for `localhost:3000` (both apps' local `APP_URL` matches an already-authorized redirect URI on that client) but needs `https://bid.ihue.in/api/auth/google/callback` added explicitly to that same client's authorized redirect URIs in Google Cloud Console before it works on the deployed domain — confirmed live by following the OAuth URL and reading Google's own `redirect_uri_mismatch` error page.

**Deployment**: live on Vercel at `bid.ihue.in` (custom domain attached, DNS via GoDaddy). Production env vars mirror `.env.local` with `EMAIL_PROVIDER=ses` (mock is hard-blocked in production by the code itself) and `APP_URL=https://bid.ihue.in`.

**Database**: provisioned — Neon project `ihue-bid` (ap-southeast-1), migrated and working. `DATABASE_URL`/`DIRECT_URL` are live in `.env.local`, and the same database is reused for production (no separate prod branch yet — a deliberate simplicity choice while there's no real traffic).

**Deliberate deviations from ihueRating's conventions** (documented so they don't look like drift):
- `Listing.publicId` is an app-generated, short, URL-safe id (`src/server/listings/public-id.ts`), not a DB-generated UUID like every other table's `id`. This is required by the product spec (§5): internal UUIDs must never appear in public listing URLs (`bid.ihue.in/{handle}/{publicId}`). `Listing.id` itself is still the normal UUID primary key.
- Category-specific listing fields live in a generic `ListingFieldValue` key/value table rather than dedicated columns, so a future category template doesn't require a schema migration. `src/server/listings/templates/used-vehicle.ts` is the first (only) template, and drives both the creator's structured-field form and the public listing display.

## Built so far (foundation slice)
- Auth: email OTP + Google OIDC, session cookies (`ihue_bid_session`), forked from ihueRating with product-name strings updated.
- Creator handle: `src/server/account/profile-service.ts` — lowercase-normalized, reserved-word-checked (`src/server/account/reserved-handles.ts`) against platform routes, with a real settings UI at `/account/settings` (ihueRating has the same underlying `UserProfile.handle` column but no UI to set it — this app builds that UI).
- Public creator profile at `/{handle}` — avatar, bio, location, verification badge, list of live/closed listings.
- Listings: `Listing` + `ListingFieldValue` + `MediaAsset` (ordered gallery) + `ExternalEmbed` (YouTube) + `ReferenceLink`. Creator flow: `/dashboard/listings/new` (create draft) → `/dashboard/listings/[id]/edit` (photos, video, reference links, publish) → public page at `/{handle}/{listingId}`.
- Media: Cloudinary sign → upload → server-verify flow forked from ihueRating, generalized so `LISTING_IMAGE` uploads append to a gallery (`MediaAsset`, ordered) instead of overwriting a single column like `USER_AVATAR` still does.
- Used Vehicle template: `src/server/listings/templates/used-vehicle.ts` — the one concrete instance of the generic template framework §6.2 calls for.
- Anonymous valuation responses: `ParticipantIdentity` + `Response` models, a signed first-party cookie (`ihue_bid_participant`, `src/server/participant/`) independent of the authenticated session, one active `Response` per participant per listing (upsert-in-place on revision, `revisionCount` tracked — no separate audit-history table yet). Submission at `POST /api/listings/[id]/responses`, only accepted while `status === "LIVE"`; value is snapped to the listing's increment and clamped to its range server-side regardless of client input (`src/server/listings/response-value.ts`, pure + unit-tested). UI: `PriceSlider` (`src/components/price-slider.tsx`) is a circular drag/keyboard slider — same geometry engineering as ihueRating's `rating-slider.tsx` (`src/lib/price-slider-geometry.ts`, pure + unit-tested), generalized from a fixed 0–10 domain to an arbitrary `[min, max, step]` price range, styled in Bid's blue instead of Rating's OKLCH rainbow (that gradient is semantically tied to Rating's 0–10 score identity, not reused). `ValuationForm` wraps it with submit/revise state; the public listing page resolves any existing valuation server-side from the participant cookie to prefill the slider.
- Aggregation & result display: `src/server/listings/aggregation.ts` — pure, unit-tested `computeAggregate()` — median consensus + 25th/75th-percentile band (resistant to outliers by construction, per §8.2), a sample-count-driven confidence tier (`< 5` LOW / `5–14` MEDIUM / `≥ 15` HIGH — a starting heuristic; §9.2's "poor diversity / suspicious pattern" downgrades aren't wired in since that needs the anti-abuse work below), fixed-width distribution bins, and the §8.3 green/yellow/red/purple expectation-vs-consensus wording (purple = wide dispersion, checked before the color comparison). `getListingAggregate()` in `response-service.ts` is the single source of truth for which rows count (filters `mode: ANONYMOUS_VALUATION`) — both the public page and the creator dashboard call it, so the filter can't drift between them the way it did in ihueRating's `attachRatingSummaries`. Presentational `<AggregateResult>` (`src/components/aggregate-result.tsx`) renders on the public listing page (only when `Listing.resultVisibility === "PUBLIC"`, a new creator-configurable field alongside `ownerPriceVisibility`, settable at creation only for now) and always on the creator's dashboard edit page regardless of that setting.

## Not built yet (explicitly deferred — see the reuse assessment for what each will fork vs. build new)
- Anti-abuse: rate limiting, honeypot, reCAPTCHA, suspicion scoring (§9.2–9.3) — the "one response per participant token" mechanism is real, but nothing yet stops one person from clearing cookies and responding again, and confidence doesn't yet downgrade for suspicious patterns.
- A persisted `AggregateSnapshot` (§16) — aggregates are computed live on every page load rather than cached/snapshotted; fine at current volumes, revisit if it becomes a real perf problem.
- Fuller creator analytics (interested-participant counts, verified-offer counts — there's no data for either mode yet since only `ANONYMOUS_VALUATION` is submittable).
- Dynamic OG image generation, full share panel (WhatsApp/QR), `sitemap.ts`.
- Closing flow, `ContactConsent`, outbox-based closure notifications, SMS provider.
- Listing edit for non-draft listings, handle/slug change redirects, editing `resultVisibility`/`ownerPriceVisibility` after creation.

## Verification convention (same as ihueRating)
`pnpm typecheck && pnpm lint && pnpm test` is necessary but not sufficient — only pure functions are unit-tested (handle validation, the Used Vehicle template validator, YouTube URL normalization). Verify DB-touching flows live: sign in via the mock email provider (any `*.test` address, or `EMAIL_PROVIDER=mock` locally, reveals the OTP on-screen), hit the real API routes, inspect real rows, clean up test data afterward.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
