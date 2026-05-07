import { pgTable, uuid, varchar, boolean, timestamp, text, numeric, time } from 'drizzle-orm/pg-core';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  storeCode: varchar('store_code', { length: 50 }).notNull().unique(),
  storeName: varchar('store_name', { length: 200 }).notNull(),
  storeType: varchar('store_type', { length: 30 }).notNull().default('retail'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  address: text('address'),
  district: varchar('district', { length: 100 }),
  city: varchar('city', { length: 100 }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Ho_Chi_Minh'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
