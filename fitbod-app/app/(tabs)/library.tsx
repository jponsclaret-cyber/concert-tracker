import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAllExercisesWithDetails, getAllMuscleGroups, type ExerciseDetail } from '@/db/queries/exercises';

interface MuscleGroupOption {
  id: string;
  name: string;
}

export default function LibraryScreen() {
  const [exercises, setExercises] = useState<ExerciseDetail[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupOption[]>([]);
  const [query, setQuery] = useState('');
  const [activeMuscleId, setActiveMuscleId] = useState<string | null>(null);

  useEffect(() => {
    getAllExercisesWithDetails().then(setExercises);
    getAllMuscleGroups().then(setMuscleGroups);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q);
      const matchesMuscle =
        !activeMuscleId ||
        e.primaryMuscleIds.includes(activeMuscleId) ||
        e.secondaryMuscleIds.includes(activeMuscleId);
      return matchesQuery && matchesMuscle;
    });
  }, [exercises, query, activeMuscleId]);

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises"
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        <Pressable
          style={[styles.chip, activeMuscleId === null && styles.chipActive]}
          onPress={() => setActiveMuscleId(null)}>
          <Text style={[styles.chipText, activeMuscleId === null && styles.chipTextActive]}>
            All
          </Text>
        </Pressable>
        {muscleGroups.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.chip, activeMuscleId === m.id && styles.chipActive]}
            onPress={() => setActiveMuscleId(activeMuscleId === m.id ? null : m.id)}>
            <Text style={[styles.chipText, activeMuscleId === m.id && styles.chipTextActive]}>
              {m.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/exercise/${item.id}`)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>
              {[...item.primaryMuscleIds, ...item.secondaryMuscleIds]
                .map((id) => muscleGroups.find((m) => m.id === id)?.name ?? id)
                .join(', ')}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No exercises match your filters.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipRow: {
    flexGrow: 0,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  chipText: {
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 24,
  },
});
