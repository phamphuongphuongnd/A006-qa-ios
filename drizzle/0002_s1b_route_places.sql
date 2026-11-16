CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`use_count` integer DEFAULT 1 NOT NULL,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `from_label` text;--> statement-breakpoint
ALTER TABLE `trips` ADD `to_label` text;--> statement-breakpoint
ALTER TABLE `trips` ADD `from_lat` real;--> statement-breakpoint
ALTER TABLE `trips` ADD `from_lng` real;--> statement-breakpoint
ALTER TABLE `trips` ADD `to_lat` real;--> statement-breakpoint
ALTER TABLE `trips` ADD `to_lng` real;--> statement-breakpoint
ALTER TABLE `trips` ADD `round_trip` integer DEFAULT false NOT NULL;