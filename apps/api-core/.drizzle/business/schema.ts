import { pgTable, pgSchema, unique, check, uuid, varchar, integer, bigint, timestamp, date, boolean, uniqueIndex, foreignKey, numeric, text, index, jsonb, time, pgPolicy, char, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const businessTemplate = pgSchema("business_template");


export const documentSequencesInBusinessTemplate = businessTemplate.table("document_sequences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	docType: varchar("doc_type", { length: 50 }).notNull(),
	prefix: varchar({ length: 20 }).default(').notNull(),
	suffix: varchar({ length: 20 }).default(').notNull(),
	padLength: integer("pad_length").default(6).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastNumber: bigint("last_number", { mode: "number" }).default(0).notNull(),
	resetPeriod: varchar("reset_period", { length: 20 }).default('never').notNull(),
	lastResetAt: timestamp("last_reset_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("document_sequences_store_id_doc_type_key").on(table.docType, table.storeId),
	check("chk_reset_period", sql`(reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text])`),
]);

export const businessPeriodsInBusinessTemplate = businessTemplate.table("business_periods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	periodCode: varchar("period_code", { length: 20 }).notNull(),
	periodName: varchar("period_name", { length: 100 }).notNull(),
	periodType: varchar("period_type", { length: 20 }).default('month').notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	isClosed: boolean("is_closed").default(false).notNull(),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	closedBy: uuid("closed_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_period_dates", sql`start_date <= end_date`),
	check("chk_period_type", sql`(period_type)::text = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'quarter'::text, 'year'::text])`),
]);

export const staffMembersInBusinessTemplate = businessTemplate.table("staff_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffCode: varchar("staff_code", { length: 30 }).notNull(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	phone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	pinHash: varchar("pin_hash", { length: 255 }),
	position: varchar({ length: 100 }),
	role: varchar({ length: 30 }).default('staff').notNull(),
	departmentId: uuid("department_id"),
	primaryStoreId: uuid("primary_store_id"),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	contractType: varchar("contract_type", { length: 30 }).default('full_time').notNull(),
	hireDate: date("hire_date"),
	terminationDate: date("termination_date"),
	baseSalary: numeric("base_salary", { precision: 15, scale:  2 }).default('0').notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }).default('0').notNull(),
	nationalId: varchar("national_id", { length: 20 }),
	bankAccount: varchar("bank_account", { length: 30 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankMasterId: uuid("bank_master_id"),
	employmentStatus: varchar("employment_status", { length: 20 }).default('active').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("staff_members_email_unique").using("btree", table.email.asc().nullsLast().op("text_ops")).where(sql`(email IS NOT NULL)`),
	uniqueIndex("staff_members_phone_unique").using("btree", table.phone.asc().nullsLast().op("text_ops")).where(sql`(phone IS NOT NULL)`),
	uniqueIndex("staff_members_staff_code_unique").using("btree", table.staffCode.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_staff_members_staff_code").using("btree", table.staffCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departmentsInBusinessTemplate.id],
			name: "staff_members_department_id_fkey"
		}),
	foreignKey({
			columns: [table.primaryStoreId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "staff_members_primary_store_id_fkey"
		}),
	check("chk_contract_type", sql`(contract_type)::text = ANY (ARRAY['full_time'::text, 'part_time'::text, 'freelance'::text, 'probation'::text])`),
	check("chk_emp_status", sql`(employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'terminated'::text, 'on_leave'::text])`),
	check("chk_staff_members_password_not_empty", sql`(password_hash)::text <> ''::text`),
	check("chk_staff_role", sql`(role)::text = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'staff'::text, 'kitchen'::text, 'delivery'::text, 'inventory'::text])`),
]);

export const departmentsInBusinessTemplate = businessTemplate.table("departments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	parentId: uuid("parent_id"),
	departmentCode: varchar("department_code", { length: 20 }),
	departmentName: varchar("department_name", { length: 150 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "fk_dept_parent"
		}),
]);

export const customerGroupsInBusinessTemplate = businessTemplate.table("customer_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupCode: varchar("group_code", { length: 50 }).notNull(),
	groupName: varchar("group_name", { length: 255 }).notNull(),
	discountRate: numeric("discount_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	pointMultiplier: numeric("point_multiplier", { precision: 5, scale:  2 }).default('1').notNull(),
	minSpend: numeric("min_spend", { precision: 18, scale:  2 }),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("customer_groups_group_code_key").on(table.groupCode),
]);

export const customerAddressesInBusinessTemplate = businessTemplate.table("customer_addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	addressLabel: varchar("address_label", { length: 100 }),
	recipientName: varchar("recipient_name", { length: 255 }),
	phone: varchar({ length: 30 }),
	addressLine1: text("address_line1").notNull(),
	addressLine2: text("address_line2"),
	city: varchar({ length: 100 }),
	province: varchar({ length: 100 }),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_addresses_customer_id_fkey"
		}).onDelete("cascade"),
]);

export const stockLocationsInBusinessTemplate = businessTemplate.table("stock_locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationCode: varchar("location_code", { length: 30 }).notNull(),
	locationName: varchar("location_name", { length: 255 }).notNull(),
	locationType: varchar("location_type", { length: 30 }).default('main').notNull(),
	isSellable: boolean("is_sellable").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_stock_locations_store_code").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.locationCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stock_locations_store_id_fkey"
		}),
]);

export const registersInBusinessTemplate = businessTemplate.table("registers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerCode: varchar("register_code", { length: 30 }).notNull(),
	registerName: varchar("register_name", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('closed').notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	deviceId: varchar("device_id", { length: 255 }),
	currentStaffId: uuid("current_staff_id"),
	lastOpenAt: timestamp("last_open_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_registers_store_code").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.registerCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.currentStaffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "registers_current_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "registers_store_id_fkey"
		}),
	check("chk_register_status", sql`(status)::text = ANY (ARRAY['open'::text, 'closed'::text, 'maintenance'::text])`),
]);

export const floorPlansInBusinessTemplate = businessTemplate.table("floor_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	floorCode: varchar("floor_code", { length: 50 }).notNull(),
	floorName: varchar("floor_name", { length: 255 }).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "floor_plans_store_id_fkey"
		}),
	unique("floor_plans_store_id_floor_code_key").on(table.floorCode, table.storeId),
]);

export const diningTablesInBusinessTemplate = businessTemplate.table("dining_tables", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	floorId: uuid("floor_id"),
	tableCode: varchar("table_code", { length: 50 }).notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	capacity: integer().default(4).notNull(),
	status: varchar({ length: 20 }).default('available').notNull(),
	posX: integer("pos_x"),
	posY: integer("pos_y"),
	shape: varchar({ length: 20 }).default('rectangle').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tables_store_status").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.floorId],
			foreignColumns: [floorPlansInBusinessTemplate.id],
			name: "dining_tables_floor_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "dining_tables_store_id_fkey"
		}),
	check("chk_table_shape", sql`(shape)::text = ANY (ARRAY['rectangle'::text, 'circle'::text, 'square'::text])`),
	check("chk_table_status", sql`(status)::text = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text, 'cleaning'::text, 'inactive'::text])`),
]);

export const customersInBusinessTemplate = businessTemplate.table("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id"),
	customerCode: varchar("customer_code", { length: 50 }).notNull(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	phone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	gender: varchar({ length: 10 }),
	dateOfBirth: date("date_of_birth"),
	address: text(),
	taxCode: varchar("tax_code", { length: 50 }),
	loyaltyPoints: numeric("loyalty_points", { precision: 18, scale:  2 }).default('0').notNull(),
	totalSpent: numeric("total_spent", { precision: 18, scale:  2 }).default('0').notNull(),
	visitCount: integer("visit_count").default(0).notNull(),
	lastVisitAt: timestamp("last_visit_at", { withTimezone: true, mode: 'string' }),
	source: varchar({ length: 50 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customers_group").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	index("idx_customers_name_trgm").using("gin", table.fullName.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_customers_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")).where(sql`(phone IS NOT NULL)`),
	uniqueIndex("uq_customers_customer_code").using("btree", table.customerCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [customerGroupsInBusinessTemplate.id],
			name: "customers_group_id_fkey"
		}),
	check("chk_customer_gender", sql`(gender IS NULL) OR ((gender)::text = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))`),
	check("chk_customer_status", sql`(status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'blacklisted'::text])`),
]);

export const brandsInBusinessTemplate = businessTemplate.table("brands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	brandName: varchar("brand_name", { length: 150 }).notNull(),
	logoUrl: text("logo_url"),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
}, (table) => [
	index("idx_brands_display_order").using("btree", table.displayOrder.asc().nullsLast().op("int4_ops")),
]);

export const unitsInBusinessTemplate = businessTemplate.table("units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	unitSymbol: varchar("unit_symbol", { length: 10 }),
	unitType: varchar("unit_type", { length: 20 }).default('piece').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
}, (table) => [
	index("idx_units_display_order").using("btree", table.displayOrder.asc().nullsLast().op("int4_ops")),
	check("chk_unit_type", sql`(unit_type)::text = ANY (ARRAY['weight'::text, 'volume'::text, 'piece'::text, 'portion'::text, 'length'::text, 'area'::text])`),
]);

export const productAttributeGroupsInBusinessTemplate = businessTemplate.table("product_attribute_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupName: varchar("group_name", { length: 100 }).notNull(),
	inputType: varchar("input_type", { length: 20 }).default('single').notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	index("idx_product_attribute_groups_display_order").using("btree", table.displayOrder.asc().nullsLast().op("int4_ops")),
	check("chk_input_type", sql`(input_type)::text = ANY (ARRAY['single'::text, 'multiple'::text])`),
]);

export const productAttributeValuesInBusinessTemplate = businessTemplate.table("product_attribute_values", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	groupId: uuid("group_id").notNull(),
	valueName: varchar("value_name", { length: 100 }).notNull(),
	extraPrice: numeric("extra_price", { precision: 15, scale:  2 }).default('0').notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	index("idx_product_attribute_values_group_display_order").using("btree", table.groupId.asc().nullsLast().op("int4_ops"), table.displayOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [productAttributeGroupsInBusinessTemplate.id],
			name: "product_attribute_values_group_id_fkey"
		}).onDelete("cascade"),
]);

export const taxClassesInBusinessTemplate = businessTemplate.table("tax_classes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taxCode: varchar("tax_code", { length: 20 }).notNull(),
	taxName: varchar("tax_name", { length: 100 }).notNull(),
	taxRate: numeric("tax_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	description: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
}, (table) => [
	index("idx_tax_classes_display_order").using("btree", table.displayOrder.asc().nullsLast().op("int4_ops")),
	unique("tax_classes_tax_code_key").on(table.taxCode),
]);

export const productTagsInBusinessTemplate = businessTemplate.table("product_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tagName: varchar("tag_name", { length: 100 }).notNull(),
	tagColor: varchar("tag_color", { length: 7 }).default('#6366f1').notNull(),
	slug: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
}, (table) => [
	index("idx_product_tags_display_order").using("btree", table.displayOrder.asc().nullsLast().op("int4_ops")),
]);

export const productCategoriesInBusinessTemplate = businessTemplate.table("product_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	parentId: uuid("parent_id"),
	categoryCode: varchar("category_code", { length: 30 }),
	categoryName: varchar("category_name", { length: 150 }).notNull(),
	categoryType: varchar("category_type", { length: 50 }).default('product').notNull(),
	trackInventory: boolean("track_inventory").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	colorCode: varchar("color_code", { length: 7 }),
	iconUrl: text("icon_url"),
	slug: varchar({ length: 255 }),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_product_categories_parent_display_order").using("btree", table.parentId.asc().nullsLast().op("int4_ops"), table.displayOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "fk_category_parent"
		}),
	check("chk_category_type", sql`(category_type)::text = ANY (ARRAY['product'::text, 'service'::text, 'combo'::text])`),
]);

export const productVariantsInBusinessTemplate = businessTemplate.table("product_variants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantName: varchar("variant_name", { length: 255 }).notNull(),
	sku: varchar({ length: 100 }),
	barcode: varchar({ length: 100 }),
	sellPrice: numeric("sell_price", { precision: 18, scale:  4 }),
	costPrice: numeric("cost_price", { precision: 18, scale:  4 }),
	attributes: jsonb().default({}).notNull(),
	imageUrl: varchar("image_url", { length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_variants_product_id_fkey"
		}).onDelete("cascade"),
]);

export const comboItemsInBusinessTemplate = businessTemplate.table("combo_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	comboProductId: uuid("combo_product_id").notNull(),
	itemProductId: uuid("item_product_id").notNull(),
	itemVariantId: uuid("item_variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	unitName: varchar("unit_name", { length: 50 }),
	isOptional: boolean("is_optional").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.comboProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "combo_items_combo_product_id_fkey"
		}),
	foreignKey({
			columns: [table.itemProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "combo_items_item_product_id_fkey"
		}),
	foreignKey({
			columns: [table.itemVariantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_combo_items_variant"
		}),
	check("chk_combo_no_self_ref", sql`combo_product_id <> item_product_id`),
	check("chk_combo_qty_positive", sql`quantity > (0)::numeric`),
]);

export const stockBalancesInBusinessTemplate = businessTemplate.table("stock_balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	locationId: uuid("location_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }).default('piece').notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('0').notNull(),
	reservedQty: numeric("reserved_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	avgCost: numeric("avg_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	lastCost: numeric("last_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_bal_location").using("btree", table.locationId.asc().nullsLast().op("uuid_ops")),
	index("idx_stock_bal_product").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_stock_balances_no_variant").using("btree", table.locationId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("text_ops"), table.unitName.asc().nullsLast().op("text_ops")).where(sql`(variant_id IS NULL)`),
	uniqueIndex("uq_stock_balances_with_variant").using("btree", table.locationId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("text_ops"), table.variantId.asc().nullsLast().op("text_ops"), table.unitName.asc().nullsLast().op("text_ops")).where(sql`(variant_id IS NOT NULL)`),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_stock_balances_variant"
		}),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_balances_location_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_balances_product_id_fkey"
		}),
	unique("stock_balances_location_id_product_id_variant_id_unit_name_key").on(table.locationId, table.productId, table.unitName, table.variantId),
]);

export const priceBooksInBusinessTemplate = businessTemplate.table("price_books", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	bookCode: varchar("book_code", { length: 50 }),
	bookName: varchar("book_name", { length: 150 }).notNull(),
	bookType: varchar("book_type", { length: 30 }).default('standard').notNull(),
	priority: integer().default(0).notNull(),
	validFrom: date("valid_from"),
	validTo: date("valid_to"),
	timeStart: time("time_start"),
	timeEnd: time("time_end"),
	daysOfWeek: jsonb("days_of_week").default([1,2,3,4,5,6,7]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_book_type", sql`(book_type)::text = ANY (ARRAY['standard'::text, 'tiered'::text, 'time_based'::text, 'customer_group'::text])`),
]);

export const priceBookItemsInBusinessTemplate = businessTemplate.table("price_book_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	priceBookId: uuid("price_book_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }),
	salePrice: numeric("sale_price", { precision: 18, scale:  4 }).notNull(),
	minQty: integer("min_qty").default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("uq_price_book_items_no_variant").using("btree", table.priceBookId.asc().nullsLast().op("int4_ops"), table.productId.asc().nullsLast().op("int4_ops"), table.minQty.asc().nullsLast().op("int4_ops")).where(sql`(variant_id IS NULL)`),
	uniqueIndex("uq_price_book_items_with_variant").using("btree", table.priceBookId.asc().nullsLast().op("int4_ops"), table.productId.asc().nullsLast().op("int4_ops"), table.variantId.asc().nullsLast().op("int4_ops"), table.minQty.asc().nullsLast().op("int4_ops")).where(sql`(variant_id IS NOT NULL)`),
	foreignKey({
			columns: [table.priceBookId],
			foreignColumns: [priceBooksInBusinessTemplate.id],
			name: "fk_price_book_items_book"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "fk_price_book_items_product"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_price_book_items_variant"
		}).onDelete("cascade"),
	unique("price_book_items_price_book_id_product_id_variant_id_min_qt_key").on(table.minQty, table.priceBookId, table.productId, table.variantId),
]);

export const suppliersInBusinessTemplate = businessTemplate.table("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierCode: varchar("supplier_code", { length: 30 }).notNull(),
	supplierName: varchar("supplier_name", { length: 255 }).notNull(),
	contactPerson: varchar("contact_person", { length: 150 }),
	phone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	address: text(),
	taxCode: varchar("tax_code", { length: 50 }),
	paymentTerms: integer("payment_terms").default(30).notNull(),
	bankAccount: varchar("bank_account", { length: 30 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankMasterId: uuid("bank_master_id"),
	totalDebt: numeric("total_debt", { precision: 18, scale:  2 }).default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_suppliers_supplier_code").using("btree", table.supplierCode.asc().nullsLast().op("text_ops")),
]);

export const stocktakesInBusinessTemplate = businessTemplate.table("stocktakes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationId: uuid("location_id").notNull(),
	stocktakeCode: varchar("stocktake_code", { length: 50 }),
	status: varchar({ length: 20 }).default('draft').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_stocktakes_stocktake_code").using("btree", table.stocktakeCode.asc().nullsLast().op("text_ops")).where(sql`(stocktake_code IS NOT NULL)`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stocktakes_location_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stocktakes_store_id_fkey"
		}),
	check("chk_stocktake_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])`),
]);

