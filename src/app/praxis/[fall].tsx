// Beobachter-Modus: Team-Handlungen bei einer Übungsreanimation protokollieren und auswerten.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';

import { formatDosis } from '@/logic/dosis';
import { auswertung, FAELLE, zusammenfassung, type Bewertung } from '@/logic/praxis';
import {
  anzahl,
  dosisFuer,
  empfehlungen,
  formatDauer,
  letzte,
  neueRea,
  protokolliere,
  protokollText,
  REVERSIBLE_URSACHEN,
  zyklusRest,
  type ReaEreignis,
  type ReaModus,
  type ReaZustand,
} from '@/logic/rea';
import { Abschnitt, Chip, Eingabe, Karte, Kasten, Knopf, Seite, T, zahlAusText } from '@/ui/bausteine';
import { abstand, radius, useFarben } from '@/ui/theme';

function tippen() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

type Phase = 'vorbereitung' | 'laeuft' | 'auswertung';

function Kachel({ titel, wert, unter, warn }: { titel: string; wert: string; unter?: string; warn?: boolean }) {
  const f = useFarben();
  return (
    <View style={{ flex: 1, minWidth: 140, backgroundColor: f.flaeche, borderRadius: radius.m, borderWidth: warn ? 2 : 1, borderColor: warn ? f.notfall : f.rand, padding: abstand.m, alignItems: 'center' }}>
      <T art="klein" leise>{titel}</T>
      <T art="gross" farbe={warn ? f.notfall : f.text}>{wert}</T>
      {unter ? <T art="klein" leise>{unter}</T> : null}
    </View>
  );
}

