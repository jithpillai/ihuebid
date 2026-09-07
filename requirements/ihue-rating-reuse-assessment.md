# iHue Rating → iHue Bid: Reuse Assessment

Read-only inspection of `/Users/prijith/proto/ihueRating` (commit `d8461d6`, branch state as of 2026-09-07) against the iHue Bid requirements. Nothing in ihueRating was modified.

---

## 1. Overall architecture

**What exists today**
- Next.js 16 (App Router only, no Pages dir) + React 19 + TypeScript, Tailwind 4, pnpm, deployed to Vercel.
- Route handlers under `src/app/api/**/route.ts` — no Server Actions used anywhere; every mutation is a `POST`/`PATCH` fetch to a route handler from a client component (e.g. `src/components/create-entity-form.tsx` → `POST /api/entities`).
- Clean three-layer split: `src/app/**` (routing + page composition, thin), `src/server/**` (domain logic, one folder per bounded context: `auth/`, `entities/`, `ratings/`, `reviews/`, `media/`, `email/`, `ai/`, `outbox/`, `settings/`, `internal-testers/`, `places/`), `src/lib/**` (pure/shared utilities: `db.ts`, `rating-color.ts`, `postgres.ts`). `src/generated/prisma/**` is committed generated output.
- Dynamic routes are single-segment (`/entities/[id]`, `/entities/[id]/review`) — no nested multi-segment or catch-all routes anywhere, no `/[handle]/[listing]` precedent.
- Path alias `@/*` → `src/*` (tsconfig + vitest both configured for it).
- No middleware.ts, no monorepo/workspace packages despite `pnpm-workspace.yaml` existing (single app in it).

