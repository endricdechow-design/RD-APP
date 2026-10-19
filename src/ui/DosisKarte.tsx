// Ergebnis einer Dosisregel für den aktuellen Patienten, inkl. Titrationszähler.
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { Dosisregel } from '../data/typen';
import { berechne, formatDosis, naechsteTitrationsdosis, runde } from '../logic/dosis';
import { formatDauer } from '../logic/rea';
import { useApp } from '../state/AppState';
import { Hinweis, Knopf, T } from './bausteine';
import { abstand, radius, useFarben } from './theme';

export function DosisKarte({ regel }: { regel: Dosisregel }) {
  const f = useFarben();
  const { patient } = useApp();
  const e = berechne(regel, patient);
  const [gegeben, setGegeben] = useState(0);
  const [letzte, setLetzte] = useState<number | null>(null);
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    if (letzte === null) return;
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, [letzte]);

  const titrierbar = e.passung === 'passt' && !!regel.wiederholung?.intervallMin;
  const naechste = titrierbar ? naechsteTitrationsdosis(e, gegeben) : null;
  const intervallMs = (regel.wiederholung?.intervallMin ?? 0) * 60_000;
  const wartezeit = letzte !== null ? intervallMs - (jetzt - letzte) : 0;

  const kopf = [regel.zielgruppe === 'kinder' ? 'Kinder' : regel.zielgruppe === 'erwachsene' ? 'Erwachsene' : null, regel.applikation, regel.schritt]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ borderRadius: radius.m, borderWidth: 1, borderColor: e.passung === 'passt' ? f.akzent : f.rand, padding: abstand.m, gap: 6, backgroundColor: f.flaecheHoch }}>
      <T art="klein" leise style={{ fontWeight: '700' }}>{kopf}</T>
      {e.passung === 'passt' ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: abstand.m, flexWrap: 'wrap' }}>
            <T art="gross">{formatDosis(e.dosis, e.einheit)}</T>
            {e.volumenMl !== undefined ? <T art="titel" farbe={f.akzent}>{`= ${formatDosis(e.volumenMl, 'ml')}`}</T> : null}
          </View>
          <T art="klein" leise>{e.rechenweg}</T>
          {regel.konzentration ? <T art="klein" leise>{`Konzentration: ${regel.konzentration.text} (S. ${regel.konzentration.seite})`}</T> : null}
          {regel.wiederholung ? <T art="klein">{`Wiederholung: ${regel.wiederholung.text}`}</T> : null}
          {e.maxGesamt !== undefined ? (
            <T art="klein" style={{ fontWeight: '700' }}>{`Maximaldosis gesamt: ${formatDosis(e.maxGesamt, regel.maxGesamt?.einheit ?? e.einheit)}${regel.maxGesamt?.idealgewicht ? ' (ideales KG)' : ''}`}</T>
          ) : null}
          {e.gedeckelt ? <Hinweis art="warnung">Durch Maximaldosis begrenzt.</Hinweis> : null}
          {titrierbar && naechste ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: abstand.m, marginTop: 4, flexWrap: 'wrap' }}>
              <Knopf
                titel={naechste.dosis > 0 ? `+ ${formatDosis(naechste.dosis, e.einheit)} gegeben` : 'Maximum erreicht'}
                art="leise"
                deaktiviert={naechste.dosis <= 0}
                onPress={() => {
                  setGegeben((g) => runde(g + naechste.dosis));
                  setLetzte(Date.now());
                  setJetzt(Date.now());
                }}
              />
              <View>
                <T art="klein">{`gegeben: ${formatDosis(gegeben, e.einheit)}${Number.isFinite(naechste.rest) ? ` · Rest: ${formatDosis(Math.max(0, runde(naechste.rest - 0)), e.einheit)}` : ''}`}</T>
                {letzte !== null ? (
                  <T art="klein" farbe={wartezeit > 0 ? f.gelb : f.gruen}>
                    {wartezeit > 0 ? `nächste Gabe frühestens in ${formatDauer(wartezeit)}` : 'Re-Assessment – Gabe möglich'}
                  </T>
                ) : null}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <T leise>{e.grund}</T>
      )}
      {regel.hinweis ? <T art="klein" farbe={f.gelb}>{regel.hinweis}</T> : null}
      <T art="klein" leise>{`„${regel.beleg.join(' … ')}“ (S. ${regel.seite})`}</T>
    </View>
  );
}
