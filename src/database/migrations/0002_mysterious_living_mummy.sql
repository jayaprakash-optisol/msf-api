CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidata_id" uuid,
	"product_code" varchar,
	"product_description" varchar,
	"type" varchar,
	"state" varchar,
	"standardization_level" varchar,
	"free_code" varchar,
	"labels" json,
	"source_system" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