**Reusable for iHue Bid**
- **Directly reusable**: the app/server/lib layering, the route-handler-over-server-action convention, the `@/*` alias, the generated-Prisma-committed pattern, Tailwind 4 + pnpm + Vercel toolchain.
- **Needs a change**: iHue Bid's URL model (`/{handle}` and `/{handle}/{listingId}`) requires new nested dynamic segments (`/[handle]/page.tsx`, `/[handle]/[listingId]/page.tsx`) that don't exist as precedent — build fresh, but the surrounding page-composition style (thin page, server data fetch, `notFound()`/`redirect()` for lifecycle states) directly carries over from `src/app/entities/[id]/page.tsx`.
- Reserved-word protection for handles (`admin`, `api`, `login`, etc., per requirements §5) has no precedent — must be built new (a simple denylist check in the handle-setting service, analogous to `setUserHandle`'s existing regex/length validation).

---

## 2. Authentication & authorization

**What exists today**
- Email OTP (`src/server/auth/auth-service.ts`, `src/server/email/*`) + Google OIDC (`src/server/auth/google-*.ts`) — both fully wired, ported from a sibling project (`atride`).
- Sessions: opaque random token in an httpOnly cookie (`__Secure-ihue_session` in prod), hashed (SHA-256) before storage, `Session` Prisma model with `expiresAt`/`revokedAt`, 30-day max age (`src/server/auth/session.ts`, `config.ts`, `crypto.ts`).
- `getCurrentSession()` reads the cookie server-side (works in Server Components and route handlers); `requireAdminSession()` (`src/server/auth/admin.ts`) is the pattern for role-gating a whole page/route.
- `UserRole` enum (`USER`/`ADMIN`) on `User`, checked in `canEditEntity()` and `requireAdminSession()`.
- `assertSameOrigin()` (`src/server/auth/http.ts`) is the CSRF defense for same-origin mutating routes; a cross-origin route (`internal-testers`) instead uses an explicit origin allowlist + CORS headers.
- `*.test` email addresses bypass real SES and reveal the OTP code on-screen in non-production — the standing local/dev-testing escape hatch.

**Reusable for iHue Bid**
- **Directly reusable, fork as-is**: the entire OTP + Google OIDC auth stack, session cookie/token design, `assertSameOrigin`, the admin-role-gate pattern. Creator accounts in iHue Bid are just `User` accounts — no new auth mechanism needed.
- **Adaptable**: `UserProfile.handle` already exists in the schema (`prisma/schema.prisma` line ~170) with a unique constraint, a working `setUserHandle()` service (`src/server/account/profile-service.ts`) and a working `POST /api/account/handle` route — **but per CLAUDE.md, there is currently no UI anywhere to set it**, and it's used today only as an optional reviewer alias (`DisplayMode.ALIAS`), not as a public profile identity. For iHue Bid, `handle` needs to become a *required*, prominent, reserved-word-checked creator identity with a real public profile page — the data model piece is reusable, the product surface is not built.
- **New for iHue Bid**: a `CreatorProfile`-shaped concept (per requirements §16) — iHue Rating's `UserProfile` is thin (handle, avatar, default display mode). iHue Bid needs public-facing fields (display name for the profile, short description, location, links, verification status) that don't exist yet. Recommend extending `UserProfile` (or a new `CreatorProfile` 1:1 table) rather than inventing a parallel user system.
- Every User in iHue Rating is implicitly "reviewer-or-creator" with no role distinction beyond admin; iHue Bid's participant is explicitly anonymous/unauthenticated, which is a new axis entirely (see §8).

---

## 3. Database/schema conventions

**What exists today**
- Prisma 7 (`generator client`, `prisma-client` provider, output committed to `src/generated/prisma`), Postgres via Neon, `@prisma/adapter-pg` driver adapter (not the default binary engine) — `src/lib/db.ts`.
- ID convention: every table `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` — always DB-generated UUIDs, never cuid/nanoid, never app-generated.
- Consistent field mapping: camelCase in Prisma, `@map("snake_case")` to Postgres columns, `@@map("snake_case_plural")` for table names. All timestamps `@db.Timestamptz(3)`, `createdAt @default(now())`, `updatedAt @updatedAt`.
- No multi-tenancy/row-level-security pattern — single global schema, ownership scoped via foreign keys (`createdById`, `ownerId`) and app-level checks (`canEditEntity`), not Postgres RLS or a tenant column.
- `pg_trgm` Postgres extension enabled via `previewFeatures = ["postgresqlExtensions"]` + `extensions = [pg_trgm]`, used for fuzzy similarity search (`word_similarity()` in `findSimilarEntities`).
- Migrations: standard `prisma migrate dev`/`deploy`, one directory per migration under `prisma/migrations/`, `prisma.config.ts` (new Prisma 7 config file, not `package.json`) points at a `.env.local`-loaded `DIRECT_URL` for migrations vs. pooled `DATABASE_URL` for runtime (Neon-specific pooling split).
- `prisma/seed.ts` idempotently seeds reference data (entity dimensions, demo movies, admin bootstrap) — safe to rerun.
- Decimal fields for scores: `Decimal @db.Decimal(3, 1)` (one decimal place, matches the 0.0–10.0 rating scale exactly).

**Reusable for iHue Bid**
- **Directly reusable**: UUID-via-`gen_random_uuid()` convention, camelCase/snake_case mapping convention, Timestamptz(3) convention, the pooled-vs-direct URL split, `prisma.config.ts` shape, seed-script idempotency pattern, driver adapter setup in `db.ts`.
- **Adaptable**: the ownership/authorization pattern (`createdById`/`ownerId` + app-level `canEditEntity`-style helper) directly maps to Listing ownership by Creator.
- **New for iHue Bid**: `Decimal(3,1)` was sized for a 0–10 rating; price fields need a different precision/scale (currency amounts, potentially large — lakhs/crores — plus a currency code column) and should probably use `Decimal(14,2)` or similar plus a separate `currency` field, not reuse the rating column shape. No prior art for money storage in this codebase.
- `pg_trgm` is already enabled and could be reused for creator/listing search-as-you-type, but nothing in iHue Bid's spec strictly requires it for MVP.

---

## 4. Media handling

**What exists today**
- Cloudinary for all images (`src/server/media/cloudinary.ts`, `service.ts`, `policy.ts`). Client gets a signed-upload payload from `POST /api/media/sign`, uploads directly to Cloudinary from the browser, then calls `POST /api/media/complete` which re-fetches the resource from Cloudinary's API (server-side, authoritative) to validate format/size before persisting `imagePublicId`/`avatarPublicId` — never trusts client-reported metadata.
- `MEDIA_POLICY` (`policy.ts`) defines per-purpose max size and allowed formats (`jpg`/`jpeg`/`png`/`webp` only); purposes are a small closed enum (`USER_AVATAR`, `ENTITY_IMAGE`) — **single image per entity, not a gallery**. Uploading a new image destroys the old one (`removeMediaAsset`/old-publicId cleanup in `completeMediaUpload`).
- Public IDs are namespaced by ownership: `${folderPrefix}/entities/{entityId}/image/{uuid}` or `${folderPrefix}/users/{userId}/avatar/{uuid}` — prevents a client from overwriting someone else's asset even with a valid signature, since `completeMediaUpload` checks the returned public_id starts with the expected prefix.
- Authorization for entity image edits reuses `canEditEntity()` from the entity service.
- No video/embed handling anywhere (no YouTube embed component, no external-embed model).
- One AI-only path: `src/server/media/entity-image-gen.ts` (Gemini image generation fallback) — not relevant to iHue Bid.

**Reusable for iHue Bid**
- **Directly reusable pattern, needs multiplication**: the sign → client-upload → complete → server-verify flow is exactly right for iHue Bid and should be forked as-is for `MediaAsset` uploads. The security posture (public-ID prefix ownership check, server-side re-verification of format/size, orphan cleanup on replace) is worth preserving exactly.
- **Needs a real change**: iHue Rating supports exactly one image per owner (avatar) or per entity — no ordering, no multi-image gallery, no `MediaAsset` table at all (the public ID is just a column on `Entity`/`UserProfile`). iHue Bid's requirement for an **ordered image gallery** (§6.1, §16 `MediaAsset`) needs a genuinely new `MediaAsset` model (entityId/listingId FK, publicId, sortOrder, createdAt) and new list/reorder/delete routes — there is no existing multi-asset precedent to fork, only the single-asset upload primitives.
- **New for iHue Bid**: YouTube (and future Vimeo) embed support (`ExternalEmbed`/`ReferenceLink` per requirements §16) has zero precedent in iHue Rating — build from scratch (URL validation/normalization, oEmbed or simple iframe embed, "graceful embed failure" per NFRs).
- Cloudinary env vars (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/FOLDER_PREFIX`) and account can likely be shared or cloned with a new folder prefix (e.g. `ihue-bid/...`) exactly as ihueRating currently reuses `atride`'s Cloudinary account under a different prefix — same low-friction pattern.

---

## 5. Design system / UI / styling

**What exists today**
- Tailwind CSS 4 via `@tailwindcss/postcss`, imported with `@import "tailwindcss"` in `src/app/globals.css` — no `tailwind.config.*` file (Tailwind 4's CSS-first config), no `components.json`, **no shadcn/ui or any component library** anywhere in the repo.
- All UI is hand-rolled function components using Tailwind utility classes directly in JSX (see `src/components/entity-card.tsx`, `site-header.tsx`) — no design-token abstraction layer, no `cn()`/`cva()` helper found, no Storybook.
- A few bespoke CSS-only effects live in `globals.css` as named classes (`.rain-button`, `.search-button`, `.hue-dna-*` animations), each respecting `prefers-reduced-motion`.
- Consistent visual vocabulary: `rounded-2xl`/`rounded-3xl` cards, `zinc` neutral palette, `emerald` as the primary action color, bold/black font weights for headings (`font-black`), generous padding, `max-w-3xl`/`max-w-6xl` content containers.
- The one genuinely reusable *design-system-grade* piece is the rating-color engine itself: `src/lib/rating-color.ts` — a deterministic OKLCH-interpolated color gradient over a 0–10 score, fully unit-tested (`rating-color.test.ts`), version-stamped (`RATING_COLOR_SCALE_VERSION`) for downstream compatibility.
- `rating-slider.tsx` is a full custom circular OKLCH slider component (not mentioned in file dump above but referenced throughout CLAUDE.md) — a sophisticated one-off widget, tightly coupled to the 0–10 rating domain.
- Mobile-first is achieved ad hoc via Tailwind responsive prefixes per page, not a systemic layout primitive; no evidence of a persistent bottom-nav or share-sheet pattern (single-purpose app, most pages are simple content pages).
- No PWA manifest/service worker (explicitly called out as "not built yet" in CLAUDE.md despite being wanted).

**Reusable for iHue Bid**
- **Directly reusable**: the Tailwind 4 setup, the general "no component library, hand-rolled utility-first components" convention, `globals.css` structure, the `zinc`/accent-color card vocabulary as a *starting* visual language (though iHue Bid will likely want its own brand accent distinct from emerald/OKLCH-rainbow, since that gradient is semantically tied to iHue Rating's 0–10 score identity).
- **Not applicable**: `rating-color.ts`/`rating-slider.tsx` are conceptually the closest analog to a price-range input, but the *implementation* (fixed 0–10 domain, OKLCH rainbow-at-10 semantics) is specific to iHue Rating's product identity — do not reuse the code, but do reuse the *idea* of "one well-tested, versioned pure function mapping a value to a visual/color treatment," applied instead to a price-vs-consensus comparison (§8.3's green/yellow/red/purple wording) and to a min–max price slider/range input (new component, but same engineering discipline: pure, unit-tested, versioned).
- **New for iHue Bid**: no design-token system exists to lift wholesale; iHue Bid should decide its own accent palette and build a small number of shared primitives (card, badge, button) fresh, following the same "plain Tailwind, no library" convention rather than introducing shadcn now (staying consistent with the sibling project per the spec's instruction to preserve architecture).

---

## 6. Public profile / handle-based URL routing

**What exists today**
- **No handle-based public route exists.** There is no `/[handle]` or `/u/[handle]` page anywhere in `src/app`. `UserProfile.handle` is a real, unique, validated column (`setUserHandle` in `profile-service.ts`), but per CLAUDE.md it is currently write-only — set via `POST /api/account/handle` — with **no UI to set it and no page to view it**. It's used today only for author-display resolution in `DisplayMode.ALIAS` (`author-display.ts`) and always falls back to anonymous because nobody can actually set a handle from the UI yet.
- No profile page of any kind (public or private) exists for a `User`/reviewer beyond the `ProfileMenu` dropdown in the header (name + logout).

**Reusable for iHue Bid**
- **Adaptable but thin**: the *data model* (`UserProfile.handle`, unique + validated + reserved-word-ready) and the *service* (`setUserHandle`) are a legitimate starting point — the validation regex (`^[a-zA-Z0-9_-]+$`, 3–40 chars) is close to what iHue Bid needs (add lowercase-only normalization and a reserved-word denylist per requirements §5).
- **New build required**: the entire public profile page (`bid.ihue.in/{creatorHandle}` — logo/avatar, display name, description, location, links, verification badge, active/closed listings) has zero UI precedent in iHue Rating. This is a from-scratch page, though it can borrow the page-composition style of `src/app/entities/[id]/page.tsx` (server-fetch, `notFound()` on missing handle, Cloudinary image display).
- **New build required**: URL redirect-on-handle-change and redirect-on-slug-change (requirements §5) have no precedent anywhere in ihueRating (entity IDs never change, so no redirect logic was ever needed).

---

## 7. Deployment & environment setup

**What exists today**
- `vercel.json` is minimal — just `{"$schema": "https://openapi.vercel.sh/vercel.json"}`, no custom build/route config; Vercel defaults handle the Next.js build.
- `package.json` build script: `prisma generate && next build --webpack` (explicitly opts out of Turbopack for the production build; `next.config.ts` sets `turbopack.root` for dev only). `postinstall: prisma generate` ensures the generated client exists after every install (important since it's also committed).
- `.env.example` is thorough and well-commented: documents pooled vs. direct DB URL split, `AUTH_SECRET` (32+ chars), `EMAIL_PROVIDER` mock/ses switch with reserved `*.test` behavior, AWS/SES vars, `APP_URL` (used to derive the Google OAuth redirect and enforce HTTPS-except-localhost), `CRON_SECRET` (for the outbox dispatcher endpoint), Google Places key, Cloudinary vars with a folder-prefix convention, and a clearly-labeled "reserved for phase 2, kept disabled" block for Gemini/AI vars.
- `engines.node: "22.x"`, `.nvmrc` = `22`, `packageManager: pnpm@11.10.0` pinned exactly.
- Neon serverless Postgres, with a documented operational quirk (auto-suspend on idle; CLAUDE.md gives the exact wake-up command) — worth carrying the same warning into iHue Bid's own CLAUDE.md if it also uses Neon free tier.

**Reusable for iHue Bid**
- **Directly reusable**: the entire `.env.example` structure and commenting style, the pooled/direct DB URL split, the `AUTH_SECRET`/`CRON_SECRET` pattern, the Node/pnpm pinning, the build script shape (`prisma generate && next build --webpack`), `vercel.json` (start minimal, add only if a real need arises).
- **Adaptable**: `APP_URL`-derived OAuth redirect logic — reusable as-is if iHue Bid also uses Google sign-in for creators (recommended, for consistency).
- Cloudinary/SES credential-sharing precedent (documented explicitly in CLAUDE.md: ihueRating intentionally reuses atride's real credentials with a distinct folder/from-address) suggests iHue Bid could similarly reuse ihue Rating's or atride's SES/Cloudinary account with a new folder prefix and `SES_FROM_EMAIL=noreply@bid.ihue.in`, rather than provisioning new infrastructure — consistent with the "shared iHue foundations" instruction in the spec.
- New domain (`bid.ihue.in`) will need its own Vercel project (separate deployment per the spec's "independent application/domain" instruction) and its own Google OAuth client (mirroring how ihueRating already uses a separate Google Cloud project from `atride`).

---

## 8. Rate-limiting, anti-abuse, anonymous sessions, analytics/error-monitoring

**What exists today — this is the thinnest area, explicitly flagged as a gap in CLAUDE.md ("Rate limiting — none anywhere yet, including on the Gemini-backed review endpoints")**
- **No generic rate-limiting middleware/library** (no Upstash, no `@vercel/kv`, no in-memory limiter). The **only** rate-limiting in the codebase is bespoke and narrow: `src/app/api/internal-testers/route.ts` counts rows in a dedicated `InternalTesterSignupAttempt` table (IP-hash + timestamp) within a 15-minute window, capped at 5 attempts — a real, working "counter table + time window" pattern worth forking.
- That same route also has the *only* anti-abuse stack in the app: a honeypot field (`company`), Google reCAPTCHA v3 with an action + score threshold (`verifyRecaptcha`), an explicit CORS/origin allowlist (since it's called cross-origin from the marketing site), and IP hashing via HMAC (`hashNetworkValue`, using the same `AUTH_SECRET` as OTP hashing) rather than storing raw IPs.
- OTP flow has a lighter analog: `resendAvailableAt` cooldown + `maxAttempts`/`attemptCount` per challenge (`auth-service.ts`) — a per-identity (not per-IP) rate limit.
- **No anonymous/participant session or opaque-token concept exists anywhere.** Every interaction in iHue Rating (rating, reviewing, claiming) requires a signed-in `User`. There is no cookie-based anonymous identity, no `ParticipantIdentity`-equivalent model, no concept of "one vote per browser."
- **No analytics or error-monitoring integration at all** — no Sentry, PostHog, Vercel Analytics, or any APM found in `package.json` or `src/`. Logging is plain `console.error` at call sites (e.g. `auth/http.ts`, `internal-testers/route.ts`).
- `ModerationAction` and `Report` models exist and are wired to a real admin queue (`src/server/reviews/report-service.ts`, `/admin`) — this is the closest existing precedent for iHue Bid's `AbuseSignal`/`ModerationEvent` and audit trail.

**Reusable for iHue Bid**
- **Directly reusable pattern (fork, don't just reference)**: the IP-hash-plus-counter-table rate-limit shape (`InternalTesterSignupAttempt`), the honeypot field, the reCAPTCHA v3 integration function, and `hashNetworkValue`/`hashOtp`-style HMAC hashing of any sensitive identifier before persistence (never store raw IPs) — this whole cluster maps almost directly onto requirements §9's "signed participant token," "server-side rate limits by IP," and "progressive friction (CAPTCHA after suspicious behaviour)."
- **New build required, no shortcut available**: `ParticipantIdentity` (opaque anonymous browser/session token per listing, requirements §16) is a wholly new concept — nothing in iHue Rating issues unauthenticated identity cookies. Design it as a new signed cookie (reuse `AUTH_SECRET`/HMAC signing conventions from `crypto.ts`) distinct from the authenticated `Session` model, since participants must never need a `User` row.
- **New build required**: confidence-reduction logic tied to suspicion signals (§9.2–9.3), and the broader "network characteristics beyond IP" requirement, have zero precedent — the existing rate limiter is IP-only and admittedly minimal.
- **New build required**: analytics/error monitoring must be introduced for iHue Bid from scratch since ihue Rating has none to inherit; recommend picking one now (e.g. Vercel Analytics + Sentry) and, if desired, retrofitting ihue Rating later for consistency (that's an ihueRating decision, out of scope here) — the requirements doc explicitly asks for iHue Bid's approach to be "consistent with iHue Rating conventions," but since iHue Rating currently has *no* convention here, iHue Bid is free to establish one and should not block on ihueRating catching up first.

---

## 9. Aggregation/scoring logic (closest analog to price-consensus aggregation)

**What exists today**
- `src/server/ratings/rating-service.ts`: `getEntityRatingSummary()` computes a **simple arithmetic mean** (`db.rating.aggregate({ _avg, _count })`) plus a count — **not** a robust/median statistic.
- `getEntityRatingDistribution()` bins active ratings into fixed 0.5-wide buckets (with a special final bucket for the exact-10.0 "rainbow" score) for a bar-chart visual — each bar colored via the continuous `ratingToColor()` function. This bucketing-for-display-only (never for the underlying stored value) is a good pattern to reuse conceptually.
- **No confidence level of any kind is computed or shown** — no Low/Medium/High, no sample-size-based confidence discount, no outlier handling, no percentile bands. The "aggregate" is just mean + count.
- One `Rating` row per `(userId, entityId)` — a user's rating is mutated in place on resubmission, with every change appended to `RatingHistory` (previous/new value + timestamp) for audit — this "one active row per identity + full history table" pattern is exactly the shape requirements §7.1 wants for anonymous valuations ("allow revision... retain audit history but only count the latest valid response").
- Demo-data exclusion (`entityHasRealPublishedReview()` gate in `demo-reviews.ts`, applied inside `activeRatingWhere()`) is a clean example of a **composable, testable "which rows count toward the aggregate" predicate** — worth mirroring for iHue Bid's abuse-exclusion predicate (flagged/spam responses excluded from the public aggregate per §9.3).
- A known, documented gap in ihueRating itself: `attachRatingSummaries` (list views) does *not* apply the demo-exclusion filter that the single-entity page does — a cautionary example (from ihueRating's own CLAUDE.md) of aggregate logic drifting out of sync between call sites; iHue Bid should centralize its aggregation in one service function used everywhere, not per-page.

**Reusable for iHue Bid**
- **Adaptable structurally, not algorithmically**: the file/module shape (`rating-service.ts`-equivalent → e.g. `response-aggregation-service.ts`), the one-row-per-identity-plus-history-table pattern (`Rating`+`RatingHistory` → `Response`+its own audit trail), and the "single `*Where()` predicate function reused by every aggregate query" discipline are all directly worth forking.
- **Must build new**: the actual aggregation math. Requirements §8.2 explicitly calls for median/percentile-based robust statistics and a real confidence classification (Low/Medium/High driven by sample size, diversity, and suspicion signals) — none of this exists in iHue Rating to fork; it must be designed and unit-tested from scratch (a good candidate for a pure, versioned function analogous to `rating-color.ts`'s discipline: input array of valid values → `{ consensus, band: [low, high], confidence, count }`, fully unit-tested independent of Prisma).
- The distribution-bucketing-for-display approach (fixed-width bins, computed from live data, colored/styled per bucket) directly transfers to iHue Bid's required "distribution visual" (§8.1).

---

## 10. Social sharing / Open Graph metadata

**What exists today**
- Extremely minimal: `generateMetadata()` in `src/app/entities/[id]/page.tsx` sets only a page `<title>` (`{ title: entity?.displayName ?? "Entity not found" }`) — no description, no `openGraph`/`twitter` fields, no dynamic OG image generation (`opengraph-image.tsx`/`ImageResponse`) anywhere in the codebase. Root `layout.tsx` sets a static site-wide title template and description, favicon set, and a static `themeColor` — that's the extent of metadata work done so far.
- No `sitemap.ts`/`robots.ts` found either.

**Reusable for iHue Bid**
- **Not much to fork** — the root-layout `Metadata`/`Viewport` object shape is a fine template to copy, but there is no dynamic per-page OG/Twitter-card/canonical-URL implementation to reuse, despite this being core to iHue Rating's own future needs too.
- **New build required**: iHue Bid's requirement for per-listing OG title/description/cover-image/canonical URL (§11) needs genuinely new work — likely Next.js's `ImageResponse`-based dynamic `opengraph-image.tsx` per listing route, `generateMetadata()` expanded to include `openGraph`/`twitter` objects (title, description, images: [cover], url: canonical), and possibly a `sitemap.ts` for indexable listings. Recommend building this well for iHue Bid since it's explicitly the highest-leverage page type (share-first product) — and it may be worth back-porting the resulting pattern to iHue Rating afterward, but that's not a blocker.

---

## 11. Notification system & contact verification

**What exists today**
- Email is the only channel: `src/server/email/provider.ts` picks between a `mock` provider (dev-only, reveals OTP on screen, hard-blocked in production) and `SesHttpEmailProvider` (`ses-http-provider.ts`, raw AWS SigV4-signed HTTP calls to the SES v2 API — no AWS SDK dependency, hand-rolled signing). Templates: `otp-template.ts`, `internal-tester-welcome-template.ts` (plain functions returning `{ subject, text, html }`).
- No SMS/phone provider or phone-number verification anywhere (`AWS_REGION`/SES vars only cover email).
- `OtpChallenge` model + `requestEmailOtp`/`verifyEmailOtp` is the *only* verification flow that exists, and it's tightly coupled to sign-in (`purpose: SIGN_IN` is the only `OtpPurpose` enum value) — not generalized as a reusable "verify any contact channel for any purpose" primitive yet.
- `OutboxEvent`/`dispatcher.ts` (`src/server/outbox/dispatcher.ts`) is a real, working generic transactional-outbox: claim-lock-process-retry loop with exponential backoff, stale-lock recovery, and a pluggable handler registry (`registerOutboxHandler`) — but **it currently has zero registered handlers** ("no event type is produced yet" per its own comment); it's standing infrastructure, not yet exercised end-to-end. `POST /api/internal/outbox/dispatch` (cron-triggered, `CRON_SECRET`-protected) is the trigger.

**Reusable for iHue Bid**
- **Directly reusable**: the SES HTTP provider (fork as-is, new `SES_FROM_EMAIL=noreply@bid.ihue.in`), the mock-provider dev/test pattern, the outbox dispatcher (finally exercise it for real — closure notifications and "still interested" emails per requirements §7.2/§17.9 are a natural first real outbox event type), the cron-secret-protected dispatch endpoint.
- **Needs generalization**: the OTP model should be widened (`OtpPurpose` gets new values like `CONTACT_VERIFY`) or a parallel lightweight verification flow built for anonymous participant contact verification (email/phone) — since iHue Bid's participants aren't `User` accounts, this can't reuse `OtpChallenge` unchanged (it has no FK to a participant identity); most likely needs its own `ContactConsent`/verification-challenge model keyed to a phone/email string + `ParticipantIdentity`, following the same HMAC-hash-the-code, time-boxed, attempt-capped design as `OtpChallenge`.
- **New build required, no precedent**: SMS/phone sending (requirements §7.1/§9.1 mention phone verification for interest/offers) — no SMS provider integration exists anywhere to fork; will need a new provider (e.g. SNS or a transactional SMS API) added following the same provider-interface pattern as `email/provider.ts` (`EmailProvider` → generalize to a `MessageProvider` interface, or add a sibling `sms/provider.ts`).

---

## 12. Testing conventions & code style/lint

**What exists today**
- Vitest (`vitest.config.ts`): `environment: "node"`, includes `src/**/*.test.ts` only (no `.tsx` component tests), aliases `server-only` to a no-op stub (`src/test/server-only.ts`) so server-only modules can be unit-tested, and reuses the `@/*` path alias.
- Only **pure-function unit tests** exist: `src/lib/rating-color.test.ts`, `src/server/auth/crypto.test.ts`, `src/server/ai/analyze-output.test.ts`, `src/components/hue-dna-helix.test.ts` — no integration tests, no DB-backed tests, no e2e/Playwright. CLAUDE.md is explicit that this is a deliberate tradeoff: `pnpm typecheck && pnpm lint && pnpm test` is "necessary but not sufficient," and every feature is additionally verified live against the real dev DB (curl the API routes, inspect real Neon rows, clean up test data) rather than through an automated integration suite.
- ESLint: flat config (`eslint.config.mjs`) built on `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`, minimal custom config beyond ignoring `.next/**`/`coverage/**`. One documented recurring gotcha in CLAUDE.md: `react-hooks/set-state-in-effect` fires on non-deterministic client state sync — fix by reading into a lazy `useState` initializer (for deterministic values like `useSearchParams()`) or a narrowly-scoped `eslint-disable-next-line` (for genuinely non-deterministic values like `Math.random()`), never a blanket suppression.
- `tsconfig.json`: `strict: true`, ES2017 target, bundler module resolution — standard, nothing unusual.
- Test-writing style favors testing pure business-logic functions in isolation (`analyze-output.ts`, `rating-color.ts`, `crypto.ts` are all side-effect-free and thoroughly tested) rather than mocking Prisma/DB calls.

**Reusable for iHue Bid**
- **Directly reusable, adopt wholesale**: the entire vitest config (including the `server-only` stub alias — iHue Bid's `src/server/**` modules will want the same `import "server-only"` guard), the eslint flat-config setup, the strict tsconfig, and — most importantly — the *testing philosophy*: keep aggregation math, color/threshold logic, and validation as pure functions and unit-test those exhaustively; verify DB-touching flows live rather than building a mocked integration suite (consistent with this being a small team optimizing for velocity).
- iHue Bid's aggregation engine (§9 above) is the highest-value candidate for this pure-function-plus-unit-tests treatment, directly mirroring `rating-color.ts`/`analyze-output.ts`.
- The `react-hooks/set-state-in-effect` gotcha will very likely recur in iHue Bid's slider/range-input components (analogous to `rating-slider.tsx`) — worth noting proactively in iHue Bid's own CLAUDE.md.

---

## Recommended for iHue Bid

Organized against the MVP scope (requirements §14). "Fork" = copy and adapt with light changes. "Extend" = existing model/service gets new fields/routes. "New" = no usable precedent, build from scratch (though often following an established *pattern*, noted where relevant).

### Creator auth & public profile
- **Fork directly**: OTP + Google OIDC auth stack, session/cookie design, `assertSameOrigin`, admin-role-gate pattern, `.env.example` auth vars (§2, §7).
- **Extend**: `UserProfile` schema (add public-profile fields: description, location, links, verification status) and `setUserHandle`'s validation (add lowercase normalization + reserved-word denylist) (§2, §6).
- **New**: the actual public profile page at `/{handle}`, the "set your handle" UI (doesn't exist even in ihueRating today), handle-change redirect logic (§6).

### Listings + Used Vehicle template
- **Fork the pattern, not the code**: entity CRUD service shape (`entity-service.ts`'s create/get/ownership-check structure), category-specific fields via a `customType`-like escape hatch generalized into a proper `ListingFieldValue`/template system (§16) — iHue Rating's `EntityDimension` (per-`entityType` seeded field labels) is a useful *precedent* for a template-driven field framework, though it's currently just labels for AI-analysis dimensions, not a full structured-input template engine (§1, §3).
- **New**: everything about listing lifecycle (draft/scheduled/live/paused/closed/cancelled), timezone-safe publish/close scheduling — no lifecycle state machine exists in ihueRating (`EntityStatus` is a simpler DRAFT/PUBLISHED/MERGED/ARCHIVED with no scheduling).

### Media
- **Fork directly**: sign → upload → verify Cloudinary flow, ownership-scoped public-ID prefixing, server-side format/size re-verification (§4).
- **New**: `MediaAsset` model with ordering (gallery), YouTube/external-embed support — no multi-asset or embed precedent exists at all (§4).

### Anonymous valuation + anti-abuse
- **Fork directly**: IP-hash-plus-counter-table rate limiting, honeypot field, reCAPTCHA v3 integration, HMAC-hash-before-storing-identifiers convention (§8).
- **New, highest-risk area**: `ParticipantIdentity` (signed anonymous cookie, no precedent), progressive friction/suspicion scoring (§9.2), and generalizing `OtpChallenge` into a contact-verification flow usable by non-`User` participants (§8, §11).

### Aggregation
- **Fork the discipline, not the math**: pure/unit-tested function style (`rating-color.ts`), single-source-of-truth `*Where()` predicate for what counts toward an aggregate, fixed-bucket distribution-for-display technique, one-row-per-identity-plus-history-table shape (§9).
- **New**: median/percentile robust statistics, confidence-level classification, abuse-aware exclusion from aggregates — none of this exists to fork (§9).

### Creator dashboard
- **Fork the pattern**: `/admin` page's structure (server-gated page, dashboard component receiving server-fetched data) is a reasonable template for a creator's private listing-management dashboard, though it will be per-creator-scoped rather than admin-scoped (§1).
- **New**: all the actual private analytics (response count, distribution, confidence, interested-participant counts) — no creator-facing analytics precedent exists (ihueRating's admin screen is moderation/settings, not analytics) (§10).

### Sharing
- **New, build well**: dynamic OG image generation, expanded `generateMetadata()` with `openGraph`/`twitter` fields, WhatsApp share links, QR code generation — essentially nothing to fork; this is greenfield and worth investing in given the "share-first" product principle (§10).

### Closing flow / notifications
- **Fork directly**: SES HTTP provider, outbox dispatcher (first real use case for it), cron-secret-protected dispatch route (§11).
- **New**: SMS provider integration (no precedent), closure-notification event/template, "I'm still interested" re-engagement flow (§11).

### Cross-cutting (apply regardless of feature)
- **Adopt wholesale**: vitest config + `server-only` stub, eslint flat config, strict tsconfig, pnpm/Node pinning, `.env.example` structure and commenting style, Prisma conventions (UUID ids, camelCase-to-snake_case mapping, Timestamptz(3), pooled/direct URL split), Vercel deployment minimalism.
- **Introduce fresh for iHue Bid** (nothing to inherit either way): analytics and error monitoring — pick a stack now since ihueRating has none.
