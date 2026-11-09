# Verification — September 28, 2026

39 automated checks pass, covering preference ranking and discovery, hard budgets, reversible/deduplicated activity, High Interest evidence thresholds, malformed storage, guest/account separation, OAuth provider IDs/scopes/error handling, 20 unique sourced records, matched assessment addresses, assessment arithmetic, geocoded distances, the bundled-parcel exception, and known source disagreements. TypeScript and the production build pass.

Browser checks against the production preview:

- 20 property cards and 20 map markers, reference location, loaded OpenStreetMap tiles and attribution; no desktop horizontal overflow.
- A map marker opens the correct detail view and deep link, showing tax, source links, 2026 assessment, valuation date, comparison and May 2023 transfer history.
- Actual listing photo loads and gallery advances to the next real photo.
- Save adds the home to Saved; Hide removes both card and marker (19 remaining), and Undo restores 20.
- For you retains the C$1.8M boundary and returns the three qualifying-price homes in this snapshot; Nearby shows the complete surveyed set independently.
- Google/Microsoft enabled and Apple/Facebook disabled in the account dialog. Google sign-in attempt returned cancellation cleanly. No real-account login was completed during the agent’s browser checks, and no provider token was logged. The user subsequently confirmed Microsoft sign-in works on September 28, 2026.

Limits: source pages can change after capture; the geographic survey is not an authoritative exhaustive MLS radius query; tax years and most room dimensions are not provided in the captured data. Google sign-in, Apple/Facebook activation and login, Microsoft sign-out/session restoration, and server authorization still need acceptance checks. Microsoft sign-in is user-verified; cloud synchronization is not implemented. The database proposal remains unapplied.

Final responsive check: a fixed 390×844 frame showed all 20 cards/markers with body width = scroll width = 390; the sign-in dialog was 356px wide with no internal horizontal overflow. Only Google/Microsoft were enabled. The visible preview at 656px also loaded without errors. Final production preview reported no console errors. The temporary responsive harness was kept outside the application and stopped after verification.

## Seller and contact increment

Eight additional automated tests cover draft privacy, publishing validation, ownership/version conflicts, conversation isolation and sender spoofing, idempotent messages, showing authorization and transitions, conflicting reservations, withdrawal restrictions, SQLite persistence/rollback and server-side identity failures. All 39 checks and the final production build pass.

The actual SellerWorkspace and Inbox components were exercised in an isolated browser harness with fictional buyer/seller identities: create draft, reopen with retained details, add photograph, publish, start conversation, send buyer message, request a showing in Pacific time, receive unread seller activity, reply and confirm. No real accounts or external recipients were used for these UI tests. The harness is outside the app and is not deployed.

Running API checks: public GET returned an empty public catalog/inbox, unauthenticated POST returned 401, cross-origin POST was rejected. The Firebase lookup endpoint was reachable and rejected an invalid test token. The real app displayed the sign-in boundary for seller tools. The updated phone header/navigation was visually checked in a 390-pixel iframe.

Remaining manual acceptance: two real signed-in accounts using the new API from listing publication through conversation and showing confirmation. Microsoft sign-in itself was previously confirmed by the user; that does not establish the new API flow.

## Mac photo upload fix

The old uploader rejected everything over 500 KB, excluded HEIC/HEIF, and discarded a whole selection when one file failed. The replacement snapshots the picker selection before resetting it, accepts files up to 20 MB, resizes/encodes locally into the existing storage limit, and shows progress and per-file errors.

Browser file-chooser checks in the isolated UI harness: a 3,526,823-byte JPEG produced a loaded 1,500×1,125 preview under 500 KB; a 100×80 PNG also attached; an invalid JPEG showed a named inline error without discarding either valid photo. The libheif repository example HEIC (718,114 bytes) attached as a loaded 1,280×854 JPEG under 500 KB. No browser console errors were recorded. Additional tests cover large/MIME-less Mac filenames, empty iCloud files, input limits, partial success, slot limits, and photo persistence through the real SQLite save/reopen path.

## File-picker cancellation regression

