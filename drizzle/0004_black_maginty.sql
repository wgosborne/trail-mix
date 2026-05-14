ALTER TABLE "meal_ingredients" ALTER COLUMN "grocery_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_grocery_inventory" ADD COLUMN "is_temporary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "food_name";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "unit";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "calories_total";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "protein_g";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "carbs_g";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "fat_g";