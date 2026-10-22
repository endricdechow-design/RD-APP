import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { freigabenFuer, massnahme } from '@/data/kompendium';
import type { MassnahmeAbschnitt } from '@/data/typen';
import { useApp } from '@/state/AppState';
import { Chip, Hinweis, Kasten, Punkte, Seite, T, type KastenFarbe } from '@/ui/bausteine';
import { FreigabeKarte } from '@/ui/FreigabeKarte';
import { PdfSeiten } from '@/ui/PdfSeiten';
import { abstand, TOUCH, useFarben } from '@/ui/theme';

const ABSCHNITTE: { key: MassnahmeAbschnitt; titel: string; farbe: KastenFarbe }[] = [
  { key: 'indikationen', titel: 'Indikation / Symptome', farbe: 'gelb' },
  { key: 'kontraindikationen', titel: 'Kontraindikationen', farbe: 'rot' },
  { key: 'alternativen', titel: 'Alternativen', farbe: 'grau' },
  { key: 'aufklaerung', titel: 'Aufklärung / Risiken', farbe: 'grau' },
  { key: 'einwilligung', titel: 'Einwilligung', farbe: 'umriss' },
  { key: 'durchfuehrung', titel: 'Durchführung', farbe: 'tuerkis' },
  { key: 'erfolgspruefung', titel: 'Erfolgsprüfung', farbe: 'gruen' },
  { key: 'gegenmassnahmen', titel: 'Gegenmaßnahmen', farbe: 'orange' },
  { key: 'verlaufskontrolle', titel: 'Verlaufskontrolle', farbe: 'blau' },
];

/** Checkliste nach Standardvorgehen invasive Maßnahmen: Schritte abhaken */
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
  const [checkliste, setCheckliste] = useState(false);
  const route = `/massnahme/${id}`;
  useEffect(() => merkeBesuch(route), [route]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <Seite><T>Maßnahme nicht gefunden.</T></Seite>;
  const fav = favoriten.includes(route);
  const freigaben = freigabenFuer(m.id);

  const schritte = [
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
      <Text style={{ color: f.notfall, fontSize: 22, fontWeight: '800' }}>{m.name}</Text>
      <View style={{ flexDirection: 'row', gap: abstand.s, marginVertical: abstand.m }}>
        <Chip titel="Ansehen" icon="reader" aktiv={!checkliste} onPress={() => setCheckliste(false)} />
        <Chip titel="Checkliste" icon="checkbox" aktiv={checkliste} onPress={() => setCheckliste(true)} />
      </View>

      {freigaben.map((fr) => (
        <View key={fr.tabelle} style={{ marginBottom: abstand.m }}><FreigabeKarte freigabe={fr} zeigeKontext={false} /></View>
      ))}

      {checkliste ? (
        <Kasten titel="Standardvorgehen invasive Maßnahmen" farbe="umriss">
          <Checkliste schritte={schritte} />
        </Kasten>
      ) : (
        <View style={{ gap: abstand.m }}>
          {ABSCHNITTE.filter((x) => m.abschnitte[x.key]?.length).map((x) => (
            <Kasten key={x.key} titel={x.titel} farbe={x.farbe}>
              <Punkte punkte={m.abschnitte[x.key]} aufHell={x.farbe !== 'umriss'} />
            </Kasten>
          ))}
          {m.groessentabelle ? <Hinweis>Größen- und Farbtabelle: siehe Originalseite unten.</Hinweis> : null}
        </View>
      )}

      <PdfSeiten seiten={[m.seite]} />
    </Seite>
  );
}
