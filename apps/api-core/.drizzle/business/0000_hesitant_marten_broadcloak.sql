-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "business_template";
--> statement-breakpoint
CREATE TABLE "business_template"."document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"doc_type" varchar(50) NOT NULL,
	"prefix" varchar(20) DEFAULT '' NOT NULL,
	"suffix" varchar(20) DEFAULT '' NOT NULL,
	"pad_length" integer DEFAULT 6 NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"reset_period" varchar(20) DEFAULT 'never' NOT NULL,
	"last_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_sequences_store_id_doc_type_key" UNIQUE("doc_type","store_id"),
	CONSTRAINT "chk_reset_period" CHECK ((reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."business_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"period_code" varchar(20) NOT NULL,
	"period_name" varchar(100) NOT NULL,
	"period_type" varchar(20) DEFAULT 'month' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_period_dates" CHECK (start_date <= end_date),
	CONSTRAINT "chk_period_type" CHECK ((period_type)::text = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'quarter'::text, 'year'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."staff_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_code" varchar(30) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"phone" varchar(30),
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"pin_hash" varchar(255),
	"position" varchar(100),
	"role" varchar(30) DEFAULT 'staff' NOT NULL,
	"department_id" uuid,
	"primary_store_id" uuid,
	"avatar_url" varchar(500),
	"contract_type" varchar(30) DEFAULT 'full_time' NOT NULL,
	"hire_date" date,
	"termination_date" date,
	"base_salary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"hourly_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"national_id" varchar(20),
	"bank_account" varchar(30),
	"bank_name" varchar(100),
	"bank_master_id" uuid,
	"employment_status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_contract_type" CHECK ((contract_type)::text = ANY (ARRAY['full_time'::text, 'part_time'::text, 'freelance'::text, 'probation'::text])),
	CONSTRAINT "chk_emp_status" CHECK ((employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'terminated'::text, 'on_leave'::text])),
	CONSTRAINT "chk_staff_members_password_not_empty" CHECK ((password_hash)::text <> ''::text),
	CONSTRAINT "chk_staff_role" CHECK ((role)::text = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'staff'::text, 'kitchen'::text, 'delivery'::text, 'inventory'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"department_code" varchar(20),
	"department_name" varchar(150) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_code" varchar(50) NOT NULL,
	"group_name" varchar(255) NOT NULL,
	"discount_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"point_multiplier" numeric(5, 2) DEFAULT '1' NOT NULL,
	"min_spend" numeric(18, 2),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_groups_group_code_key" UNIQUE("group_code")
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"address_label" varchar(100),
	"recipient_name" varchar(255),
	"phone" varchar(30),
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" varchar(100),
	"province" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_code" varchar(30) NOT NULL,
	"location_name" varchar(255) NOT NULL,
	"location_type" varchar(30) DEFAULT 'main' NOT NULL,
	"is_sellable" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_code" varchar(30) NOT NULL,
	"register_name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'closed' NOT NULL,
	"ip_address" varchar(45),
	"device_id" varchar(255),
	"current_staff_id" uuid,
	"last_open_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_register_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'closed'::text, 'maintenance'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"floor_code" varchar(50) NOT NULL,
	"floor_name" varchar(255) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floor_plans_store_id_floor_code_key" UNIQUE("floor_code","store_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."dining_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"floor_id" uuid,
	"table_code" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"pos_x" integer,
	"pos_y" integer,
	"shape" varchar(20) DEFAULT 'rectangle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_table_shape" CHECK ((shape)::text = ANY (ARRAY['rectangle'::text, 'circle'::text, 'square'::text])),
	CONSTRAINT "chk_table_status" CHECK ((status)::text = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text, 'cleaning'::text, 'inactive'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid,
	"customer_code" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"gender" varchar(10),
	"date_of_birth" date,
	"address" text,
	"tax_code" varchar(50),
	"loyalty_points" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_spent" numeric(18, 2) DEFAULT '0' NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	"last_visit_at" timestamp with time zone,
	"source" varchar(50),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_customer_gender" CHECK ((gender IS NULL) OR ((gender)::text = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
	CONSTRAINT "chk_customer_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'blacklisted'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_name" varchar(150) NOT NULL,
	"logo_url" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"unit_symbol" varchar(10),
	"unit_type" varchar(20) DEFAULT 'piece' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chk_unit_type" CHECK ((unit_type)::text = ANY (ARRAY['weight'::text, 'volume'::text, 'piece'::text, 'portion'::text, 'length'::text, 'area'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_attribute_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"input_type" varchar(20) DEFAULT 'single' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chk_input_type" CHECK ((input_type)::text = ANY (ARRAY['single'::text, 'multiple'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"value_name" varchar(100) NOT NULL,
	"extra_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."tax_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_code" varchar(20) NOT NULL,
	"tax_name" varchar(100) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tax_classes_tax_code_key" UNIQUE("tax_code")
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_name" varchar(100) NOT NULL,
	"tag_color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"slug" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"category_code" varchar(30),
	"category_name" varchar(150) NOT NULL,
	"category_type" varchar(50) DEFAULT 'product' NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"color_code" varchar(7),
	"icon_url" text,
	"slug" varchar(255),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_category_type" CHECK ((category_type)::text = ANY (ARRAY['product'::text, 'service'::text, 'combo'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"sell_price" numeric(18, 4),
	"cost_price" numeric(18, 4),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."combo_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"combo_product_id" uuid NOT NULL,
	"item_product_id" uuid NOT NULL,
	"item_variant_id" uuid,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_name" varchar(50),
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_combo_no_self_ref" CHECK (combo_product_id <> item_product_id),
	CONSTRAINT "chk_combo_qty_positive" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50) DEFAULT 'piece' NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '0' NOT NULL,
	"reserved_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"avg_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"last_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_location_id_product_id_variant_id_unit_name_key" UNIQUE("location_id","product_id","unit_name","variant_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."price_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"book_code" varchar(50),
	"book_name" varchar(150) NOT NULL,
	"book_type" varchar(30) DEFAULT 'standard' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"time_start" time,
	"time_end" time,
	"days_of_week" jsonb DEFAULT '[1,2,3,4,5,6,7]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_book_type" CHECK ((book_type)::text = ANY (ARRAY['standard'::text, 'tiered'::text, 'time_based'::text, 'customer_group'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."price_book_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_book_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50),
	"sale_price" numeric(18, 4) NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "price_book_items_price_book_id_product_id_variant_id_min_qt_key" UNIQUE("min_qty","price_book_id","product_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_code" varchar(30) NOT NULL,
	"supplier_name" varchar(255) NOT NULL,
	"contact_person" varchar(150),
	"phone" varchar(30),
	"email" varchar(255),
	"address" text,
	"tax_code" varchar(50),
	"payment_terms" integer DEFAULT 30 NOT NULL,
	"bank_account" varchar(30),
	"bank_name" varchar(100),
	"bank_master_id" uuid,
	"total_debt" numeric(18, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."stocktakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"stocktake_code" varchar(50),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_stocktake_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"po_code" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"sub_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"order_date" date DEFAULT CURRENT_DATE NOT NULL,
	"expected_date" date,
	"received_date" date,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_po_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'confirmed'::text, 'partial_received'::text, 'received'::text, 'cancelled'::text, 'closed'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."purchase_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."stocktake_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stocktake_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50) NOT NULL,
	"system_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"actual_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"variance_qty" numeric(12, 3) GENERATED ALWAYS AS ((actual_qty - system_qty)) STORED,
	"unit_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "business_template"."work_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_id" uuid,
	"staff_id" uuid NOT NULL,
	"shift_code" varchar(30) NOT NULL,
	"shift_date" date NOT NULL,
	"planned_start" timestamp with time zone,
	"planned_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"opening_cash" numeric(18, 2) DEFAULT '0' NOT NULL,
	"closing_cash" numeric(18, 2),
	"expected_cash" numeric(18, 2),
	"cash_variance" numeric(18, 2),
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_shift_status" CHECK ((status)::text = ANY (ARRAY['scheduled'::text, 'open'::text, 'closed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid,
	"min_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"max_stock" numeric(12, 3),
	"reorder_point" numeric(12, 3) DEFAULT '0' NOT NULL,
	"reorder_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"transfer_code" varchar(50) NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"approved_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"note" text,
	CONSTRAINT "chk_transfer_locations_distinct" CHECK (from_location_id <> to_location_id),
	CONSTRAINT "chk_transfer_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'shipped'::text, 'received'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."order_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"original_order_id" uuid NOT NULL,
	"return_code" varchar(50) NOT NULL,
	"return_reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"refund_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"refund_method" varchar(50),
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_return_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'completed'::text, 'rejected'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."order_return_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"return_to_stock" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."table_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"session_code" varchar(50) NOT NULL,
	"order_id" uuid,
	"party_size" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"opened_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"note" text,
	CONSTRAINT "chk_session_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'closed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."kitchen_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"ticket_code" varchar(50) NOT NULL,
	"ticket_type" varchar(20) DEFAULT 'new' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"printed_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_ticket_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
	CONSTRAINT "chk_ticket_type" CHECK ((ticket_type)::text = ANY (ARRAY['new'::text, 'modification'::text, 'cancellation'::text, 'void'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."kitchen_ticket_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid,
	"txn_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_ledger_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['purchase'::text, 'return'::text, 'point_earn'::text, 'point_redeem'::text, 'point_expire'::text, 'adjustment'::text, 'deposit'::text, 'withdrawal'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"discount_code" varchar(50) NOT NULL,
	"discount_name" varchar(255) NOT NULL,
	"discount_type" varchar(30) DEFAULT 'percentage' NOT NULL,
	"discount_value" numeric(18, 4) NOT NULL,
	"min_order_value" numeric(18, 2),
	"max_discount" numeric(18, 2),
	"apply_scope" varchar(30) DEFAULT 'order' NOT NULL,
	"start_date" date,
	"end_date" date,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_apply_scope" CHECK ((apply_scope)::text = ANY (ARRAY['order'::text, 'product'::text, 'category'::text, 'customer_group'::text])),
	CONSTRAINT "chk_discount_type" CHECK ((discount_type)::text = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'buy_x_get_y'::text, 'free_item'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"customer_name" varchar(255),
	"customer_phone" varchar(30),
	"order_id" uuid,
	"appt_code" varchar(50) NOT NULL,
	"appt_date" date NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"staff_id" uuid,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_appt_status" CHECK ((status)::text = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'in_service'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."appointment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"service_product_id" uuid NOT NULL,
	"variant_id" uuid,
	"staff_id" uuid,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"duration_mins" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."timekeeping_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"shift_id" uuid,
	"event_type" varchar(20) NOT NULL,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL,
	"method" varchar(20) DEFAULT 'manual' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"photo_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_timekeep_event" CHECK ((event_type)::text = ANY (ARRAY['check_in'::text, 'check_out'::text, 'break_start'::text, 'break_end'::text])),
	CONSTRAINT "chk_timekeep_method" CHECK ((method)::text = ANY (ARRAY['manual'::text, 'qr'::text, 'face'::text, 'pin'::text, 'gps'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"period_code" varchar(30) NOT NULL,
	"period_name" varchar(100) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"payment_date" date,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payroll_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'processing'::text, 'paid'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."payroll_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"worked_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"worked_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"base_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"allowances" numeric(15, 2) DEFAULT '0' NOT NULL,
	"bonuses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(15, 2) GENERATED ALWAYS AS ((((base_pay + allowances) + bonuses) - deductions)) STORED,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_items_period_id_staff_id_key" UNIQUE("period_id","staff_id"),
	CONSTRAINT "chk_payroll_item_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'rejected'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."cash_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"bank_master_id" uuid,
	"account_code" varchar(50) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(30) DEFAULT 'cash' NOT NULL,
	"account_number" varchar(100),
	"current_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_cash_account_type" CHECK ((account_type)::text = ANY (ARRAY['cash'::text, 'bank'::text, 'e_wallet'::text, 'credit_line'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_journal_line_sign" CHECK (((debit_amount > (0)::numeric) AND (credit_amount = (0)::numeric)) OR ((credit_amount > (0)::numeric) AND (debit_amount = (0)::numeric)))
);
--> statement-breakpoint
CREATE TABLE "business_template"."chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"account_code" varchar(20) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(30) NOT NULL,
	"normal_balance" varchar(10) DEFAULT 'debit' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chart_of_accounts_account_code_key" UNIQUE("account_code"),
	CONSTRAINT "chk_account_type" CHECK ((account_type)::text = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text, 'cogs'::text])),
	CONSTRAINT "chk_normal_balance" CHECK ((normal_balance)::text = ANY (ARRAY['debit'::text, 'credit'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_key" varchar(100) NOT NULL,
	"role_name" varchar(150) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_role_key_key" UNIQUE("role_key")
);
--> statement-breakpoint
CREATE TABLE "business_template"."role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE("permission_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_key" varchar(150) NOT NULL,
	"permission_name" varchar(150) NOT NULL,
	"module_key" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_permission_key_key" UNIQUE("permission_key")
);
--> statement-breakpoint
CREATE TABLE "business_template"."device_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_id" uuid,
	"device_identity_id" uuid NOT NULL,
	"binding_type" varchar(30) DEFAULT 'pos' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"bound_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_binding_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'unbound'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."printer_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"device_identity_id" uuid,
	"printer_code" varchar(50) NOT NULL,
	"printer_name" varchar(255) NOT NULL,
	"printer_type" varchar(30) DEFAULT 'receipt' NOT NULL,
	"connection_type" varchar(30) DEFAULT 'network' NOT NULL,
	"ip_address" varchar(45),
	"port" integer,
	"paper_width" integer DEFAULT 80 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_printer_connection" CHECK ((connection_type)::text = ANY (ARRAY['network'::text, 'usb'::text, 'bluetooth'::text, 'wifi'::text])),
	CONSTRAINT "chk_printer_type" CHECK ((printer_type)::text = ANY (ARRAY['receipt'::text, 'kitchen'::text, 'label'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"created_by_account_id" uuid,
	"asset_type" varchar(30) DEFAULT 'image' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" bigint,
	"mime_type" varchar(100),
	"storage_url" varchar(1000) NOT NULL,
	"thumbnail_url" varchar(1000),
	"ref_type" varchar(50),
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_asset_type" CHECK ((asset_type)::text = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."app_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"account_id" uuid,
	"notif_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"entry_code" varchar(50) NOT NULL,
	"entry_date" date NOT NULL,
	"entry_type" varchar(50) DEFAULT 'manual' NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"description" text,
	"total_debit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_credit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_journal_balanced" CHECK (total_debit = total_credit),
	CONSTRAINT "chk_journal_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'posted'::text, 'reversed'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."realtime_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"topic" varchar(255),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_rt_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"store_id" uuid,
	"register_id" uuid,
	"device_type" varchar(20) NOT NULL,
	"device_token" text NOT NULL,
	"environment" varchar(20) DEFAULT 'production' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_device_token_key" UNIQUE("device_token"),
	CONSTRAINT "chk_push_device" CHECK ((device_type)::text = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])),
	CONSTRAINT "chk_push_env" CHECK ((environment)::text = ANY (ARRAY['production'::text, 'sandbox'::text])),
	CONSTRAINT "chk_push_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"staff_id" uuid,
	"account_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."store_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text,
	"value_type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_configs_store_id_config_key_key" UNIQUE("config_key","store_id"),
	CONSTRAINT "chk_config_type" CHECK ((value_type)::text = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."staff_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unlinked_at" timestamp with time zone,
	CONSTRAINT "staff_account_links_staff_id_key" UNIQUE("staff_id"),
	CONSTRAINT "staff_account_links_account_id_key" UNIQUE("account_id"),
	CONSTRAINT "chk_staff_account_link_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."staff_role_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"store_id" uuid,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "staff_role_bindings_staff_id_role_id_store_id_key" UNIQUE("role_id","staff_id","store_id"),
	CONSTRAINT "chk_staff_role_binding_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."permission_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_key" varchar(150) NOT NULL,
	"scope_type" varchar(20) DEFAULT 'tenant' NOT NULL,
	"module_key" varchar(80) NOT NULL,
	"screen_key" varchar(100),
	"button_key" varchar(100),
	"action_key" varchar(100) NOT NULL,
	"permission_name" varchar(150) NOT NULL,
	"description" text,
	"risk_level" varchar(20) DEFAULT 'low' NOT NULL,
	"require_reason" boolean DEFAULT false NOT NULL,
	"require_mfa" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_definitions_permission_key_key" UNIQUE("permission_key"),
	CONSTRAINT "chk_permission_def_risk" CHECK ((risk_level)::text = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
	CONSTRAINT "chk_permission_def_scope" CHECK ((scope_type)::text = ANY (ARRAY['tenant'::text, 'store'::text, 'platform'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_id" uuid,
	"shift_id" uuid,
	"order_code" varchar(50) NOT NULL,
	"order_type" varchar(20) DEFAULT 'pos' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"cashier_id" uuid,
	"customer_id" uuid,
	"customer_name" varchar(255),
	"table_id" uuid,
	"table_name" varchar(100),
	"party_size" integer DEFAULT 1 NOT NULL,
	"sub_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"delivery_fee" numeric(18, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"change_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"loyalty_points_used" integer DEFAULT 0 NOT NULL,
	"loyalty_points_earned" integer DEFAULT 0 NOT NULL,
	"voucher_code" varchar(50),
	"note" text,
	"kitchen_note" text,
	"delivery_address" text,
	"delivery_eta" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_channel" varchar(30) DEFAULT 'pos' NOT NULL,
	"source_ref" varchar(120),
	"payment_status" varchar(30) DEFAULT 'unpaid' NOT NULL,
	"fulfillment_status" varchar(30) DEFAULT 'unfulfilled' NOT NULL,
	"inventory_status" varchar(30) DEFAULT 'not_deducted' NOT NULL,
	"debt_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"refunded_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"rounding_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"service_charge_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tip_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"external_order_id" varchar(120),
	"idempotency_key" varchar(150),
	CONSTRAINT "chk_fulfillment_status" CHECK ((fulfillment_status)::text = ANY (ARRAY['unfulfilled'::text, 'partial_fulfilled'::text, 'fulfilled'::text, 'delivering'::text, 'delivered'::text, 'failed'::text, 'returned'::text])),
	CONSTRAINT "chk_inventory_status" CHECK ((inventory_status)::text = ANY (ARRAY['not_reserved'::text, 'reserved'::text, 'not_deducted'::text, 'deducted'::text, 'partial_deducted'::text, 'restored'::text])),
	CONSTRAINT "chk_order_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'ready'::text, 'partial_paid'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text, 'partial_refund'::text])),
	CONSTRAINT "chk_order_type" CHECK ((order_type)::text = ANY (ARRAY['pos'::text, 'table'::text, 'takeaway'::text, 'delivery'::text, 'online'::text])),
	CONSTRAINT "chk_payment_status" CHECK ((payment_status)::text = ANY (ARRAY['unpaid'::text, 'partial_paid'::text, 'paid'::text, 'overpaid'::text, 'debt'::text, 'refunded'::text, 'partial_refunded'::text, 'voided'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."sales_order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"old_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"old_payment_status" varchar(30),
	"new_payment_status" varchar(30),
	"old_fulfillment_status" varchar(30),
	"new_fulfillment_status" varchar(30),
	"old_inventory_status" varchar(30),
	"new_inventory_status" varchar(30),
	"reason" text,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid,
	"receivable_code" varchar(50) NOT NULL,
	"original_amount" numeric(18, 2) NOT NULL,
	"paid_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"remaining_amount" numeric(18, 2) NOT NULL,
	"due_date" date,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receivable_amount" CHECK ((original_amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (remaining_amount >= (0)::numeric)),
	CONSTRAINT "chk_receivable_paid_le_original" CHECK (paid_amount <= original_amount),
	CONSTRAINT "chk_receivable_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'partial_paid'::text, 'paid'::text, 'overdue'::text, 'bad_debt'::text, 'cancelled'::text, 'written_off'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_order_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"adjustment_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sales_order_adjustment_type" CHECK ((adjustment_type)::text = ANY (ARRAY['discount'::text, 'surcharge'::text, 'tax_adjustment'::text, 'rounding'::text, 'delivery_fee'::text, 'service_charge'::text, 'tip'::text, 'manual_correction'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" varchar(50) NOT NULL,
	"scope_id" uuid,
	"idempotency_key" varchar(150) NOT NULL,
	"request_hash" varchar(255),
	"response_payload" jsonb,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_idempotency_scope_id" CHECK ((((scope_type)::text = 'platform'::text) AND (scope_id IS NULL)) OR (((scope_type)::text = ANY ((ARRAY['tenant'::character varying, 'store'::character varying])::text[])) AND (scope_id IS NOT NULL))),
	CONSTRAINT "chk_idempotency_scope_type" CHECK ((scope_type)::text = ANY ((ARRAY['platform'::character varying, 'tenant'::character varying, 'store'::character varying])::text[])),
	CONSTRAINT "chk_idempotency_status" CHECK ((status)::text = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_credit_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"credit_limit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"current_debt" numeric(18, 2) DEFAULT '0' NOT NULL,
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"allow_credit" boolean DEFAULT false NOT NULL,
	"credit_status" varchar(20) DEFAULT 'normal' NOT NULL,
	"last_payment_at" timestamp with time zone,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_credit_profiles_customer_id_key" UNIQUE("customer_id"),
	CONSTRAINT "chk_customer_credit_status" CHECK ((credit_status)::text = ANY (ARRAY['normal'::text, 'watchlist'::text, 'blocked'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_receivable_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"payment_code" varchar(50) NOT NULL,
	"payment_method_id" uuid,
	"amount" numeric(18, 2) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receivable_payment_amount" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_receivable_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receivable_payment_id" uuid NOT NULL,
	"receivable_id" uuid NOT NULL,
	"order_id" uuid,
	"allocated_amount" numeric(18, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receivable_allocated_amount" CHECK (allocated_amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_receivable_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receivable_id" uuid NOT NULL,
	"adjustment_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receivable_adjustment_amount" CHECK (amount > (0)::numeric),
	CONSTRAINT "chk_receivable_adjustment_type" CHECK ((adjustment_type)::text = ANY (ARRAY['write_off'::text, 'discount_settlement'::text, 'manual_correction'::text, 'bad_debt'::text, 'reopen'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."payment_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid,
	"return_id" uuid,
	"refund_code" varchar(50) NOT NULL,
	"refund_amount" numeric(18, 2) NOT NULL,
	"refund_method" varchar(50) NOT NULL,
	"transaction_ref" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_refund_amount" CHECK (refund_amount > (0)::numeric),
	CONSTRAINT "chk_payment_refund_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" varchar(50),
	"product_name" varchar(255) NOT NULL,
	"category_id" uuid,
	"brand_id" uuid,
	"tax_id" uuid,
	"unit_id" uuid,
	"sku" varchar(100),
	"barcode" varchar(100),
	"sell_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"compare_price" numeric(18, 4),
	"earn_points" integer DEFAULT 0 NOT NULL,
	"weight_gram" integer,
	"min_stock_level" numeric(12, 3),
	"slug" varchar(255),
	"short_desc" text,
	"full_desc" text,
	"image_url" varchar(500),
	"gallery_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"show_on_pos" boolean DEFAULT true NOT NULL,
	"show_online" boolean DEFAULT true NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"has_variants" boolean DEFAULT false NOT NULL,
	"product_type" varchar(30) DEFAULT 'simple' NOT NULL,
	"pos_color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_product_type" CHECK ((product_type)::text = ANY (ARRAY['simple'::text, 'variant'::text, 'combo'::text, 'service'::text, 'modifier'::text, 'ingredient'::text, 'serialized'::text, 'batch'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50),
	"barcode" varchar(100) NOT NULL,
	"barcode_type" varchar(30) DEFAULT 'ean13' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_barcodes_barcode_key" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_store_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"is_available" boolean DEFAULT true NOT NULL,
	"show_on_pos" boolean DEFAULT true NOT NULL,
	"show_online" boolean DEFAULT true NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"min_stock_level" numeric(12, 3),
	"max_stock_level" numeric(12, 3),
	"reorder_point" numeric(12, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_code" varchar(100) NOT NULL,
	"manufacture_date" date,
	"expiry_date" date,
	"supplier_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_serials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"serial_number" varchar(150) NOT NULL,
	"store_id" uuid,
	"location_id" uuid,
	"status" varchar(30) DEFAULT 'in_stock' NOT NULL,
	"purchase_order_id" uuid,
	"sales_order_id" uuid,
	"sold_at" timestamp with time zone,
	"warranty_start" date,
	"warranty_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_serials_serial_number_key" UNIQUE("serial_number"),
	CONSTRAINT "chk_serial_status" CHECK ((status)::text = ANY (ARRAY['in_stock'::text, 'reserved'::text, 'sold'::text, 'returned'::text, 'damaged'::text, 'lost'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"ingredient_product_id" uuid NOT NULL,
	"ingredient_variant_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"wastage_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_recipe_qty" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"store_id" uuid,
	"old_price" numeric(18, 4),
	"new_price" numeric(18, 4) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_cost_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"old_cost" numeric(18, 4),
	"new_cost" numeric(18, 4) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"order_id" uuid,
	"order_line_id" uuid,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid,
	"unit_name" varchar(50) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_stock_reservation_qty" CHECK (quantity > (0)::numeric),
	CONSTRAINT "chk_stock_reservation_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'consumed'::text, 'released'::text, 'expired'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_lot_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid NOT NULL,
	"unit_name" varchar(50) DEFAULT 'piece' NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '0' NOT NULL,
	"reserved_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"avg_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_payables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"payable_code" varchar(50) NOT NULL,
	"original_amount" numeric(18, 2) NOT NULL,
	"paid_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"remaining_amount" numeric(18, 2) NOT NULL,
	"due_date" date,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_supplier_payable_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'partial_paid'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'written_off'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"payment_method_id" uuid,
	"amount" numeric(18, 2) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_supplier_payment_amount" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_payment_id" uuid NOT NULL,
	"supplier_payable_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"allocated_amount" numeric(18, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_supplier_payment_alloc_amount" CHECK (allocated_amount > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."delivery_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"delivery_code" varchar(50) NOT NULL,
	"carrier_name" varchar(100),
	"shipper_id" uuid,
	"delivery_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"cod_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"delivery_fee" numeric(18, 2) DEFAULT '0' NOT NULL,
	"delivered_at" timestamp with time zone,
	"failed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_delivery_order_status" CHECK ((delivery_status)::text = ANY (ARRAY['pending'::text, 'assigned'::text, 'picked_up'::text, 'delivering'::text, 'delivered'::text, 'failed'::text, 'returned'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."report_daily_sales_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"gross_sales" numeric(18, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"refund_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_sales" numeric(18, 2) DEFAULT '0' NOT NULL,
	"cash_collected" numeric(18, 2) DEFAULT '0' NOT NULL,
	"receivable_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"cogs_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"gross_profit" numeric(18, 2) DEFAULT '0' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_daily_sales_snapshots_store_id_report_date_key" UNIQUE("report_date","store_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"request_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_approval_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"aggregate_type" varchar(50) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_event_outbox_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."offline_sync_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_id" uuid,
	"device_identity_id" uuid,
	"batch_code" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offline_sync_batches_store_id_batch_code_key" UNIQUE("batch_code","store_id"),
	CONSTRAINT "chk_offline_sync_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'synced'::text, 'failed'::text, 'conflict'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."invoice_number_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"invoice_type" varchar(30) DEFAULT 'sales_invoice' NOT NULL,
	"prefix" varchar(30) DEFAULT '' NOT NULL,
	"suffix" varchar(30) DEFAULT '' NOT NULL,
	"pad_length" integer DEFAULT 6 NOT NULL,
	"last_number" bigint DEFAULT 0 NOT NULL,
	"reset_period" varchar(20) DEFAULT 'yearly' NOT NULL,
	"last_reset_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_number_sequences_store_id_invoice_type_key" UNIQUE("invoice_type","store_id"),
	CONSTRAINT "chk_invoice_seq_reset" CHECK ((reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"order_id" uuid,
	"invoice_code" varchar(60) NOT NULL,
	"invoice_type" varchar(30) DEFAULT 'standard' NOT NULL,
	"invoice_status" varchar(30) DEFAULT 'draft' NOT NULL,
	"issued_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"buyer_name" varchar(255),
	"buyer_tax_code" varchar(50),
	"buyer_address" text,
	"buyer_email" varchar(255),
	"sub_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"external_invoice_id" varchar(120),
	"external_invoice_url" text,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_invoice_code_key" UNIQUE("invoice_code"),
	CONSTRAINT "chk_sales_invoice_status" CHECK ((invoice_status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'adjusted'::text, 'replaced'::text])),
	CONSTRAINT "chk_sales_invoice_type" CHECK ((invoice_type)::text = ANY (ARRAY['standard'::text, 'replacement'::text, 'adjustment'::text, 'consolidated'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"order_line_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_name" varchar(50),
	"unit_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_invoice_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"tax_code" varchar(30) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxable_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"invoice_id" uuid,
	"order_id" uuid,
	"credit_note_code" varchar(60) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"issued_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_credit_note_code_key" UNIQUE("credit_note_code"),
	CONSTRAINT "chk_credit_note_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'applied'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."credit_note_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"invoice_line_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."debit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"invoice_id" uuid,
	"debit_note_code" varchar(60) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"issued_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debit_notes_debit_note_code_key" UNIQUE("debit_note_code"),
	CONSTRAINT "chk_debit_note_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'applied'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."tax_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"period_code" varchar(30) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"output_tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"input_tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_tax_report_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'closed'::text, 'reopened'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."cash_drawer_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"register_id" uuid,
	"shift_id" uuid,
	"cash_account_id" uuid,
	"movement_code" varchar(50) NOT NULL,
	"movement_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"reason" text,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_cash_drawer_amount" CHECK (amount >= (0)::numeric),
	CONSTRAINT "chk_cash_drawer_movement_type" CHECK ((movement_type)::text = ANY (ARRAY['open_cash'::text, 'sale_cash_in'::text, 'refund_cash_out'::text, 'paid_in'::text, 'paid_out'::text, 'cash_drop'::text, 'safe_transfer'::text, 'close_cash'::text, 'adjustment'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."shift_payment_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"payment_method_id" uuid,
	"method_code" varchar(50) NOT NULL,
	"expected_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"counted_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"variance_amount" numeric(18, 2) GENERATED ALWAYS AS ((counted_amount - expected_amount)) STORED,
	"order_count" integer DEFAULT 0 NOT NULL,
	"refund_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_payment_summaries_shift_id_method_code_key" UNIQUE("method_code","shift_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."shift_cash_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"denomination_id" uuid,
	"quantity" integer DEFAULT 0 NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"counted_by" uuid,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."cash_denominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency_code" char(3) DEFAULT 'VND' NOT NULL,
	"denomination_value" numeric(18, 2) NOT NULL,
	"denomination_name" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "cash_denominations_currency_code_denomination_value_key" UNIQUE("currency_code","denomination_value")
);
--> statement-breakpoint
CREATE TABLE "business_template"."bank_statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"cash_account_id" uuid,
	"import_code" varchar(60) NOT NULL,
	"file_name" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"imported_by" uuid,
	"imported_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_statement_imports_import_code_key" UNIQUE("import_code"),
	CONSTRAINT "chk_bank_statement_import_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid,
	"cash_account_id" uuid,
	"transaction_ref" varchar(255),
	"transaction_time" timestamp with time zone NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"description" text,
	"counterparty_account" varchar(100),
	"counterparty_name" varchar(255),
	"match_status" varchar(20) DEFAULT 'unmatched' NOT NULL,
	"matched_ref_type" varchar(50),
	"matched_ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bank_txn_direction" CHECK ((direction)::text = ANY (ARRAY['in'::text, 'out'::text])),
	CONSTRAINT "chk_bank_txn_match_status" CHECK ((match_status)::text = ANY (ARRAY['unmatched'::text, 'matched'::text, 'ignored'::text, 'duplicate'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."payment_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"reconciliation_code" varchar(60) NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"expected_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"variance_amount" numeric(18, 2) GENERATED ALWAYS AS ((actual_amount - expected_amount)) STORED,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reconciliations_reconciliation_code_key" UNIQUE("reconciliation_code"),
	CONSTRAINT "chk_payment_recon_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'matched'::text, 'variance'::text, 'closed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."payment_reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_id" uuid NOT NULL,
	"order_payment_id" uuid,
	"bank_transaction_id" uuid,
	"expected_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"match_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_recon_item_status" CHECK ((match_status)::text = ANY (ARRAY['pending'::text, 'matched'::text, 'variance'::text, 'ignored'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."bank_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"from_cash_account_id" uuid,
	"to_cash_account_id" uuid,
	"deposit_code" varchar(60) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"deposited_by" uuid,
	"deposited_at" timestamp with time zone,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_deposits_deposit_code_key" UNIQUE("deposit_code"),
	CONSTRAINT "chk_bank_deposit_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'deposited'::text, 'confirmed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"supplier_return_code" varchar(60) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"return_reason" text,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"refund_method" varchar(50),
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_returns_supplier_return_code_key" UNIQUE("supplier_return_code"),
	CONSTRAINT "chk_supplier_return_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'approved'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_return_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_return_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid,
	"unit_name" varchar(50) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	CONSTRAINT "chk_supplier_return_qty" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."supplier_credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_return_id" uuid,
	"credit_note_code" varchar(60) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"applied_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_credit_notes_credit_note_code_key" UNIQUE("credit_note_code"),
	CONSTRAINT "chk_supplier_credit_note_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'partial_applied'::text, 'applied'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."receiving_discrepancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"expected_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"received_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discrepancy_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receiving_discrepancy_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'resolved'::text, 'ignored'::text])),
	CONSTRAINT "chk_receiving_discrepancy_type" CHECK ((discrepancy_type)::text = ANY (ARRAY['shortage'::text, 'overage'::text, 'damaged'::text, 'wrong_item'::text, 'quality_issue'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."inventory_cost_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid,
	"source_ref_type" varchar(50),
	"source_ref_id" uuid,
	"quantity_in" numeric(18, 4) DEFAULT '0' NOT NULL,
	"quantity_remaining" numeric(18, 4) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_cost_layer_qty" CHECK ((quantity_in >= (0)::numeric) AND (quantity_remaining >= (0)::numeric))
);
--> statement-breakpoint
CREATE TABLE "business_template"."cogs_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"cost_layer_id" uuid,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_cogs_alloc_cost_nonneg" CHECK ((unit_cost >= (0)::numeric) AND (total_cost >= (0)::numeric)),
	CONSTRAINT "chk_cogs_alloc_qty" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."landed_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"landed_cost_code" varchar(60) NOT NULL,
	"cost_type" varchar(50) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"allocation_method" varchar(30) DEFAULT 'by_value' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landed_costs_landed_cost_code_key" UNIQUE("landed_cost_code"),
	CONSTRAINT "chk_landed_cost_alloc_method" CHECK ((allocation_method)::text = ANY (ARRAY['by_value'::text, 'by_quantity'::text, 'by_weight'::text, 'manual'::text])),
	CONSTRAINT "chk_landed_cost_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'allocated'::text, 'posted'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."landed_cost_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landed_cost_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"cost_layer_id" uuid,
	"allocated_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."inventory_cost_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"old_unit_cost" numeric(18, 4),
	"new_unit_cost" numeric(18, 4) NOT NULL,
	"quantity_affected" numeric(18, 4),
	"reason" text NOT NULL,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_valuation_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"location_id" uuid,
	"snapshot_date" date NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" numeric(18, 4) DEFAULT '0' NOT NULL,
	"avg_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_valuation_snapshots_location_id_snapshot_date_product_key" UNIQUE("location_id","product_id","snapshot_date","variant_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_code" varchar(50) NOT NULL,
	"channel_name" varchar(150) NOT NULL,
	"channel_type" varchar(30) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_channels_channel_code_key" UNIQUE("channel_code"),
	CONSTRAINT "chk_sales_channel_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'error'::text])),
	CONSTRAINT "chk_sales_channel_type" CHECK ((channel_type)::text = ANY (ARRAY['pos'::text, 'website'::text, 'marketplace'::text, 'social'::text, 'api'::text, 'manual'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."channel_product_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"external_product_id" varchar(150) NOT NULL,
	"external_variant_id" varchar(150),
	"external_sku" varchar(150),
	"sync_status" varchar(20) DEFAULT 'synced' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_product_mappings_channel_id_external_product_id_ext_key" UNIQUE("channel_id","external_product_id","external_variant_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."channel_order_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"order_id" uuid,
	"external_order_id" varchar(150) NOT NULL,
	"external_order_status" varchar(80),
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	CONSTRAINT "channel_order_mappings_channel_id_external_order_id_key" UNIQUE("channel_id","external_order_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"total_items" integer DEFAULT 0 NOT NULL,
	"success_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sync_job_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sync_job_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_job_id" uuid NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"external_id" varchar(150),
	"status" varchar(20) NOT NULL,
	"message" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."webhook_inbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_event_id" varchar(150),
	"event_type" varchar(100) NOT NULL,
	"signature" varchar(500),
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_inbox_source_type_source_event_id_key" UNIQUE("source_event_id","source_type"),
	CONSTRAINT "chk_webhook_inbox_status" CHECK ((processing_status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'ignored'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."external_event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"external_id" varchar(150),
	"direction" varchar(10) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_external_event_direction" CHECK ((direction)::text = ANY (ARRAY['in'::text, 'out'::text])),
	CONSTRAINT "chk_external_event_status" CHECK ((status)::text = ANY (ARRAY['success'::text, 'failed'::text, 'retrying'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"order_line_id" uuid,
	"product_id" uuid,
	"variant_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	CONSTRAINT "chk_shipment_item_qty" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"carrier_id" uuid,
	"shipment_code" varchar(60) NOT NULL,
	"tracking_number" varchar(150),
	"shipment_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"recipient_name" varchar(255),
	"recipient_phone" varchar(30),
	"shipping_address" text,
	"cod_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"shipping_fee" numeric(18, 2) DEFAULT '0' NOT NULL,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_shipment_code_key" UNIQUE("shipment_code"),
	CONSTRAINT "chk_shipment_status" CHECK ((shipment_status)::text = ANY (ARRAY['pending'::text, 'packed'::text, 'shipped'::text, 'in_transit'::text, 'delivered'::text, 'failed'::text, 'returned'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."shipping_carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_code" varchar(50) NOT NULL,
	"carrier_name" varchar(150) NOT NULL,
	"carrier_type" varchar(30) DEFAULT 'internal' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_carriers_carrier_code_key" UNIQUE("carrier_code"),
	CONSTRAINT "chk_shipping_carrier_type" CHECK ((carrier_type)::text = ANY (ARRAY['internal'::text, 'third_party'::text, 'marketplace'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."shipment_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"package_code" varchar(80) NOT NULL,
	"weight_gram" integer,
	"length_cm" numeric(10, 2),
	"width_cm" numeric(10, 2),
	"height_cm" numeric(10, 2),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."shipment_tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"event_code" varchar(80),
	"event_status" varchar(50) NOT NULL,
	"event_message" text,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"attempt_status" varchar(30) NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"note" text,
	CONSTRAINT "chk_delivery_attempt_status" CHECK ((attempt_status)::text = ANY (ARRAY['success'::text, 'failed'::text, 'rescheduled'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."cod_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" uuid,
	"reconciliation_code" varchar(80) NOT NULL,
	"period_start" date,
	"period_end" date,
	"expected_cod_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"received_cod_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"fee_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "cod_reconciliations_reconciliation_code_key" UNIQUE("reconciliation_code"),
	CONSTRAINT "chk_cod_recon_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'matched'::text, 'variance'::text, 'closed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."loyalty_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_code" varchar(50) NOT NULL,
	"program_name" varchar(150) NOT NULL,
	"earn_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"redeem_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_programs_program_code_key" UNIQUE("program_code"),
	CONSTRAINT "chk_loyalty_program_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."loyalty_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_code" varchar(50) NOT NULL,
	"tier_name" varchar(100) NOT NULL,
	"min_spend" numeric(18, 2) DEFAULT '0' NOT NULL,
	"point_multiplier" numeric(10, 2) DEFAULT '1' NOT NULL,
	"benefits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "loyalty_tiers_tier_code_key" UNIQUE("tier_code")
);
--> statement-breakpoint
CREATE TABLE "business_template"."loyalty_point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid,
	"txn_type" varchar(30) NOT NULL,
	"points" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"expires_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loyalty_point_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['earn'::text, 'redeem'::text, 'expire'::text, 'adjust'::text, 'refund_reverse'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."voucher_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_code" varchar(60) NOT NULL,
	"batch_name" varchar(150) NOT NULL,
	"voucher_type" varchar(30) NOT NULL,
	"discount_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_batches_batch_code_key" UNIQUE("batch_code"),
	CONSTRAINT "chk_voucher_batch_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_batch_id" uuid,
	"customer_id" uuid,
	"voucher_code" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"used_order_id" uuid,
	"used_at" timestamp with time zone,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_vouchers_voucher_code_key" UNIQUE("voucher_code"),
	CONSTRAINT "chk_customer_voucher_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_card_code" varchar(80) NOT NULL,
	"customer_id" uuid,
	"initial_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_gift_card_code_key" UNIQUE("gift_card_code"),
	CONSTRAINT "chk_gift_card_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'cancelled'::text, 'blocked'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."gift_card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"txn_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_gift_card_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['issue'::text, 'redeem'::text, 'refund'::text, 'adjust'::text, 'expire'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"balance" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_wallets_customer_id_key" UNIQUE("customer_id"),
	CONSTRAINT "chk_customer_wallet_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'blocked'::text, 'closed'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"txn_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wallet_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['topup'::text, 'payment'::text, 'refund'::text, 'adjust'::text, 'expire'::text, 'withdraw'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_code" varchar(50) NOT NULL,
	"tag_name" varchar(100) NOT NULL,
	"tag_color" varchar(7) DEFAULT '#6366f1',
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "customer_tags_tag_code_key" UNIQUE("tag_code")
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_code" varchar(50) NOT NULL,
	"segment_name" varchar(150) NOT NULL,
	"segment_type" varchar(20) DEFAULT 'dynamic' NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_segments_segment_code_key" UNIQUE("segment_code"),
	CONSTRAINT "chk_customer_segment_type" CHECK ((segment_type)::text = ANY (ARRAY['static'::text, 'dynamic'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"service_order_code" varchar(60) NOT NULL,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promised_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"assigned_staff_id" uuid,
	"problem_description" text,
	"internal_note" text,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_orders_service_order_code_key" UNIQUE("service_order_code"),
	CONSTRAINT "chk_service_order_priority" CHECK ((priority)::text = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
	CONSTRAINT "chk_service_order_status" CHECK ((status)::text = ANY (ARRAY['new'::text, 'diagnosing'::text, 'waiting_parts'::text, 'in_service'::text, 'completed'::text, 'cancelled'::text, 'returned'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid,
	"interaction_type" varchar(50) NOT NULL,
	"subject" varchar(255),
	"content" text,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"channel" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'granted' NOT NULL,
	"source" varchar(50),
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_consents_customer_id_consent_type_channel_key" UNIQUE("channel","consent_type","customer_id"),
	CONSTRAINT "chk_customer_consent_channel" CHECK ((channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])),
	CONSTRAINT "chk_customer_consent_status" CHECK ((status)::text = ANY (ARRAY['granted'::text, 'revoked'::text, 'unknown'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_contact_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" varchar(30) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_contact_preferences_customer_id_channel_key" UNIQUE("channel","customer_id"),
	CONSTRAINT "chk_contact_preference_channel" CHECK ((channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])),
	CONSTRAINT "chk_contact_preference_quiet_hours" CHECK ((quiet_hours_start IS NULL) OR (quiet_hours_end IS NULL) OR (quiet_hours_start <> quiet_hours_end))
);
--> statement-breakpoint
CREATE TABLE "business_template"."campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_code" varchar(60) NOT NULL,
	"campaign_name" varchar(150) NOT NULL,
	"campaign_type" varchar(30) NOT NULL,
	"target_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_campaign_code_key" UNIQUE("campaign_code"),
	CONSTRAINT "chk_campaign_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'scheduled'::text, 'running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."campaign_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"customer_id" uuid,
	"channel" varchar(30) NOT NULL,
	"recipient" varchar(255),
	"message_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_campaign_message_channel" CHECK ((channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])),
	CONSTRAINT "chk_campaign_message_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_merge_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_customer_id" uuid NOT NULL,
	"duplicate_customer_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"requested_by" uuid,
	"approved_by" uuid,
	"merged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_customer_merge_distinct" CHECK (primary_customer_id <> duplicate_customer_id),
	CONSTRAINT "chk_customer_merge_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'merged'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."service_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"service_product_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."package_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"remaining_sessions" integer DEFAULT 0 NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_package_remaining_nonneg" CHECK ((used_sessions >= 0) AND (remaining_sessions >= 0) AND ((used_sessions + remaining_sessions) <= (total_sessions + 999))),
	CONSTRAINT "chk_package_usage_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'used_up'::text, 'expired'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."warranty_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"policy_name" varchar(150) NOT NULL,
	"warranty_months" integer DEFAULT 0 NOT NULL,
	"terms" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."warranty_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"sales_order_id" uuid,
	"product_id" uuid,
	"serial_id" uuid,
	"service_order_id" uuid,
	"claim_code" varchar(60) NOT NULL,
	"status" varchar(30) DEFAULT 'submitted' NOT NULL,
	"issue_description" text,
	"resolution" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "warranty_claims_claim_code_key" UNIQUE("claim_code"),
	CONSTRAINT "chk_warranty_claim_status" CHECK ((status)::text = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text, 'repairing'::text, 'resolved'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."service_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_code" varchar(60) NOT NULL,
	"package_name" varchar(150) NOT NULL,
	"product_id" uuid,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"valid_days" integer,
	"price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_packages_package_code_key" UNIQUE("package_code")
);
--> statement-breakpoint
CREATE TABLE "business_template"."kitchen_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"station_code" varchar(50) NOT NULL,
	"station_name" varchar(150) NOT NULL,
	"station_type" varchar(30) DEFAULT 'kitchen' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_stations_store_id_station_code_key" UNIQUE("station_code","store_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid,
	"production_code" varchar(60) NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"planned_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"produced_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"planned_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_orders_production_code_key" UNIQUE("production_code"),
	CONSTRAINT "chk_production_order_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."production_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_order_id" uuid NOT NULL,
	"ingredient_product_id" uuid NOT NULL,
	"ingredient_variant_id" uuid,
	"required_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"consumed_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"unit_name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."ingredient_consumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid,
	"order_line_id" uuid,
	"production_order_id" uuid,
	"ingredient_product_id" uuid NOT NULL,
	"ingredient_variant_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"stock_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."prep_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"batch_code" varchar(80) NOT NULL,
	"produced_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"remaining_qty" numeric(18, 4) DEFAULT '0' NOT NULL,
	"prepared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "prep_batches_batch_code_key" UNIQUE("batch_code"),
	CONSTRAINT "chk_prep_batch_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'used_up'::text, 'expired'::text, 'discarded'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."menu_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"available_status" varchar(20) DEFAULT 'available' NOT NULL,
	"reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_availability_store_id_product_id_variant_id_key" UNIQUE("product_id","store_id","variant_id"),
	CONSTRAINT "chk_menu_availability_status" CHECK ((available_status)::text = ANY (ARRAY['available'::text, 'sold_out'::text, 'hidden'::text, 'limited'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."period_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"lock_type" varchar(30) DEFAULT 'business' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" varchar(20) DEFAULT 'locked' NOT NULL,
	"locked_by" uuid,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unlocked_by" uuid,
	"unlocked_at" timestamp with time zone,
	"reason" text,
	CONSTRAINT "chk_period_lock_dates" CHECK (period_start <= period_end),
	CONSTRAINT "chk_period_lock_status" CHECK ((status)::text = ANY (ARRAY['locked'::text, 'unlocked'::text, 'reopened'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."closing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"closing_code" varchar(60) NOT NULL,
	"closing_type" varchar(30) DEFAULT 'daily' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "closing_runs_closing_code_key" UNIQUE("closing_code"),
	CONSTRAINT "chk_closing_run_status" CHECK ((status)::text = ANY (ARRAY['draft'::text, 'running'::text, 'completed'::text, 'failed'::text, 'reopened'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."closing_run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closing_run_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"result_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_template"."reopen_period_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"period_lock_id" uuid,
	"reason" text NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "chk_reopen_request_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."waste_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid,
	"quantity" numeric(18, 4) NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"waste_reason" varchar(80) NOT NULL,
	"stock_transaction_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_waste_qty" CHECK (quantity > (0)::numeric),
	CONSTRAINT "chk_waste_reason" CHECK ((waste_reason)::text = ANY (ARRAY['spoilage'::text, 'expired'::text, 'damaged'::text, 'prep_loss'::text, 'customer_discard'::text, 'breakage'::text, 'contamination'::text, 'quality_issue'::text, 'other'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."role_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid,
	"role_id" uuid,
	"store_id" uuid,
	"action" varchar(30) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_role_change_action" CHECK ((action)::text = ANY (ARRAY['grant'::text, 'revoke'::text, 'expire'::text, 'restore'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."permission_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid,
	"permission_id" uuid,
	"action" varchar(30) NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_permission_change_action" CHECK ((action)::text = ANY (ARRAY['grant'::text, 'revoke'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_method_id" uuid,
	"method_code" varchar(50) NOT NULL,
	"method_name" varchar(255) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"tender_amount" numeric(18, 2),
	"change_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"transaction_ref" varchar(255),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(100),
	CONSTRAINT "chk_order_payment_amount_positive" CHECK (amount > (0)::numeric),
	CONSTRAINT "chk_payment_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."temporary_permission_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"permission_key" varchar(150) NOT NULL,
	"store_id" uuid,
	"reason" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "chk_temp_perm_dates" CHECK (expires_at > granted_at),
	CONSTRAINT "chk_temp_perm_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name" varchar(255),
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_name" varchar(50) DEFAULT 'piece' NOT NULL,
	"unit_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"cost_price" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"modifiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"kitchen_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_kitchen_status" CHECK ((kitchen_status)::text = ANY (ARRAY['pending'::text, 'sent'::text, 'cooking'::text, 'ready'::text, 'served'::text, 'cancelled'::text])),
	CONSTRAINT "chk_sol_quantity_positive" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "business_template"."purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50) NOT NULL,
	"ordered_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"received_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(18, 2) DEFAULT '0' NOT NULL,
	"note" text,
	CONSTRAINT "chk_po_line_qty_nonnegative" CHECK ((ordered_qty >= (0)::numeric) AND (received_qty >= (0)::numeric))
);
--> statement-breakpoint
CREATE TABLE "business_template"."stock_transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50) NOT NULL,
	"requested_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"shipped_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"received_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"note" text,
	CONSTRAINT "chk_transfer_item_qty_nonnegative" CHECK ((requested_qty >= (0)::numeric) AND (shipped_qty >= (0)::numeric) AND (received_qty >= (0)::numeric))
);
--> statement-breakpoint
CREATE TABLE "business_template"."cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"cash_account_id" uuid NOT NULL,
	"txn_code" varchar(50) NOT NULL,
	"txn_type" varchar(30) NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_cash_txn_amount_positive" CHECK (amount > (0)::numeric),
	CONSTRAINT "chk_cash_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['sale_in'::text, 'purchase_out'::text, 'return_in'::text, 'return_out'::text, 'deposit'::text, 'withdrawal'::text, 'transfer_in'::text, 'transfer_out'::text, 'expense'::text, 'adjustment'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."cash_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."stock_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_name" varchar(50) DEFAULT 'piece' NOT NULL,
	"txn_type" varchar(30) NOT NULL,
	"ref_type" varchar(50),
	"ref_id" uuid,
	"ref_code" varchar(50),
	"quantity" numeric(18, 4) NOT NULL,
	"unit_cost" numeric(18, 4),
	"total_cost" numeric(18, 4),
	"balance_after" numeric(18, 4),
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lot_id" uuid,
	CONSTRAINT "chk_stock_txn_quantity_positive" CHECK (quantity > (0)::numeric),
	CONSTRAINT "chk_stock_txn_type" CHECK ((txn_type)::text = ANY (ARRAY['purchase_in'::text, 'return_in'::text, 'transfer_in'::text, 'adjustment_in'::text, 'production_in'::text, 'opening_balance'::text, 'sale_out'::text, 'return_out'::text, 'transfer_out'::text, 'adjustment_out'::text, 'production_out'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"method_code" varchar(50) NOT NULL,
	"method_name" varchar(255) NOT NULL,
	"method_type" varchar(30) DEFAULT 'cash' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_method_type" CHECK ((method_type)::text = ANY (ARRAY['cash'::text, 'card'::text, 'qr_code'::text, 'bank_transfer'::text, 'e_wallet'::text, 'loyalty_point'::text, 'credit'::text, 'voucher'::text, 'other'::text]))
);
--> statement-breakpoint
ALTER TABLE "business_template"."payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_template"."stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"store_code" varchar(30) NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"store_type" varchar(30) DEFAULT 'retail' NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"address" text,
	"district" varchar(100),
	"city" varchar(100),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"timezone" varchar(50) DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"open_time" time,
	"close_time" time,
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_store_code_key" UNIQUE("store_code"),
	CONSTRAINT "chk_store_type" CHECK ((store_type)::text = ANY (ARRAY['retail'::text, 'warehouse'::text, 'office'::text, 'kiosk'::text, 'fnb'::text]))
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_tag_mappings" (
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "product_tag_mappings_pkey" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."customer_tag_mappings" (
	"customer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tag_mappings_pkey" PRIMARY KEY("customer_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "business_template"."product_units" (
	"product_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"conversion_factor" numeric(10, 4) DEFAULT '1' NOT NULL,
	"is_base_unit" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_units_pkey" PRIMARY KEY("product_id","unit_id")
);
--> statement-breakpoint
ALTER TABLE "business_template"."staff_members" ADD CONSTRAINT "staff_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "business_template"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_members" ADD CONSTRAINT "staff_members_primary_store_id_fkey" FOREIGN KEY ("primary_store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."departments" ADD CONSTRAINT "fk_dept_parent" FOREIGN KEY ("parent_id") REFERENCES "business_template"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_locations" ADD CONSTRAINT "stock_locations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."registers" ADD CONSTRAINT "registers_current_staff_id_fkey" FOREIGN KEY ("current_staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."registers" ADD CONSTRAINT "registers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."floor_plans" ADD CONSTRAINT "floor_plans_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."dining_tables" ADD CONSTRAINT "dining_tables_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "business_template"."floor_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."dining_tables" ADD CONSTRAINT "dining_tables_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customers" ADD CONSTRAINT "customers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "business_template"."customer_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_attribute_values" ADD CONSTRAINT "product_attribute_values_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "business_template"."product_attribute_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_categories" ADD CONSTRAINT "fk_category_parent" FOREIGN KEY ("parent_id") REFERENCES "business_template"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."combo_items" ADD CONSTRAINT "combo_items_combo_product_id_fkey" FOREIGN KEY ("combo_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."combo_items" ADD CONSTRAINT "combo_items_item_product_id_fkey" FOREIGN KEY ("item_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."combo_items" ADD CONSTRAINT "fk_combo_items_variant" FOREIGN KEY ("item_variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_balances" ADD CONSTRAINT "fk_stock_balances_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_balances" ADD CONSTRAINT "stock_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_balances" ADD CONSTRAINT "stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."price_book_items" ADD CONSTRAINT "fk_price_book_items_book" FOREIGN KEY ("price_book_id") REFERENCES "business_template"."price_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."price_book_items" ADD CONSTRAINT "fk_price_book_items_product" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."price_book_items" ADD CONSTRAINT "fk_price_book_items_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stocktakes" ADD CONSTRAINT "stocktakes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stocktakes" ADD CONSTRAINT "stocktakes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stocktake_items" ADD CONSTRAINT "fk_stocktake_items_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stocktake_items" ADD CONSTRAINT "stocktake_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stocktake_items" ADD CONSTRAINT "stocktake_items_stocktake_id_fkey" FOREIGN KEY ("stocktake_id") REFERENCES "business_template"."stocktakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."work_shifts" ADD CONSTRAINT "work_shifts_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "business_template"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."work_shifts" ADD CONSTRAINT "work_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."work_shifts" ADD CONSTRAINT "work_shifts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_rules" ADD CONSTRAINT "fk_stock_rules_location" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_rules" ADD CONSTRAINT "fk_stock_rules_product" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfers" ADD CONSTRAINT "stock_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfers" ADD CONSTRAINT "stock_transfers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfers" ADD CONSTRAINT "stock_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_returns" ADD CONSTRAINT "order_returns_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_returns" ADD CONSTRAINT "order_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_return_lines" ADD CONSTRAINT "fk_order_return_lines_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_return_lines" ADD CONSTRAINT "order_return_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_return_lines" ADD CONSTRAINT "order_return_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_return_lines" ADD CONSTRAINT "order_return_lines_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "business_template"."order_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."table_sessions" ADD CONSTRAINT "table_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."table_sessions" ADD CONSTRAINT "table_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."table_sessions" ADD CONSTRAINT "table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "business_template"."dining_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."kitchen_ticket_lines" ADD CONSTRAINT "kitchen_ticket_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."kitchen_ticket_lines" ADD CONSTRAINT "kitchen_ticket_lines_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "business_template"."kitchen_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_ledgers" ADD CONSTRAINT "customer_ledgers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_ledgers" ADD CONSTRAINT "fk_customer_ledgers_created_by" FOREIGN KEY ("created_by") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_ledgers" ADD CONSTRAINT "fk_customer_ledgers_store" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointments" ADD CONSTRAINT "appointments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointments" ADD CONSTRAINT "fk_appointments_order" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointments" ADD CONSTRAINT "fk_appointments_staff" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointment_lines" ADD CONSTRAINT "appointment_lines_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "business_template"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointment_lines" ADD CONSTRAINT "appointment_lines_service_product_id_fkey" FOREIGN KEY ("service_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointment_lines" ADD CONSTRAINT "fk_appointment_lines_staff" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."appointment_lines" ADD CONSTRAINT "fk_appointment_lines_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."timekeeping_logs" ADD CONSTRAINT "timekeeping_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "business_template"."work_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."timekeeping_logs" ADD CONSTRAINT "timekeeping_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."timekeeping_logs" ADD CONSTRAINT "timekeeping_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payroll_periods" ADD CONSTRAINT "fk_payroll_periods_store" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payroll_items" ADD CONSTRAINT "payroll_items_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "business_template"."payroll_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payroll_items" ADD CONSTRAINT "payroll_items_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_accounts" ADD CONSTRAINT "fk_cash_accounts_bank" FOREIGN KEY ("bank_master_id") REFERENCES "platform"."bank_master"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_accounts" ADD CONSTRAINT "fk_cash_accounts_store" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "business_template"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."journal_lines" ADD CONSTRAINT "journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "business_template"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."chart_of_accounts" ADD CONSTRAINT "fk_coa_parent" FOREIGN KEY ("parent_id") REFERENCES "business_template"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "business_template"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "business_template"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."device_bindings" ADD CONSTRAINT "device_bindings_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "business_template"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."device_bindings" ADD CONSTRAINT "device_bindings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."device_bindings" ADD CONSTRAINT "fk_db_device_identity" FOREIGN KEY ("device_identity_id") REFERENCES "platform"."device_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."printer_devices" ADD CONSTRAINT "printer_devices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."journal_entries" ADD CONSTRAINT "journal_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_account_links" ADD CONSTRAINT "staff_account_links_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_account_links" ADD CONSTRAINT "staff_account_links_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_role_bindings" ADD CONSTRAINT "staff_role_bindings_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "business_template"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_role_bindings" ADD CONSTRAINT "staff_role_bindings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."staff_role_bindings" ADD CONSTRAINT "staff_role_bindings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "fk_so_table" FOREIGN KEY ("table_id") REFERENCES "business_template"."dining_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "sales_orders_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "sales_orders_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "business_template"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "sales_orders_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "business_template"."work_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_orders" ADD CONSTRAINT "sales_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_order_status_history" ADD CONSTRAINT "sales_order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivables" ADD CONSTRAINT "customer_receivables_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivables" ADD CONSTRAINT "customer_receivables_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivables" ADD CONSTRAINT "customer_receivables_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_order_adjustments" ADD CONSTRAINT "sales_order_adjustments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_credit_profiles" ADD CONSTRAINT "customer_credit_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_payments" ADD CONSTRAINT "customer_receivable_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_payments" ADD CONSTRAINT "customer_receivable_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "business_template"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_payments" ADD CONSTRAINT "customer_receivable_payments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_allocations" ADD CONSTRAINT "customer_receivable_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_allocations" ADD CONSTRAINT "customer_receivable_allocations_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "business_template"."customer_receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_allocations" ADD CONSTRAINT "customer_receivable_allocations_receivable_payment_id_fkey" FOREIGN KEY ("receivable_payment_id") REFERENCES "business_template"."customer_receivable_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_receivable_adjustments" ADD CONSTRAINT "customer_receivable_adjustments_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "business_template"."customer_receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_refunds" ADD CONSTRAINT "payment_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "business_template"."order_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_refunds" ADD CONSTRAINT "payment_refunds_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "business_template"."order_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "business_template"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "business_template"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."products" ADD CONSTRAINT "products_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "business_template"."tax_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "business_template"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_barcodes" ADD CONSTRAINT "product_barcodes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_store_settings" ADD CONSTRAINT "product_store_settings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_store_settings" ADD CONSTRAINT "product_store_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_store_settings" ADD CONSTRAINT "product_store_settings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_lots" ADD CONSTRAINT "product_lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_lots" ADD CONSTRAINT "product_lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_lots" ADD CONSTRAINT "product_lots_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_serials" ADD CONSTRAINT "product_serials_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_serials" ADD CONSTRAINT "product_serials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_serials" ADD CONSTRAINT "product_serials_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_serials" ADD CONSTRAINT "product_serials_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_recipes" ADD CONSTRAINT "product_recipes_ingredient_product_id_fkey" FOREIGN KEY ("ingredient_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_recipes" ADD CONSTRAINT "product_recipes_ingredient_variant_id_fkey" FOREIGN KEY ("ingredient_variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_recipes" ADD CONSTRAINT "product_recipes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_price_history" ADD CONSTRAINT "product_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_price_history" ADD CONSTRAINT "product_price_history_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_price_history" ADD CONSTRAINT "product_price_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_cost_history" ADD CONSTRAINT "product_cost_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_cost_history" ADD CONSTRAINT "product_cost_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_lot_balances" ADD CONSTRAINT "stock_lot_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_lot_balances" ADD CONSTRAINT "stock_lot_balances_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_lot_balances" ADD CONSTRAINT "stock_lot_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_lot_balances" ADD CONSTRAINT "stock_lot_balances_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payables" ADD CONSTRAINT "supplier_payables_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payables" ADD CONSTRAINT "supplier_payables_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payables" ADD CONSTRAINT "supplier_payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payments" ADD CONSTRAINT "supplier_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "business_template"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payments" ADD CONSTRAINT "supplier_payments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplier_payable_id_fkey" FOREIGN KEY ("supplier_payable_id") REFERENCES "business_template"."supplier_payables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplier_payment_id_fkey" FOREIGN KEY ("supplier_payment_id") REFERENCES "business_template"."supplier_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."delivery_orders" ADD CONSTRAINT "delivery_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."delivery_orders" ADD CONSTRAINT "delivery_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."report_daily_sales_snapshots" ADD CONSTRAINT "report_daily_sales_snapshots_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."approval_requests" ADD CONSTRAINT "approval_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "business_template"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."invoice_number_sequences" ADD CONSTRAINT "invoice_number_sequences_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoices" ADD CONSTRAINT "sales_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoices" ADD CONSTRAINT "sales_invoices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "business_template"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_invoice_taxes" ADD CONSTRAINT "sales_invoice_taxes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "business_template"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_notes" ADD CONSTRAINT "credit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "business_template"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_notes" ADD CONSTRAINT "credit_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_notes" ADD CONSTRAINT "credit_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_note_lines" ADD CONSTRAINT "credit_note_lines_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "business_template"."credit_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."credit_note_lines" ADD CONSTRAINT "credit_note_lines_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "business_template"."sales_invoice_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."debit_notes" ADD CONSTRAINT "debit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."debit_notes" ADD CONSTRAINT "debit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "business_template"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."debit_notes" ADD CONSTRAINT "debit_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."tax_reports" ADD CONSTRAINT "tax_reports_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "business_template"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "business_template"."work_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shift_payment_summaries" ADD CONSTRAINT "shift_payment_summaries_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "business_template"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shift_payment_summaries" ADD CONSTRAINT "shift_payment_summaries_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "business_template"."work_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shift_cash_counts" ADD CONSTRAINT "shift_cash_counts_denomination_id_fkey" FOREIGN KEY ("denomination_id") REFERENCES "business_template"."cash_denominations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shift_cash_counts" ADD CONSTRAINT "shift_cash_counts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "business_template"."work_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_transactions" ADD CONSTRAINT "bank_transactions_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_transactions" ADD CONSTRAINT "bank_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "business_template"."bank_statement_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_reconciliation_items" ADD CONSTRAINT "payment_reconciliation_items_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "business_template"."bank_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_reconciliation_items" ADD CONSTRAINT "payment_reconciliation_items_order_payment_id_fkey" FOREIGN KEY ("order_payment_id") REFERENCES "business_template"."order_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."payment_reconciliation_items" ADD CONSTRAINT "payment_reconciliation_items_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "business_template"."payment_reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_deposits" ADD CONSTRAINT "bank_deposits_from_cash_account_id_fkey" FOREIGN KEY ("from_cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_deposits" ADD CONSTRAINT "bank_deposits_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."bank_deposits" ADD CONSTRAINT "bank_deposits_to_cash_account_id_fkey" FOREIGN KEY ("to_cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_returns" ADD CONSTRAINT "supplier_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_returns" ADD CONSTRAINT "supplier_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_supplier_return_id_fkey" FOREIGN KEY ("supplier_return_id") REFERENCES "business_template"."supplier_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_return_lines" ADD CONSTRAINT "supplier_return_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_credit_notes" ADD CONSTRAINT "supplier_credit_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_credit_notes" ADD CONSTRAINT "supplier_credit_notes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_template"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."supplier_credit_notes" ADD CONSTRAINT "supplier_credit_notes_supplier_return_id_fkey" FOREIGN KEY ("supplier_return_id") REFERENCES "business_template"."supplier_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."receiving_discrepancies" ADD CONSTRAINT "fk_receiving_disc_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."receiving_discrepancies" ADD CONSTRAINT "receiving_discrepancies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."receiving_discrepancies" ADD CONSTRAINT "receiving_discrepancies_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."receiving_discrepancies" ADD CONSTRAINT "receiving_discrepancies_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cogs_allocations" ADD CONSTRAINT "cogs_allocations_cost_layer_id_fkey" FOREIGN KEY ("cost_layer_id") REFERENCES "business_template"."inventory_cost_layers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cogs_allocations" ADD CONSTRAINT "cogs_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cogs_allocations" ADD CONSTRAINT "cogs_allocations_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cogs_allocations" ADD CONSTRAINT "cogs_allocations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cogs_allocations" ADD CONSTRAINT "cogs_allocations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_costs" ADD CONSTRAINT "landed_costs_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_costs" ADD CONSTRAINT "landed_costs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_cost_allocations" ADD CONSTRAINT "landed_cost_allocations_cost_layer_id_fkey" FOREIGN KEY ("cost_layer_id") REFERENCES "business_template"."inventory_cost_layers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_cost_allocations" ADD CONSTRAINT "landed_cost_allocations_landed_cost_id_fkey" FOREIGN KEY ("landed_cost_id") REFERENCES "business_template"."landed_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_cost_allocations" ADD CONSTRAINT "landed_cost_allocations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."landed_cost_allocations" ADD CONSTRAINT "landed_cost_allocations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_adjustments" ADD CONSTRAINT "inventory_cost_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_adjustments" ADD CONSTRAINT "inventory_cost_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."inventory_cost_adjustments" ADD CONSTRAINT "inventory_cost_adjustments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_valuation_snapshots" ADD CONSTRAINT "stock_valuation_snapshots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_valuation_snapshots" ADD CONSTRAINT "stock_valuation_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_valuation_snapshots" ADD CONSTRAINT "stock_valuation_snapshots_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_valuation_snapshots" ADD CONSTRAINT "stock_valuation_snapshots_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."channel_product_mappings" ADD CONSTRAINT "channel_product_mappings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "business_template"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."channel_product_mappings" ADD CONSTRAINT "channel_product_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."channel_product_mappings" ADD CONSTRAINT "channel_product_mappings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."channel_order_mappings" ADD CONSTRAINT "channel_order_mappings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "business_template"."sales_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."channel_order_mappings" ADD CONSTRAINT "channel_order_mappings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sync_jobs" ADD CONSTRAINT "sync_jobs_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "business_template"."sales_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sync_job_logs" ADD CONSTRAINT "sync_job_logs_sync_job_id_fkey" FOREIGN KEY ("sync_job_id") REFERENCES "business_template"."sync_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_items" ADD CONSTRAINT "fk_shipment_items_order_line" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_items" ADD CONSTRAINT "shipment_items_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_items" ADD CONSTRAINT "shipment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "business_template"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_items" ADD CONSTRAINT "shipment_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipments" ADD CONSTRAINT "shipments_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "business_template"."shipping_carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipments" ADD CONSTRAINT "shipments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "business_template"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "business_template"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "business_template"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cod_reconciliations" ADD CONSTRAINT "cod_reconciliations_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "business_template"."shipping_carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."loyalty_point_transactions" ADD CONSTRAINT "loyalty_point_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_vouchers" ADD CONSTRAINT "customer_vouchers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_vouchers" ADD CONSTRAINT "customer_vouchers_used_order_id_fkey" FOREIGN KEY ("used_order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_vouchers" ADD CONSTRAINT "customer_vouchers_voucher_batch_id_fkey" FOREIGN KEY ("voucher_batch_id") REFERENCES "business_template"."voucher_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."gift_cards" ADD CONSTRAINT "gift_cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "business_template"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_wallets" ADD CONSTRAINT "customer_wallets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "business_template"."customer_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_orders" ADD CONSTRAINT "service_orders_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_orders" ADD CONSTRAINT "service_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_orders" ADD CONSTRAINT "service_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_orders" ADD CONSTRAINT "service_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_interactions" ADD CONSTRAINT "customer_interactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_interactions" ADD CONSTRAINT "fk_customer_interactions_created_by" FOREIGN KEY ("created_by") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_contact_preferences" ADD CONSTRAINT "customer_contact_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."campaign_messages" ADD CONSTRAINT "campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "business_template"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."campaign_messages" ADD CONSTRAINT "campaign_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_merge_requests" ADD CONSTRAINT "customer_merge_requests_duplicate_customer_id_fkey" FOREIGN KEY ("duplicate_customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_merge_requests" ADD CONSTRAINT "customer_merge_requests_primary_customer_id_fkey" FOREIGN KEY ("primary_customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_order_lines" ADD CONSTRAINT "service_order_lines_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "business_template"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_order_lines" ADD CONSTRAINT "service_order_lines_service_product_id_fkey" FOREIGN KEY ("service_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."package_usages" ADD CONSTRAINT "package_usages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."package_usages" ADD CONSTRAINT "package_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."package_usages" ADD CONSTRAINT "package_usages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "business_template"."service_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_policies" ADD CONSTRAINT "warranty_policies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_claims" ADD CONSTRAINT "warranty_claims_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_claims" ADD CONSTRAINT "warranty_claims_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_claims" ADD CONSTRAINT "warranty_claims_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_claims" ADD CONSTRAINT "warranty_claims_serial_id_fkey" FOREIGN KEY ("serial_id") REFERENCES "business_template"."product_serials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."warranty_claims" ADD CONSTRAINT "warranty_claims_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "business_template"."service_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."service_packages" ADD CONSTRAINT "service_packages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."kitchen_stations" ADD CONSTRAINT "kitchen_stations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_orders" ADD CONSTRAINT "production_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_orders" ADD CONSTRAINT "production_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_orders" ADD CONSTRAINT "production_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_orders" ADD CONSTRAINT "production_orders_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_order_lines" ADD CONSTRAINT "production_order_lines_ingredient_product_id_fkey" FOREIGN KEY ("ingredient_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_order_lines" ADD CONSTRAINT "production_order_lines_ingredient_variant_id_fkey" FOREIGN KEY ("ingredient_variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."production_order_lines" ADD CONSTRAINT "production_order_lines_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "business_template"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_ingredient_product_id_fkey" FOREIGN KEY ("ingredient_product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_ingredient_variant_id_fkey" FOREIGN KEY ("ingredient_variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "business_template"."sales_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "business_template"."production_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_stock_transaction_id_fkey" FOREIGN KEY ("stock_transaction_id") REFERENCES "business_template"."stock_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."ingredient_consumptions" ADD CONSTRAINT "ingredient_consumptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."prep_batches" ADD CONSTRAINT "prep_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."prep_batches" ADD CONSTRAINT "prep_batches_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."prep_batches" ADD CONSTRAINT "prep_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."menu_availability" ADD CONSTRAINT "menu_availability_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."menu_availability" ADD CONSTRAINT "menu_availability_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."menu_availability" ADD CONSTRAINT "menu_availability_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."period_locks" ADD CONSTRAINT "period_locks_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."closing_runs" ADD CONSTRAINT "closing_runs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."closing_run_items" ADD CONSTRAINT "closing_run_items_closing_run_id_fkey" FOREIGN KEY ("closing_run_id") REFERENCES "business_template"."closing_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."reopen_period_requests" ADD CONSTRAINT "reopen_period_requests_period_lock_id_fkey" FOREIGN KEY ("period_lock_id") REFERENCES "business_template"."period_locks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."reopen_period_requests" ADD CONSTRAINT "reopen_period_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_stock_transaction_id_fkey" FOREIGN KEY ("stock_transaction_id") REFERENCES "business_template"."stock_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."waste_logs" ADD CONSTRAINT "waste_logs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."role_change_history" ADD CONSTRAINT "role_change_history_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "business_template"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."role_change_history" ADD CONSTRAINT "role_change_history_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."role_change_history" ADD CONSTRAINT "role_change_history_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."permission_change_history" ADD CONSTRAINT "permission_change_history_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "business_template"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."permission_change_history" ADD CONSTRAINT "permission_change_history_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "business_template"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."order_payments" ADD CONSTRAINT "order_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "business_template"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."temporary_permission_grants" ADD CONSTRAINT "temporary_permission_grants_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "business_template"."staff_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."temporary_permission_grants" ADD CONSTRAINT "temporary_permission_grants_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "business_template"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_order_lines" ADD CONSTRAINT "sales_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."sales_order_lines" ADD CONSTRAINT "sales_order_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."purchase_order_lines" ADD CONSTRAINT "fk_po_lines_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "business_template"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfer_items" ADD CONSTRAINT "fk_stock_transfer_items_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "business_template"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_transactions" ADD CONSTRAINT "cash_transactions_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "business_template"."cash_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."cash_transactions" ADD CONSTRAINT "cash_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ADD CONSTRAINT "fk_stock_txn_variant" FOREIGN KEY ("variant_id") REFERENCES "business_template"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ADD CONSTRAINT "stock_transactions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "business_template"."stock_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ADD CONSTRAINT "stock_transactions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "business_template"."product_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stock_transactions" ADD CONSTRAINT "stock_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."stores" ADD CONSTRAINT "fk_store_parent" FOREIGN KEY ("parent_id") REFERENCES "business_template"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_tag_mappings" ADD CONSTRAINT "product_tag_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_tag_mappings" ADD CONSTRAINT "product_tag_mappings_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "business_template"."product_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_tag_mappings" ADD CONSTRAINT "customer_tag_mappings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_template"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."customer_tag_mappings" ADD CONSTRAINT "customer_tag_mappings_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "business_template"."customer_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_units" ADD CONSTRAINT "product_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "business_template"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_template"."product_units" ADD CONSTRAINT "product_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "business_template"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_email_unique" ON "business_template"."staff_members" USING btree ("email" text_ops) WHERE (email IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_phone_unique" ON "business_template"."staff_members" USING btree ("phone" text_ops) WHERE (phone IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_staff_code_unique" ON "business_template"."staff_members" USING btree ("staff_code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_members_staff_code" ON "business_template"."staff_members" USING btree ("staff_code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_locations_store_code" ON "business_template"."stock_locations" USING btree ("store_id" text_ops,"location_code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_registers_store_code" ON "business_template"."registers" USING btree ("store_id" text_ops,"register_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tables_store_status" ON "business_template"."dining_tables" USING btree ("store_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_group" ON "business_template"."customers" USING btree ("group_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_name_trgm" ON "business_template"."customers" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "business_template"."customers" USING btree ("phone" text_ops) WHERE (phone IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_customers_customer_code" ON "business_template"."customers" USING btree ("customer_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_brands_display_order" ON "business_template"."brands" USING btree ("display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_units_display_order" ON "business_template"."units" USING btree ("display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_product_attribute_groups_display_order" ON "business_template"."product_attribute_groups" USING btree ("display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_product_attribute_values_group_display_order" ON "business_template"."product_attribute_values" USING btree ("group_id" int4_ops,"display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_tax_classes_display_order" ON "business_template"."tax_classes" USING btree ("display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_product_tags_display_order" ON "business_template"."product_tags" USING btree ("display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_product_categories_parent_display_order" ON "business_template"."product_categories" USING btree ("parent_id" int4_ops,"display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_bal_location" ON "business_template"."stock_balances" USING btree ("location_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_bal_product" ON "business_template"."stock_balances" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_balances_no_variant" ON "business_template"."stock_balances" USING btree ("location_id" uuid_ops,"product_id" text_ops,"unit_name" text_ops) WHERE (variant_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_balances_with_variant" ON "business_template"."stock_balances" USING btree ("location_id" text_ops,"product_id" text_ops,"variant_id" text_ops,"unit_name" text_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_price_book_items_no_variant" ON "business_template"."price_book_items" USING btree ("price_book_id" int4_ops,"product_id" int4_ops,"min_qty" int4_ops) WHERE (variant_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_price_book_items_with_variant" ON "business_template"."price_book_items" USING btree ("price_book_id" int4_ops,"product_id" int4_ops,"variant_id" int4_ops,"min_qty" int4_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_suppliers_supplier_code" ON "business_template"."suppliers" USING btree ("supplier_code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stocktakes_stocktake_code" ON "business_template"."stocktakes" USING btree ("stocktake_code" text_ops) WHERE (stocktake_code IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_po_store_status" ON "business_template"."purchase_orders" USING btree ("store_id" uuid_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_po_supplier" ON "business_template"."purchase_orders" USING btree ("supplier_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_purchase_orders_po_code" ON "business_template"."purchase_orders" USING btree ("po_code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_rules_product_location_global" ON "business_template"."stock_rules" USING btree ("product_id" uuid_ops) WHERE (location_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_rules_product_location_scoped" ON "business_template"."stock_rules" USING btree ("product_id" uuid_ops,"location_id" uuid_ops) WHERE (location_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_transfers_transfer_code" ON "business_template"."stock_transfers" USING btree ("transfer_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_order_returns_original" ON "business_template"."order_returns" USING btree ("original_order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_kitchen_order" ON "business_template"."kitchen_tickets" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_kitchen_status" ON "business_template"."kitchen_tickets" USING btree ("status" text_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_realtime_pending" ON "business_template"."realtime_events" USING btree ("status" text_ops,"created_at" text_ops) WHERE ((status)::text = 'pending'::text);--> statement-breakpoint
CREATE INDEX "idx_activity_account_created" ON "business_template"."activity_logs" USING btree ("account_id" uuid_ops,"created_at" timestamptz_ops) WHERE (account_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_activity_entity" ON "business_template"."activity_logs" USING btree ("entity_type" text_ops,"entity_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_staff_created" ON "business_template"."activity_logs" USING btree ("staff_id" timestamptz_ops,"created_at" uuid_ops) WHERE (staff_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_activity_store" ON "business_template"."activity_logs" USING btree ("store_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_account_links_account" ON "business_template"."staff_account_links" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_role_bindings_staff" ON "business_template"."staff_role_bindings" USING btree ("staff_id" text_ops,"store_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_role_bindings_business_scope" ON "business_template"."staff_role_bindings" USING btree ("staff_id" uuid_ops,"role_id" uuid_ops) WHERE (store_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_staff_role_bindings_store_scope" ON "business_template"."staff_role_bindings" USING btree ("staff_id" uuid_ops,"role_id" uuid_ops,"store_id" uuid_ops) WHERE (store_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_sales_order_payment_status" ON "business_template"."sales_orders" USING btree ("store_id" text_ops,"payment_status" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_order_source" ON "business_template"."sales_orders" USING btree ("source_channel" text_ops,"source_ref" text_ops) WHERE (source_ref IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_so_cashier" ON "business_template"."sales_orders" USING btree ("cashier_id" uuid_ops,"created_at" timestamptz_ops) WHERE (cashier_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_so_code" ON "business_template"."sales_orders" USING btree ("order_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_so_created" ON "business_template"."sales_orders" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_so_customer" ON "business_template"."sales_orders" USING btree ("customer_id" uuid_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_so_register" ON "business_template"."sales_orders" USING btree ("register_id" uuid_ops,"created_at" timestamptz_ops) WHERE (register_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_so_shift" ON "business_template"."sales_orders" USING btree ("shift_id" uuid_ops) WHERE (shift_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_so_store_date" ON "business_template"."sales_orders" USING btree ("store_id" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_so_store_status" ON "business_template"."sales_orders" USING btree ("store_id" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_so_store_status_created" ON "business_template"."sales_orders" USING btree ("store_id" uuid_ops,"status" text_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_so_table" ON "business_template"."sales_orders" USING btree ("table_id" uuid_ops) WHERE (table_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_orders_order_code" ON "business_template"."sales_orders" USING btree ("order_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_receivables_customer_status" ON "business_template"."customer_receivables" USING btree ("customer_id" date_ops,"status" date_ops,"due_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_receivables_store_status" ON "business_template"."customer_receivables" USING btree ("store_id" date_ops,"status" date_ops,"due_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_idempotency_lookup" ON "business_template"."idempotency_keys" USING btree ("scope_type" text_ops,"scope_id" uuid_ops,"idempotency_key" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_idempotency_business_store" ON "business_template"."idempotency_keys" USING btree ("scope_type" text_ops,"scope_id" uuid_ops,"idempotency_key" uuid_ops) WHERE ((scope_type)::text = ANY ((ARRAY['tenant'::character varying, 'store'::character varying])::text[]));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_idempotency_platform" ON "business_template"."idempotency_keys" USING btree ("scope_type" text_ops,"idempotency_key" text_ops) WHERE ((scope_type)::text = 'platform'::text);--> statement-breakpoint
CREATE INDEX "idx_refunds_order" ON "business_template"."payment_refunds" USING btree ("order_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_products_barcode" ON "business_template"."products" USING btree ("barcode" text_ops) WHERE (barcode IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_products_category_display_order" ON "business_template"."products" USING btree ("category_id" uuid_ops,"display_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "business_template"."products" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_is_active" ON "business_template"."products" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_products_name_trgm" ON "business_template"."products" USING gin ("product_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_product_barcodes_barcode" ON "business_template"."product_barcodes" USING btree ("barcode" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_store_settings_no_variant" ON "business_template"."product_store_settings" USING btree ("store_id" uuid_ops,"product_id" uuid_ops) WHERE (variant_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_store_settings_with_variant" ON "business_template"."product_store_settings" USING btree ("store_id" uuid_ops,"product_id" uuid_ops,"variant_id" uuid_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_lots_no_variant" ON "business_template"."product_lots" USING btree ("product_id" text_ops,"lot_code" text_ops) WHERE (variant_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_lots_with_variant" ON "business_template"."product_lots" USING btree ("product_id" text_ops,"variant_id" text_ops,"lot_code" text_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_stock_reservations_order" ON "business_template"."stock_reservations" USING btree ("order_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_reservations_product" ON "business_template"."stock_reservations" USING btree ("location_id" uuid_ops,"product_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stock_lot_balances_scope" ON "business_template"."stock_lot_balances" USING btree (location_id text_ops,product_id text_ops,COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uu text_ops,lot_id text_ops,unit_name text_ops);--> statement-breakpoint
CREATE INDEX "idx_supplier_payables_supplier" ON "business_template"."supplier_payables" USING btree ("supplier_id" text_ops,"status" text_ops) WHERE ((status)::text <> ALL ((ARRAY['paid'::character varying, 'cancelled'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "idx_event_outbox_pending" ON "business_template"."event_outbox" USING btree ("status" text_ops,"created_at" text_ops) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_customer" ON "business_template"."sales_invoices" USING btree ("customer_id" timestamptz_ops,"issued_at" uuid_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_order" ON "business_template"."sales_invoices" USING btree ("order_id" uuid_ops) WHERE (order_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_sales_invoices_store_status" ON "business_template"."sales_invoices" USING btree ("store_id" text_ops,"invoice_status" uuid_ops,"issued_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_credit_notes_invoice" ON "business_template"."credit_notes" USING btree ("invoice_id" uuid_ops) WHERE (invoice_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_debit_notes_invoice" ON "business_template"."debit_notes" USING btree ("invoice_id" uuid_ops) WHERE (invoice_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_cash_drawer_shift" ON "business_template"."cash_drawer_movements" USING btree ("shift_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_bank_transactions_match" ON "business_template"."bank_transactions" USING btree ("match_status" timestamptz_ops,"transaction_time" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_bank_transactions_ref" ON "business_template"."bank_transactions" USING btree ("transaction_ref" text_ops) WHERE (transaction_ref IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_bank_txn_account_match" ON "business_template"."bank_transactions" USING btree ("cash_account_id" text_ops,"match_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_recon_store_status" ON "business_template"."payment_reconciliations" USING btree ("store_id" text_ops,"status" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cost_layers_product" ON "business_template"."inventory_cost_layers" USING btree ("product_id" numeric_ops,"variant_id" numeric_ops,"quantity_remaining" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inv_cost_layer_remaining" ON "business_template"."inventory_cost_layers" USING btree ("product_id" timestamptz_ops,"location_id" timestamptz_ops,"received_at" uuid_ops) WHERE (quantity_remaining > (0)::numeric);--> statement-breakpoint
CREATE INDEX "idx_cogs_alloc_order" ON "business_template"."cogs_allocations" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cogs_order_line" ON "business_template"."cogs_allocations" USING btree ("order_line_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_channel_orders_external" ON "business_template"."channel_order_mappings" USING btree ("channel_id" text_ops,"external_order_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_webhook_inbox_pending" ON "business_template"."webhook_inbox" USING btree ("processing_status" text_ops,"received_at" timestamptz_ops) WHERE ((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "idx_shipments_carrier_status" ON "business_template"."shipments" USING btree ("carrier_id" uuid_ops,"shipment_status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_order" ON "business_template"."shipments" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_status" ON "business_template"."shipments" USING btree ("store_id" uuid_ops,"shipment_status" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_shipment_tracking_shipment" ON "business_template"."shipment_tracking_events" USING btree ("shipment_id" timestamptz_ops,"event_time" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_attempts_shipment" ON "business_template"."delivery_attempts" USING btree ("shipment_id" timestamptz_ops,"attempted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_loyalty_txn_customer" ON "business_template"."loyalty_point_transactions" USING btree ("customer_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_vouchers_status" ON "business_template"."customer_vouchers" USING btree ("customer_id" text_ops,"status" text_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_giftcard_txn_card" ON "business_template"."gift_card_transactions" USING btree ("gift_card_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_wallet_txn_wallet" ON "business_template"."wallet_transactions" USING btree ("wallet_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_service_orders_customer" ON "business_template"."service_orders" USING btree ("customer_id" text_ops,"status" text_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_customer_interactions_cust" ON "business_template"."customer_interactions" USING btree ("customer_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_campaigns_status_scheduled" ON "business_template"."campaigns" USING btree ("status" text_ops,"scheduled_at" text_ops) WHERE (scheduled_at IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_campaign_messages_campaign" ON "business_template"."campaign_messages" USING btree ("campaign_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_customer" ON "business_template"."warranty_claims" USING btree ("customer_id" text_ops,"status" text_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_production_orders_store" ON "business_template"."production_orders" USING btree ("store_id" text_ops,"status" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_prep_batches_store_expires" ON "business_template"."prep_batches" USING btree ("store_id" timestamptz_ops,"product_id" timestamptz_ops,"expires_at" uuid_ops) WHERE ((status)::text = 'active'::text);--> statement-breakpoint
CREATE INDEX "idx_period_locks_store_dates" ON "business_template"."period_locks" USING btree ("store_id" uuid_ops,"period_start" date_ops,"period_end" uuid_ops) WHERE ((status)::text = 'locked'::text);--> statement-breakpoint
CREATE INDEX "idx_closing_runs_store_created" ON "business_template"."closing_runs" USING btree ("store_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_waste_logs_store_created" ON "business_template"."waste_logs" USING btree ("store_id" text_ops,"created_at" uuid_ops,"waste_reason" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_change_history_staff" ON "business_template"."role_change_history" USING btree ("staff_id" timestamptz_ops,"changed_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_order_payments_order" ON "business_template"."order_payments" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_order_payments_order_status" ON "business_template"."order_payments" USING btree ("order_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_order_payments_transaction_ref" ON "business_template"."order_payments" USING btree ("transaction_ref" text_ops) WHERE (transaction_ref IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_payments_method_paid" ON "business_template"."order_payments" USING btree ("payment_method_id" timestamptz_ops,"paid_at" timestamptz_ops) WHERE ((status)::text = 'completed'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_order_payments_idempotency" ON "business_template"."order_payments" USING btree ("idempotency_key" text_ops) WHERE (idempotency_key IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_temp_perm_grants_active" ON "business_template"."temporary_permission_grants" USING btree ("staff_id" timestamptz_ops,"expires_at" timestamptz_ops) WHERE ((status)::text = 'active'::text);--> statement-breakpoint
CREATE INDEX "idx_sol_order_id" ON "business_template"."sales_order_lines" USING btree ("order_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sol_product_id" ON "business_template"."sales_order_lines" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_po_lines_product" ON "business_template"."purchase_order_lines" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_location" ON "business_template"."stock_transactions" USING btree ("location_id" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_location_product_variant_created" ON "business_template"."stock_transactions" USING btree ("location_id" uuid_ops,"product_id" timestamptz_ops,"variant_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_product" ON "business_template"."stock_transactions" USING btree ("product_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_ref" ON "business_template"."stock_transactions" USING btree ("ref_type" text_ops,"ref_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_store_created" ON "business_template"."stock_transactions" USING btree ("store_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stock_txn_variant" ON "business_template"."stock_transactions" USING btree ("variant_id" uuid_ops) WHERE (variant_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_payment_methods_store_display_order" ON "business_template"."payment_methods" USING btree ("store_id" int4_ops,"display_order" int4_ops);--> statement-breakpoint
CREATE POLICY "store_isolation" ON "business_template"."purchase_orders" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));--> statement-breakpoint
CREATE POLICY "store_isolation" ON "business_template"."journal_entries" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));--> statement-breakpoint
CREATE POLICY "store_isolation" ON "business_template"."sales_orders" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));--> statement-breakpoint
CREATE POLICY "store_isolation" ON "business_template"."cash_transactions" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));--> statement-breakpoint
CREATE POLICY "store_isolation" ON "business_template"."stock_transactions" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));--> statement-breakpoint
CREATE POLICY "payment_methods_isolation" ON "business_template"."payment_methods" AS PERMISSIVE FOR ALL TO public USING (((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL)));
*/