# WhatsApp Catalog Import & Listing Data Lifecycle — design

**Product:** `bid.ihue.in`
**Audience:** Claude Code / implementation team
**Status:** Design proposal — not yet built. Discussion captured 2026-09-10.
**Prompted by:** Gettecar (a used-car aggregator) manages their live inventory as a
WhatsApp Business catalogue and wants those cars to appear as ihue Bid listings
without manual re-entry.

---

## 1. Goal & non-goals

**Goal.** Let a creator populate ihue Bid listings from their WhatsApp Business
catalogue, and keep them roughly in step as inventory changes — new cars appear,
sold cars disappear — without hoarding data for vehicles that are no longer for
sale. Storage discipline is a **platform** concern (shared free-tier Cloudinary,
Neon 500 MB), not something the creator should have to think about, so the
lifecycle machinery is designed to reclaim space automatically and give a
platform admin a manual sweep on top.

**Non-goals (for now).**
- Two-way sync. ihue Bid never writes back to the catalogue.
- Real-time sync. Cadence is "when a CSV is uploaded" (phase 1) or "once a day"
  (phase 2) — not webhook-driven.
- The Meta Graph API path (see the parent reuse assessment). That needs a new
  external credential + Meta app review and is explicitly deferred; this design
  is the CSV path only.
- SMS. Buyer phone numbers are collected and shown to the creator today; nothing
  is sent to them, and that does not change here.

---

## 2. What a WhatsApp catalogue actually is

A WhatsApp Business catalogue is a **Meta Product Catalog** (the same object
behind Facebook/Instagram Shops), surfaced through WhatsApp. The data lives in
Meta Commerce Manager. It can be exported as CSV/TSV, or fed from a hosted
file/Google Sheet.

