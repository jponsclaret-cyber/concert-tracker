import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAllMuscleGroups } from '@/db/queries/exercises';
import { getMuscleRecoveryPctById } from '@/db/queries/recovery';

interface MuscleGroupRow {
  id: string;
  name: string;
}

function recoveryColor(pct: number): string {
  if (pct >= 70) return '#3ec46d';
  if (pct >= 40) return '#e8b93a';
  return '#e05b4f';
}

export default function HomeScreen() {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupRow[]>([]);
  const [recoveryPctById, setRecoveryPctById] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      getAllMuscleGroups().then(setMuscleGroups);
      getMuscleRecoveryPctById().then(setRecoveryPctById);
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Muscle recovery</Text>
      <View style={styles.list}>
        {muscleGroups.map((m) => {
          const pct = Math.round(recoveryPctById[m.id] ?? 100);
          return (
            <View key={m.id} style={styles.row}>
              <Text style={styles.rowLabel}>{m.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: recoveryColor(pct) },
                  ]}
                />
              </View>
              <Text style={styles.rowPct}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    width: 90,
    fontSize: 13,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(128,128,128,0.25)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  rowPct: {
    width: 36,
    textAlign: 'right',
    fontSize: 12,
    opacity: 0.7,
  },
});
