import { pgTable, pgSchema, unique, uuid, varchar, boolean, timestamp, integer, check, text, foreignKey, bigint, char, index, smallint, uniqueIndex, numeric, date, jsonb, serial, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const platform = pgSchema("platform");


export const bankMasterInPlatform = platform.table("bank_master", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	bankCode: varchar("bank_code", { length: 30 }).notNull(),
	bankBin: varchar("bank_bin", { length: 20 }),
	bankName: varchar("bank_name", { length: 255 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	logoUrl: varchar("logo_url", { length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("bank_master_bank_code_key").on(table.bankCode),
]);

export const flywaySchemaHistoryInPlatform = platform.table("flyway_schema_history", {
	installedRank: integer("installed_rank").primaryKey().notNull(),
	version: varchar({ length: 50 }),
	description: varchar({ length: 200 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	script: varchar({ length: 1000 }).notNull(),
	checksum: integer(),
	installedBy: varchar("installed_by", { length: 100 }).notNull(),
	installedOn: timestamp("installed_on", { mode: 'string' }).defaultNow().notNull(),
	executionTime: integer("execution_time").notNull(),
	success: boolean().notNull(),
});

export const accountMfaMethodsInPlatform = platform.table("account_mfa_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	methodType: varchar("method_type", { length: 30 }).notNull(),
	methodLabel: varchar("method_label", { length: 100 }),
	secretHash: varchar("secret_hash", { length: 255 }),
	targetMasked: varchar("target_masked", { length: 255 }),
	isPrimary: boolean("is_primary").default(false).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_mfa_method_type", sql`(method_type)::text = ANY (ARRAY['totp'::text, 'sms'::text, 'email'::text, 'backup_code'::text])`),
	check("chk_mfa_status", sql`(status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text])`),
]);

export const renewalKeysInPlatform = platform.table("renewal_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	keyCode: text("key_code").notNull(),
	businessId: uuid("business_id"),
	extendMonths: integer("extend_months").notNull(),
	createdBy: uuid("created_by"),
	usedBy: uuid("used_by"),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: text().default('active').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("renewal_keys_key_code_key").on(table.keyCode),
	check("chk_renewal_status", sql`status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text])`),
]);

export const billingEventsInPlatform = platform.table("billing_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	planCode: varchar("plan_code", { length: 50 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amountVnd: bigint("amount_vnd", { mode: "number" }).default(0).notNull(),
	currencyCode: char("currency_code", { length: 3 }).default('VND').notNull(),
	periodStart: timestamp("period_start", { withTimezone: true, mode: 'string' }),
	periodEnd: timestamp("period_end", { withTimezone: true, mode: 'string' }),
	renewalKey: text("renewal_key"),
	paymentMethod: varchar("payment_method", { length: 50 }),
	paymentReference: varchar("payment_reference", { length: 120 }),
	handledBy: varchar("handled_by", { length: 120 }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "billing_events_business_id_fkey"
		}).onDelete("cascade"),
	check("billing_events_business_id_not_null", sql`business_id IS NOT NULL`),
	check("chk_billing_events_type", sql`(event_type)::text = ANY (ARRAY['subscription_created'::text, 'subscription_renewed'::text, 'subscription_changed'::text, 'subscription_cancelled'::text])`),
]);

export const subscriptionPlansInPlatform = platform.table("subscription_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planCode: varchar("plan_code", { length: 50 }).notNull(),
	planName: varchar("plan_name", { length: 150 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	monthlyPriceVnd: bigint("monthly_price_vnd", { mode: "number" }).default(0).notNull(),
	maxStores: integer("max_stores"),
	maxDevices: integer("max_devices"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("subscription_plans_plan_code_key").on(table.planCode),
]);

export const webhookSubscriptionsInPlatform = platform.table("webhook_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	targetUrl: varchar("target_url", { length: 500 }).notNull(),
	eventTypes: text("event_types").array().notNull(),
	secretHash: varchar("secret_hash", { length: 200 }),
	isActive: boolean("is_active").default(true).notNull(),
	retryLimit: smallint("retry_limit").default(3).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_webhook_sub_business").using("btree", table.businessId.asc().nullsLast().op("uuid_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "webhook_subscriptions_business_id_fkey"
		}).onDelete("cascade"),
	check("webhook_subscriptions_business_id_not_null", sql`business_id IS NOT NULL`),
]);

export const rolePermissionsInPlatform = platform.table("role_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissionsInPlatform.id],
			name: "fk_rp_permission"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInPlatform.id],
			name: "fk_rp_role"
		}),
	unique("role_permissions_role_id_permission_id_key").on(table.permissionId, table.roleId),
]);

