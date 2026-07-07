import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAllEquipment, getAllMuscleGroups, getExerciseById, type ExerciseDetail } from '@/db/queries/exercises';

interface NamedRef {
  id: string;
  name: string;
}

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<NamedRef[]>([]);
  const [equipment, setEquipment] = useState<NamedRef[]>([]);

  useEffect(() => {
    if (!exerciseId) return;
    getExerciseById(exerciseId).then(setExercise);
    getAllMuscleGroups().then(setMuscleGroups);
    getAllEquipment().then(setEquipment);
  }, [exerciseId]);

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const nameFor = (list: NamedRef[], id: string) => list.find((i) => i.id === id)?.name ?? id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.meta}>
        {exercise.mechanicsType === 'compound' ? 'Compound' : 'Isolation'} · Target{' '}
        {exercise.repRangeMin}-{exercise.repRangeMax} reps
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary muscles</Text>
        <Text>{exercise.primaryMuscleIds.map((id) => nameFor(muscleGroups, id)).join(', ')}</Text>
      </View>

      {exercise.secondaryMuscleIds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Secondary muscles</Text>
          <Text>{exercise.secondaryMuscleIds.map((id) => nameFor(muscleGroups, id)).join(', ')}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment</Text>
        <Text>{exercise.equipmentIds.map((id) => nameFor(equipment, id)).join(', ')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to perform it</Text>
        <Text>{exercise.instructions}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  meta: {
    opacity: 0.6,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
});
