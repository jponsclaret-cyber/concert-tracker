import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { generateWorkout, type GeneratorInput } from '@/algorithms/workoutGenerator';
import { createWorkoutSession } from '@/db/queries/workouts';
import { getAllExercisesWithDetails, getAllMuscleGroups } from '@/db/queries/exercises';
import { buildGeneratorHistoryData } from '@/db/queries/generatorData';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { useGeneratedWorkoutStore } from '@/store/useGeneratedWorkoutStore';

const DEFAULT_DURATION_MINUTES = 45;

export default function TrainScreen() {
  const availableEquipmentIds = useEquipmentStore((s) => s.availableEquipmentIds);
  const setGeneratedWorkout = useGeneratedWorkoutStore((s) => s.setWorkout);
  const clearGeneratedWorkout = useGeneratedWorkoutStore((s) => s.clear);
  const [generating, setGenerating] = useState(false);

  const handleGenerateWorkout = async () => {
    setGenerating(true);
    try {
      const [exercises, muscleGroups] = await Promise.all([
        getAllExercisesWithDetails(),
        getAllMuscleGroups(),
      ]);
      const history = await buildGeneratorHistoryData(exercises);
      const generatorInput: GeneratorInput = {
        exercises,
        availableEquipmentIds,
        allMuscleGroupIds: muscleGroups.map((m) => m.id),
        desiredDurationMinutes: DEFAULT_DURATION_MINUTES,
        ...history,
      };
      const workout = generateWorkout(generatorInput);
      setGeneratedWorkout(workout, generatorInput);
      router.push('/workout/preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartManualWorkout = async () => {
    clearGeneratedWorkout();
    const sessionId = await createWorkoutSession('manual');
    router.push(`/workout/${sessionId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Train</Text>
      <Pressable style={styles.button} onPress={handleGenerateWorkout} disabled={generating}>
        <Text style={styles.buttonText}>{generating ? 'Generating…' : 'Generate workout'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleStartManualWorkout}>
        <Text style={styles.secondaryButtonText}>Start manual workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
  },
});
