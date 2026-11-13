CREATE TABLE `known_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`start_lat` real NOT NULL,
	`start_lng` real NOT NULL,
	`end_lat` real NOT NULL,
	`end_lng` real NOT NULL,
	`scope` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pro_state` (
	`id` text PRIMARY KEY NOT NULL,
	`trial_started_at` integer,
	`trial_ends_at` integer,
	`entitlement` text DEFAULT 'none' NOT NULL,
	`expires_at` integer,
	`product_id` text,
	`auto_renewing` integer,
	`last_verified_at` integer
);
--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`category_id` text,
	`scope` text DEFAULT 'work' NOT NULL,
	`freq` text NOT NULL,
	`day` integer NOT NULL,
	`month` integer,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`paused` integer DEFAULT false NOT NULL,
	`next_on` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rule_offers` (
	`merchant_key` text PRIMARY KEY NOT NULL,
	`declined_until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`match_text` text NOT NULL,
	`type` text NOT NULL,
	`min_minor` integer,
	`max_minor` integer,
	`category_id` text,
	`scope` text DEFAULT 'work' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`last_hit_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `trip_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`from_ts` integer NOT NULL,
	`to_ts` integer NOT NULL,
	`distance_m` real NOT NULL,
	`scope` text DEFAULT 'personal' NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trip_segments_trip_idx` ON `trip_segments` (`trip_id`);--> statement-breakpoint
CREATE TABLE `trip_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trip_stops_trip_idx` ON `trip_stops` (`trip_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `categories` ADD `mtd_category` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `vehicle_running_cost` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `rule_id` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `recurring_id` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `auto_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `entries` ADD `ocr_amount_minor` integer;--> statement-breakpoint
ALTER TABLE `entries` ADD `ocr_merchant` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `ocr_date` integer;--> statement-breakpoint
ALTER TABLE `receipts` ADD `ocr_text` text;--> statement-breakpoint
ALTER TABLE `trips` ADD `started_by` text;--> statement-breakpoint
ALTER TABLE `trips` ADD `original_started_at` integer;--> statement-breakpoint
ALTER TABLE `trips` ADD `original_ended_at` integer;--> statement-breakpoint
ALTER TABLE `trips` ADD `original_distance_m` real;--> statement-breakpoint
ALTER TABLE `trips` ADD `classified_by` text;--> statement-breakpoint
-- Data: built-in vehicle running costs (product.md §5) and MTD categories from the SA103 line (domain/mtd.ts SA103_TO_HMRC).
UPDATE `categories` SET `vehicle_running_cost` = 1 WHERE `key` IN ('fuel', 'repairs', 'insurance', 'lease');--> statement-breakpoint
UPDATE `categories` SET `mtd_category` = CASE `tax_line`
	WHEN 'SA103: Turnover' THEN 'turnover'
	WHEN 'SA103: Other business income' THEN 'other'
	WHEN 'SA103: Cost of goods bought for resale' THEN 'costOfGoods'
	WHEN 'SA103: Car, van and travel expenses' THEN 'carVanTravelExpenses'
	WHEN 'SA103: Wages, salaries and other staff costs' THEN 'wagesAndStaffCosts'
	WHEN 'SA103: Rent, rates, power and insurance costs' THEN 'premisesRunningCosts'
	WHEN 'SA103: Repairs and maintenance of property and equipment' THEN 'maintenanceCosts'
	WHEN 'SA103: Phone, fax, stationery and other office costs' THEN 'adminCosts'
	WHEN 'SA103: Advertising and business entertainment costs' THEN 'advertisingCosts'
	WHEN 'SA103: Interest on bank and other loans' THEN 'interestOnBankOtherLoans'
	WHEN 'SA103: Bank, credit card and other financial charges' THEN 'financeCharges'
	WHEN 'SA103: Accountancy, legal and other professional fees' THEN 'professionalFees'
	WHEN 'SA103: Other allowable business expenses' THEN 'otherExpenses'
	ELSE CASE WHEN `tax_line` LIKE 'SA103:%' THEN (CASE `type` WHEN 'income' THEN 'other' ELSE 'otherExpenses' END) ELSE NULL END
END;--> statement-breakpoint
UPDATE `trips` SET `started_by` = 'user' WHERE `source` = 'gps';
