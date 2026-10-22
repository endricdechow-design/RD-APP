// Ablaufsteuerung für das REA-Cockpit nach BPR Reanimation Erwachsene (S. 91–92),
// Kinder (S. 93–94) und Medikamente Reanimation (S. 100–101).
// Reine Funktionen: Zustand rein, Empfehlungen raus – die UI zeigt nur an.
import { berechne, type Dosisergebnis } from './dosis';
import { dosisregeln } from '../data/kompendium';

export type ReaModus = 'erwachsen' | 'kind';
export type Rhythmus = 'schockbar' | 'nicht_schockbar';

export type ReaEreignisTyp =
  | 'start'
  | 'zyklus'
  | 'analyse'
  | 'schock'
  | 'epinephrin'
  | 'amiodaron'
  | 'lidocain'
  | 'atemweg'
  | 'zugang'
  | 'rosc'
  | 'ende'
  | 'ursache'
  | 'notiz';

export interface ReaEreignis {
  zeit: number; // ms seit Epoch
  typ: ReaEreignisTyp;
  text: string;
  /** Bei Analyse: festgestellter Rhythmus */
  rhythmus?: Rhythmus;
  /** Bei Medikamenten: protokollierte Dosis in mg */
  dosisMg?: number;
  /** Bei "ursache": besprochene reversible Ursache */
  ursache?: string;
}

export interface ReaZustand {
  modus: ReaModus;
  gewichtKg?: number;
  start: number;
  rhythmus?: Rhythmus;
  ereignisse: ReaEreignis[];
}

export const ZYKLUS_MS = 2 * 60 * 1000;
export const EPI_INTERVALL_MS = 4 * 60 * 1000;

export const REVERSIBLE_URSACHEN: Record<ReaModus, { seite: number; hs: string[]; hits: string[] }> = {
  erwachsen: {
    seite: 92,
    hs: ['Hypoxie', 'Hypovolämie', 'Hyper-/Hypokaliämie/metabolisch', 'Hypothermie', 'Hyperthermie'],
    hits: ['Herzbeuteltamponade', 'Intoxikation', 'Thrombose (koronar/pulmonal)', 'Spannungs-Pneumothorax'],
  },
  kind: {
    seite: 94,
    hs: ['Hypoxie', 'Hypovolämie', 'Hypo-/Hyperkaliämie / Hypoglykämie', 'Hypo- / Hyperthermie'],
    hits: ['Herzbeuteltamponade', 'Intoxikation', 'Thromboembolie', 'Spannungspneumothorax'],
  },
};

export function neueRea(modus: ReaModus, jetzt: number, gewichtKg?: number): ReaZustand {
  return { modus, gewichtKg, start: jetzt, ereignisse: [{ zeit: jetzt, typ: 'start', text: 'Szenario gestartet' }] };
}

export function protokolliere(
  z: ReaZustand,
  typ: ReaEreignisTyp,
  text: string,
  jetzt: number,
  extra: Pick<ReaEreignis, 'rhythmus' | 'dosisMg' | 'ursache'> = {},
): ReaZustand {
  const rhythmus = typ === 'analyse' && extra.rhythmus ? extra.rhythmus : z.rhythmus;
  return { ...z, rhythmus, ereignisse: [...z.ereignisse, { zeit: jetzt, typ, text, ...extra }] };
}

export function anzahl(z: ReaZustand, typ: ReaEreignisTyp): number {
  return z.ereignisse.filter((e) => e.typ === typ).length;
}

export function letzte(z: ReaZustand, typ: ReaEreignisTyp): ReaEreignis | undefined {
  return [...z.ereignisse].reverse().find((e) => e.typ === typ);
}

/**
 * Restzeit im aktuellen 2-Minuten-Zyklus. Der Zyklus wird von Hand gestartet (Ereignis "zyklus").
 * null = kein Zyklus gestartet; negativ = Zyklus überzogen.
 */
export function zyklusRest(z: ReaZustand, jetzt: number): number | null {
  const start = letzte(z, 'zyklus');
  return start ? ZYKLUS_MS - (jetzt - start.zeit) : null;
}

function regel(id: string) {
  const r = dosisregeln.find((d) => d.id === id);
  if (!r) throw new Error(`Dosisregel ${id} fehlt`);
  return r;
}

export function dosisFuer(z: ReaZustand, id: string): Dosisergebnis {
  return berechne(regel(id), { erwachsen: z.modus === 'erwachsen', gewichtKg: z.gewichtKg });
}

