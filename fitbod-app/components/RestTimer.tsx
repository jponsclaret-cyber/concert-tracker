import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

const DEFAULT_REST_SECONDS = 90;

export function RestTimer({ resetKey }: { resetKey: number }) {
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_REST_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(DEFAULT_REST_SECONDS);
    setRunning(resetKey > 0);
  }, [resetKey]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running, secondsLeft]);

  if (resetKey === 0) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rest</Text>
      <Text style={styles.time}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>
      <Pressable onPress={() => setSecondsLeft((s) => Math.max(0, s - 15))}>
        <Text style={styles.skip}>-15s</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  time: {
    fontSize: 20,
    fontWeight: '600',
  },
  skip: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
