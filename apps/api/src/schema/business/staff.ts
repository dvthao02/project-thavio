import { pgTable, uuid, varchar, boolean, timestamp, date, numeric } from 'drizzle-orm/pg-core';

// DB table = staff_members
export const staff = pgTable('staff_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffCode: varchar('staff_code', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  displayName: varchar('display_name', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  pinHash: varchar('pin_hash', { length: 255 }),
  position: varchar('position', { length: 100 }),
  role: varchar('role', { length: 80 }).notNull(),
  departmentId: uuid('department_id'),
  primaryStoreId: uuid('primary_store_id'),
  contractType: varchar('contract_type', { length: 30 }).notNull().default('full_time'),
  hireDate: date('hire_date'),
  terminationDate: date('termination_date'),
  baseSalary: numeric('base_salary', { precision: 18, scale: 2 }).notNull().default('0'),
  hourlyRate: numeric('hourly_rate', { precision: 18, scale: 2 }).notNull().default('0'),
  employmentStatus: varchar('employment_status', { length: 30 }).notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
