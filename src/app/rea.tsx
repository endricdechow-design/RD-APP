import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';

import { useApp } from '@/state/AppState';
import { formatDosis } from '@/logic/dosis';
import {
  anzahl,
  empfehlungen,
  formatDauer,
  neueRea,
  protokolliere,
  protokollText,
  REVERSIBLE_URSACHEN,
  zyklusRest,
  ZYKLUS_MS,
  type ReaEreignisTyp,
  type ReaModus,
  type ReaZustand,
} from '@/logic/rea';
import { Abschnitt, Chip, Eingabe, Hinweis, Karte, Knopf, Seite, T, zahlAusText } from '@/ui/bausteine';
import { abstand, radius, useFarben } from '@/ui/theme';

function tippen() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export default function Rea() {
  useKeepAwake();
  const f = useFarben();
  const params = useLocalSearchParams<{ modus?: string }>();
  const { patient } = useApp();
  const modus: ReaModus = params.modus === 'kind' ? 'kind' : 'erwachsen';
  const [z, setZ] = useState<ReaZustand>(() => neueRea(modus, Date.now(), modus === 'kind' ? patient.gewichtKg : undefined));
  const [jetzt, setJetzt] = useState(() => Date.now());
  const [gewicht, setGewicht] = useState(z.gewichtKg ? String(z.gewichtKg) : '');
  const [ursachen, setUrsachen] = useState<Set<string>>(new Set());
  const [beendet, setBeendet] = useState(false);

  useEffect(() => {
    if (beendet) return;
    const t = setInterval(() => setJetzt(Date.now()), 250);
    return () => clearInterval(t);
  }, [beendet]);

  const rest = zyklusRest(z, jetzt);
  const tipps = useMemo(() => empfehlungen(z, jetzt), [z, jetzt]);
  const schocks = anzahl(z, 'schock');

  const log = (typ: ReaEreignisTyp, text: string) => {
    tippen();
    setZ((alt) => protokolliere(alt, typ, text, Date.now()));
  };

  const ursachen2 = REVERSIBLE_URSACHEN[modus];

  return (
    <Seite>
      <Stack.Screen options={{ title: modus === 'kind' ? 'REA Kind (PLS)' : 'REA Erwachsene (ALS)' }} />

      {/* Zeiten */}
      <View style={{ flexDirection: 'row', gap: abstand.m }}>
        <Karte style={{ flex: 1, alignItems: 'center' }}>
          <T art="klein" leise>GESAMT</T>
          <T art="riesig">{formatDauer(jetzt - z.start)}</T>
        </Karte>
        <Karte style={{ flex: 1, alignItems: 'center', borderColor: rest < 15_000 ? f.notfall : f.rand, borderWidth: rest < 15_000 ? 3 : 1 }}>
          <T art="klein" leise>ZYKLUS 2 MIN</T>
          <T art="riesig" farbe={rest < 15_000 ? f.notfall : f.text}>{formatDauer(rest)}</T>
          <View style={{ height: 6, width: '100%', backgroundColor: f.flaecheHoch, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${(1 - rest / ZYKLUS_MS) * 100}%`, backgroundColor: f.akzent, borderRadius: 3 }} />
          </View>
        </Karte>
      </View>
      {rest === 0 ? <View style={{ marginTop: abstand.s }}><Hinweis art="warnung">Rhythmusanalyse fällig – Positionswechsel.</Hinweis></View> : null}

      {modus === 'kind' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, marginTop: abstand.m }}>
          <T style={{ fontWeight: '700' }}>Gewicht</T>
          <Eingabe
            wert={gewicht}
            setze={(s) => {
              setGewicht(s);
              setZ((alt) => ({ ...alt, gewichtKg: zahlAusText(s) }));
            }}
            platzhalter="kg"
            einheit="kg"
            breite={130}
          />
          <T art="klein" leise style={{ flex: 1 }}>für Epinephrin, Amiodaron, 4 J/kgKG</T>
        </View>
      ) : null}

      {/* Rhythmus */}
      <Abschnitt titel={`Analyse · ${schocks} Schock${schocks === 1 ? '' : 's'}`}>
        <View style={{ flexDirection: 'row', gap: abstand.m }}>
          <Knopf
            titel="VF / pVT"
            art={z.rhythmus === 'schockbar' ? 'notfall' : 'leise'}
            icon="flash"
            style={{ flex: 1 }}
            onPress={() => {
              setZ((alt) => protokolliere({ ...alt, rhythmus: 'schockbar' }, 'analyse', `${anzahl(alt, 'analyse') + 1}. Analyse: VF / pVT`, Date.now()));
              tippen();
            }}
          />
          <Knopf
            titel="Asystolie / PEA"
            art={z.rhythmus === 'nicht_schockbar' ? 'primaer' : 'leise'}
            icon="pulse"
            style={{ flex: 1 }}
            onPress={() => {
              setZ((alt) => protokolliere({ ...alt, rhythmus: 'nicht_schockbar' }, 'analyse', `${anzahl(alt, 'analyse') + 1}. Analyse: Asystolie / PEA`, Date.now()));
              tippen();
            }}
          />
        </View>
        <Knopf
          titel={`${schocks + 1}. Schock abgegeben${modus === 'kind' && z.gewichtKg ? ` (${Math.round(4 * z.gewichtKg)} J)` : ''}`}
          art="notfall"
          icon="flash"
          gross
          deaktiviert={z.rhythmus !== 'schockbar'}
          onPress={() => log('schock', `${schocks + 1}. Schock${modus === 'kind' && z.gewichtKg ? ` (${Math.round(4 * z.gewichtKg)} J)` : ''}`)}
        />
      </Abschnitt>

      {/* Empfehlungen */}
      <Abschnitt titel="Jetzt">
        {!z.rhythmus ? <T leise>Rhythmus wählen – dann zeigt Nodexo Medikamente und Zeitpunkte nach BPR.</T> : null}
        {tipps.map((e, i) => (
          <Karte key={i} style={e.dringend ? { borderColor: f.notfall, borderWidth: 2 } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.s }}>
              <Ionicons name={e.dringend ? 'alert-circle' : 'time'} size={22} color={e.dringend ? f.notfall : f.textLeise} />
              <T art="untertitel" style={{ flex: 1 }}>{e.titel}</T>
              <T art="klein" leise>{`S. ${e.seite}`}</T>
            </View>
            <T leise>{e.detail}</T>
            {e.dosis ? (
              e.dosis.passung === 'passt' ? (
                <T art="gross">{`${formatDosis(e.dosis.dosis, e.dosis.einheit)}${e.dosis.volumenMl !== undefined ? `  =  ${formatDosis(e.dosis.volumenMl, 'ml')}` : ''}`}</T>
              ) : (
                <T farbe={f.gelb}>{e.dosis.grund}</T>
              )
            ) : null}
            {e.dosis?.passung === 'passt' ? <T art="klein" leise>{e.dosis.rechenweg}</T> : null}
            {e.dosis?.regel.hinweis ? <T art="klein" farbe={f.gelb}>{e.dosis.regel.hinweis}</T> : null}
            {e.typ === 'epinephrin' && e.dringend ? (
              <Knopf titel="Epinephrin gegeben" icon="checkmark" onPress={() => log('epinephrin', `Epinephrin ${e.dosis?.dosis !== undefined ? formatDosis(e.dosis.dosis, 'mg') : ''}`)} />
            ) : null}
            {e.typ === 'amiodaron' ? (
              <Knopf titel="Amiodaron gegeben" icon="checkmark" onPress={() => log('amiodaron', `Amiodaron ${e.dosis?.dosis !== undefined ? formatDosis(e.dosis.dosis, 'mg') : ''}`)} />
            ) : null}
          </Karte>
        ))}
        <T art="klein" leise>Lidocain als Alternative zu Amiodaron: Freigabe in den meisten Bereichen nur Notarzt (S. 101).</T>
      </Abschnitt>

      <Abschnitt titel="Maßnahmen">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s }}>
          <Chip titel="Atemweg / EGA" icon="medical" onPress={() => log('atemweg', 'Atemweg gesichert')} />
          <Chip titel="i.v.-Zugang" icon="water" onPress={() => log('zugang', 'i.v.-Zugang')} />
          <Chip titel="i.o.-Zugang" icon="water" onPress={() => log('zugang', 'i.o.-Zugang')} />
          <Chip titel="ROSC" icon="heart" onPress={() => log('rosc', 'ROSC')} />
        </View>
        {anzahl(z, 'rosc') > 0 ? <Knopf titel="BPR Post-ROSC öffnen" art="umriss" onPress={() => router.push('/bpr/post-rosc')} /> : null}
      </Abschnitt>

      <Abschnitt titel={`Reversible Ursachen (S. ${ursachen2.seite})`}>
        <Karte>
          {[...ursachen2.hs.map((u) => ['4 Hs', u]), ...ursachen2.hits.map((u) => ['HITS', u])].map(([gruppe, u]) => {
            const ok = ursachen.has(u);
            return (
              <Pressable
                key={u}
                onPress={() => setUrsachen((alt) => { const n = new Set(alt); if (n.has(u)) n.delete(u); else n.add(u); return n; })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, minHeight: 44 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ok }}>
                <Ionicons name={ok ? 'checkbox' : 'square-outline'} size={24} color={ok ? f.gruen : f.textLeise} />
                <T style={{ flex: 1 }}>{u}</T>
                <T art="klein" leise>{gruppe}</T>
              </Pressable>
            );
          })}
        </Karte>
      </Abschnitt>

      <Abschnitt titel="Protokoll">
        <View style={{ backgroundColor: f.flaeche, borderRadius: radius.m, padding: abstand.m, gap: 4 }}>
          {[...z.ereignisse].reverse().map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: abstand.m }}>
              <T art="klein" leise style={{ width: 52, fontVariant: ['tabular-nums'] }}>{formatDauer(e.zeit - z.start)}</T>
              <T art="klein" style={{ flex: 1 }}>{e.text}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: abstand.m }}>
          <Knopf titel="Teilen" art="leise" icon="share" style={{ flex: 1 }} onPress={() => Share.share({ message: protokollText(z) }).catch(() => {})} />
          <Knopf
            titel={beendet ? 'Beendet' : 'Beenden'}
            art="leise"
            icon="stop-circle"
            style={{ flex: 1 }}
            deaktiviert={beendet}
            onPress={() => {
              log('ende', 'Reanimation beendet');
              setBeendet(true);
            }}
          />
        </View>
      </Abschnitt>
    </Seite>
  );
}
