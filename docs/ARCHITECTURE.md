# Listed marketplace: first vertical slice

The running Next.js app is a local-first buyer discovery prototype. The domain, ranking, interest calculator, and persistence are separated from React so they can move behind authenticated APIs without rewriting the feed.

## Source and reuse

Source: https://github.com/shawnkburton/listed, commit `e618a0509299e709afdb70ef8488f95a5360dd21` (inspected September 28, 2026). The original is a single HTML application with Firebase sign-in, ten source-linked listings, a local saved/history store, filters, a rule-based guide, and a calculator.

Reused directly: the two-path Listed SVG mark and exact dark theme tokens (`#111513`, `#1b221d`, `#d6f277`, `#f1f4ef`, `#a4afa6`, `#303a33`). Preserved and extended: photo-first cards, circular feature filters, the single-column social feed, desktop sidebars, mobile navigation, detail overlay, and brand language. The old saved/open affinity concept is the starting point for the new explicit and learned model; its implementation has been rewritten in typed modules. The original static files remain at the repository root; `legacy/` also contains unchanged copies of the HTML, phone preview, and authentication guide for reference. The source repository history is preserved and changes are on the local `codex/marketplace-first-slice` branch. Nothing was pushed to the original repository or published site.

Do not serve the legacy HTML as part of the new preview. The new app reuses the public Firebase configuration and contains a fresh, sourced September 28 listing snapshot. It does not assume commercial redistribution rights. Original third-party rights remain as described in `docs/ORIGINAL-README.md`.

## Modules

- `lib/domain.ts`: property, buyer criteria, engagement schema, storage/repository boundaries; initial ID-based contracts for listings, messaging, showings and transactions.
- `lib/properties.ts`: 20 sourced REALTOR.ca house records with BC Assessment matches, dates, source URLs and geocoder coordinates and a replaceable repository adapter.
- `lib/recommendations.ts`: deterministic ranking, reasons, tradeoffs, exploration slots, reversible signals.
- `lib/interest.ts`: unique-buyer, time-windowed marketplace interest calculator. Its input must come from trusted server ingestion, never local browser state.
- `lib/storage.ts`: versioned local storage, validation, 90-day/2,000-event retention, safe recovery from corrupt data, separated by Firebase UID or guest.
- `components/Marketplace.tsx`: feed, reusable cards/gallery/dialog, preferences, collections, activity, and explanatory screens.
- `supabase/schema-draft.sql`: unexecuted PostgreSQL/Supabase Auth proposal with owner-only preferences/activity and server-only event writes. It requires integration and authorization tests before use.

## Recommendation rules

A stated score out of 100: preferred area 25, style 30, budget 25, bedrooms 20. An over-budget home gets a progressively lower budget score when the buyer explicitly allows it. A hard budget excludes it unconditionally. Base ranking = stated score × 0.8 plus learned adjustment capped at ±10. This keeps explicit intent dominant.

Per property, Like=2, Save=4, copied share intent=3, open=0.5, photo engagement=0.25. Repeated actions are deduplicated at the preference level; unlike/unsave reverse contributions. Positive signal weights decay with a 30-day half-life. Explicit location/style rejection supplies negative feedback; other hide reasons exclude that home without silently rewriting the buyer's criteria. An undo removes the rejection. Behaviour uses only property attributes, never protected characteristics or demographic proxies.

Focused shows only full matches. Balanced reserves every fourth slot for adjacent discovery while matches remain. Adventurous reserves every second. After matches run out, adjacent options continue; thus 25% is a placement target, not a promise about the whole small inventory. Feature circles are optional explicit filters. Saved/viewed collections remain accessible regardless of criteria or hide state.

Learning appears in the side panel immediately; reranking applies when the buyer refreshes, reloads, or changes criteria, to avoid cards jumping under the pointer. Hiding is immediate. Reasons show stated matches, tradeoffs, and learned features. The match score is internal and not presented as a probability.

## Events and High Interest

The local log captures sustained visible card impressions (55% for 800ms), opens, unique gallery photo views, likes/unlikes, saves/unsaves, successfully copied share intent, and hides/unhides with reasons. Views within 30 seconds are deduplicated. Impressions are deduplicated per property per session. Clipboard failure records no share. Copying a link does not prove delivery, and local events never qualify as verified marketplace signals.

The High Interest rule needs at least 10 verified viewers, 5 unique engaged buyers, engagement by at least 20% of viewers, and 1.5× the median engagement rate of at least 3 comparable listings. Compare same area/type, price within 25%, and listing age within 7 days over a trailing 7-day window. A save, confirmed share, or showing request qualifies; each buyer is counted once. Future/expired/unverified events are excluded. No offers or demand are inferred from views. These are initial product thresholds, not empirically validated market measures.