export const permissionsInPlatform = platform.table("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permissionKey: varchar("permission_key", { length: 150 }).notNull(),
	permissionName: varchar("permission_name", { length: 150 }).notNull(),
	moduleKey: varchar("module_key", { length: 50 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("permissions_permission_key_key").on(table.permissionKey),
]);

export const deviceIdentitiesInPlatform = platform.table("device_identities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id"),
	deviceUid: varchar("device_uid", { length: 120 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceType: varchar("device_type", { length: 30 }).notNull(),
	clientType: varchar("client_type", { length: 30 }).notNull(),
	osName: varchar("os_name", { length: 50 }),
	osVersion: varchar("os_version", { length: 50 }),
	appVersion: varchar("app_version", { length: 50 }),
	fingerprintHash: varchar("fingerprint_hash", { length: 255 }),
	trustedStatus: varchar("trusted_status", { length: 20 }).default('pending').notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("device_identities_device_uid_key").on(table.deviceUid),
	check("chk_client_type", sql`(client_type)::text = ANY (ARRAY['pos'::text, 'web_admin'::text, 'web_customer'::text, 'mobile_staff'::text, 'mobile_customer'::text])`),
	check("chk_device_type", sql`(device_type)::text = ANY (ARRAY['pos_terminal'::text, 'tablet'::text, 'phone'::text, 'desktop'::text, 'kiosk'::text, 'printer_box'::text])`),
	check("chk_trusted_status", sql`(trusted_status)::text = ANY (ARRAY['pending'::text, 'trusted'::text, 'blocked'::text])`),
]);

export const planLimitsInPlatform = platform.table("plan_limits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planCode: varchar("plan_code", { length: 50 }).notNull(),
	limitKey: varchar("limit_key", { length: 80 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	limitValue: bigint("limit_value", { mode: "number" }),
	resetPeriod: varchar("reset_period", { length: 20 }).default('monthly').notNull(),
	isHardLimit: boolean("is_hard_limit").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.planCode],
			foreignColumns: [subscriptionPlansInPlatform.planCode],
			name: "plan_limits_plan_code_fkey"
		}),
	unique("plan_limits_plan_code_limit_key_key").on(table.limitKey, table.planCode),
	check("chk_plan_limit_reset", sql`(reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text])`),
]);

export const accountsInPlatform = platform.table("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 80 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 30 }),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	googleId: varchar("google_id", { length: 150 }),
	authProvider: varchar("auth_provider", { length: 20 }).default('local').notNull(),
}, (table) => [
	uniqueIndex("idx_accounts_google_id").using("btree", table.googleId.asc().nullsLast().op("text_ops")).where(sql`(google_id IS NOT NULL)`),
	uniqueIndex("idx_accounts_username").using("btree", table.username.asc().nullsLast().op("text_ops")).where(sql`(username IS NOT NULL)`),
	unique("accounts_username_key").on(table.username),
	unique("accounts_google_id_key").on(table.googleId),
	check("chk_accounts_email_format", sql`(email IS NULL) OR ((email)::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)`),
	check("chk_accounts_password_not_empty", sql`(password)::text <> ''::text`),
	check("chk_accounts_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'active'::text, 'locked'::text, 'disabled'::text])`),
]);

export const platformInvoiceLinesInPlatform = platform.table("platform_invoice_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	lineType: varchar("line_type", { length: 50 }).notNull(),
	description: text().notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unitPriceVnd: bigint("unit_price_vnd", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lineTotalVnd: bigint("line_total_vnd", { mode: "number" }).default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [platformInvoicesInPlatform.id],
			name: "platform_invoice_lines_invoice_id_fkey"
		}).onDelete("cascade"),
]);

