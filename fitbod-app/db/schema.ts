import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Placeholder table to verify the SQLite + Drizzle migration pipeline end to end.
// The real domain schema (exercises, sessions, sets, recovery, external activities)
// is added in the data-model milestone.
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
