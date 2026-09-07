# iHue Bid — Project Requirements & Solution Specification

**Product:** `bid.ihue.in`  
**Audience:** Claude Code / implementation team  
**Status:** Initial product specification  
**Architecture reference:** Refer to the existing **iHue Rating** (`rating.ihue.in`) project for the application architecture, code conventions, authentication approach, deployment, media handling, design system, and operational patterns. Reuse or adapt its established foundations where appropriate; this document defines the product-specific requirements for iHue Bid.

## 1. Product summary

iHue Bid is a generic, shareable **market-value discovery and offer collection** platform. A registered creator (for example, a used-car dealer, aggregator, collector, marketplace, influencer, or community) creates a rich item listing and shares it with an audience. Participants can anonymously state what they believe the item is worth, optionally register interest, or make a more serious verified offer.

The system aggregates responses into a defensible market-value signal: a consensus price, a likely-value band, and a confidence level. It is designed to help a seller or intermediary explain whether an owner's expected price is justified, optimistic, or undervalued.

Initial use case: used vehicles. The underlying product must remain category-generic.

## 2. Problem to solve

An owner may expect ₹8.5 lakh for a car. A dealer believes that price is unrealistic, but may not want to rely only on their own opinion—particularly when the vehicle has unusual condition, accessories, collectable value, or other subjective appeal.

The dealer should be able to publish a well-documented listing, share it with their followers, collect independent price opinions, and show the owner a transparent market signal.

Example outcome:

> Owner expectation: ₹8.50L  
> Audience consensus: ₹7.82L  
> Likely value band: ₹7.55L–₹8.10L  
> Interpretation: The expectation is 8.7% above the current market consensus.

## 3. Product principles

- **Generic, not car-only.** A vehicle is a category template over a shared listing and response engine.
- **Low-friction participation.** A participant can submit an anonymous valuation without creating an account.
- **Anonymous to creators, accountable to the platform.** The creator must not see anonymous participant identity; the platform must still prevent spam and manipulation.
- **Separate opinion from commitment.** A value vote is not a purchase promise. An indicative interest signal is not a verified offer.
- **Creator-owned audience and identity.** Creators require iHue accounts and have permanent public profile pages.
- **Share-first experience.** Every listing must be attractive and understandable when opened from WhatsApp, Instagram, YouTube, Facebook, or a copied link.
- **Trustworthy results.** Show sample size and confidence—not just a single number.

## 4. Users and roles

| Role | Description | Key abilities |
| --- | --- | --- |
| Platform administrator | iHue Bid operations | Moderation, fraud review, taxonomy, verification policies |
| Creator | Account holder publishing listings | Create, publish, share, close listings, see aggregate analytics, manage leads |
| Participant | Public visitor responding to a listing | Submit anonymous value, opt into notifications, or make a verified offer |
| Interested buyer | Participant who opts in or submits a verified offer | Receive closure alerts; optionally share contact details with creator |

Use **Creator** as the generic platform term. A creator may describe themselves as a dealer, marketplace, seller, community, or collector in their public profile.

## 5. URL and public identity model

Do not create a separate iHue subdomain for each creator.

- Creator profile: `https://bid.ihue.in/{creatorHandle}`
- Listing: `https://bid.ihue.in/{creatorHandle}/{listingId}`
- Optional readable listing URL: `https://bid.ihue.in/{creatorHandle}/{listingSlug}-{listingId}`

Example:

- `bid.ihue.in/gettecar`
- `bid.ihue.in/gettecar/7xK9p`
- `bid.ihue.in/gettecar/2021-fortuner-7xK9p`

Requirements:

- `creatorHandle` is unique, lowercase, URL-safe, and reserved-word protected.
- Internal IDs must not appear in public URLs.
- Listing IDs remain in readable URLs for uniqueness and permanence.
- If a handle or listing title changes, redirect old public URLs.
- Closed listing URLs remain available and show their final state/outcome.
- Reserve system handles such as `admin`, `api`, `login`, `signup`, `explore`, `help`, `pricing`, and `assets`.