export const purchaseOrdersInBusinessTemplate = businessTemplate.table("purchase_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	supplierId: uuid("supplier_id").notNull(),
	poCode: varchar("po_code", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	subTotal: numeric("sub_total", { precision: 18, scale:  2 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	grandTotal: numeric("grand_total", { precision: 18, scale:  2 }).default('0').notNull(),
	paidAmount: numeric("paid_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	orderDate: date("order_date").default(sql`CURRENT_DATE`).notNull(),
	expectedDate: date("expected_date"),
	receivedDate: date("received_date"),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_po_store_status").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_po_supplier").using("btree", table.supplierId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_purchase_orders_po_code").using("btree", table.poCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "purchase_orders_store_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "purchase_orders_supplier_id_fkey"
		}),
	pgPolicy("store_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_po_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'confirmed'::text, 'partial_received'::text, 'received'::text, 'cancelled'::text, 'closed'::text])`),
]);

export const stocktakeItemsInBusinessTemplate = businessTemplate.table("stocktake_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stocktakeId: uuid("stocktake_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	systemQty: numeric("system_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	actualQty: numeric("actual_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	varianceQty: numeric("variance_qty", { precision: 12, scale:  3 }).generatedAlwaysAs(sql`(actual_qty - system_qty)`),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_stocktake_items_variant"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stocktake_items_product_id_fkey"
		}),
	foreignKey({
			columns: [table.stocktakeId],
			foreignColumns: [stocktakesInBusinessTemplate.id],
			name: "stocktake_items_stocktake_id_fkey"
		}).onDelete("cascade"),
]);

export const workShiftsInBusinessTemplate = businessTemplate.table("work_shifts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerId: uuid("register_id"),
	staffId: uuid("staff_id").notNull(),
	shiftCode: varchar("shift_code", { length: 30 }).notNull(),
	shiftDate: date("shift_date").notNull(),
	plannedStart: timestamp("planned_start", { withTimezone: true, mode: 'string' }),
	plannedEnd: timestamp("planned_end", { withTimezone: true, mode: 'string' }),
	actualStart: timestamp("actual_start", { withTimezone: true, mode: 'string' }),
	actualEnd: timestamp("actual_end", { withTimezone: true, mode: 'string' }),
	openingCash: numeric("opening_cash", { precision: 18, scale:  2 }).default('0').notNull(),
	closingCash: numeric("closing_cash", { precision: 18, scale:  2 }),
	expectedCash: numeric("expected_cash", { precision: 18, scale:  2 }),
	cashVariance: numeric("cash_variance", { precision: 18, scale:  2 }),
	status: varchar({ length: 20 }).default('scheduled').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.registerId],
			foreignColumns: [registersInBusinessTemplate.id],
			name: "work_shifts_register_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "work_shifts_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "work_shifts_store_id_fkey"
		}),
	check("chk_shift_status", sql`(status)::text = ANY (ARRAY['scheduled'::text, 'open'::text, 'closed'::text, 'cancelled'::text])`),
]);

export const stockRulesInBusinessTemplate = businessTemplate.table("stock_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	locationId: uuid("location_id"),
	minStock: numeric("min_stock", { precision: 12, scale:  3 }).default('0').notNull(),
	maxStock: numeric("max_stock", { precision: 12, scale:  3 }),
	reorderPoint: numeric("reorder_point", { precision: 12, scale:  3 }).default('0').notNull(),
	reorderQty: numeric("reorder_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("uq_stock_rules_product_location_global").using("btree", table.productId.asc().nullsLast().op("uuid_ops")).where(sql`(location_id IS NULL)`),
	uniqueIndex("uq_stock_rules_product_location_scoped").using("btree", table.productId.asc().nullsLast().op("uuid_ops"), table.locationId.asc().nullsLast().op("uuid_ops")).where(sql`(location_id IS NOT NULL)`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "fk_stock_rules_location"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "fk_stock_rules_product"
		}).onDelete("cascade"),
]);

export const stockTransfersInBusinessTemplate = businessTemplate.table("stock_transfers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	transferCode: varchar("transfer_code", { length: 50 }).notNull(),
	fromLocationId: uuid("from_location_id").notNull(),
	toLocationId: uuid("to_location_id").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	requestedBy: uuid("requested_by"),
	approvedBy: uuid("approved_by"),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }),
	note: text(),
}, (table) => [
	uniqueIndex("uq_stock_transfers_transfer_code").using("btree", table.transferCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fromLocationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_transfers_from_location_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stock_transfers_store_id_fkey"
		}),
	foreignKey({
			columns: [table.toLocationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_transfers_to_location_id_fkey"
		}),
	check("chk_transfer_locations_distinct", sql`from_location_id <> to_location_id`),
	check("chk_transfer_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'shipped'::text, 'received'::text, 'cancelled'::text])`),
]);

export const orderReturnsInBusinessTemplate = businessTemplate.table("order_returns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	originalOrderId: uuid("original_order_id").notNull(),
	returnCode: varchar("return_code", { length: 50 }).notNull(),
	returnReason: text("return_reason"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	refundAmount: numeric("refund_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	refundMethod: varchar("refund_method", { length: 50 }),
	processedBy: uuid("processed_by"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_order_returns_original").using("btree", table.originalOrderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.originalOrderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "order_returns_original_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "order_returns_store_id_fkey"
		}),
	check("chk_return_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'completed'::text, 'rejected'::text])`),
]);

export const orderReturnLinesInBusinessTemplate = businessTemplate.table("order_return_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	returnId: uuid("return_id").notNull(),
	orderLineId: uuid("order_line_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).notNull(),
	returnToStock: boolean("return_to_stock").default(true).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_order_return_lines_variant"
		}),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "order_return_lines_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "order_return_lines_product_id_fkey"
		}),
	foreignKey({
			columns: [table.returnId],
			foreignColumns: [orderReturnsInBusinessTemplate.id],
			name: "order_return_lines_return_id_fkey"
		}).onDelete("cascade"),
]);

export const tableSessionsInBusinessTemplate = businessTemplate.table("table_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tableId: uuid("table_id").notNull(),
	storeId: uuid("store_id").notNull(),
	sessionCode: varchar("session_code", { length: 50 }).notNull(),
	orderId: uuid("order_id"),
	partySize: integer("party_size").default(1).notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	openedBy: uuid("opened_by"),
	openedAt: timestamp("opened_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "table_sessions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "table_sessions_store_id_fkey"
		}),
	foreignKey({
			columns: [table.tableId],
			foreignColumns: [diningTablesInBusinessTemplate.id],
			name: "table_sessions_table_id_fkey"
		}),
	check("chk_session_status", sql`(status)::text = ANY (ARRAY['open'::text, 'closed'::text, 'cancelled'::text])`),
]);

export const kitchenTicketsInBusinessTemplate = businessTemplate.table("kitchen_tickets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	orderId: uuid("order_id").notNull(),
	ticketCode: varchar("ticket_code", { length: 50 }).notNull(),
	ticketType: varchar("ticket_type", { length: 20 }).default('new').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	printedAt: timestamp("printed_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_kitchen_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_kitchen_status").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "kitchen_tickets_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "kitchen_tickets_store_id_fkey"
		}),
	check("chk_ticket_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])`),
	check("chk_ticket_type", sql`(ticket_type)::text = ANY (ARRAY['new'::text, 'modification'::text, 'cancellation'::text, 'void'::text])`),
]);

export const kitchenTicketLinesInBusinessTemplate = businessTemplate.table("kitchen_ticket_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ticketId: uuid("ticket_id").notNull(),
	orderLineId: uuid("order_line_id").notNull(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	modifiers: jsonb().default([]).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "kitchen_ticket_lines_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [kitchenTicketsInBusinessTemplate.id],
			name: "kitchen_ticket_lines_ticket_id_fkey"
		}).onDelete("cascade"),
]);

export const customerLedgersInBusinessTemplate = businessTemplate.table("customer_ledgers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	storeId: uuid("store_id"),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_ledgers_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "fk_customer_ledgers_created_by"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "fk_customer_ledgers_store"
		}),
	check("chk_ledger_txn_type", sql`(txn_type)::text = ANY (ARRAY['purchase'::text, 'return'::text, 'point_earn'::text, 'point_redeem'::text, 'point_expire'::text, 'adjustment'::text, 'deposit'::text, 'withdrawal'::text])`),
]);

export const discountsInBusinessTemplate = businessTemplate.table("discounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	discountCode: varchar("discount_code", { length: 50 }).notNull(),
	discountName: varchar("discount_name", { length: 255 }).notNull(),
	discountType: varchar("discount_type", { length: 30 }).default('percentage').notNull(),
	discountValue: numeric("discount_value", { precision: 18, scale:  4 }).notNull(),
	minOrderValue: numeric("min_order_value", { precision: 18, scale:  2 }),
	maxDiscount: numeric("max_discount", { precision: 18, scale:  2 }),
	applyScope: varchar("apply_scope", { length: 30 }).default('order').notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	usageLimit: integer("usage_limit"),
	usedCount: integer("used_count").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_apply_scope", sql`(apply_scope)::text = ANY (ARRAY['order'::text, 'product'::text, 'category'::text, 'customer_group'::text])`),
	check("chk_discount_type", sql`(discount_type)::text = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'buy_x_get_y'::text, 'free_item'::text])`),
]);

export const appointmentsInBusinessTemplate = businessTemplate.table("appointments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id"),
	customerName: varchar("customer_name", { length: 255 }),
	customerPhone: varchar("customer_phone", { length: 30 }),
	orderId: uuid("order_id"),
	apptCode: varchar("appt_code", { length: 50 }).notNull(),
	apptDate: date("appt_date").notNull(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('scheduled').notNull(),
	staffId: uuid("staff_id"),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	depositAmount: numeric("deposit_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "appointments_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "appointments_store_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "fk_appointments_order"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "fk_appointments_staff"
		}),
	check("chk_appt_status", sql`(status)::text = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'in_service'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])`),
]);

export const appointmentLinesInBusinessTemplate = businessTemplate.table("appointment_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	appointmentId: uuid("appointment_id").notNull(),
	serviceProductId: uuid("service_product_id").notNull(),
	variantId: uuid("variant_id"),
	staffId: uuid("staff_id"),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).notNull(),
	durationMins: integer("duration_mins"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointmentsInBusinessTemplate.id],
			name: "appointment_lines_appointment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.serviceProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "appointment_lines_service_product_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "fk_appointment_lines_staff"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_appointment_lines_variant"
		}),
]);

export const timekeepingLogsInBusinessTemplate = businessTemplate.table("timekeeping_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffId: uuid("staff_id").notNull(),
	storeId: uuid("store_id").notNull(),
	shiftId: uuid("shift_id"),
	eventType: varchar("event_type", { length: 20 }).notNull(),
	eventTime: timestamp("event_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	method: varchar({ length: 20 }).default('manual').notNull(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	photoUrl: text("photo_url"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [workShiftsInBusinessTemplate.id],
			name: "timekeeping_logs_shift_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "timekeeping_logs_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "timekeeping_logs_store_id_fkey"
		}),
	check("chk_timekeep_event", sql`(event_type)::text = ANY (ARRAY['check_in'::text, 'check_out'::text, 'break_start'::text, 'break_end'::text])`),
	check("chk_timekeep_method", sql`(method)::text = ANY (ARRAY['manual'::text, 'qr'::text, 'face'::text, 'pin'::text, 'gps'::text])`),
]);

export const payrollPeriodsInBusinessTemplate = businessTemplate.table("payroll_periods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	periodCode: varchar("period_code", { length: 30 }).notNull(),
	periodName: varchar("period_name", { length: 100 }).notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	paymentDate: date("payment_date"),
	status: varchar({ length: 20 }).default('open').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "fk_payroll_periods_store"
		}),
	check("chk_payroll_status", sql`(status)::text = ANY (ARRAY['open'::text, 'processing'::text, 'paid'::text, 'cancelled'::text])`),
]);

export const payrollItemsInBusinessTemplate = businessTemplate.table("payroll_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	periodId: uuid("period_id").notNull(),
	staffId: uuid("staff_id").notNull(),
	workedHours: numeric("worked_hours", { precision: 8, scale:  2 }).default('0').notNull(),
	workedDays: numeric("worked_days", { precision: 5, scale:  1 }).default('0').notNull(),
	basePay: numeric("base_pay", { precision: 15, scale:  2 }).default('0').notNull(),
	allowances: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	bonuses: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	deductions: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	netPay: numeric("net_pay", { precision: 15, scale:  2 }).generatedAlwaysAs(sql`(((base_pay + allowances) + bonuses) - deductions)`),
	status: varchar({ length: 20 }).default('pending').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.periodId],
			foreignColumns: [payrollPeriodsInBusinessTemplate.id],
			name: "payroll_items_period_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "payroll_items_staff_id_fkey"
		}),
	unique("payroll_items_period_id_staff_id_key").on(table.periodId, table.staffId),
	check("chk_payroll_item_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'rejected'::text])`),
]);

export const cashAccountsInBusinessTemplate = businessTemplate.table("cash_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	bankMasterId: uuid("bank_master_id"),
	accountCode: varchar("account_code", { length: 50 }).notNull(),
	accountName: varchar("account_name", { length: 255 }).notNull(),
	accountType: varchar("account_type", { length: 30 }).default('cash').notNull(),
	accountNumber: varchar("account_number", { length: 100 }),
	currentBalance: numeric("current_balance", { precision: 18, scale:  2 }).default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bankMasterId],
			foreignColumns: [bankMaster.id],
			name: "fk_cash_accounts_bank"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "fk_cash_accounts_store"
		}),
	check("chk_cash_account_type", sql`(account_type)::text = ANY (ARRAY['cash'::text, 'bank'::text, 'e_wallet'::text, 'credit_line'::text])`),
]);

export const journalLinesInBusinessTemplate = businessTemplate.table("journal_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	entryId: uuid("entry_id").notNull(),
	accountId: uuid("account_id").notNull(),
	debitAmount: numeric("debit_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	creditAmount: numeric("credit_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [chartOfAccountsInBusinessTemplate.id],
			name: "journal_lines_account_id_fkey"
		}),
	foreignKey({
			columns: [table.entryId],
			foreignColumns: [journalEntriesInBusinessTemplate.id],
			name: "journal_lines_entry_id_fkey"
		}).onDelete("cascade"),
	check("chk_journal_line_sign", sql`((debit_amount > (0)::numeric) AND (credit_amount = (0)::numeric)) OR ((credit_amount > (0)::numeric) AND (debit_amount = (0)::numeric))`),
]);

export const chartOfAccountsInBusinessTemplate = businessTemplate.table("chart_of_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	parentId: uuid("parent_id"),
	accountCode: varchar("account_code", { length: 20 }).notNull(),
	accountName: varchar("account_name", { length: 255 }).notNull(),
	accountType: varchar("account_type", { length: 30 }).notNull(),
	normalBalance: varchar("normal_balance", { length: 10 }).default('debit').notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "fk_coa_parent"
		}),
	unique("chart_of_accounts_account_code_key").on(table.accountCode),
	check("chk_account_type", sql`(account_type)::text = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text, 'cogs'::text])`),
	check("chk_normal_balance", sql`(normal_balance)::text = ANY (ARRAY['debit'::text, 'credit'::text])`),
]);

export const rolesInBusinessTemplate = businessTemplate.table("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleKey: varchar("role_key", { length: 100 }).notNull(),
	roleName: varchar("role_name", { length: 150 }).notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_role_key_key").on(table.roleKey),
]);

export const rolePermissionsInBusinessTemplate = businessTemplate.table("role_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissionsInBusinessTemplate.id],
			name: "role_permissions_permission_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInBusinessTemplate.id],
			name: "role_permissions_role_id_fkey"
		}).onDelete("cascade"),
	unique("role_permissions_role_id_permission_id_key").on(table.permissionId, table.roleId),
]);

export const permissionsInBusinessTemplate = businessTemplate.table("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permissionKey: varchar("permission_key", { length: 150 }).notNull(),
	permissionName: varchar("permission_name", { length: 150 }).notNull(),
	moduleKey: varchar("module_key", { length: 80 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("permissions_permission_key_key").on(table.permissionKey),
]);

export const deviceBindingsInBusinessTemplate = businessTemplate.table("device_bindings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerId: uuid("register_id"),
	deviceIdentityId: uuid("device_identity_id").notNull(),
	bindingType: varchar("binding_type", { length: 30 }).default('pos').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	boundAt: timestamp("bound_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	unboundAt: timestamp("unbound_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.registerId],
			foreignColumns: [registersInBusinessTemplate.id],
			name: "device_bindings_register_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "device_bindings_store_id_fkey"
		}),
	foreignKey({
			columns: [table.deviceIdentityId],
			foreignColumns: [deviceIdentities.id],
			name: "fk_db_device_identity"
		}),
	check("chk_binding_status", sql`(status)::text = ANY (ARRAY['active'::text, 'unbound'::text])`),
]);

