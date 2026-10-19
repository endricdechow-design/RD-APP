// Eine Freigabetabelle aus dem Kompendium, bewertet für Profil und Bereich.
import { router } from 'expo-router';
import { View } from 'react-native';

import { bereiche } from '../data/kompendium';
import type { Dosisregel, Freigabe } from '../data/typen';
import { bereicheMitFreigabe, bewerte } from '../logic/freigabe';
import { useApp } from '../state/AppState';
import { FreigabeBadge, Karte, Knopf, T } from './bausteine';
import { DosisKarte } from './DosisKarte';
import { abstand, useFarben } from './theme';

const ZIEL = { erwachsene: 'Erwachsene', kinder: 'Kinder', alle: null } as const;

export function FreigabeKarte({ freigabe, regeln = [], zeigeKontext = true }: { freigabe: Freigabe; regeln?: Dosisregel[]; zeigeKontext?: boolean }) {
  const f = useFarben();
  const { profil } = useApp();
  const b = profil.bereich ? bewerte(freigabe, profil.bereich, profil.qualifikation) : null;
  const anzahl = bereicheMitFreigabe(freigabe, profil.qualifikation, bereiche.map((x) => x.code)).length;
  const original = b?.zelle?.original;
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
      {freigabe.dosis.length ? (
        <View style={{ gap: 2 }}>
          {freigabe.dosis.map((z, i) => <T key={i}>{z}</T>)}
        </View>
      ) : null}
      {regeln.map((r) => <DosisKarte key={r.id} regel={r} />)}
      {b ? (
        <View style={{ gap: 4 }}>
          <T art="klein" farbe={b.art === 'erlaubt' ? f.text : f.textLeise}>{b.hinweis}</T>
          {b.fussnoten.map((n) => <T key={n} art="klein" farbe={f.gelb}>{n}</T>)}
          {original?.includes('+') ? (
            <T art="klein" leise>{`Im Kompendium: „${original}“`}</T>
          ) : null}
        </View>
      ) : (
        <T art="klein" leise>{`Für deine Qualifikation in ${anzahl} von ${bereiche.length} Bereichen freigegeben.`}</T>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T art="klein" leise>{`S. ${freigabe.seite}`}</T>
        <Knopf titel="Alle Bereiche" art="umriss" icon="map" onPress={() => router.push(`/vergleich/${freigabe.tabelle}`)} style={{ minHeight: 40, paddingHorizontal: 10 }} />
      </View>
    </Karte>
  );
}