export const authSessionsInPlatform = platform.table("auth_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	deviceIdentityId: uuid("device_identity_id"),
	businessId: uuid("business_id"),
	sessionTokenHash: varchar("session_token_hash", { length: 255 }).notNull(),
	refreshTokenHash: varchar("refresh_token_hash", { length: 255 }),
	loginMethod: varchar("login_method", { length: 30 }).default('password').notNull(),
	sessionStatus: varchar("session_status", { length: 20 }).default('active').notNull(),
	ipAddress: varchar("ip_address", { length: 100 }),
	userAgent: varchar("user_agent", { length: 1000 }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_auth_sessions_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("idx_auth_sessions_active").using("btree", table.accountId.asc().nullsLast().op("text_ops"), table.sessionStatus.asc().nullsLast().op("text_ops")).where(sql`((session_status)::text = 'active'::text)`),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accountsInPlatform.id],
			name: "fk_as_account"
		}),
	foreignKey({
			columns: [table.deviceIdentityId],
			foreignColumns: [deviceIdentitiesInPlatform.id],
			name: "fk_as_device"
		}),
	unique("auth_sessions_session_token_hash_key").on(table.sessionTokenHash),
	check("chk_login_method", sql`(login_method)::text = ANY (ARRAY['password'::text, 'otp'::text, 'social'::text, 'api_key'::text, 'sso'::text])`),
	check("chk_session_expiry", sql`(expires_at IS NULL) OR (expires_at > started_at)`),
	check("chk_session_status", sql`(session_status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text, 'locked'::text])`),
]);

export const accountBranchAccessInPlatform = platform.table("account_branch_access", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountBusinessId: uuid("account_business_id"),
	businessBranchId: uuid("business_branch_id"),
	accessLevel: varchar("access_level", { length: 30 }).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountBusinessId],
			foreignColumns: [accountBusinessesInPlatform.id],
			name: "fk_aba_at"
		}),
	foreignKey({
			columns: [table.businessBranchId],
			foreignColumns: [businessBranchesInPlatform.id],
			name: "fk_aba_branch"
		}),
	unique("account_branch_access_account_business_id_branch_id_key").on(table.accountBusinessId, table.businessBranchId),
	check("account_branch_access_account_business_id_not_null", sql`account_business_id IS NOT NULL`),
	check("account_branch_access_business_branch_id_not_null", sql`business_branch_id IS NOT NULL`),
	check("chk_aba_access", sql`(access_level)::text = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'cashier'::text, 'kitchen'::text, 'inventory'::text, 'delivery'::text, 'auditor'::text, 'api'::text, 'staff'::text])`),
	check("chk_aba_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text])`),
]);

export const platformPaymentsInPlatform = platform.table("platform_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	invoiceId: uuid("invoice_id"),
	paymentCode: varchar("payment_code", { length: 80 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amountVnd: bigint("amount_vnd", { mode: "number" }).notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	paymentReference: varchar("payment_reference", { length: 150 }),
	status: varchar({ length: 20 }).default('completed').notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	idempotencyKey: varchar("idempotency_key", { length: 100 }),
}, (table) => [
	uniqueIndex("uq_platform_payments_idempotency").using("btree", table.idempotencyKey.asc().nullsLast().op("text_ops")).where(sql`(idempotency_key IS NOT NULL)`),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "platform_payments_business_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [platformInvoicesInPlatform.id],
			name: "platform_payments_invoice_id_fkey"
		}),
	unique("platform_payments_payment_code_key").on(table.paymentCode),
	check("chk_platform_payment_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])`),
	check("platform_payments_business_id_not_null", sql`business_id IS NOT NULL`),
]);

export const usageBillingItemsInPlatform = platform.table("usage_billing_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	invoiceId: uuid("invoice_id"),
	usageKey: varchar("usage_key", { length: 80 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageValue: bigint("usage_value", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	billableValue: bigint("billable_value", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unitPriceVnd: bigint("unit_price_vnd", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amountVnd: bigint("amount_vnd", { mode: "number" }).default(0).notNull(),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "usage_billing_items_business_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [platformInvoicesInPlatform.id],
			name: "usage_billing_items_invoice_id_fkey"
		}),
	check("usage_billing_items_business_id_not_null", sql`business_id IS NOT NULL`),
]);

export const webhookDeliveryLogsInPlatform = platform.table("webhook_delivery_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	webhookEndpointId: uuid("webhook_endpoint_id"),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	payload: jsonb().default({}).notNull(),
	attemptNumber: smallint("attempt_number").default(1).notNull(),
	httpStatus: smallint("http_status"),
	responseBody: text("response_body"),
	durationMs: integer("duration_ms"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_wdl_endpoint").using("btree", table.webhookEndpointId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_wdl_retry").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.nextRetryAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]))`),
	foreignKey({
			columns: [table.webhookEndpointId],
			foreignColumns: [webhookEndpointsInPlatform.id],
			name: "webhook_delivery_logs_webhook_endpoint_id_fkey"
		}).onDelete("cascade"),
	check("chk_wdl_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'exhausted'::text])`),
]);

