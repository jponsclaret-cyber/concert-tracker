import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { isOnboardingComplete } from '@/lib/settingsStorage';
import { getUserEquipmentIds } from '@/db/queries/equipment';
import { useEquipmentStore } from '@/store/useEquipmentStore';

function TabIcon({ ios, android, color }: { ios: string; android: string; color: ColorValue }) {
  return (
    <SymbolView
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={{ ios, android, web: android } as any}
      tintColor={color}
      size={26}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean | null>(null);
  const setAvailableEquipmentIds = useEquipmentStore((s) => s.setAvailableEquipmentIds);

  useEffect(() => {
    isOnboardingComplete().then(async (complete) => {
      if (complete) {
        const ids = await getUserEquipmentIds();
        setAvailableEquipmentIds(ids);
      }
      setOnboardingCompleteState(complete);
    });
  }, [setAvailableEquipmentIds]);

  if (onboardingComplete === null) return null;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon ios="house.fill" android="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ color }) => <TabIcon ios="figure.strengthtraining.traditional" android="fitness_center" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabIcon ios="books.vertical.fill" android="menu_book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabIcon ios="clock.fill" android="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon ios="gearshape.fill" android="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
