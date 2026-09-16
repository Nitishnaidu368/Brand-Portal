import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Content blocks a guideline page is built from. Per-type settings live in `blocks.data` (see lib/blocks.ts). */
export const BLOCK_TYPES = [
  "text",
  "cards",
  "media",
  "colors",
  "pairings",
  "typeface",
  "typescale",
  "icons",
  "banners",
  "files",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const ASSET_VARIANTS = ["default", "light", "dark", "do", "dont"] as const;
export type AssetVariant = (typeof ASSET_VARIANTS)[number];

export const ACCESS_MODES = ["password", "email"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const agencies = sqliteTable("agencies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id")
    .notNull()
    .references(() => agencies.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const portals = sqliteTable("portals", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id")
    .notNull()
    .references(() => agencies.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull().default(""),
  /** Hero, footer and button color of the guideline. */
  accentColor: text("accent_color").notNull().default("#011520"),
  logoFileId: text("logo_file_id"),
  coverFileId: text("cover_file_id"),
  /** Optional wordmark shown huge in the footer; the client name is used when empty. */
  wordmarkFileId: text("wordmark_file_id"),
  /** Sidebar subtitle, e.g. "Visual Identity\nBrand Guidelines 2025". */
  guideTitle: text("guide_title").notNull().default(""),
  versionLabel: text("version_label").notNull().default("Version 1.0"),
  footerLabel: text("footer_label").notNull().default("Visual Identity Guidelines"),
  accessMode: text("access_mode", { enum: ACCESS_MODES }).notNull().default("password"),
  passwordHash: text("password_hash"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  allowZip: integer("allow_zip", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    agencyId: text("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    portalId: text("portal_id").references(() => portals.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
  },
  (t) => [index("files_portal_idx").on(t.portalId)],
);

/** A chapter of the guideline ("01 Strategy"), shown as one item in the portal's left nav. */
export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    intro: text("intro").notNull().default(""),
    /** Label of the dark button under the intro, e.g. "Download Logos". Hidden when empty. */
    buttonLabel: text("button_label").notNull().default(""),
    /** File the button downloads. Without one, it downloads a ZIP of the page's assets. */
    buttonFileId: text("button_file_id").references(() => files.id, { onDelete: "set null" }),
    isHidden: integer("is_hidden", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.portalId, t.slug), index("pages_portal_idx").on(t.portalId, t.position)],
);

export const blocks = sqliteTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    // Nullable in the database: SQLite can't add a NOT NULL foreign key column to an existing
    // table (see drizzle/0001_pages_blocks.sql). Every insert sets it.
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: text("type", { enum: BLOCK_TYPES }).notNull(),
    /** JSON settings and text for the block type, validated by lib/blocks.ts on every read and write. */
    data: text("data").notNull().default("{}"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("blocks_page_idx").on(t.pageId, t.position)],
);

export const colors = sqliteTable(
  "colors",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    blockId: text("block_id")
      .notNull()
      .references(() => blocks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hex: text("hex").notNull(),
    cmyk: text("cmyk"),
    pantone: text("pantone"),
    usage: text("usage").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("colors_block_idx").on(t.blockId, t.position)],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    blockId: text("block_id")
      .notNull()
      .references(() => blocks.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    groupLabel: text("group_label").notNull().default(""),
    variant: text("variant", { enum: ASSET_VARIANTS }).notNull().default("default"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("assets_block_idx").on(t.blockId, t.position)],
);

export const fonts = sqliteTable(
  "fonts",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    blockId: text("block_id")
      .notNull()
      .references(() => blocks.id, { onDelete: "cascade" }),
    family: text("family").notNull(),
    source: text("source", { enum: ["google", "upload", "system"] }).notNull(),
    weights: text("weights").notNull().default("400"),
    style: text("style", { enum: ["normal", "italic"] }).notNull().default("normal"),
    usage: text("usage").notNull().default(""),
    fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("fonts_block_idx").on(t.blockId, t.position)],
);

export const portalUsers = sqliteTable(
  "portal_users",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash"),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: integer("invite_expires_at", { mode: "timestamp_ms" }),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("portal_users_email_idx").on(t.portalId, t.email),
    index("portal_users_invite_idx").on(t.inviteTokenHash),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["admin", "portal"] }).notNull(),
    adminId: text("admin_id").references(() => admins.id, { onDelete: "cascade" }),
    portalId: text("portal_id").references(() => portals.id, { onDelete: "cascade" }),
    portalUserId: text("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_portal_idx").on(t.portalId)],
);

export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
});

export const downloadLog = sqliteTable(
  "download_log",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    assetId: text("asset_id").references(() => assets.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["asset", "zip", "colors", "font"] }).notNull(),
    label: text("label").notNull(),
    format: text("format").notNull().default(""),
    actor: text("actor").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("download_log_portal_idx").on(t.portalId, t.createdAt)],
);

export type Agency = typeof agencies.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Portal = typeof portals.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Color = typeof colors.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Font = typeof fonts.$inferSelect;
export type PortalUser = typeof portalUsers.$inferSelect;
