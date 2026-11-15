import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AppStateProvider, useApp } from '@/state/AppState';
import { ZUGANGS_HASH } from '@/logic/zugang';
import { Haftungshinweis } from '@/ui/Haftungshinweis';
import { Zugangssperre } from '@/ui/Zugangssperre';
import { useFarben } from '@/ui/theme';

const ZUGANG_SCHLUESSEL = 'nodexo:zugang';

/** Web-Version: Freischaltung per Code, auf dem Gerät gemerkt. Ein neuer Code macht alte Freischaltungen ungültig. */
function useZugang(): [boolean | null, () => void] {
  const nurWeb = Platform.OS === 'web';
  const [frei, setFrei] = useState<boolean | null>(nurWeb ? null : true);
  useEffect(() => {
    if (!nurWeb) return;
    AsyncStorage.getItem(ZUGANG_SCHLUESSEL)
      .then((wert) => setFrei(wert === ZUGANGS_HASH))
      .catch(() => setFrei(false));
  }, [nurWeb]);
  const freischalten = () => {
    AsyncStorage.setItem(ZUGANG_SCHLUESSEL, ZUGANGS_HASH).catch(() => {});
    setFrei(true);
  };
  return [frei, freischalten];
}

function Navigation() {
  const { geladen, eingerichtet, einstellungen, hinweisBestaetigt } = useApp();
  const f = useFarben();
  const segmente = useSegments();
  const [zugang, freischalten] = useZugang();
  const zumOnboarding = geladen && !eingerichtet && segmente[0] !== 'onboarding';

  useEffect(() => {
    if (zumOnboarding) router.replace('/onboarding');
  }, [zumOnboarding]);

  if (!geladen || zugang === null) {
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
      {/* Zugangscode (nur Web), danach Haftungshinweis bei jedem App-Start – beide über allem anderen */}
      {!zugang ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
          <Zugangssperre freigeschaltet={freischalten} />
        </View>
      ) : null}
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
