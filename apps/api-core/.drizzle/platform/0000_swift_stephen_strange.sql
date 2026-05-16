-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TABLE "platform"."bank_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_code" varchar(30) NOT NULL,
	"bank_bin" varchar(20),
	"bank_name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"logo_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_master_bank_code_key" UNIQUE("bank_code")
);
--> statement-breakpoint
CREATE TABLE "platform"."flyway_schema_history" (
	"installed_rank" integer PRIMARY KEY NOT NULL,
	"version" varchar(50),
	"description" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"script" varchar(1000) NOT NULL,
	"checksum" integer,
	"installed_by" varchar(100) NOT NULL,
	"installed_on" timestamp DEFAULT now() NOT NULL,
	"execution_time" integer NOT NULL,
	"success" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."account_mfa_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"method_type" varchar(30) NOT NULL,
	"method_label" varchar(100),
	"secret_hash" varchar(255),
	"target_masked" varchar(255),
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mfa_method_type" CHECK ((method_type)::text = ANY (ARRAY['totp'::text, 'sms'::text, 'email'::text, 'backup_code'::text])),
	CONSTRAINT "chk_mfa_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."renewal_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_code" text NOT NULL,
	"business_id" uuid,
	"extend_months" integer NOT NULL,
	"created_by" uuid,
	"used_by" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "renewal_keys_key_code_key" UNIQUE("key_code"),
	CONSTRAINT "chk_renewal_status" CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"amount_vnd" bigint DEFAULT 0 NOT NULL,
	"currency_code" char(3) DEFAULT 'VND' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"renewal_key" text,
	"payment_method" varchar(50),
	"payment_reference" varchar(120),
	"handled_by" varchar(120),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "chk_billing_events_type" CHECK ((event_type)::text = ANY (ARRAY['subscription_created'::text, 'subscription_renewed'::text, 'subscription_changed'::text, 'subscription_cancelled'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"plan_name" varchar(150) NOT NULL,
	"monthly_price_vnd" bigint DEFAULT 0 NOT NULL,
	"max_stores" integer,
	"max_devices" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_plan_code_key" UNIQUE("plan_code")
);
--> statement-breakpoint
CREATE TABLE "platform"."webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"target_url" varchar(500) NOT NULL,
	"event_types" text[] NOT NULL,
	"secret_hash" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"retry_limit" smallint DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_subscriptions_business_id_not_null" CHECK (business_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE("permission_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "platform"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission_key" varchar(150) NOT NULL,
	"permission_name" varchar(150) NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_permission_key_key" UNIQUE("permission_key")
);
--> statement-breakpoint
CREATE TABLE "platform"."device_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"device_uid" varchar(120) NOT NULL,
	"device_name" varchar(255),
	"device_type" varchar(30) NOT NULL,
	"client_type" varchar(30) NOT NULL,
	"os_name" varchar(50),
	"os_version" varchar(50),
	"app_version" varchar(50),
	"fingerprint_hash" varchar(255),
	"trusted_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_identities_device_uid_key" UNIQUE("device_uid"),
	CONSTRAINT "chk_client_type" CHECK ((client_type)::text = ANY (ARRAY['pos'::text, 'web_admin'::text, 'web_customer'::text, 'mobile_staff'::text, 'mobile_customer'::text])),
	CONSTRAINT "chk_device_type" CHECK ((device_type)::text = ANY (ARRAY['pos_terminal'::text, 'tablet'::text, 'phone'::text, 'desktop'::text, 'kiosk'::text, 'printer_box'::text])),
	CONSTRAINT "chk_trusted_status" CHECK ((trusted_status)::text = ANY (ARRAY['pending'::text, 'trusted'::text, 'blocked'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."plan_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"limit_key" varchar(80) NOT NULL,
	"limit_value" bigint,
	"reset_period" varchar(20) DEFAULT 'monthly' NOT NULL,
	"is_hard_limit" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_limits_plan_code_limit_key_key" UNIQUE("limit_key","plan_code"),
	CONSTRAINT "chk_plan_limit_reset" CHECK ((reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(80) NOT NULL,
	"password" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"avatar_url" varchar(500),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"google_id" varchar(150),
	"auth_provider" varchar(20) DEFAULT 'local' NOT NULL,
	CONSTRAINT "accounts_username_key" UNIQUE("username"),
	CONSTRAINT "accounts_google_id_key" UNIQUE("google_id"),
	CONSTRAINT "chk_accounts_email_format" CHECK ((email IS NULL) OR ((email)::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)),
	CONSTRAINT "chk_accounts_password_not_empty" CHECK ((password)::text <> ''::text),
	CONSTRAINT "chk_accounts_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'active'::text, 'locked'::text, 'disabled'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."platform_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(18, 4) DEFAULT '1' NOT NULL,
	"unit_price_vnd" bigint DEFAULT 0 NOT NULL,
	"line_total_vnd" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"device_identity_id" uuid,
	"business_id" uuid,
	"session_token_hash" varchar(255) NOT NULL,
	"refresh_token_hash" varchar(255),
	"login_method" varchar(30) DEFAULT 'password' NOT NULL,
	"session_status" varchar(20) DEFAULT 'active' NOT NULL,
	"ip_address" varchar(100),
	"user_agent" varchar(1000),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_session_token_hash_key" UNIQUE("session_token_hash"),
	CONSTRAINT "chk_login_method" CHECK ((login_method)::text = ANY (ARRAY['password'::text, 'otp'::text, 'social'::text, 'api_key'::text, 'sso'::text])),
	CONSTRAINT "chk_session_expiry" CHECK ((expires_at IS NULL) OR (expires_at > started_at)),
	CONSTRAINT "chk_session_status" CHECK ((session_status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text, 'locked'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."account_branch_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_business_id" uuid,
	"business_branch_id" uuid,
	"access_level" varchar(30) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_branch_access_account_business_id_branch_id_key" UNIQUE("account_business_id","business_branch_id"),
	CONSTRAINT "account_branch_access_account_business_id_not_null" CHECK (account_business_id IS NOT NULL),
	CONSTRAINT "account_branch_access_business_branch_id_not_null" CHECK (business_branch_id IS NOT NULL),
	CONSTRAINT "chk_aba_access" CHECK ((access_level)::text = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'cashier'::text, 'kitchen'::text, 'inventory'::text, 'delivery'::text, 'auditor'::text, 'api'::text, 'staff'::text])),
	CONSTRAINT "chk_aba_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."platform_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"invoice_id" uuid,
	"payment_code" varchar(80) NOT NULL,
	"amount_vnd" bigint NOT NULL,
	"payment_method" varchar(50),
	"payment_reference" varchar(150),
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" varchar(100),
	CONSTRAINT "platform_payments_payment_code_key" UNIQUE("payment_code"),
	CONSTRAINT "chk_platform_payment_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
	CONSTRAINT "platform_payments_business_id_not_null" CHECK (business_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."usage_billing_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"invoice_id" uuid,
	"usage_key" varchar(80) NOT NULL,
	"usage_value" bigint DEFAULT 0 NOT NULL,
	"billable_value" bigint DEFAULT 0 NOT NULL,
	"unit_price_vnd" bigint DEFAULT 0 NOT NULL,
	"amount_vnd" bigint DEFAULT 0 NOT NULL,
	"period_start" date,
	"period_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_billing_items_business_id_not_null" CHECK (business_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."webhook_delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_endpoint_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempt_number" smallint DEFAULT 1 NOT NULL,
	"http_status" smallint,
	"response_body" text,
	"duration_ms" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wdl_status" CHECK ((status)::text = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'exhausted'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(30) NOT NULL,
	"business_id" uuid,
	"opened_by" uuid,
	"assigned_to" uuid,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"subject" varchar(500) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_code_key" UNIQUE("ticket_code"),
	CONSTRAINT "chk_ticket_priority" CHECK ((priority)::text = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
	CONSTRAINT "chk_ticket_status" CHECK ((status)::text = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting'::text, 'resolved'::text, 'closed'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" uuid,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_account_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"support_ticket_id" uuid,
	"reason" text NOT NULL,
	"ip_address" varchar(100),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer GENERATED ALWAYS AS ((EXTRACT(epoch FROM (ended_at - started_at)) / (60)::numeric)) STORED,
	"actions_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "chk_impersonation_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'ended'::text, 'force_ended'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."platform_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"announcement_type" varchar(30) DEFAULT 'info' NOT NULL,
	"target_plans" text[] DEFAULT '{""}' NOT NULL,
	"target_business_ids" uuid[] DEFAULT '{""}' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_announcement_type" CHECK ((announcement_type)::text = ANY (ARRAY['info'::text, 'maintenance'::text, 'feature'::text, 'warning'::text, 'critical'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(150) NOT NULL,
	"setting_value" text,
	"value_type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_setting_key_key" UNIQUE("setting_key"),
	CONSTRAINT "chk_setting_value_type" CHECK ((value_type)::text = ANY (ARRAY['string'::text, 'integer'::text, 'boolean'::text, 'json'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."business_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"module_key" varchar(80) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"enabled_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"enabled_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_modules_business_id_module_key_key" UNIQUE("business_id","module_key")
);
--> statement-breakpoint
CREATE TABLE "platform"."migration_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform"."account_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid,
	"business_id" uuid,
	"access_level" varchar(30) DEFAULT 'staff',
	"default_branch_code" varchar(50),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "account_businesses_account_id_business_id_key" UNIQUE("account_id","business_id"),
	CONSTRAINT "account_businesses_access_level_not_null" CHECK (access_level IS NOT NULL),
	CONSTRAINT "account_businesses_account_id_not_null" CHECK (account_id IS NOT NULL),
	CONSTRAINT "account_businesses_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "account_businesses_created_at_not_null" CHECK (created_at IS NOT NULL),
	CONSTRAINT "account_businesses_status_not_null" CHECK (status IS NOT NULL),
	CONSTRAINT "account_businesses_updated_at_not_null" CHECK (updated_at IS NOT NULL),
	CONSTRAINT "chk_at_access" CHECK ((access_level)::text = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'cashier'::text, 'kitchen'::text, 'inventory'::text, 'delivery'::text, 'auditor'::text, 'api'::text, 'staff'::text])),
	CONSTRAINT "chk_at_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."api_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"client_code" varchar(50) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"api_key_hash" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_clients_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "chk_api_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."business_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"branch_code" varchar(50),
	"branch_name" varchar(255),
	"source_schema_name" varchar(63),
	"source_branch_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "business_branches_business_id_branch_code_key" UNIQUE("branch_code","business_id"),
	CONSTRAINT "business_branches_branch_code_not_null" CHECK (branch_code IS NOT NULL),
	CONSTRAINT "business_branches_branch_name_not_null" CHECK (branch_name IS NOT NULL),
	CONSTRAINT "business_branches_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "business_branches_created_at_not_null" CHECK (created_at IS NOT NULL),
	CONSTRAINT "business_branches_is_active_not_null" CHECK (is_active IS NOT NULL),
	CONSTRAINT "business_branches_source_schema_name_not_null" CHECK (source_schema_name IS NOT NULL),
	CONSTRAINT "business_branches_updated_at_not_null" CHECK (updated_at IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."business_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"plan_code" varchar(50),
	"status" varchar(20) DEFAULT 'active',
	"current_period_start" timestamp with time zone DEFAULT now(),
	"current_period_end" timestamp with time zone,
	"renewed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "business_subscriptions_business_id_key" UNIQUE("business_id"),
	CONSTRAINT "business_subscriptions_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "business_subscriptions_created_at_not_null" CHECK (created_at IS NOT NULL),
	CONSTRAINT "business_subscriptions_current_period_end_not_null" CHECK (current_period_end IS NOT NULL),
	CONSTRAINT "business_subscriptions_current_period_start_not_null" CHECK (current_period_start IS NOT NULL),
	CONSTRAINT "business_subscriptions_plan_code_not_null" CHECK (plan_code IS NOT NULL),
	CONSTRAINT "business_subscriptions_status_not_null" CHECK (status IS NOT NULL),
	CONSTRAINT "business_subscriptions_updated_at_not_null" CHECK (updated_at IS NOT NULL),
	CONSTRAINT "chk_business_subscriptions_status" CHECK ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'cancelled'::character varying, 'pending'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "platform"."business_usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"usage_key" varchar(80),
	"current_value" bigint DEFAULT 0,
	"period_start" date,
	"period_end" date,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "business_usage_counters_business_id_usage_key_period_key" UNIQUE("business_id","period_end","period_start","usage_key"),
	CONSTRAINT "business_usage_counters_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "business_usage_counters_current_value_not_null" CHECK (current_value IS NOT NULL),
	CONSTRAINT "business_usage_counters_updated_at_not_null" CHECK (updated_at IS NOT NULL),
	CONSTRAINT "business_usage_counters_usage_key_not_null" CHECK (usage_key IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."business_usage_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"usage_date" date,
	"usage_key" varchar(80),
	"usage_value" bigint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "business_usage_daily_business_id_usage_date_usage_key_key" UNIQUE("business_id","usage_date","usage_key"),
	CONSTRAINT "business_usage_daily_business_id_not_null" CHECK (business_id IS NOT NULL),
	CONSTRAINT "business_usage_daily_created_at_not_null" CHECK (created_at IS NOT NULL),
	CONSTRAINT "business_usage_daily_usage_date_not_null" CHECK (usage_date IS NOT NULL),
	CONSTRAINT "business_usage_daily_usage_key_not_null" CHECK (usage_key IS NOT NULL),
	CONSTRAINT "business_usage_daily_usage_value_not_null" CHECK (usage_value IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."platform_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"invoice_code" varchar(80) NOT NULL,
	"invoice_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"period_start" date,
	"period_end" date,
	"sub_total_vnd" bigint DEFAULT 0 NOT NULL,
	"tax_amount_vnd" bigint DEFAULT 0 NOT NULL,
	"grand_total_vnd" bigint DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_invoices_invoice_code_key" UNIQUE("invoice_code"),
	CONSTRAINT "chk_platform_invoice_status" CHECK ((invoice_status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])),
	CONSTRAINT "platform_invoices_business_id_not_null" CHECK (business_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"endpoint_code" varchar(50) NOT NULL,
	"endpoint_url" varchar(1000) NOT NULL,
	"secret_hash" varchar(255),
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"retry_limit" integer DEFAULT 5 NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_webhook_status" CHECK ((status)::text = ANY (ARRAY['active'::text, 'disabled'::text])),
	CONSTRAINT "webhook_endpoints_business_id_not_null" CHECK (business_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "platform"."session_limits" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"max_concurrent_sessions" integer DEFAULT 5,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_key" varchar(100) NOT NULL,
	"role_name" varchar(150) NOT NULL,
	"description" text,
	"role_scope" varchar(20) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 900 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_role_key_key" UNIQUE("role_key"),
	CONSTRAINT "chk_platform_roles_scope" CHECK (lower((role_scope)::text) = ANY (ARRAY['platform'::text, 'business'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."account_role_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_type" varchar(20) NOT NULL,
	"scope_id" uuid,
	"support_grant_until" timestamp with time zone,
	"granted_by_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_arb_scope" CHECK ((scope_type)::text = ANY (ARRAY['platform'::text, 'business'::text, 'store'::text]))
);
--> statement-breakpoint
CREATE TABLE "platform"."businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_code" varchar(50),
	"schema_name" varchar(63),
	"legal_name" varchar(255),
	"brand_name" varchar(255),
	"subscription_plan" varchar(50) DEFAULT 'standard',
	"status" varchar(20) DEFAULT 'active',
	"timezone_name" varchar(100) DEFAULT 'Asia/Ho_Chi_Minh',
	"currency_code" char(3) DEFAULT 'VND',
	"phone" varchar(30),
	"email" varchar(255),
	"tax_code" varchar(50),
	"note" text,
	"store_public_code" varchar(12),
	"subscription_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"website" varchar(500),
	"legal_address" text,
	"trial_ends_at" timestamp with time zone,
	CONSTRAINT "businesses_business_code_key" UNIQUE("business_code"),
	CONSTRAINT "businesses_schema_name_key" UNIQUE("schema_name"),
	CONSTRAINT "businesses_business_code_not_null" CHECK (business_code IS NOT NULL),
	CONSTRAINT "businesses_created_at_not_null" CHECK (created_at IS NOT NULL),
	CONSTRAINT "businesses_currency_code_not_null" CHECK (currency_code IS NOT NULL),
	CONSTRAINT "businesses_legal_name_not_null" CHECK (legal_name IS NOT NULL),
	CONSTRAINT "businesses_schema_name_not_null" CHECK (schema_name IS NOT NULL),
	CONSTRAINT "businesses_status_not_null" CHECK (status IS NOT NULL),
	CONSTRAINT "businesses_subscription_plan_not_null" CHECK (subscription_plan IS NOT NULL),
	CONSTRAINT "businesses_timezone_name_not_null" CHECK (timezone_name IS NOT NULL),
	CONSTRAINT "businesses_updated_at_not_null" CHECK (updated_at IS NOT NULL),
	CONSTRAINT "chk_businesses_email_format" CHECK ((email)::text ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'::text),
	CONSTRAINT "chk_businesses_status" CHECK ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'pending'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "platform"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"account_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"object_type" varchar(50) NOT NULL,
	"object_id" varchar(100),
	"event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."platform_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" varchar(80) NOT NULL,
	"operation" varchar(10) NOT NULL,
	"record_id" uuid,
	"changed_by" text DEFAULT CURRENT_USER,
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_fields" text[]
);
--> statement-breakpoint
ALTER TABLE "platform"."billing_events" ADD CONSTRAINT "billing_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."role_permissions" ADD CONSTRAINT "fk_rp_permission" FOREIGN KEY ("permission_id") REFERENCES "platform"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."role_permissions" ADD CONSTRAINT "fk_rp_role" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."plan_limits" ADD CONSTRAINT "plan_limits_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "platform"."subscription_plans"("plan_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."platform_invoice_lines" ADD CONSTRAINT "platform_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform"."platform_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."auth_sessions" ADD CONSTRAINT "fk_as_account" FOREIGN KEY ("account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."auth_sessions" ADD CONSTRAINT "fk_as_device" FOREIGN KEY ("device_identity_id") REFERENCES "platform"."device_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_branch_access" ADD CONSTRAINT "fk_aba_at" FOREIGN KEY ("account_business_id") REFERENCES "platform"."account_businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_branch_access" ADD CONSTRAINT "fk_aba_branch" FOREIGN KEY ("business_branch_id") REFERENCES "platform"."business_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."platform_payments" ADD CONSTRAINT "platform_payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."platform_payments" ADD CONSTRAINT "platform_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform"."platform_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."usage_billing_items" ADD CONSTRAINT "usage_billing_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."usage_billing_items" ADD CONSTRAINT "usage_billing_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform"."platform_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_webhook_endpoint_id_fkey" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "platform"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_tickets" ADD CONSTRAINT "support_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_tickets" ADD CONSTRAINT "support_tickets_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "platform"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_support_account_id_fkey" FOREIGN KEY ("support_account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "platform"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."platform_announcements" ADD CONSTRAINT "platform_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_modules" ADD CONSTRAINT "business_modules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_modules" ADD CONSTRAINT "business_modules_enabled_by_fkey" FOREIGN KEY ("enabled_by") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_businesses" ADD CONSTRAINT "fk_at_account" FOREIGN KEY ("account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_businesses" ADD CONSTRAINT "fk_at_business" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_branches" ADD CONSTRAINT "fk_tb_business" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_subscriptions" ADD CONSTRAINT "business_subscriptions_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "platform"."subscription_plans"("plan_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_usage_counters" ADD CONSTRAINT "business_usage_counters_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."business_usage_daily" ADD CONSTRAINT "business_usage_daily_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."platform_invoices" ADD CONSTRAINT "platform_invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "platform"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."session_limits" ADD CONSTRAINT "session_limits_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_role_bindings" ADD CONSTRAINT "fk_arb_account" FOREIGN KEY ("account_id") REFERENCES "platform"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."account_role_bindings" ADD CONSTRAINT "fk_arb_role" FOREIGN KEY ("role_id") REFERENCES "platform"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_webhook_sub_business" ON "platform"."webhook_subscriptions" USING btree ("business_id" uuid_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_unique" ON "platform"."accounts" USING btree ("email" text_ops) WHERE (email IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_phone_unique" ON "platform"."accounts" USING btree ("phone" text_ops) WHERE (phone IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_google_id" ON "platform"."accounts" USING btree ("google_id" text_ops) WHERE (google_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_username" ON "platform"."accounts" USING btree ("username" text_ops) WHERE (username IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_account" ON "platform"."auth_sessions" USING btree ("account_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_auth_sessions_active" ON "platform"."auth_sessions" USING btree ("account_id" text_ops,"session_status" text_ops) WHERE ((session_status)::text = 'active'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_platform_payments_idempotency" ON "platform"."platform_payments" USING btree ("idempotency_key" text_ops) WHERE (idempotency_key IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_wdl_endpoint" ON "platform"."webhook_delivery_logs" USING btree ("webhook_endpoint_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_wdl_retry" ON "platform"."webhook_delivery_logs" USING btree ("status" timestamptz_ops,"next_retry_at" timestamptz_ops) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "idx_support_tickets_assigned" ON "platform"."support_tickets" USING btree ("assigned_to" uuid_ops,"status" text_ops) WHERE ((status)::text <> ALL ((ARRAY['closed'::character varying, 'resolved'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "idx_support_tickets_business" ON "platform"."support_tickets" USING btree ("business_id" text_ops,"status" text_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_stm_ticket" ON "platform"."support_ticket_messages" USING btree ("ticket_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_impersonation_active" ON "platform"."impersonation_sessions" USING btree ("status" text_ops) WHERE ((status)::text = 'active'::text);--> statement-breakpoint
CREATE INDEX "idx_impersonation_business" ON "platform"."impersonation_sessions" USING btree ("business_id" uuid_ops,"started_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_impersonation_support" ON "platform"."impersonation_sessions" USING btree ("support_account_id" uuid_ops,"started_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_announcements_active" ON "platform"."platform_announcements" USING btree ("publish_at" timestamptz_ops,"expire_at" timestamptz_ops) WHERE (publish_at IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_business_modules_enabled" ON "platform"."business_modules" USING btree ("business_id" uuid_ops) WHERE (is_enabled = true);--> statement-breakpoint
CREATE INDEX "idx_business_usage_daily" ON "platform"."business_usage_daily" USING btree ("business_id" date_ops,"usage_date" date_ops,"usage_key" date_ops);--> statement-breakpoint
CREATE INDEX "idx_platform_invoices_business" ON "platform"."platform_invoices" USING btree ("business_id" text_ops,"invoice_status" timestamptz_ops,"issued_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_events_business" ON "platform"."audit_events" USING btree ("business_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_pal_event_time" ON "platform"."platform_audit_log" USING btree ("event_time" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_pal_table_record" ON "platform"."platform_audit_log" USING btree ("table_name" text_ops,"record_id" timestamptz_ops,"event_time" text_ops);--> statement-breakpoint
CREATE VIEW "platform"."pg_stat_statements_info" AS (SELECT dealloc, stats_reset FROM platform.pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset));--> statement-breakpoint
CREATE VIEW "platform"."pg_stat_statements" AS (SELECT userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, wal_buffers_full, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, parallel_workers_to_launch, parallel_workers_launched, stats_since, minmax_stats_since FROM platform.pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, wal_buffers_full, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, parallel_workers_to_launch, parallel_workers_launched, stats_since, minmax_stats_since));
*/