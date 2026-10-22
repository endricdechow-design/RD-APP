import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FAELLE } from '@/logic/praxis';
import { Abschnitt, Karte, Kasten, Seite, T } from '@/ui/bausteine';
import { abstand, useFarben } from '@/ui/theme';

export default function Praxis() {
  const f = useFarben();
  return (
    <Seite>
      <Kasten titel="So funktioniert's" farbe="blau">
        <Text style={{ color: '#111', fontSize: 15.5, lineHeight: 22 }}>
          Ein Team übt die Reanimation am Phantom. Du beobachtest und tippst mit, was das Team macht: Analyse, Schock,
          Medikamente mit Dosis, Atemweg, Zugang, 4 Hs und HITS. Am Ende zeigt Nodexo die Auswertung gegen den
          Behandlungspfad – als Grundlage für die Nachbesprechung.
        </Text>
      </Kasten>

      <Abschnitt titel="Fallbeispiele Reanimation">
        {FAELLE.map((fall) => (
          <Karte key={fall.id} onPress={() => router.push(`/praxis/${fall.id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m }}>
              <Ionicons name={fall.modus === 'kind' ? 'happy' : 'person'} size={26} color={fall.rhythmus === 'schockbar' ? f.notfall : f.akzent} />
              <View style={{ flex: 1 }}>
                <T art="untertitel">{fall.titel}</T>
                <T art="klein" leise zeilen={2}>{fall.lage}</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={f.textLeise} />
            </View>
          </Karte>
        ))}
      </Abschnitt>

      <Abschnitt titel="Freie Beobachtung">
        <Karte onPress={() => router.push('/praxis/frei-erwachsen')}>
          <T art="untertitel">Erwachsene · eigenes Szenario</T>
        </Karte>
        <Karte onPress={() => router.push('/praxis/frei-kind')}>
          <T art="untertitel">Kind · eigenes Szenario</T>
        </Karte>
      </Abschnitt>
    </Seite>
  );
}
