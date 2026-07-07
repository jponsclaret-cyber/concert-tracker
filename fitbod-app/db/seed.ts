import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import seedData from '@/data/exerciseLibrary.seed.json';
import * as schema from './schema';

const RECOVERY_HALF_LIFE_HOURS: Record<string, number> = {
  large: 54,
  medium: 36,
  small: 24,
};

export async function seedIfEmpty(db: ExpoSQLiteDatabase<typeof schema>) {
  const existing = await db.select().from(schema.muscleGroups).limit(1);
  if (existing.length > 0) return;

  await db.insert(schema.muscleGroups).values(
    seedData.muscleGroups.map((m) => ({
      ...m,
      bodyRegion: m.bodyRegion as 'upper' | 'lower' | 'core',
      recoveryClass: m.recoveryClass as 'large' | 'medium' | 'small',
    }))
  );
  await db.insert(schema.equipment).values(
    seedData.equipment.map((e) => ({
      ...e,
      category: e.category as
        | 'barbell'
        | 'dumbbell'
        | 'machine'
        | 'cable'
        | 'bodyweight'
        | 'band'
        | 'kettlebell',
    }))
  );

  await db.insert(schema.exercises).values(
    seedData.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      mechanicsType: e.mechanicsType as 'compound' | 'isolation',
      forceType: e.forceType as 'push' | 'pull' | 'static',
      unilateral: e.unilateral,
      instructions: e.instructions,
      repRangeMin: e.repRangeMin,
      repRangeMax: e.repRangeMax,
    }))
  );

  const exerciseMuscleRows = seedData.exercises.flatMap((e) => [
    ...e.primaryMuscles.map((muscleGroupId) => ({
      exerciseId: e.id,
      muscleGroupId,
      isPrimary: true,
    })),
    ...e.secondaryMuscles.map((muscleGroupId) => ({
      exerciseId: e.id,
      muscleGroupId,
      isPrimary: false,
    })),
  ]);
  await db.insert(schema.exerciseMuscles).values(exerciseMuscleRows);

  const exerciseEquipmentRows = seedData.exercises.flatMap((e) =>
    e.equipment.map((equipmentId) => ({ exerciseId: e.id, equipmentId }))
  );
  await db.insert(schema.exerciseEquipment).values(exerciseEquipmentRows);

  const now = new Date().toISOString();
  await db.insert(schema.muscleRecoveryState).values(
    seedData.muscleGroups.map((m) => ({
      muscleGroupId: m.id,
      lastTrainedAt: null,
      accumulatedFatigue: 0,
      recoveryHalfLifeHours: RECOVERY_HALF_LIFE_HOURS[m.recoveryClass],
      updatedAt: now,
    }))
  );
}
