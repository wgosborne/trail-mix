CREATE TABLE "grocery_lookup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"calories" numeric(8, 2),
	"protein_g" numeric(7, 2),
	"carbs_g" numeric(7, 2),
	"fat_g" numeric(7, 2),
	"fiber_g" numeric(7, 2),
	"source" varchar(50) DEFAULT 'claude' NOT NULL,
	"times_used" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_grocery_lookup_name_unit" ON "grocery_lookup" USING btree ("normalized_name","unit");