import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppStateProvider, useApp } from '@/state/AppState';
import { Haftungshinweis } from '@/ui/Haftungshinweis';
import { useFarben } from '@/ui/theme';

function Navigation() {
  const { geladen, eingerichtet, einstellungen, hinweisBestaetigt } = useApp();
  const f = useFarben();
  const segmente = useSegments();
  const zumOnboarding = geladen && !eingerichtet && segmente[0] !== 'onboarding';

  useEffect(() => {
    if (zumOnboarding) router.replace('/onboarding');
  }, [zumOnboarding]);

  if (!geladen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: f.hintergrund }}>
        <ActivityIndicator color={f.akzent} />
      </View>
    );
  }

  const dunkel = f.hintergrund === '#0B0F14';
  return (
    <>
      <StatusBar style={dunkel ? 'light' : 'dark'} />
      <Stack
        key={einstellungen.darstellung}
        screenOptions={{
          headerStyle: { backgroundColor: f.flaeche },
          headerTintColor: f.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: f.hintergrund },
          headerBackTitle: 'Zurück',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="liste/[kategorie]" options={{ title: '' }} />
        <Stack.Screen name="praxis/[fall]" options={{ title: 'Beobachten', gestureEnabled: false }} />
        <Stack.Screen name="medikament/[id]" options={{ title: 'Medikament' }} />
        <Stack.Screen name="massnahme/[id]" options={{ title: 'Maßnahme' }} />
        <Stack.Screen name="bpr/[id]" options={{ title: 'Behandlungspfad' }} />
        <Stack.Screen name="scores" options={{ title: 'Scores' }} />
        <Stack.Screen name="quiz" options={{ title: 'Lernen', gestureEnabled: false }} />
        <Stack.Screen name="abo" options={{ title: 'Nodexo Pro', presentation: 'modal' }} />
        <Stack.Screen name="profil" options={{ title: 'Profil' }} />
        <Stack.Screen name="vergleich/[thema]" options={{ title: 'Bereichsvergleich' }} />
      </Stack>
      {/* Haftungshinweis bei jedem App-Start über allem anderen */}
      {!hinweisBestaetigt ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
          <Haftungshinweis />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <Navigation />
    </AppStateProvider>
  );
}
