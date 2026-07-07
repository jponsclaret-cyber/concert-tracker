import { desc } from 'drizzle-orm';

import { db } from '../client';
import { externalActivities } from '../schema';

export async function listExternalActivities() {
  return db.select().from(externalActivities).orderBy(desc(externalActivities.startDate));
}
