import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import type { IconName } from '@/ui/bausteine';
import { useFarben } from '@/ui/theme';

const TABS: { name: string; titel: string; icon: IconName }[] = [
  { name: 'index', titel: 'Einsatz', icon: 'pulse' },
  { name: 'medikamente', titel: 'Medikamente', icon: 'medkit' },
  { name: 'massnahmen', titel: 'Maßnahmen', icon: 'bandage' },
  { name: 'lernen', titel: 'Lernen', icon: 'school' },
  { name: 'mehr', titel: 'Mehr', icon: 'grid' },
];

export default function TabLayout() {
  const f = useFarben();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: f.flaeche },
        headerTintColor: f.text,
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: f.flaeche, borderTopColor: f.rand, height: 68, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: f.akzent,
        tabBarInactiveTintColor: f.textLeise,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        sceneStyle: { backgroundColor: f.hintergrund },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.name === 'index' ? 'Nodexo' : t.titel,
            tabBarLabel: t.titel,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color as string} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
