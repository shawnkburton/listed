# Current home-server deployment

Deployed October 21, 2026 (Pacific). Public URL: https://lic.nut.run.

- Ubuntu 24.04 x86_64, existing Docker 29.1.3; no host services installed.
- Existing gateway NGINX/TLS still forwards to VM port 8080. DNS/certificates unchanged.
- App: `listed-app`, image `listed-marketplace:20261017`, Node 24.19.0. Network `listed-net`, loopback diagnostic port 18080.
- Router: `listed-router`, pinned nginx image digest `sha256:c59d1f8b1e0e42da75be973424cd72e23f7f8adfb54e982f4d1cd0216a5a5576`, VM port 8080. Config `/docker/listed/nginx.conf`; source `deploy/home-server.nginx.conf`. Relative redirects keep the external HTTPS origin and hide the internal port.
- Runtime data: `/docker/listed/data/marketplace.sqlite` and `/docker/listed/data/videos`, owner UID 1000, private directory/file modes. Not under the public web root.
- Source release: `/docker/listed/releases/20261017-seller-agent`. Public source upload excluded local builds, credentials, environment files and data.
- Backups: `/docker/listed/backups/pre-cutover-20261021.tar.gz` and `/docker/listed/backups/arcade-before-listed-20261021.tar.gz`. Mac original and a local cutover backup retained. Automated/off-server backup scheduling remains to be configured.
- The stopped `html-web` container is retained for rollback. Its original `/docker/HTML/PUBLIC` files are untouched. The existing static homepage (which other work continues to update) remains at `/previous-site/`; `/boom/` and `/neon-drift.html` redirect there.
- Changes recorded in `/docker/CHANGELOG.md`. No accounts or access grants changed.

## Validation

Linux Docker build passed. Local full suite 93 passed, then the new backup test plus seller-agent tests passed (6 targeted tests; 94 total tests now exist). Backup test captures committed SQLite WAL data and refuses overwrite. Transferred archive checksum matches. Before cutover, local listing/conversation data and videos were unchanged from the snapshot.

Public HTTPS page and API respond; browser shows 22 homes and the radius map. One saved seller listing with 13 photos and one video, plus one private conversation, migrated with the database. Video range playback passed. Public responses exclude private conversations and seller plans. Unauthenticated and foreign-origin writes are blocked; private file paths return 404. Database integrity passed. Listing/photo/video references survived a container restart. Public browser console had no errors.

## Outstanding

Firebase's authorized domains did not include lic.nut.run. The Google account's MFA requirement blocked Firebase-console administration. The user must complete Google two-step verification, then add lic.nut.run in Firebase Authentication settings for project dwell-d6c55 (or let this task finish that step). Real-account login and authenticated write acceptance on this domain are still pending. No provider configuration or secrets were changed.

Seller phone verification remains on the hosting checklist; it is not enforced yet. Stripe Identity, LTSA, live AI research and national source coverage remain unconnected. Browser-local likes, saves and preferences do not transfer between localhost and the hosted domain. Mac/server databases are independent after migration; use the hosted site for future changes.

## Rollback

For the old static site: `sudo docker stop listed-router` then `sudo docker start html-web`. This does not delete Listed data. Preserve any hosted writes before restoring older data. For Listed maintenance, restart `listed-app`; its data is a persistent bind mount. Do not remove data or volumes when replacing a container. SSH credentials remain in the user's supplied VM document, not in this repository or web root.
