import { pgTable, timestamp, varchar, uuid } from 'drizzle-orm/pg-core';

// Devices Table
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  location: varchar('location', { length: 255 }),
  deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
  apiKey: varchar('api_key', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