export const supportTicketsInPlatform = platform.table("support_tickets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketCode: varchar("ticket_code", { length: 30 }).notNull(),
	businessId: uuid("business_id"),
	openedBy: uuid("opened_by"),
	assignedTo: uuid("assigned_to"),
	category: varchar({ length: 50 }).default('general').notNull(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	subject: varchar({ length: 500 }).notNull(),
	description: text(),
	status: varchar({ length: 20 }).default('open').notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_support_tickets_assigned").using("btree", table.assignedTo.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`((status)::text <> ALL ((ARRAY['closed'::character varying, 'resolved'::character varying])::text[]))`),
	index("idx_support_tickets_business").using("btree", table.businessId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [accountsInPlatform.id],
			name: "support_tickets_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "support_tickets_business_id_fkey"
		}),
	foreignKey({
			columns: [table.openedBy],
			foreignColumns: [accountsInPlatform.id],
			name: "support_tickets_opened_by_fkey"
		}),
	unique("support_tickets_ticket_code_key").on(table.ticketCode),
	check("chk_ticket_priority", sql`(priority)::text = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])`),
	check("chk_ticket_status", sql`(status)::text = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting'::text, 'resolved'::text, 'closed'::text])`),
]);

export const supportTicketMessagesInPlatform = platform.table("support_ticket_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketId: uuid("ticket_id").notNull(),
	senderId: uuid("sender_id"),
	message: text().notNull(),
	isInternal: boolean("is_internal").default(false).notNull(),
	attachments: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stm_ticket").using("btree", table.ticketId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [accountsInPlatform.id],
			name: "support_ticket_messages_sender_id_fkey"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTicketsInPlatform.id],
			name: "support_ticket_messages_ticket_id_fkey"
		}).onDelete("cascade"),
]);

export const impersonationSessionsInPlatform = platform.table("impersonation_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supportAccountId: uuid("support_account_id").notNull(),
	businessId: uuid("business_id").notNull(),
	supportTicketId: uuid("support_ticket_id"),
	reason: text().notNull(),
	ipAddress: varchar("ip_address", { length: 100 }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	durationMinutes: integer("duration_minutes").generatedAlwaysAs(sql`(EXTRACT(epoch FROM (ended_at - started_at)) / (60)::numeric)`),
	actionsLog: jsonb("actions_log").default([]).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
}, (table) => [
	index("idx_impersonation_active").using("btree", table.status.asc().nullsLast().op("text_ops")).where(sql`((status)::text = 'active'::text)`),
	index("idx_impersonation_business").using("btree", table.businessId.asc().nullsLast().op("uuid_ops"), table.startedAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_impersonation_support").using("btree", table.supportAccountId.asc().nullsLast().op("uuid_ops"), table.startedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "impersonation_sessions_business_id_fkey"
		}),
	foreignKey({
			columns: [table.supportAccountId],
			foreignColumns: [accountsInPlatform.id],
			name: "impersonation_sessions_support_account_id_fkey"
		}),
	foreignKey({
			columns: [table.supportTicketId],
			foreignColumns: [supportTicketsInPlatform.id],
			name: "impersonation_sessions_support_ticket_id_fkey"
		}),
	check("chk_impersonation_status", sql`(status)::text = ANY (ARRAY['active'::text, 'ended'::text, 'force_ended'::text])`),
]);

export const platformAnnouncementsInPlatform = platform.table("platform_announcements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	body: text().notNull(),
	announcementType: varchar("announcement_type", { length: 30 }).default('info').notNull(),
	targetPlans: text("target_plans").array().default([""]).notNull(),
	targetBusinessIds: uuid("target_business_ids").array().default([""]).notNull(),
	publishAt: timestamp("publish_at", { withTimezone: true, mode: 'string' }),
	expireAt: timestamp("expire_at", { withTimezone: true, mode: 'string' }),
	isPinned: boolean("is_pinned").default(false).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_announcements_active").using("btree", table.publishAt.asc().nullsLast().op("timestamptz_ops"), table.expireAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(publish_at IS NOT NULL)`),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [accountsInPlatform.id],
			name: "platform_announcements_created_by_fkey"
		}),
	check("chk_announcement_type", sql`(announcement_type)::text = ANY (ARRAY['info'::text, 'maintenance'::text, 'feature'::text, 'warning'::text, 'critical'::text])`),
]);

