CREATE TABLE "admins" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"block_id" text NOT NULL,
	"file_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"group_label" text DEFAULT '' NOT NULL,
	"variant" text DEFAULT 'default' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"page_id" text NOT NULL,
	"type" text NOT NULL,
	"data" text DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "colors" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"block_id" text NOT NULL,
	"name" text NOT NULL,
	"hex" text NOT NULL,
	"cmyk" text,
	"pantone" text,
	"usage" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "colors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "download_log" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"asset_id" text,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "download_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"portal_id" text,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fonts" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"block_id" text NOT NULL,
	"family" text NOT NULL,
	"source" text NOT NULL,
	"weights" text DEFAULT '400' NOT NULL,
	"style" text DEFAULT 'normal' NOT NULL,
	"usage" text DEFAULT '' NOT NULL,
	"file_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fonts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"button_label" text DEFAULT '' NOT NULL,
	"button_file_id" text,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pending_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"portal_id" text NOT NULL,
	"purpose" text NOT NULL,
	"block_id" text,
	"page_id" text,
	"name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portal_users" (
	"id" text PRIMARY KEY NOT NULL,
	"portal_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text,
	"invite_token_hash" text,
	"invite_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portals" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"client_name" text NOT NULL,
	"slug" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"accent_color" text DEFAULT '#011520' NOT NULL,
	"logo_file_id" text,
	"cover_file_id" text,
	"wordmark_file_id" text,
	"guide_title" text DEFAULT '' NOT NULL,
	"version_label" text DEFAULT 'Version 1.0' NOT NULL,
	"footer_label" text DEFAULT 'Visual Identity Guidelines' NOT NULL,
	"access_mode" text DEFAULT 'password' NOT NULL,
	"password_hash" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "portals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "portals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"admin_id" text,
	"portal_id" text,
	"portal_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_log" ADD CONSTRAINT "download_log_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_log" ADD CONSTRAINT "download_log_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fonts" ADD CONSTRAINT "fonts_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fonts" ADD CONSTRAINT "fonts_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fonts" ADD CONSTRAINT "fonts_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_button_file_id_files_id_fk" FOREIGN KEY ("button_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portals" ADD CONSTRAINT "portals_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_block_idx" ON "assets" USING btree ("block_id","position");--> statement-breakpoint
CREATE INDEX "blocks_page_idx" ON "blocks" USING btree ("page_id","position");--> statement-breakpoint
CREATE INDEX "colors_block_idx" ON "colors" USING btree ("block_id","position");--> statement-breakpoint
CREATE INDEX "download_log_portal_idx" ON "download_log" USING btree ("portal_id","created_at");--> statement-breakpoint
CREATE INDEX "files_portal_idx" ON "files" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "fonts_block_idx" ON "fonts" USING btree ("block_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("portal_id","slug");--> statement-breakpoint
CREATE INDEX "pages_portal_idx" ON "pages" USING btree ("portal_id","position");--> statement-breakpoint
CREATE INDEX "pending_uploads_expiry_idx" ON "pending_uploads" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_users_email_idx" ON "portal_users" USING btree ("portal_id","email");--> statement-breakpoint
CREATE INDEX "portal_users_invite_idx" ON "portal_users" USING btree ("invite_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_portal_idx" ON "sessions" USING btree ("portal_id");