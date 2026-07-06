import { Platform } from 'react-native';

import {
  fetchRecentHealthKitWorkouts,
  isHealthKitSupported,
  requestHealthKitPermissions,
  writeWorkoutToHealthKit,
} from './healthkit';
import {
  fetchRecentHealthConnectWorkouts,
  isHealthConnectSupported,
  requestHealthConnectPermissions,
  writeWorkoutToHealthConnect,
} from './healthConnect';
import { mapActivityToMuscleImpact } from './activityMapping';
import { db } from '@/db/client';
import { externalActivities, muscleRecoveryState } from '@/db/schema';
import { applyFatigueContribution } from '@/algorithms/muscleRecovery';
import { eq } from 'drizzle-orm';

export { type CanonicalActivityType } from './activityMapping';

export function isHealthPlatformSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') return requestHealthKitPermissions();
  if (Platform.OS === 'android') return requestHealthConnectPermissions();
  return false;
}

export async function syncExternalHealthActivities(sinceDaysAgo = 14): Promise<number> {
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000);

  const rawActivities = Platform.OS === 'ios'
    ? await fetchRecentHealthKitWorkouts(since)
    : Platform.OS === 'android'
      ? await fetchRecentHealthConnectWorkouts(since)
      : [];

  if (rawActivities.length === 0) return 0;

  const existing = await db.select({ id: externalActivities.id }).from(externalActivities);
  const existingIds = new Set(existing.map((e) => e.id));
  const newActivities = rawActivities.filter((a) => !existingIds.has(a.sourceUuid));
  if (newActivities.length === 0) return 0;

  const recoveryRows = await db.select().from(muscleRecoveryState);
  const recoveryByMuscle = new Map(recoveryRows.map((r) => [r.muscleGroupId, r]));
  const source = Platform.OS === 'ios' ? 'healthkit' : 'healthconnect';

  for (const activity of newActivities) {
    const muscleImpact = mapActivityToMuscleImpact(activity.activityType, {
      durationMin: activity.durationMin,
      activeEnergyKcal: activity.activeEnergyKcal,
      avgHeartRate: null,
    });

    await db.insert(externalActivities).values({
      id: activity.sourceUuid,
      source,
      activityType: activity.activityType,
      startDate: activity.startDate,
      endDate: activity.endDate,
      durationMin: activity.durationMin,
      activeEnergyKcal: activity.activeEnergyKcal,
      avgHeartRate: null,
      distanceKm: activity.distanceKm,
      mappedMuscleImpact: muscleImpact,
    });

    for (const [muscleGroupId, contribution] of Object.entries(muscleImpact)) {
      const row = recoveryByMuscle.get(muscleGroupId);
      if (!row || contribution <= 0) continue;
      const updated = applyFatigueContribution(row, contribution * 100);
      recoveryByMuscle.set(muscleGroupId, { ...row, ...updated });
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

  return newActivities.length;
}

export async function writeCompletedWorkoutToHealthPlatform(session: {
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  try {
    if (Platform.OS === 'ios' && isHealthKitSupported()) {
      await writeWorkoutToHealthKit(session);
    } else if (Platform.OS === 'android' && isHealthConnectSupported()) {
      await writeWorkoutToHealthConnect(session);
    }
  } catch {
    // Best-effort: writing back to the health platform should never block finishing a workout.
  }
}