The runtime provides no verified signals, so it honestly shows zero evidence and no High Interest badges. Synthetic signals exist only in automated tests. To activate the badge, wire a server-computed aggregate to both cards and details; never replace this with a browser-supplied `verified` flag. The current calculator's type is a contract, not a security boundary.

## Next production increment

1. Firebase identity is reused from Listed. Verify Firebase ID tokens server-side and map the UID into the database before adding private APIs. The earlier Supabase-auth SQL is not compatible without this integration or an explicit identity migration. Never trust a client-supplied UID.
2. Build authorized persistence, rate-limited/idempotent event ingestion, bot/owner exclusion, and server-generated timestamps. Verify user isolation with two-account tests. Guest merge must be explicit.
3. Add licensed/seller-verified listing ingestion, provenance, photo permissions, withdrawal/freshness checks, and server-rendered shareable detail routes with metadata.
4. Connect verified aggregates, include unsave/retraction handling in the active-save projection, minimum group sizes, comparable age normalization and monitoring. The present seven-day age-matched cohort is an initial approximation.
5. Seller draft/publish/withdraw workflows, participant-authorized conversations and showing requests/confirmations now run through the local SQLite adapter; add availability calendars, ownership review and property intelligence next. See SELLER-AND-CONTACT.md.
6. Add versioned offers and transaction state machines with participant permissions, audit trails, document access boundaries, and explicit acceptance actions. Keep buyer and seller private negotiation data separate from shared transaction records.

Google and Microsoft OAuth client integration is active; Apple and Facebook await provider activation. Browsing data remains local to the browser. Listings, in-app messages and showing requests now persist on the local server. No cloud deployment, payments, offers or AI service calls are active. Assessments are dated research snapshots. Provider activation/testing, backend integration, licensed live data, hosting, and later workflows remain outstanding.

## September 28 extension

`components/Account.tsx` initializes the original Firebase project and remounts the marketplace at each identity boundary. `lib/auth.ts` configures profile-only Google/Microsoft/Apple/Facebook OAuth and user-safe errors. `localBuyerRepository(uid)` owns a fixed per-account key; guest activity is never silently copied into an account. The tests cover isolated stores and switching, but real-account provider flows remain a manual acceptance check.

`lib/nearby-properties.json` carries field provenance, known missing tax years, source disagreement, limited sales coverage and a multi-parcel comparison exception. `PropertyEvidence.tsx` presents these without inferring valuation advice. `PropertyMap.tsx` lazy-loads Leaflet, plots BC-geocoded coordinates, and gives an accessible property-list fallback. Nearby is an inventory view independent of preference budgets; For you applies all preference rules. Map markers follow visible inventory and open the same detail flow.

Read `DATA-SOURCES.md` before adding any refresh job or publishing source data.

## Seller and contact increment

`MarketProvider` shares authorized API snapshots with the feed and the new seller/inbox screens. `SellerWorkspace` manages listing forms, photos and status. `Inbox` manages participant messages, unread activity and showing transitions. Domain validation and authorization live in `marketplace-domain.ts`; `server/identity.ts` resolves verified Firebase identities, and `server/market-store.ts` provides transactional SQLite persistence. The original buyer repository stays separate. See [operational guide](SELLER-AND-CONTACT.md).

## Seller analytics increment

Browser-reported seller-listing events use `useListingAnalytics`, serialized POSTs, signed guest cookies or Firebase-verified accounts, and separate SQLite event/share tables. `listing-analytics.ts` derives an owner-only report from events plus persisted conversations/showings; no raw visitor identities leave the analytics API. [Definitions, limits and storage](SELLER-ANALYTICS.md).

## Radius-led recommendations

`MapSearchArea` is an optional local buyer/guest setting, validated on load and applied only after **Show these homes**. It contains the centre coordinates, radius (250 m–100 km), and outside-discovery toggle. Existing accounts keep their current feed until they apply a circle. Invalid stored areas are dropped without discarding valid preferences/history.

`radiusFeed` runs after normal ranking, hides, feature filtering and selected sorting in For you. Geocoded homes inside the circle form the main inventory. At most one outside home is inserted after each four inside homes; outside candidates must match budget, bedrooms, neighbourhood and style, even when the ordinary ranking permits a soft-budget tradeoff. No outside tail fills the feed when local homes run out. Unknown coordinates cannot qualify as either local or outside. All distances are recomputed from the selected centre, rather than using the research snapshot's original distance field. Outside cards and their detail explanation identify the exception.

The map draws the circle and local pins. Users may drag the centre, tap empty map space, or pan then choose Use map centre. Pan/zoom alone do not commit a new area. Draft circle edits survive exploring a property and returning to the map; Cancel discards unapplied edits. Saved/viewed/hidden collections, seller inventory and the original Nearby research browse are not geographically filtered. They remain ways to access homes without coordinates. Changing the map and applying it switches to For you. The current catalogue is still a limited research snapshot plus seller listings, not a nationwide live listing service.
