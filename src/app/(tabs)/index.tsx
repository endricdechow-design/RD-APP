import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { bereich, bpr } from '@/data/kompendium';
import type { Bpr } from '@/data/typen';
import { QUALI_NAME } from '@/logic/freigabe';
import { suche, titelFuerRoute } from '@/logic/suche';
import { useApp } from '@/state/AppState';
import { Abschnitt, Chip, Knopf, Seite, T, Zeile } from '@/ui/bausteine';
import { abstand, radius, TOUCH, useFarben } from '@/ui/theme';

const KATEGORIEN: { id: Bpr['kategorie']; titel: string }[] = [
  { id: 'kreislaufstillstand', titel: 'Kreislaufstillstand' },
  { id: 'leitsymptom', titel: 'Leitsymptome' },
  { id: 'krankheitsbild', titel: 'Krankheitsbilder A–Z' },
  { id: 'trauma', titel: 'Trauma, MANV und Sonstiges' },
  { id: 'herangehensweise', titel: 'Herangehensweise' },
];

export default function Einsatz() {
  const f = useFarben();
  const { profil, favoriten, zuletzt } = useApp();
  const [eingabe, setEingabe] = useState('');
  const [kategorie, setKategorie] = useState<Bpr['kategorie']>('leitsymptom');
  const treffer = useMemo(() => suche(eingabe), [eingabe]);

  return (
    <Seite>
      <View style={{ flexDirection: 'row', gap: abstand.m }}>
        <Knopf titel="REA Erwachsene" art="notfall" icon="heart" gross style={{ flex: 1 }} onPress={() => router.push('/rea?modus=erwachsen')} />
        <Knopf titel="REA Kind" art="notfall" icon="heart-half" gross style={{ flex: 1 }} onPress={() => router.push('/rea?modus=kind')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.s, marginTop: abstand.l, height: TOUCH, borderRadius: radius.m, borderWidth: 1, borderColor: f.rand, backgroundColor: f.flaeche, paddingHorizontal: abstand.m }}>
        <Ionicons name="search" size={22} color={f.textLeise} />
        <TextInput
          value={eingabe}
          onChangeText={setEingabe}
          placeholder="Suche: Amio, Krampf, ACS, i.o. …"
          placeholderTextColor={f.textLeise}
          style={{ flex: 1, color: f.text, fontSize: 18, minWidth: 0 }}
          autoCorrect={false}
          accessibilityLabel="Suche"
        />
        {eingabe ? (
          <Pressable onPress={() => setEingabe('')} accessibilityLabel="Suche leeren" hitSlop={12}>
            <Ionicons name="close-circle" size={22} color={f.textLeise} />
          </Pressable>
        ) : null}
      </View>

      {eingabe.length >= 2 ? (
        <View style={{ marginTop: abstand.s }}>
          {treffer.length === 0 ? <T leise>Nichts gefunden.</T> : null}
          {treffer.map((t) => (
            <Zeile key={t.route} titel={t.titel} untertitel={t.untertitel} route={t.route}
              icon={t.art === 'medikament' ? 'medkit' : t.art === 'massnahme' ? 'bandage' : 'git-branch'} />
          ))}
        </View>
      ) : (
        <>
          <Pressable onPress={() => router.push('/profil')} style={{ marginTop: abstand.m }} accessibilityRole="button">
            <T art="klein" leise>
              {`${QUALI_NAME[profil.qualifikation]} · ${profil.bereich ? bereich(profil.bereich)?.name : 'kein Bereich gewählt'}  ›`}
            </T>
          </Pressable>

          {favoriten.length > 0 ? (
            <Abschnitt titel="Favoriten">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
                {favoriten.map((r) => <Chip key={r} titel={titelFuerRoute(r)} icon="star" onPress={() => router.push(r as never)} />)}
              </View>
            </Abschnitt>
          ) : null}
          {zuletzt.length > 0 ? (
            <Abschnitt titel="Zuletzt geöffnet">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
                {zuletzt.map((r) => <Chip key={r} titel={titelFuerRoute(r)} icon="time" onPress={() => router.push(r as never)} />)}
              </View>
            </Abschnitt>
          ) : null}

          <Abschnitt titel="Behandlungspfade">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
              {KATEGORIEN.map((k) => <Chip key={k.id} titel={k.titel} aktiv={kategorie === k.id} onPress={() => setKategorie(k.id)} />)}
            </View>
            <View>
              {bpr.filter((b) => b.kategorie === kategorie).map((b) => (
                <Zeile key={b.id} titel={b.titel} untertitel={`S. ${b.seite}${b.bisSeite ? `–${b.bisSeite}` : ''}`} route={`/bpr/${b.id}`} />
              ))}
            </View>
          </Abschnitt>

          <Abschnitt titel="Schnellzugriff">
            <Zeile titel="Scores: NEWS2 · qSOFA · Schockindex" icon="calculator" route="/scores" />
            <Zeile titel="Notfallkarte Opioidüberdosierung" icon="alert-circle" route="/bpr/notfallkarte-opioid" />
            <Zeile titel="Standardvorgehen Medikamentengabe (6-R)" icon="checkmark-done" route="/bpr/standard-medikamente" />
          </Abschnitt>
        </>
      )}
    </Seite>
  );
}
