import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { getAllEquipment } from '@/db/queries/exercises';
import { getUserEquipmentIds, setUserEquipmentIds } from '@/db/queries/equipment';
import { setOnboardingComplete } from '@/lib/settingsStorage';
import { useEquipmentStore } from '@/store/useEquipmentStore';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
}

export default function OnboardingEquipmentScreen() {
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const setAvailableEquipmentIds = useEquipmentStore((s) => s.setAvailableEquipmentIds);

  useEffect(() => {
    Promise.all([getAllEquipment(), getUserEquipmentIds()]).then(([equipment, selected]) => {
      setAllEquipment(equipment);
      setSelectedIds(new Set(selected));
    });
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    const ids = Array.from(selectedIds);
    await setUserEquipmentIds(ids);
    setAvailableEquipmentIds(ids);
    await setOnboardingComplete();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your equipment</Text>
      <Text style={styles.subtitle}>Select everything you have access to.</Text>
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
      <Pressable style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue ({selectedIds.size} selected)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2f95dc',
  },
  checkboxSelected: {
    backgroundColor: '#2f95dc',
  },
  button: {
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
