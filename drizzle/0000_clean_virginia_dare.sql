CREATE TABLE `bots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`backend_type` text NOT NULL,
	`backend_config` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_events` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`turn` integer NOT NULL,
	`event_type` text NOT NULL,
	`event_data` text NOT NULL,
	`actor_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text,
	`bot_id` text,
	`seat` integer NOT NULL,
	`hp` integer DEFAULT 5 NOT NULL,
	`status` text DEFAULT 'alive' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`ended_at` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `replays` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `room_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text,
	`bot_id` text,
	`role` text NOT NULL,
	`joined_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`max_players` integer DEFAULT 4 NOT NULL,
	`created_by` text NOT NULL,
	`game_id` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);