import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { listWorkoutSessions } from '@/db/queries/workouts';
import { listExternalActivities } from '@/db/queries/externalActivities';

interface SessionRow {
  id: string;
  startedAt: string;
  completedAt: string | null;
  sourceType: 'generated' | 'manual' | 'imported';
}

interface ExternalActivityRow {
  id: string;
  activityType: string;
  startDate: string;
  durationMin: number;
}

type TimelineEntry =
  | { kind: 'session'; date: string; data: SessionRow }
  | { kind: 'external'; date: string; data: ExternalActivityRow };

function formatActivityType(activityType: string): string {
  return activityType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [externalActivities, setExternalActivities] = useState<ExternalActivityRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      listWorkoutSessions().then(setSessions);
      listExternalActivities().then(setExternalActivities);
    }, [])
  );

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...sessions.map((s): TimelineEntry => ({ kind: 'session', date: s.startedAt, data: s })),
      ...externalActivities.map((a): TimelineEntry => ({ kind: 'external', date: a.startDate, data: a })),
    ];
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions, externalActivities]);

  if (timeline.length === 0) {
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
        data={timeline}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {new Date(item.date).toLocaleDateString()}{' '}
              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.kind === 'session' ? (
              <Text style={styles.rowSubtitle}>
                {item.data.sourceType === 'manual'
                  ? 'Manual workout'
                  : item.data.sourceType === 'generated'
                    ? 'Generated workout'
                    : 'Imported activity'}
                {item.data.completedAt ? '' : ' · in progress'}
              </Text>
            ) : (
              <Text style={styles.rowSubtitle}>
                {formatActivityType(item.data.activityType)} · {Math.round(item.data.durationMin)} min ·
                synced from health app
              </Text>
            )}
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