export interface ReaEmpfehlung {
  typ: 'epinephrin' | 'amiodaron' | 'elektroden' | 'zyklus' | 'defi_energie';
  dringend: boolean;
  titel: string;
  detail: string;
  seite: number;
  dosis?: Dosisergebnis;
}

/**
 * Empfehlungen für den aktuellen Moment.
 * Epinephrin: bei Asystolie/PEA so früh wie möglich, bei VF/pVT nach dem 3. Schock, dann alle 4 Minuten.
 * Amiodaron: nach dem 3. und 5. Schock (nur VF/pVT).
 */
export function empfehlungen(z: ReaZustand, jetzt: number): ReaEmpfehlung[] {
  const out: ReaEmpfehlung[] = [];
  const schocks = anzahl(z, 'schock');
  const epiGaben = anzahl(z, 'epinephrin');
  const amioGaben = anzahl(z, 'amiodaron');
  const letzteEpi = letzte(z, 'epinephrin');
  const epiId = z.modus === 'erwachsen' ? 'epi-rea-erw' : 'epi-rea-kind';

  const epiFaellig = (() => {
    if (letzteEpi) return jetzt - letzteEpi.zeit >= EPI_INTERVALL_MS;
    if (z.rhythmus === 'nicht_schockbar') return true;
    return schocks >= 3;
  })();

  if (epiFaellig && z.rhythmus) {
    out.push({
      typ: 'epinephrin',
      dringend: true,
      titel: epiGaben === 0 ? 'Epinephrin geben' : 'Epinephrin wiederholen',
      detail:
        epiGaben === 0
          ? z.rhythmus === 'nicht_schockbar'
            ? 'Asystolie / PEA: so früh wie möglich'
            : 'VF / pVT: nach dem 3. Schock'
          : '4 Minuten seit letzter Gabe',
      seite: 100,
      dosis: dosisFuer(z, epiId),
    });
  } else if (letzteEpi) {
    const rest = EPI_INTERVALL_MS - (jetzt - letzteEpi.zeit);
    out.push({
      typ: 'epinephrin',
      dringend: false,
      titel: 'Nächstes Epinephrin',
      detail: `in ${formatDauer(rest)}`,
      seite: 100,
    });
  }

  if (z.rhythmus === 'schockbar') {
    if (schocks >= 3 && amioGaben === 0) {
      out.push({
        typ: 'amiodaron',
        dringend: true,
        titel: 'Amiodaron (1. Gabe)',
        detail: 'nach dem 3. Schock',
        seite: 100,
        dosis: dosisFuer(z, z.modus === 'erwachsen' ? 'amio-rea-erw-1' : 'amio-rea-kind-1'),
      });
    } else if (schocks >= 5 && amioGaben === 1) {
      out.push({
        typ: 'amiodaron',
        dringend: true,
        titel: 'Amiodaron (2. Gabe)',
        detail: 'nach dem 5. Schock',
        seite: 100,
        dosis: dosisFuer(z, z.modus === 'erwachsen' ? 'amio-rea-erw-2' : 'amio-rea-kind-2'),
      });
    }
    if (z.modus === 'erwachsen' && schocks >= 3) {
      out.push({
        typ: 'elektroden',
        dringend: false,
        titel: 'Erwäge: Elektrodenposition wechseln',
        detail: 'anterior-posteriore Position nach drei erfolglosen Defibrillationsversuchen (refraktäres Kammerflimmern)',
        seite: 91,
      });
    }
    if (z.modus === 'kind') {
      const joule = z.gewichtKg ? `${Math.round(4 * z.gewichtKg)} J` : 'Gewicht eingeben';
      out.push({ typ: 'defi_energie', dringend: false, titel: 'Defibrillation 4 J/kgKG', detail: joule, seite: 93 });
    }
  }
  return out;
}

export function formatDauer(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function protokollText(z: ReaZustand): string {
  const zeile = (e: ReaEreignis) => {
    const d = new Date(e.zeit);
    const uhr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return `${uhr}  (+${formatDauer(e.zeit - z.start)})  ${e.text}`;
  };
  return [
    `REA-Protokoll (${z.modus === 'erwachsen' ? 'Erwachsene' : 'Kind'}${z.gewichtKg ? `, ${z.gewichtKg} kg` : ''})`,
    ...z.ereignisse.map(zeile),
  ].join('\n');
}
