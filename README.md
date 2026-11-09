# Latest increment: seller listings and contact

Seller listing management, private conversations and showing requests are implemented in the local app. Use **Sell**, **Sellers**, and **Inbox**. New activity persists in a private SQLite database on this computer; browsing preferences and saves remain per-account browser data. Requires Node 24+. See [seller/contact guide](docs/SELLER-AND-CONTACT.md) for usage, storage, testing and remaining deployment work.

# Listed Marketplace MVP

A working first vertical slice of Listed: a social property feed with explainable personalization, deliberate discovery, and transparent engagement. Built with Next.js, React, and TypeScript from the existing [Listed prototype](https://github.com/shawnkburton/listed).

## Run

Requires Node 24+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 (the existing authorized Firebase development domain). The development command uses polling to avoid file-watcher limits on this Mac. For an optimized preview:

```sh
pnpm build
pnpm start
```

Validation:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Dependencies are pinned and `pnpm-lock.yaml` is included. The first build here used the bundled Codex Node runtime because this Mac does not have a system Node installation.

## Try it

1. Open Nearby homes to see the 20 closest houses found in the September 28 survey around 1920 Crescent Road. Select a map marker or property photo.
2. Review five listing photos, taxes, room/space list, BC Assessment comparison, and the assessment’s limited sale history. Follow links to the original records.
3. Switch to For you for explicit preferences and adjacent discovery. Nearby shows the surveyed inventory independently of the For you budget.
4. Like, Save, Share, Hide/Undo, and restore homes. Saved/viewed collections retain access even when criteria change.
5. Choose Sign in for Google or Microsoft. Apple and Facebook are integrated behind activation flags but remain disabled until their provider registrations are configured.
6. Account preferences and activity stay on this device, isolated from guest browsing and other accounts. No cross-device sync is claimed.

## Built

- Responsive photo-led feed, five real photos per home, sourced property-detail overlays and deep links.
- Interactive map, straight-line distance ordering, 20 matched listing/assessment records, property taxes and limited sale history.
- Reused Firebase Google/Microsoft authentication, Apple/Facebook adapters awaiting activation, separate local account storage.
- Like/unlike, save/unsave, share-link copying, hide with reasons, Undo and restoration.
- Saved, viewed and hidden collections; preference editing; explicit feature filtering and price sorting.
- Local engagement log, persisted state, activity export/clear, visible storage-failure warning.
- Explainable weighted ranking with capped behavioural influence, decay and deduplication, hard budget protection and deliberate adjacent discovery.
- High Interest calculator using unique verified buyers, a seven-day window, minimum evidence and comparable-property baselines; explanatory interface and conditional badge support. No marketplace data is connected, so no badge is claimed.
- Seller draft, publish, edit and withdrawal workflows with photo uploads.
- Private conversations, unread indicators and Pacific-time showing requests/confirmation/cancellation.
- Server-side Firebase identity checks, participant/owner authorization and persistent SQLite storage.
- Domain contracts for later workflows and a draft, unapplied PostgreSQL/Supabase schema.

## Reused from Listed

Exact logo SVG and dark/lime design tokens; original language and visual patterns including feature circles, cards, sidebars, mobile navigation and in-context details. The original single-file app's local saved/open affinity concept has been extended and rewritten as typed modules. Unchanged upstream HTML and authentication files remain at the repository root and are also retained under `legacy/` for reference. The Next.js app does not load them. Git history and the original remote are retained, with local work on `codex/marketplace-first-slice`. Source commit: `e618a0509299e709afdb70ef8488f95a5360dd21`.

## Current limits and next steps

This is a **local buyer/seller MVP**, not a production marketplace. Real data is a September 28, 2026 research snapshot, not a licensed live feed or an exhaustive MLS-radius query. Assessments use July 1, 2025 values; tax years are not stated by listings. A combined two-lot listing is explicitly excluded from percentage comparison with its single matched assessment. Read [data sources and limitations](docs/DATA-SOURCES.md).

Microsoft sign-in was confirmed working by the user on September 28, 2026. Google still requires real-account sign-in testing. Apple and Facebook need provider registration/activation; see [authentication setup](AUTHENTICATION.md). Instagram’s professional-account API is not offered as general buyer sign-in. No paid plan was enabled. Browsing state stays local and existing legacy favourites are not automatically imported.

Next: two-real-account acceptance testing, provider activation, cloud deployment and durable hosting storage, licensed data ingestion/refresh, ownership verification, verified interest aggregation, offers and transactions. The draft Supabase-auth SQL remains unapplied and must be adapted for the reused Firebase identity.

Deferred until hosting setup: seller SMS phone verification before publishing. Track requirements and activation checks in the [hosting and launch checklist](docs/LAUNCH-CHECKLIST.md).

See [architecture and recommendation rules](docs/ARCHITECTURE.md), [verification report](docs/VERIFICATION.md), [photography sources](docs/PHOTOGRAPHY.md), and the [original project notes](docs/ORIGINAL-README.md).

## Seller performance

Use **Sell → Performance** for each listing. Includes views, likes/saves, tracked shares, inquiries/showings, media engagement, daily trends, conversion, response time, anonymous feedback and completeness. New engagement starts with this release; old browser activity is not uploaded. See [metric definitions and privacy](docs/SELLER-ANALYTICS.md).

## Phone testing on the same Wi-Fi

After building, run `pnpm start:lan` to listen on the local network. Open `http://<Mac LAN IP>:3000` from a phone on the same Wi-Fi. Keep the Mac awake and the server running. The LAN IP can change. Use `pnpm start` for loopback-only access again. The LAN preview uses the same database as localhost; browser preferences are separate by site address. Authentication requires an authorized Firebase domain, and browser features such as clipboard access may require HTTPS.

## Map radius

Choose **Map & radius**, move the star or tap the map, choose a radius, then **Show these homes**. For you becomes area-led, with up to one clearly labelled outside match after four local homes. Outside suggestions must meet the other stated criteria and can be disabled. Cancel leaves the current search unchanged; Clear radius restores the wider feed. Listings without map coordinates are excluded from radius results and remain accessible in seller listings/collections.


## Seller map locations and profile refresh

Create/Manage listing now includes **Map location**: check an existing address pin or place one by clicking the map, dragging the pin, using the map centre, or entering coordinates. Save the listing to retain the pin. Changing the address or neighbourhood clears it. Known research addresses, including 1920 Crescent Road, recover missing locations from the existing project data; arbitrary addresses require a seller-placed pin. No address is submitted to an external geocoder.

For Microsoft name changes, use the account menu's **Refresh profile from Microsoft** or sign in with Microsoft again. Showing requests and other writes now work through the browser's localhost/LAN address when the server listens on all interfaces. If deployment later uses a trusted HTTPS reverse proxy, configure the exact public origin using LISTED_PUBLIC_ORIGIN.


## Account profiles and notifications

Connected sign-in providers populate the account's name, email and available photo. Microsoft uses a fresh delegated Microsoft Graph `/me` lookup with `User.Read`, requesting only `displayName`, plus an optional 96px profile photo. Google and activated Apple/Facebook providers use the profile returned by their sign-in exchange. Apple may omit name on subsequent sign-ins and does not supply a profile photo. Existing names are preserved when omitted. Email remains the authenticated Firebase account email; it is never overwritten with an unverified profile field. Provider access tokens are not persisted. Photos may be cached per account in this browser; names are never read from that photo cache. The account panel is private and provides a refresh button per enabled, linked provider. Microsoft refresh reports the actual returned name and does not claim success when lookup fails. The new direct lookup still requires a real-account acceptance check.

Signed-in users have a notification bell and unread count, plus a feed banner for the latest unread update. The notification panel shows messages and showing requests, confirmations, declines and cancellations. Opening a conversation marks its visible updates read; own showing actions do not produce self-alerts. Read state is stored on the server with the conversation. Latest showing states are shown, not a complete historical event log. Visible sessions refresh every 15 seconds and when returning to the page. Email, SMS and operating-system push notifications are not enabled.

Showing requests use separate **Preferred date** and **Preferred time (Pacific)** fields, both required. Times are interpreted in Victoria's Pacific time zone, with the existing server validation retained.


## Profile entry and showing picker follow-up

Signed-in users now have an explicit **Profile** button (with their first name alongside it on desktop). The profile card shows the Listed name, sign-in email, linked providers, the latest returned provider name and available first/last names and provider email, plus the time and result of the last profile check. Refresh reports are private to the account/browser session and survive reopening the profile. Sync writes to the active Firebase user and verifies the saved name after reloading; it does not declare success if the provider name was not saved. Microsoft-account acceptance remains pending until the user checks the fresh profile response.

The showing request now uses a custom 350px calendar, 40px date buttons and 17.5px calendar type (25% above 280px/32px/14px base sizing, constrained to the phone width). Hour, Minutes (00–59), and AM/PM are separate dropdowns. The request button stays enabled except while sending, and explains incomplete or invalid selections. Existing server rules still require a time more than 15 minutes ahead and within 180 days.


## Guided seller agent

Open **Sell → Seller agent** on one of your listings. Saving a new draft also opens the agent. Set your role and timeline, keep private planning notes, review missing listing fields, and create a factual starting description for review in the existing editor. The current implementation uses prepared guidance and deterministic templates, not a connected LLM or live research service.

Plans are stored in a separate private SQLite table on the local server, returned only to its authenticated owner, and excluded from public/buyer responses. Saving a plan does not publish or alter the property. Updates use listing versions to detect conflicts; changing the property's address or area clears its old plan. Private notes never enter generated descriptions. Unsaved plan/description changes prompt before closing the agent.

Identity, title and authority checks explicitly remain incomplete. Stripe Identity, LTSA, professional review, live comparable sales and national neighbourhood research are not integrated. BC guidance sources are selected through a jurisdiction-specific registry; unsupported regions do not fall back to BC. The existing editor still supports Greater Victoria only.


## Linux hosting

Deployment files for `https://lic.nut.run` are prepared in [deploy/README.md](deploy/README.md), with a Linux Docker build, persistent storage, HTTPS proxy configuration and a database/media backup helper. Remote access and DNS details are still required; these files alone do not publish the site.