The listing dialog previously treated every React `onCancel` event as its own close request. A file input's [cancel event bubbles](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/cancel_event), so cancelling the Mac picker unmounted the seller form. `components/Dialog.tsx` now closes only when the event target is the dialog itself. The same shared dialog is used by Marketplace and the isolated UI harness.

Browser regression: replaying the bubbling file-input cancel event against the original handler closed the dialog (zero dialogs remained). With the fix, two successive cancellations kept the dialog open and preserved address, the formatted $5,000,000 price, four bedrooms, description and an already attached photo. Explicit Close and Escape still closed the dialog normally. Production build and TypeScript passed. This check used the browser event emitted by picker cancellation, replayed through the actual dialog/form components; no real seller data was altered.

## Optional BC Assessment import

Automatic address lookup is deferred as a nice-to-have (user decision, September 28). There is no licensed data connection. The optional seller-form importer accepts copied property record text for any new BC address; it is independent of the research catalog. It reads supported labels locally, requires review and confirmation of the exact property/unit, and replaces only selected bedrooms, baths, year-built and explicit lot-area fields. It never uses assessed value as asking price or adds floor components into a guessed total. The pasted text is not saved. Only a bounded, sanitized seller-provided reference is stored with the listing. This reference is not verified assessment evidence.

Four regression tests cover an address outside the catalog, tab/newline layouts, missing/duplicate/invalid fields, ambiguous lot sizes, multiple-record rejection, selected-field preservation and source-reference sanitization. All 43 automated tests pass.

Browser verification of the final importer used a fictional address outside the catalog. Apply was disabled until property/unit confirmation; unchecking bedrooms preserved the existing count while baths, built year and acre conversion applied. Saving and reopening retained the reference, imported fields and $5,000,000 asking price. The actual seller component ran in the isolated harness; no real account or listing was changed. The production build passed.

## Listing visibility, blank criteria and video uploads

The real local listing at 1920 Crescent Road was already published at $5,000,000. Two independent UI behaviours explained the report: the initial Nearby homes view excluded seller properties by design and ignored the feed budget, while For you inherited a seeded $1.8M budget. For you is now the opening view. New search criteria have no area, style, price or bedroom restriction. Existing states that still have the original four seeded criteria are migrated once without losing events; independently chosen criteria remain. Nearby homes explicitly links to the combined feed. Browser verification against the real local server confirmed the published listing in the guest For you feed and all four unset preferences. The listing itself was not edited.

New listing asking price displays $0 and retains currency formatting while editing. Browser verification used a separate fictional seller form.

Video uploads accept up to three MP4/MOV/WebM files, up to 100 MiB each. The actual seller component and actual API handlers were exercised in an isolated local QA server with simulated identity validation (outside the app). A CC0 MDN test MP4 uploaded, decoded as 960×540 / 5.055 seconds, played with native controls, survived draft save/reopen, and was accessible without a preview token after publication. No real account or real listing was changed for video testing. Production identity validation remains the real Firebase service.

Automated regressions cover open criteria including $5M homes, firm-budget filtering when explicitly chosen, legacy migration preserving likes/saves, upload type/size guards, private storage, ownership on attach, draft preview authorization, token expiry/tampering, range requests, save/reopen persistence, publication and withdrawal access. The production build passed. Browser-codec compatibility varies; no transcoding is provided. An actual signed-in user upload is still a manual acceptance check.

## Year-built limits

Year built now accepts an integer from the current calendar year minus 500 through the current year, inclusive (1526–2026 at this change). A blank field retains the existing unknown-year representation. The input exposes the range, shows guidance, and both draft and publish saves enforce it client-side and server-side. Assessment import excludes construction years outside the same range. Boundary tests cover both inclusive endpoints, blank/unknown, future/too-old years, fractions and invalid types. All 14 relevant marketplace/import tests and the production build passed.

## Seller photo ordering

The listing editor now provides Earlier/Later buttons and Make cover for attached photos. Position 1 is explicitly labelled Cover and feeds the existing listing thumbnail/gallery order. Controls work with pointer, touch or keyboard; edge moves are disabled and a live status announces changes. The existing Save draft / Update published listing actions persist the order.

