import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { fragenpool, type Frage, type Thema } from '@/logic/lernen/fragen';
import { beantworte, PRUEFUNG, stelleZusammen, type Modus } from '@/logic/lernen/training';
import { formatDauer } from '@/logic/rea';
import { BASIS_TAGESFRAGEN, useApp } from '@/state/AppState';
import { Hinweis, Karte, Knopf, Seite, T } from '@/ui/bausteine';
import { abstand, radius, TOUCH, useFarben } from '@/ui/theme';

export default function Quiz() {
  const f = useFarben();
  const p = useLocalSearchParams<{ modus: Modus; themen?: string }>();
  const modus = p.modus ?? 'gemischt';
  const { profil, lernstand, setzeLernstand, abo, zaehleFrage, fragenHeute } = useApp();
  const [start] = useState(Date.now());
  const fragen = useMemo<Frage[]>(() => {
    const pool = fragenpool({ qualifikation: profil.qualifikation, bereich: profil.bereich ?? undefined });
    const themen = p.themen ? (p.themen.split(',').filter(Boolean) as Thema[]) : undefined;
    return stelleZusammen(pool, lernstand, modus, Date.now(), start % 100000, themen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pruefung = modus === 'pruefung';
  const [index, setIndex] = useState(0);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [antworten, setAntworten] = useState<number[]>([]);
  const [jetzt, setJetzt] = useState(Date.now());
  const fertig = index >= fragen.length;
  const zeitUm = pruefung && jetzt - start > PRUEFUNG.minuten * 60_000;

  useEffect(() => {
    if (!pruefung || fertig) return;
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pruefung, fertig]);

  const limitErreicht = abo !== 'pro' && fragenHeute() >= BASIS_TAGESFRAGEN;

  if (fragen.length === 0) {
    return (
      <Seite>
        <T art="titel">Keine Fragen</T>
        <T leise>
          {modus === 'faellig' ? 'Gerade ist nichts zur Wiederholung fällig.' : modus === 'fehler' ? 'Keine offenen Fehler – stark!' : 'Für diese Auswahl gibt es keine Fragen.'}
        </T>
        <Knopf titel="Zurück" onPress={() => router.back()} style={{ marginTop: abstand.l }} />
      </Seite>
    );
  }

  if (fertig || zeitUm) {
    const richtig = antworten.filter((a, i) => a === fragen[i].richtig).length;
    const quote = antworten.length ? richtig / fragen.length : 0;
    return (
      <Seite>
        <Stack.Screen options={{ title: 'Auswertung' }} />
        <Karte style={{ alignItems: 'center' }}>
          <Ionicons name={quote >= 0.8 ? 'trophy' : 'school'} size={48} color={quote >= 0.8 ? f.gelb : f.akzent} />
          <T art="riesig">{`${richtig} / ${fragen.length}`}</T>
          <T leise>{`${Math.round(quote * 100)} % richtig${zeitUm ? ' · Zeit abgelaufen' : ''}`}</T>
        </Karte>
        {pruefung
          ? fragen.map((fr, i) => {
              const ok = antworten[i] === fr.richtig;
              return (
                <Karte key={fr.id} style={{ marginTop: abstand.s, borderColor: ok ? f.gruen : f.rot }}>
                  <T art="klein" leise>{`Frage ${i + 1}`}</T>
                  <T style={{ fontWeight: '700' }}>{fr.frage}</T>
                  {!ok ? <T art="klein" farbe={f.rot}>{`Deine Antwort: ${antworten[i] !== undefined ? fr.optionen[antworten[i]] : '–'}`}</T> : null}
                  <T art="klein" farbe={f.gruen}>{`Richtig: ${fr.optionen[fr.richtig]}`}</T>
                </Karte>
              );
            })
          : null}
        <Knopf titel="Fertig" onPress={() => router.back()} style={{ marginTop: abstand.l }} />
      </Seite>
    );
  }

  const fr = fragen[index];
  const beantwortet = gewaehlt !== null;

  const waehle = (i: number) => {
    if (beantwortet || limitErreicht) return;
    setGewaehlt(i);
    setAntworten((a) => [...a, i]);
    setzeLernstand(beantworte(lernstand, fr.id, i === fr.richtig, Date.now()));
    zaehleFrage();
    if (pruefung) weiter();
  };
  function weiter() {
    setGewaehlt(null);
    setIndex((x) => x + 1);
  }

  return (
    <Seite>
      <Stack.Screen options={{ title: pruefung ? `Prüfung · ${formatDauer(PRUEFUNG.minuten * 60_000 - (jetzt - start))}` : 'Lernen' }} />
      <View style={{ height: 6, backgroundColor: f.flaecheHoch, borderRadius: 3 }}>
        <View style={{ height: 6, width: `${(index / fragen.length) * 100}%`, backgroundColor: f.akzent, borderRadius: 3 }} />
      </View>
      <T art="klein" leise style={{ marginTop: abstand.s }}>{`Frage ${index + 1} von ${fragen.length}`}</T>
      <T art="titel" style={{ marginVertical: abstand.m }}>{fr.frage}</T>

      {limitErreicht && !beantwortet ? (
        <Hinweis art="warnung">
          {`Dein Tageslimit von ${BASIS_TAGESFRAGEN} Fragen ist erreicht. Mit Nodexo Pro lernst du unbegrenzt.`}
        </Hinweis>
      ) : null}

      <View style={{ gap: abstand.s }}>
        {fr.optionen.map((o, i) => {
          const istRichtig = i === fr.richtig;
          const farbe = !beantwortet || pruefung ? f.rand : istRichtig ? f.gruen : i === gewaehlt ? f.rot : f.rand;
          return (
            <Pressable
              key={i}
              onPress={() => waehle(i)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                minHeight: TOUCH,
                justifyContent: 'center',
                padding: abstand.m,
                borderRadius: radius.m,
                borderWidth: 2,
                borderColor: farbe,
                backgroundColor: pressed ? f.flaecheHoch : f.flaeche,
              })}>
              <T>{o}</T>
            </Pressable>
          );
        })}
      </View>

      {beantwortet && !pruefung ? (
        <Karte style={{ marginTop: abstand.l, borderColor: gewaehlt === fr.richtig ? f.gruen : f.rot }}>
          <T art="untertitel" farbe={gewaehlt === fr.richtig ? f.gruen : f.rot}>{gewaehlt === fr.richtig ? 'Richtig' : 'Leider falsch'}</T>
          <T art="klein">{fr.erklaerung}</T>
        </Karte>
      ) : null}
      {beantwortet && !pruefung ? <Knopf titel={index + 1 < fragen.length ? 'Weiter' : 'Auswertung'} icon="arrow-forward" onPress={weiter} style={{ marginTop: abstand.m }} /> : null}
      {limitErreicht ? <Knopf titel="Nodexo Pro ansehen" art="umriss" onPress={() => router.push('/abo')} style={{ marginTop: abstand.m }} /> : null}
    </Seite>
  );
}
