import { create } from 'zustand';

import type { GeneratedWorkout, GeneratorInput } from '@/algorithms/workoutGenerator';

interface GeneratedWorkoutStore {
  workout: GeneratedWorkout | null;
  generatorInput: GeneratorInput | null;
  setWorkout: (workout: GeneratedWorkout, generatorInput: GeneratorInput) => void;
  clear: () => void;
}

export const useGeneratedWorkoutStore = create<GeneratedWorkoutStore>((set) => ({
  workout: null,
  generatorInput: null,
  setWorkout: (workout, generatorInput) => set({ workout, generatorInput }),
  clear: () => set({ workout: null, generatorInput: null }),
}));