Browser checks used the real SellerWorkspace and API/save path in the isolated QA environment: three photos reordered from [1,2,3] to [2,3,1], the new cover appeared in the seller thumbnail, and reopening the saved draft retained the order. Removing the cover promoted the next photo; a second save/reopen retained [3,1]. Visual review confirmed controls and cover labels in the existing dark theme. The production build and TypeScript passed. No real seller listing was modified.

## 25-photo listing limit

Seller uploads, attachment slots, photo-link controls and server validation now share a 25-photo limit. The API request limit was increased to accommodate 25 resized 500 KB images encoded as data URLs, plus listing fields. Per-file upload/preparation limits remain unchanged. Regression checks save and publish 25 maximum-size photo payloads in order through the real API handler, reject a 26th photo, enforce the request-size ceiling, and verify batch preparation stops at the available capacity. All six focused photo/API tests and the production build passed.

## Seller performance increment — September 28, 2026

61 automated tests and the final production build pass. New tests cover owner-only reports, signed guest cookies and server-derived identities/timestamps, self-activity exclusion, duplicate/cooldown/rate limits, toggle totals, Pacific calendar boundaries, ordered conversion, first inquiry/response calculations, showing creation dates, anonymous feedback threshold, photo identity after reorder, video watch coverage and period-safe completion rates, share attribution/self-visit exclusion, request validation and persistence across database restarts.

The isolated UI harness exercised the real Marketplace, SellerWorkspace, ListingPerformance and video components with fictional accounts and a separate database. Browser likes, saves, Explore opens, a successful tracked link copy, visible photo and a complete five-second video appeared in the seller report. Seeded fictional inquiries/showings/feedback populated the response, showing and feedback panels. Contact click opened the correct Inbox thread. Empty-state reporting, Today/all-history selection, New saves chart and exact daily table were checked. Phone layout was visibly verified at 390px (body width 390, dialog width 356) alongside desktop. The reporting opt-out persisted across reload; a subsequent local unlike did not create a server unlike event. No real listing was changed or seeded with test engagement.

Remaining acceptance: activity from two real signed-in accounts and separate real guest browsers after deployment; public link sharing still depends on hosting. Counts start with server tracking and have the limitations described in SELLER-ANALYTICS.md. High Interest badges do not use unverified browser counts.

## Compact map access — September 28, 2026

Replaced the expanded Nearby map with a Map view button beside sorting on every feed. The overlay uses the current filtered inventory; listings without coordinates are counted separately and remain accessible. Selecting a marker opens the property, with Back to map returning to the overlay. A resize observer keeps Leaflet aligned when the overlay dimensions change.

Production build and TypeScript pass. Browser verification on the Wi-Fi preview confirmed loaded OpenStreetMap tiles/attribution, 20 mapped research homes out of 21 total, marker-to-property navigation and return, budget filtering to three mapped homes, no expanded map on Nearby, and the empty-map explanation for the seller-only view whose one listing has no coordinates.

## Radius search and occasional outside matches — September 28, 2026

67 automated tests pass, including five radius tests for boundary inclusion, moved centres, maximum 1:4 outside/local mixing, no distant backfill, unknown/invalid coordinates, all-criteria outside qualification (including soft-budget protection), ordering, hidden homes, and persisted state validation/migration. Final TypeScript and production build pass.

Browser checks on the live Wi-Fi preview: 500 m circle drew 11 local pins and previewed two outside matches; applying produced 13 cards with explicit Outside your radius labels at the fifth and tenth positions. Inside-only mode produced 11 cards. Radius and toggle persisted across reload. Marker → property → Back to map retained the uncommitted 500 m draft. Tapping empty map space moved the centre and produced a valid empty-area preview. Removing the radius restored 21 homes. Loaded map tiles, circle, scale and attribution were visually checked. Fixed 390px iframe verified the feed/control layout; iframe interaction automation was unavailable, so touch interactions on a physical phone remain an acceptance check. Temporary layout server and test tabs were closed; test radius was cleared.


## September 28 follow-up: profile names, showing requests, seller map pins

