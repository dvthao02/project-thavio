import { pgTable, uuid, varchar, numeric, timestamp, text } from 'drizzle-orm/pg-core';

// DB table = stock_balances
export const inventoryStock = pgTable('stock_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  unitName: varchar('unit_name', { length: 50 }).notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  reservedQty: numeric('reserved_qty', { precision: 18, scale: 4 }).notNull().default('0'),
  avgCost: numeric('avg_cost', { precision: 18, scale: 4 }).notNull().default('0'),
  lastCost: numeric('last_cost', { precision: 18, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// DB table = stock_transactions
export const inventoryTransactions = pgTable('stock_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull(),
  locationId: uuid('location_id').notNull(),
  productId: uuid('product_id').notNull(),
  variantId: uuid('variant_id'),
  unitName: varchar('unit_name', { length: 50 }).notNull(),
  txnType: varchar('txn_type', { length: 30 }).notNull(),
  refType: varchar('ref_type', { length: 50 }),
  refId: uuid('ref_id'),
  refCode: varchar('ref_code', { length: 100 }),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 18, scale: 4 }),
  totalCost: numeric('total_cost', { precision: 18, scale: 4 }),
  balanceAfter: numeric('balance_after', { precision: 18, scale: 4 }),
  note: text('note'),
  createdBy: uuid('created_by'),
  lotId: uuid('lot_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
