import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { generateWorkout, swapExercise } from '@/algorithms/workoutGenerator';
import { createWorkoutSession } from '@/db/queries/workouts';
import { useGeneratedWorkoutStore } from '@/store/useGeneratedWorkoutStore';

const DURATION_STEP_MINUTES = 15;

function formatMuscleId(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function WorkoutPreviewScreen() {
  const workout = useGeneratedWorkoutStore((s) => s.workout);
  const generatorInput = useGeneratedWorkoutStore((s) => s.generatorInput);
  const setWorkout = useGeneratedWorkoutStore((s) => s.setWorkout);
  const [starting, setStarting] = useState(false);

  if (!workout || !generatorInput) {
    return (
      <View style={styles.container}>
        <Text>No workout generated yet.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const adjustDuration = (deltaMinutes: number) => {
    const nextInput = {
      ...generatorInput,
      desiredDurationMinutes: Math.max(15, generatorInput.desiredDurationMinutes + deltaMinutes),
    };
    setWorkout(generateWorkout(nextInput), nextInput);
  };

  const handleSwap = (slotIndex: number) => {
    setWorkout(swapExercise(generatorInput, workout, slotIndex), generatorInput);
  };

  const handleStart = async () => {
    setStarting(true);
    const sessionId = await createWorkoutSession('generated', workout.focusMuscleGroupIds);
    setStarting(false);
    router.replace(`/workout/${sessionId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Today&apos;s workout</Text>
      <Text style={styles.subtitle}>
        Focus: {workout.focusMuscleGroupIds.map(formatMuscleId).join(', ')} · ~
        {workout.estimatedDurationMinutes} min
      </Text>

      <View style={styles.durationRow}>
        <Pressable style={styles.durationButton} onPress={() => adjustDuration(-DURATION_STEP_MINUTES)}>
          <Text style={styles.durationButtonText}>-{DURATION_STEP_MINUTES} min</Text>
        </Pressable>
        <Text style={styles.durationLabel}>{generatorInput.desiredDurationMinutes} min target</Text>
        <Pressable style={styles.durationButton} onPress={() => adjustDuration(DURATION_STEP_MINUTES)}>
          <Text style={styles.durationButtonText}>+{DURATION_STEP_MINUTES} min</Text>
        </Pressable>
      </View>

      {workout.exercises.map((exercise, index) => (
        <View key={`${exercise.exerciseId}-${index}`} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.prescribedSets} sets × {exercise.prescribedReps} reps
            {exercise.prescribedWeightKg != null ? ` @ ${exercise.prescribedWeightKg} kg` : ''}
          </Text>
          <Pressable style={styles.swapButton} onPress={() => handleSwap(index)}>
            <Text style={styles.swapButtonText}>Swap exercise</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.button} onPress={handleStart} disabled={starting}>
        <Text style={styles.buttonText}>{starting ? 'Starting…' : 'Start workout'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  durationButtonText: {
    fontSize: 13,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  swapButton: {
    alignSelf: 'flex-start',
  },
  swapButtonText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
