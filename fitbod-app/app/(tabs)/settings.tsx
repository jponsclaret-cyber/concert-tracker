import { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAllEquipment } from '@/db/queries/exercises';
import { getUserEquipmentIds, setUserEquipmentIds } from '@/db/queries/equipment';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { useHealthSyncStore } from '@/store/useHealthSyncStore';
import { isHealthPlatformSupported, requestHealthPermissions, syncExternalHealthActivities } from '@/services/health';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
}

export default function SettingsScreen() {
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const setAvailableEquipmentIds = useEquipmentStore((s) => s.setAvailableEquipmentIds);
  const isHealthConnected = useHealthSyncStore((s) => s.isConnected);
  const lastSyncedAt = useHealthSyncStore((s) => s.lastSyncedAt);
  const setHealthConnected = useHealthSyncStore((s) => s.setConnected);
  const setLastSyncedAt = useHealthSyncStore((s) => s.setLastSyncedAt);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([getAllEquipment(), getUserEquipmentIds()]).then(([equipment, selected]) => {
      setAllEquipment(equipment);
      setSelectedIds(new Set(selected));
    });
  }, []);

  const toggle = async (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    const ids = Array.from(next);
    await setUserEquipmentIds(ids);
    setAvailableEquipmentIds(ids);
  };

  const handleConnectHealth = async () => {
    const granted = await requestHealthPermissions();
    setHealthConnected(granted);
    if (granted) await handleSyncNow();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncExternalHealthActivities();
      setLastSyncedAt(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>My equipment</Text>
      <FlatList
        style={styles.list}
        data={allEquipment}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item.id)}>
              <Text style={styles.rowText}>{item.name}</Text>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
            </Pressable>
          );
        }}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health sync</Text>
        {!isHealthPlatformSupported() ? (
          <Text style={styles.placeholder}>Not available on this platform.</Text>
        ) : !isHealthConnected ? (
          <Pressable style={styles.healthButton} onPress={handleConnectHealth}>
            <Text style={styles.healthButtonText}>
              Connect {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
            </Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.placeholder}>
              Connected · last synced{' '}
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'}
            </Text>
            <Pressable style={styles.healthButton} onPress={handleSyncNow} disabled={syncing}>
              <Text style={styles.healthButtonText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
            </Pressable>
          </>
        )}
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2f95dc',
  },
  checkboxSelected: {
    backgroundColor: '#2f95dc',
  },
  section: {
    gap: 4,
    paddingVertical: 8,
  },
  placeholder: {
    opacity: 0.6,
  },
  healthButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  healthButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
