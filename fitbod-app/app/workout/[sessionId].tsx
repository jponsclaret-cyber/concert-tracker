import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { RestTimer } from '@/components/RestTimer';
import { getAllExercisesWithDetails, type ExerciseDetail } from '@/db/queries/exercises';
import { addSetLog, completeWorkoutSession, getSessionSets } from '@/db/queries/workouts';
import { updateMuscleRecoveryForSession } from '@/db/queries/recovery';
import { useGeneratedWorkoutStore } from '@/store/useGeneratedWorkoutStore';

interface LoggedSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

export default function ActiveWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [allExercises, setAllExercises] = useState<ExerciseDetail[]>([]);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDetail | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [restKey, setRestKey] = useState(0);
  const [planIndex, setPlanIndex] = useState(0);

  const generatedWorkout = useGeneratedWorkoutStore((s) => s.workout);
  const clearGeneratedWorkout = useGeneratedWorkoutStore((s) => s.clear);
  const plannedExercises = generatedWorkout?.exercises ?? [];
  const isPlanned = plannedExercises.length > 0;

  const refreshSets = useCallback(async () => {
    if (!sessionId) return;
    const sets = await getSessionSets(sessionId);
    setLoggedSets(sets);
  }, [sessionId]);

  useEffect(() => {
    getAllExercisesWithDetails().then(setAllExercises);
    refreshSets();
  }, [refreshSets]);

  useEffect(() => {
    if (!isPlanned || allExercises.length === 0) return;
    const planned = plannedExercises[planIndex];
    if (!planned) return;
    const exercise = allExercises.find((e) => e.id === planned.exerciseId);
    if (!exercise) return;
    setSelectedExercise(exercise);
    setWeightInput(planned.prescribedWeightKg != null ? String(planned.prescribedWeightKg) : '');
    setRepsInput(String(planned.prescribedReps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlanned, planIndex, allExercises]);

  const handleSelectExercise = (exercise: ExerciseDetail) => {
    setSelectedExercise(exercise);
    setPickerVisible(false);
    setWeightInput('');
    setRepsInput('');
  };

  const handleLogSet = async () => {
    if (!sessionId || !selectedExercise) return;
    const reps = parseInt(repsInput, 10);
    if (!reps || reps <= 0) {
      Alert.alert('Enter a valid rep count');
      return;
    }
    const weightKg = weightInput.trim() ? parseFloat(weightInput) : null;
    const setNumber =
      loggedSets.filter((s) => s.exerciseId === selectedExercise.id).length + 1;

    await addSetLog({
      sessionId,
      exerciseId: selectedExercise.id,
      setNumber,
      weightKg,
      reps,
    });
    setRepsInput('');
    setRestKey((k) => k + 1);
    await refreshSets();
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    await completeWorkoutSession(sessionId);
    await updateMuscleRecoveryForSession(sessionId);
    clearGeneratedWorkout();
    router.replace('/(tabs)/history');
  };

  const handleNextPlannedExercise = () => {
    setPlanIndex((i) => Math.min(i + 1, plannedExercises.length - 1));
  };

  const setsForSelected = selectedExercise
    ? loggedSets.filter((s) => s.exerciseId === selectedExercise.id)
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Workout in progress</Text>

      <Pressable style={styles.addExerciseButton} onPress={() => setPickerVisible(true)}>
        <Text style={styles.addExerciseText}>
          {selectedExercise ? `Switch exercise (${selectedExercise.name})` : 'Add exercise'}
        </Text>
      </Pressable>

      {isPlanned && (
        <Text style={styles.planProgress}>
          Exercise {planIndex + 1} of {plannedExercises.length}
        </Text>
      )}

      {selectedExercise && (
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{selectedExercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            Target {selectedExercise.repRangeMin}-{selectedExercise.repRangeMax} reps
          </Text>

          {setsForSelected.map((s) => (
            <Text key={s.id} style={styles.loggedSetRow}>
              Set {s.setNumber}: {s.weightKg ?? '-'} kg × {s.reps} reps
            </Text>
          ))}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="kg"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
            />
            <TextInput
              style={styles.input}
              placeholder="reps"
              keyboardType="number-pad"
              value={repsInput}
              onChangeText={setRepsInput}
            />
            <Pressable style={styles.logButton} onPress={handleLogSet}>
              <Text style={styles.logButtonText}>Log set</Text>
            </Pressable>
          </View>

          <RestTimer resetKey={restKey} />

          {isPlanned && planIndex < plannedExercises.length - 1 && (
            <Pressable style={styles.nextButton} onPress={handleNextPlannedExercise}>
              <Text style={styles.nextButtonText}>Next exercise</Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishButtonText}>Finish workout</Text>
      </Pressable>

      <ExercisePickerModal
        visible={pickerVisible}
        exercises={allExercises}
        onSelect={handleSelectExercise}
        onClose={() => setPickerVisible(false)}
      />
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
  addExerciseButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '500',
  },
  planProgress: {
    fontSize: 13,
    opacity: 0.6,
  },
  nextButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: 13,
    opacity: 0.6,
  },
  loggedSetRow: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  finishButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
