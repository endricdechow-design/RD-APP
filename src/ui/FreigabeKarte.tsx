// Eine Freigabetabelle aus dem Kompendium, bewertet für Profil und Bereich.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { bereiche } from '../data/kompendium';
import type { Dosisregel, Freigabe } from '../data/typen';
import { bereicheMitFreigabe, bewerte } from '../logic/freigabe';
import { useApp } from '../state/AppState';
import { FreigabeBadge, Karte, T } from './bausteine';
import { DosisKarte } from './DosisKarte';
import { abstand, useFarben } from './theme';

const ZIEL = { erwachsene: 'Erwachsene', kinder: 'Kinder', alle: null } as const;

export function FreigabeKarte({ freigabe, regeln = [], zeigeKontext = true }: { freigabe: Freigabe; regeln?: Dosisregel[]; zeigeKontext?: boolean }) {
  const f = useFarben();
  const { profil } = useApp();
  const b = profil.bereich ? bewerte(freigabe, profil.bereich, profil.qualifikation) : null;
  const anzahl = bereicheMitFreigabe(freigabe, profil.qualifikation, bereiche.map((x) => x.code)).length;
  const kopf = [zeigeKontext ? freigabe.kontext : null, ZIEL[freigabe.zielgruppe]].filter(Boolean).join(' · ');

  return (
    <Karte>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: abstand.s }}>
        <View style={{ flex: 1 }}>
          {kopf ? <T art="klein" leise style={{ fontWeight: '700' }}>{kopf.toUpperCase()}</T> : null}
          <T art="untertitel">{freigabe.titel}</T>
        </View>
        <FreigabeBadge b={b} gross />
      </View>
      {freigabe.typ === 'medikament' && freigabe.dosis.length ? (
        <View style={{ gap: 2 }}>
          {freigabe.dosis.map((z, i) => <T key={i}>{z}</T>)}
        </View>
      ) : null}
      {regeln.map((r) => <DosisKarte key={r.id} regel={r} />)}
      {b ? (
        <View style={{ gap: 4 }}>
          {b.art !== 'erlaubt' || profil.qualifikation === 'RS' ? <T art="klein" leise>{b.hinweis}</T> : null}
          {b.fussnoten.map((n) => <T key={n} art="klein" farbe={f.gelb}>{n}</T>)}
          {b.zelle?.original?.includes('+') ? <T art="klein" leise>{`Im Kompendium: „${b.zelle.original}“`}</T> : null}
        </View>
      ) : (
        <T art="klein" leise>{`Für deine Qualifikation in ${anzahl} von ${bereiche.length} Bereichen freigegeben.`}</T>
      )}
      <Pressable onPress={() => router.push(`/vergleich/${freigabe.tabelle}`)} accessibilityRole="link" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        <T art="klein" farbe={f.akzent} style={{ fontWeight: '700' }}>Alle Bereiche vergleichen ›</T>
      </Pressable>
    </Karte>
  );
}
