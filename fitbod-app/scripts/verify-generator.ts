// Sanity check for the pure workout-generation and progressive-overload algorithms.
// Run with: npx tsx scripts/verify-generator.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import * as schema from '../db/schema';
import { seedIfEmpty } from '../db/seed';
import { generateWorkout, swapExercise, type GeneratorInput } from '../algorithms/workoutGenerator';
import { estimateOneRepMax, prescribeNextSet } from '../algorithms/progressiveOverload';
import type { ExerciseDetail } from '../db/queries/exercises';

async function loadExercises(db: ReturnType<typeof drizzle>): Promise<ExerciseDetail[]> {
  const [exercises, exerciseMuscles, exerciseEquipment] = await Promise.all([
    db.select().from(schema.exercises),
    db.select().from(schema.exerciseMuscles),
    db.select().from(schema.exerciseEquipment),
  ]);
  return exercises.map((exercise) => ({
    ...exercise,
    primaryMuscleIds: exerciseMuscles
      .filter((m) => m.exerciseId === exercise.id && m.isPrimary)
      .map((m) => m.muscleGroupId),
    secondaryMuscleIds: exerciseMuscles
      .filter((m) => m.exerciseId === exercise.id && !m.isPrimary)
      .map((m) => m.muscleGroupId),
    equipmentIds: exerciseEquipment
      .filter((e) => e.exerciseId === exercise.id)
      .map((e) => e.equipmentId),
  }));
}

async function main() {
  // --- progressiveOverload ---
  const e1rm = estimateOneRepMax(60, 8);
  if (Math.abs(e1rm - 76) > 0.01) throw new Error(`Unexpected e1RM: ${e1rm}`);

  const noHistory = prescribeNextSet({ repRangeMin: 6, repRangeMax: 10, mechanicsType: 'compound' }, []);
  if (noHistory.weightKg !== null || noHistory.reps !== 6) {
    throw new Error(`Expected conservative first prescription, got ${JSON.stringify(noHistory)}`);
  }

  const metGoal = prescribeNextSet(
    { repRangeMin: 6, repRangeMax: 10, mechanicsType: 'compound' },
    [{ weightKg: 60, reps: 10 }]
  );
  const belowGoal = prescribeNextSet(
    { repRangeMin: 6, repRangeMax: 10, mechanicsType: 'compound' },
    [{ weightKg: 60, reps: 7 }]
  );
  if (!(metGoal.weightKg! > belowGoal.weightKg!)) {
    throw new Error('Meeting the top of the rep range should prescribe more weight than falling short');
  }
  console.log('progressiveOverload checks passed.');

  // --- workoutGenerator ---
  const sqlite = new Database(':memory:');
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../db/migrations/0000_bent_karma.sql'), 'utf-8'));
  const db = drizzle(sqlite, { schema });
  await seedIfEmpty(db as never);

  const exercises = await loadExercises(db);
  const muscleGroups = await db.select().from(schema.muscleGroups);
  const allEquipment = await db.select().from(schema.equipment);

  const baseInput: GeneratorInput = {
    exercises,
    availableEquipmentIds: allEquipment.map((e) => e.id),
    allMuscleGroupIds: muscleGroups.map((m) => m.id),
    lastTrainedAtByMuscle: {},
    lastUsedAtByExercise: {},
    lastSessionSetsByExercise: {},
    desiredDurationMinutes: 45,
  };

  const workout = generateWorkout(baseInput);
  if (workout.exercises.length < 4 || workout.exercises.length > 10) {
    throw new Error(`Unexpected exercise count: ${workout.exercises.length}`);
  }
  const ids = workout.exercises.map((e) => e.exerciseId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Generated workout contains duplicate exercises');
  }
  for (const generated of workout.exercises) {
    const exercise = exercises.find((e) => e.id === generated.exerciseId)!;
    const ok = exercise.equipmentIds.every((eq) => baseInput.availableEquipmentIds.includes(eq));
    if (!ok) throw new Error(`Generated exercise ${exercise.name} requires unavailable equipment`);
  }
  console.log(
    `Generated ${workout.exercises.length} exercises targeting [${workout.focusMuscleGroupIds.join(', ')}]`
  );

  // Equipment constraint: bodyweight-only should exclude barbell/machine work.
  const bodyweightOnlyInput: GeneratorInput = { ...baseInput, availableEquipmentIds: ['bodyweight'] };
  const bodyweightWorkout = generateWorkout(bodyweightOnlyInput);
  for (const generated of bodyweightWorkout.exercises) {
    const exercise = exercises.find((e) => e.id === generated.exerciseId)!;
    if (!exercise.equipmentIds.every((eq) => eq === 'bodyweight')) {
      throw new Error(`Bodyweight-only generation picked non-bodyweight exercise ${exercise.name}`);
    }
  }
  console.log('Equipment-constrained generation checks passed.');

  // Swap should replace the exercise in that slot while keeping the same target muscle.
  const swapped = swapExercise(baseInput, workout, 0);
  if (swapped.exercises[0].targetMuscleGroupId !== workout.exercises[0].targetMuscleGroupId) {
    throw new Error('Swap changed the target muscle group');
  }
  console.log('Swap check passed.');

  console.log('All generator sanity checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
