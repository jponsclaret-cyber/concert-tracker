import { db } from '../client';
import { userEquipment } from '../schema';

export async function getUserEquipmentIds(): Promise<string[]> {
  const rows = await db.select().from(userEquipment);
  return rows.map((r) => r.equipmentId);
}

export async function setUserEquipmentIds(equipmentIds: string[]): Promise<void> {
  await db.delete(userEquipment);
  if (equipmentIds.length > 0) {
    await db.insert(userEquipment).values(equipmentIds.map((equipmentId) => ({ equipmentId })));
  }
}
