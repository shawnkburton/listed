# lic.nut.run deployment

Deployed October 21, 2026 (Pacific) to the home Ubuntu VM at https://lic.nut.run. See CURRENT-DEPLOYMENT.md for the actual Docker/NGINX setup. The Compose/Caddy files below remain an alternative for a new server; they were not applied to this VM.

## Access and inspection

Obtain the Linux SSH hostname/user (or alias), SSH key access, and permission to administer the server. Inspect the OS/architecture, disk, memory, existing containers, ports 80/443, current reverse proxy and any existing site at lic.nut.run before installing or replacing anything. Use an existing proxy if one is present; do not start a competing Caddy instance. Verify DNS control and the intended public IP. Docker and Compose are one deployment option, not a confirmed server prerequisite.

## Release and data

- Build on Linux using the Dockerfile. Do not ship the Mac's node_modules or native binaries. Node 24 and pnpm 11.19.0 match the current local runtime/package manager.
- Copy the application source and lockfile over SSH to a dedicated directory such as /srv/listed. Exclude .git, node_modules, .next, .env files, .data, backups and test harnesses from the source transfer. Private data travels separately.
- Keep the Mac's application and data until acceptance. Pause local writes for the final backup, then run `node scripts/backup-data.mjs /absolute/new-private-backup-directory`. SQLite VACUUM INTO captures committed WAL content; do not just copy the live database file. Transfer the database and videos directory over SSH into the deployment's .data directory. Photos, messages, showings, analytics and seller plans are in SQLite; videos and their metadata are separate files.
- Make the server's dedicated .data directory writable by container UID/GID 1000. Restrict it to that owner (directory 0700, files 0600); never put it under public or serve it through the proxy. Do not recursively change unrelated server directories.
- After inspection, run `docker compose config`, `docker compose build` and `docker compose up -d` from the deployment directory. This binds only the proxy to host ports; the app is internal to the container network. The data bind mount survives container replacement. Keep one app replica for the SQLite deployment.
- Point the DNS A record for lic.nut.run at the intended server. Add AAAA only if working IPv6 reaches the same deployment. Allow inbound 80/443 and retain SSH access. Caddy obtains and renews TLS certificates once DNS and ports are ready.

## Sign-in and launch checks

Add lic.nut.run to Firebase Authentication's authorized domains in project dwell-d6c55. The existing Firebase auth domain and Microsoft callback stay at dwell-d6c55.firebaseapp.com; no provider secrets belong on this server. Confirm Microsoft and Google login on the new domain. Apple/Facebook remain disabled until separately configured. Users must sign in again. Browser-local likes, saves and preferences do not automatically move between origins.

Before declaring migration complete, verify HTTPS, public/private listing visibility, own-listing editing, plan privacy, image/video playback including seeking, upload/save, messaging and showing requests, notifications, map pins and restart persistence. Confirm public API responses exclude seller plans; private plans use their own SQLite table so older preview readers cannot expose them through the legacy listing document. Use test accounts and clearly marked test records for write checks. Keep all real listing content unchanged.

The seller phone-verification requirement was explicitly deferred to hosting by the user. Resolve Firebase phone/SMS configuration, cost approval and real-phone tests before describing this as a production launch. See docs/LAUNCH-CHECKLIST.md. Stripe Identity, LTSA, live AI research and supported national research remain unconnected; migration does not activate them.

## Backups and rollback

Keep an encrypted/off-server backup of SQLite and media with restricted access. Schedule backups only after selecting a destination and retention policy. Do not delete or overwrite the Mac data. Retain the previous server release and proxy config if replacing an existing deployment. After accepting writes on Linux, rollback requires preserving/reconciling those writes first; never switch back to a stale database. Confirm ownership of DNS and retain the prior DNS values before changing them.