export const printerDevicesInBusinessTemplate = businessTemplate.table("printer_devices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	deviceIdentityId: uuid("device_identity_id"),
	printerCode: varchar("printer_code", { length: 50 }).notNull(),
	printerName: varchar("printer_name", { length: 255 }).notNull(),
	printerType: varchar("printer_type", { length: 30 }).default('receipt').notNull(),
	connectionType: varchar("connection_type", { length: 30 }).default('network').notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	port: integer(),
	paperWidth: integer("paper_width").default(80).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "printer_devices_store_id_fkey"
		}),
	check("chk_printer_connection", sql`(connection_type)::text = ANY (ARRAY['network'::text, 'usb'::text, 'bluetooth'::text, 'wifi'::text])`),
	check("chk_printer_type", sql`(printer_type)::text = ANY (ARRAY['receipt'::text, 'kitchen'::text, 'label'::text])`),
]);

export const mediaAssetsInBusinessTemplate = businessTemplate.table("media_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	createdByAccountId: uuid("created_by_account_id"),
	assetType: varchar("asset_type", { length: 30 }).default('image').notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	mimeType: varchar("mime_type", { length: 100 }),
	storageUrl: varchar("storage_url", { length: 1000 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_asset_type", sql`(asset_type)::text = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text])`),
]);

export const appNotificationsInBusinessTemplate = businessTemplate.table("app_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	accountId: uuid("account_id"),
	notifType: varchar("notif_type", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	body: text(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	isRead: boolean("is_read").default(false).notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const journalEntriesInBusinessTemplate = businessTemplate.table("journal_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	entryCode: varchar("entry_code", { length: 50 }).notNull(),
	entryDate: date("entry_date").notNull(),
	entryType: varchar("entry_type", { length: 50 }).default('manual').notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	description: text(),
	totalDebit: numeric("total_debit", { precision: 18, scale:  2 }).default('0').notNull(),
	totalCredit: numeric("total_credit", { precision: 18, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "journal_entries_store_id_fkey"
		}),
	pgPolicy("store_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_journal_balanced", sql`total_debit = total_credit`),
	check("chk_journal_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'posted'::text, 'reversed'::text])`),
]);

export const realtimeEventsInBusinessTemplate = businessTemplate.table("realtime_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: uuid("entity_id"),
	topic: varchar({ length: 255 }),
	payload: jsonb().default({}).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	retryCount: integer("retry_count").default(0).notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_realtime_pending").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")).where(sql`((status)::text = 'pending'::text)`),
	check("chk_rt_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text])`),
]);

export const pushTokensInBusinessTemplate = businessTemplate.table("push_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id"),
	storeId: uuid("store_id"),
	registerId: uuid("register_id"),
	deviceType: varchar("device_type", { length: 20 }).notNull(),
	deviceToken: text("device_token").notNull(),
	environment: varchar({ length: 20 }).default('production').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("push_tokens_device_token_key").on(table.deviceToken),
	check("chk_push_device", sql`(device_type)::text = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])`),
	check("chk_push_env", sql`(environment)::text = ANY (ARRAY['production'::text, 'sandbox'::text])`),
	check("chk_push_status", sql`(status)::text = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text])`),
]);

export const activityLogsInBusinessTemplate = businessTemplate.table("activity_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	staffId: uuid("staff_id"),
	accountId: uuid("account_id"),
	action: varchar({ length: 50 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: uuid("entity_id"),
	oldData: jsonb("old_data"),
	newData: jsonb("new_data"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_activity_account_created").using("btree", table.accountId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(account_id IS NOT NULL)`),
	index("idx_activity_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_activity_staff_created").using("btree", table.staffId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")).where(sql`(staff_id IS NOT NULL)`),
	index("idx_activity_store").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
]);

export const storeConfigsInBusinessTemplate = businessTemplate.table("store_configs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	configKey: varchar("config_key", { length: 100 }).notNull(),
	configValue: text("config_value"),
	valueType: varchar("value_type", { length: 20 }).default('string').notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("store_configs_store_id_config_key_key").on(table.configKey, table.storeId),
	check("chk_config_type", sql`(value_type)::text = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text])`),
]);

export const staffAccountLinksInBusinessTemplate = businessTemplate.table("staff_account_links", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffId: uuid("staff_id").notNull(),
	accountId: uuid("account_id").notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	unlinkedAt: timestamp("unlinked_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_staff_account_links_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "staff_account_links_account_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "staff_account_links_staff_id_fkey"
		}).onDelete("cascade"),
	unique("staff_account_links_staff_id_key").on(table.staffId),
	unique("staff_account_links_account_id_key").on(table.accountId),
	check("chk_staff_account_link_status", sql`(status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text])`),
]);

export const staffRoleBindingsInBusinessTemplate = businessTemplate.table("staff_role_bindings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffId: uuid("staff_id").notNull(),
	roleId: uuid("role_id").notNull(),
	storeId: uuid("store_id"),
	grantedBy: uuid("granted_by"),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('active').notNull(),
}, (table) => [
	index("idx_staff_role_bindings_staff").using("btree", table.staffId.asc().nullsLast().op("text_ops"), table.storeId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_staff_role_bindings_business_scope").using("btree", table.staffId.asc().nullsLast().op("uuid_ops"), table.roleId.asc().nullsLast().op("uuid_ops")).where(sql`(store_id IS NULL)`),
	uniqueIndex("uq_staff_role_bindings_store_scope").using("btree", table.staffId.asc().nullsLast().op("uuid_ops"), table.roleId.asc().nullsLast().op("uuid_ops"), table.storeId.asc().nullsLast().op("uuid_ops")).where(sql`(store_id IS NOT NULL)`),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInBusinessTemplate.id],
			name: "staff_role_bindings_role_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "staff_role_bindings_staff_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "staff_role_bindings_store_id_fkey"
		}).onDelete("cascade"),
	unique("staff_role_bindings_staff_id_role_id_store_id_key").on(table.roleId, table.staffId, table.storeId),
	check("chk_staff_role_binding_status", sql`(status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])`),
]);

export const permissionDefinitionsInBusinessTemplate = businessTemplate.table("permission_definitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	permissionKey: varchar("permission_key", { length: 150 }).notNull(),
	scopeType: varchar("scope_type", { length: 20 }).default('tenant').notNull(),
	moduleKey: varchar("module_key", { length: 80 }).notNull(),
	screenKey: varchar("screen_key", { length: 100 }),
	buttonKey: varchar("button_key", { length: 100 }),
	actionKey: varchar("action_key", { length: 100 }).notNull(),
	permissionName: varchar("permission_name", { length: 150 }).notNull(),
	description: text(),
	riskLevel: varchar("risk_level", { length: 20 }).default('low').notNull(),
	requireReason: boolean("require_reason").default(false).notNull(),
	requireMfa: boolean("require_mfa").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("permission_definitions_permission_key_key").on(table.permissionKey),
	check("chk_permission_def_risk", sql`(risk_level)::text = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])`),
	check("chk_permission_def_scope", sql`(scope_type)::text = ANY (ARRAY['tenant'::text, 'store'::text, 'platform'::text])`),
]);

export const salesOrdersInBusinessTemplate = businessTemplate.table("sales_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerId: uuid("register_id"),
	shiftId: uuid("shift_id"),
	orderCode: varchar("order_code", { length: 50 }).notNull(),
	orderType: varchar("order_type", { length: 20 }).default('pos').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	cashierId: uuid("cashier_id"),
	customerId: uuid("customer_id"),
	customerName: varchar("customer_name", { length: 255 }),
	tableId: uuid("table_id"),
	tableName: varchar("table_name", { length: 100 }),
	partySize: integer("party_size").default(1).notNull(),
	subTotal: numeric("sub_total", { precision: 18, scale:  2 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	deliveryFee: numeric("delivery_fee", { precision: 18, scale:  2 }).default('0').notNull(),
	grandTotal: numeric("grand_total", { precision: 18, scale:  2 }).default('0').notNull(),
	paidAmount: numeric("paid_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	changeAmount: numeric("change_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	loyaltyPointsUsed: integer("loyalty_points_used").default(0).notNull(),
	loyaltyPointsEarned: integer("loyalty_points_earned").default(0).notNull(),
	voucherCode: varchar("voucher_code", { length: 50 }),
	note: text(),
	kitchenNote: text("kitchen_note"),
	deliveryAddress: text("delivery_address"),
	deliveryEta: timestamp("delivery_eta", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sourceChannel: varchar("source_channel", { length: 30 }).default('pos').notNull(),
	sourceRef: varchar("source_ref", { length: 120 }),
	paymentStatus: varchar("payment_status", { length: 30 }).default('unpaid').notNull(),
	fulfillmentStatus: varchar("fulfillment_status", { length: 30 }).default('unfulfilled').notNull(),
	inventoryStatus: varchar("inventory_status", { length: 30 }).default('not_deducted').notNull(),
	debtAmount: numeric("debt_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	refundedAmount: numeric("refunded_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	roundingAmount: numeric("rounding_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	serviceChargeAmount: numeric("service_charge_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	tipAmount: numeric("tip_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	externalOrderId: varchar("external_order_id", { length: 120 }),
	idempotencyKey: varchar("idempotency_key", { length: 150 }),
}, (table) => [
	index("idx_sales_order_payment_status").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.paymentStatus.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_sales_order_source").using("btree", table.sourceChannel.asc().nullsLast().op("text_ops"), table.sourceRef.asc().nullsLast().op("text_ops")).where(sql`(source_ref IS NOT NULL)`),
	index("idx_so_cashier").using("btree", table.cashierId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(cashier_id IS NOT NULL)`),
	index("idx_so_code").using("btree", table.orderCode.asc().nullsLast().op("text_ops")),
	index("idx_so_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_so_customer").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")).where(sql`(customer_id IS NOT NULL)`),
	index("idx_so_register").using("btree", table.registerId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(register_id IS NOT NULL)`),
	index("idx_so_shift").using("btree", table.shiftId.asc().nullsLast().op("uuid_ops")).where(sql`(shift_id IS NOT NULL)`),
	index("idx_so_store_date").using("btree", table.storeId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_so_store_status").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_so_store_status_created").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_so_table").using("btree", table.tableId.asc().nullsLast().op("uuid_ops")).where(sql`(table_id IS NOT NULL)`),
	uniqueIndex("uq_sales_orders_order_code").using("btree", table.orderCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tableId],
			foreignColumns: [diningTablesInBusinessTemplate.id],
			name: "fk_so_table"
		}),
	foreignKey({
			columns: [table.cashierId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "sales_orders_cashier_id_fkey"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "sales_orders_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.registerId],
			foreignColumns: [registersInBusinessTemplate.id],
			name: "sales_orders_register_id_fkey"
		}),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [workShiftsInBusinessTemplate.id],
			name: "sales_orders_shift_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "sales_orders_store_id_fkey"
		}),
	pgPolicy("store_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_fulfillment_status", sql`(fulfillment_status)::text = ANY (ARRAY['unfulfilled'::text, 'partial_fulfilled'::text, 'fulfilled'::text, 'delivering'::text, 'delivered'::text, 'failed'::text, 'returned'::text])`),
	check("chk_inventory_status", sql`(inventory_status)::text = ANY (ARRAY['not_reserved'::text, 'reserved'::text, 'not_deducted'::text, 'deducted'::text, 'partial_deducted'::text, 'restored'::text])`),
	check("chk_order_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'ready'::text, 'partial_paid'::text, 'completed'::text, 'cancelled'::text, 'refunded'::text, 'partial_refund'::text])`),
	check("chk_order_type", sql`(order_type)::text = ANY (ARRAY['pos'::text, 'table'::text, 'takeaway'::text, 'delivery'::text, 'online'::text])`),
	check("chk_payment_status", sql`(payment_status)::text = ANY (ARRAY['unpaid'::text, 'partial_paid'::text, 'paid'::text, 'overpaid'::text, 'debt'::text, 'refunded'::text, 'partial_refunded'::text, 'voided'::text])`),
]);

export const salesOrderStatusHistoryInBusinessTemplate = businessTemplate.table("sales_order_status_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	oldStatus: varchar("old_status", { length: 30 }),
	newStatus: varchar("new_status", { length: 30 }).notNull(),
	oldPaymentStatus: varchar("old_payment_status", { length: 30 }),
	newPaymentStatus: varchar("new_payment_status", { length: 30 }),
	oldFulfillmentStatus: varchar("old_fulfillment_status", { length: 30 }),
	newFulfillmentStatus: varchar("new_fulfillment_status", { length: 30 }),
	oldInventoryStatus: varchar("old_inventory_status", { length: 30 }),
	newInventoryStatus: varchar("new_inventory_status", { length: 30 }),
	reason: text(),
	changedBy: uuid("changed_by"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "sales_order_status_history_order_id_fkey"
		}).onDelete("cascade"),
]);

export const customerReceivablesInBusinessTemplate = businessTemplate.table("customer_receivables", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	storeId: uuid("store_id").notNull(),
	orderId: uuid("order_id"),
	receivableCode: varchar("receivable_code", { length: 50 }).notNull(),
	originalAmount: numeric("original_amount", { precision: 18, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	remainingAmount: numeric("remaining_amount", { precision: 18, scale:  2 }).notNull(),
	dueDate: date("due_date"),
	status: varchar({ length: 20 }).default('open').notNull(),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_receivables_customer_status").using("btree", table.customerId.asc().nullsLast().op("date_ops"), table.status.asc().nullsLast().op("date_ops"), table.dueDate.asc().nullsLast().op("date_ops")),
	index("idx_receivables_store_status").using("btree", table.storeId.asc().nullsLast().op("date_ops"), table.status.asc().nullsLast().op("date_ops"), table.dueDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_receivables_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "customer_receivables_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "customer_receivables_store_id_fkey"
		}),
	check("chk_receivable_amount", sql`(original_amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (remaining_amount >= (0)::numeric)`),
	check("chk_receivable_paid_le_original", sql`paid_amount <= original_amount`),
	check("chk_receivable_status", sql`(status)::text = ANY (ARRAY['open'::text, 'partial_paid'::text, 'paid'::text, 'overdue'::text, 'bad_debt'::text, 'cancelled'::text, 'written_off'::text])`),
]);

export const salesOrderAdjustmentsInBusinessTemplate = businessTemplate.table("sales_order_adjustments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	reason: text().notNull(),
	approvedBy: uuid("approved_by"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "sales_order_adjustments_order_id_fkey"
		}).onDelete("cascade"),
	check("chk_sales_order_adjustment_type", sql`(adjustment_type)::text = ANY (ARRAY['discount'::text, 'surcharge'::text, 'tax_adjustment'::text, 'rounding'::text, 'delivery_fee'::text, 'service_charge'::text, 'tip'::text, 'manual_correction'::text])`),
]);

export const idempotencyKeysInBusinessTemplate = businessTemplate.table("idempotency_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	scopeType: varchar("scope_type", { length: 50 }).notNull(),
	scopeId: uuid("scope_id"),
	idempotencyKey: varchar("idempotency_key", { length: 150 }).notNull(),
	requestHash: varchar("request_hash", { length: 255 }),
	responsePayload: jsonb("response_payload"),
	status: varchar({ length: 20 }).default('processing').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_idempotency_lookup").using("btree", table.scopeType.asc().nullsLast().op("text_ops"), table.scopeId.asc().nullsLast().op("uuid_ops"), table.idempotencyKey.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("uq_idempotency_business_store").using("btree", table.scopeType.asc().nullsLast().op("text_ops"), table.scopeId.asc().nullsLast().op("uuid_ops"), table.idempotencyKey.asc().nullsLast().op("uuid_ops")).where(sql`((scope_type)::text = ANY ((ARRAY['tenant'::character varying, 'store'::character varying])::text[]))`),
	uniqueIndex("uq_idempotency_platform").using("btree", table.scopeType.asc().nullsLast().op("text_ops"), table.idempotencyKey.asc().nullsLast().op("text_ops")).where(sql`((scope_type)::text = 'platform'::text)`),
	check("chk_idempotency_scope_id", sql`(((scope_type)::text = 'platform'::text) AND (scope_id IS NULL)) OR (((scope_type)::text = ANY ((ARRAY['tenant'::character varying, 'store'::character varying])::text[])) AND (scope_id IS NOT NULL))`),
	check("chk_idempotency_scope_type", sql`(scope_type)::text = ANY ((ARRAY['platform'::character varying, 'tenant'::character varying, 'store'::character varying])::text[])`),
	check("chk_idempotency_status", sql`(status)::text = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text, 'expired'::text])`),
]);

export const customerCreditProfilesInBusinessTemplate = businessTemplate.table("customer_credit_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	creditLimit: numeric("credit_limit", { precision: 18, scale:  2 }).default('0').notNull(),
	currentDebt: numeric("current_debt", { precision: 18, scale:  2 }).default('0').notNull(),
	paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
	allowCredit: boolean("allow_credit").default(false).notNull(),
	creditStatus: varchar("credit_status", { length: 20 }).default('normal').notNull(),
	lastPaymentAt: timestamp("last_payment_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_credit_profiles_customer_id_fkey"
		}).onDelete("cascade"),
	unique("customer_credit_profiles_customer_id_key").on(table.customerId),
	check("chk_customer_credit_status", sql`(credit_status)::text = ANY (ARRAY['normal'::text, 'watchlist'::text, 'blocked'::text])`),
]);

