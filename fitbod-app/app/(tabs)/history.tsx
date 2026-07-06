import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { listWorkoutSessions } from '@/db/queries/workouts';

interface SessionRow {
  id: string;
  startedAt: string;
  completedAt: string | null;
  sourceType: 'generated' | 'manual' | 'imported';
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      listWorkoutSessions().then(setSessions);
    }, [])
  );

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.empty}>No workouts logged yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        style={styles.list}
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {new Date(item.startedAt).toLocaleDateString()}{' '}
              {new Date(item.startedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.rowSubtitle}>
              {item.sourceType === 'manual'
                ? 'Manual workout'
                : item.sourceType === 'generated'
                  ? 'Generated workout'
                  : 'Imported activity'}
              {item.completedAt ? '' : ' · in progress'}
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  empty: {
    opacity: 0.6,
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
});
