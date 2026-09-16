-- Guideline pages and blocks.
--
-- Portals used to be one long page of typed sections. They are now a set of pages (the chapters in
-- the left nav), each built from blocks. Existing content is kept: every section becomes a page
-- holding one block, and the `sections` table is renamed to `blocks` so colors, assets and fonts
-- (and their files) stay attached. Renaming, rather than rebuilding, matters here: dropping a
-- parent table would cascade-delete its children because foreign keys are enforced.
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`portal_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`button_label` text DEFAULT '' NOT NULL,
	`button_file_id` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`portal_id`) REFERENCES `portals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`button_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_idx` ON `pages` (`portal_id`,`slug`);
--> statement-breakpoint
CREATE INDEX `pages_portal_idx` ON `pages` (`portal_id`,`position`);
--> statement-breakpoint
ALTER TABLE `portals` ADD `wordmark_file_id` text;
--> statement-breakpoint
ALTER TABLE `portals` ADD `guide_title` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `portals` ADD `version_label` text DEFAULT 'Version 1.0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `portals` ADD `footer_label` text DEFAULT 'Visual Identity Guidelines' NOT NULL;
--> statement-breakpoint
-- One page per section. Section types are already URL-safe, so they become the page slugs.
INSERT INTO `pages` (`id`, `portal_id`, `slug`, `title`, `intro`, `position`, `created_at`)
SELECT `id`, `portal_id`, CASE WHEN `rn` = 1 THEN `type` ELSE `type` || '-' || `rn` END, `title`, `description`, `position`, `created_at`
FROM (
	SELECT *, ROW_NUMBER() OVER (PARTITION BY `portal_id`, `type` ORDER BY `position`, `created_at`) AS `rn`
	FROM `sections`
);
--> statement-breakpoint
ALTER TABLE `sections` RENAME TO `blocks`;
--> statement-breakpoint
-- SQLite requires a NULL default when adding a foreign key column; the app always sets it.
ALTER TABLE `blocks` ADD `page_id` text REFERENCES `pages`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `blocks` ADD `data` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
UPDATE `blocks` SET `page_id` = `id`, `position` = 0;
--> statement-breakpoint
UPDATE `blocks` SET `data` = json_object('body', `body`) WHERE `type` = 'guidelines';
--> statement-breakpoint
UPDATE `blocks` SET `data` = json_object('columns', 2, 'background', 'grey', 'aspect', '16/9', 'fit', 'contain', 'downloadable', json('true')) WHERE `type` = 'logos';
--> statement-breakpoint
-- Do and don't examples from a guidelines section move to an image block under its text.
INSERT INTO `blocks` (`id`, `portal_id`, `type`, `title`, `description`, `body`, `position`, `created_at`, `page_id`, `data`)
SELECT `id` || '-examples', `portal_id`, 'media', '', '', '', 1, `created_at`, `id`,
	json_object('columns', 2, 'background', 'white', 'aspect', '3/2', 'fit', 'cover', 'downloadable', json('false'), 'divider', json('false'))
FROM `blocks`
WHERE `type` = 'guidelines' AND EXISTS (SELECT 1 FROM `assets` WHERE `assets`.`section_id` = `blocks`.`id`);
--> statement-breakpoint
UPDATE `assets` SET `section_id` = `section_id` || '-examples'
WHERE `section_id` IN (SELECT `id` FROM `blocks` WHERE `type` = 'guidelines');
--> statement-breakpoint
UPDATE `blocks` SET `type` = 'text' WHERE `type` = 'guidelines';
--> statement-breakpoint
UPDATE `blocks` SET `type` = 'media' WHERE `type` = 'logos';
--> statement-breakpoint
UPDATE `blocks` SET `type` = 'typeface' WHERE `type` = 'typography';
--> statement-breakpoint
DROP INDEX `sections_portal_idx`;
--> statement-breakpoint
ALTER TABLE `blocks` DROP COLUMN `title`;
--> statement-breakpoint
ALTER TABLE `blocks` DROP COLUMN `description`;
--> statement-breakpoint
ALTER TABLE `blocks` DROP COLUMN `body`;
--> statement-breakpoint
CREATE INDEX `blocks_page_idx` ON `blocks` (`page_id`,`position`);
--> statement-breakpoint
DROP INDEX `colors_section_idx`;
--> statement-breakpoint
ALTER TABLE `colors` RENAME COLUMN `section_id` TO `block_id`;
--> statement-breakpoint
CREATE INDEX `colors_block_idx` ON `colors` (`block_id`,`position`);
--> statement-breakpoint
DROP INDEX `assets_section_idx`;
--> statement-breakpoint
ALTER TABLE `assets` RENAME COLUMN `section_id` TO `block_id`;
--> statement-breakpoint
CREATE INDEX `assets_block_idx` ON `assets` (`block_id`,`position`);
--> statement-breakpoint
DROP INDEX `fonts_section_idx`;
--> statement-breakpoint
ALTER TABLE `fonts` RENAME COLUMN `section_id` TO `block_id`;
--> statement-breakpoint
CREATE INDEX `fonts_block_idx` ON `fonts` (`block_id`,`position`);
