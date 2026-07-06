import { db } from '../client';
import { equipment, exerciseEquipment, exerciseMuscles, exercises, muscleGroups } from '../schema';

export interface ExerciseDetail {
  id: string;
  name: string;
  mechanicsType: 'compound' | 'isolation';
  forceType: 'push' | 'pull' | 'static';
  unilateral: boolean;
  instructions: string;
  repRangeMin: number;
  repRangeMax: number;
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
  equipmentIds: string[];
}

export async function getAllExercisesWithDetails(): Promise<ExerciseDetail[]> {
  const [allExercises, allExerciseMuscles, allExerciseEquipment] = await Promise.all([
    db.select().from(exercises),
    db.select().from(exerciseMuscles),
    db.select().from(exerciseEquipment),
  ]);

  return allExercises.map((exercise) => ({
    ...exercise,
    primaryMuscleIds: allExerciseMuscles
      .filter((m) => m.exerciseId === exercise.id && m.isPrimary)
      .map((m) => m.muscleGroupId),
    secondaryMuscleIds: allExerciseMuscles
      .filter((m) => m.exerciseId === exercise.id && !m.isPrimary)
      .map((m) => m.muscleGroupId),
    equipmentIds: allExerciseEquipment
      .filter((e) => e.exerciseId === exercise.id)
      .map((e) => e.equipmentId),
  }));
}

export async function getExerciseById(exerciseId: string): Promise<ExerciseDetail | null> {
  const all = await getAllExercisesWithDetails();
  return all.find((e) => e.id === exerciseId) ?? null;
}

export async function getAllMuscleGroups() {
  return db.select().from(muscleGroups);
}

export async function getAllEquipment() {
  return db.select().from(equipment);
}