## 6. Listing model

### 6.1 Common listing fields

- Title
- Category and optional subcategory
- Creator identity and profile link
- Description
- Location (optional / configurable visibility)
- Cover image plus ordered image gallery
- External media links and embeds where supported (initially YouTube; design extensibly for Vimeo and other providers)
- Source/reference links or downloadable documents
- Condition notes
- Owner/seller expected price (visible, hidden until response, or not supplied)
- Response price range: minimum, maximum, and increment/precision
- Currency
- Time zone, publish time, close time
- Listing status: draft, scheduled, live, paused, closed, cancelled
- Creator-provided disclosure text and terms

### 6.2 Category templates

Create a generic field/template framework. "Used Vehicle" is the first template and should support fields such as:

- Make, model, variant, model year
- Registration year
- Kilometres driven
- Fuel / transmission
- Ownership count
- Service history
- Accident/insurance disclosure
- Registration/location information
- Accessories, modifications, known defects
- VIN/registration details only if the creator chooses to publish them

Future templates may include property, collectibles, art, electronics, watches, sneakers, event tickets, and other assets.

## 7. Participant response modes

The UI and data model must make these distinct.

| Mode | Participant action | Contact requirement | Meaning |
| --- | --- | --- | --- |
| Anonymous valuation | Select or enter a fair value in the allowed range | None | Opinion only; not a promise to buy |
| Interested buyer | Submit a valuation and opt into closure/availability alerts | Email or phone, verified as appropriate | Demand signal; participant chooses whether to engage later |
| Verified offer | Submit an offer intentionally | At minimum verified phone/email; future policy may require stronger verification | Serious offer, subject to creator terms; not necessarily a legally binding transaction |

Initial MVP may launch with Anonymous Valuation and Interest Opt-in; retain the data model and UI pathway for Verified Offer.

### 7.1 Anonymous response interaction

- Participant selects a price using a slider, numeric entry, price buckets, or a combination.
- Show the allowed range prominently.
- Ask optional structured reasons where useful (for example: condition, mileage, collectability, local demand), but do not make it burdensome.
- On a successful response, show a confirmation and optionally a current/high-level market result according to creator configuration.
- Allow a participant to revise their own valuation within a limited period; retain an audit history but only count the latest valid response.

### 7.2 Notification and lead flow

After submitting an anonymous valuation, show an optional choice:

> Notify me when this closes or if it becomes available near my price.

- Collect contact information only when the participant explicitly opts in.
- Keep contact details private from the creator by default.
- When the creator closes the listing, iHue sends the participant the final outcome.
- The message includes an action such as **"I'm still interested"**.
- Only when the participant takes that action should they be asked to share contact details with the creator (unless they submitted a verified offer under the applicable terms).

## 8. Aggregation and result presentation

### 8.1 Required result outputs

- Consensus/fair value
- Likely value band (for example, a robust central range)
- Number of valid responses
- Confidence level: Low / Medium / High
- Comparison to expected price when configured: below, aligned, or above consensus; show both absolute and percentage difference
- Distribution visual showing how valuations are spread across the range
- Listing close state and final outcome fields, if the creator chooses to publish them

### 8.2 Aggregation rules

Implementation details can evolve, but the result must be resistant to isolated extreme values. Use a robust aggregation approach (for example, median and percentile-based bands) rather than a naïve average.

The system must avoid overstating certainty. Low participant count, poor response diversity, or suspicious response patterns must reduce confidence and may exclude responses from the aggregate.

### 8.3 Suggested public wording

- **Green:** "Expectation is well-supported by audience responses."
- **Yellow:** "Expectation is plausible, but above the current consensus."
- **Red:** "Expectation is materially above the current market signal."
- **Purple/blue:** "Responses vary widely; this item has an uncertain or highly subjective value."

Colour must not be the only communication method; include text for accessibility.

## 9. Abuse prevention and response integrity

Anonymous participation must not mean unrestricted or untraceable participation.

### 9.1 Baseline controls

