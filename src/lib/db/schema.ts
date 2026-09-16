import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
  timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date());

export const agencies = pgTable("agencies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const admins = pgTable("admins", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id")
    .notNull()
    .references(() => agencies.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const portals = pgTable("portals", {
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
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
}).enableRLS();

export const files = pgTable(
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
).enableRLS();

/** A chapter of the guideline ("01 Strategy"), shown as one item in the portal's left nav. */
export const pages = pgTable(
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
    /** Uploaded file or prepared ZIP behind the page's download button. */
    buttonFileId: text("button_file_id").references(() => files.id, { onDelete: "set null" }),
    isHidden: boolean("is_hidden").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.portalId, t.slug), index("pages_portal_idx").on(t.portalId, t.position)],
).enableRLS();

export const blocks = pgTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
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
).enableRLS();

export const colors = pgTable(
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
).enableRLS();

export const assets = pgTable(
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
).enableRLS();

export const fonts = pgTable(
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
).enableRLS();

export const portalUsers = pgTable(
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
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true, mode: "date" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("portal_users_email_idx").on(t.portalId, t.email),
    index("portal_users_invite_idx").on(t.inviteTokenHash),
  ],
).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["admin", "portal"] }).notNull(),
    adminId: text("admin_id").references(() => admins.id, { onDelete: "cascade" }),
    portalId: text("portal_id").references(() => portals.id, { onDelete: "cascade" }),
    portalUserId: text("portal_user_id").references(() => portalUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_portal_idx").on(t.portalId)],
).enableRLS();

export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
}).enableRLS();

export const downloadLog = pgTable(
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
).enableRLS();

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

/** Staging objects never have file records and cannot be served to clients. */
export const pendingUploads = pgTable("pending_uploads", {
  id: text("id").primaryKey(),
  // Cleanup records outlive deleted portals/admins until signed upload tokens expire.
  adminId: text("admin_id").notNull(),
  portalId: text("portal_id").notNull(),
  purpose: text("purpose", { enum: ["asset", "pageButton", "logo", "cover", "wordmark"] }).notNull(),
  blockId: text("block_id"),
  pageId: text("page_id"),
  name: text("name").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
}, (t) => [index("pending_uploads_expiry_idx").on(t.expiresAt)]).enableRLS();
