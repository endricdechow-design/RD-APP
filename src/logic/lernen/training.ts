// Lernstand (Leitner-System) und Zusammenstellung von Lerneinheiten.
import { mische, type Frage, type Thema } from './fragen';

/** Fach 1–5; Wiederholungsabstand in Tagen je Fach */
export const FACH_INTERVALL_TAGE = [0, 0, 1, 3, 7, 14] as const;
const TAG_MS = 24 * 60 * 60 * 1000;

export interface Karte {
  fach: number;
  faelligAb: number;
  richtig: number;
  falsch: number;
  zuletzt: number;
}

export type Lernstand = Record<string, Karte>;

export function beantworte(stand: Lernstand, frageId: string, korrekt: boolean, jetzt: number): Lernstand {
  const alt = stand[frageId] ?? { fach: 1, faelligAb: jetzt, richtig: 0, falsch: 0, zuletzt: 0 };
  const fach = korrekt ? Math.min(5, alt.fach + 1) : 1;
  return {
    ...stand,
    [frageId]: {
      fach,
      faelligAb: jetzt + FACH_INTERVALL_TAGE[fach] * TAG_MS,
      richtig: alt.richtig + (korrekt ? 1 : 0),
      falsch: alt.falsch + (korrekt ? 0 : 1),
      zuletzt: jetzt,
    },
  };
}

export type Modus = 'gemischt' | 'themen' | 'faellig' | 'fehler' | 'pruefung';

export const MODI: { id: Modus; name: string; beschreibung: string; pro: boolean }[] = [
  { id: 'gemischt', name: 'Alles durcheinander', beschreibung: '10 Fragen quer durch deinen Stoff', pro: false },
  { id: 'themen', name: 'Nach Themen', beschreibung: 'Nur die Themen, die du auswählst', pro: false },
  { id: 'faellig', name: 'Wiederholen', beschreibung: 'Fällige Karten nach dem Leitner-System', pro: true },
  { id: 'fehler', name: 'Fehlertraining', beschreibung: 'Nur Fragen, die du zuletzt falsch hattest', pro: true },
  { id: 'pruefung', name: 'Prüfungssimulation', beschreibung: '30 Fragen, 30 Minuten, Auswertung erst am Ende', pro: true },
];

export const PRUEFUNG = { fragen: 30, minuten: 30 } as const;

export function stelleZusammen(
  pool: Frage[],
  stand: Lernstand,
  modus: Modus,
  jetzt: number,
  seed: number,
  themen?: Thema[],
): Frage[] {
  const gemischt = (liste: Frage[]) => mische(liste, seed);
  switch (modus) {
    case 'gemischt':
      return ausgewogen(pool, 10, seed);
    case 'themen':
      return gemischt(pool.filter((f) => !themen?.length || themen.includes(f.thema))).slice(0, 15);
    case 'faellig':
      return gemischt(pool.filter((f) => stand[f.id] && stand[f.id].faelligAb <= jetzt)).slice(0, 20);
    case 'fehler':
      return gemischt(pool.filter((f) => stand[f.id]?.fach === 1 && stand[f.id].falsch > 0)).slice(0, 20);
    case 'pruefung':
      return ausgewogen(pool, PRUEFUNG.fragen, seed);
  }
}

/** Gleichmäßig über Themen verteilt, damit "durcheinander" nicht nur Medikamentenfragen liefert */
export function ausgewogen(pool: Frage[], anzahl: number, seed: number): Frage[] {
  const nachThema = new Map<Thema, Frage[]>();
  for (const f of mische(pool, seed)) {
    if (!nachThema.has(f.thema)) nachThema.set(f.thema, []);
    nachThema.get(f.thema)!.push(f);
  }
  const listen = [...nachThema.values()];
  const out: Frage[] = [];
  for (let i = 0; out.length < anzahl && listen.some((l) => l.length > i); i++) {
    for (const l of listen) {
      if (l[i] && out.length < anzahl) out.push(l[i]);
    }
  }
  return mische(out, seed + 1);
}

export interface Fortschritt {
  gesamt: number;
  gesehen: number;
  sicher: number; // Fach ≥ 4
  faellig: number;
  quote: number; // richtig / beantwortet
}

export function fortschritt(pool: Frage[], stand: Lernstand, jetzt: number): Fortschritt {
  let gesehen = 0;
  let sicher = 0;
  let faellig = 0;
  let richtig = 0;
  let beantwortet = 0;
  for (const f of pool) {
    const k = stand[f.id];
    if (!k) continue;
    gesehen++;
    if (k.fach >= 4) sicher++;
    if (k.faelligAb <= jetzt) faellig++;
    richtig += k.richtig;
    beantwortet += k.richtig + k.falsch;
  }
  return { gesamt: pool.length, gesehen, sicher, faellig, quote: beantwortet ? richtig / beantwortet : 0 };
}

/** Lernplan bis zum Prüfungsdatum: wie viele neue Fragen pro Tag nötig sind */
export function lernplan(f: Fortschritt, pruefungsdatum: number, jetzt: number): { tage: number; neueProTag: number } {
  const tage = Math.max(1, Math.ceil((pruefungsdatum - jetzt) / TAG_MS));
  return { tage, neueProTag: Math.ceil((f.gesamt - f.gesehen) / tage) };
}

/** Tagesserie: Anzahl aufeinanderfolgender Tage mit mindestens einer Antwort */
export function serie(stand: Lernstand, jetzt: number): number {
  const tage = new Set(Object.values(stand).map((k) => Math.floor(k.zuletzt / TAG_MS)));
  let heute = Math.floor(jetzt / TAG_MS);
  if (!tage.has(heute)) heute -= 1;
  let n = 0;
  while (tage.has(heute - n)) n++;
  return n;
}