- Set a signed, first-party participant token/cookie in the browser for each listing interaction.
- Permit one active anonymous valuation per participant token per listing.
- Permit edits only with a cooldown and sensible maximum revision count.
- Apply server-side rate limits by IP address and broader network characteristics. Do **not** rely on IP alone: legitimate people may share an office, household, Wi-Fi network, or carrier IP.
- Add progressive friction: CAPTCHA/challenge only after suspicious behaviour, rapid submissions, repeated failures, or unusual traffic patterns.
- Require verification for contact details and verified offers.
- Log security and response events for review, without exposing technical identifiers publicly.

### 9.2 Suspicion signals

- Large bursts of votes for one listing
- Many new browser identities from the same network/device characteristics
- Identical or highly patterned values submitted unusually quickly
- Repeated token resets or challenge failures
- Creator-side or owner-side manipulation patterns

### 9.3 Handling suspicious responses

- Flag rather than automatically delete when confidence is uncertain.
- Exclude high-confidence fraudulent/spam responses from public aggregation.
- Lower public confidence when response quality/diversity is insufficient.
- Provide platform administrators with review/audit tooling.
- Do not expose IP addresses, device fingerprints, or anti-fraud decisions to creators or participants.

## 10. Creator experience

### 10.1 Creator onboarding and profile

- iHue account is required to create or manage listings.
- Creator chooses a permanent public handle.
- Public profile includes logo/avatar, display name, short description, location (optional), links, verification status (if any), and active/closed listings.
- Initial verification badge policy may be manual or omitted; design for it.

### 10.2 Listing management

- Draft, preview, schedule, publish, pause, close, and cancel listings.
- Upload/manage media and external embeds.
- Configure price range, expected price visibility, response modes, close time, and result visibility.
- Provide a share panel with copy link, WhatsApp share, social-share actions, and QR code.
- Provide private aggregate analytics: response count, distribution, confidence, interested participants, verified offers, and suspicious-response indicators.
- Allow the creator to publish a closure outcome (sold, not sold, final price, removed, etc.) subject to product policy.

## 11. Public listing experience

A shared listing page must be complete and mobile-first because most traffic will arrive from social apps.

Required page sections:

1. Creator identity and trust context
2. Item title, category, location, and status/closing time
3. Media gallery with a strong cover image; embedded supported video
4. Description and category-specific facts
5. Reference/source links and disclosures
6. Owner expectation and requested price range, according to creator configuration
7. Clear primary response action: **"What is this worth?"**
8. Optional interest/offer actions, clearly differentiated
9. Aggregate result/distribution and confidence, according to result-visibility settings
10. Share controls
11. Closure state and final outcome after close

Social metadata must be generated per listing: Open Graph/Twitter title, description, cover image, and canonical URL. The shared preview should communicate the item and prompt, for example: "What is a fair price for this 2021 Fortuner?"

## 12. Platform positioning and terminology

Avoid describing all interactions as a "bid."

- Use **Fair Value**, **Price Check**, or **What would you pay?** for non-binding market opinions.
- Use **Register interest** for notification intent.
- Use **Make an offer** only for the stronger, verified response mode.
- Use **Auction** only if/when a genuine time-bound, competitive offer mechanism is implemented.

Recommended positioning:

> **iHue Bid — turn your audience into a market signal.**  
> Share an item, collect price opinions or offers, and understand its defensible fair-value range.

Relationship to iHue Rating:

> **iHue Rating answers: “How good is it?”**  
> **iHue Bid answers: “What is it worth?”**

## 13. Integration strategy

Build in layers; do not make external integrations a prerequisite for the first usable product.

1. **Hosted page (MVP):** creators share `bid.ihue.in/{handle}/{listingId}`.
2. **Embeddable widget:** businesses add a valuation/offer module to their own listing pages while iHue manages collection and aggregation.
3. **API/headless integration:** partners use iHue listing, response integrity, aggregation, and notification capabilities behind their own UI.
4. **Optional custom domain / white label:** a paying partner maps a subdomain they own (for example, `value.dealer.com`) to iHue Bid. This is not an iHue subdomain per customer.

