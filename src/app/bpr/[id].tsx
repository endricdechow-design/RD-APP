import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { bpr, dosisregeln, freigabenImKontext, medikament } from '@/data/kompendium';
import type { Freigabe } from '@/data/typen';
import { useApp } from '@/state/AppState';
import { Abschnitt, Hinweis, Knopf, Quelle, Seite, T } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { PatientLeiste } from '@/ui/PatientLeiste';
import { abstand } from '@/ui/theme';

export default function BprSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { merkeBesuch, patient } = useApp();
  const b = bpr.find((x) => x.id === id);
  const route = `/bpr/${id}`;
  useEffect(() => merkeBesuch(route), [route]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b) return <Seite><T>Behandlungspfad nicht gefunden.</T></Seite>;

  const relevant = (fr: Freigabe) =>
    fr.zielgruppe === 'alle' || (patient.erwachsen ? fr.zielgruppe === 'erwachsene' : fr.zielgruppe === 'kinder');
  const liste = b.kontexte.flatMap(freigabenImKontext).filter(relevant);
  const regelnFuer = (fr: Freigabe) =>
    dosisregeln.filter((r) => r.medikament === fr.thema && r.kontext === fr.kontext && (fr.zielgruppe === 'alle' || r.zielgruppe === fr.zielgruppe || r.zielgruppe === 'alle'));
  const seiten = b.bisSeite ? `S. ${b.seite}–${b.bisSeite}` : `S. ${b.seite}`;

  return (
    <Seite>
      <Stack.Screen options={{ title: b.titel }} />
      <T art="gross">{b.titel}</T>
      <T leise>{seiten}</T>

      {b.kategorie === 'kreislaufstillstand' && b.id.startsWith('rea') ? (
        <View style={{ marginTop: abstand.l }}>
          <Knopf titel="REA-Cockpit starten" art="notfall" icon="heart" gross onPress={() => router.push(`/rea?modus=${b.id === 'rea-kinder' ? 'kind' : 'erwachsen'}`)} />
        </View>
      ) : null}
      {b.id === 'sepsis' ? (
        <View style={{ marginTop: abstand.l }}><Knopf titel="NEWS2 / qSOFA berechnen" icon="calculator" onPress={() => router.push('/scores')} /></View>
      ) : null}

      <View style={{ marginTop: abstand.l }}>
        <Hinweis>
          {`Das Flussdiagramm dieses Behandlungspfads ist noch nicht interaktiv umgesetzt – bitte im Kompendium ${seiten} nachlesen. Unten stehen alle Medikamente und Maßnahmen, die das Kompendium in diesem Pfad freigibt.`}
        </Hinweis>
      </View>

      {liste.length ? (
        <>
          <View style={{ marginTop: abstand.l }}><PatientLeiste /></View>
          <Abschnitt titel="Medikamente & Freigaben in diesem Pfad">
            {liste.map((fr) => (
              <View key={fr.tabelle} style={{ gap: 4 }}>
                <FreigabeKarte freigabe={fr} regeln={regelnFuer(fr)} zeigeKontext={false} />
                {medikament(fr.thema) ? (
                  <Knopf titel={`SAA ${medikament(fr.thema)!.name} öffnen`} art="umriss" onPress={() => router.push(`/medikament/${fr.thema}`)} style={{ minHeight: 44 }} />
                ) : null}
              </View>
            ))}
          </Abschnitt>
        </>
      ) : null}
      <Quelle seite={b.seite} text={b.titel} />
    </Seite>
  );
}