export const systemSettingsInPlatform = platform.table("system_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	settingKey: varchar("setting_key", { length: 150 }).notNull(),
	settingValue: text("setting_value"),
	valueType: varchar("value_type", { length: 20 }).default('string').notNull(),
	description: text(),
	isSecret: boolean("is_secret").default(false).notNull(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [accountsInPlatform.id],
			name: "system_settings_updated_by_fkey"
		}),
	unique("system_settings_setting_key_key").on(table.settingKey),
	check("chk_setting_value_type", sql`(value_type)::text = ANY (ARRAY['string'::text, 'integer'::text, 'boolean'::text, 'json'::text])`),
]);

export const businessModulesInPlatform = platform.table("business_modules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id").notNull(),
	moduleKey: varchar("module_key", { length: 80 }).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	enabledAt: timestamp("enabled_at", { withTimezone: true, mode: 'string' }),
	disabledAt: timestamp("disabled_at", { withTimezone: true, mode: 'string' }),
	enabledBy: uuid("enabled_by"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_business_modules_enabled").using("btree", table.businessId.asc().nullsLast().op("uuid_ops")).where(sql`(is_enabled = true)`),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "business_modules_business_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.enabledBy],
			foreignColumns: [accountsInPlatform.id],
			name: "business_modules_enabled_by_fkey"
		}),
	unique("business_modules_business_id_module_key_key").on(table.businessId, table.moduleKey),
]);

export const migrationLogInPlatform = platform.table("migration_log", {
	id: serial().primaryKey().notNull(),
	name: text(),
	executedAt: timestamp("executed_at", { mode: 'string' }).defaultNow(),
});

export const accountBusinessesInPlatform = platform.table("account_businesses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id"),
	businessId: uuid("business_id"),
	accessLevel: varchar("access_level", { length: 30 }).default('staff'),
	defaultBranchCode: varchar("default_branch_code", { length: 50 }),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accountsInPlatform.id],
			name: "fk_at_account"
		}),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "fk_at_business"
		}).onDelete("cascade"),
	unique("account_businesses_account_id_business_id_key").on(table.accountId, table.businessId),
	check("account_businesses_access_level_not_null", sql`access_level IS NOT NULL`),
	check("account_businesses_account_id_not_null", sql`account_id IS NOT NULL`),
	check("account_businesses_business_id_not_null", sql`business_id IS NOT NULL`),
	check("account_businesses_created_at_not_null", sql`created_at IS NOT NULL`),
	check("account_businesses_status_not_null", sql`status IS NOT NULL`),
	check("account_businesses_updated_at_not_null", sql`updated_at IS NOT NULL`),
	check("chk_at_access", sql`(access_level)::text = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'cashier'::text, 'kitchen'::text, 'inventory'::text, 'delivery'::text, 'auditor'::text, 'api'::text, 'staff'::text])`),
	check("chk_at_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text])`),
]);

export const apiClientsInPlatform = platform.table("api_clients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	clientCode: varchar("client_code", { length: 50 }).notNull(),
	clientName: varchar("client_name", { length: 255 }).notNull(),
	apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull(),
	scopes: jsonb().default([]).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("api_clients_business_id_not_null", sql`business_id IS NOT NULL`),
	check("chk_api_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text])`),
]);

export const businessBranchesInPlatform = platform.table("business_branches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	branchCode: varchar("branch_code", { length: 50 }),
	branchName: varchar("branch_name", { length: 255 }),
	sourceSchemaName: varchar("source_schema_name", { length: 63 }),
	sourceBranchId: uuid("source_branch_id"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "fk_tb_business"
		}).onDelete("cascade"),
	unique("business_branches_business_id_branch_code_key").on(table.branchCode, table.businessId),
	check("business_branches_branch_code_not_null", sql`branch_code IS NOT NULL`),
	check("business_branches_branch_name_not_null", sql`branch_name IS NOT NULL`),
	check("business_branches_business_id_not_null", sql`business_id IS NOT NULL`),
	check("business_branches_created_at_not_null", sql`created_at IS NOT NULL`),
	check("business_branches_is_active_not_null", sql`is_active IS NOT NULL`),
	check("business_branches_source_schema_name_not_null", sql`source_schema_name IS NOT NULL`),
	check("business_branches_updated_at_not_null", sql`updated_at IS NOT NULL`),
]);

