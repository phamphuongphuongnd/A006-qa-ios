CREATE TABLE `saved_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`distance_m` real NOT NULL,
	`round_trip` integer DEFAULT false NOT NULL,
	`scope` text DEFAULT 'work' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`from_label` text,
	`to_label` text,
	`from_lat` real,
	`from_lng` real,
	`to_lat` real,
	`to_lng` real,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trash` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`deleted_at` integer NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`amount_minor` integer,
	`currency` text,
	`distance_m` real,
	`item_at` integer NOT NULL,
	`payload` text NOT NULL,
	`files` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trash_deleted_idx` ON `trash` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `entries` ADD `trip_id` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `exported_at` integer;--> statement-breakpoint
CREATE INDEX `entries_trip_idx` ON `entries` (`trip_id`);--> statement-breakpoint
ALTER TABLE `trips` ADD `exported_at` integer;--> statement-breakpoint
-- Q29: an exported entry / trip edited afterwards is no longer "as exported" (counts in "N changes since your last export").
CREATE TRIGGER `entries_unexport_on_edit` AFTER UPDATE OF `type`, `amount_minor`, `occurred_at`, `note`, `category_id`, `scope` ON `entries`
WHEN OLD.`exported_at` IS NOT NULL AND NEW.`exported_at` IS OLD.`exported_at`
  AND (NEW.`type` IS NOT OLD.`type` OR NEW.`amount_minor` IS NOT OLD.`amount_minor` OR NEW.`occurred_at` IS NOT OLD.`occurred_at`
    OR NEW.`note` IS NOT OLD.`note` OR NEW.`category_id` IS NOT OLD.`category_id` OR NEW.`scope` IS NOT OLD.`scope`)
BEGIN
  UPDATE `entries` SET `exported_at` = NULL WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `trips_unexport_on_edit` AFTER UPDATE OF `started_at`, `ended_at`, `distance_m`, `scope`, `purpose`, `round_trip` ON `trips`
WHEN OLD.`exported_at` IS NOT NULL AND NEW.`exported_at` IS OLD.`exported_at`
  AND (NEW.`started_at` IS NOT OLD.`started_at` OR NEW.`ended_at` IS NOT OLD.`ended_at` OR NEW.`distance_m` IS NOT OLD.`distance_m`
    OR NEW.`scope` IS NOT OLD.`scope` OR NEW.`purpose` IS NOT OLD.`purpose` OR NEW.`round_trip` IS NOT OLD.`round_trip`)
BEGIN
  UPDATE `trips` SET `exported_at` = NULL WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
-- Q28: Parking & tolls typed on a trip follows the trip's scope; sorting an Unsorted trip sorts its parking too.
CREATE TRIGGER `trips_parking_scope` AFTER UPDATE OF `scope` ON `trips`
WHEN NEW.`scope` IS NOT OLD.`scope`
BEGIN
  UPDATE `entries` SET
    `scope` = CASE NEW.`scope` WHEN 'personal' THEN 'personal' ELSE 'work' END,
    `category_id` = CASE WHEN NEW.`scope` <> 'unsorted' AND `category_id` IS NULL
      THEN (SELECT `id` FROM `categories` WHERE `key` = 'parking' LIMIT 1) ELSE `category_id` END,
    `sorted_at` = CASE WHEN NEW.`scope` <> 'unsorted' AND `category_id` IS NULL
      THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000 ELSE `sorted_at` END,
    `updated_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
  WHERE `trip_id` = NEW.`id` AND `type` = 'expense';
END;
