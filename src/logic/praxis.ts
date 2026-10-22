// Praktische Fallbeispiele: Beobachter protokollieren eine Übungsreanimation,
// die Auswertung vergleicht das Protokoll mit dem BPR Reanimation (ALS / PLS).
import { formatDosis } from './dosis';
import {
  dosisFuer,
  EPI_INTERVALL_MS,
  formatDauer,
  REVERSIBLE_URSACHEN,
  ZYKLUS_MS,
  type ReaEreignis,
  type ReaModus,
  type ReaZustand,
  type Rhythmus,
} from './rea';

export interface Fall {
  id: string;
  titel: string;
  modus: ReaModus;
  gewichtKg?: number;
  /** Ausgangslage für Team und Beobachter – Übungsszenario, keine Kompendium-Inhalte */
  lage: string;
  rhythmus: Rhythmus;
}

export const FAELLE: Fall[] = [
  {
    id: 'erw-vf',
    titel: 'Erwachsener · Kammerflimmern',
    modus: 'erwachsen',
    rhythmus: 'schockbar',
    lage: '58-jähriger Mann bricht im Supermarkt zusammen. Ersthelfer drücken. Bei Eintreffen: keine Reaktion, keine normale Atmung.',
  },
  {
    id: 'erw-asys',
    titel: 'Erwachsene · Asystolie',
    modus: 'erwachsen',
    rhythmus: 'nicht_schockbar',
    lage: '81-jährige Frau, von Angehörigen leblos im Bett aufgefunden, zuletzt vor ca. 10 Minuten gesehen.',
  },
  {
    id: 'kind-vf',
    titel: 'Kind 20 kg · Kammerflimmern',
    modus: 'kind',
    gewichtKg: 20,
    rhythmus: 'schockbar',
    lage: '6-jähriges Kind bricht beim Fußballtraining zusammen. Trainer hat mit Herzdruckmassage begonnen.',
  },
  {
    id: 'kind-asys',
    titel: 'Kleinkind 12 kg · Asystolie',
    modus: 'kind',
    gewichtKg: 12,
    rhythmus: 'nicht_schockbar',
    lage: '2-jähriges Kind nach Badeunfall im Gartenteich, aus dem Wasser gezogen, schlaff und ohne Atmung.',
  },
];

export type Bewertung = 'ok' | 'hinweis' | 'abweichung';

export interface Punkt {
  bewertung: Bewertung;
  titel: string;
  text: string;
}

const nach = (z: ReaZustand, e: ReaEreignis) => formatDauer(e.zeit - z.start);
const alle = (z: ReaZustand, typ: ReaEreignis['typ']) => z.ereignisse.filter((e) => e.typ === typ);
const TOLERANZ_MS = 60 * 1000;

function schocksVor(z: ReaZustand, zeit: number): number {
  return z.ereignisse.filter((e) => e.typ === 'schock' && e.zeit < zeit).length;
}

function dosisPruefung(z: ReaZustand, e: ReaEreignis, regelId: string, name: string): Punkt | null {
  const soll = dosisFuer(z, regelId);
  if (soll.passung !== 'passt' || soll.dosis === undefined || e.dosisMg === undefined) return null;
  const ok = Math.abs(e.dosisMg - soll.dosis) < 0.001;
  return {
    bewertung: ok ? 'ok' : 'abweichung',
    titel: `${name}: Dosis ${formatDosis(e.dosisMg, 'mg')} (${nach(z, e)})`,
    text: ok
      ? 'entspricht dem BPR.'
      : `Soll laut BPR: ${formatDosis(soll.dosis, 'mg')}${soll.volumenMl !== undefined ? ` (${formatDosis(soll.volumenMl, 'ml')})` : ''}.`,
  };
}

