# GitHub and T470 workflow

User preference recorded November 9, 2026: maintain Listed in [GitHub](https://github.com/shawnkburton/listed) and host it on the user's T470 server at https://lic.nut.run.

## Current state

The prepared marketplace source is in [draft PR #1](https://github.com/shawnkburton/listed/pull/1), branch `codex/lic-marketplace-source-20261109`; it has not been merged into `main`. The original GitHub homepage files were preserved. This is a saved source snapshot, not a verified copy of every current live-server file.

The existing deployment is documented in [CURRENT-DEPLOYMENT.md](CURRENT-DEPLOYMENT.md). The user confirmed that the T470 is a different machine; SSH connection details are pending. Migration must preserve the current server's live data. Recording this workflow does not move or alter the live site.

## Changes and releases

1. Start from the latest GitHub branch. Compare any uncommitted local work before replacing local files; the initial local `index.html` and `mobile-preview.html` copies are older than the preserved GitHub versions.
2. Make application changes on a branch, run appropriate tests, type checks and a production build, and record results in the pull request. Documentation-only changes need a content review, not an application build.
3. Merge reviewed changes into `main` for release. Record the exact commit to be deployed; deploying and merging are separate actions.
4. Inspect the T470's existing services and take a consistent private backup of its database and media before a release. Build the chosen GitHub commit on Linux using the Dockerfile. Preserve the server's data directory and existing routing; never replace live data with the developer's local database.
5. Verify HTTPS, sign-in, listings, media, messaging/showings, maps and persistence after restart. Record the deployed commit and validation in the deployment notes. Retain the previous release for rollback.

Automatic deployment has not been configured. The existing Compose/Caddy example is an alternative for a clean server, not an instruction to replace the current Docker/NGINX setup.

## Data and backups

GitHub holds application source, public sample assets, tests and deployment instructions. Runtime listings, photos stored in SQLite, messages, showing requests, analytics, private seller plans and uploaded videos stay in private server storage. Credentials and environment secrets stay outside the repository.

Use `scripts/backup-data.mjs` for a consistent SQLite backup with media, following [the deployment guide](README.md). A complete recovery requires both a source release and its private data backup. Choose an off-server backup destination, schedule and retention policy, then test restoration; these are not configured yet.

After accepting live writes, preserve those writes when rolling back application code. Do not restore a stale database over new activity.