Every catalogue row carries a **required, unique, stable `id`** (the
`retailer_id` / the merchant's own SKU). This is the primary key of the feed and
the join key for everything below.

Typical columns:

| Column | Contents | Maps to |
| --- | --- | --- |
| `id` | merchant SKU, stable | `Listing.externalRef` |
| `title` | e.g. `2021 Hyundai i20 Nline AT Petrol` | source text for field extraction |
| `description` | prose | `Listing.description` (pre-strip) |
| `price` | e.g. `725000 INR` | `Listing.ownerExpectedPrice` |
| `availability` | `in stock` / `out of stock` | reconcile hint (see §6) |
| `condition` | `used` | — |
| `image_link` | one URL | cover `MediaAsset` |
| `additional_image_link` | comma/pipe-separated URLs | gallery `MediaAsset`s |
| `link` | catalogue product URL | ignored (or a `ReferenceLink`) |
| `google_product_category` / custom | "Hatchback", "Sedan", "EV" | informational only for now |

**What the CSV does *not* give us as structured data:** registration year, make,
model, variant, fuel, transmission, kilometres, owner count, service history,
accident disclosure. Those are embedded in `title` + `description` prose and must
be extracted (see §5.2).

**Action item before building:** get one real export from Gettecar and inspect
it. The two unknowns that change the design are (a) the exact column set and
(b) whether `image_link` URLs are fetchable without auth and how long they live
(Meta CDN URLs are often signed with a short expiry; feed-sourced URLs are
usually stable). A throwaway script that HEADs every `image_link` in the sample
answers (b).

---

## 3. Source-of-truth model

We adopt **"catalogue drives existence and core facts; ihue Bid owns everything
else."**

| Field group | Owner after import | On re-import |
| --- | --- | --- |
| Existence (does this listing exist / is it still for sale) | Catalogue | Reconciled — added / tombstoned |
| Core facts: title source, base description, price, images | Catalogue | Changes are **flagged for review**, not auto-applied |
| ihue Bid-only: AI highlights, saved `shareMessage`, `resultVisibility`, `ownerPriceVisibility`, structured field edits, responses, buyer contacts | ihue Bid | Never touched by the feed |

Rationale: the AI-drafted description, the hand-edited WhatsApp message, and the
market-visibility settings only exist in ihue Bid and often have creator effort
in them. Silently overwriting a live listing that already has valuation
responses also breaks the core product promise (the market signal was computed
from what those participants saw — see the `updateListing` note in CLAUDE.md).

---

## 4. Import flow (phase 1 — manual upload)

1. **Upload.** New screen at `/dashboard/import` (session-gated; collaborators
   allowed, same as listing management). Creator picks category (Used Vehicle for
   now) and drops the CSV. Server parses with a tolerant CSV reader, normalises
   headers, validates that `id`, `title`, and `price` are present on every row.
2. **Dry-run preview.** Server produces a plan without writing anything:
   - **New** (N rows) — `externalRef` not seen for this account
   - **Unchanged** (N) — `externalRef` seen, row hash matches
   - **Changed** (N) — `externalRef` seen, row hash differs (per-row diff shown)
   - **Missing** (N) — active imported listings whose `externalRef` is absent
     from this CSV
   - Safety-rail warnings (§7)
3. **Confirm.** Creator ticks which buckets to apply. "New" defaults on;
   "Missing → tombstone" requires an explicit tick; "Changed → apply" is
   per-listing.
4. **Apply.**
   - New → create `Listing` rows as **`DRAFT`** (never auto-publish — the market
     signal depends on what participants saw, and the creator should eyeball the
     extracted fields first). Enqueue image fetch (§5.3) and field extraction
     (§5.2).
   - Changed (if ticked) → apply catalogue-owned fields only, bump
     `externalHash`, re-flag if the listing already has responses.
   - Missing (if ticked) → **tombstone** (§8, stage 1).
   - All touched rows → set `lastSeenInFeedAt = now()`.
5. **Report.** Counts, per-listing links, and any image-fetch failures (creator
   can re-upload those images manually).

Publishing stays a separate, deliberate step per listing (existing
`/dashboard/listings/[id]/edit` → publish).

---

## 5. Field mapping & enrichment

### 5.1 Direct mappings

| CSV | ihue Bid | Notes |
| --- | --- | --- |
| `price` | `ownerExpectedPrice` + `ownerPriceVisibility = VISIBLE` | This is the seller's ask. **Never** `responseMin/Max` — those bound the market estimate and are set from the AI price suggestion or a default spread around the ask. |
| `description` | `Listing.description` | Superseded if the creator later runs "Suggest range & description". |
| `image_link` | first `MediaAsset` (cover) | |
| `additional_image_link` | further `MediaAsset`s, in order | |
| `id` | `Listing.externalRef` (+ `externalSource`) | |

`currency` defaults to `INR`; `responseIncrement` to a category default (e.g.
₹5,000 for vehicles); `responseMin/Max` to a spread around the ask (e.g.
±25%), overridable by the creator and by the AI suggestion.

### 5.2 Structured-field extraction (reuse the Gemini path)

The Used Vehicle template needs `ListingFieldValue` rows the CSV doesn't
provide. Reuse `src/server/ai/gemini-client.ts` `callGemini()` in
structured-JSON mode: prompt = `title` + `description`, output = the Used
Vehicle template's field shape (`make`, `model`, `modelYear`,
`registrationYear`, `variant`, `fuelType`, `transmission`, `kilometers`,
`ownerCount`, …). Constrain to "extract only what is explicitly stated; leave
unknown fields null — do not infer." Validate/clamp exactly as
`price-suggestion.ts` does today.

Then the deterministic `suggestListingTitle()` / `suggestListingDescription()`
already in the codebase rebuild a clean title/description from the extracted
fields, offered as the existing "Apply" suggestion on the edit form. The creator
reviews before publish, so a wrong extraction is a visible edit, not a silent
error.

