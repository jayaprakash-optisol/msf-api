CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"packing_number" integer,
	"dispatch_reference" varchar,
	"customer_receiver_code" varchar,
	"order_reference" integer,
	"transport_mode" varchar,
	"packing_status" varchar,
	"field_reference" varchar,
	"supplier_name" varchar,
	"notes" varchar,
	"message_esc1" varchar,
	"freight" varchar,
	"origin" varchar,
	"source_system" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_number" varchar,
	"parcel_from" integer,
	"parcel_to" integer,
	"total_weight" numeric(9, 3),
	"total_volume" numeric(9, 3),
	"total_number_of_parcels" integer,
	"package_weight" numeric(9, 3),
	"package_volume" numeric(9, 3),
	"first_parcel_number" integer,
	"last_parcel_number" integer,
	"parcel_quantity" integer,
	"total_height" numeric(9, 3),
	"total_length" numeric(9, 3),
	"total_width" numeric(9, 3),
	"packing_list_number" varchar(50),
	"message_esc1" varchar(255),
	"message_esc2" varchar(255),
	"source_system" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"parcel_id" uuid NOT NULL,
	"product_quantity" integer,
	"product_code" varchar,
	"expiry_date" timestamp,
	"batch_number" varchar(50),
	"weight" numeric(9, 3),
	"volume" numeric(9, 3),
	"line_number" integer,
	"external_ref" varchar(50),
	"unit_of_measure" varchar(50),
	"currency_unit" varchar(50),
	"unit_price" numeric,
	"message_esc1" varchar(255),
	"message_esc2" varchar(255),
	"comments" varchar(255),
	"contains" varchar(255),
	"source_system" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parcel_items" ADD CONSTRAINT "parcel_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_items" ADD CONSTRAINT "parcel_items_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE no action ON UPDATE no action;