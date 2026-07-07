import { Platform } from 'react-native';
import HealthKit, {
  isHealthDataAvailableAsync,
  queryWorkoutSamples,
  requestAuthorization,
  saveWorkoutSample,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

import type { CanonicalActivityType } from './activityMapping';

const READ_IDENTIFIERS = [
  WorkoutTypeIdentifier,
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const;

const WRITE_IDENTIFIERS = [WorkoutTypeIdentifier] as const;

const HK_ACTIVITY_TYPE_TO_CANONICAL: Partial<Record<WorkoutActivityType, CanonicalActivityType>> = {
  [WorkoutActivityType.running]: 'running',
  [WorkoutActivityType.walking]: 'walking',
  [WorkoutActivityType.hiking]: 'hiking',
  [WorkoutActivityType.cycling]: 'cycling',
  [WorkoutActivityType.swimming]: 'swimming',
  [WorkoutActivityType.rowing]: 'rowing',
  [WorkoutActivityType.elliptical]: 'elliptical',
  [WorkoutActivityType.traditionalStrengthTraining]: 'strength_training',
  [WorkoutActivityType.functionalStrengthTraining]: 'strength_training',
};

export interface RawHealthActivity {
  sourceUuid: string;
  activityType: CanonicalActivityType;
  startDate: string;
  endDate: string;
  durationMin: number;
  activeEnergyKcal: number | null;
  distanceKm: number | null;
}

export function isHealthKitSupported(): boolean {
  return Platform.OS === 'ios';
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (!isHealthKitSupported()) return false;
  return isHealthDataAvailableAsync();
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (!isHealthKitSupported()) return false;
  return requestAuthorization({ toRead: READ_IDENTIFIERS, toShare: WRITE_IDENTIFIERS });
}

export async function fetchRecentHealthKitWorkouts(since: Date): Promise<RawHealthActivity[]> {
  if (!isHealthKitSupported()) return [];

  const workouts = await queryWorkoutSamples({
    filter: { date: { startDate: since } },
    limit: 0,
  });

  return workouts
    .map((workout): RawHealthActivity | null => {
      const canonical = HK_ACTIVITY_TYPE_TO_CANONICAL[workout.workoutActivityType];
      if (!canonical) return null;
      const durationMin = workout.duration.quantity / 60;
      return {
        sourceUuid: workout.uuid,
        activityType: canonical,
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        durationMin,
        activeEnergyKcal: workout.totalEnergyBurned?.quantity ?? null,
        distanceKm: workout.totalDistance ? workout.totalDistance.quantity / 1000 : null,
      };
    })
    .filter((w): w is RawHealthActivity => w !== null);
}

export async function writeWorkoutToHealthKit(session: {
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  if (!isHealthKitSupported()) return;
  await saveWorkoutSample(WorkoutActivityType.traditionalStrengthTraining, [], session.startDate, session.endDate);
}

export { HealthKit };
