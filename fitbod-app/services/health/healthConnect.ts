import { Platform } from 'react-native';
import {
  ExerciseType,
  getSdkStatus,
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type { CanonicalActivityType } from './activityMapping';

const EXERCISE_TYPE_TO_CANONICAL: Partial<Record<number, CanonicalActivityType>> = {
  [ExerciseType.RUNNING]: 'running',
  [ExerciseType.RUNNING_TREADMILL]: 'running',
  [ExerciseType.WALKING]: 'walking',
  [ExerciseType.HIKING]: 'hiking',
  [ExerciseType.BIKING]: 'cycling',
  [ExerciseType.BIKING_STATIONARY]: 'cycling',
  [ExerciseType.SWIMMING_POOL]: 'swimming',
  [ExerciseType.SWIMMING_OPEN_WATER]: 'swimming',
  [ExerciseType.ROWING]: 'rowing',
  [ExerciseType.ROWING_MACHINE]: 'rowing',
  [ExerciseType.ELLIPTICAL]: 'elliptical',
  [ExerciseType.STRENGTH_TRAINING]: 'strength_training',
  [ExerciseType.WEIGHTLIFTING]: 'strength_training',
  [ExerciseType.CALISTHENICS]: 'strength_training',
  [ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING]: 'strength_training',
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

export function isHealthConnectSupported(): boolean {
  return Platform.OS === 'android';
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (!isHealthConnectSupported()) return false;
  const status = await getSdkStatus();
  return status === SdkAvailabilityStatus.SDK_AVAILABLE;
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!isHealthConnectSupported()) return false;
  await initialize();
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'write', recordType: 'ExerciseSession' },
  ]);
  return granted.length > 0;
}

export async function fetchRecentHealthConnectWorkouts(since: Date): Promise<RawHealthActivity[]> {
  if (!isHealthConnectSupported()) return [];

  const result = await readRecords('ExerciseSession', {
    timeRangeFilter: { operator: 'after', startTime: since.toISOString() },
  });

  return result.records
    .map((record): RawHealthActivity | null => {
      const canonical = EXERCISE_TYPE_TO_CANONICAL[record.exerciseType];
      if (!canonical) return null;
      const durationMin =
        (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60);
      return {
        sourceUuid: record.metadata?.id ?? `${record.startTime}-${record.endTime}`,
        activityType: canonical,
        startDate: record.startTime,
        endDate: record.endTime,
        durationMin,
        activeEnergyKcal: null,
        distanceKm: null,
      };
    })
    .filter((w): w is RawHealthActivity => w !== null);
}

export async function writeWorkoutToHealthConnect(session: {
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  if (!isHealthConnectSupported()) return;
  await insertRecords([
    {
      recordType: 'ExerciseSession',
      startTime: session.startDate.toISOString(),
      endTime: session.endDate.toISOString(),
      exerciseType: ExerciseType.STRENGTH_TRAINING,
      title: 'Strength training',
    },
  ]);
}
