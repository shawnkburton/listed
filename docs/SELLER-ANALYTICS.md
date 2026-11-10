# Seller listing performance

Open **Sell → Performance** on a listing. All reports require the listing owner's verified Firebase identity. Reports work for published, draft and withdrawn listings, preserving earlier activity. They refresh every 30 seconds while the page is visible and have a manual refresh button.

## Metrics and reporting periods

- Today, 7 days (today plus six preceding calendar days), 30 days, or all recorded history since publication. Calendar boundaries use America/Vancouver, including daylight saving time. The report explicitly states when server tracking began. Historical local browser events are never backfilled; existing conversations and showing records remain usable.
- Feed appearances: a card is at least 55% visible for 800 ms in a foreground page and is not obscured by an open dialog. Once per listing/visitor/session. A quick click before the visibility threshold can produce a property open without an appearance.
- Property views: opening Explore/View/the address or loading a property deep link. Repeated opens within 30 seconds in one visitor session count once. Total opens and estimated distinct visitors are separate.
- Current likes/saves: latest on/off state for each measured visitor since tracking began. Additions/removals count distinct visitors performing each action in the selected period; net change compares the beginning and ending state. Repeated toggles do not inflate the current total. Likes/saves remain locally managed and do not sync personal state across devices. Opting out, clearing local history or signing in/out can leave server totals different from a particular browser's state.
- Link copies: successful copy actions on tracked links, once per visitor/session/listing. Not proof of sending. Shared-link visits require a valid server-issued token and exclude the creator's account and original browser. Reopening the same link in a session counts once. Old/plain/untracked links still open homes but cannot be attributed.
- Inquiries: first actual buyer message, not merely opening a conversation. Also show buyer message count. Seller response time is the median elapsed time from each inquiry to its first seller message; includes unanswered count and replies within 24 hours. These are elapsed hours, not business hours.
- Showings: requests created in the selected period, grouped by their current requested/confirmed/declined/cancelled status. Older requests missing createdAt fall back to updatedAt, with an explicit report note. New requests now retain createdAt.
- Funnel: same measured visitor must progress through appearance → open → save → inquiry → showing, in order, within the period. Buyers skipping a step still contribute to individual totals. Guest-to-account transitions are not merged.
- Photos: a successfully loaded image is at least 55% visible for 800 ms in the foreground, once per visitor/session/photo. Server derives a photo hash from the current listing version and image index; counts follow an image through reorder. Removed images retain separate historical counts.
- Videos: plays count once per visitor/session/video. Completion requires at least 90% distinct playback coverage while the page is foreground; seeking, repeated sections and background time add no coverage. Completion rates use plays started in the selected period. Private editor previews do not emit events. Browser reports can be spoofed and do not prove intent.
- Daily activity chart and exact-count table: views, new saves and inquiries, with additional daily unique viewers/likes. All-history chart is bounded to 366 days; totals remain all-history and a note explains truncation.
- Hide feedback: aggregate reasons only after at least five measured visitors currently hiding the home provided feedback during the period. Restored homes no longer contribute. Smaller cohorts expose neither reasons nor a count.
- Completeness: address, price, floor area, description, cover, five photos, year built and lot size. Suggestions, not additional publication requirements.

## Identity and privacy

Sellers receive aggregate statistics only. Visitor keys, raw events, emails and identities behind likes/saves/views are not returned. Buyers who actually message or request a showing appear with their existing conversation name and a link to that conversation. No contact list is inferred from passive activity.

Verified signed-in accounts use a server-secret HMAC visitor key; guests use a signed random HttpOnly SameSite=Lax cookie, Secure under HTTPS. The cookie name is namespaced to the database secret. Cookies, shared profiles, devices, sign-in transitions, opt-outs and blockers affect estimated visitor counts. Account and guest histories are not merged. Signed-in seller actions are excluded, but a seller browsing anonymously cannot reliably be recognized.

**Your activity → Share engagement totals with sellers** stops future reporting for that local account/guest profile. It does not erase earlier server statistics or messages. Local activity clearing/export controls describe their local scope. No historical local data is uploaded, and research REALTOR.ca properties are not sent to seller analytics. There are no external analytics services.

## Storage and API

The existing private SQLite database adds analytics_meta, listing_events and listing_share_links. Its secret and tracking start persist across restarts. Listing commands remain in the existing transaction store; the aggregate report joins conversation/showing history at read time. firstPublishedAt is recorded on first publication going forward; unknown legacy publication times remain unknown.

POST /api/analytics validates origin, a 4 KB JSON limit, published listing, event kind, IDs, photo version/index, video membership and share tokens. Optional bearer tokens must pass existing Firebase validation; client-supplied identities/timestamps are ignored. Server event time, retry deduplication, per-session/cooldown rules, known crawler user-agent filtering and 180 accepted events/minute/visitor limit reduce accidental inflation. Share-link issuance is also limited. These controls are not a production anti-fraud system; guests can reset browser identities.

GET /api/analytics/[id]?range=today|7|30|all requires verified ownership and returns a no-store aggregate DTO. No public analytics endpoint or High Interest badge is enabled by these browser-reported counts.

This remains a single-server local MVP. Events/share tokens currently persist with the database; production deployment needs an explicit retention policy, scalable aggregation, backups, abuse controls and operational consent review. There is no retry/backfill queue after a network failure, so interrupted reporting can undercount. Public share links require deployment; localhost links only work on this computer.
