import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';
import { seedIfEmpty } from './seed';

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrated) return;
    seedIfEmpty(db)
      .then(() => setSeeded(true))
      .catch((err) => setSeedError(err instanceof Error ? err : new Error(String(err))));
  }, [migrated]);

  const error = migrationError ?? seedError;
  if (error) {
    return (
      <View style={styles.center}>
        <Text>Database setup failed: {error.message}</Text>
      </View>
    );
  }

  if (!migrated || !seeded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
