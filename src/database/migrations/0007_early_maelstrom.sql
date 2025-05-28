ALTER TABLE "products" ADD COLUMN "former_codes" jsonb;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "former_code";