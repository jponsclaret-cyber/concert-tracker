import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function TrainScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Train</Text>
      <Text>Workout generation and active session logging will show here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
