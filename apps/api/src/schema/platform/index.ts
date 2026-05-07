import {
  pgSchema, uuid, varchar, boolean, integer,
  text, timestamp, date, bigint, numeric, jsonb,
} from 'drizzle-orm/pg-core';

const platform = pgSchema('platform');

// ─── Core ────────────────────────────────────────────────────────────────────

export const businesses = platform.table('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessCode: varchar('business_code', { length: 50 }).notNull().unique(),
  schemaName: varchar('schema_name', { length: 100 }).notNull().unique(),
  legalName: varchar('legal_name', { length: 200 }).notNull(),
  brandName: varchar('brand_name', { length: 200 }),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).notNull().default('STARTER'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  timezoneName: varchar('timezone_name', { length: 100 }).notNull().default('Asia/Ho_Chi_Minh'),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('VND'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  taxCode: varchar('tax_code', { length: 50 }),
  note: text('note'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = platform.table('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }),
  password: varchar('password', { length: 255 }),
  fullName: varchar('full_name', { length: 200 }),
  email: varchar('email', { length: 200 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  googleId: varchar('google_id', { length: 150 }),
  authProvider: varchar('auth_provider', { length: 20 }).notNull().default('local'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accountBusinesses = platform.table('account_businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  accessLevel: varchar('access_level', { length: 30 }).notNull().default('staff'),
  defaultBranchCode: varchar('default_branch_code', { length: 50 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export const roles = platform.table('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleKey: varchar('role_key', { length: 80 }).notNull().unique(),
  roleName: varchar('role_name', { length: 200 }).notNull(),
  roleScope: varchar('role_scope', { length: 20 }).notNull().default('business'),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = platform.table('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  permissionKey: varchar('permission_key', { length: 150 }).notNull().unique(),
  permissionName: varchar('permission_name', { length: 200 }).notNull(),
  moduleKey: varchar('module_key', { length: 80 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = platform.table('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id),
});

export const platformAccountRoles = platform.table('account_role_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  scopeType: varchar('scope_type', { length: 30 }).notNull().default('platform'),
  scopeId: uuid('scope_id'),
  supportGrantUntil: timestamp('support_grant_until', { withTimezone: true }),
  grantedByAccountId: uuid('granted_by_account_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptionPlans = platform.table('subscription_plans', {
  planCode: varchar('plan_code', { length: 50 }).primaryKey(),
  planName: varchar('plan_name', { length: 100 }).notNull(),
  priceMonthlyVnd: integer('price_monthly_vnd').notNull().default(0),
  maxStores: integer('max_stores'),
  maxUsers: integer('max_users'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const businessSubscriptions = platform.table('business_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  planCode: varchar('plan_code', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull().defaultNow(),
  renewedAt: timestamp('renewed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Billing ──────────────────────────────────────────────────────────────────

export const platformInvoices = platform.table('platform_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  invoiceCode: varchar('invoice_code', { length: 80 }).notNull().unique(),
  invoiceStatus: varchar('invoice_status', { length: 20 }).notNull().default('draft'),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  subTotalVnd: bigint('sub_total_vnd', { mode: 'number' }).notNull().default(0),
  taxAmountVnd: bigint('tax_amount_vnd', { mode: 'number' }).notNull().default(0),
  grandTotalVnd: bigint('grand_total_vnd', { mode: 'number' }).notNull().default(0),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const platformInvoiceLines = platform.table('platform_invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => platformInvoices.id),
  lineType: varchar('line_type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('1'),
  unitPriceVnd: bigint('unit_price_vnd', { mode: 'number' }).notNull().default(0),
  lineTotalVnd: bigint('line_total_vnd', { mode: 'number' }).notNull().default(0),
});

export const platformPayments = platform.table('platform_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  invoiceId: uuid('invoice_id').references(() => platformInvoices.id),
  paymentCode: varchar('payment_code', { length: 80 }).notNull().unique(),
  amountVnd: bigint('amount_vnd', { mode: 'number' }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 150 }),
  status: varchar('status', { length: 20 }).notNull().default('completed'),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit ── maps to audit_events (actual DB table name) ────────────────────

export const auditLogs = platform.table('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('tenant_id'),
  actorId: uuid('account_id'),
  actorType: varchar('event_type', { length: 150 }).notNull(),
  action: varchar('object_type', { length: 80 }).notNull(),
  targetId: varchar('object_id', { length: 150 }),
  meta: jsonb('event_payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Support Tickets ──────────────────────────────────────────────────────────

export const supportTickets = platform.table('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketCode: varchar('ticket_code', { length: 50 }).notNull().unique(),
  businessId: uuid('business_id'),
  reporterId: uuid('reporter_id'),
  assigneeId: uuid('assignee_id'),
  title: varchar('title', { length: 500 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supportTicketMessages = platform.table('support_ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id),
  senderId: uuid('sender_id').notNull(),
  senderType: varchar('sender_type', { length: 20 }).notNull().default('platform'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const impersonationSessions = platform.table('impersonation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformAccountId: uuid('platform_account_id').notNull(),
  businessId: uuid('business_id').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  impersonationToken: varchar('impersonation_token', { length: 255 }),
});

export const systemSettings = platform.table('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  settingKey: varchar('setting_key', { length: 150 }).notNull().unique(),
  settingValue: text('setting_value'),
  valueType: varchar('value_type', { length: 20 }).notNull().default('string'),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const businessModules = platform.table('business_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull(),
  moduleKey: varchar('module_key', { length: 80 }).notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  enabledBy: uuid('enabled_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
