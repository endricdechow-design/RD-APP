import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { bereiche } from '@/data/kompendium';
import type { BereichCode, Qualifikation } from '@/data/typen';
import { QUALI_NAME } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { Chip, Hinweis, Karte, Knopf, Seite, T } from '@/ui/bausteine';
import { abstand } from '@/ui/theme';

const QUALIS: { id: Qualifikation; text: string }[] = [
  { id: 'RS', text: 'Heilkundliche Maßnahmen nur im rechtfertigenden Notstand (§ 34 StGB).' },
  { id: 'NotSan', text: 'Maßnahmen nach SAA/BPR, vorabdelegierte Maßnahmen (★) nach § 4 Abs. 2 Nr. 2c NotSanG.' },
  { id: 'NotSanAzubi', text: 'Inhalte wie NotSan – Durchführung nur unter Aufsicht der Praxisanleitung.' },
];

export default function Onboarding() {
  const { richteEin, profil } = useApp();
  const [quali, setQuali] = useState<Qualifikation>(profil.qualifikation);
  const [bereich, setBereich] = useState<BereichCode | null>(profil.bereich);

  return (
    <Seite>
      <View style={{ gap: abstand.s, marginTop: abstand.xl }}>
        <T art="riesig">Nodexo</T>
        <T art="untertitel" leise>der smarte Rettungsdienst</T>
        <T leise>Alle Inhalte stammen aus dem Gemeinsamen Kompendium Rettungsdienst 2026.</T>
      </View>

      <T art="titel" style={{ marginTop: abstand.xxl, marginBottom: abstand.s }}>1 · Deine Qualifikation</T>
      <View style={{ gap: abstand.s }}>
        {QUALIS.map((q) => (
          <Karte key={q.id} onPress={() => setQuali(q.id)} style={quali === q.id ? { borderWidth: 2, borderColor: '#3DA9FC' } : undefined}>
            <T art="untertitel">{QUALI_NAME[q.id]}</T>
            <T art="klein" leise>{q.text}</T>
          </Karte>
        ))}
      </View>

      <T art="titel" style={{ marginTop: abstand.xxl, marginBottom: abstand.s }}>2 · Dein Rettungsdienstbereich</T>
      <T art="klein" leise style={{ marginBottom: abstand.s }}>
        Die Kreise und Städte legen selbst fest, was jede Qualifikation darf (S. 6). Ohne Bereich zeigt Nodexo die Freigaben aller Bereiche.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
        <Chip titel="Noch keiner / nur lernen" aktiv={bereich === null} onPress={() => setBereich(null)} />
        {bereiche.map((b) => (
          <Chip key={b.code} titel={b.name} aktiv={bereich === b.code} onPress={() => setBereich(b.code)} />
        ))}
      </View>

      <View style={{ marginTop: abstand.xxl, gap: abstand.m }}>
        <Hinweis art="warnung">
          Nodexo ersetzt weder Ausbildung noch Kompendium und trifft keine Therapieentscheidung. Maßgeblich sind das Kompendium und die Vorgaben deiner ÄLRD.
        </Hinweis>
        <Knopf
          titel="Los geht's"
          icon="arrow-forward"
          gross
          onPress={() => {
            richteEin({ qualifikation: quali, bereich });
            router.replace('/');
          }}
        />
      </View>
    </Seite>
  );
}
