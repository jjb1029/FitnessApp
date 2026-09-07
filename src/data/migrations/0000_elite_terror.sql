CREATE TABLE `bodyweight_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weight_kg` real NOT NULL,
	`measured_at` text NOT NULL,
	`local_date` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bodyweight_user_date_idx` ON `bodyweight_entry` (`user_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `catalog_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`default_increment_kg` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment_access` (
	`user_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`location` text NOT NULL,
	`available` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `equipment_id`, `location`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercise_preference` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`reason` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_preference_user_idx` ON `exercise_preference` (`user_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aliases` text NOT NULL,
	`movement_pattern` text NOT NULL,
	`category` text NOT NULL,
	`equipment_ids` text NOT NULL,
	`laterality` text NOT NULL,
	`load_type` text NOT NULL,
	`stability` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`fatigue_cost` integer NOT NULL,
	`rep_range_default` text NOT NULL,
	`rep_range_allowed` text NOT NULL,
	`increment_kg` real NOT NULL,
	`muscles` text NOT NULL,
	`instructions` text NOT NULL,
	`progression_notes` text,
	`regression_ids` text NOT NULL,
	`alternative_ids` text NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_by_user_id` text,
	`catalog_version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercise_pattern_idx` ON `exercise` (`movement_pattern`);--> statement-breakpoint
CREATE INDEX `exercise_name_idx` ON `exercise` (`name`);--> statement-breakpoint
CREATE TABLE `goal` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`is_current` integer NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goal_user_current_idx` ON `goal` (`user_id`,`is_current`);--> statement-breakpoint
CREATE TABLE `measurement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`site` text NOT NULL,
	`value_cm` real NOT NULL,
	`measured_at` text NOT NULL,
	`local_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `measurement_user_site_idx` ON `measurement` (`user_id`,`site`,`local_date`);--> statement-breakpoint
CREATE TABLE `muscle` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`group` text NOT NULL,
	`weekly_range_min` integer NOT NULL,
	`weekly_range_max` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `performed_set` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`set_type` text DEFAULT 'working' NOT NULL,
	`load_kg` real,
	`entered_load` real,
	`entered_unit` text,
	`added_load_kg` real,
	`reps` integer NOT NULL,
	`rir` real,
	`completed_at` text NOT NULL,
	`suggested_load_kg` real,
	`suggested_reps` integer,
	`e1rm_kg` real,
	`e1rm_formula` text,
	`is_pr` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `performed_set_exercise_idx` ON `performed_set` (`session_exercise_id`,`order`);--> statement-breakpoint
CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`birth_year` integer,
	`sex` text DEFAULT 'unspecified' NOT NULL,
	`height_cm` real,
	`training_experience` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`session_minutes` integer NOT NULL,
	`training_location` text NOT NULL,
	`limitations` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `program_day` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`order` integer NOT NULL,
	`name` text NOT NULL,
	`focus_muscle_ids` text NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`is_rest` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `program_day_program_idx` ON `program_day` (`program_id`,`order`);--> statement-breakpoint
CREATE TABLE `program_template` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`catalog_version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`template_id` text,
	`split` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`goal_type` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	`explanation` text,
	`is_active` integer DEFAULT false NOT NULL,
	`started_at` text,
	`scheduling_mode` text DEFAULT 'sequential' NOT NULL,
	`weekday_map` text,
	`next_day_index` integer DEFAULT 0 NOT NULL,
	`deload_every_weeks` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `program_user_active_idx` ON `program` (`user_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `progress_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`taken_at` text NOT NULL,
	`local_date` text NOT NULL,
	`pose` text NOT NULL,
	`file_uri` text NOT NULL,
	`bodyweight_entry_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photo_user_date_idx` ON `progress_photo` (`user_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `recommendation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`explanation` text NOT NULL,
	`payload` text NOT NULL,
	`source` text DEFAULT 'engine' NOT NULL,
	`confidence` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_at` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recommendation_user_status_idx` ON `recommendation` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `recommendation_id_idx` ON `recommendation` (`id`);--> statement-breakpoint
CREATE TABLE `session_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`order` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`template_exercise_id` text,
	`substituted_from_exercise_id` text,
	`substitution_reason` text,
	`target_snapshot` text NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`skip_reason` text,
	`rest_seconds_override` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_exercise_session_idx` ON `session_exercise` (`session_id`,`order`);--> statement-breakpoint
CREATE INDEX `session_exercise_exercise_idx` ON `session_exercise` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`program_id` text,
	`program_day_id` text,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`local_date` text NOT NULL,
	`out_of_sequence` integer DEFAULT false NOT NULL,
	`modifications` text NOT NULL,
	`notes` text,
	`summary` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_user_date_idx` ON `session` (`user_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `session_status_idx` ON `session` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `template_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`program_day_id` text NOT NULL,
	`order` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`rep_range` text NOT NULL,
	`target_rir` real NOT NULL,
	`rest_seconds` integer NOT NULL,
	`progression_scheme` text DEFAULT 'double_progression' NOT NULL,
	`working_sets` integer NOT NULL,
	`notes` text,
	`superset_group` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`program_day_id`) REFERENCES `program_day`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_exercise_day_idx` ON `template_exercise` (`program_day_id`,`order`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text,
	`settings` text NOT NULL,
	`onboarding_completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
