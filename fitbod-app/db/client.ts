import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

export const sqliteDb = openDatabaseSync('fitbod.db');
export const db = drizzle(sqliteDb, { schema });
