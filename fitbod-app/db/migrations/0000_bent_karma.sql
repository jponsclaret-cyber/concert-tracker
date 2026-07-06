CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_equipment` (
	`exercise_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `equipment_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercise_muscles` (
	`exercise_id` text NOT NULL,
	`muscle_group_id` text NOT NULL,
	`is_primary` integer NOT NULL,
	PRIMARY KEY(`exercise_id`, `muscle_group_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`muscle_group_id`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mechanics_type` text NOT NULL,
	`force_type` text NOT NULL,
	`unilateral` integer DEFAULT false NOT NULL,
	`instructions` text NOT NULL,
	`rep_range_min` integer NOT NULL,
	`rep_range_max` integer NOT NULL,
	`image_url` text,
	`video_url` text
);
--> statement-breakpoint
CREATE TABLE `external_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`activity_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`duration_min` real NOT NULL,
	`active_energy_kcal` real,
	`avg_heart_rate` real,
	`distance_km` real,
	`mapped_muscle_impact` text,
	`raw_payload` text
);
--> statement-breakpoint
CREATE TABLE `muscle_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`body_region` text NOT NULL,
	`recovery_class` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `muscle_recovery_state` (
	`muscle_group_id` text PRIMARY KEY NOT NULL,
	`last_trained_at` text,
	`accumulated_fatigue` real DEFAULT 0 NOT NULL,
	`recovery_half_life_hours` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`muscle_group_id`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight_kg` real,
	`reps` integer NOT NULL,
	`rpe` real,
	`is_warmup` integer DEFAULT false NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_equipment` (
	`equipment_id` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_session_focus_muscles` (
	`session_id` text NOT NULL,
	`muscle_group_id` text NOT NULL,
	PRIMARY KEY(`session_id`, `muscle_group_id`),
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`muscle_group_id`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`source_type` text NOT NULL,
	`notes` text
);