export const customerReceivablePaymentsInBusinessTemplate = businessTemplate.table("customer_receivable_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	storeId: uuid("store_id").notNull(),
	paymentCode: varchar("payment_code", { length: 50 }).notNull(),
	paymentMethodId: uuid("payment_method_id"),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	receivedBy: uuid("received_by"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_receivable_payments_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethodsInBusinessTemplate.id],
			name: "customer_receivable_payments_payment_method_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "customer_receivable_payments_store_id_fkey"
		}),
	check("chk_receivable_payment_amount", sql`amount > (0)::numeric`),
]);

export const customerReceivableAllocationsInBusinessTemplate = businessTemplate.table("customer_receivable_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receivablePaymentId: uuid("receivable_payment_id").notNull(),
	receivableId: uuid("receivable_id").notNull(),
	orderId: uuid("order_id"),
	allocatedAmount: numeric("allocated_amount", { precision: 18, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "customer_receivable_allocations_order_id_fkey"
		}),
	foreignKey({
			columns: [table.receivableId],
			foreignColumns: [customerReceivablesInBusinessTemplate.id],
			name: "customer_receivable_allocations_receivable_id_fkey"
		}),
	foreignKey({
			columns: [table.receivablePaymentId],
			foreignColumns: [customerReceivablePaymentsInBusinessTemplate.id],
			name: "customer_receivable_allocations_receivable_payment_id_fkey"
		}).onDelete("cascade"),
	check("chk_receivable_allocated_amount", sql`allocated_amount > (0)::numeric`),
]);

export const customerReceivableAdjustmentsInBusinessTemplate = businessTemplate.table("customer_receivable_adjustments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receivableId: uuid("receivable_id").notNull(),
	adjustmentType: varchar("adjustment_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	reason: text().notNull(),
	approvedBy: uuid("approved_by"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.receivableId],
			foreignColumns: [customerReceivablesInBusinessTemplate.id],
			name: "customer_receivable_adjustments_receivable_id_fkey"
		}),
	check("chk_receivable_adjustment_amount", sql`amount > (0)::numeric`),
	check("chk_receivable_adjustment_type", sql`(adjustment_type)::text = ANY (ARRAY['write_off'::text, 'discount_settlement'::text, 'manual_correction'::text, 'bad_debt'::text, 'reopen'::text])`),
]);

export const paymentRefundsInBusinessTemplate = businessTemplate.table("payment_refunds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	paymentId: uuid("payment_id"),
	returnId: uuid("return_id"),
	refundCode: varchar("refund_code", { length: 50 }).notNull(),
	refundAmount: numeric("refund_amount", { precision: 18, scale:  2 }).notNull(),
	refundMethod: varchar("refund_method", { length: 50 }).notNull(),
	transactionRef: varchar("transaction_ref", { length: 255 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reason: text(),
	processedBy: uuid("processed_by"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_refunds_order").using("btree", table.orderId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "payment_refunds_order_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [orderPaymentsInBusinessTemplate.id],
			name: "payment_refunds_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.returnId],
			foreignColumns: [orderReturnsInBusinessTemplate.id],
			name: "payment_refunds_return_id_fkey"
		}),
	check("chk_payment_refund_amount", sql`refund_amount > (0)::numeric`),
	check("chk_payment_refund_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const productsInBusinessTemplate = businessTemplate.table("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productCode: varchar("product_code", { length: 50 }),
	productName: varchar("product_name", { length: 255 }).notNull(),
	categoryId: uuid("category_id"),
	brandId: uuid("brand_id"),
	taxId: uuid("tax_id"),
	unitId: uuid("unit_id"),
	sku: varchar({ length: 100 }),
	barcode: varchar({ length: 100 }),
	sellPrice: numeric("sell_price", { precision: 18, scale:  4 }).default('0').notNull(),
	costPrice: numeric("cost_price", { precision: 18, scale:  4 }).default('0').notNull(),
	comparePrice: numeric("compare_price", { precision: 18, scale:  4 }),
	earnPoints: integer("earn_points").default(0).notNull(),
	weightGram: integer("weight_gram"),
	minStockLevel: numeric("min_stock_level", { precision: 12, scale:  3 }),
	slug: varchar({ length: 255 }),
	shortDesc: text("short_desc"),
	fullDesc: text("full_desc"),
	imageUrl: varchar("image_url", { length: 500 }),
	galleryImages: jsonb("gallery_images").default([]).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	showOnPos: boolean("show_on_pos").default(true).notNull(),
	showOnline: boolean("show_online").default(true).notNull(),
	allowBackorder: boolean("allow_backorder").default(false).notNull(),
	trackInventory: boolean("track_inventory").default(true).notNull(),
	hasVariants: boolean("has_variants").default(false).notNull(),
	productType: varchar("product_type", { length: 30 }).default('simple').notNull(),
	posColor: varchar("pos_color", { length: 7 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_products_barcode").using("btree", table.barcode.asc().nullsLast().op("text_ops")).where(sql`(barcode IS NOT NULL)`),
	index("idx_products_category_display_order").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops"), table.displayOrder.asc().nullsLast().op("int4_ops")),
	index("idx_products_category_id").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_products_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_products_name_trgm").using("gin", table.productName.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.brandId],
			foreignColumns: [brandsInBusinessTemplate.id],
			name: "products_brand_id_fkey"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [productCategoriesInBusinessTemplate.id],
			name: "products_category_id_fkey"
		}),
	foreignKey({
			columns: [table.taxId],
			foreignColumns: [taxClassesInBusinessTemplate.id],
			name: "products_tax_id_fkey"
		}),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [unitsInBusinessTemplate.id],
			name: "products_unit_id_fkey"
		}),
	check("chk_product_type", sql`(product_type)::text = ANY (ARRAY['simple'::text, 'variant'::text, 'combo'::text, 'service'::text, 'modifier'::text, 'ingredient'::text, 'serialized'::text, 'batch'::text])`),
]);

export const productBarcodesInBusinessTemplate = businessTemplate.table("product_barcodes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }),
	barcode: varchar({ length: 100 }).notNull(),
	barcodeType: varchar("barcode_type", { length: 30 }).default('ean13').notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_product_barcodes_barcode").using("btree", table.barcode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_barcodes_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_barcodes_variant_id_fkey"
		}).onDelete("cascade"),
	unique("product_barcodes_barcode_key").on(table.barcode),
]);

export const productStoreSettingsInBusinessTemplate = businessTemplate.table("product_store_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	isAvailable: boolean("is_available").default(true).notNull(),
	showOnPos: boolean("show_on_pos").default(true).notNull(),
	showOnline: boolean("show_online").default(true).notNull(),
	allowBackorder: boolean("allow_backorder").default(false).notNull(),
	minStockLevel: numeric("min_stock_level", { precision: 12, scale:  3 }),
	maxStockLevel: numeric("max_stock_level", { precision: 12, scale:  3 }),
	reorderPoint: numeric("reorder_point", { precision: 12, scale:  3 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_product_store_settings_no_variant").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops")).where(sql`(variant_id IS NULL)`),
	uniqueIndex("uq_product_store_settings_with_variant").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops"), table.variantId.asc().nullsLast().op("uuid_ops")).where(sql`(variant_id IS NOT NULL)`),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_store_settings_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "product_store_settings_store_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_store_settings_variant_id_fkey"
		}).onDelete("cascade"),
]);

export const productLotsInBusinessTemplate = businessTemplate.table("product_lots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotCode: varchar("lot_code", { length: 100 }).notNull(),
	manufactureDate: date("manufacture_date"),
	expiryDate: date("expiry_date"),
	supplierId: uuid("supplier_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_product_lots_no_variant").using("btree", table.productId.asc().nullsLast().op("text_ops"), table.lotCode.asc().nullsLast().op("text_ops")).where(sql`(variant_id IS NULL)`),
	uniqueIndex("uq_product_lots_with_variant").using("btree", table.productId.asc().nullsLast().op("text_ops"), table.variantId.asc().nullsLast().op("text_ops"), table.lotCode.asc().nullsLast().op("text_ops")).where(sql`(variant_id IS NOT NULL)`),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_lots_product_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "product_lots_supplier_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_lots_variant_id_fkey"
		}),
]);

export const productSerialsInBusinessTemplate = businessTemplate.table("product_serials", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	serialNumber: varchar("serial_number", { length: 150 }).notNull(),
	storeId: uuid("store_id"),
	locationId: uuid("location_id"),
	status: varchar({ length: 30 }).default('in_stock').notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	salesOrderId: uuid("sales_order_id"),
	soldAt: timestamp("sold_at", { withTimezone: true, mode: 'string' }),
	warrantyStart: date("warranty_start"),
	warrantyEnd: date("warranty_end"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "product_serials_location_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_serials_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "product_serials_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_serials_variant_id_fkey"
		}),
	unique("product_serials_serial_number_key").on(table.serialNumber),
	check("chk_serial_status", sql`(status)::text = ANY (ARRAY['in_stock'::text, 'reserved'::text, 'sold'::text, 'returned'::text, 'damaged'::text, 'lost'::text])`),
]);

export const productRecipesInBusinessTemplate = businessTemplate.table("product_recipes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	ingredientProductId: uuid("ingredient_product_id").notNull(),
	ingredientVariantId: uuid("ingredient_variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	wastageRate: numeric("wastage_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_recipes_ingredient_product_id_fkey"
		}),
	foreignKey({
			columns: [table.ingredientVariantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_recipes_ingredient_variant_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_recipes_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_recipes_variant_id_fkey"
		}),
	check("chk_recipe_qty", sql`quantity > (0)::numeric`),
]);

export const productPriceHistoryInBusinessTemplate = businessTemplate.table("product_price_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	storeId: uuid("store_id"),
	oldPrice: numeric("old_price", { precision: 18, scale:  4 }),
	newPrice: numeric("new_price", { precision: 18, scale:  4 }).notNull(),
	changedBy: uuid("changed_by"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_price_history_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "product_price_history_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_price_history_variant_id_fkey"
		}),
]);

export const productCostHistoryInBusinessTemplate = businessTemplate.table("product_cost_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	oldCost: numeric("old_cost", { precision: 18, scale:  4 }),
	newCost: numeric("new_cost", { precision: 18, scale:  4 }).notNull(),
	changedBy: uuid("changed_by"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_cost_history_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "product_cost_history_variant_id_fkey"
		}),
]);

export const stockReservationsInBusinessTemplate = businessTemplate.table("stock_reservations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationId: uuid("location_id").notNull(),
	orderId: uuid("order_id"),
	orderLineId: uuid("order_line_id"),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotId: uuid("lot_id"),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_reservations_order").using("btree", table.orderId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_stock_reservations_product").using("btree", table.locationId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_reservations_location_id_fkey"
		}),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "stock_reservations_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "stock_reservations_order_id_fkey"
		}),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "stock_reservations_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_reservations_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stock_reservations_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "stock_reservations_variant_id_fkey"
		}),
	check("chk_stock_reservation_qty", sql`quantity > (0)::numeric`),
	check("chk_stock_reservation_status", sql`(status)::text = ANY (ARRAY['active'::text, 'consumed'::text, 'released'::text, 'expired'::text, 'cancelled'::text])`),
]);

export const stockLotBalancesInBusinessTemplate = businessTemplate.table("stock_lot_balances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	locationId: uuid("location_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotId: uuid("lot_id").notNull(),
	unitName: varchar("unit_name", { length: 50 }).default('piece').notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('0').notNull(),
	reservedQty: numeric("reserved_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	avgCost: numeric("avg_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_stock_lot_balances_scope").using("btree", sql`location_id`, sql`product_id`, sql`COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uu`, sql`lot_id`, sql`unit_name`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_lot_balances_location_id_fkey"
		}),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "stock_lot_balances_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_lot_balances_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "stock_lot_balances_variant_id_fkey"
		}),
]);

export const supplierPayablesInBusinessTemplate = businessTemplate.table("supplier_payables", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierId: uuid("supplier_id").notNull(),
	storeId: uuid("store_id").notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	payableCode: varchar("payable_code", { length: 50 }).notNull(),
	originalAmount: numeric("original_amount", { precision: 18, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	remainingAmount: numeric("remaining_amount", { precision: 18, scale:  2 }).notNull(),
	dueDate: date("due_date"),
	status: varchar({ length: 20 }).default('open').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_supplier_payables_supplier").using("btree", table.supplierId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`((status)::text <> ALL ((ARRAY['paid'::character varying, 'cancelled'::character varying])::text[]))`),
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "supplier_payables_purchase_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "supplier_payables_store_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "supplier_payables_supplier_id_fkey"
		}),
	check("chk_supplier_payable_status", sql`(status)::text = ANY (ARRAY['open'::text, 'partial_paid'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'written_off'::text])`),
]);

export const supplierPaymentsInBusinessTemplate = businessTemplate.table("supplier_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierId: uuid("supplier_id").notNull(),
	storeId: uuid("store_id").notNull(),
	paymentMethodId: uuid("payment_method_id"),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	paidBy: uuid("paid_by"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethodsInBusinessTemplate.id],
			name: "supplier_payments_payment_method_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "supplier_payments_store_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "supplier_payments_supplier_id_fkey"
		}),
	check("chk_supplier_payment_amount", sql`amount > (0)::numeric`),
]);

export const supplierPaymentAllocationsInBusinessTemplate = businessTemplate.table("supplier_payment_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierPaymentId: uuid("supplier_payment_id").notNull(),
	supplierPayableId: uuid("supplier_payable_id").notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	allocatedAmount: numeric("allocated_amount", { precision: 18, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "supplier_payment_allocations_purchase_order_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierPayableId],
			foreignColumns: [supplierPayablesInBusinessTemplate.id],
			name: "supplier_payment_allocations_supplier_payable_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierPaymentId],
			foreignColumns: [supplierPaymentsInBusinessTemplate.id],
			name: "supplier_payment_allocations_supplier_payment_id_fkey"
		}).onDelete("cascade"),
	check("chk_supplier_payment_alloc_amount", sql`allocated_amount > (0)::numeric`),
]);

export const deliveryOrdersInBusinessTemplate = businessTemplate.table("delivery_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	storeId: uuid("store_id").notNull(),
	deliveryCode: varchar("delivery_code", { length: 50 }).notNull(),
	carrierName: varchar("carrier_name", { length: 100 }),
	shipperId: uuid("shipper_id"),
	deliveryStatus: varchar("delivery_status", { length: 30 }).default('pending').notNull(),
	codAmount: numeric("cod_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	deliveryFee: numeric("delivery_fee", { precision: 18, scale:  2 }).default('0').notNull(),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	failedReason: text("failed_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "delivery_orders_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "delivery_orders_store_id_fkey"
		}),
	check("chk_delivery_order_status", sql`(delivery_status)::text = ANY (ARRAY['pending'::text, 'assigned'::text, 'picked_up'::text, 'delivering'::text, 'delivered'::text, 'failed'::text, 'returned'::text, 'cancelled'::text])`),
]);

export const reportDailySalesSnapshotsInBusinessTemplate = businessTemplate.table("report_daily_sales_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	reportDate: date("report_date").notNull(),
	grossSales: numeric("gross_sales", { precision: 18, scale:  2 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	refundAmount: numeric("refund_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	netSales: numeric("net_sales", { precision: 18, scale:  2 }).default('0').notNull(),
	cashCollected: numeric("cash_collected", { precision: 18, scale:  2 }).default('0').notNull(),
	receivableAmount: numeric("receivable_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	cogsAmount: numeric("cogs_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	grossProfit: numeric("gross_profit", { precision: 18, scale:  2 }).default('0').notNull(),
	orderCount: integer("order_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "report_daily_sales_snapshots_store_id_fkey"
		}),
	unique("report_daily_sales_snapshots_store_id_report_date_key").on(table.reportDate, table.storeId),
]);

export const approvalRequestsInBusinessTemplate = businessTemplate.table("approval_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	requestType: varchar("request_type", { length: 50 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: uuid("entity_id"),
	requestedBy: uuid("requested_by").notNull(),
	approvedBy: uuid("approved_by"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reason: text().notNull(),
	payload: jsonb().default({}).notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	rejectedAt: timestamp("rejected_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "approval_requests_store_id_fkey"
		}),
	check("chk_approval_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])`),
]);

export const eventOutboxInBusinessTemplate = businessTemplate.table("event_outbox", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	aggregateType: varchar("aggregate_type", { length: 50 }).notNull(),
	aggregateId: uuid("aggregate_id").notNull(),
	payload: jsonb().default({}).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	retryCount: integer("retry_count").default(0).notNull(),
	nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: 'string' }),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_outbox_pending").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")).where(sql`((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]))`),
	check("chk_event_outbox_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text])`),
]);

