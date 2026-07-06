import type { ExerciseDetail } from '@/db/queries/exercises';
import { prescribeNextSet, type SetHistoryEntry } from './progressiveOverload';

const MIN_EXERCISES = 4;
const MAX_EXERCISES = 10;
const MINUTES_PER_EXERCISE = 6.5; // ~3 sets x (40s work + 90s rest)
const DEFAULT_SETS_PER_EXERCISE = 3;
const MAX_FOCUS_MUSCLE_GROUPS = 4;

export interface GeneratorInput {
  exercises: ExerciseDetail[];
  availableEquipmentIds: string[];
  allMuscleGroupIds: string[];
  lastTrainedAtByMuscle: Record<string, string | null>;
  lastUsedAtByExercise: Record<string, string | null>;
  lastSessionSetsByExercise: Record<string, SetHistoryEntry[]>;
  desiredDurationMinutes: number;
}

export interface GeneratedExercise {
  exerciseId: string;
  name: string;
  targetMuscleGroupId: string;
  prescribedSets: number;
  prescribedReps: number;
  prescribedWeightKg: number | null;
  repRangeMin: number;
  repRangeMax: number;
}

export interface GeneratedWorkout {
  focusMuscleGroupIds: string[];
  exercises: GeneratedExercise[];
  estimatedDurationMinutes: number;
}

function hoursSince(isoDate: string | null, now: number): number {
  if (!isoDate) return Infinity;
  return (now - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

function isEquipmentAvailable(exercise: ExerciseDetail, availableEquipmentIds: string[]): boolean {
  const effectivelyAvailable =
    availableEquipmentIds.length > 0 ? availableEquipmentIds : ['bodyweight'];
  return exercise.equipmentIds.every((id) => effectivelyAvailable.includes(id));
}

function scoreCandidate(
  exercise: ExerciseDetail,
  lastUsedAt: string | null,
  now: number,
  isEarlySlot: boolean
): number {
  const daysSinceLastUsed = lastUsedAt
    ? (now - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const varietyBonus = Math.min(daysSinceLastUsed, 30) / 30; // 0..1
  const compoundBonus = isEarlySlot && exercise.mechanicsType === 'compound' ? 0.5 : 0;
  return varietyBonus + compoundBonus;
}

function pickExerciseForMuscle(
  candidates: ExerciseDetail[],
  muscleGroupId: string,
  alreadyPicked: Set<string>,
  lastUsedAtByExercise: Record<string, string | null>,
  now: number,
  isEarlySlot: boolean
): ExerciseDetail | null {
  const pool = candidates.filter(
    (e) => !alreadyPicked.has(e.id) && e.primaryMuscleIds.includes(muscleGroupId)
  );
  if (pool.length === 0) return null;

  const scored = pool
    .map((e) => ({ exercise: e, score: scoreCandidate(e, lastUsedAtByExercise[e.id] ?? null, now, isEarlySlot) }))
    .sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, Math.min(3, scored.length));
  const choice = topN[Math.floor(Math.random() * topN.length)];
  return choice.exercise;
}

export function generateWorkout(input: GeneratorInput): GeneratedWorkout {
  const now = Date.now();

  const rankedMuscles = [...input.allMuscleGroupIds].sort(
    (a, b) =>
      hoursSince(input.lastTrainedAtByMuscle[b] ?? null, now) -
      hoursSince(input.lastTrainedAtByMuscle[a] ?? null, now)
  );

  const numExercises = Math.max(
    MIN_EXERCISES,
    Math.min(MAX_EXERCISES, Math.floor(input.desiredDurationMinutes / MINUTES_PER_EXERCISE))
  );
  const focusMuscleGroupIds = rankedMuscles.slice(
    0,
    Math.min(MAX_FOCUS_MUSCLE_GROUPS, rankedMuscles.length)
  );

  const equipmentFilteredExercises = input.exercises.filter((e) =>
    isEquipmentAvailable(e, input.availableEquipmentIds)
  );

  const alreadyPicked = new Set<string>();
  const generatedExercises: GeneratedExercise[] = [];

  for (let slot = 0; slot < numExercises; slot++) {
    // Round-robin through the focus muscles so slots spread across all of them.
    const targetMuscleGroupId = focusMuscleGroupIds[slot % focusMuscleGroupIds.length];
    const exercise = pickExerciseForMuscle(
      equipmentFilteredExercises,
      targetMuscleGroupId,
      alreadyPicked,
      input.lastUsedAtByExercise,
      now,
      slot < focusMuscleGroupIds.length
    );
    if (!exercise) continue;

    alreadyPicked.add(exercise.id);
    const prescribed = prescribeNextSet(
      exercise,
      input.lastSessionSetsByExercise[exercise.id] ?? []
    );

    generatedExercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      targetMuscleGroupId,
      prescribedSets: DEFAULT_SETS_PER_EXERCISE,
      prescribedReps: prescribed.reps,
      prescribedWeightKg: prescribed.weightKg,
      repRangeMin: exercise.repRangeMin,
      repRangeMax: exercise.repRangeMax,
    });
  }

  return {
    focusMuscleGroupIds,
    exercises: generatedExercises,
    estimatedDurationMinutes: Math.round(generatedExercises.length * MINUTES_PER_EXERCISE),
  };
}

export function swapExercise(
  input: GeneratorInput,
  workout: GeneratedWorkout,
  slotIndex: number
): GeneratedWorkout {
  const slot = workout.exercises[slotIndex];
  if (!slot) return workout;

  const equipmentFilteredExercises = input.exercises.filter((e) =>
    isEquipmentAvailable(e, input.availableEquipmentIds)
  );
  const alreadyPicked = new Set(workout.exercises.map((e) => e.exerciseId));
  alreadyPicked.delete(slot.exerciseId);

  const replacement = pickExerciseForMuscle(
    equipmentFilteredExercises,
    slot.targetMuscleGroupId,
    alreadyPicked,
    input.lastUsedAtByExercise,
    Date.now(),
    slotIndex < workout.focusMuscleGroupIds.length
  );
  if (!replacement) return workout;

  const prescribed = prescribeNextSet(
    replacement,
    input.lastSessionSetsByExercise[replacement.id] ?? []
  );

  const nextExercises = [...workout.exercises];
  nextExercises[slotIndex] = {
    exerciseId: replacement.id,
    name: replacement.name,
    targetMuscleGroupId: slot.targetMuscleGroupId,
    prescribedSets: DEFAULT_SETS_PER_EXERCISE,
    prescribedReps: prescribed.reps,
    prescribedWeightKg: prescribed.weightKg,
    repRangeMin: replacement.repRangeMin,
    repRangeMax: replacement.repRangeMax,
  };

  return { ...workout, exercises: nextExercises };
}
