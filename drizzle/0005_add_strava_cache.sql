CREATE TABLE "strava_activities_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"activities" json NOT NULL,
	"week_total" json NOT NULL,
	"cached_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_grocery_inventory" ADD COLUMN "consumed_by_week" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "strava_activities_cache" ADD CONSTRAINT "strava_activities_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_strava_cache_user_week" ON "strava_activities_cache" USING btree ("user_id","week_start");