export const offlineSyncBatchesInBusinessTemplate = businessTemplate.table("offline_sync_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerId: uuid("register_id"),
	deviceIdentityId: uuid("device_identity_id"),
	batchCode: varchar("batch_code", { length: 100 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	payload: jsonb().notNull(),
	errorMessage: text("error_message"),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.registerId],
			foreignColumns: [registersInBusinessTemplate.id],
			name: "offline_sync_batches_register_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "offline_sync_batches_store_id_fkey"
		}),
	unique("offline_sync_batches_store_id_batch_code_key").on(table.batchCode, table.storeId),
	check("chk_offline_sync_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'synced'::text, 'failed'::text, 'conflict'::text])`),
]);

export const invoiceNumberSequencesInBusinessTemplate = businessTemplate.table("invoice_number_sequences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	invoiceType: varchar("invoice_type", { length: 30 }).default('sales_invoice').notNull(),
	prefix: varchar({ length: 30 }).default(').notNull(),
	suffix: varchar({ length: 30 }).default(').notNull(),
	padLength: integer("pad_length").default(6).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastNumber: bigint("last_number", { mode: "number" }).default(0).notNull(),
	resetPeriod: varchar("reset_period", { length: 20 }).default('yearly').notNull(),
	lastResetAt: timestamp("last_reset_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "invoice_number_sequences_store_id_fkey"
		}),
	unique("invoice_number_sequences_store_id_invoice_type_key").on(table.invoiceType, table.storeId),
	check("chk_invoice_seq_reset", sql`(reset_period)::text = ANY (ARRAY['never'::text, 'daily'::text, 'monthly'::text, 'yearly'::text])`),
]);

export const salesInvoicesInBusinessTemplate = businessTemplate.table("sales_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id"),
	orderId: uuid("order_id"),
	invoiceCode: varchar("invoice_code", { length: 60 }).notNull(),
	invoiceType: varchar("invoice_type", { length: 30 }).default('standard').notNull(),
	invoiceStatus: varchar("invoice_status", { length: 30 }).default('draft').notNull(),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	buyerName: varchar("buyer_name", { length: 255 }),
	buyerTaxCode: varchar("buyer_tax_code", { length: 50 }),
	buyerAddress: text("buyer_address"),
	buyerEmail: varchar("buyer_email", { length: 255 }),
	subTotal: numeric("sub_total", { precision: 18, scale:  2 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	grandTotal: numeric("grand_total", { precision: 18, scale:  2 }).default('0').notNull(),
	externalInvoiceId: varchar("external_invoice_id", { length: 120 }),
	externalInvoiceUrl: text("external_invoice_url"),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sales_invoices_customer").using("btree", table.customerId.asc().nullsLast().op("timestamptz_ops"), table.issuedAt.desc().nullsFirst().op("uuid_ops")).where(sql`(customer_id IS NOT NULL)`),
	index("idx_sales_invoices_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")).where(sql`(order_id IS NOT NULL)`),
	index("idx_sales_invoices_store_status").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.invoiceStatus.asc().nullsLast().op("uuid_ops"), table.issuedAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "sales_invoices_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "sales_invoices_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "sales_invoices_store_id_fkey"
		}),
	unique("sales_invoices_invoice_code_key").on(table.invoiceCode),
	check("chk_sales_invoice_status", sql`(invoice_status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'adjusted'::text, 'replaced'::text])`),
	check("chk_sales_invoice_type", sql`(invoice_type)::text = ANY (ARRAY['standard'::text, 'replacement'::text, 'adjustment'::text, 'consolidated'::text])`),
]);

export const salesInvoiceLinesInBusinessTemplate = businessTemplate.table("sales_invoice_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	orderLineId: uuid("order_line_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	description: text().notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	unitName: varchar("unit_name", { length: 50 }),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 18, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [salesInvoicesInBusinessTemplate.id],
			name: "sales_invoice_lines_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "sales_invoice_lines_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "sales_invoice_lines_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "sales_invoice_lines_variant_id_fkey"
		}),
]);

export const salesInvoiceTaxesInBusinessTemplate = businessTemplate.table("sales_invoice_taxes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	taxCode: varchar("tax_code", { length: 30 }).notNull(),
	taxRate: numeric("tax_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	taxableAmount: numeric("taxable_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [salesInvoicesInBusinessTemplate.id],
			name: "sales_invoice_taxes_invoice_id_fkey"
		}).onDelete("cascade"),
]);

export const creditNotesInBusinessTemplate = businessTemplate.table("credit_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id"),
	invoiceId: uuid("invoice_id"),
	orderId: uuid("order_id"),
	creditNoteCode: varchar("credit_note_code", { length: 60 }).notNull(),
	reason: text().notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_credit_notes_invoice").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")).where(sql`(invoice_id IS NOT NULL)`),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "credit_notes_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [salesInvoicesInBusinessTemplate.id],
			name: "credit_notes_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "credit_notes_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "credit_notes_store_id_fkey"
		}),
	unique("credit_notes_credit_note_code_key").on(table.creditNoteCode),
	check("chk_credit_note_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'applied'::text])`),
]);

export const creditNoteLinesInBusinessTemplate = businessTemplate.table("credit_note_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	creditNoteId: uuid("credit_note_id").notNull(),
	invoiceLineId: uuid("invoice_line_id"),
	description: text().notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	amount: numeric({ precision: 18, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creditNoteId],
			foreignColumns: [creditNotesInBusinessTemplate.id],
			name: "credit_note_lines_credit_note_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invoiceLineId],
			foreignColumns: [salesInvoiceLinesInBusinessTemplate.id],
			name: "credit_note_lines_invoice_line_id_fkey"
		}),
]);

export const debitNotesInBusinessTemplate = businessTemplate.table("debit_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id"),
	invoiceId: uuid("invoice_id"),
	debitNoteCode: varchar("debit_note_code", { length: 60 }).notNull(),
	reason: text().notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_debit_notes_invoice").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")).where(sql`(invoice_id IS NOT NULL)`),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "debit_notes_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [salesInvoicesInBusinessTemplate.id],
			name: "debit_notes_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "debit_notes_store_id_fkey"
		}),
	unique("debit_notes_debit_note_code_key").on(table.debitNoteCode),
	check("chk_debit_note_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'issued'::text, 'cancelled'::text, 'applied'::text])`),
]);

export const taxReportsInBusinessTemplate = businessTemplate.table("tax_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	periodCode: varchar("period_code", { length: 30 }).notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	outputTaxAmount: numeric("output_tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	inputTaxAmount: numeric("input_tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	netTaxAmount: numeric("net_tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "tax_reports_store_id_fkey"
		}),
	check("chk_tax_report_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'closed'::text, 'reopened'::text])`),
]);

export const cashDrawerMovementsInBusinessTemplate = businessTemplate.table("cash_drawer_movements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	registerId: uuid("register_id"),
	shiftId: uuid("shift_id"),
	cashAccountId: uuid("cash_account_id"),
	movementCode: varchar("movement_code", { length: 50 }).notNull(),
	movementType: varchar("movement_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	reason: text(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cash_drawer_shift").using("btree", table.shiftId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.cashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "cash_drawer_movements_cash_account_id_fkey"
		}),
	foreignKey({
			columns: [table.registerId],
			foreignColumns: [registersInBusinessTemplate.id],
			name: "cash_drawer_movements_register_id_fkey"
		}),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [workShiftsInBusinessTemplate.id],
			name: "cash_drawer_movements_shift_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "cash_drawer_movements_store_id_fkey"
		}),
	check("chk_cash_drawer_amount", sql`amount >= (0)::numeric`),
	check("chk_cash_drawer_movement_type", sql`(movement_type)::text = ANY (ARRAY['open_cash'::text, 'sale_cash_in'::text, 'refund_cash_out'::text, 'paid_in'::text, 'paid_out'::text, 'cash_drop'::text, 'safe_transfer'::text, 'close_cash'::text, 'adjustment'::text])`),
]);

export const shiftPaymentSummariesInBusinessTemplate = businessTemplate.table("shift_payment_summaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shiftId: uuid("shift_id").notNull(),
	paymentMethodId: uuid("payment_method_id"),
	methodCode: varchar("method_code", { length: 50 }).notNull(),
	expectedAmount: numeric("expected_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	countedAmount: numeric("counted_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	varianceAmount: numeric("variance_amount", { precision: 18, scale:  2 }).generatedAlwaysAs(sql`(counted_amount - expected_amount)`),
	orderCount: integer("order_count").default(0).notNull(),
	refundAmount: numeric("refund_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethodsInBusinessTemplate.id],
			name: "shift_payment_summaries_payment_method_id_fkey"
		}),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [workShiftsInBusinessTemplate.id],
			name: "shift_payment_summaries_shift_id_fkey"
		}).onDelete("cascade"),
	unique("shift_payment_summaries_shift_id_method_code_key").on(table.methodCode, table.shiftId),
]);

export const shiftCashCountsInBusinessTemplate = businessTemplate.table("shift_cash_counts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shiftId: uuid("shift_id").notNull(),
	denominationId: uuid("denomination_id"),
	quantity: integer().default(0).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).default('0').notNull(),
	countedBy: uuid("counted_by"),
	countedAt: timestamp("counted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.denominationId],
			foreignColumns: [cashDenominationsInBusinessTemplate.id],
			name: "shift_cash_counts_denomination_id_fkey"
		}),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [workShiftsInBusinessTemplate.id],
			name: "shift_cash_counts_shift_id_fkey"
		}).onDelete("cascade"),
]);

export const cashDenominationsInBusinessTemplate = businessTemplate.table("cash_denominations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	currencyCode: char("currency_code", { length: 3 }).default('VND').notNull(),
	denominationValue: numeric("denomination_value", { precision: 18, scale:  2 }).notNull(),
	denominationName: varchar("denomination_name", { length: 50 }),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	unique("cash_denominations_currency_code_denomination_value_key").on(table.currencyCode, table.denominationValue),
]);

export const bankStatementImportsInBusinessTemplate = businessTemplate.table("bank_statement_imports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	cashAccountId: uuid("cash_account_id"),
	importCode: varchar("import_code", { length: 60 }).notNull(),
	fileName: varchar("file_name", { length: 255 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	importedBy: uuid("imported_by"),
	importedAt: timestamp("imported_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "bank_statement_imports_cash_account_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "bank_statement_imports_store_id_fkey"
		}),
	unique("bank_statement_imports_import_code_key").on(table.importCode),
	check("chk_bank_statement_import_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])`),
]);

export const bankTransactionsInBusinessTemplate = businessTemplate.table("bank_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	importId: uuid("import_id"),
	cashAccountId: uuid("cash_account_id"),
	transactionRef: varchar("transaction_ref", { length: 255 }),
	transactionTime: timestamp("transaction_time", { withTimezone: true, mode: 'string' }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	direction: varchar({ length: 10 }).notNull(),
	description: text(),
	counterpartyAccount: varchar("counterparty_account", { length: 100 }),
	counterpartyName: varchar("counterparty_name", { length: 255 }),
	matchStatus: varchar("match_status", { length: 20 }).default('unmatched').notNull(),
	matchedRefType: varchar("matched_ref_type", { length: 50 }),
	matchedRefId: uuid("matched_ref_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_bank_transactions_match").using("btree", table.matchStatus.asc().nullsLast().op("timestamptz_ops"), table.transactionTime.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_bank_transactions_ref").using("btree", table.transactionRef.asc().nullsLast().op("text_ops")).where(sql`(transaction_ref IS NOT NULL)`),
	index("idx_bank_txn_account_match").using("btree", table.cashAccountId.asc().nullsLast().op("text_ops"), table.matchStatus.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "bank_transactions_cash_account_id_fkey"
		}),
	foreignKey({
			columns: [table.importId],
			foreignColumns: [bankStatementImportsInBusinessTemplate.id],
			name: "bank_transactions_import_id_fkey"
		}).onDelete("set null"),
	check("chk_bank_txn_direction", sql`(direction)::text = ANY (ARRAY['in'::text, 'out'::text])`),
	check("chk_bank_txn_match_status", sql`(match_status)::text = ANY (ARRAY['unmatched'::text, 'matched'::text, 'ignored'::text, 'duplicate'::text])`),
]);

export const paymentReconciliationsInBusinessTemplate = businessTemplate.table("payment_reconciliations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	reconciliationCode: varchar("reconciliation_code", { length: 60 }).notNull(),
	sourceType: varchar("source_type", { length: 30 }).notNull(),
	periodStart: timestamp("period_start", { withTimezone: true, mode: 'string' }),
	periodEnd: timestamp("period_end", { withTimezone: true, mode: 'string' }),
	expectedAmount: numeric("expected_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	actualAmount: numeric("actual_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	varianceAmount: numeric("variance_amount", { precision: 18, scale:  2 }).generatedAlwaysAs(sql`(actual_amount - expected_amount)`),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdBy: uuid("created_by"),
	closedBy: uuid("closed_by"),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payment_recon_store_status").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "payment_reconciliations_store_id_fkey"
		}),
	unique("payment_reconciliations_reconciliation_code_key").on(table.reconciliationCode),
	check("chk_payment_recon_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'matched'::text, 'variance'::text, 'closed'::text, 'cancelled'::text])`),
]);

export const paymentReconciliationItemsInBusinessTemplate = businessTemplate.table("payment_reconciliation_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reconciliationId: uuid("reconciliation_id").notNull(),
	orderPaymentId: uuid("order_payment_id"),
	bankTransactionId: uuid("bank_transaction_id"),
	expectedAmount: numeric("expected_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	actualAmount: numeric("actual_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	matchStatus: varchar("match_status", { length: 20 }).default('pending').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bankTransactionId],
			foreignColumns: [bankTransactionsInBusinessTemplate.id],
			name: "payment_reconciliation_items_bank_transaction_id_fkey"
		}),
	foreignKey({
			columns: [table.orderPaymentId],
			foreignColumns: [orderPaymentsInBusinessTemplate.id],
			name: "payment_reconciliation_items_order_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.reconciliationId],
			foreignColumns: [paymentReconciliationsInBusinessTemplate.id],
			name: "payment_reconciliation_items_reconciliation_id_fkey"
		}).onDelete("cascade"),
	check("chk_payment_recon_item_status", sql`(match_status)::text = ANY (ARRAY['pending'::text, 'matched'::text, 'variance'::text, 'ignored'::text])`),
]);

export const bankDepositsInBusinessTemplate = businessTemplate.table("bank_deposits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	fromCashAccountId: uuid("from_cash_account_id"),
	toCashAccountId: uuid("to_cash_account_id"),
	depositCode: varchar("deposit_code", { length: 60 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	depositedBy: uuid("deposited_by"),
	depositedAt: timestamp("deposited_at", { withTimezone: true, mode: 'string' }),
	confirmedBy: uuid("confirmed_by"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.fromCashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "bank_deposits_from_cash_account_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "bank_deposits_store_id_fkey"
		}),
	foreignKey({
			columns: [table.toCashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "bank_deposits_to_cash_account_id_fkey"
		}),
	unique("bank_deposits_deposit_code_key").on(table.depositCode),
	check("chk_bank_deposit_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'deposited'::text, 'confirmed'::text, 'cancelled'::text])`),
]);

export const supplierReturnsInBusinessTemplate = businessTemplate.table("supplier_returns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	supplierId: uuid("supplier_id").notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	supplierReturnCode: varchar("supplier_return_code", { length: 60 }).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	returnReason: text("return_reason"),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	refundMethod: varchar("refund_method", { length: 50 }),
	processedBy: uuid("processed_by"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "supplier_returns_purchase_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "supplier_returns_store_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "supplier_returns_supplier_id_fkey"
		}),
	unique("supplier_returns_supplier_return_code_key").on(table.supplierReturnCode),
	check("chk_supplier_return_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'approved'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text])`),
]);

export const supplierReturnLinesInBusinessTemplate = businessTemplate.table("supplier_return_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierReturnId: uuid("supplier_return_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotId: uuid("lot_id"),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 18, scale:  2 }).default('0').notNull(),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "supplier_return_lines_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "supplier_return_lines_product_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierReturnId],
			foreignColumns: [supplierReturnsInBusinessTemplate.id],
			name: "supplier_return_lines_supplier_return_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "supplier_return_lines_variant_id_fkey"
		}),
	check("chk_supplier_return_qty", sql`quantity > (0)::numeric`),
]);

export const supplierCreditNotesInBusinessTemplate = businessTemplate.table("supplier_credit_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	supplierId: uuid("supplier_id").notNull(),
	storeId: uuid("store_id").notNull(),
	supplierReturnId: uuid("supplier_return_id"),
	creditNoteCode: varchar("credit_note_code", { length: 60 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	appliedAmount: numeric("applied_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "supplier_credit_notes_store_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliersInBusinessTemplate.id],
			name: "supplier_credit_notes_supplier_id_fkey"
		}),
	foreignKey({
			columns: [table.supplierReturnId],
			foreignColumns: [supplierReturnsInBusinessTemplate.id],
			name: "supplier_credit_notes_supplier_return_id_fkey"
		}),
	unique("supplier_credit_notes_credit_note_code_key").on(table.creditNoteCode),
	check("chk_supplier_credit_note_status", sql`(status)::text = ANY (ARRAY['open'::text, 'partial_applied'::text, 'applied'::text, 'cancelled'::text])`),
]);