export default function Beobachten() {
  useKeepAwake();
  const f = useFarben();
  const { fall: fallId } = useLocalSearchParams<{ fall: string }>();
  const fall = FAELLE.find((x) => x.id === fallId);
  const modus: ReaModus = fall?.modus ?? (fallId === 'frei-kind' ? 'kind' : 'erwachsen');
  const titel = fall?.titel ?? (modus === 'kind' ? 'Kind · eigenes Szenario' : 'Erwachsene · eigenes Szenario');

  const [phase, setPhase] = useState<Phase>('vorbereitung');
  const [gewicht, setGewicht] = useState(fall?.gewichtKg ? String(fall.gewichtKg) : '');
  const [z, setZ] = useState<ReaZustand | null>(null);
  const [jetzt, setJetzt] = useState(() => Date.now());
  const [dosisFuerMed, setDosisFuerMed] = useState<'epinephrin' | 'amiodaron' | null>(null);
  const [freieDosis, setFreieDosis] = useState('');
  const [sollZeigen, setSollZeigen] = useState(false);

  useEffect(() => {
    if (phase !== 'laeuft') return;
    const t = setInterval(() => setJetzt(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  const log = (typ: ReaEreignis['typ'], text: string, extra: Parameters<typeof protokolliere>[4] = {}) => {
    tippen();
    setZ((alt) => (alt ? protokolliere(alt, typ, text, Date.now(), extra) : alt));
  };

  if (phase === 'vorbereitung') {
    return (
      <Seite>
        <Stack.Screen options={{ title: titel }} />
        {fall ? (
          <Kasten titel="Ausgangslage" farbe="gelb">
            <Text style={{ color: '#111', fontSize: 16, lineHeight: 23 }}>{fall.lage}</Text>
          </Kasten>
        ) : null}
        {modus === 'kind' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, marginTop: abstand.l }}>
            <T style={{ fontWeight: '700' }}>Gewicht des Kindes</T>
            <Eingabe wert={gewicht} setze={setGewicht} platzhalter="kg" einheit="kg" breite={130} />
          </View>
        ) : null}
        <Kasten titel="Deine Rolle" farbe="umriss">
          <T>Du beobachtest das Team und tippst jede Handlung in dem Moment, in dem sie passiert. Sprich während des Szenarios nicht mit dem Team.</T>
        </Kasten>
        <Knopf titel="Weiter zur Beobachtung" icon="arrow-forward" gross style={{ marginTop: abstand.l }} onPress={() => setPhase('laeuft')} />
      </Seite>
    );
  }

  if (!z) {
    // Uhr läuft erst, wenn der Beobachter das Szenario startet
    return (
      <Seite>
        <Stack.Screen options={{ title: titel }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          <Kachel titel="GESAMT" wert="0:00" />
          <Kachel titel="ZYKLUS" wert="2:00" unter="startest du selbst" />
        </View>
        <T leise style={{ marginVertical: abstand.l }}>Starte die Uhr in dem Moment, in dem das Szenario beginnt (z. B. Eintreffen am Patienten).</T>
        <Knopf
          titel="Szenario-Uhr starten"
          icon="play"
          art="notfall"
          gross
          onPress={() => {
            const start = Date.now();
            setZ(neueRea(modus, start, zahlAusText(gewicht)));
            setJetzt(start);
          }}
        />
      </Seite>
    );
  }

  if (phase === 'auswertung') return <Auswertung z={z} titel={titel} neu={() => { setZ(null); setPhase('vorbereitung'); }} />;

  const letzterSchock = letzte(z, 'schock');
  const letztesEpi = letzte(z, 'epinephrin');
  const schocks = anzahl(z, 'schock');
  const rest = zyklusRest(z, jetzt);
  const ursachen = REVERSIBLE_URSACHEN[modus];
  const besprochen = new Set(z.ereignisse.filter((e) => e.typ === 'ursache').map((e) => e.ursache));

  const dosisVorschlaege = (med: 'epinephrin' | 'amiodaron') => {
    const soll = dosisFuer(z, med === 'epinephrin' ? (modus === 'erwachsen' ? 'epi-rea-erw' : 'epi-rea-kind') : modus === 'erwachsen' ? (anzahl(z, 'amiodaron') ? 'amio-rea-erw-2' : 'amio-rea-erw-1') : anzahl(z, 'amiodaron') ? 'amio-rea-kind-2' : 'amio-rea-kind-1');
    if (soll.dosis === undefined) return [];
    const r = (n: number) => Math.round(n * 1000) / 1000;
    return [...new Set([r(soll.dosis / 2), r(soll.dosis), r(soll.dosis * 2)])].sort((a, b) => a - b);
  };

  return (
    <Seite>
      <Stack.Screen options={{ title: titel, headerBackVisible: false }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
        <Kachel titel="GESAMT" wert={formatDauer(jetzt - z.start)} />
        <Pressable
          onPress={() => log('zyklus', rest === null ? '1. Zyklus gestartet' : `${anzahl(z, 'zyklus') + 1}. Zyklus gestartet`)}
          accessibilityRole="button"
          accessibilityLabel={rest === null ? 'Zyklus starten' : 'Neuen Zyklus starten'}
          style={{ flex: 1, minWidth: 140 }}>
          <Kachel
            titel={`ZYKLUS${anzahl(z, 'zyklus') ? ` ${anzahl(z, 'zyklus')}` : ''}`}
            wert={rest === null ? '▶ Start' : rest >= 0 ? formatDauer(rest) : `+${formatDauer(-rest)}`}
            unter={rest === null ? 'antippen zum Starten' : 'antippen = neuer Zyklus'}
            warn={rest !== null && rest <= 0}
          />
        </Pressable>
        <Kachel titel={`SCHOCKS: ${schocks}`} wert={letzterSchock ? formatDauer(jetzt - letzterSchock.zeit) : '–'} unter="seit letztem" />
        <Kachel titel={`EPINEPHRIN: ${anzahl(z, 'epinephrin')}×`} wert={letztesEpi ? formatDauer(jetzt - letztesEpi.zeit) : '–'} unter="seit letzter Gabe" />
      </View>

      <Abschnitt titel="Rhythmusanalyse">
        <View style={{ flexDirection: 'row', gap: abstand.s }}>
          <Knopf titel="VF / pVT" icon="flash" art={z.rhythmus === 'schockbar' ? 'notfall' : 'leise'} style={{ flex: 1 }} onPress={() => log('analyse', `Analyse: VF / pVT`, { rhythmus: 'schockbar' })} />
          <Knopf titel="Asystolie / PEA" icon="pulse" art={z.rhythmus === 'nicht_schockbar' ? 'primaer' : 'leise'} style={{ flex: 1 }} onPress={() => log('analyse', `Analyse: Asystolie / PEA`, { rhythmus: 'nicht_schockbar' })} />
        </View>
        <Knopf titel={`${schocks + 1}. Schock`} icon="flash" art="notfall" gross onPress={() => log('schock', `${schocks + 1}. Schock`)} />
      </Abschnitt>

      <Abschnitt titel="Medikamente">
        <View style={{ flexDirection: 'row', gap: abstand.s }}>
          <Knopf titel="Epinephrin" icon="eyedrop" art={dosisFuerMed === 'epinephrin' ? 'primaer' : 'leise'} style={{ flex: 1 }} onPress={() => { setDosisFuerMed('epinephrin'); setFreieDosis(''); }} />
          <Knopf titel="Amiodaron" icon="eyedrop" art={dosisFuerMed === 'amiodaron' ? 'primaer' : 'leise'} style={{ flex: 1 }} onPress={() => { setDosisFuerMed('amiodaron'); setFreieDosis(''); }} />
        </View>
        {dosisFuerMed ? (
          <Karte>
            <T style={{ fontWeight: '700' }}>{`Welche Dosis ${dosisFuerMed === 'epinephrin' ? 'Epinephrin' : 'Amiodaron'} hat das Team gegeben?`}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
              {dosisVorschlaege(dosisFuerMed).map((d) => (
                <Chip key={d} titel={formatDosis(d, 'mg')} onPress={() => { log(dosisFuerMed, `${dosisFuerMed === 'epinephrin' ? 'Epinephrin' : 'Amiodaron'} ${formatDosis(d, 'mg')}`, { dosisMg: d }); setDosisFuerMed(null); }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.s }}>
              <Eingabe wert={freieDosis} setze={setFreieDosis} platzhalter="andere" einheit="mg" breite={150} />
              <Knopf
                titel="Eintragen"
                art="leise"
                deaktiviert={zahlAusText(freieDosis) === undefined}
                onPress={() => {
                  const d = zahlAusText(freieDosis)!;
                  log(dosisFuerMed, `${dosisFuerMed === 'epinephrin' ? 'Epinephrin' : 'Amiodaron'} ${formatDosis(d, 'mg')}`, { dosisMg: d });
                  setDosisFuerMed(null);
                }}
              />
              <Pressable onPress={() => setDosisFuerMed(null)} hitSlop={10} accessibilityLabel="Abbrechen">
                <Ionicons name="close-circle" size={28} color={f.textLeise} />
              </Pressable>
            </View>
          </Karte>
        ) : null}
      </Abschnitt>

      <Abschnitt titel="Maßnahmen">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          <Chip titel="Atemweg / EGA" icon="medical" onPress={() => log('atemweg', 'Atemweg gesichert')} />
          <Chip titel="i.v.-Zugang" icon="water" onPress={() => log('zugang', 'i.v.-Zugang')} />
          <Chip titel="i.o.-Zugang" icon="water" onPress={() => log('zugang', 'i.o.-Zugang')} />
          <Chip titel="ROSC" icon="heart" onPress={() => log('rosc', 'ROSC')} />
        </View>
      </Abschnitt>

      <Abschnitt titel={`4 Hs und HITS · ${besprochen.size} von ${ursachen.hs.length + ursachen.hits.length}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          {[...ursachen.hs, ...ursachen.hits].map((u) => (
            <Chip key={u} titel={u} aktiv={besprochen.has(u)} icon={besprochen.has(u) ? 'checkmark' : undefined} onPress={() => { if (!besprochen.has(u)) log('ursache', `besprochen: ${u}`, { ursache: u }); }} />
          ))}
        </View>
      </Abschnitt>

      <Abschnitt
        titel="Protokoll"
        rechts={
          z.ereignisse.length > 1 ? (
            <Pressable onPress={() => setZ({ ...z, ereignisse: z.ereignisse.slice(0, -1) })} hitSlop={10} accessibilityLabel="Letzten Eintrag löschen">
              <T art="klein" farbe={f.akzent} style={{ fontWeight: '700' }}>Rückgängig</T>
            </Pressable>
          ) : null
        }>
        <View style={{ backgroundColor: f.flaeche, borderRadius: radius.m, padding: abstand.m, gap: 4 }}>
          {[...z.ereignisse].reverse().map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: abstand.m }}>
              <T art="klein" leise style={{ width: 52, fontVariant: ['tabular-nums'] }}>{formatDauer(e.zeit - z.start)}</T>
              <T art="klein" style={{ flex: 1 }}>{e.text}</T>
            </View>
          ))}
        </View>
      </Abschnitt>

      <Pressable onPress={() => setSollZeigen(!sollZeigen)} style={{ marginTop: abstand.l }} accessibilityRole="switch" accessibilityState={{ checked: sollZeigen }}>
        <T art="klein" farbe={f.akzent} style={{ fontWeight: '700' }}>{sollZeigen ? 'Soll-Ablauf ausblenden' : 'Soll-Ablauf für Beobachter einblenden'}</T>
      </Pressable>
      {sollZeigen ? (
        <View style={{ gap: abstand.s, marginTop: abstand.s }}>
          {empfehlungen(z, jetzt).map((e, i) => (
            <T key={i} art="klein" farbe={e.dringend ? f.notfall : f.textLeise}>
              {`${e.titel}: ${e.detail}${e.dosis?.passung === 'passt' ? ` – ${formatDosis(e.dosis.dosis, e.dosis.einheit)}` : ''}`}
            </T>
          ))}
        </View>
      ) : null}

      <Knopf titel="Beenden & auswerten" icon="stop-circle" style={{ marginTop: abstand.xl }} onPress={() => { log('ende', 'Szenario beendet'); setPhase('auswertung'); }} />
    </Seite>
  );
}

function Auswertung({ z, titel, neu }: { z: ReaZustand; titel: string; neu: () => void }) {
  const f = useFarben();
  const punkte = useMemo(() => auswertung(z), [z]);
  const s = zusammenfassung(z);
  const farbe: Record<Bewertung, string> = { ok: f.gruen, hinweis: f.gelb, abweichung: f.rot };
  const icon: Record<Bewertung, 'checkmark-circle' | 'information-circle' | 'close-circle'> = { ok: 'checkmark-circle', hinweis: 'information-circle', abweichung: 'close-circle' };

  const text = [
    `Nodexo – Auswertung ${titel}`,
    `Dauer ${s.dauer} · ${s.schocks} Schocks · ${s.epinephrin}× Epinephrin · ${s.amiodaron}× Amiodaron`,
    '',
    ...punkte.map((p) => `${{ ok: '✓', hinweis: '•', abweichung: '✗' }[p.bewertung]} ${p.titel}${p.text ? ` – ${p.text}` : ''}`),
    '',
    protokollText(z),
  ].join('\n');

  return (
    <Seite>
      <Stack.Screen options={{ title: 'Auswertung', headerBackVisible: true }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
        {[
          ['DAUER', s.dauer],
          ['SCHOCKS', String(s.schocks)],
          ['EPINEPHRIN', `${s.epinephrin}×`],
          ['ABWEICHUNGEN', String(s.abweichungen)],
        ].map(([t, w]) => (
          <Karte key={t} style={{ flex: 1, minWidth: 140, alignItems: 'center' }}>
            <T art="klein" leise>{t}</T>
            <T art="gross" farbe={t === 'ABWEICHUNGEN' && s.abweichungen ? f.rot : f.text}>{w}</T>
          </Karte>
        ))}
      </View>

      <Abschnitt titel="Vergleich mit dem Behandlungspfad">
        {punkte.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: abstand.m, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: f.rand }}>
            <Ionicons name={icon[p.bewertung]} size={24} color={farbe[p.bewertung]} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{p.titel}</T>
              {p.text ? <T art="klein" leise>{p.text}</T> : null}
            </View>
          </View>
        ))}
      </Abschnitt>

      <Abschnitt titel="Zeitstrahl">
        <View style={{ backgroundColor: f.flaeche, borderRadius: radius.m, padding: abstand.m, gap: 4 }}>
          {z.ereignisse.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: abstand.m }}>
              <T art="klein" leise style={{ width: 52, fontVariant: ['tabular-nums'] }}>{formatDauer(e.zeit - z.start)}</T>
              <T art="klein" style={{ flex: 1 }}>{e.text}</T>
            </View>
          ))}
        </View>
      </Abschnitt>

      <View style={{ gap: abstand.m, marginTop: abstand.xl }}>
        <Knopf titel="Auswertung teilen" icon="share" onPress={() => Share.share({ message: text }).catch(() => {})} />
        <Knopf titel="Neuer Durchgang" art="leise" icon="refresh" onPress={neu} />
        <Knopf titel="Zur Fallauswahl" art="umriss" onPress={() => router.back()} />
      </View>
    </Seite>
  );
}
