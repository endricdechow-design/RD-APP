import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { alleMedikamentNamen, freigabenFuer } from '@/data/kompendium';
import { besteBewertung } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Chip, FreigabeBadge, Hinweis, Seite, T, Zeile } from '@/ui/bausteine';
import { abstand } from '@/ui/theme';

export default function Medikamente() {
  const { profil } = useApp();
  const [nurErlaubt, setNurErlaubt] = useState(false);

  const liste = useMemo(
    () =>
      alleMedikamentNamen().map((m) => ({
        ...m,
        bewertung: profil.bereich ? besteBewertung(freigabenFuer(m.id), profil.bereich, profil.qualifikation) : null,
      })),
    [profil],
  );
  const sichtbar = nurErlaubt ? liste.filter((m) => m.bewertung?.art === 'erlaubt') : liste;

  return (
    <Seite>
      <Zeile titel="Notfallkarte Opioidüberdosierung" untertitel="S. 48" icon="alert-circle" route="/bpr/notfallkarte-opioid" />
      <View style={{ flexDirection: 'row', gap: abstand.s, marginVertical: abstand.m, flexWrap: 'wrap' }}>
        <Chip titel="Alle" aktiv={!nurErlaubt} onPress={() => setNurErlaubt(false)} />
        <Chip titel="Was ich darf" icon="checkmark-circle" aktiv={nurErlaubt} onPress={() => setNurErlaubt(true)} />
      </View>
      {!profil.bereich ? (
        <Hinweis>Wähle im Profil deinen Bereich, dann zeigt Nodexo zu jedem Medikament, was du dort geben darfst.</Hinweis>
      ) : null}
      {sichtbar.map((m) => (
        <Zeile
          key={m.id}
          titel={m.name}
          untertitel={m.hatSAA ? undefined : 'ohne eigene SAA'}
          route={`/medikament/${m.id}`}
          rechts={<View style={{ marginRight: abstand.s }}><FreigabeBadge b={m.bewertung} /></View>}
        />
      ))}
      {sichtbar.length === 0 ? <T leise>Keine Freigaben für deine Qualifikation in diesem Bereich.</T> : null}
    </Seite>
  );
}
