import { View } from 'react-native';

import { freigabenFuer, massnahmen } from '@/data/kompendium';
import { besteBewertung } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Abschnitt, FreigabeBadge, Seite, Zeile } from '@/ui/bausteine';
import { abstand } from '@/ui/theme';

const GRUPPEN: { titel: string; seiten: number[] }[] = [
  { titel: 'Zugang & Applikation', seiten: [28, 29, 44, 45] },
  { titel: 'Atemweg', seiten: [30, 31, 32, 33, 34, 35, 43] },
  { titel: 'Blutung & Trauma', seiten: [36, 37, 38, 39] },
  { titel: 'Elektrotherapie', seiten: [40, 41, 42] },
];

export default function Massnahmen() {
  const { profil } = useApp();
  return (
    <Seite>
      <Zeile titel="Standardvorgehen invasive Maßnahmen" untertitel="S. 27" icon="git-network" route="/bpr/standard-invasiv" />
      {GRUPPEN.map((g) => (
        <Abschnitt key={g.titel} titel={g.titel}>
          <View>
            {massnahmen
              .filter((m) => g.seiten.includes(m.seite))
              .map((m) => {
                const b = profil.bereich ? besteBewertung(freigabenFuer(m.id), profil.bereich, profil.qualifikation) : null;
                return (
                  <Zeile
                    key={m.id}
                    titel={m.name}
                    untertitel={`S. ${m.seite}`}
                    route={`/massnahme/${m.id}`}
                    rechts={<View style={{ marginRight: abstand.s }}><FreigabeBadge b={b} /></View>}
                  />
                );
              })}
          </View>
        </Abschnitt>
      ))}
    </Seite>
  );
}
