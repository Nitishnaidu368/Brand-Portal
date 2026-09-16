CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`section_id` text NOT NULL,
	`file_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`group_label` text DEFAULT '' NOT NULL,
	`variant` text DEFAULT 'default' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assets_section_idx` ON `assets` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `colors` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`section_id` text NOT NULL,
	`name` text NOT NULL,
	`hex` text NOT NULL,
	`cmyk` text,
	`pantone` text,
	`usage` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `colors_section_idx` ON `colors` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `download_log` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`asset_id` text,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`format` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `download_log_portal_idx` ON `download_log` (`portal_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`portal_id` text,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `files_portal_idx` ON `files` (`portal_id`);--> statement-breakpoint
CREATE TABLE `fonts` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`section_id` text NOT NULL,
	`family` text NOT NULL,
	`source` text NOT NULL,
	`weights` text DEFAULT '400' NOT NULL,
	`style` text DEFAULT 'normal' NOT NULL,
	`usage` text DEFAULT '' NOT NULL,
	`file_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fonts_section_idx` ON `fonts` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`password_hash` text,
	`invite_token_hash` text,
	`invite_expires_at` integer,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_users_email_idx` ON `portal_users` (`portal_id`,`email`);--> statement-breakpoint
CREATE INDEX `portal_users_invite_idx` ON `portal_users` (`invite_token_hash`);--> statement-breakpoint
CREATE TABLE `portals` (
	`id` text PRIMARY KEY NOT NULL,
	`agency_id` text NOT NULL,
	`client_name` text NOT NULL,
	`slug` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`accent_color` text DEFAULT '#18181B' NOT NULL,
	`logo_file_id` text,
	`cover_file_id` text,
	`access_mode` text DEFAULT 'password' NOT NULL,
	`password_hash` text,
	`is_published` integer DEFAULT false NOT NULL,
	`allow_zip` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portals_slug_unique` ON `portals` (`slug`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sections_portal_idx` ON `sections` (`portal_id`,`position`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`admin_id` text,
	`portal_id` text,
	`portal_user_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portal_user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_portal_idx` ON `sessions` (`portal_id`);