export const businessSubscriptionsInPlatform = platform.table("business_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	planCode: varchar("plan_code", { length: 50 }),
	status: varchar({ length: 20 }).default('active'),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }).defaultNow(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	renewedAt: timestamp("renewed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "business_subscriptions_business_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.planCode],
			foreignColumns: [subscriptionPlansInPlatform.planCode],
			name: "business_subscriptions_plan_code_fkey"
		}).onDelete("restrict"),
	unique("business_subscriptions_business_id_key").on(table.businessId),
	check("business_subscriptions_business_id_not_null", sql`business_id IS NOT NULL`),
	check("business_subscriptions_created_at_not_null", sql`created_at IS NOT NULL`),
	check("business_subscriptions_current_period_end_not_null", sql`current_period_end IS NOT NULL`),
	check("business_subscriptions_current_period_start_not_null", sql`current_period_start IS NOT NULL`),
	check("business_subscriptions_plan_code_not_null", sql`plan_code IS NOT NULL`),
	check("business_subscriptions_status_not_null", sql`status IS NOT NULL`),
	check("business_subscriptions_updated_at_not_null", sql`updated_at IS NOT NULL`),
	check("chk_business_subscriptions_status", sql`(status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'cancelled'::character varying, 'pending'::character varying])::text[])`),
]);

export const businessUsageCountersInPlatform = platform.table("business_usage_counters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	usageKey: varchar("usage_key", { length: 80 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	currentValue: bigint("current_value", { mode: "number" }).default(0),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "business_usage_counters_business_id_fkey"
		}).onDelete("cascade"),
	unique("business_usage_counters_business_id_usage_key_period_key").on(table.businessId, table.periodEnd, table.periodStart, table.usageKey),
	check("business_usage_counters_business_id_not_null", sql`business_id IS NOT NULL`),
	check("business_usage_counters_current_value_not_null", sql`current_value IS NOT NULL`),
	check("business_usage_counters_updated_at_not_null", sql`updated_at IS NOT NULL`),
	check("business_usage_counters_usage_key_not_null", sql`usage_key IS NOT NULL`),
]);

export const businessUsageDailyInPlatform = platform.table("business_usage_daily", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	usageDate: date("usage_date"),
	usageKey: varchar("usage_key", { length: 80 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageValue: bigint("usage_value", { mode: "number" }).default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_business_usage_daily").using("btree", table.businessId.asc().nullsLast().op("date_ops"), table.usageDate.desc().nullsFirst().op("date_ops"), table.usageKey.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "business_usage_daily_business_id_fkey"
		}).onDelete("cascade"),
	unique("business_usage_daily_business_id_usage_date_usage_key_key").on(table.businessId, table.usageDate, table.usageKey),
	check("business_usage_daily_business_id_not_null", sql`business_id IS NOT NULL`),
	check("business_usage_daily_created_at_not_null", sql`created_at IS NOT NULL`),
	check("business_usage_daily_usage_date_not_null", sql`usage_date IS NOT NULL`),
	check("business_usage_daily_usage_key_not_null", sql`usage_key IS NOT NULL`),
	check("business_usage_daily_usage_value_not_null", sql`usage_value IS NOT NULL`),
]);

export const platformInvoicesInPlatform = platform.table("platform_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	invoiceCode: varchar("invoice_code", { length: 80 }).notNull(),
	invoiceStatus: varchar("invoice_status", { length: 20 }).default('draft').notNull(),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subTotalVnd: bigint("sub_total_vnd", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	taxAmountVnd: bigint("tax_amount_vnd", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	grandTotalVnd: bigint("grand_total_vnd", { mode: "number" }).default(0).notNull(),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_platform_invoices_business").using("btree", table.businessId.asc().nullsLast().op("text_ops"), table.invoiceStatus.asc().nullsLast().op("timestamptz_ops"), table.issuedAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businessesInPlatform.id],
			name: "platform_invoices_business_id_fkey"
		}).onDelete("cascade"),
	unique("platform_invoices_invoice_code_key").on(table.invoiceCode),
	check("chk_platform_invoice_status", sql`(invoice_status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])`),
	check("platform_invoices_business_id_not_null", sql`business_id IS NOT NULL`),
]);

