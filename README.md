# Brand Portal

A private dashboard for your freelance brand projects. Edit each client's guideline, publish it,
then share `/p/client-name` and its portal password. Clients can read guidelines, copy colors,
download artwork and fonts, and download a prepared brand-kit ZIP you upload.

## Architecture

- **Next.js 16 / React / Tailwind**, deployed as one application on **Netlify Free**.
- **Supabase Postgres** for content, password hashes, sessions and activity, queried through Drizzle.
- **Supabase private Storage** for originals, previews, conversions and uploaded ZIPs.
- **Node 24** for both builds and functions. No persistent local disk is needed.

The browser sends upload metadata to the app, receives a signed upload URL, and sends the file
straight to private staging storage. The app checks the uploaded size, file signature, target
ownership and image validity, sanitizes SVGs, then publishes a new object and file record. Staging
objects have no downloadable file record. Upload progress includes the final validation step.

File URLs still use `/api/files/:id`. That route verifies portal access and page visibility before
redirecting to a storage URL valid for 60 seconds. This avoids function payload limits for large
files. A previously issued URL can remain usable for those 60 seconds after logout or revocation;
already-downloaded files cannot be recalled. Converted images are cached in the private bucket.

**Full kits are prepared ZIP uploads, up to 50 MiB each.** Use a Downloads block, or upload the ZIP
under Page settings → What the button downloads and set its button label. Pages containing only
a button file are visible. No automatic ZIP generation runs on the server; the old ZIP endpoint
returns 410. Split larger kits into multiple files.

## First deployment

### 1. Create Supabase resources

Create a **new Supabase Free project**. This release starts with a fresh Postgres database; it does
not import or modify the old local `data/portal.db` or uploaded files. Keep those files if you need
them. The old SQLite migrations remain in `drizzle/` for reference; only `drizzle/postgres/` runs.

Copy `.env.example` to `.env.local` and fill in:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase Connect → Transaction pooler, port 6543 |
| `MIGRATION_DATABASE_URL` | Supabase session pooler (5432), or direct connection; used only for migrations |
| `SUPABASE_URL` | Your project's HTTPS URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service-role key; never the public anon key |
| `SUPABASE_STORAGE_BUCKET` | `brand-portal` (dedicated to this app) |
| `SETUP_SECRET` | A random private secret of 32–200 characters |
| `MAX_UPLOAD_MB` | `50` or a smaller positive limit |
| `INSECURE_COOKIES` | `0` in production |

URL-encode special characters in the database password. Never put these secrets in Git, a client
component, or a `NEXT_PUBLIC_` variable. The service-role key bypasses storage policies and must
stay on the server. Disable Supabase's Data API if you do not use it for anything else. Application
tables also have row-level security enabled with **no browser access policies**. Do not add public
read/write policies to the private bucket.

Generate the setup secret locally:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

With Node 24 selected, run:

```bash
npm ci
npm run db:migrate
npm run storage:setup
npm run dev
```

The scripts load `.env.local`. Migrations are explicit release commands and are never run during
builds or requests. Use the direct/session connection for migrations; application queries use the
transaction pooler with prepared statements disabled. `storage:setup` creates or updates the
bucket to **private** and applies the upload-size limit. Keep the project's global Storage upload
limit at least as high as `MAX_UPLOAD_MB`.

Open `http://localhost:3000/setup`, enter the setup secret and create your admin. Concurrent setup
requests cannot create multiple first admins. Do not run the demo seed against production.

### 2. Connect Netlify

Push the repository to your Git provider and import it into Netlify. The included `netlify.toml`
sets `npm run build`, `.next`, and Node 24. Netlify automatically supplies its Next.js adapter.

In Netlify's environment settings, add the runtime variables above except `MIGRATION_DATABASE_URL`.
Also set `AWS_LAMBDA_JS_RUNTIME=nodejs24.x` in the Netlify UI (this runtime setting cannot be set in
`netlify.toml`). Keep `INSECURE_COOKIES=0`. Scope secrets to production; use separate Supabase
resources for previews, or do not enable application previews with production secrets.

