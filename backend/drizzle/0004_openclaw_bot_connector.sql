ALTER TABLE `bot` ADD `user_id` text REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `bot` ADD `provider` text DEFAULT 'openclaw' NOT NULL;
--> statement-breakpoint
ALTER TABLE `bot` ADD `pairing_status` text DEFAULT 'unpaired' NOT NULL;
--> statement-breakpoint
ALTER TABLE `bot` ADD `presence_status` text DEFAULT 'offline' NOT NULL;
--> statement-breakpoint
ALTER TABLE `bot` ADD `pairing_code` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `pairing_code_expires_at` integer;
--> statement-breakpoint
ALTER TABLE `bot` ADD `connector_token_hash` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `connector_name` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `connector_version` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `connector_id` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `device_id` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `last_seen_at` integer;
--> statement-breakpoint
ALTER TABLE `bot` ADD `last_error` text;