export const receivingDiscrepanciesInBusinessTemplate = businessTemplate.table("receiving_discrepancies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	expectedQty: numeric("expected_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	receivedQty: numeric("received_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	discrepancyType: varchar("discrepancy_type", { length: 30 }).notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_receiving_disc_variant"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "receiving_discrepancies_product_id_fkey"
		}),
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "receiving_discrepancies_purchase_order_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "receiving_discrepancies_variant_id_fkey"
		}),
	check("chk_receiving_discrepancy_status", sql`(status)::text = ANY (ARRAY['open'::text, 'resolved'::text, 'ignored'::text])`),
	check("chk_receiving_discrepancy_type", sql`(discrepancy_type)::text = ANY (ARRAY['shortage'::text, 'overage'::text, 'damaged'::text, 'wrong_item'::text, 'quality_issue'::text])`),
]);

export const inventoryCostLayersInBusinessTemplate = businessTemplate.table("inventory_cost_layers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	locationId: uuid("location_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotId: uuid("lot_id"),
	sourceRefType: varchar("source_ref_type", { length: 50 }),
	sourceRefId: uuid("source_ref_id"),
	quantityIn: numeric("quantity_in", { precision: 18, scale:  4 }).default('0').notNull(),
	quantityRemaining: numeric("quantity_remaining", { precision: 18, scale:  4 }).default('0').notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	totalCost: numeric("total_cost", { precision: 18, scale:  2 }).default('0').notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cost_layers_product").using("btree", table.productId.asc().nullsLast().op("numeric_ops"), table.variantId.asc().nullsLast().op("numeric_ops"), table.quantityRemaining.asc().nullsLast().op("uuid_ops")),
	index("idx_inv_cost_layer_remaining").using("btree", table.productId.asc().nullsLast().op("timestamptz_ops"), table.locationId.asc().nullsLast().op("timestamptz_ops"), table.receivedAt.asc().nullsLast().op("uuid_ops")).where(sql`(quantity_remaining > (0)::numeric)`),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "inventory_cost_layers_location_id_fkey"
		}),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "inventory_cost_layers_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "inventory_cost_layers_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "inventory_cost_layers_variant_id_fkey"
		}),
	check("chk_cost_layer_qty", sql`(quantity_in >= (0)::numeric) AND (quantity_remaining >= (0)::numeric)`),
]);

export const cogsAllocationsInBusinessTemplate = businessTemplate.table("cogs_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	orderLineId: uuid("order_line_id").notNull(),
	costLayerId: uuid("cost_layer_id"),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	totalCost: numeric("total_cost", { precision: 18, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_cogs_alloc_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_cogs_order_line").using("btree", table.orderLineId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.costLayerId],
			foreignColumns: [inventoryCostLayersInBusinessTemplate.id],
			name: "cogs_allocations_cost_layer_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "cogs_allocations_order_id_fkey"
		}),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "cogs_allocations_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "cogs_allocations_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "cogs_allocations_variant_id_fkey"
		}),
	check("chk_cogs_alloc_cost_nonneg", sql`(unit_cost >= (0)::numeric) AND (total_cost >= (0)::numeric)`),
	check("chk_cogs_alloc_qty", sql`quantity > (0)::numeric`),
]);

export const landedCostsInBusinessTemplate = businessTemplate.table("landed_costs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	purchaseOrderId: uuid("purchase_order_id"),
	landedCostCode: varchar("landed_cost_code", { length: 60 }).notNull(),
	costType: varchar("cost_type", { length: 50 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	allocationMethod: varchar("allocation_method", { length: 30 }).default('by_value').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "landed_costs_purchase_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "landed_costs_store_id_fkey"
		}),
	unique("landed_costs_landed_cost_code_key").on(table.landedCostCode),
	check("chk_landed_cost_alloc_method", sql`(allocation_method)::text = ANY (ARRAY['by_value'::text, 'by_quantity'::text, 'by_weight'::text, 'manual'::text])`),
	check("chk_landed_cost_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'allocated'::text, 'posted'::text, 'cancelled'::text])`),
]);

export const landedCostAllocationsInBusinessTemplate = businessTemplate.table("landed_cost_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	landedCostId: uuid("landed_cost_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	costLayerId: uuid("cost_layer_id"),
	allocatedAmount: numeric("allocated_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.costLayerId],
			foreignColumns: [inventoryCostLayersInBusinessTemplate.id],
			name: "landed_cost_allocations_cost_layer_id_fkey"
		}),
	foreignKey({
			columns: [table.landedCostId],
			foreignColumns: [landedCostsInBusinessTemplate.id],
			name: "landed_cost_allocations_landed_cost_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "landed_cost_allocations_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "landed_cost_allocations_variant_id_fkey"
		}),
]);

export const inventoryCostAdjustmentsInBusinessTemplate = businessTemplate.table("inventory_cost_adjustments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	oldUnitCost: numeric("old_unit_cost", { precision: 18, scale:  4 }),
	newUnitCost: numeric("new_unit_cost", { precision: 18, scale:  4 }).notNull(),
	quantityAffected: numeric("quantity_affected", { precision: 18, scale:  4 }),
	reason: text().notNull(),
	approvedBy: uuid("approved_by"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "inventory_cost_adjustments_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "inventory_cost_adjustments_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "inventory_cost_adjustments_variant_id_fkey"
		}),
]);

export const stockValuationSnapshotsInBusinessTemplate = businessTemplate.table("stock_valuation_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	locationId: uuid("location_id"),
	snapshotDate: date("snapshot_date").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).default('0').notNull(),
	avgCost: numeric("avg_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	totalValue: numeric("total_value", { precision: 18, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_valuation_snapshots_location_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_valuation_snapshots_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stock_valuation_snapshots_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "stock_valuation_snapshots_variant_id_fkey"
		}),
	unique("stock_valuation_snapshots_location_id_snapshot_date_product_key").on(table.locationId, table.productId, table.snapshotDate, table.variantId),
]);

export const salesChannelsInBusinessTemplate = businessTemplate.table("sales_channels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	channelCode: varchar("channel_code", { length: 50 }).notNull(),
	channelName: varchar("channel_name", { length: 150 }).notNull(),
	channelType: varchar("channel_type", { length: 30 }).notNull(),
	config: jsonb().default({}).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("sales_channels_channel_code_key").on(table.channelCode),
	check("chk_sales_channel_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'error'::text])`),
	check("chk_sales_channel_type", sql`(channel_type)::text = ANY (ARRAY['pos'::text, 'website'::text, 'marketplace'::text, 'social'::text, 'api'::text, 'manual'::text])`),
]);

export const channelProductMappingsInBusinessTemplate = businessTemplate.table("channel_product_mappings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	channelId: uuid("channel_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	externalProductId: varchar("external_product_id", { length: 150 }).notNull(),
	externalVariantId: varchar("external_variant_id", { length: 150 }),
	externalSku: varchar("external_sku", { length: 150 }),
	syncStatus: varchar("sync_status", { length: 20 }).default('synced').notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [salesChannelsInBusinessTemplate.id],
			name: "channel_product_mappings_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "channel_product_mappings_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "channel_product_mappings_variant_id_fkey"
		}),
	unique("channel_product_mappings_channel_id_external_product_id_ext_key").on(table.channelId, table.externalProductId, table.externalVariantId),
]);

export const channelOrderMappingsInBusinessTemplate = businessTemplate.table("channel_order_mappings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	channelId: uuid("channel_id").notNull(),
	orderId: uuid("order_id"),
	externalOrderId: varchar("external_order_id", { length: 150 }).notNull(),
	externalOrderStatus: varchar("external_order_status", { length: 80 }),
	rawPayload: jsonb("raw_payload").default({}).notNull(),
	importedAt: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_channel_orders_external").using("btree", table.channelId.asc().nullsLast().op("text_ops"), table.externalOrderId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [salesChannelsInBusinessTemplate.id],
			name: "channel_order_mappings_channel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "channel_order_mappings_order_id_fkey"
		}),
	unique("channel_order_mappings_channel_id_external_order_id_key").on(table.channelId, table.externalOrderId),
]);

export const syncJobsInBusinessTemplate = businessTemplate.table("sync_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	channelId: uuid("channel_id"),
	jobType: varchar("job_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	totalItems: integer("total_items").default(0).notNull(),
	successItems: integer("success_items").default(0).notNull(),
	failedItems: integer("failed_items").default(0).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [salesChannelsInBusinessTemplate.id],
			name: "sync_jobs_channel_id_fkey"
		}),
	check("chk_sync_job_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])`),
]);

export const syncJobLogsInBusinessTemplate = businessTemplate.table("sync_job_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	syncJobId: uuid("sync_job_id").notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: uuid("entity_id"),
	externalId: varchar("external_id", { length: 150 }),
	status: varchar({ length: 20 }).notNull(),
	message: text(),
	payload: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.syncJobId],
			foreignColumns: [syncJobsInBusinessTemplate.id],
			name: "sync_job_logs_sync_job_id_fkey"
		}).onDelete("cascade"),
]);

export const webhookInboxInBusinessTemplate = businessTemplate.table("webhook_inbox", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceType: varchar("source_type", { length: 50 }).notNull(),
	sourceEventId: varchar("source_event_id", { length: 150 }),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	signature: varchar({ length: 500 }),
	rawPayload: jsonb("raw_payload").default({}).notNull(),
	processingStatus: varchar("processing_status", { length: 20 }).default('pending').notNull(),
	retryCount: integer("retry_count").default(0).notNull(),
	errorMessage: text("error_message"),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_webhook_inbox_pending").using("btree", table.processingStatus.asc().nullsLast().op("text_ops"), table.receivedAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]))`),
	unique("webhook_inbox_source_type_source_event_id_key").on(table.sourceEventId, table.sourceType),
	check("chk_webhook_inbox_status", sql`(processing_status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'ignored'::text])`),
]);

export const externalEventLogsInBusinessTemplate = businessTemplate.table("external_event_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceType: varchar("source_type", { length: 50 }).notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: uuid("entity_id"),
	externalId: varchar("external_id", { length: 150 }),
	direction: varchar({ length: 10 }).notNull(),
	payload: jsonb().default({}).notNull(),
	status: varchar({ length: 20 }).default('success').notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("chk_external_event_direction", sql`(direction)::text = ANY (ARRAY['in'::text, 'out'::text])`),
	check("chk_external_event_status", sql`(status)::text = ANY (ARRAY['success'::text, 'failed'::text, 'retrying'::text])`),
]);

export const shipmentItemsInBusinessTemplate = businessTemplate.table("shipment_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	orderLineId: uuid("order_line_id"),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "fk_shipment_items_order_line"
		}),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "shipment_items_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "shipment_items_product_id_fkey"
		}),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipmentsInBusinessTemplate.id],
			name: "shipment_items_shipment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "shipment_items_variant_id_fkey"
		}),
	check("chk_shipment_item_qty", sql`quantity > (0)::numeric`),
]);

export const shipmentsInBusinessTemplate = businessTemplate.table("shipments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	storeId: uuid("store_id").notNull(),
	carrierId: uuid("carrier_id"),
	shipmentCode: varchar("shipment_code", { length: 60 }).notNull(),
	trackingNumber: varchar("tracking_number", { length: 150 }),
	shipmentStatus: varchar("shipment_status", { length: 30 }).default('pending').notNull(),
	recipientName: varchar("recipient_name", { length: 255 }),
	recipientPhone: varchar("recipient_phone", { length: 30 }),
	shippingAddress: text("shipping_address"),
	codAmount: numeric("cod_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	shippingFee: numeric("shipping_fee", { precision: 18, scale:  2 }).default('0').notNull(),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	failedAt: timestamp("failed_at", { withTimezone: true, mode: 'string' }),
	returnedAt: timestamp("returned_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shipments_carrier_status").using("btree", table.carrierId.asc().nullsLast().op("uuid_ops"), table.shipmentStatus.asc().nullsLast().op("uuid_ops")),
	index("idx_shipments_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_shipments_status").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.shipmentStatus.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.carrierId],
			foreignColumns: [shippingCarriersInBusinessTemplate.id],
			name: "shipments_carrier_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "shipments_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "shipments_store_id_fkey"
		}),
	unique("shipments_shipment_code_key").on(table.shipmentCode),
	check("chk_shipment_status", sql`(shipment_status)::text = ANY (ARRAY['pending'::text, 'packed'::text, 'shipped'::text, 'in_transit'::text, 'delivered'::text, 'failed'::text, 'returned'::text, 'cancelled'::text])`),
]);

export const shippingCarriersInBusinessTemplate = businessTemplate.table("shipping_carriers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	carrierCode: varchar("carrier_code", { length: 50 }).notNull(),
	carrierName: varchar("carrier_name", { length: 150 }).notNull(),
	carrierType: varchar("carrier_type", { length: 30 }).default('internal').notNull(),
	config: jsonb().default({}).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("shipping_carriers_carrier_code_key").on(table.carrierCode),
	check("chk_shipping_carrier_type", sql`(carrier_type)::text = ANY (ARRAY['internal'::text, 'third_party'::text, 'marketplace'::text])`),
]);

export const shipmentPackagesInBusinessTemplate = businessTemplate.table("shipment_packages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	packageCode: varchar("package_code", { length: 80 }).notNull(),
	weightGram: integer("weight_gram"),
	lengthCm: numeric("length_cm", { precision: 10, scale:  2 }),
	widthCm: numeric("width_cm", { precision: 10, scale:  2 }),
	heightCm: numeric("height_cm", { precision: 10, scale:  2 }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipmentsInBusinessTemplate.id],
			name: "shipment_packages_shipment_id_fkey"
		}).onDelete("cascade"),
]);

export const shipmentTrackingEventsInBusinessTemplate = businessTemplate.table("shipment_tracking_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	eventCode: varchar("event_code", { length: 80 }),
	eventStatus: varchar("event_status", { length: 50 }).notNull(),
	eventMessage: text("event_message"),
	eventTime: timestamp("event_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rawPayload: jsonb("raw_payload").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_shipment_tracking_shipment").using("btree", table.shipmentId.asc().nullsLast().op("timestamptz_ops"), table.eventTime.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipmentsInBusinessTemplate.id],
			name: "shipment_tracking_events_shipment_id_fkey"
		}).onDelete("cascade"),
]);

export const deliveryAttemptsInBusinessTemplate = businessTemplate.table("delivery_attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	attemptNo: integer("attempt_no").default(1).notNull(),
	attemptStatus: varchar("attempt_status", { length: 30 }).notNull(),
	attemptedAt: timestamp("attempted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reason: text(),
	note: text(),
}, (table) => [
	index("idx_delivery_attempts_shipment").using("btree", table.shipmentId.asc().nullsLast().op("timestamptz_ops"), table.attemptedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipmentsInBusinessTemplate.id],
			name: "delivery_attempts_shipment_id_fkey"
		}).onDelete("cascade"),
	check("chk_delivery_attempt_status", sql`(attempt_status)::text = ANY (ARRAY['success'::text, 'failed'::text, 'rescheduled'::text, 'cancelled'::text])`),
]);

export const codReconciliationsInBusinessTemplate = businessTemplate.table("cod_reconciliations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	carrierId: uuid("carrier_id"),
	reconciliationCode: varchar("reconciliation_code", { length: 80 }).notNull(),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	expectedCodAmount: numeric("expected_cod_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	receivedCodAmount: numeric("received_cod_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	feeAmount: numeric("fee_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	closedAt: timestamp("closed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.carrierId],
			foreignColumns: [shippingCarriersInBusinessTemplate.id],
			name: "cod_reconciliations_carrier_id_fkey"
		}),
	unique("cod_reconciliations_reconciliation_code_key").on(table.reconciliationCode),
	check("chk_cod_recon_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'matched'::text, 'variance'::text, 'closed'::text, 'cancelled'::text])`),
]);

export const loyaltyProgramsInBusinessTemplate = businessTemplate.table("loyalty_programs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	programCode: varchar("program_code", { length: 50 }).notNull(),
	programName: varchar("program_name", { length: 150 }).notNull(),
	earnRule: jsonb("earn_rule").default({}).notNull(),
	redeemRule: jsonb("redeem_rule").default({}).notNull(),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("loyalty_programs_program_code_key").on(table.programCode),
	check("chk_loyalty_program_status", sql`(status)::text = ANY (ARRAY['active'::text, 'disabled'::text, 'expired'::text])`),
]);

export const loyaltyTiersInBusinessTemplate = businessTemplate.table("loyalty_tiers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tierCode: varchar("tier_code", { length: 50 }).notNull(),
	tierName: varchar("tier_name", { length: 100 }).notNull(),
	minSpend: numeric("min_spend", { precision: 18, scale:  2 }).default('0').notNull(),
	pointMultiplier: numeric("point_multiplier", { precision: 10, scale:  2 }).default('1').notNull(),
	benefits: jsonb().default({}).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	unique("loyalty_tiers_tier_code_key").on(table.tierCode),
]);