- Fixed request-origin checks across marketplace writes, analytics, video uploads and video previews. The browser's Host is compared with Origin instead of Next's internal bind address. Cross-site requests and untrusted forwarded-host headers remain rejected. A trusted HTTPS proxy can use the explicit LISTED_PUBLIC_ORIGIN setting.
- Reproduced the original localhost error against the live all-interface server. After restart, the same unauthenticated request reaches authentication (401, “Please sign in to continue”) instead of the incorrect origin rejection. An isolated API regression publishes a fixture, starts a buyer conversation and successfully requests a showing with a localhost Origin and internal 0.0.0.0 URL; foreign origins are rejected.
- Microsoft sign-in and the new Account “Refresh name from Microsoft” action copy the freshly returned Microsoft display name into the existing Firebase account. Reauthentication keeps the same account. Account labels refresh immediately and authenticated marketplace reads/writes synchronize existing listing/conversation names without changing ownership or listing versions. Provider changes are not pushed live into Listed; a fresh Microsoft exchange is required. Real Microsoft name-change acceptance still requires the user's account.
- Seller coordinates are now validated, persisted and used in map/radius results. Exact addresses already documented in the research catalog can recover missing coordinates at read time. 1920 Crescent Road uses the existing documented origin; this is not a guessed neighbourhood location. No production listing content was rewritten to repair the map.
- Added seller pin placement, dragging, map-centre placement and coordinate entry. Address/neighbourhood changes clear the previous pin; unavailable tiles leave coordinate entry usable. New addresses are not sent to an external geocoder. Listings without a known location or seller-placed pin still require a pin to appear on the map, with a post-publish reminder.
- Browser QA in the isolated seller harness confirmed placing a pin, saving a draft, reopening the same coordinates, and clearing the pin on address change. Live guest browser showed 21 map pins, including 1920 Crescent Road; selecting that marker opened the correct listing.
- 72 automated tests passed. Production build and TypeScript checks passed. Real-account Microsoft refresh and a two-real-account showing confirmation remain manual acceptance checks.


## Separate showing inputs, provider profile import, and in-app notifications

- 79 automated tests passed; production build and TypeScript checks passed.
- In the isolated UI harness, entered September 30, 2026 and 14:30 in separate fields. Submitted request displayed September 30, 2026, 2:30 p.m. Pacific. Native input handlers cover picker/input changes as well as change events.
- Cancelled that fictional request as the seller. The buyer's feed displayed a cancellation banner and notification bell with one unread update. Its panel included the property, showing date/time and cancellation time. Selecting it opened the right conversation and cleared the unread indicator.
- Notification regression tests cover recipient-only events, request/confirm/decline/cancel states, own-action exclusion, access isolation and late read acknowledgements that must not clear newer updates. Read acknowledgements are scoped to the timestamp actually observed, and hidden inboxes do not automatically mark later events read.
- Profile tests cover Microsoft Graph destination/credential handling, no-cache/direct profile lookup, optional photos, explicit failures, per-account photo-cache isolation, and omitted Apple/name fields. Real provider reauthentication and profile updates remain user acceptance checks; no personal provider account was changed by automated QA.


## Profile visibility and showing picker regression follow-up

- Replaced native date/time inputs with an app calendar and explicit Hour/Minutes/AM-PM dropdowns. Browser QA measured 350px calendar width and 17.5px text, verified missing-field feedback on an enabled request button, and submitted September 30, 2026 at 2:45 PM. The isolated conversation displayed 2:45 p.m. Pacific and requested status.
- Profile is explicitly labelled in the header, with its actual returned provider fields and sync result available in the account card. The active Firebase user is the update target; a read-back mismatch raises an error instead of success. Sign-in failures are retained across account-panel remounts. These changes do not establish that Microsoft is returning the user's new name: real-account verification remains outstanding.
- The main Codex preview tab was observed displaying an older version of the app. Refresh it after replacing the running build; do not equate a stale open page with current source behavior.
- Showing-time tests cover midnight/noon/afternoon, missing/invalid fields, a historic standard-time date and the 2026 spring gap, using the runtime's America/Vancouver time-zone data. Private profile diagnostic isolation is covered.


## 202 Denison Road prepared listing · September 30, 2026

