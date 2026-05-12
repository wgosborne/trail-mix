CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"grocery_id" uuid NOT NULL,
	"quantity_used" numeric(8, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meal_name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_user_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."user_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_grocery_id_user_grocery_inventory_id_fk" FOREIGN KEY ("grocery_id") REFERENCES "public"."user_grocery_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meals" ADD CONSTRAINT "user_meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_meal_ingredients_meal" ON "meal_ingredients" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "idx_meal_ingredients_grocery" ON "meal_ingredients" USING btree ("grocery_id");--> statement-breakpoint
CREATE INDEX "idx_meals_user" ON "user_meals" USING btree ("user_id");