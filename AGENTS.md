<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- Use https://github.com/shawnkburton/listed as the source of truth for future application changes. Keep changes on a branch and in a pull request with validation recorded.
- The user's intended host is their T470 server, serving lic.nut.run. Confirm whether it is the existing hosting machine before changing deployment infrastructure.
- Follow deploy/WORKFLOW.md. Keep runtime databases, seller uploads, private messages, credentials and backups out of GitHub. Source control does not replace a server-data backup.
