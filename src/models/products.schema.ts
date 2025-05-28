import { pgTable, timestamp, varchar, uuid, json, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  unidataId: varchar('unidata_id'),
  productCode: varchar('product_code'),
  productDescription: varchar('product_description'),
  type: varchar('type'),
  state: varchar('state'),
  freeCode: varchar('free_code'),
  formerCodes: jsonb('former_codes'),
  standardizationLevel: varchar('standardization_level'),
  labels: json('labels'),
  sourceSystem: varchar('source_system'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
