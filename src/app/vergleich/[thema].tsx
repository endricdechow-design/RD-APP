// Alle 28 Bereiche für eine Freigabetabelle – z. B. beim Wechsel des Arbeitgebers.
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { bereiche, freigaben } from '@/data/kompendium';
import { bewerte, LEVEL_NAME, passendeFussnoten } from '@/logic/freigabe';
import { useApp } from '@/state/AppState';
import { artFarbe, FreigabeBadge, Seite, T } from '@/ui/bausteine';
import { abstand, useFarben } from '@/ui/theme';

export default function Vergleich() {
  const { thema } = useLocalSearchParams<{ thema: string }>();
  const { profil } = useApp();
  const f = useFarben();
  const fr = freigaben.find((x) => x.tabelle === thema);
  if (!fr) return <Seite><T>Nicht gefunden.</T></Seite>;

  return (
    <Seite>
      <Stack.Screen options={{ title: fr.titel }} />
      <T art="titel">{fr.titel}</T>
      <T leise>{`${fr.kontext ?? ''} · S. ${fr.seite}`}</T>
      <View style={{ marginTop: abstand.l }}>
        {bereiche.map((b) => {
          const z = fr.zellen[b.code];
          const bew = bewerte(fr, b.code, profil.qualifikation);
          const eigener = b.code === profil.bereich;
          return (
            <View key={b.code} style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: f.rand, backgroundColor: eigener ? f.flaecheHoch : undefined }}>
              <View style={{ width: 8, alignSelf: 'stretch', backgroundColor: artFarbe(bew.art, f), borderRadius: 4 }} />
              <View style={{ flex: 1 }}>
                <T art="untertitel">{`${b.name}${eigener ? '  (dein Bereich)' : ''}`}</T>
                <T art="klein" leise>
                  {z ? `${z.level ? LEVEL_NAME[z.level] : 'ohne Angabe'}${z.vorabdelegiert ? ' ★' : ''}` : 'nicht vorgesehen'}
                </T>
                {passendeFussnoten(fr, z ?? null, b.code).map((n) => <T key={n} art="klein" farbe={f.gelb}>{n}</T>)}
              </View>
              <FreigabeBadge b={bew} />
            </View>
          );
        })}
      </View>
      <T art="klein" leise style={{ marginTop: abstand.m }}>Ampel für deine Qualifikation. ★ = vorabdelegiert (2c) für NotSan.</T>
    </Seite>
  );
}