export const loyaltyPointTransactionsInBusinessTemplate = businessTemplate.table("loyalty_point_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	storeId: uuid("store_id"),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	points: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_loyalty_txn_customer").using("btree", table.customerId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "loyalty_point_transactions_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "loyalty_point_transactions_store_id_fkey"
		}),
	check("chk_loyalty_point_txn_type", sql`(txn_type)::text = ANY (ARRAY['earn'::text, 'redeem'::text, 'expire'::text, 'adjust'::text, 'refund_reverse'::text])`),
]);

export const voucherBatchesInBusinessTemplate = businessTemplate.table("voucher_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	batchCode: varchar("batch_code", { length: 60 }).notNull(),
	batchName: varchar("batch_name", { length: 150 }).notNull(),
	voucherType: varchar("voucher_type", { length: 30 }).notNull(),
	discountValue: numeric("discount_value", { precision: 18, scale:  2 }).default('0').notNull(),
	quantity: integer().default(0).notNull(),
	validFrom: timestamp("valid_from", { withTimezone: true, mode: 'string' }),
	validTo: timestamp("valid_to", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("voucher_batches_batch_code_key").on(table.batchCode),
	check("chk_voucher_batch_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'active'::text, 'expired'::text, 'cancelled'::text])`),
]);

export const customerVouchersInBusinessTemplate = businessTemplate.table("customer_vouchers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	voucherBatchId: uuid("voucher_batch_id"),
	customerId: uuid("customer_id"),
	voucherCode: varchar("voucher_code", { length: 80 }).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	usedOrderId: uuid("used_order_id"),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	validFrom: timestamp("valid_from", { withTimezone: true, mode: 'string' }),
	validTo: timestamp("valid_to", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customer_vouchers_status").using("btree", table.customerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(customer_id IS NOT NULL)`),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_vouchers_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.usedOrderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "customer_vouchers_used_order_id_fkey"
		}),
	foreignKey({
			columns: [table.voucherBatchId],
			foreignColumns: [voucherBatchesInBusinessTemplate.id],
			name: "customer_vouchers_voucher_batch_id_fkey"
		}),
	unique("customer_vouchers_voucher_code_key").on(table.voucherCode),
	check("chk_customer_voucher_status", sql`(status)::text = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'cancelled'::text])`),
]);

export const giftCardsInBusinessTemplate = businessTemplate.table("gift_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	giftCardCode: varchar("gift_card_code", { length: 80 }).notNull(),
	customerId: uuid("customer_id"),
	initialBalance: numeric("initial_balance", { precision: 18, scale:  2 }).default('0').notNull(),
	currentBalance: numeric("current_balance", { precision: 18, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "gift_cards_customer_id_fkey"
		}),
	unique("gift_cards_gift_card_code_key").on(table.giftCardCode),
	check("chk_gift_card_status", sql`(status)::text = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'cancelled'::text, 'blocked'::text])`),
]);

export const giftCardTransactionsInBusinessTemplate = businessTemplate.table("gift_card_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	giftCardId: uuid("gift_card_id").notNull(),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_giftcard_txn_card").using("btree", table.giftCardId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.giftCardId],
			foreignColumns: [giftCardsInBusinessTemplate.id],
			name: "gift_card_transactions_gift_card_id_fkey"
		}).onDelete("cascade"),
	check("chk_gift_card_txn_type", sql`(txn_type)::text = ANY (ARRAY['issue'::text, 'redeem'::text, 'refund'::text, 'adjust'::text, 'expire'::text])`),
]);

export const customerWalletsInBusinessTemplate = businessTemplate.table("customer_wallets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	balance: numeric({ precision: 18, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_wallets_customer_id_fkey"
		}),
	unique("customer_wallets_customer_id_key").on(table.customerId),
	check("chk_customer_wallet_status", sql`(status)::text = ANY (ARRAY['active'::text, 'blocked'::text, 'closed'::text])`),
]);

export const walletTransactionsInBusinessTemplate = businessTemplate.table("wallet_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	walletId: uuid("wallet_id").notNull(),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_wallet_txn_wallet").using("btree", table.walletId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.walletId],
			foreignColumns: [customerWalletsInBusinessTemplate.id],
			name: "wallet_transactions_wallet_id_fkey"
		}).onDelete("cascade"),
	check("chk_wallet_txn_type", sql`(txn_type)::text = ANY (ARRAY['topup'::text, 'payment'::text, 'refund'::text, 'adjust'::text, 'expire'::text, 'withdraw'::text])`),
]);

export const customerTagsInBusinessTemplate = businessTemplate.table("customer_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tagCode: varchar("tag_code", { length: 50 }).notNull(),
	tagName: varchar("tag_name", { length: 100 }).notNull(),
	tagColor: varchar("tag_color", { length: 7 }).default('#6366f1'),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	unique("customer_tags_tag_code_key").on(table.tagCode),
]);

export const customerSegmentsInBusinessTemplate = businessTemplate.table("customer_segments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	segmentCode: varchar("segment_code", { length: 50 }).notNull(),
	segmentName: varchar("segment_name", { length: 150 }).notNull(),
	segmentType: varchar("segment_type", { length: 20 }).default('dynamic').notNull(),
	rules: jsonb().default({}).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("customer_segments_segment_code_key").on(table.segmentCode),
	check("chk_customer_segment_type", sql`(segment_type)::text = ANY (ARRAY['static'::text, 'dynamic'::text])`),
]);

export const serviceOrdersInBusinessTemplate = businessTemplate.table("service_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	customerId: uuid("customer_id"),
	serviceOrderCode: varchar("service_order_code", { length: 60 }).notNull(),
	status: varchar({ length: 30 }).default('new').notNull(),
	priority: varchar({ length: 20 }).default('normal').notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	promisedAt: timestamp("promised_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	assignedStaffId: uuid("assigned_staff_id"),
	problemDescription: text("problem_description"),
	internalNote: text("internal_note"),
	orderId: uuid("order_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_service_orders_customer").using("btree", table.customerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(customer_id IS NOT NULL)`),
	foreignKey({
			columns: [table.assignedStaffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "service_orders_assigned_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "service_orders_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "service_orders_order_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "service_orders_store_id_fkey"
		}),
	unique("service_orders_service_order_code_key").on(table.serviceOrderCode),
	check("chk_service_order_priority", sql`(priority)::text = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])`),
	check("chk_service_order_status", sql`(status)::text = ANY (ARRAY['new'::text, 'diagnosing'::text, 'waiting_parts'::text, 'in_service'::text, 'completed'::text, 'cancelled'::text, 'returned'::text])`),
]);

export const customerInteractionsInBusinessTemplate = businessTemplate.table("customer_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	storeId: uuid("store_id"),
	interactionType: varchar("interaction_type", { length: 50 }).notNull(),
	subject: varchar({ length: 255 }),
	content: text(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customer_interactions_cust").using("btree", table.customerId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_interactions_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "customer_interactions_store_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "fk_customer_interactions_created_by"
		}),
]);

export const customerConsentsInBusinessTemplate = businessTemplate.table("customer_consents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	consentType: varchar("consent_type", { length: 50 }).notNull(),
	channel: varchar({ length: 30 }).notNull(),
	status: varchar({ length: 20 }).default('granted').notNull(),
	source: varchar({ length: 50 }),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_consents_customer_id_fkey"
		}).onDelete("cascade"),
	unique("customer_consents_customer_id_consent_type_channel_key").on(table.channel, table.consentType, table.customerId),
	check("chk_customer_consent_channel", sql`(channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])`),
	check("chk_customer_consent_status", sql`(status)::text = ANY (ARRAY['granted'::text, 'revoked'::text, 'unknown'::text])`),
]);

export const customerContactPreferencesInBusinessTemplate = businessTemplate.table("customer_contact_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	channel: varchar({ length: 30 }).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	quietHoursStart: time("quiet_hours_start"),
	quietHoursEnd: time("quiet_hours_end"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_contact_preferences_customer_id_fkey"
		}).onDelete("cascade"),
	unique("customer_contact_preferences_customer_id_channel_key").on(table.channel, table.customerId),
	check("chk_contact_preference_channel", sql`(channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])`),
	check("chk_contact_preference_quiet_hours", sql`(quiet_hours_start IS NULL) OR (quiet_hours_end IS NULL) OR (quiet_hours_start <> quiet_hours_end)`),
]);

export const campaignsInBusinessTemplate = businessTemplate.table("campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	campaignCode: varchar("campaign_code", { length: 60 }).notNull(),
	campaignName: varchar("campaign_name", { length: 150 }).notNull(),
	campaignType: varchar("campaign_type", { length: 30 }).notNull(),
	targetConfig: jsonb("target_config").default({}).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_campaigns_status_scheduled").using("btree", table.status.asc().nullsLast().op("text_ops"), table.scheduledAt.asc().nullsLast().op("text_ops")).where(sql`(scheduled_at IS NOT NULL)`),
	unique("campaigns_campaign_code_key").on(table.campaignCode),
	check("chk_campaign_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'scheduled'::text, 'running'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])`),
]);

export const campaignMessagesInBusinessTemplate = businessTemplate.table("campaign_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	campaignId: uuid("campaign_id").notNull(),
	customerId: uuid("customer_id"),
	channel: varchar({ length: 30 }).notNull(),
	recipient: varchar({ length: 255 }),
	messagePayload: jsonb("message_payload").default({}).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_campaign_messages_campaign").using("btree", table.campaignId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [campaignsInBusinessTemplate.id],
			name: "campaign_messages_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "campaign_messages_customer_id_fkey"
		}),
	check("chk_campaign_message_channel", sql`(channel)::text = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text, 'call'::text, 'marketing'::text, 'survey'::text, 'postal'::text])`),
	check("chk_campaign_message_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text])`),
]);

export const customerMergeRequestsInBusinessTemplate = businessTemplate.table("customer_merge_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	primaryCustomerId: uuid("primary_customer_id").notNull(),
	duplicateCustomerId: uuid("duplicate_customer_id").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reason: text(),
	requestedBy: uuid("requested_by"),
	approvedBy: uuid("approved_by"),
	mergedAt: timestamp("merged_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.duplicateCustomerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_merge_requests_duplicate_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.primaryCustomerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_merge_requests_primary_customer_id_fkey"
		}),
	check("chk_customer_merge_distinct", sql`primary_customer_id <> duplicate_customer_id`),
	check("chk_customer_merge_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'merged'::text, 'cancelled'::text])`),
]);

export const serviceOrderLinesInBusinessTemplate = businessTemplate.table("service_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceOrderId: uuid("service_order_id").notNull(),
	serviceProductId: uuid("service_product_id"),
	description: text().notNull(),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 18, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.serviceOrderId],
			foreignColumns: [serviceOrdersInBusinessTemplate.id],
			name: "service_order_lines_service_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.serviceProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "service_order_lines_service_product_id_fkey"
		}),
]);

export const packageUsagesInBusinessTemplate = businessTemplate.table("package_usages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	packageId: uuid("package_id").notNull(),
	customerId: uuid("customer_id").notNull(),
	orderId: uuid("order_id"),
	totalSessions: integer("total_sessions").default(0).notNull(),
	usedSessions: integer("used_sessions").default(0).notNull(),
	remainingSessions: integer("remaining_sessions").default(0).notNull(),
	validFrom: date("valid_from"),
	validTo: date("valid_to"),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "package_usages_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "package_usages_order_id_fkey"
		}),
	foreignKey({
			columns: [table.packageId],
			foreignColumns: [servicePackagesInBusinessTemplate.id],
			name: "package_usages_package_id_fkey"
		}),
	check("chk_package_remaining_nonneg", sql`(used_sessions >= 0) AND (remaining_sessions >= 0) AND ((used_sessions + remaining_sessions) <= (total_sessions + 999))`),
	check("chk_package_usage_status", sql`(status)::text = ANY (ARRAY['active'::text, 'used_up'::text, 'expired'::text, 'cancelled'::text])`),
]);

export const warrantyPoliciesInBusinessTemplate = businessTemplate.table("warranty_policies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id"),
	policyName: varchar("policy_name", { length: 150 }).notNull(),
	warrantyMonths: integer("warranty_months").default(0).notNull(),
	terms: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "warranty_policies_product_id_fkey"
		}),
]);

export const warrantyClaimsInBusinessTemplate = businessTemplate.table("warranty_claims", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	customerId: uuid("customer_id"),
	salesOrderId: uuid("sales_order_id"),
	productId: uuid("product_id"),
	serialId: uuid("serial_id"),
	serviceOrderId: uuid("service_order_id"),
	claimCode: varchar("claim_code", { length: 60 }).notNull(),
	status: varchar({ length: 30 }).default('submitted').notNull(),
	issueDescription: text("issue_description"),
	resolution: text(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_warranty_claims_customer").using("btree", table.customerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(customer_id IS NOT NULL)`),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "warranty_claims_customer_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "warranty_claims_product_id_fkey"
		}),
	foreignKey({
			columns: [table.salesOrderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "warranty_claims_sales_order_id_fkey"
		}),
	foreignKey({
			columns: [table.serialId],
			foreignColumns: [productSerialsInBusinessTemplate.id],
			name: "warranty_claims_serial_id_fkey"
		}),
	foreignKey({
			columns: [table.serviceOrderId],
			foreignColumns: [serviceOrdersInBusinessTemplate.id],
			name: "warranty_claims_service_order_id_fkey"
		}),
	unique("warranty_claims_claim_code_key").on(table.claimCode),
	check("chk_warranty_claim_status", sql`(status)::text = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text, 'repairing'::text, 'resolved'::text, 'cancelled'::text])`),
]);

export const servicePackagesInBusinessTemplate = businessTemplate.table("service_packages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	packageCode: varchar("package_code", { length: 60 }).notNull(),
	packageName: varchar("package_name", { length: 150 }).notNull(),
	productId: uuid("product_id"),
	totalSessions: integer("total_sessions").default(0).notNull(),
	validDays: integer("valid_days"),
	price: numeric({ precision: 18, scale:  2 }).default('0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "service_packages_product_id_fkey"
		}),
	unique("service_packages_package_code_key").on(table.packageCode),
]);

export const kitchenStationsInBusinessTemplate = businessTemplate.table("kitchen_stations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	stationCode: varchar("station_code", { length: 50 }).notNull(),
	stationName: varchar("station_name", { length: 150 }).notNull(),
	stationType: varchar("station_type", { length: 30 }).default('kitchen').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "kitchen_stations_store_id_fkey"
		}),
	unique("kitchen_stations_store_id_station_code_key").on(table.stationCode, table.storeId),
]);

export const productionOrdersInBusinessTemplate = businessTemplate.table("production_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationId: uuid("location_id"),
	productionCode: varchar("production_code", { length: 60 }).notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	plannedQty: numeric("planned_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	producedQty: numeric("produced_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	plannedAt: timestamp("planned_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_production_orders_store").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "production_orders_location_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "production_orders_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "production_orders_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "production_orders_variant_id_fkey"
		}),
	unique("production_orders_production_code_key").on(table.productionCode),
	check("chk_production_order_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])`),
]);

export const productionOrderLinesInBusinessTemplate = businessTemplate.table("production_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	productionOrderId: uuid("production_order_id").notNull(),
	ingredientProductId: uuid("ingredient_product_id").notNull(),
	ingredientVariantId: uuid("ingredient_variant_id"),
	requiredQty: numeric("required_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	consumedQty: numeric("consumed_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "production_order_lines_ingredient_product_id_fkey"
		}),
	foreignKey({
			columns: [table.ingredientVariantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "production_order_lines_ingredient_variant_id_fkey"
		}),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrdersInBusinessTemplate.id],
			name: "production_order_lines_production_order_id_fkey"
		}).onDelete("cascade"),
]);

export const ingredientConsumptionsInBusinessTemplate = businessTemplate.table("ingredient_consumptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	orderId: uuid("order_id"),
	orderLineId: uuid("order_line_id"),
	productionOrderId: uuid("production_order_id"),
	ingredientProductId: uuid("ingredient_product_id").notNull(),
	ingredientVariantId: uuid("ingredient_variant_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	stockTransactionId: uuid("stock_transaction_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ingredientProductId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "ingredient_consumptions_ingredient_product_id_fkey"
		}),
	foreignKey({
			columns: [table.ingredientVariantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "ingredient_consumptions_ingredient_variant_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "ingredient_consumptions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.orderLineId],
			foreignColumns: [salesOrderLinesInBusinessTemplate.id],
			name: "ingredient_consumptions_order_line_id_fkey"
		}),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrdersInBusinessTemplate.id],
			name: "ingredient_consumptions_production_order_id_fkey"
		}),
	foreignKey({
			columns: [table.stockTransactionId],
			foreignColumns: [stockTransactionsInBusinessTemplate.id],
			name: "ingredient_consumptions_stock_transaction_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "ingredient_consumptions_store_id_fkey"
		}),
]);

