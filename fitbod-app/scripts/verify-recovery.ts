// Sanity check for the muscle recovery decay/fatigue model.
// Run with: npx tsx scripts/verify-recovery.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

import * as schema from '../db/schema';
import { seedIfEmpty } from '../db/seed';
import { computeRecoveryPct } from '../algorithms/muscleRecovery';

async function main() {
  const sqlite = new Database(':memory:');
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../db/migrations/0000_bent_karma.sql'), 'utf-8'));
  const db = drizzle(sqlite, { schema });
  await seedIfEmpty(db as never);

  const initialRows = await db.select().from(schema.muscleRecoveryState);
  for (const row of initialRows) {
    const pct = computeRecoveryPct(row);
    if (pct !== 100) throw new Error(`Fresh muscle group ${row.muscleGroupId} should start at 100%, got ${pct}`);
  }
  console.log('Fresh recovery state checks passed.');

  const sessionId = 'recovery-test-session';
  await db.insert(schema.workoutSessions).values({
    id: sessionId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    sourceType: 'manual',
  });
  await db.insert(schema.setLogs).values([
    { id: 'r-set-1', sessionId, exerciseId: 'barbell_bench_press', setNumber: 1, weightKg: 60, reps: 8, isWarmup: false, completedAt: new Date().toISOString() },
    { id: 'r-set-2', sessionId, exerciseId: 'barbell_bench_press', setNumber: 2, weightKg: 60, reps: 8, isWarmup: false, completedAt: new Date().toISOString() },
    { id: 'r-set-3', sessionId, exerciseId: 'barbell_bench_press', setNumber: 3, weightKg: 60, reps: 8, isWarmup: false, completedAt: new Date().toISOString() },
  ]);

  // Mirrors db/queries/recovery.ts's updateMuscleRecoveryForSession, using the same
  // in-memory db handle (that module binds to the real expo-sqlite client instead).
  const { fatigueContributionForSets, applyFatigueContribution } = await import('../algorithms/muscleRecovery');
  const links = await db
    .select()
    .from(schema.exerciseMuscles)
    .where(eq(schema.exerciseMuscles.exerciseId, 'barbell_bench_press'));
  const recoveryRows = await db.select().from(schema.muscleRecoveryState);

  for (const link of links) {
    const contribution = fatigueContributionForSets(3, link.isPrimary);
    const row = recoveryRows.find((r) => r.muscleGroupId === link.muscleGroupId)!;
    const updated = applyFatigueContribution(row, contribution);
    await db
      .update(schema.muscleRecoveryState)
      .set({ accumulatedFatigue: updated.accumulatedFatigue, lastTrainedAt: updated.updatedAt, updatedAt: updated.updatedAt })
      .where(eq(schema.muscleRecoveryState.muscleGroupId, link.muscleGroupId));
  }

  const afterTraining = await db
    .select()
    .from(schema.muscleRecoveryState)
    .where(eq(schema.muscleRecoveryState.muscleGroupId, 'chest'));
  const chestPctNow = computeRecoveryPct(afterTraining[0]);
  if (!(chestPctNow < 70)) {
    throw new Error(`Expected chest recovery to drop below 70% right after training, got ${chestPctNow}`);
  }
  console.log(`Chest recovery right after training: ${chestPctNow.toFixed(1)}%`);

  // Simulate the passage of a full half-life: recovery should climb back toward 100%.
  const oneHalfLifeLater = Date.now() + afterTraining[0].recoveryHalfLifeHours * 60 * 60 * 1000;
  const chestPctLater = computeRecoveryPct(afterTraining[0], oneHalfLifeLater);
  if (!(chestPctLater > chestPctNow)) {
    throw new Error('Recovery percentage should increase as time passes');
  }
  console.log(`Chest recovery one half-life later: ${chestPctLater.toFixed(1)}%`);

  const untrainedRow = (await db
    .select()
    .from(schema.muscleRecoveryState)
    .where(eq(schema.muscleRecoveryState.muscleGroupId, 'calves')))[0];
  const calvesPct = computeRecoveryPct(untrainedRow);
  if (calvesPct !== 100) {
    throw new Error(`Untrained muscle group should remain at 100%, got ${calvesPct}`);
  }

  console.log('All recovery sanity checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