## 14. MVP scope

### Include

- Creator authentication and public profile/handle
- Generic listings and Used Vehicle template
- Media uploads, image gallery, YouTube embed, external reference links
- Hosted public listing URLs
- Anonymous valuation response with token, rate limiting, and progressive anti-abuse checks
- Optional notification opt-in with contact verification
- Robust aggregate fair value, range, response count, and confidence
- Creator dashboard for listing management and aggregate analytics
- Listing share links, social metadata, WhatsApp sharing, QR code
- Closing flow and participant notifications
- Mobile-first public experience

### Explicitly defer

- Payments, escrow, deposits, settlement, and ownership transfer
- Binding auction/legal contract workflows
- Live real-time auction rooms
- Automatic title/document verification
- Full partner API and SDK
- Full custom-domain provisioning
- Native mobile apps
- Advanced ML price prediction (audience signal is the initial product)

## 15. Non-functional requirements

- Responsive and accessible public interface.
- Secure authentication and authorization: creators can access only their own management data.
- Privacy-by-default handling of participant contact information.
- Creator public listings indexable/configurable according to policy; draft/private pages must not be publicly indexable.
- Clear consent language for notification subscriptions and contact sharing.
- Auditability for responses, edits, status changes, abuse flags, and closure notifications.
- Time-zone-safe closing logic.
- Graceful media/embed failures.
- Strong caching and fast public-page performance for social traffic spikes.
- Analytics/error monitoring consistent with iHue Rating conventions.

## 16. Data entities (conceptual)

- **User**: authenticated iHue identity
- **CreatorProfile**: public handle and creator-facing information
- **Listing**: common content, lifecycle, and valuation configuration
- **ListingFieldValue**: category-template-specific structured data
- **MediaAsset**: images/files/media ordering and metadata
- **ExternalEmbed / ReferenceLink**: supported embed and outbound reference data
- **Response**: valuation, interest, or verified offer; response state and anti-abuse outcome
- **ParticipantIdentity**: opaque browser/session identity used for anonymous response controls
- **ContactConsent**: verified contact channel and notification/contact-sharing permissions
- **AggregateSnapshot**: computed public/creator result values and confidence
- **Notification**: closure and interest communication events
- **AbuseSignal / ModerationEvent**: operational integrity data

## 17. Acceptance criteria for the first end-to-end flow

1. A registered creator named Gettecar can claim the handle `gettecar` and has a public profile at `bid.ihue.in/gettecar`.
2. Gettecar can create a Used Vehicle listing with photos, YouTube link, structured vehicle facts, description, expected price of ₹8.5L, and an allowed response range of ₹7L–₹9L.
3. The published listing is available at a permanent URL such as `bid.ihue.in/gettecar/7xK9p` and has a meaningful social-share preview.
4. A visitor can submit an anonymous fair-value response without creating an account.
5. The same browser cannot create multiple simultaneously counted anonymous responses for that listing; it can revise its own response under defined limits.
6. Obvious rapid/spam patterns are rate-limited or challenged, and suspicious responses do not falsely increase confidence.
7. The visitor can optionally verify an email/phone number to receive a closure notification without automatically revealing it to Gettecar.
8. Gettecar sees a private aggregate: valid response count, consensus price, likely band, confidence, and interest count.
9. On close, the listing changes to closed and opted-in participants receive a final-price/outcome notification with an "I'm still interested" pathway.
10. The creator can choose whether the public closed page shows only that it closed, or also shows the final market result/outcome.

## 18. Implementation note to Claude Code

Begin by inspecting the current iHue Rating codebase and documenting which existing components/services can be reused for iHue Bid. Preserve its established architecture unless the bidding-specific requirements above make a change necessary. Build the product as an independent `bid.ihue.in` application/domain with shared iHue foundations where appropriate.

Prioritize a polished hosted-link experience and the end-to-end MVP flow over API, white-label, payments, or live-auction features.
