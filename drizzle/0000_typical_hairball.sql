CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "user_grocery_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"food_name" varchar(255) NOT NULL,
	"quantity_bought" numeric(8, 2) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"percent_consumed" numeric(5, 2) DEFAULT '0',
	"calories_per_unit" numeric(8, 2),
	"total_calories" numeric(8, 2),
	"protein_g" numeric(7, 2),
	"carbs_g" numeric(7, 2),
	"fat_g" numeric(7, 2),
	"fiber_g" numeric(7, 2),
	"date_added" date NOT NULL,
	"week_start" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"strava_token" text,
	"strava_user_id" varchar(255),
	"strava_refresh_token" text,
	"strava_token_expires_at" timestamp,
	"daily_cal_goal" numeric(5, 0) DEFAULT '2000',
	"daily_protein_g" numeric(5, 1) DEFAULT '150',
	"daily_carbs_g" numeric(5, 1) DEFAULT '200',
	"daily_fat_g" numeric(5, 1) DEFAULT '65',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_grocery_inventory" ADD CONSTRAINT "user_grocery_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_inventory_user_week" ON "user_grocery_inventory" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE INDEX "idx_inventory_user_date" ON "user_grocery_inventory" USING btree ("user_id","date_added");