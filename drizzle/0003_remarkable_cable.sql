ALTER TABLE "meal_ingredients" ALTER COLUMN "grocery_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "food_name" varchar(255);--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "unit" varchar(50);--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "calories_total" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "protein_g" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "carbs_g" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD COLUMN "fat_g" numeric(7, 2);