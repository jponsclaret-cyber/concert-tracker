import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { createWorkoutSession } from '@/db/queries/workouts';

export default function TrainScreen() {
  const handleStartManualWorkout = async () => {
    const sessionId = await createWorkoutSession('manual');
    router.push(`/workout/${sessionId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Train</Text>
      <Text style={styles.subtitle}>
        Automatic workout generation is coming soon. For now, start a manual session and log your
        sets as you go.
      </Text>
      <Pressable style={styles.button} onPress={handleStartManualWorkout}>
        <Text style={styles.buttonText}>Start manual workout</Text>
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
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
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
});
