# Catalogue sync, listing intake & data lifecycle — design

**Product:** `bid.ihue.in`
**Audience:** Claude Code / implementation team
**Status:** Design proposal — not yet built. Discussion captured 2026-09-10.
**Supersedes:** the earlier draft of this file (a pull-based "WhatsApp is the
source of truth, import into ihue Bid" design). That direction was abandoned once
the self-submit flow made clear ihue Bid must be the system of record — see §1.

---

## 1. The shift: ihue Bid is the system of record

**Prompted by Gettecar** (a used-car aggregator). Two facts about how they want
to work:

1. They manage their current inventory as a **WhatsApp Business catalogue** (the
   phone app) and have real traffic there — they won't give that up.
2. They want **verified customers to self-submit** cars they want to sell.
   A submission stays unpublished until a Gettecar admin validates the details
   and approves it.

Fact 2 means WhatsApp cannot remain the source of truth — cars will originate in
ihue Bid and never touch WhatsApp until approved. So the model is:

> **ihue Bid is the system of record. The WhatsApp catalogue is one downstream
> distribution channel, fed from ihue Bid.**

This also removes the hardest part of the old design: there is no bidirectional
reconcile, no "which side wins" conflict resolution. Data flows **one way, out**.

```
                 ┌─────────────────── ihue Bid (system of record) ───────────────────┐
  one-time seed  │                                                                   │
  (script, §3) ─►│  listing intake:                     listing lifecycle:           │
                 │   • creator-created                   DRAFT → LIVE → CLOSED        │
                 │   • self-submitted → review → publish        → ARCHIVED (§5)       │
                 │                                                                   │
                 └───────────────────────────────┬───────────────────────────────────┘
                                                 │ published listings only
                                                 ▼
                                    WhatsApp catalogue (§4)
                                    (+ future: other channels)
```

---

## 2. Scope

| In | Out (deferred / non-goal) |
| --- | --- |
| One-time seed of Gettecar's existing catalogue into the DB (throwaway script) | An ongoing *import* pipeline, reconcile engine, `/dashboard/import` UI — dropped |
| Push published listings **out** to a WhatsApp catalogue (feed URL + manual CSV) | Meta Graph API Batch push (real-time) — a later phase |
| Customer self-submit → admin review → publish | Self-submitters getting creator accounts — they never do |
| Phone verification (Firebase, forked from `proto/atride`) + email OTP (existing) on submissions | SMS *delivery* to buyers — still no outbound SMS |
| Listing data lifecycle: `ARCHIVED` tombstone → compact → retire | A persisted `AggregateSnapshot` for live listings (§16) — still deferred |
| `/admin` platform sweep for storage hygiene | Two-way sync of any kind |

---

## 3. One-time seed migration (script, not a feature)

Gettecar's current catalogue is pulled in **once** to seed the DB, then never
again. This is a throwaway script, not product surface — no UI, no API route, no
reconcile logic.

- **Location:** `scripts/seed-gettecar-catalog.ts`, run once against the DB
  (`pnpm tsx scripts/seed-gettecar-catalog.ts <csv-path>`), then deleted.
- **Input:** a CSV export the user pastes into the working session.
- **Per row:**
  - Insert `Listing` (status `DRAFT`) + `ListingFieldValue` rows under Gettecar's
    account, `origin = IMPORTED` (§6.1).
  - `price` → `ownerExpectedPrice`, `ownerPriceVisibility = VISIBLE`.
  - `description` → `Listing.description`.
  - Fetch each `image_link` / `additional_image_link` → upload to Cloudinary
    (`ihue-bid/{env}` prefix) → `MediaAsset` rows in order, first = cover.
  - **Structured-field extraction:** either run the Gemini path inline
    (`callGemini()` structured-JSON, prompt = title + description → Used Vehicle
    field shape, "extract only what is stated, do not infer") or leave the
    vehicle fields blank for the admin to fill during review. **Open decision —
    see §8.**
- **Idempotent-ish:** store the CSV `id` on `Listing.externalRef` so a re-run
  skips rows already seeded (guards against running it twice).
- **Output:** printed summary (created, image failures). The user then eyeballs a
  few rows in the dashboard and publishes.

**Inputs still needed from the user:**
- The CSV itself.
- Does Gettecar's `User` / handle already exist in the DB, or does the script
  create it?
- Run AI extraction during the seed, or leave fields empty for review?

---

## 4. Push to the WhatsApp catalogue

A WhatsApp catalogue is a Meta **Product Catalog**. Meta offers three write
paths; we use the two that need no credentials on our side.

| # | Mechanism | ihue Bid builds | Gettecar does | Credentials |
| --- | --- | --- | --- | --- |
| **1** | **Manual CSV export.** "Export listings" on the dashboard → download a CSV in Meta's product format → admin uploads in Commerce Manager. | CSV formatter + select-listings UI | Uploads the file periodically | None |
| **2** | **Hosted feed URL** (primary). `bid.ihue.in/api/catalog-feed/{token}.csv` returns all published listings for the account. Gettecar adds that URL as a **scheduled data feed** in Commerce Manager; Meta pulls it (hourly/daily/on-demand). | One tokenised feed endpoint | One-time: paste URL, set schedule, enable "let feed delete items" | Token in URL only |
| **3** | **Catalog Batch API.** On publish/edit/close, ihue Bid calls `POST /{catalog_id}/items_batch`. Near-real-time. | Meta app, token storage, per-event push jobs | Grant our Meta app access to their catalogue | **New:** Meta app + `catalog_management` + system-user token |

**Plan: build #1, then #2. Defer #3.**

- **#1 first** because it's ~80% of the same formatter code and lets us validate
  the exact column format against a real Commerce Manager upload before
  automating anything.
- **#2 as the standing mechanism.** No credentials held by us, no Meta app
  review. The feed endpoint's query *is* the moderation gate — it emits only
  `status = LIVE` listings that passed review, so unapproved self-submissions
  never appear. Deletions are automatic: a listing that drops out of the feed is
  marked out-of-stock / removed by Meta (Commerce Manager setting). Latency
  (up to the feed interval) is the only cost.
- **#3 only if** feed latency proves too slow in practice. Clean upgrade later.

### 4.1 Meta's required CSV / feed format

Generic product catalogue schema. **Required:** `id`, `title`, `description`,
`availability` (`in stock` / `out of stock`), `condition` (`used`), `price`
(`"725000 INR"` — amount + ISO currency), `link`
(`https://bid.ihue.in/{handle}/{publicId}`), `image_link` (one **public** URL),
`brand`. **Optional we'll use:** `additional_image_link` (pipe-separated),
`sale_price`, `google_product_category`, custom columns.

- **`id`** = `Listing.publicId` (stable, already URL-safe, never reused).
- **Images are easier this direction** — Meta fetches `image_link` from the URL
  we supply and re-hosts. Our Cloudinary URLs are stable and public, so there is
  no expiry race and no re-hosting work on our side.
- Meta also has a dedicated **vehicles** catalogue vertical (`make` / `model` /
  `year` / `mileage` / `transmission` / `fuel_type` / `state_of_vehicle` …),
  aimed at Facebook vehicle ads. A plain WhatsApp catalogue normally uses the
  generic schema above. **Open question — which is Gettecar's catalogue set up
  as (§8).** If it's the vehicles vertical, the formatter maps
  `ListingFieldValue` rows straight onto those columns.

### 4.2 Feed endpoint

- `GET /api/catalog-feed/{token}.csv` (also `.xml` if a vertical needs it).
- `token` is a per-account opaque secret (`UserProfile.catalogFeedToken`,
  rotatable), not the handle — so the feed URL isn't guessable and can be
  revoked.
- Query: `status = LIVE` for that `creatorId`, joined to `MediaAsset` +
  `ListingFieldValue`. No auth session (Meta's fetcher is anonymous); the token
  is the only gate.
- Response is cacheable (`s-maxage` a few minutes) — Meta polls on a schedule,
  not per-visitor.
- One feed per account for now. Category-split feeds (Gettecar's
  Hatchback/Sedan/EV sections) are a later refinement — **open question §8**.

### 4.3 Migrating the existing catalogue

Gettecar's WhatsApp catalogue already has items (seeded into ihue Bid in §3).
Once the feed is authoritative, either:
- **Wipe** the WhatsApp catalogue and let the feed repopulate it (simplest,
  loses any per-item catalogue analytics), or
- Map existing catalogue items to the seeded listings by a shared key so Meta
  updates in place rather than recreating.

**Open question §8.** Recommend the wipe unless the analytics matter.

---

## 5. Listing data lifecycle

Storage discipline is a **platform** concern (shared free-tier Cloudinary, Neon
500 MB), not something a creator should manage. A listing that is closed / no
longer for sale passes through three stages of progressive data reduction.

Stages 1–2 are automatic and need **no cron** — stage 1 is event-driven (close),
stage 2 is elapsed-time checked lazily on dashboard load and/or folded into any
future daily task. Stage 3 (permanent delete) is the "recycle bin", run manually
or by the `/admin` sweep (§7.3).

### Stage 1 — Tombstone (`status = ARCHIVED`; on close, or admin action)

| Kept | Freed |
| --- | --- |
| `title`, vehicle `ListingFieldValue` rows (tiny) | **Gallery `MediaAsset`s deleted from Cloudinary** — cover only kept |
| Cover `MediaAsset` | `description` → null (keep ≤200-char `descriptionSnippet`) |
| **All `Response` rows** | `shareMessage` → null (fully regenerable) |
| `NotificationOptIn` rows (buyer contacts) | `ExternalEmbed`, `ReferenceLink` rows deleted |
| `archivedAggregate` snapshot (computed once, here) | Cloudinary derived transforms for the deleted images |

- Hidden from `/{handle}`, the landing feed, the public listing page (→
  `notFound()`), **and the catalogue feed** (§4.2 query is `status = LIVE`).
- Visible in the creator dashboard under a **"Removed"** tab.
- `archivedAt = now()`; `purgeEligibleAt = archivedAt + 14d`;
  `mediaPurgeEligibleAt = archivedAt + 7d` (grace window before the *gallery*
  Cloudinary delete — tunable; run immediately if quota pressure is real).
- **Restore** available from the "Removed" tab until stage 2 runs.

### Stage 2 — Compact (~7d after tombstone, or immediately on SOLD)

| Kept | Freed |
| --- | --- |
| `archivedAggregate` JSON: `responseCount`, `namedCount`, `consensus`, `band [p25,p75]`, `confidence`, `distribution` bins, `closureFinalPrice`, `closureOutcome` (~300–400 B, permanent) | **All `Response` rows deleted** |
| `descriptionSnippet`, vehicle fields, cover | **`NotificationOptIn` PII** (`email` / `buyerName` / `buyerPhone`) nulled — keep counts on the snapshot |

- `responsesPurgedAt = now()`. **Irreversible** — restore after this keeps only
  the aggregate. The "Removed" tab must foreground "Restore" *before* this
  window closes.
- Also a privacy win: participant data is discarded once the transaction is done
  (data minimisation — consistent with this project's "don't hoard what you
  don't need" instinct).

### Stage 3 — Retire (≥14d; manual / `/admin` sweep)

- `Listing` row + cover `MediaAsset` + Cloudinary asset deleted.
- A flat, relation-free **`RetiredListing`** row persists permanently:
  `creatorId`, `externalRef`/`publicId`, `title`, `category`, `archivedAt`,
  `soldAt`, `snapshot`. ~300 B. Purpose: honest historical counts, a minimal
  "you sold N cars, market range was …" record, and dedup if the same source id
  ever reappears.

---

## 6. Customer self-submit → review → publish

A verified customer submits a car; a Gettecar admin validates and publishes it.
The submitter never gets a creator account.

### 6.1 Listing origin

New field `Listing.origin`: `CREATOR_CREATED` (default) / `IMPORTED` (seed) /
`SELF_SUBMITTED`. Drives the review queue filter and some UI copy.

### 6.2 Submission surface

- Public route, e.g. `/{handle}/submit` (or a generic `/submit` that targets the
  platform's primary account) — gated behind verification (§6.4).
- Reuses `ListingForm` (`src/components/listing-form.tsx`) in a constrained
  "submit for review" mode: vehicle details + photos + asking price + contact;
  **no** publish, scheduling, visibility, or share-message controls.
- Creates a `Listing` under **the target creator's account** (Gettecar's), with:
  - `origin = SELF_SUBMITTED`, `status = PENDING_REVIEW` (new `ListingStatus`).
  - A `submittedBy` contact block — new nullable columns or a small
    `ListingSubmission` row: `submitterName`, `submitterEmail`,
    `submitterEmailVerifiedAt`, `submitterPhone`, `submitterPhoneVerifiedAt`,
    `submitterPhoneProvider`.
  - Anchored to the `ParticipantIdentity` cookie (§6.4) so a returning submitter
    is recognised, but **never** to a `User`/`Session`.
- `PENDING_REVIEW` is invisible everywhere: public pages, landing feed, the
  catalogue feed, and it accepts no valuation responses.

### 6.3 Review queue

- Under the dashboard (account-scoped), visible to the account owner and
  `AccountCollaborator`s.
- Admin sees pending submissions, can edit/correct every field, then
  **Approve** → `DRAFT` (admin does a final pass + publish) or **Reject** (with
  a reason; submitter optionally emailed).
- Natural neighbour of the `/admin` surface but **not** the same — this is
  per-account, `/admin` is platform-wide.

### 6.4 Verification — email OTP + Firebase phone

Both required before a submission is accepted.

**Email** — reuse the existing `OtpChallenge` / `OtpPurpose` pattern with a new
`OtpPurpose.LISTING_SUBMISSION_VERIFY` (a distinct purpose so its codes can't be
consumed by another flow), exactly as `buyer-interest-service.ts` does today.
No new dependency.

**Phone — fork from `proto/atride`** (`src/server/phone-verification/`,
`src/lib/firebase-client.ts`, `src/components/phone-verification-control.tsx`).
That implementation is clean and fits ihue Bid's rules:

- **Client** (`firebase` JS SDK) does the SMS send + code entry:
  `signInWithPhoneNumber` + an **invisible `RecaptchaVerifier`** +
  `confirmationResult.confirm(code)` → a Firebase **ID token**.
- **Server** (`firebase-admin`) verifies that token: `verifyIdToken(idToken,
  true)`, then checks `firebase.sign_in_provider === "phone"`, `auth_time`
  freshness (10-min max age, `FIREBASE_PHONE_AUTH_MAX_AGE_SECONDS`), and that the
  token's `phone_number` matches the challenge's expected number.
- A `PhoneVerificationChallenge` table ties a server-issued challenge token to
  the expected phone, with `attemptCount`/`maxAttempts`, a TTL (10 min), and
  IP-hash rate limiting (atride uses 5/user/day, 10/IP/day, 60 s resend
  cooldown — reuse the numbers).
- **Firebase is used only for phone-ownership proof, never a session** — the
  client calls `signOut(getFirebasePhoneAuth())` immediately after. Same
  "participant identity must never become platform access" principle already in
  this codebase (`ParticipantIdentity` vs `Session`).
- **Bonus:** Firebase's bundled invisible reCAPTCHA is independent of the
  deferred reCAPTCHA-v3 anti-abuse item — it ships with phone auth, no separate
  key.

**Adaptation for ihue Bid:** atride verifies a phone on an *authenticated user's
profile* (`session.userId`, `participantProfile.operationalPhone`). Here the
submitter is anonymous, so:
- The challenge keys on a **submission-draft id** (or the `ParticipantIdentity`
  cookie), not `userId`.
- The verified phone is written to the `submittedBy` block on the listing, not a
  `UserContact`.
- `isSupportedIndianMobile()` / `normalizePhone()` from atride's `claims.ts` port
  as-is (`+91[6-9]\d{9}`).

**New credentials** — a Firebase project: 4 `NEXT_PUBLIC_FIREBASE_*` client vars
+ 3 `FIREBASE_ADMIN_*` server vars; packages `firebase` (^12) + `firebase-admin`
(13). **Decision (open, §8):** reuse atride's Firebase project (add `bid.ihue.in`
+ `localhost` to its **Authorized Domains** — same shape as the Google OAuth
redirect-URI note in CLAUDE.md) or a **fresh project** (recommended — first
Firebase dependency here, atride is a different product family, and it's free).

---

## 7. Schema changes

```prisma
enum ListingStatus {
  DRAFT
  SCHEDULED
  LIVE
  PAUSED
  CLOSED
  CANCELLED
  PENDING_REVIEW    // new — self-submitted, awaiting admin approval
  ARCHIVED          // new — tombstoned, creator-only
}

enum ListingOrigin {
  CREATOR_CREATED
  IMPORTED
  SELF_SUBMITTED
}

enum OtpPurpose {
  SIGN_IN
  CONTACT_VERIFY
  BUYER_INTEREST_VERIFY
  LISTING_SUBMISSION_VERIFY   // new
}

enum PhoneVerificationProvider { FIREBASE }        // ported from atride
enum PhoneVerificationStatus  { PENDING VERIFIED FAILED }

enum RateLimitAction {
  // …existing…
  LISTING_SUBMISSION_REQUEST
  PHONE_VERIFICATION_START
}

model Listing {
  // …existing…
  origin               ListingOrigin  @default(CREATOR_CREATED)
  externalRef          String?        @map("external_ref") @db.VarChar(120)  // seed dedup
  descriptionSnippet   String?        @map("description_snippet") @db.VarChar(220)
  archivedAt           DateTime?      @map("archived_at") @db.Timestamptz(3)
  mediaPurgeEligibleAt DateTime?      @map("media_purge_eligible_at") @db.Timestamptz(3)
  responsesPurgedAt    DateTime?      @map("responses_purged_at") @db.Timestamptz(3)
  purgeEligibleAt      DateTime?      @map("purge_eligible_at") @db.Timestamptz(3)
  archivedAggregate    Json?          @map("archived_aggregate")
  submission           ListingSubmission?
}

// Self-submit contact + verification state. Separate table so a normal
// creator-created listing carries none of it.
model ListingSubmission {
  id                       String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  listingId                String    @unique @map("listing_id") @db.Uuid
  participantIdentityId    String?   @map("participant_identity_id") @db.Uuid
  submitterName            String    @map("submitter_name") @db.VarChar(120)
  submitterEmail           String    @map("submitter_email") @db.VarChar(320)
  submitterEmailVerifiedAt DateTime? @map("submitter_email_verified_at") @db.Timestamptz(3)
  submitterPhone           String?   @map("submitter_phone") @db.VarChar(24)
  submitterPhoneVerifiedAt DateTime? @map("submitter_phone_verified_at") @db.Timestamptz(3)
  reviewedAt               DateTime? @map("reviewed_at") @db.Timestamptz(3)
  reviewedById             String?   @map("reviewed_by_id") @db.Uuid
  rejectionReason          String?   @map("rejection_reason") @db.Text
  createdAt                DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([participantIdentityId])
  @@map("listing_submissions")
}

// Ported from atride, keyed on a submission-draft id instead of userId.
model PhoneVerificationChallenge {
  id              String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  submissionKey   String                    @map("submission_key") @db.VarChar(128) // draft id / participant cookie hash
  provider        PhoneVerificationProvider @default(FIREBASE)
  status          PhoneVerificationStatus   @default(PENDING)
  normalizedPhone String                    @map("normalized_phone") @db.VarChar(24)
  tokenHash       String                    @unique @map("token_hash") @db.VarChar(128)
  requestIpHash   String?                   @map("request_ip_hash") @db.VarChar(128)
  attemptCount    Int                       @default(0) @map("attempt_count")
  maxAttempts     Int                       @default(5) @map("max_attempts")
  expiresAt       DateTime                  @map("expires_at") @db.Timestamptz(3)
  consumedAt      DateTime?                 @map("consumed_at") @db.Timestamptz(3)
  createdAt       DateTime                  @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([submissionKey, status, createdAt])
  @@index([expiresAt])
  @@map("phone_verification_challenges")
}

model UserProfile {
  // …existing…
  catalogFeedToken String? @unique @map("catalog_feed_token") @db.VarChar(64)
}

model RetiredListing {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  creatorId     String        @map("creator_id") @db.Uuid
  externalRef   String?       @map("external_ref") @db.VarChar(120)
  title         String        @db.VarChar(200)
  category      ListingCategory
  archivedAt    DateTime      @map("archived_at") @db.Timestamptz(3)
  soldAt        DateTime?     @map("sold_at") @db.Timestamptz(3)
  snapshot      Json
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)

  creator User @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([creatorId])
  @@map("retired_listings")
}

model AdminActionLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId   String   @map("admin_id") @db.Uuid
  action    String   @db.VarChar(80)   // "PURGE_ELIGIBLE", "FORCE_COMPACT", …
  scope     Json                        // { accountId?, listingIds?, dryRun, counts }
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([adminId, createdAt])
  @@map("admin_action_logs")
}
```

The reduction stage is encoded by nullable timestamps
(`archivedAt` / `responsesPurgedAt` / `purgeEligibleAt`) rather than an enum —
matching the codebase's existing `verifiedAt` / `readyToBuyAt` /
`stillInterestedAt` style.

---

## 8. Platform admin & the cron constraint

### 8.1 Reuse the existing admin gate

`UserRole.ADMIN` + `requireAdminSession()` (`src/server/auth/admin.ts`) already
exist. Make the operator (`ihue.india@gmail.com`) an `ADMIN` in the DB — no new
mechanism. (An env allowlist `PLATFORM_ADMIN_EMAILS` checked inside
`requireAdminSession()` is an acceptable alternative.)

### 8.2 `/admin` surface

New route group, `requireAdminSession()` on the layout:
- **Storage overview** — per-account counts of `ARCHIVED` (pre-compact),
  compacted, and `purgeEligibleAt <= now()` listings; `MediaAsset` count + rough
  Cloudinary footprint; `Response` / `NotificationOptIn` / `PhoneVerificationChallenge`
  row counts.
- **Cleanup actions, dry-run first** (show what would be deleted + estimated
  space freed, then confirm): *Purge eligible* (hard-delete past
  `purgeEligibleAt` → `RetiredListing` + Cloudinary cover delete); *Force
  compact* (stage 2 now on old tombstones); *Force tombstone* (stage 1 on old
  `CLOSED` listings, catalogue-origin or not).
- Every action writes `AdminActionLog`.
- Also the natural future home for the deferred abuse-review queue (§9.3).

### 8.3 Cron

Vercel Hobby allows very few scheduled jobs, and **there is no cron handler in
the repo yet** (`vercel.json` has no `crons`, `CRON_SECRET` is generated but
unused). So:
- **Stages 1–2 need no cron.** Stage 1 is event-driven. Stage 2 is a lazy
  "tombstone age ≥ 7d" check on dashboard load, and/or a `runLifecycleSweep()`
  pass folded into the first daily cron whenever one is added (e.g. to process
  `SCHEDULED` listings, or to trigger a `catalog-feed` refresh ping).
- **Stage 3 purge** is the `/admin` button plus `POST /api/admin/cleanup`
  (admin session **or** `CRON_SECRET` bearer) — curlable now, cron-wirable later
  with no code change.

---

## 9. Phasing

| Phase | Scope | New credentials |
| --- | --- | --- |
| **0** | One-time seed script (§3). | None |
| **1** | Manual CSV export to WhatsApp format (§4 #1); `ListingOrigin`; `ARCHIVED` status + stage-1 tombstone + "Removed" dashboard tab; `/admin` storage overview + "Purge eligible". | None |
| **2** | Hosted feed URL (§4 #2) + `catalogFeedToken`; stage-2 compact + `RetiredListing` + restore flow; `AdminActionLog` + force-compact/force-tombstone. | Feed URL only (Gettecar side) |
| **3** | Self-submit: `/{handle}/submit`, `PENDING_REVIEW`, `ListingSubmission`, review queue; email OTP (`LISTING_SUBMISSION_VERIFY`) + **Firebase phone** forked from atride. | **Firebase project** (7 env vars) |
| **later** | Catalog Batch API real-time push (§4 #3); category-split feeds; self-submitter status-tracking link. | Meta app + system-user token |

---

## 10. Open questions

1. **Seed:** the CSV; does Gettecar's `User`/handle exist in the DB yet; run AI
   field-extraction during the seed or leave blank for review?
2. **Catalogue admin model:** WhatsApp Business phone app (user's current guess),
   Business Manager, or a third-party tool — determines feed-URL setup and
   whether phase "later" is possible.
3. **Generic product catalogue or the vehicles vertical?** Changes the feed
   formatter's column mapping.
4. **Existing catalogue:** wipe and let the feed repopulate, or map items to
   seeded listings by a shared key?
5. **Firebase:** reuse atride's project (+ authorized domains) or a fresh one
   (recommended)?
6. **Self-submit verification:** email + phone both required at launch, or ship
   email-only first?
7. **Retention windows:** 7 d to compact, 14 d to retire — confirm, or make them
   per-account settings?
8. **One feed per account, or category-split** (Hatchback / Sedan / EV)?
