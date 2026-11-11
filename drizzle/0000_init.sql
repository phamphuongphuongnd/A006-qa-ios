CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`key` text,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`tax_line` text NOT NULL,
	`sort_order` integer NOT NULL,
	`hidden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`category_id` text,
	`scope` text DEFAULT 'work' NOT NULL,
	`sorted_at` integer,
	`split_group_id` text,
	`split_from_minor` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_occurred_idx` ON `entries` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `entries_category_idx` ON `entries` (`category_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `receipts_entry_idx` ON `receipts` (`entry_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` text NOT NULL,
	`ts` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`accuracy` real NOT NULL,
	`segment_start` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trip_points_trip_idx` ON `trip_points` (`trip_id`,`ts`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`distance_m` real DEFAULT 0 NOT NULL,
	`odo_start` real,
	`odo_end` real,
	`scope` text DEFAULT 'work' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`edited` integer DEFAULT false NOT NULL,
	`last_point_at` integer
);
--> statement-breakpoint
CREATE INDEX `trips_started_idx` ON `trips` (`started_at`);