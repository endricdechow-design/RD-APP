import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { bpr, freigabenImKontext, medikament, regelnFuerFreigabe } from '@/data/kompendium';
import type { Freigabe } from '@/data/typen';
import { useApp } from '@/state/AppState';
import { Abschnitt, Knopf, Seite } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { PatientLeiste } from '@/ui/PatientLeiste';
import { PdfSeiten } from '@/ui/PdfSeiten';
import { abstand, useFarben } from '@/ui/theme';

export default function BprSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = useFarben();
  const { merkeBesuch, patient } = useApp();
  const b = bpr.find((x) => x.id === id);
  const route = `/bpr/${id}`;
  useEffect(() => merkeBesuch(route), [route]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return <Seite><Text style={{ color: f.text }}>Behandlungspfad nicht gefunden.</Text></Seite>;

  const relevant = (fr: Freigabe) =>
    fr.zielgruppe === 'alle' || (patient.erwachsen ? fr.zielgruppe === 'erwachsene' : fr.zielgruppe === 'kinder');
  const liste = b.kontexte.flatMap(freigabenImKontext).filter(relevant);
  const seiten = Array.from({ length: (b.bisSeite ?? b.seite) - b.seite + 1 }, (_, i) => b.seite + i);

  return (
    <Seite>
      <Stack.Screen options={{ title: b.titel }} />
      <Text style={{ color: f.notfall, fontSize: 22, fontWeight: '800' }}>{b.titel}</Text>

      {b.id === 'sepsis' ? (
        <View style={{ marginTop: abstand.l }}><Knopf titel="NEWS2 / qSOFA berechnen" icon="calculator" onPress={() => router.push('/scores')} /></View>
      ) : null}
      {b.kategorie === 'kreislaufstillstand' ? (
        <View style={{ marginTop: abstand.l }}><Knopf titel="Als Fallbeispiel üben" art="umriss" icon="people" onPress={() => router.push('/praxis')} /></View>
      ) : null}

      {liste.length ? (
        <Abschnitt titel="Medikamente in diesem Behandlungspfad">
          <PatientLeiste />
          {liste.map((fr) => (
            <View key={fr.tabelle} style={{ gap: 4 }}>
              <FreigabeKarte freigabe={fr} regeln={regelnFuerFreigabe(fr)} zeigeKontext={false} />
              {medikament(fr.thema) ? (
                <Knopf titel={`SAA ${medikament(fr.thema)!.name}`} art="umriss" onPress={() => router.push(`/medikament/${fr.thema}`)} style={{ minHeight: 44 }} />
              ) : null}
            </View>
          ))}
        </Abschnitt>
      ) : null}

      <PdfSeiten seiten={seiten} />
    </Seite>
  );
}