Builds do not need database access. If a restricted local environment blocks Turbopack worker
ports, `npm run build -- --webpack` uses Next.js's supported alternative builder.

Deploy, visit `/setup` if you have not created the admin already, and verify sign-in over HTTPS.
Once setup is complete, remove `SETUP_SECRET` from the production environment and redeploy.
Share a published portal's link and password. Netlify's supplied hostname is free; a custom
domain is optional and separately purchased.

For future schema changes: back up the database, run `npm run db:generate`, review/commit the SQL,
apply it with `npm run db:migrate`, then deploy compatible application code. Do not put migrations
in the Netlify build command, where previews or simultaneous builds could run them.

## Editing and access

Open a portal and choose **Open editor**. Click text to edit it, hover blocks for settings, and use
page settings for URLs, visibility and prepared downloads. Empty pages stay hidden unless they
have a download-button file. Hidden pages' assets, fonts and button files are denied to clients
at the file endpoint, including previously saved URLs. Branding on the published login page is
intentionally visible without a password.

Password changes/access-mode changes revoke portal sessions. Individual email logins and manually
shared invite/reset links remain available; accepting a reset revokes that user's old sessions.
There is no email-sending service to configure. The first-admin setup secret is unrelated to the
passwords you share with clients.

## Free-tier limits and backups

Supabase Free currently includes **1 GB file storage**, **500 MB database storage**, a **50 MB
maximum object size**, and limited egress. Originals, generated images, prepared ZIPs and staging
files all consume storage. Supabase may pause projects after a week of low activity; Netlify
pauses sites when the free monthly usage budget is exhausted. Check both dashboards before
sending time-sensitive deliverables. These limits are accepted for this personal deployment.

Completed staging objects are retained until their two-hour upload tokens have expired, so a
replayed upload token cannot overwrite a published object. Each new upload removes up to 10
expired staging objects. After interrupted transfers, or periodically during active projects, run:

```bash
npm run uploads:cleanup
```

Retain original client artwork and final ZIPs separately. Take a database export regularly and
before migrations, for example with `pg_dump` using your direct/session connection; Supabase's
free tier is not a substitute for your backups. Database dumps do not include storage bytes.
Keep copies of the private bucket's `portals/` objects with their exact keys to preserve file
references on restoration. Restore into a separate project and verify a portal and its downloads
before relying on a backup. Review database, storage and egress usage in the provider dashboards.

Current provider documentation:
[Netlify Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[Netlify pricing](https://www.netlify.com/pricing/),
[Supabase pricing](https://supabase.com/pricing),
[Supabase Drizzle connections](https://supabase.com/docs/guides/database/drizzle).

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The integration suite uses real Postgres and a mocked object store. It checks concurrent setup,
transaction rollback, direct-upload initiation/completion, a 49 MiB file, SVG sanitation, file
visibility, five parallel downloads, session revocation, one-time invites and expired staging
cleanup. It requires a **separate, empty** database named `brand_portal_test`:

```bash
# Supply local disposable database URLs, not production credentials.
DATABASE_URL=postgres://postgres@localhost:5432/brand_portal_test npm run db:migrate
TEST_DATABASE_URL=postgres://postgres@localhost:5432/brand_portal_test npm test
```

If `.env.local` contains `MIGRATION_DATABASE_URL`, override it too so migrations target the test
connection. Without `TEST_DATABASE_URL`, the database integration cases are skipped; unit tests
still run. Hosted Supabase upload signatures/CORS, Netlify routing, real downloads and provider
quotas must also be verified on the preview deployment:

- Create/publish a portal, edit text and upload a logo, font and near-50 MB prepared ZIP.
- Sign in as a client; open/download files and confirm signed-out and wrong-portal access fails.
- Hide a page and change the password; confirm old page links/sessions lose access.
- Restart/redeploy; confirm content and original downloads persist.
- Open five concurrent client sessions and check the provider logs for errors.

Demo data is optional and explicitly disabled unless `ALLOW_DEMO_SEED=1` is set with a development
database and bucket. `NODE_ENV=production` always blocks seeding. The sample admin's password is
public and must never be used for a live deployment.