export const prepBatchesInBusinessTemplate = businessTemplate.table("prep_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	batchCode: varchar("batch_code", { length: 80 }).notNull(),
	producedQty: numeric("produced_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	remainingQty: numeric("remaining_qty", { precision: 18, scale:  4 }).default('0').notNull(),
	preparedAt: timestamp("prepared_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('active').notNull(),
}, (table) => [
	index("idx_prep_batches_store_expires").using("btree", table.storeId.asc().nullsLast().op("timestamptz_ops"), table.productId.asc().nullsLast().op("timestamptz_ops"), table.expiresAt.asc().nullsLast().op("uuid_ops")).where(sql`((status)::text = 'active'::text)`),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "prep_batches_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "prep_batches_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "prep_batches_variant_id_fkey"
		}),
	unique("prep_batches_batch_code_key").on(table.batchCode),
	check("chk_prep_batch_status", sql`(status)::text = ANY (ARRAY['active'::text, 'used_up'::text, 'expired'::text, 'discarded'::text])`),
]);

export const menuAvailabilityInBusinessTemplate = businessTemplate.table("menu_availability", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	availableStatus: varchar("available_status", { length: 20 }).default('available').notNull(),
	reason: text(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "menu_availability_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "menu_availability_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "menu_availability_variant_id_fkey"
		}),
	unique("menu_availability_store_id_product_id_variant_id_key").on(table.productId, table.storeId, table.variantId),
	check("chk_menu_availability_status", sql`(available_status)::text = ANY (ARRAY['available'::text, 'sold_out'::text, 'hidden'::text, 'limited'::text])`),
]);

export const periodLocksInBusinessTemplate = businessTemplate.table("period_locks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	lockType: varchar("lock_type", { length: 30 }).default('business').notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: varchar({ length: 20 }).default('locked').notNull(),
	lockedBy: uuid("locked_by"),
	lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	unlockedBy: uuid("unlocked_by"),
	unlockedAt: timestamp("unlocked_at", { withTimezone: true, mode: 'string' }),
	reason: text(),
}, (table) => [
	index("idx_period_locks_store_dates").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.periodStart.asc().nullsLast().op("date_ops"), table.periodEnd.asc().nullsLast().op("uuid_ops")).where(sql`((status)::text = 'locked'::text)`),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "period_locks_store_id_fkey"
		}),
	check("chk_period_lock_dates", sql`period_start <= period_end`),
	check("chk_period_lock_status", sql`(status)::text = ANY (ARRAY['locked'::text, 'unlocked'::text, 'reopened'::text])`),
]);

export const closingRunsInBusinessTemplate = businessTemplate.table("closing_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	closingCode: varchar("closing_code", { length: 60 }).notNull(),
	closingType: varchar("closing_type", { length: 30 }).default('daily').notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_closing_runs_store_created").using("btree", table.storeId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "closing_runs_store_id_fkey"
		}),
	unique("closing_runs_closing_code_key").on(table.closingCode),
	check("chk_closing_run_status", sql`(status)::text = ANY (ARRAY['draft'::text, 'running'::text, 'completed'::text, 'failed'::text, 'reopened'::text])`),
]);

export const closingRunItemsInBusinessTemplate = businessTemplate.table("closing_run_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	closingRunId: uuid("closing_run_id").notNull(),
	itemType: varchar("item_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	resultPayload: jsonb("result_payload").default({}).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.closingRunId],
			foreignColumns: [closingRunsInBusinessTemplate.id],
			name: "closing_run_items_closing_run_id_fkey"
		}).onDelete("cascade"),
]);

export const reopenPeriodRequestsInBusinessTemplate = businessTemplate.table("reopen_period_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	periodLockId: uuid("period_lock_id"),
	reason: text().notNull(),
	requestedBy: uuid("requested_by").notNull(),
	approvedBy: uuid("approved_by"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.periodLockId],
			foreignColumns: [periodLocksInBusinessTemplate.id],
			name: "reopen_period_requests_period_lock_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "reopen_period_requests_store_id_fkey"
		}),
	check("chk_reopen_request_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])`),
]);

export const wasteLogsInBusinessTemplate = businessTemplate.table("waste_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationId: uuid("location_id"),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	lotId: uuid("lot_id"),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	wasteReason: varchar("waste_reason", { length: 80 }).notNull(),
	stockTransactionId: uuid("stock_transaction_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_waste_logs_store_created").using("btree", table.storeId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops"), table.wasteReason.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "waste_logs_location_id_fkey"
		}),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "waste_logs_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "waste_logs_product_id_fkey"
		}),
	foreignKey({
			columns: [table.stockTransactionId],
			foreignColumns: [stockTransactionsInBusinessTemplate.id],
			name: "waste_logs_stock_transaction_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "waste_logs_store_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "waste_logs_variant_id_fkey"
		}),
	check("chk_waste_qty", sql`quantity > (0)::numeric`),
	check("chk_waste_reason", sql`(waste_reason)::text = ANY (ARRAY['spoilage'::text, 'expired'::text, 'damaged'::text, 'prep_loss'::text, 'customer_discard'::text, 'breakage'::text, 'contamination'::text, 'quality_issue'::text, 'other'::text])`),
]);

export const roleChangeHistoryInBusinessTemplate = businessTemplate.table("role_change_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffId: uuid("staff_id"),
	roleId: uuid("role_id"),
	storeId: uuid("store_id"),
	action: varchar({ length: 30 }).notNull(),
	changedBy: uuid("changed_by"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_role_change_history_staff").using("btree", table.staffId.asc().nullsLast().op("timestamptz_ops"), table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInBusinessTemplate.id],
			name: "role_change_history_role_id_fkey"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "role_change_history_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "role_change_history_store_id_fkey"
		}),
	check("chk_role_change_action", sql`(action)::text = ANY (ARRAY['grant'::text, 'revoke'::text, 'expire'::text, 'restore'::text])`),
]);

export const permissionChangeHistoryInBusinessTemplate = businessTemplate.table("permission_change_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id"),
	permissionId: uuid("permission_id"),
	action: varchar({ length: 30 }).notNull(),
	changedBy: uuid("changed_by"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissionsInBusinessTemplate.id],
			name: "permission_change_history_permission_id_fkey"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInBusinessTemplate.id],
			name: "permission_change_history_role_id_fkey"
		}),
	check("chk_permission_change_action", sql`(action)::text = ANY (ARRAY['grant'::text, 'revoke'::text])`),
]);

export const orderPaymentsInBusinessTemplate = businessTemplate.table("order_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	paymentMethodId: uuid("payment_method_id"),
	methodCode: varchar("method_code", { length: 50 }).notNull(),
	methodName: varchar("method_name", { length: 255 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	tenderAmount: numeric("tender_amount", { precision: 18, scale:  2 }),
	changeAmount: numeric("change_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	transactionRef: varchar("transaction_ref", { length: 255 }),
	status: varchar({ length: 20 }).default('completed').notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	idempotencyKey: varchar("idempotency_key", { length: 100 }),
}, (table) => [
	index("idx_order_payments_order").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_order_payments_order_status").using("btree", table.orderId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_order_payments_transaction_ref").using("btree", table.transactionRef.asc().nullsLast().op("text_ops")).where(sql`(transaction_ref IS NOT NULL)`),
	index("idx_payments_method_paid").using("btree", table.paymentMethodId.asc().nullsLast().op("timestamptz_ops"), table.paidAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`((status)::text = 'completed'::text)`),
	uniqueIndex("uq_order_payments_idempotency").using("btree", table.idempotencyKey.asc().nullsLast().op("text_ops")).where(sql`(idempotency_key IS NOT NULL)`),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "order_payments_order_id_fkey"
		}),
	foreignKey({
			columns: [table.paymentMethodId],
			foreignColumns: [paymentMethodsInBusinessTemplate.id],
			name: "order_payments_payment_method_id_fkey"
		}),
	check("chk_order_payment_amount_positive", sql`amount > (0)::numeric`),
	check("chk_payment_status", sql`(status)::text = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])`),
]);

export const temporaryPermissionGrantsInBusinessTemplate = businessTemplate.table("temporary_permission_grants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	staffId: uuid("staff_id").notNull(),
	permissionKey: varchar("permission_key", { length: 150 }).notNull(),
	storeId: uuid("store_id"),
	reason: text().notNull(),
	grantedBy: uuid("granted_by").notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
}, (table) => [
	index("idx_temp_perm_grants_active").using("btree", table.staffId.asc().nullsLast().op("timestamptz_ops"), table.expiresAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((status)::text = 'active'::text)`),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staffMembersInBusinessTemplate.id],
			name: "temporary_permission_grants_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "temporary_permission_grants_store_id_fkey"
		}),
	check("chk_temp_perm_dates", sql`expires_at > granted_at`),
	check("chk_temp_perm_status", sql`(status)::text = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])`),
]);

export const salesOrderLinesInBusinessTemplate = businessTemplate.table("sales_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	productName: varchar("product_name", { length: 255 }),
	quantity: numeric({ precision: 18, scale:  4 }).default('1').notNull(),
	unitName: varchar("unit_name", { length: 50 }).default('piece').notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).default('0').notNull(),
	costPrice: numeric("cost_price", { precision: 18, scale:  4 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 18, scale:  2 }).default('0').notNull(),
	modifiers: jsonb().default([]).notNull(),
	note: text(),
	kitchenStatus: varchar("kitchen_status", { length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sol_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("idx_sol_product_id").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [salesOrdersInBusinessTemplate.id],
			name: "sales_order_lines_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "sales_order_lines_product_id_fkey"
		}),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "sales_order_lines_variant_id_fkey"
		}),
	check("chk_kitchen_status", sql`(kitchen_status)::text = ANY (ARRAY['pending'::text, 'sent'::text, 'cooking'::text, 'ready'::text, 'served'::text, 'cancelled'::text])`),
	check("chk_sol_quantity_positive", sql`quantity > (0)::numeric`),
]);

export const purchaseOrderLinesInBusinessTemplate = businessTemplate.table("purchase_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	orderedQty: numeric("ordered_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	receivedQty: numeric("received_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 18, scale:  2 }).default('0').notNull(),
	note: text(),
}, (table) => [
	index("idx_po_lines_product").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_po_lines_variant"
		}),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrdersInBusinessTemplate.id],
			name: "purchase_order_lines_po_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "purchase_order_lines_product_id_fkey"
		}),
	check("chk_po_line_qty_nonnegative", sql`(ordered_qty >= (0)::numeric) AND (received_qty >= (0)::numeric)`),
]);

export const stockTransferItemsInBusinessTemplate = businessTemplate.table("stock_transfer_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transferId: uuid("transfer_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }).notNull(),
	requestedQty: numeric("requested_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	shippedQty: numeric("shipped_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	receivedQty: numeric("received_qty", { precision: 12, scale:  3 }).default('0').notNull(),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_stock_transfer_items_variant"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_transfer_items_product_id_fkey"
		}),
	foreignKey({
			columns: [table.transferId],
			foreignColumns: [stockTransfersInBusinessTemplate.id],
			name: "stock_transfer_items_transfer_id_fkey"
		}).onDelete("cascade"),
	check("chk_transfer_item_qty_nonnegative", sql`(requested_qty >= (0)::numeric) AND (shipped_qty >= (0)::numeric) AND (received_qty >= (0)::numeric)`),
]);

export const cashTransactionsInBusinessTemplate = businessTemplate.table("cash_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	cashAccountId: uuid("cash_account_id").notNull(),
	txnCode: varchar("txn_code", { length: 50 }).notNull(),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  2 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	description: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cashAccountId],
			foreignColumns: [cashAccountsInBusinessTemplate.id],
			name: "cash_transactions_cash_account_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "cash_transactions_store_id_fkey"
		}),
	pgPolicy("store_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_cash_txn_amount_positive", sql`amount > (0)::numeric`),
	check("chk_cash_txn_type", sql`(txn_type)::text = ANY (ARRAY['sale_in'::text, 'purchase_out'::text, 'return_in'::text, 'return_out'::text, 'deposit'::text, 'withdrawal'::text, 'transfer_in'::text, 'transfer_out'::text, 'expense'::text, 'adjustment'::text])`),
]);

export const stockTransactionsInBusinessTemplate = businessTemplate.table("stock_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	locationId: uuid("location_id").notNull(),
	productId: uuid("product_id").notNull(),
	variantId: uuid("variant_id"),
	unitName: varchar("unit_name", { length: 50 }).default('piece').notNull(),
	txnType: varchar("txn_type", { length: 30 }).notNull(),
	refType: varchar("ref_type", { length: 50 }),
	refId: uuid("ref_id"),
	refCode: varchar("ref_code", { length: 50 }),
	quantity: numeric({ precision: 18, scale:  4 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }),
	totalCost: numeric("total_cost", { precision: 18, scale:  4 }),
	balanceAfter: numeric("balance_after", { precision: 18, scale:  4 }),
	note: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lotId: uuid("lot_id"),
}, (table) => [
	index("idx_stock_txn_location").using("btree", table.locationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_stock_txn_location_product_variant_created").using("btree", table.locationId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("timestamptz_ops"), table.variantId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_stock_txn_product").using("btree", table.productId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_stock_txn_ref").using("btree", table.refType.asc().nullsLast().op("text_ops"), table.refId.asc().nullsLast().op("uuid_ops")),
	index("idx_stock_txn_store_created").using("btree", table.storeId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_stock_txn_variant").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")).where(sql`(variant_id IS NOT NULL)`),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariantsInBusinessTemplate.id],
			name: "fk_stock_txn_variant"
		}),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [stockLocationsInBusinessTemplate.id],
			name: "stock_transactions_location_id_fkey"
		}),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [productLotsInBusinessTemplate.id],
			name: "stock_transactions_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "stock_transactions_product_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [storesInBusinessTemplate.id],
			name: "stock_transactions_store_id_fkey"
		}),
	pgPolicy("store_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_stock_txn_quantity_positive", sql`quantity > (0)::numeric`),
	check("chk_stock_txn_type", sql`(txn_type)::text = ANY (ARRAY['purchase_in'::text, 'return_in'::text, 'transfer_in'::text, 'adjustment_in'::text, 'production_in'::text, 'opening_balance'::text, 'sale_out'::text, 'return_out'::text, 'transfer_out'::text, 'adjustment_out'::text, 'production_out'::text])`),
]);

export const paymentMethodsInBusinessTemplate = businessTemplate.table("payment_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	methodCode: varchar("method_code", { length: 50 }).notNull(),
	methodName: varchar("method_name", { length: 255 }).notNull(),
	methodType: varchar("method_type", { length: 30 }).default('cash').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	config: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payment_methods_store_display_order").using("btree", table.storeId.asc().nullsLast().op("int4_ops"), table.displayOrder.asc().nullsLast().op("int4_ops")),
	pgPolicy("payment_methods_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((store_id = (NULLIF(current_setting('app.current_store_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.current_store_id'::text, true), ''::text) IS NULL))` }),
	check("chk_payment_method_type", sql`(method_type)::text = ANY (ARRAY['cash'::text, 'card'::text, 'qr_code'::text, 'bank_transfer'::text, 'e_wallet'::text, 'loyalty_point'::text, 'credit'::text, 'voucher'::text, 'other'::text])`),
]);

export const storesInBusinessTemplate = businessTemplate.table("stores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	parentId: uuid("parent_id"),
	storeCode: varchar("store_code", { length: 30 }).notNull(),
	storeName: varchar("store_name", { length: 255 }).notNull(),
	storeType: varchar("store_type", { length: 30 }).default('retail').notNull(),
	phone: varchar({ length: 30 }),
	email: varchar({ length: 255 }),
	address: text(),
	district: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	timezone: varchar({ length: 50 }).default('Asia/Ho_Chi_Minh').notNull(),
	openTime: time("open_time"),
	closeTime: time("close_time"),
	imageUrl: varchar("image_url", { length: 500 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "fk_store_parent"
		}),
	unique("stores_store_code_key").on(table.storeCode),
	check("chk_store_type", sql`(store_type)::text = ANY (ARRAY['retail'::text, 'warehouse'::text, 'office'::text, 'kiosk'::text, 'fnb'::text])`),
]);

export const productTagMappingsInBusinessTemplate = businessTemplate.table("product_tag_mappings", {
	productId: uuid("product_id").notNull(),
	tagId: uuid("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_tag_mappings_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [productTagsInBusinessTemplate.id],
			name: "product_tag_mappings_tag_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.tagId], name: "product_tag_mappings_pkey"}),
]);

export const customerTagMappingsInBusinessTemplate = businessTemplate.table("customer_tag_mappings", {
	customerId: uuid("customer_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBusinessTemplate.id],
			name: "customer_tag_mappings_customer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [customerTagsInBusinessTemplate.id],
			name: "customer_tag_mappings_tag_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.customerId, table.tagId], name: "customer_tag_mappings_pkey"}),
]);

export const productUnitsInBusinessTemplate = businessTemplate.table("product_units", {
	productId: uuid("product_id").notNull(),
	unitId: uuid("unit_id").notNull(),
	conversionFactor: numeric("conversion_factor", { precision: 10, scale:  4 }).default('1').notNull(),
	isBaseUnit: boolean("is_base_unit").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBusinessTemplate.id],
			name: "product_units_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [unitsInBusinessTemplate.id],
			name: "product_units_unit_id_fkey"
		}),
	primaryKey({ columns: [table.productId, table.unitId], name: "product_units_pkey"}),
]);
