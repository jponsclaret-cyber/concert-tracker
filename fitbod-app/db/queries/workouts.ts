import { randomUUID } from 'expo-crypto';
import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { exercises, setLogs, workoutSessionFocusMuscles, workoutSessions } from '../schema';

export async function createWorkoutSession(
  sourceType: 'generated' | 'manual' | 'imported',
  focusMuscleGroupIds: string[] = []
): Promise<string> {
  const id = randomUUID();
  await db.insert(workoutSessions).values({
    id,
    startedAt: new Date().toISOString(),
    completedAt: null,
    sourceType,
  });

  if (focusMuscleGroupIds.length > 0) {
    await db.insert(workoutSessionFocusMuscles).values(
      focusMuscleGroupIds.map((muscleGroupId) => ({ sessionId: id, muscleGroupId }))
    );
  }

  return id;
}

export async function completeWorkoutSession(sessionId: string): Promise<void> {
  await db
    .update(workoutSessions)
    .set({ completedAt: new Date().toISOString() })
    .where(eq(workoutSessions.id, sessionId));
}

export async function addSetLog(input: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  rpe?: number | null;
  isWarmup?: boolean;
}): Promise<string> {
  const id = randomUUID();
  await db.insert(setLogs).values({
    id,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    setNumber: input.setNumber,
    weightKg: input.weightKg,
    reps: input.reps,
    rpe: input.rpe ?? null,
    isWarmup: input.isWarmup ?? false,
    completedAt: new Date().toISOString(),
  });
  return id;
}

export async function listWorkoutSessions() {
  return db.select().from(workoutSessions).orderBy(desc(workoutSessions.startedAt));
}

export async function getSessionSets(sessionId: string) {
  return db
    .select({
      id: setLogs.id,
      exerciseId: setLogs.exerciseId,
      exerciseName: exercises.name,
      setNumber: setLogs.setNumber,
      weightKg: setLogs.weightKg,
      reps: setLogs.reps,
      rpe: setLogs.rpe,
      isWarmup: setLogs.isWarmup,
      completedAt: setLogs.completedAt,
    })
    .from(setLogs)
    .innerJoin(exercises, eq(setLogs.exerciseId, exercises.id))
    .where(eq(setLogs.sessionId, sessionId))
    .orderBy(setLogs.completedAt);
}

export async function getLastSetsForExercise(exerciseId: string, limit = 10) {
  return db
    .select()
    .from(setLogs)
    .where(eq(setLogs.exerciseId, exerciseId))
    .orderBy(desc(setLogs.completedAt))
    .limit(limit);
}