/** Vergleicht das Beobachtungsprotokoll mit dem Algorithmus. */
export function auswertung(z: ReaZustand): Punkt[] {
  const p: Punkt[] = [];
  const erw = z.modus === 'erwachsen';
  const analysen = alle(z, 'analyse');
  const schocks = alle(z, 'schock');
  const epi = alle(z, 'epinephrin');
  const amio = alle(z, 'amiodaron');
  const ende = z.ereignisse.at(-1)?.zeit ?? z.start;
  const erstesVf = analysen.find((a) => a.rhythmus === 'schockbar');
  const erstesNichtSchockbar = analysen.find((a) => a.rhythmus === 'nicht_schockbar');

  // Rhythmusanalysen im 2-Minuten-Takt
  for (let i = 1; i < analysen.length; i++) {
    const abstand = analysen[i].zeit - analysen[i - 1].zeit;
    if (abstand > ZYKLUS_MS + 30_000) {
      p.push({ bewertung: 'abweichung', titel: `Analyse ${i + 1} nach ${formatDauer(abstand)}`, text: 'Soll: Rhythmusanalyse nach jeweils 2 Minuten CPR.' });
    }
  }
  if (analysen.length > 1 && !p.some((x) => x.titel.startsWith('Analyse'))) {
    p.push({ bewertung: 'ok', titel: `${analysen.length} Rhythmusanalysen`, text: 'Alle im 2-Minuten-Takt.' });
  }

  // Schocks nur bei schockbarem Rhythmus
  for (const s of schocks) {
    const letzteAnalyse = [...analysen].reverse().find((a) => a.zeit <= s.zeit);
    if (letzteAnalyse?.rhythmus === 'nicht_schockbar') {
      p.push({ bewertung: 'abweichung', titel: `Schock bei Asystolie / PEA (${nach(z, s)})`, text: 'Defibrillation nur bei VF / pVT.' });
    }
  }
  if (!erw && schocks.length && z.gewichtKg) {
    p.push({ bewertung: 'hinweis', titel: `Energie Kind: ${Math.round(4 * z.gewichtKg)} J`, text: 'Defibrillation mit 4 J/kgKG – Energie am Gerät mit dem Team nachbesprechen.' });
  }

  // Epinephrin: Zeitpunkt der ersten Gabe
  if (epi.length === 0) {
    if (erstesNichtSchockbar || schocks.length >= 3) {
      p.push({ bewertung: 'abweichung', titel: 'Kein Epinephrin gegeben', text: 'Bei Asystolie / PEA so früh wie möglich, bei VF / pVT nach dem 3. Schock.' });
    }
  } else {
    const erste = epi[0];
    const vorher = schocksVor(z, erste.zeit);
    if (erstesNichtSchockbar && erstesNichtSchockbar.zeit <= erste.zeit && (!erstesVf || erstesNichtSchockbar.zeit < erstesVf.zeit)) {
      p.push({
        bewertung: 'hinweis',
        titel: `1. Epinephrin ${formatDauer(erste.zeit - erstesNichtSchockbar.zeit)} nach Asystolie / PEA`,
        text: 'Soll: so früh wie möglich.',
      });
    } else if (erstesVf) {
      p.push(
        vorher < 3
          ? { bewertung: 'abweichung', titel: `1. Epinephrin nach dem ${vorher}. Schock`, text: 'Soll bei VF / pVT: nach dem 3. Schock.' }
          : { bewertung: 'ok', titel: `1. Epinephrin nach dem ${vorher}. Schock (${nach(z, erste)})`, text: 'Zeitpunkt entspricht dem BPR.' },
      );
    }
    // Intervalle
    for (let i = 1; i < epi.length; i++) {
      const d = epi[i].zeit - epi[i - 1].zeit;
      const ok = Math.abs(d - EPI_INTERVALL_MS) <= TOLERANZ_MS;
      p.push({
        bewertung: ok ? 'ok' : 'abweichung',
        titel: `${i + 1}. Epinephrin nach ${formatDauer(d)}`,
        text: ok ? 'Intervall passt (Soll alle 4 Minuten).' : 'Soll: alle 4 Minuten (nach jedem zweiten Zyklus).',
      });
    }
    // Überfällig am Ende?
    const letzte = epi.at(-1)!;
    if (!z.ereignisse.some((e) => e.typ === 'rosc' && e.zeit > letzte.zeit) && ende - letzte.zeit > EPI_INTERVALL_MS + TOLERANZ_MS) {
      p.push({ bewertung: 'abweichung', titel: 'Epinephrin-Wiederholung fehlte', text: `Letzte Gabe ${formatDauer(ende - letzte.zeit)} vor Ende.` });
    }
    for (const e of epi) {
      const d = dosisPruefung(z, e, erw ? 'epi-rea-erw' : 'epi-rea-kind', 'Epinephrin');
      if (d && d.bewertung === 'abweichung') p.push(d);
    }
  }

  // Amiodaron
  if (amio.length && !erstesVf) {
    p.push({ bewertung: 'abweichung', titel: 'Amiodaron ohne VF / pVT', text: 'Amiodaron ist bei Reanimation nur für VF / pVT vorgesehen.' });
  }
  if (erstesVf) {
    const sollGaben: [number, string][] = [[3, erw ? 'amio-rea-erw-1' : 'amio-rea-kind-1'], [5, erw ? 'amio-rea-erw-2' : 'amio-rea-kind-2']];
    sollGaben.forEach(([nachSchock, regelId], i) => {
      const gabe = amio[i];
      if (!gabe) {
        if (schocks.length >= nachSchock) p.push({ bewertung: 'abweichung', titel: `${i + 1}. Amiodaron fehlt`, text: `Soll: nach dem ${nachSchock}. Schock.` });
        return;
      }
      const vorher = schocksVor(z, gabe.zeit);
      p.push(
        vorher === nachSchock
          ? { bewertung: 'ok', titel: `${i + 1}. Amiodaron nach dem ${vorher}. Schock`, text: 'Zeitpunkt entspricht dem BPR.' }
          : { bewertung: 'abweichung', titel: `${i + 1}. Amiodaron nach dem ${vorher}. Schock`, text: `Soll: nach dem ${nachSchock}. Schock.` },
      );
      const d = dosisPruefung(z, gabe, regelId, `${i + 1}. Amiodaron`);
      if (d) p.push(d);
    });
    if (erw && schocks.length >= 3) {
      p.push({ bewertung: 'hinweis', titel: 'Nach 3 erfolglosen Schocks', text: 'Erwäge Wechsel der Elektroden in die anterior-posteriore Position – wurde das angesprochen?' });
    }
  }

  // Reversible Ursachen
  const liste = REVERSIBLE_URSACHEN[z.modus];
  const alleUrsachen = [...liste.hs, ...liste.hits];
  const besprochen = new Set(alle(z, 'ursache').map((e) => e.ursache));
  const offen = alleUrsachen.filter((u) => !besprochen.has(u));
  p.push(
    offen.length === 0
      ? { bewertung: 'ok', titel: '4 Hs und HITS', text: 'Alle reversiblen Ursachen wurden besprochen.' }
      : {
          bewertung: besprochen.size ? 'hinweis' : 'abweichung',
          titel: `4 Hs und HITS: ${besprochen.size} von ${alleUrsachen.length} besprochen`,
          text: `Nicht angesprochen: ${offen.join(', ')}.`,
        },
  );

  // Atemweg und Zugang
  const atemweg = alle(z, 'atemweg')[0];
  const zugang = alle(z, 'zugang')[0];
  p.push(atemweg ? { bewertung: 'ok', titel: `Atemweg gesichert nach ${nach(z, atemweg)}`, text: '' } : { bewertung: 'hinweis', titel: 'Keine Atemwegssicherung protokolliert', text: '' });
  p.push(zugang ? { bewertung: 'ok', titel: `${zugang.text} nach ${nach(z, zugang)}`, text: '' } : { bewertung: 'hinweis', titel: 'Kein Gefäßzugang protokolliert', text: '' });

  return p;
}

export function zusammenfassung(z: ReaZustand): { dauer: string; schocks: number; epinephrin: number; amiodaron: number; abweichungen: number } {
  const punkte = auswertung(z);
  return {
    dauer: formatDauer((z.ereignisse.at(-1)?.zeit ?? z.start) - z.start),
    schocks: alle(z, 'schock').length,
    epinephrin: alle(z, 'epinephrin').length,
    amiodaron: alle(z, 'amiodaron').length,
    abweichungen: punkte.filter((x) => x.bewertung === 'abweichung').length,
  };
}