export const webhookEndpointsInPlatform = platform.table("webhook_endpoints", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	endpointCode: varchar("endpoint_code", { length: 50 }).notNull(),
	endpointUrl: varchar("endpoint_url", { length: 1000 }).notNull(),
	secretHash: varchar("secret_hash", { length: 255 }),
	eventTypes: jsonb("event_types").default([]).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	retryLimit: integer("retry_limit").default(5).notNull(),
	lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_webhook_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text])`),
	check("webhook_endpoints_business_id_not_null", sql`business_id IS NOT NULL`),
]);

export const sessionLimitsInPlatform = platform.table("session_limits", {
	accountId: uuid("account_id").primaryKey().notNull(),
	maxConcurrentSessions: integer("max_concurrent_sessions").default(5),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accountsInPlatform.id],
			name: "session_limits_account_id_fkey"
		}),
]);

export const rolesInPlatform = platform.table("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleKey: varchar("role_key", { length: 100 }).notNull(),
	roleName: varchar("role_name", { length: 150 }).notNull(),
	description: text(),
	roleScope: varchar("role_scope", { length: 20 }).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	sortOrder: integer("sort_order").default(900).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_role_key_key").on(table.roleKey),
	check("chk_platform_roles_scope", sql`lower((role_scope)::text) = ANY (ARRAY['platform'::text, 'business'::text])`),
]);

export const accountRoleBindingsInPlatform = platform.table("account_role_bindings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	roleId: uuid("role_id").notNull(),
	scopeType: varchar("scope_type", { length: 20 }).notNull(),
	scopeId: uuid("scope_id"),
	supportGrantUntil: timestamp("support_grant_until", { withTimezone: true, mode: 'string' }),
	grantedByAccountId: uuid("granted_by_account_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accountsInPlatform.id],
			name: "fk_arb_account"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInPlatform.id],
			name: "fk_arb_role"
		}),
	check("chk_arb_scope", sql`(scope_type)::text = ANY (ARRAY['platform'::text, 'business'::text, 'store'::text])`),
]);

export const businessesInPlatform = platform.table("businesses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessCode: varchar("business_code", { length: 50 }),
	schemaName: varchar("schema_name", { length: 63 }),
	legalName: varchar("legal_name", { length: 255 }),
	brandName: varchar("brand_name", { length: 255 }),
	subscriptionPlan: varchar("subscription_plan", { length: 50 }).default('standard'),
	status: varchar({ length: 20 }).default('active'),
	timezoneName: varchar("timezone_name", { length: 100 }).default('Asia/Ho_Chi_Minh'),
	currencyCode: char("currency_code", { length: 3 }).default('VND'),
	phone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	taxCode: varchar("tax_code", { length: 50 }),
	note: text(),
	storePublicCode: varchar("store_public_code", { length: 12 }),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	website: varchar({ length: 500 }),
	legalAddress: text("legal_address"),
	trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("businesses_business_code_key").on(table.businessCode),
	unique("businesses_schema_name_key").on(table.schemaName),
	check("businesses_business_code_not_null", sql`business_code IS NOT NULL`),
	check("businesses_created_at_not_null", sql`created_at IS NOT NULL`),
	check("businesses_currency_code_not_null", sql`currency_code IS NOT NULL`),
	check("businesses_legal_name_not_null", sql`legal_name IS NOT NULL`),
	check("businesses_schema_name_not_null", sql`schema_name IS NOT NULL`),
	check("businesses_status_not_null", sql`status IS NOT NULL`),
	check("businesses_subscription_plan_not_null", sql`subscription_plan IS NOT NULL`),
	check("businesses_timezone_name_not_null", sql`timezone_name IS NOT NULL`),
	check("businesses_updated_at_not_null", sql`updated_at IS NOT NULL`),
	check("chk_businesses_email_format", sql`(email)::text ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'::text`),
	check("chk_businesses_status", sql`(status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'pending'::character varying])::text[])`),
]);

