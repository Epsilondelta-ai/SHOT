-- Create missing tables
CREATE TABLE IF NOT EXISTS `game_participant` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`participation_type` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `game_participant_userId_idx` ON `game_participant` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `game_participant_roomId_idx` ON `game_participant` (`room_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `game_record` (
	`room_id` text PRIMARY KEY NOT NULL,
	`player_count` integer NOT NULL,
	`player_names` text NOT NULL,
	`winner_team` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`replay_data` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `game_replay_frame` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`seq` integer NOT NULL,
	`snapshot` text NOT NULL,
	`action_summary` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `game_replay_frame_roomId_seq_idx` ON `game_replay_frame` (`room_id`, `seq`);
--> statement-breakpoint
-- Add missing bot columns (connector fields + new client fields)
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
--> statement-breakpoint
ALTER TABLE `bot` ADD `client_mode` text;
--> statement-breakpoint
ALTER TABLE `bot` ADD `follow_user_id` text;
--> statement-breakpoint
-- Add missing room_player column
ALTER TABLE `room_player` ADD `language` text;