Added a prepared address import in the seller workspace, accessible through #seller. This is an editable starting point, not an active catalog listing or an account-owned draft until saved by the signed-in seller. Current BC Assessment directly checked: 5 bedrooms, 3 baths, built 1974; 2026 total $2,638,000; PID 002-995-395; sale April 8, 2025 for $3,000,000. Reference: https://www.bcassessment.ca/Property/Info/QTAwMDBIUUE4WQ== . Former MLS 985532 summary at https://garryoakgroup.com/recently-sold/?_pg=1 supplies 3,788 sq ft and a short paraphrased description; individual archived listing page is removed. Differences from assessment floor-area components are shown for review. Lot size, annual taxes and photos were not inferred. Asking price remains $0. Exact BC Address Geocoder civic match: 48.4117405, -123.3227556, score 100 (saved in work/real-properties/geo-202-denison.json).

Isolated browser test opened the prepared form and saved it successfully as a private QA draft, with no publication and no authorization checkbox selected. Automated test verifies owner-only visibility, preserved assessment reference/map pin, zero price and inability to publish incomplete data. User-facing browser remained signed out during preparation; actual user draft is not claimed saved.


## Account-free 202 Denison Road import

At the user’s explicit request, the prepared property is now also in the shared public catalog as import-202-denison-road, source imported, with no seller account. Guest browser verification: 22 homes in feed, imported detail accessible without authentication, exact civic map marker present. Price displays as Price not set, the historical sale and assessment are separately labelled, no fabricated photos/count/arrows, and contact/showing actions are unavailable. Unknown prices cannot satisfy a firm budget or outside-radius budget match. Existing seller authentication/ownership rules are unchanged. Full suite: 84 passed; production build passed. The original 20-home research snapshot tests continue validating its source-specific records separately from the added import.


## Seller agent: neighbourhood description · September 30, 2026

Added a source-backed neighbourhood draft in Create/Manage Listing. First research pack covers Gonzales, checked against CRD Gonzales Hill Regional Park and Destination Greater Victoria Gonzales Beach. Exact known Oak Bay addresses 1920 Crescent Road and 202 Denison Road suggest Gonzales; other addresses require the seller to choose applicable coverage explicitly. This is versioned, curated research, not live AI search. No paid provider or runtime web lookup is configured.

Sellers review/edit the text and confirm the area, then add it to the form and save/publish. The separate neighbourhood field preserves the home's description. Published property details display it with source links, a checked date, and the distinction between neighbourhood amenities and home features. Changing address/area clears the old summary; server validation rejects mismatched addresses, unreviewed/invalid text, and unknown research IDs. Source URLs/dates are taken from the research registry, never client claims. Existing user listings are not automatically changed.

Validation: all 88 tests passed; TypeScript and production build passed. Isolated browser QA verified suggested area, review checkbox gating, source links, apply, private draft save, reopen persistence, editable text, and unknown-address reset. Desktop screenshot checked for readable wrapping. Main local preview restarted. General automatic address resolution, broader neighbourhood coverage and live source retrieval remain future seller-agent work.


## Guided seller workspace · October 13, 2026

Added private per-listing seller plans, role-specific preparation, field completeness, question prompts, description templates, neighbourhood editor handoff and explicit unconnected verification statuses. Reuses the listing editor, auth, marketplace API and SQLite storage. No real listings were modified for tests.

Automated validation: 93 tests passed, including owner-only plans for published listings, malformed input and forged verification fields, conflict detection, address reset, preservation through listing edits, SQLite restart persistence, explicit unknown coverage and description exclusion of private notes. Production build and TypeScript checks passed. Isolated browser QA confirmed owner-plan save, role/timeline guidance, description generation excluding private notes, unsaved-draft close protection, save-before-editor handoff, successful listing draft save, and plan persistence after reopen/reload. The agent opens at the top of its workspace; the desktop layout was inspected and captured in seller-agent-preview.png. Tests used fictional accounts and an isolated QA database. Stripe/LTSA and live AI integrations remain unconnected.


## Home-server migration · October 21, 2026

See [current deployment](../deploy/CURRENT-DEPLOYMENT.md). Built Linux container, migrated private SQLite/media with matching transfer checksum, verified public HTTPS/API/video ranges and storage persistence after container restart. Browser verified 22 homes and map; no console errors. Firebase domain authorization and real-account hosted sign-in remain blocked by the account MFA prerequisite. Existing game files remain unchanged and accessible separately.
