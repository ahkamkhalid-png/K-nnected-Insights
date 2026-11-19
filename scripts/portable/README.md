# Könnected Insights — portable website

This snapshot contains the full reviewed application source plus the available **development** database and both tagged legacy images. It is not a verified production snapshot. It is not encrypted. Keep the repository private: `portable/data/` includes drafts, staff records, operational history and private evidence. **Never serve the repository root or upload the whole checkout to a static hosting directory.**

## Read the website now

Clone or download the **portable-site-2026-11-19** branch from the private repository. From its root, on macOS, Windows or Linux with Node.js 22+:

```sh
node scripts/portable/verify.mjs
node scripts/portable/serve.mjs
```

Open **http://127.0.0.1:3000/**. No package installation, database, account or passphrase is required. The web host can set `HOST` and `PORT` to expose only this server. This reading edition includes the public React build, article lists/details, research pages and first-party images. It does not permit sign-in, editing, AI chat, emails or jobs. External links and embedded videos still use their original providers. Stop with Ctrl+C.

## Restore the editable application on a new host

Use a fresh host/account, Linux x64, Node 24, pnpm 10 and PostgreSQL 16+ tooling. Do not run the Replit post-merge script or the ordinary API startup against a recovered database. Use your own private secret store. No account passwords, sessions, invitation tokens, live signing keys, API keys or connection strings are included.

1. Run the verification above. Create a **new empty database on your new PostgreSQL server**, using a role that can create objects. Set `PGHOST`, `PGUSER` and other libpq options privately for that host. Use a new name that does not exist. Example:

   ```sh
   createdb konnected_restore
   pg_restore --list portable/data/development.pgdump > restore.list
   # The new database already contains public; omit only its CREATE SCHEMA entry.
   sed '/ SCHEMA - public /d' restore.list > restore-new-db.list
   pg_restore --single-transaction --exit-on-error --no-owner --no-acl --use-list=restore-new-db.list --dbname=konnected_restore portable/data/development.pgdump
   ```

   No `--clean` or destructive schema command is necessary. Never target an existing app database. `portable/inventory.json` records sanitized row counts; all tables and all media bytes were checked against a fresh restore. Roles are retained for review, not active authority: old user links/invitations and active lease tokens were cleared. Use a verified owner mailbox and reapprove staff in the **new** identity tenant. Remove stale non-owner roster rows through the admin flow before issuing fresh invitations. Do not copy credentials from the old provider.
2. Install and build from the repository root. Provide a new Clerk tenant, `VITE_CLERK_PUBLISHABLE_KEY` at frontend build time, corresponding `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` on the server, and `EDITORIAL_OWNER_EMAIL`. Configure the new hostname, sign-in/up redirects, allowed origins and email verification. Configure the frontend API/proxy for **your** domain if used. Existing Replit-managed identity/SSO is not embedded in this repository.

   ```sh
   pnpm install --frozen-lockfile
   PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/konnected-insights run build
   node artifacts/api-server/build.mjs --portable
   ```

3. Set `DATABASE_URL` to the newly restored DB; configure `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` for your authorized compatible provider (the full API requires them on startup). Start from the checkout root:

   ```sh
   NODE_ENV=production PORT=3000 node artifacts/api-server/dist/portable/server.mjs
   ```

   This serves the rebuilt frontend and the real API from one origin; it does **not** seed or start background schedulers. New editorial uploads use PostgreSQL. Old Drive IDs resolve from `portable/data/legacy/` with integrity and purpose checks; evidence remains staff-only. Do not expose this directory directly. The portable adapter never calls live Drive, Gmail or Replit connectors. Features requiring other connectors need new authorization and an adapter for the chosen host. Enable jobs only after reviewing restored schedules, queues and recipients. Supply HTTPS and an appropriately configured reverse proxy for a public host.

4. Confirm published and draft counts, image visibility, fresh staff authorization and revocation, and provider settings before enabling writes or sending anything. No production cutover or live provider verification was performed. To rebuild only the read-only frontend into a **new** directory after installing dependencies: `node artifacts/konnected-insights/portable/build.mjs /absolute/new-public-directory` (the matching public API snapshot and media files are separate).

The older encrypted-backup tools in the source tree are optional and were not used for this copy. This branch is a point-in-time transfer, not a synchronization service. Removing files later does not revoke a clone or erase Git history.
