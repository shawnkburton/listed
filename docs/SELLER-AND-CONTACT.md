# Seller listings, conversations and showing requests

Implemented September 28, 2026 for the local MVP. Open **Sell** / **Selling** to create and manage listings, **Seller-listed homes** / **Sellers** to browse them, and **Inbox** / **Messages** for conversations. Existing Microsoft and Google identities are reused.

## Seller workflow

- Sign in, create a draft, and add address, neighbourhood, style, property type, price, beds, baths, floor area, year, lot size and description.
- Add up to 25 JPG/PNG/WebP/HEIC/HEIF images up to 20 MB each, or HTTPS photo links. The browser decodes and resizes uploads to JPEGs under the 500 KB storage limit, at up to 2,000 pixels on the longest side (smaller when necessary). HEIC uses native decoding when available and a lazy-loaded local heic-to converter otherwise. Embedded EXIF/location metadata is removed by re-encoding. No external conversion service receives files. Uploaded photos are stored with the listing when saved; the first photo is the cover. Progress and per-file errors appear beside the uploader; successful files survive another file failing. Save/publish is disabled during preparation.
- Drafts are visible only to their seller. Publication requires a positive price and floor area, a description of at least 30 characters, a photo and confirmation of authority to list/use the photos.
- Published listings appear in Seller-listed homes and participate in the personalized feed. They do not enter the fixed Crescent Road research map because their locations have not been geocoded.
- Edit, unpublish to draft, withdraw, or republish. Version checks prevent silent overwrites from another editor. Withdrawal removes public visibility but preserves existing private conversations and requests.
- These are seller-provided facts, not ownership-verified listings. Publication here does not submit anything to REALTOR.ca or the original GitHub Pages site.

## Contact and showings

A buyer opens a seller-created listing and chooses **Message seller / request showing**. One private conversation is maintained per buyer/listing pair. Both participants can reply, with unread indicators and refresh every 30 seconds while the page is visible. This is an in-app inbox; no email, SMS or push notifications are sent.

The buyer requests a date/time in Pacific time. The server requires at least 15 minutes' notice, no more than 180 days ahead, and only one requested/confirmed showing in that conversation. The seller can confirm or decline; either participant can cancel. Confirmations reserve a 30-minute interval, with overlapping reservations for the same seller rejected. Withdrawn listings cannot accept new requests or confirmations. Existing confirmations are not silently cancelled by withdrawal; the seller should cancel them and explain in the conversation. After a showing, cancel the old request to propose another; completion tracking and availability calendars remain future enhancements.

The 20 researched REALTOR.ca properties have **Contact through REALTOR.ca** links. Their owners have not joined this application, and no fake seller inboxes are created for them. Showing requests currently do not contribute to High Interest because the full verified engagement aggregation is not connected.

## Storage and access

The Next.js route `/api/marketplace` uses the existing Firebase ID token. The server checks the expected project claims and asks Firebase's [account-information endpoint](https://firebase.google.com/docs/reference/rest/auth#section-get-account-info) to validate it and resolve the actor. Client-supplied owner/sender IDs are ignored. No service-account secret or new paid service is required. Firebase must be reachable for private reads and writes.

Ownership and participant checks run in `lib/marketplace-domain.ts`, inside SQLite transactions in `lib/server/market-store.ts`. The Node 24 built-in SQLite database defaults to `.data/marketplace.sqlite`, outside public assets and ignored by Git. WAL/busy timeout and immediate transactions prevent lost writes. The database is owner-readable/writable only. Set server-only `LISTED_DATABASE_PATH` to use a different private persistent path. Back up the database with SQLite's backup facilities or stop the app before copying the database and its WAL files together.

The current local preview uses one JSON aggregate in SQLite. This is a bounded prototype adapter, not the database design for a large public marketplace. Deployment needs durable private storage, HTTPS, backups, appropriate monitoring, moderation/reporting, broader abuse controls, and a normalized/shared database for multiple server hosts. Do not deploy this database to an ephemeral/serverless filesystem. The server currently listens only on loopback, so other people's devices cannot reach it.

Public reads return published listings only. Private reads return those listings, the caller's own drafts/withdrawn listings, and only conversations they participate in. Writes validate data, enforce body/photo limits, reject cross-origin browser mutations, deduplicate message/request retries and reject rapid repeated messages. Messages render as text. Limits: 20 listings per seller, 100 buyer conversations, 500 messages and 100 showing records per conversation. No testing identity or authentication bypass is present in the application.

Saved homes and preference/engagement history still use the separate per-account browser storage. The earlier unapplied Supabase draft is not used.

## Validation and remaining acceptance

Automated tests cover private drafts, edit ownership/conflicts, publication validation, sender spoofing, participant isolation, retry deduplication, showing state transitions and conflict detection, withdrawal behavior, restart persistence, rollback, and Firebase identity failures. UI testing uses the actual seller/inbox components with separate fictional identities in a temporary harness outside this application; no real person receives test messages.

Microsoft sign-in was user-confirmed before this increment. The current browser is a guest, so the new workflows still need final acceptance with two real signed-in accounts against the running API. Google/Apple/Facebook provider activation/verification status is unchanged. Hosting and public deployment remain separate work.

## Listing videos

Listings may attach up to three uploaded MP4, MOV or WebM video IDs. Uploads use a separate authenticated streaming endpoint (100 MiB/file), with progress and per-file errors. They are saved outside `public/` under `.data/videos` by default, or `LISTED_VIDEO_DIRECTORY`. The default video folder follows a custom database directory. Each seller has a 1 GiB preview quota and up to 50 stored uploads; reserving capacity conservatively requires room for a full-size file. Unattached/removed files remain private and count toward this limit. Automatic orphan cleanup, transcoding and cloud object storage remain future work.

The listing command endpoint verifies ownership of all attached video IDs. Public playback is allowed only while a published listing references the video. Draft playback uses an owner-authenticated request for a one-hour signed preview URL. Serving supports single byte ranges for seeking and uses private/no-store responses. No video bytes or private signing keys enter the marketplace snapshot. As with any published media, a viewer may retain their own copy after withdrawal. Videos require a browser-compatible codec; MP4/H.264/AAC has the broadest expected compatibility. A photo is still required as the listing cover.

The default opening feed is For you and has no prefilled search restrictions. Nearby homes is the separate fixed research map; seller homes are in For you and Seller-listed homes.
