import { pgTable, uuid, varchar, text, boolean, timestamp, numeric, integer, date } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id'),
  customerCode: varchar('customer_code', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  gender: varchar('gender', { length: 10 }),
  dateOfBirth: date('date_of_birth'),
  address: text('address'),
  loyaltyPoints: numeric('loyalty_points', { precision: 18, scale: 4 }).notNull().default('0'),
  totalSpent: numeric('total_spent', { precision: 18, scale: 4 }).notNull().default('0'),
  visitCount: integer('visit_count').notNull().default(0),
  lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