export const auditEventsInPlatform = platform.table("audit_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessId: uuid("business_id"),
	accountId: uuid("account_id"),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	objectType: varchar("object_type", { length: 50 }).notNull(),
	objectId: varchar("object_id", { length: 100 }),
	eventPayload: jsonb("event_payload").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_audit_events_business").using("btree", table.businessId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const platformAuditLogInPlatform = platform.table("platform_audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventTime: timestamp("event_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	tableName: varchar("table_name", { length: 80 }).notNull(),
	operation: varchar({ length: 10 }).notNull(),
	recordId: uuid("record_id"),
	changedBy: text("changed_by").default(CURRENT_USER),
	oldData: jsonb("old_data"),
	newData: jsonb("new_data"),
	changedFields: text("changed_fields").array(),
}, (table) => [
	index("idx_pal_event_time").using("btree", table.eventTime.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_pal_table_record").using("btree", table.tableName.asc().nullsLast().op("text_ops"), table.recordId.asc().nullsLast().op("timestamptz_ops"), table.eventTime.desc().nullsFirst().op("text_ops")),
]);
export const pgStatStatementsInfoInPlatform = platform.view("pg_stat_statements_info", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	dealloc: bigint({ mode: "number" }),
	statsReset: timestamp("stats_reset", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT dealloc, stats_reset FROM platform.pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset)`);

export const pgStatStatementsInPlatform = platform.view("pg_stat_statements", {	// TODO: failed to parse database type 'oid'
	userid: unknown("userid"),
	// TODO: failed to parse database type 'oid'
	dbid: unknown("dbid"),
	toplevel: boolean(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	queryid: bigint({ mode: "number" }),
	query: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	plans: bigint({ mode: "number" }),
	totalPlanTime: doublePrecision("total_plan_time"),
	minPlanTime: doublePrecision("min_plan_time"),
	maxPlanTime: doublePrecision("max_plan_time"),
	meanPlanTime: doublePrecision("mean_plan_time"),
	stddevPlanTime: doublePrecision("stddev_plan_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	calls: bigint({ mode: "number" }),
	totalExecTime: doublePrecision("total_exec_time"),
	minExecTime: doublePrecision("min_exec_time"),
	maxExecTime: doublePrecision("max_exec_time"),
	meanExecTime: doublePrecision("mean_exec_time"),
	stddevExecTime: doublePrecision("stddev_exec_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rows: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sharedBlksHit: bigint("shared_blks_hit", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sharedBlksRead: bigint("shared_blks_read", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sharedBlksDirtied: bigint("shared_blks_dirtied", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sharedBlksWritten: bigint("shared_blks_written", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	localBlksHit: bigint("local_blks_hit", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	localBlksRead: bigint("local_blks_read", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	localBlksDirtied: bigint("local_blks_dirtied", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	localBlksWritten: bigint("local_blks_written", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tempBlksRead: bigint("temp_blks_read", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tempBlksWritten: bigint("temp_blks_written", { mode: "number" }),
	sharedBlkReadTime: doublePrecision("shared_blk_read_time"),
	sharedBlkWriteTime: doublePrecision("shared_blk_write_time"),
	localBlkReadTime: doublePrecision("local_blk_read_time"),
	localBlkWriteTime: doublePrecision("local_blk_write_time"),
	tempBlkReadTime: doublePrecision("temp_blk_read_time"),
	tempBlkWriteTime: doublePrecision("temp_blk_write_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	walRecords: bigint("wal_records", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	walFpi: bigint("wal_fpi", { mode: "number" }),
	walBytes: numeric("wal_bytes"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	walBuffersFull: bigint("wal_buffers_full", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jitFunctions: bigint("jit_functions", { mode: "number" }),
	jitGenerationTime: doublePrecision("jit_generation_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jitInliningCount: bigint("jit_inlining_count", { mode: "number" }),
	jitInliningTime: doublePrecision("jit_inlining_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jitOptimizationCount: bigint("jit_optimization_count", { mode: "number" }),
	jitOptimizationTime: doublePrecision("jit_optimization_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jitEmissionCount: bigint("jit_emission_count", { mode: "number" }),
	jitEmissionTime: doublePrecision("jit_emission_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jitDeformCount: bigint("jit_deform_count", { mode: "number" }),
	jitDeformTime: doublePrecision("jit_deform_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parallelWorkersToLaunch: bigint("parallel_workers_to_launch", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parallelWorkersLaunched: bigint("parallel_workers_launched", { mode: "number" }),
	statsSince: timestamp("stats_since", { withTimezone: true, mode: 'string' }),
	minmaxStatsSince: timestamp("minmax_stats_since", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, wal_buffers_full, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, parallel_workers_to_launch, parallel_workers_launched, stats_since, minmax_stats_since FROM platform.pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, shared_blk_read_time, shared_blk_write_time, local_blk_read_time, local_blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, wal_buffers_full, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time, jit_deform_count, jit_deform_time, parallel_workers_to_launch, parallel_workers_launched, stats_since, minmax_stats_since)`);