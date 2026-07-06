import { eq } from 'drizzle-orm';

import { db } from '../client';
import { exerciseMuscles, muscleRecoveryState, setLogs } from '../schema';
import { applyFatigueContribution, computeRecoveryPct, fatigueContributionForSets } from '@/algorithms/muscleRecovery';

export async function getMuscleRecoveryPctById(): Promise<Record<string, number>> {
  const rows = await db.select().from(muscleRecoveryState);
  const now = Date.now();
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.muscleGroupId] = computeRecoveryPct(row, now);
  }
  return result;
}

export async function updateMuscleRecoveryForSession(sessionId: string): Promise<void> {
  const sessionSets = await db
    .select({
      exerciseId: setLogs.exerciseId,
    })
    .from(setLogs)
    .where(eq(setLogs.sessionId, sessionId));

  if (sessionSets.length === 0) return;

  const setCountByExercise = new Map<string, number>();
  for (const s of sessionSets) {
    setCountByExercise.set(s.exerciseId, (setCountByExercise.get(s.exerciseId) ?? 0) + 1);
  }

  const muscleLinks = await db.select().from(exerciseMuscles);
  const contributionByMuscle = new Map<string, number>();

  for (const [exerciseId, setCount] of setCountByExercise) {
    const links = muscleLinks.filter((l) => l.exerciseId === exerciseId);
    for (const link of links) {
      const contribution = fatigueContributionForSets(setCount, link.isPrimary);
      contributionByMuscle.set(
        link.muscleGroupId,
        (contributionByMuscle.get(link.muscleGroupId) ?? 0) + contribution
      );
    }
  }

  const now = Date.now();
  const recoveryRows = await db.select().from(muscleRecoveryState);

  for (const [muscleGroupId, contribution] of contributionByMuscle) {
    const row = recoveryRows.find((r) => r.muscleGroupId === muscleGroupId);
    if (!row) continue;
    const updated = applyFatigueContribution(row, contribution, now);
    await db
      .update(muscleRecoveryState)
      .set({
        accumulatedFatigue: updated.accumulatedFatigue,
        lastTrainedAt: updated.updatedAt,
        updatedAt: updated.updatedAt,
      })
      .where(eq(muscleRecoveryState.muscleGroupId, muscleGroupId));
  }
}
