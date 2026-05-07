import { pgTable, uuid, varchar, text, boolean, timestamp, numeric, integer, jsonb } from 'drizzle-orm/pg-core';

export const productCategories = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  categoryCode: varchar('category_code', { length: 50 }).notNull().unique(),
  categoryName: varchar('category_name', { length: 200 }).notNull(),
  categoryType: varchar('category_type', { length: 30 }),
  displayOrder: integer('display_order').notNull().default(0),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  productCode: varchar('product_code', { length: 80 }).notNull().unique(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  categoryId: uuid('category_id'),
  sku: varchar('sku', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  sellPrice: numeric('sell_price', { precision: 18, scale: 4 }).notNull().default('0'),
  costPrice: numeric('cost_price', { precision: 18, scale: 4 }).notNull().default('0'),
  shortDesc: text('short_desc'),
  imageUrl: varchar('image_url', { length: 500 }),
  showOnPos: boolean('show_on_pos').notNull().default(true),
  hasVariants: boolean('has_variants').notNull().default(false),
  productType: varchar('product_type', { length: 30 }).notNull().default('simple'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  variantName: varchar('variant_name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  sellPrice: numeric('sell_price', { precision: 18, scale: 4 }).notNull().default('0'),
  costPrice: numeric('cost_price', { precision: 18, scale: 4 }).notNull().default('0'),
  attributes: jsonb('attributes'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
