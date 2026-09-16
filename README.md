# Brand Portal

Password-protected brand guideline portals for your clients. Each portal is a multi-page guideline
with a fixed left nav and the selected page on the right, modelled on a classic visual identity
guideline (Strategy, Logo, Typography, Colour and so on). You edit every page in place, then share a
private link. Clients sign in and can:

- **Read the guidelines** page by page: large page heroes, label and text rows, value grids
- **Copy colors**: click any Name, CMYK, RGB, HEX or Pantone value on a swatch, or download the
  palette as CSS, SCSS, a Tailwind theme, design tokens (JSON) or an Adobe Swatch (`.ase`) file
- **Check color pairings**, with AA/AAA contrast ratings worked out automatically
- **Download logos and artwork** as the original SVG, or as PNG (1x/2x/4x), JPG and WEBP
- **Grab icons** from a searchable grid: copy the SVG code or download SVG/PNG
- **Get banners** grouped by platform, with dimensions shown
- **See the typefaces**: character sets for every weight, a type scale, optional type tester
- **Download a page's files** with its download button, or everything as one organized ZIP

## Editing guidelines

Open a portal and choose **Open editor**. The editor shows the page exactly as clients see it:

- **Click any text** (page title, intro, labels, paragraphs, cards, type samples) to edit it in
  place. Enter saves; Escape cancels. Body text supports Markdown (`**bold**`, lists, links, and
  `> **Note**` for the grey side notes).
- **Hover a block** for its toolbar: settings, move, duplicate, delete.
- **Hover between blocks** and choose **Add block**: text, text grid, images & video, color swatches,
  color pairings, typeface, type scale, icon set, banners or downloads.
- **Settings** opens a drawer for layout (columns, tile background and shape, text size, dividers),
  uploads and lists.
- **Page settings** covers the URL, intro, download button (a file of your choice, or a ZIP of the
  page) and hiding a page.
- Add and reorder pages from the sidebar or the portal's **Pages** tab.

New portals can start from the **full brand guideline** template (12 chapters) or a blank page.
Empty pages and blocks stay hidden from clients until you fill them in.

## Quick start

Requires Node.js 22.13 or newer (uses the built-in `node:sqlite`).

```bash
npm install
npm run seed      # optional: demo admin + a "Tidewater Coffee" guideline
npm run dev
```

Open http://localhost:3000.

- **With the seed:** sign in at `/login` with `demo@brandportal.local` / `demo-admin-1234`, and open
  the client view at `/p/tidewater` with the password `tidewater-demo`.
- **Without the seed:** the first visit takes you to `/setup` to create your admin account.

Data lives in `./data` (the SQLite database plus uploaded files). Delete that folder to start over.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Add the demo portal (`-- --force` rebuilds it) |
| `npm test` | Unit tests (block data, color math, exports, SVG sanitising, image conversion) |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |

Migrations in `drizzle/` run automatically when the server starts.

## How it's built

- **Next.js 16** (App Router, server actions, route handlers) + **Tailwind CSS v4**, set in **Inter**
- **SQLite** through Node's built-in `node:sqlite`, queried with **Drizzle ORM**
- **sharp** for SVG rasterising and format conversion; **DOMPurify** strips scripts from uploaded SVGs
- **archiver** streams ZIP downloads

A portal has **pages** (the numbered chapters in the nav), and each page is a list of **blocks**. A
block's type decides how it renders; its settings and text live in `blocks.data` as JSON validated
by `src/lib/blocks.ts`, and its colors, uploaded files and fonts live in their own tables.

```
src/
  app/
    dashboard/…              admin: portal list, pages, access, settings, activity
    editor/[portalId]/…      in-place guideline editor
    p/[slug]/[page]          client guideline pages; sign-in and invite acceptance under p/[slug]
    api/files/[fileId]       authorised file serving + format conversion + download logging
    api/portals/[id]/…       color exports and ZIP downloads (whole kit or ?page=)
    api/admin/upload         admin uploads
  components/
    guide/                   guideline frame, hero, blocks, click-to-edit text
    editor/                  editor bar, block toolbar, add-block menu, settings drawer
    dashboard/, portal/, ui/, form/
  lib/
    blocks.ts                block types, data schemas, inline text edits
    guide.ts                 page/block types and client visibility rules
    templates.ts             the full brand guideline template
    actions/                 server actions: every one checks auth + ownership and validates input
    auth/                    sessions, password hashing, rate limiting, portal access rules
    data/                    read queries
    db/                      schema + SQLite client
    storage.ts               file storage (local disk)
    files.ts                 upload validation, conversions, previews
scripts/seed.ts              demo data
```

## Security model

- **Admin sessions** and **portal sessions** are random tokens in httpOnly, SameSite=Lax cookies.
  Only a SHA-256 hash of each token is stored, so sessions can be revoked server-side.
- **Passwords** (admin, shared portal password, client users) are hashed with scrypt.
- **Every file** is stored outside `public/` and served only through `/api/files/:id`, which checks
  the viewer on every request. The one exception: a published portal's logo and cover are visible on
  its sign-in page.
- Hidden and empty pages are left out of the client nav, page routes and ZIP downloads.
- Changing a portal's password or access method **signs everyone out**. Removing a user ends their
  sessions.
- Sign-in forms are **rate limited** (8 failures per 15 minutes per IP and portal).
- Uploaded **SVGs are sanitised** (scripts, event handlers, `foreignObject` removed) and served with
  a locked-down `Content-Security-Policy`. File types and sizes are allow-listed per block type.
- Guideline Markdown is rendered without raw HTML.
- Server actions verify the admin owns the portal, page or block they touch. Uploads also check the
  request origin.
- Every response sends `X-Robots-Tag: noindex`, and `robots.txt` disallows crawling.

## Deploying

The app runs anywhere Node runs with a persistent disk (a VPS, Fly.io, Railway, Render):

```bash
npm run build
DATA_DIR=/var/lib/brand-portal npm start
```

Put it behind HTTPS so cookies are sent as `Secure`. If you run several instances, set
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to the same value on each.

### Moving to Supabase / R2 / Vercel

Serverless hosts like Vercel have no persistent disk, so switch storage and database first:

1. **Database:** change `src/lib/db/schema.ts` imports from `drizzle-orm/sqlite-core` to
   `drizzle-orm/pg-core`, run `npm run db:generate`, and replace `src/lib/db/index.ts` with a
   `drizzle-orm/postgres-js` client pointed at Supabase Postgres.
2. **Files:** reimplement the five functions in `src/lib/storage.ts` against Supabase Storage or
   Cloudflare R2. Nothing else reads the disk directly.
3. **Email:** invite links are currently shown to the admin to copy. To send them automatically, call
   Resend (or similar) from `inviteUserAction` in `src/lib/actions/users.ts`.

## Roadmap ideas

- Duplicate a whole portal as the starting point for a new client
- Drag-and-drop block reordering and image reordering in the editor
- Custom domains per client (e.g. `brand.clientname.com`)
- Import colors and assets from Figma
- Version history for pages and assets
