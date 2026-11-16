CREATE TABLE `odometer_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`read_at` integer NOT NULL,
	`value` real NOT NULL,
	`unit` text DEFAULT 'mi' NOT NULL,
	`photo_path` text
);
--> statement-breakpoint
CREATE INDEX `odometer_readings_read_idx` ON `odometer_readings` (`read_at`);--> statement-breakpoint
CREATE TABLE `trip_gap_dismissals` (
	`prev_trip_id` text NOT NULL,
	`next_trip_id` text PRIMARY KEY NOT NULL,
	`answer` text DEFAULT 'dismissed' NOT NULL,
	`created_at` integer NOT NULL
);
