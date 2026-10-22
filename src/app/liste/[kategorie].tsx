import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { freigabenFuer } from '@/data/kompendium';
import { besteBewertung } from '@/logic/freigabe';
import { eintraege, KATEGORIEN, type KategorieId } from '@/logic/kategorien';
import { useApp } from '@/state/AppState';
import { Chip, FreigabeBadge, Seite, T, Zeile } from '@/ui/bausteine';
import { abstand } from '@/ui/theme';

export default function Liste() {
  const { kategorie } = useLocalSearchParams<{ kategorie: KategorieId }>();
  const { profil } = useApp();
  const k = KATEGORIEN.find((x) => x.id === kategorie);
  const [nurErlaubt, setNurErlaubt] = useState(false);
  const mitAmpel = kategorie === 'medikamente' || kategorie === 'massnahmen';

  const liste = useMemo(
    () =>
      eintraege(kategorie).map((e) => ({
        ...e,
        bewertung: mitAmpel && profil.bereich ? besteBewertung(freigabenFuer(e.id), profil.bereich, profil.qualifikation) : null,
      })),
    [kategorie, mitAmpel, profil],
  );
  const sichtbar = nurErlaubt ? liste.filter((e) => e.bewertung?.art === 'erlaubt') : liste;

  if (!k) return <Seite><T>Nicht gefunden.</T></Seite>;
  return (
    <Seite>
      <Stack.Screen options={{ title: k.titel }} />
      {mitAmpel && profil.bereich ? (
        <View style={{ flexDirection: 'row', gap: abstand.s, marginBottom: abstand.s }}>
          <Chip titel="Alle" aktiv={!nurErlaubt} onPress={() => setNurErlaubt(false)} />
          <Chip titel="Was ich darf" icon="checkmark-circle" aktiv={nurErlaubt} onPress={() => setNurErlaubt(true)} />
        </View>
      ) : null}
      {sichtbar.map((e) => (
        <Zeile
          key={e.id}
          titel={e.titel}
          untertitel={e.hinweis}
          route={e.route}
          rechts={e.bewertung ? <View style={{ marginRight: abstand.s }}><FreigabeBadge b={e.bewertung} /></View> : undefined}
        />
      ))}
      {sichtbar.length === 0 ? <T leise>Keine Einträge.</T> : null}
    </Seite>
  );
}
