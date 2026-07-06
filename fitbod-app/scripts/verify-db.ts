// One-off sanity check for the SQLite schema/migration/seed layer, run against
// better-sqlite3 (same SQL dialect as expo-sqlite) since there's no device/simulator
// available here to exercise the real Expo runtime. Deliberately avoids importing
// db/client.ts and db/queries/*.ts, since those eagerly call expo-sqlite's
// openDatabaseSync at module scope, which has no native implementation under plain
// Node — instead it exercises the same drizzle query patterns directly against the
// schema, which is what those files wrap.
// Run with: npx tsx scripts/verify-db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { desc, eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

import * as schema from '../db/schema';
import { seedIfEmpty } from '../db/seed';

async function main() {
  const sqlite = new Database(':memory:');
  const migrationSql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/0000_bent_karma.sql'),
    'utf-8'
  );
  sqlite.exec(migrationSql);

  const db = drizzle(sqlite, { schema });

  await seedIfEmpty(db as never);

  const muscleGroups = await db.select().from(schema.muscleGroups);
  const exercises = await db.select().from(schema.exercises);
  console.log(`Seeded ${muscleGroups.length} muscle groups, ${exercises.length} exercises`);
  if (muscleGroups.length === 0 || exercises.length === 0) {
    throw new Error('Seed produced no data');
  }

  const recoveryRows = await db.select().from(schema.muscleRecoveryState);
  if (recoveryRows.length !== muscleGroups.length) {
    throw new Error('Muscle recovery state was not seeded for every muscle group');
  }

  const benchMuscles = await db
    .select()
    .from(schema.exerciseMuscles)
    .where(eq(schema.exerciseMuscles.exerciseId, 'barbell_bench_press'));
  if (!benchMuscles.some((m) => m.muscleGroupId === 'chest' && m.isPrimary)) {
    throw new Error('Exercise-muscle join not wired correctly');
  }

  const benchEquipment = await db
    .select()
    .from(schema.exerciseEquipment)
    .where(eq(schema.exerciseEquipment.exerciseId, 'barbell_bench_press'));
  if (!benchEquipment.some((e) => e.equipmentId === 'barbell')) {
    throw new Error('Exercise-equipment join not wired correctly');
  }

  // Re-implements the same insert/query shape as db/queries/workouts.ts, against
  // this in-memory db, to validate the schema supports that access pattern.
  const sessionId = 'test-session-1';
  await db.insert(schema.workoutSessions).values({
    id: sessionId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    sourceType: 'manual',
  });
  await db.insert(schema.setLogs).values([
    {
      id: 'set-1',
      sessionId,
      exerciseId: 'barbell_bench_press',
      setNumber: 1,
      weightKg: 60,
      reps: 8,
      isWarmup: false,
      completedAt: new Date().toISOString(),
    },
    {
      id: 'set-2',
      sessionId,
      exerciseId: 'barbell_bench_press',
      setNumber: 2,
      weightKg: 62.5,
      reps: 6,
      isWarmup: false,
      completedAt: new Date().toISOString(),
    },
  ]);
  await db
    .update(schema.workoutSessions)
    .set({ completedAt: new Date().toISOString() })
    .where(eq(schema.workoutSessions.id, sessionId));

  const sets = await db
    .select({
      id: schema.setLogs.id,
      exerciseName: schema.exercises.name,
      reps: schema.setLogs.reps,
    })
    .from(schema.setLogs)
    .innerJoin(schema.exercises, eq(schema.setLogs.exerciseId, schema.exercises.id))
    .where(eq(schema.setLogs.sessionId, sessionId))
    .orderBy(schema.setLogs.completedAt);
  if (sets.length !== 2) throw new Error(`Expected 2 logged sets, got ${sets.length}`);
  if (sets[0].exerciseName !== 'Barbell Bench Press') {
    throw new Error('Set log join to exercise name failed');
  }

  const sessions = await db
    .select()
    .from(schema.workoutSessions)
    .orderBy(desc(schema.workoutSessions.startedAt));
  if (sessions.length !== 1 || !sessions[0].completedAt) {
    throw new Error('Session was not marked completed');
  }

  console.log('All DB sanity checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
