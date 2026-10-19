import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { freigabenFuer, massnahme } from '@/data/kompendium';
import type { MassnahmeAbschnitt } from '@/data/typen';
import { useApp } from '@/state/AppState';
import { Abschnitt, Aufklapper, Chip, Hinweis, Karte, Punkte, Quelle, Seite, T } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { abstand, TOUCH, useFarben } from '@/ui/theme';

const ABSCHNITTE: { key: MassnahmeAbschnitt; titel: string }[] = [
  { key: 'indikationen', titel: 'Indikationen / Symptome' },
  { key: 'kontraindikationen', titel: 'Kontraindikationen' },
  { key: 'alternativen', titel: 'Alternativen' },
  { key: 'aufklaerung', titel: 'Aufklärung / Risiken' },
  { key: 'einwilligung', titel: 'Einwilligung' },
  { key: 'durchfuehrung', titel: 'Durchführung' },
  { key: 'erfolgspruefung', titel: 'Erfolgsprüfung' },
  { key: 'gegenmassnahmen', titel: 'Gegenmaßnahmen' },
  { key: 'verlaufskontrolle', titel: 'Verlaufskontrolle' },
];

/** Checkliste nach Standardvorgehen invasive Maßnahmen (S. 27): Schritte abhaken */
function Checkliste({ schritte }: { schritte: string[] }) {
  const f = useFarben();
  const [erledigt, setErledigt] = useState<Set<number>>(new Set());
  return (
    <View>
      {schritte.map((s, i) => {
        const ok = erledigt.has(i);
        return (
          <Pressable
            key={i}
            onPress={() => setErledigt((alt) => { const n = new Set(alt); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ok }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, minHeight: TOUCH, borderBottomWidth: 1, borderBottomColor: f.rand }}>
            <Ionicons name={ok ? 'checkbox' : 'square-outline'} size={26} color={ok ? f.gruen : f.textLeise} />
            <T style={{ flex: 1, textDecorationLine: ok ? 'line-through' : 'none' }} leise={ok}>{s}</T>
          </Pressable>
        );
      })}
      <T art="klein" leise style={{ marginTop: abstand.s }}>{`${erledigt.size} von ${schritte.length} erledigt`}</T>
    </View>
  );
}

export default function MassnahmeSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { merkeBesuch, favoriten, schalteFavorit } = useApp();
  const f = useFarben();
  const m = massnahme(id);
  const [modus, setModus] = useState<'lesen' | 'checkliste'>('lesen');
  const route = `/massnahme/${id}`;
  useEffect(() => merkeBesuch(route), [route]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <Seite><T>Maßnahme nicht gefunden.</T></Seite>;
  const fav = favoriten.includes(route);

  const pruefschritte = [
    'Indikation bestätigt',
    'Kontraindikationen ausgeschlossen',
    'Alternativen laut BPR geprüft',
    'Aufklärung erfolgt',
    'Einwilligung (geäußerter oder mutmaßlicher Wille)',
    ...(m.abschnitte.durchfuehrung ?? []).filter((p) => !p.bold).map((p) => p.text),
    'Erfolg geprüft',
    'Verlaufskontrolle',
    'Dokumentation',
  ];

  return (
    <Seite>
      <Stack.Screen
        options={{
          title: m.name,
          headerRight: () => (
            <Pressable onPress={() => schalteFavorit(route)} hitSlop={12} accessibilityLabel="Favorit">
              <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color={fav ? f.gelb : f.text} />
            </Pressable>
          ),
        }}
      />
      <T art="gross">{m.name}</T>
      <View style={{ flexDirection: 'row', gap: abstand.s, marginTop: abstand.m }}>
        <Chip titel="Lesen" icon="book" aktiv={modus === 'lesen'} onPress={() => setModus('lesen')} />
        <Chip titel="Checkliste" icon="checkbox" aktiv={modus === 'checkliste'} onPress={() => setModus('checkliste')} />
      </View>

      {freigabenFuer(m.id).map((fr) => (
        <View key={fr.tabelle} style={{ marginTop: abstand.l }}><FreigabeKarte freigabe={fr} zeigeKontext={false} /></View>
      ))}

      {modus === 'checkliste' ? (
        <Abschnitt titel="Standardvorgehen (S. 27) + Durchführung laut SAA">
          <Karte><Checkliste schritte={pruefschritte} /></Karte>
        </Abschnitt>
      ) : (
        <Abschnitt titel={`SAA ${m.name}`}>
          {m.abschnitte.kontraindikationen?.length ? (
            <Karte style={{ borderColor: f.rot, borderWidth: 2 }}>
              <T art="untertitel" farbe={f.rot}>Kontraindikationen</T>
              <Punkte punkte={m.abschnitte.kontraindikationen} warnung />
            </Karte>
          ) : null}
          {ABSCHNITTE.filter((x) => x.key !== 'kontraindikationen' && m.abschnitte[x.key]?.length).map((x) => (
            <Aufklapper key={x.key} titel={x.titel} offen={x.key === 'indikationen' || x.key === 'durchfuehrung'} anzahl={m.abschnitte[x.key]?.length}>
              <Punkte punkte={m.abschnitte[x.key]} />
            </Aufklapper>
          ))}
        </Abschnitt>
      )}

      {m.groessentabelle ? (
        <View style={{ marginTop: abstand.l }}>
          <Hinweis art="warnung">{`Größen- und Farbtabelle: bitte im Kompendium S. ${m.seite} nachschlagen. Sie wird in einer späteren Version geprüft digitalisiert.`}</Hinweis>
        </View>
      ) : null}
      <Quelle seite={m.seite} text={`SAA ${m.name}`} />
    </Seite>
  );
}