Rate-limit the extraction call (new `RateLimitAction.CATALOG_EXTRACTION`, or
reuse `AI_PRICE_SUGGESTION`'s bucket) — a 200-row CSV is 200 Gemini calls;
process the queue with a small concurrency cap and a per-account daily ceiling.

### 5.3 Images: fetch and re-host

CSV gives URLs, not files. For each row:

1. Server-side `fetch` each `image_link` / `additional_image_link` (cap count,
   e.g. 8; cap bytes, e.g. 10 MB each; verify `content-type` is an image).
2. Upload to Cloudinary via the existing signed-upload plumbing, but
   server-initiated (no browser round-trip) — a variant of the current
   `media/sign` → `media/complete` flow. Folder prefix stays
   `ihue-bid/{env}` per CLAUDE.md.
3. Create `MediaAsset` rows in order; first = cover.
4. On fetch failure: log, skip that image, surface in the import report. A
   listing with zero fetched images is still created (creator adds photos
   manually).

Do this **promptly** after upload — Meta CDN URLs can expire within
hours/days. Re-running an import later will not recover images from dead URLs.

---

## 6. Reconcile engine

One pure-ish function, `reconcileCatalog(accountId, rows, options)`, unit-tested
like `aggregation.ts`:

```
input:  parsed rows (each with id, contentHash, mapped fields)
        existing imported listings for the account
        options { applyChanged: Set<externalRef>, applyMissing: bool }
output: { toCreate[], toUpdate[], toTombstone[], unchanged[], warnings[] }
```

**Row identity.** `externalRef` scoped to the account
(`@@unique([creatorId, externalRef])`). A row is "changed" when a stable hash of
its catalogue-owned fields differs from the stored `externalHash`.

**`availability = out of stock`** in the CSV is treated the same as the row
being absent (tombstone candidate) — some merchants leave the row in but flip
availability instead of deleting it.

**Never auto-resurrect.** If an `externalRef` matches a `RetiredListing`
(§8, stage 3) rather than a live `Listing`, treat it as new *only if* the
creator opts in ("this SKU was retired on {date} — re-import as a new
listing?"). Otherwise skip.

---

## 7. Safety rails

- **Bulk-removal guard.** If a plan would tombstone more than **30%** of the
  account's active imported listings (or more than an absolute floor, e.g. 5),
  the dry-run blocks the "apply missing" tick and shows a warning. This catches
  the classic mistake of exporting one category and nuking the rest.
- **Empty / tiny CSV guard.** A CSV with 0 valid rows, or drastically fewer rows
  than last import, warns before proceeding.
- **Header sanity.** Missing `id` column → hard stop (we cannot reconcile
  without it; every row would look new every time).
- **Idempotency.** Re-applying the same CSV produces an all-"unchanged" plan and
  writes nothing but `lastSeenInFeedAt`.
- **Per-account import lock.** One import in flight per account at a time.

---

## 8. Listing data lifecycle

A listing that leaves the catalogue passes through three stages of progressive
data reduction. Stages 1–2 are automatic and need no cron (they are driven by
the import/reconcile job and by elapsed time checked lazily on dashboard load or
folded into an existing daily task). Stage 3 is the "recycle bin" — eligible for
permanent deletion, executed manually or by a platform admin sweep (§10).

### Stage 1 — Tombstone (immediate, on "missing" or on close-as-SOLD)

| Kept | Freed |
| --- | --- |
| `title`, vehicle `ListingFieldValue` rows (tiny) | **Gallery `MediaAsset`s deleted from Cloudinary** — keep only the cover |
| Cover `MediaAsset` | `description` → null (keep a ≤200-char `descriptionSnippet`) |
| **All `Response` rows** | `shareMessage` → null (fully regenerable) |
| `NotificationOptIn` rows (buyer contacts) | `ExternalEmbed`, `ReferenceLink` rows deleted |
| `archivedAggregate` snapshot (computed once here) | Cloudinary derived transforms for deleted images |

- `status` → new value **`ARCHIVED`**. Hidden from `/{handle}`, the landing
  feed, and the public listing page (which returns `notFound()` or a terse
  "no longer available" state). Visible in the creator dashboard under a
  **"Removed"** tab with a "Removed / Unpublished" badge.
- `archivedAt = now()`. `purgeEligibleAt = archivedAt + 14 days`.
- **Restore** is available from the "Removed" tab until stage 2 runs — a later
  CSV with the same `externalRef` (car didn't sell, got relisted) rehydrates the
  tombstone in place. Within the stage-1 window the cover survives and images
  can be re-fetched from the catalogue; after stage 2, restore keeps only the
  snapshot.
- The Cloudinary purge of the *gallery* can itself be delayed ~7 days
  (`mediaPurgeEligibleAt`) as a grace window for accidental removals, or run
  immediately if quota pressure is real. Tunable constant.

### Stage 2 — Compact (≈7 days after tombstone, or immediately on SOLD)

Once a car is sold we do not want per-participant detail — only the shape of the
market's answer.

| Kept | Freed |
| --- | --- |
| `archivedAggregate` JSON: `responseCount`, `namedCount`, `consensus`, `band [p25, p75]`, `confidence`, `distribution` bins, `closureFinalPrice`, `closureOutcome` (~300–400 bytes, permanent) | **All `Response` rows deleted** |
| `descriptionSnippet`, vehicle fields, cover | **`NotificationOptIn` PII** (`email`, `buyerName`, `buyerPhone`) nulled — keep `verifiedCount` / `readyToBuyCount` on the snapshot |

- `responsesPurgedAt = now()`.
- **This is irreversible** — restoring after stage 2 cannot recover individual
  estimates or buyer contact details, only the aggregate. The "Removed" tab must
  make "Restore" prominent *before* this window closes.
- Deleting participant data once a transaction is done is also a privacy win —
  data minimisation, consistent with this project's "don't hoard what you don't
  need" instinct.

### Stage 3 — Retire (≥14 days; manual / admin sweep)

- The `Listing` row (and its cover `MediaAsset` + Cloudinary asset) is deleted.
- A flat, relation-free **`RetiredListing`** row persists permanently:
  `externalRef`, `creatorId`, `title`, `category`, `soldAt`/`archivedAt`,
  `snapshot` (the stage-2 JSON). ~300 bytes. Purpose: dedup on future imports,
  honest historical counts, and a minimal "you sold N cars, market range was …"
  record for the creator.
- Nothing here references Cloudinary or the participant tables, so it costs
  effectively nothing and can never fan out.

### Stage summary

```
LIVE / CLOSED
   │  removed from catalogue, or closed as SOLD
   ▼
ARCHIVED  ── cover + fields + responses + snapshot ── (restore ⟲)
   │  +7d  → drop raw responses + buyer PII, keep snapshot
   ▼
COMPACTED (still ARCHIVED status)  ── cover + fields + snapshot ──
   │  +14d total, admin/manual sweep
   ▼
RetiredListing (Listing row gone)  ── flat permanent stub ──
```

---

## 9. Schema changes

```prisma
enum ListingStatus {
  DRAFT
  SCHEDULED
  LIVE
  PAUSED
  CLOSED
  CANCELLED
  ARCHIVED          // new — tombstoned, creator-only
}

enum ExternalListingSource {
  WHATSAPP_CATALOG_CSV
}

enum RateLimitAction {
  // …existing…
  CATALOG_IMPORT
  CATALOG_EXTRACTION
}

model Listing {
  // …existing…
  externalRef          String?               @map("external_ref") @db.VarChar(120)
  externalSource       ExternalListingSource? @map("external_source")
  externalHash         String?               @map("external_hash") @db.VarChar(64)
  lastSeenInFeedAt     DateTime?             @map("last_seen_in_feed_at") @db.Timestamptz(3)
  descriptionSnippet   String?               @map("description_snippet") @db.VarChar(220)
  archivedAt           DateTime?             @map("archived_at") @db.Timestamptz(3)
  mediaPurgeEligibleAt DateTime?             @map("media_purge_eligible_at") @db.Timestamptz(3)
  responsesPurgedAt    DateTime?             @map("responses_purged_at") @db.Timestamptz(3)
  purgeEligibleAt      DateTime?             @map("purge_eligible_at") @db.Timestamptz(3)
  archivedAggregate    Json?                 @map("archived_aggregate")

  @@unique([creatorId, externalRef])
  // existing @@index([creatorId, status]) still covers the "Removed" tab
}

model RetiredListing {
  id           String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  creatorId    String                @map("creator_id") @db.Uuid
  externalRef  String?               @map("external_ref") @db.VarChar(120)
  externalSource ExternalListingSource? @map("external_source")
  title        String                @db.VarChar(200)
  category     ListingCategory
  archivedAt   DateTime              @map("archived_at") @db.Timestamptz(3)
  soldAt       DateTime?             @map("sold_at") @db.Timestamptz(3)
  snapshot     Json
  createdAt    DateTime              @default(now()) @map("created_at") @db.Timestamptz(3)

  creator User @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  @@unique([creatorId, externalRef])
  @@index([creatorId])
  @@map("retired_listings")
}

model CatalogImportRun {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accountId   String   @map("account_id") @db.Uuid
  source      ExternalListingSource
  rowCount    Int      @map("row_count")
  created     Int
  updated     Int
  tombstoned  Int
  unchanged   Int
  imageFailures Int    @map("image_failures")
  startedAt   DateTime @default(now()) @map("started_at") @db.Timestamptz(3)
  finishedAt  DateTime? @map("finished_at") @db.Timestamptz(3)

  @@index([accountId, startedAt])
  @@map("catalog_import_runs")
}

model AdminActionLog {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId    String   @map("admin_id") @db.Uuid
  action     String   @db.VarChar(80)   // "PURGE_ELIGIBLE", "FORCE_COMPACT", …
  scope      Json                        // { accountId?, listingIds?, dryRun, counts }
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  @@index([adminId, createdAt])
  @@map("admin_action_logs")
}
```

No enum needed for the reduction stage — the nullable timestamps
(`archivedAt` / `responsesPurgedAt` / `purgeEligibleAt`) encode it, matching the
codebase's existing `verifiedAt` / `readyToBuyAt` / `stillInterestedAt` style.

---

## 10. Platform admin & the cron constraint

### 10.1 Reuse the existing admin gate

`UserRole.ADMIN` and `requireAdminSession()` (`src/server/auth/admin.ts`)
already exist. Make the platform operator (`ihue.india@gmail.com`) an `ADMIN`
in the DB — no new mechanism. (An env allowlist,
`PLATFORM_ADMIN_EMAILS`, checked in `requireAdminSession()` is an acceptable
alternative if we'd rather not carry the privilege in the DB; either is fine.)

### 10.2 Admin surface — `/admin`

A new route group, `requireAdminSession()` on the layout. First screens:

- **Storage overview.** Per-account counts of `ARCHIVED` (pre-compact),
  `COMPACTED`, and `purgeEligibleAt <= now()` listings; total `MediaAsset` count
  and rough Cloudinary footprint; `Response` / `NotificationOptIn` row counts.
- **Cleanup actions**, each **dry-run first** (show exactly what would be
  deleted + estimated space freed, then a confirm step):
  - *Purge eligible* — hard-delete every listing past `purgeEligibleAt` →
    `RetiredListing` + Cloudinary cover delete. Global or per-account.
  - *Force compact* — run stage 2 now on tombstones older than a chosen age.
  - *Force tombstone* — stage 1 on `CLOSED` listings older than a chosen age
    even if they never came from a catalogue (general hygiene).
- Every action writes an `AdminActionLog` row.

This route group is also the natural future home for the deferred abuse-review
queue (requirements §9.3).

### 10.3 Cron

Vercel Hobby allows very few scheduled jobs (2, once-daily). Rather than spend a
slot:

- **Stages 1–2 need no cron.** Stage 1 is event-driven (import / close). Stage 2
  is "tombstone age ≥ 7d" — check it lazily whenever the account's dashboard or
  "Removed" tab loads, and/or fold a sweep into whatever daily task the app
  already runs. There is **no cron handler in the repo yet** (`vercel.json` has
  no `crons`, `CRON_SECRET` is generated but unused) — so if/when a first daily
  cron is added (e.g. to process `SCHEDULED` listings), give it a
  `runLifecycleSweep()` pass too. One cron, several responsibilities.
- **Stage 3 is deliberately manual** — the `/admin` "Purge eligible" button, and
  a `POST /api/admin/cleanup` route (admin-session **or** `CRON_SECRET` bearer)
  so it can be curled or wired to a cron later without code changes.

---

## 11. Phasing

| Phase | Scope | New credentials |
| --- | --- | --- |
| **1** | Manual CSV upload, dry-run preview, reconcile engine (add / flag-changed / tombstone-missing), server-side image re-host, Gemini field extraction, stage-1 tombstone, "Removed" dashboard tab, `/admin` storage overview + "Purge eligible" (manual). | None |
| **2** | Stage-2 compact + `RetiredListing`, restore flow, safety-rail tuning, `AdminActionLog`, force-compact/force-tombstone admin actions, lifecycle sweep folded into a daily cron if one exists by then. | None |
| **3** | Scheduled fetch from a hosted feed URL / published Google Sheet (Commerce Manager can publish one) → same reconcile engine, no manual upload. | Feed URL only (no Meta app) |
| **later** | Meta Graph API connection (one-click connect, `catalog_management`). Separate design — see parent reuse assessment. | Meta app + system-user token |

---

## 12. Open questions

1. **Column set & image URLs.** Need a real Gettecar export. Are `image_link`
   URLs fetchable without auth, and how long do they live?
2. **Who owns the catalogue?** Gettecar's own Meta Business Manager, a plain
   WhatsApp Business app catalogue, or a third-party tool (Wati / AiSensy /
   DoubleTick …)? Determines whether phase 3/4 is even possible and what a hosted
   feed URL would look like.
3. **Import volume?** Dozens vs. hundreds of cars — affects extraction
   queue sizing and whether bulk draft-review is tolerable.
4. **Catalogue as source of truth for price?** If a car's price drops in the
   catalogue, flag-for-review (current design) or auto-apply to the live
   listing? Auto-apply is riskier because the market signal context shifts.
5. **Retention windows.** 7 days to compact, 14 to retire — confirm, or make
   them per-account settings.
6. **Restore depth.** Is "restore keeps only the snapshot after stage 2"
   acceptable, or should stage 2 be pushed later / made opt-in per account?
