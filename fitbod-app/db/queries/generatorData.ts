import { isNotNull } from 'drizzle-orm';

import { db } from '../client';
import { setLogs, workoutSessions } from '../schema';
import type { ExerciseDetail } from './exercises';
import type { SetHistoryEntry } from '@/algorithms/progressiveOverload';

const SAME_SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface GeneratorHistoryData {
  lastTrainedAtByMuscle: Record<string, string | null>;
  lastUsedAtByExercise: Record<string, string | null>;
  lastSessionSetsByExercise: Record<string, SetHistoryEntry[]>;
}

export async function buildGeneratorHistoryData(
  exercises: ExerciseDetail[]
): Promise<GeneratorHistoryData> {
  const completedSessions = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(isNotNull(workoutSessions.completedAt));
  const completedSessionIds = new Set(completedSessions.map((s) => s.id));

  const allSets = await db.select().from(setLogs);
  const relevantSets = allSets.filter((s) => completedSessionIds.has(s.sessionId));

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const lastUsedAtByExercise: Record<string, string | null> = {};
  const lastTrainedAtByMuscle: Record<string, string | null> = {};
  const setsByExercise: Record<string, { weightKg: number | null; reps: number; completedAt: string }[]> = {};

  for (const set of relevantSets) {
    if (!lastUsedAtByExercise[set.exerciseId] || set.completedAt > lastUsedAtByExercise[set.exerciseId]!) {
      lastUsedAtByExercise[set.exerciseId] = set.completedAt;
    }
    (setsByExercise[set.exerciseId] ??= []).push({
      weightKg: set.weightKg,
      reps: set.reps,
      completedAt: set.completedAt,
    });

    const exercise = exerciseById.get(set.exerciseId);
    if (exercise) {
      for (const muscleId of [...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds]) {
        if (!lastTrainedAtByMuscle[muscleId] || set.completedAt > lastTrainedAtByMuscle[muscleId]!) {
          lastTrainedAtByMuscle[muscleId] = set.completedAt;
        }
      }
    }
  }

  const lastSessionSetsByExercise: Record<string, SetHistoryEntry[]> = {};
  for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
    sets.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const mostRecentTime = new Date(sets[0].completedAt).getTime();
    const sameSessionSets = sets.filter(
      (s) => mostRecentTime - new Date(s.completedAt).getTime() < SAME_SESSION_WINDOW_MS
    );
    lastSessionSetsByExercise[exerciseId] = sameSessionSets.map((s) => ({
      weightKg: s.weightKg,
      reps: s.reps,
    }));
  }

  return { lastTrainedAtByMuscle, lastUsedAtByExercise, lastSessionSetsByExercise };
}
