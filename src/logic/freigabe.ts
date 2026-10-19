// Bewertet eine Freigabetabelle für die Qualifikation und den Bereich des Nutzers.
//
// Grundlage (Kompendium S. 12 und S. 14–16):
// - Das Level im farbigen Feld ist die erforderliche Mindestqualifikation.
// - Graue (fehlende) Felder: Maßnahme im Bereich nicht vorgesehen.
// - ★ kennzeichnet vorabdelegierte Maßnahmen nach § 4 Abs. 2 Nr. 2c NotSanG (gilt nur für NotSan).
// - RS: heilkundliche Maßnahmen nur im rechtfertigenden Notstand (§ 34 StGB).
// - TNA-Konsultation ist eine Einzelfalldelegation (2b).
// RettAss existiert in Nodexo nicht; RettAss-Felder sind beim Export auf NotSan angehoben.
import type { BereichCode, Freigabe, Level, Qualifikation, Zelle } from '../data/typen';

export type FreigabeArt =
  | 'erlaubt'
  | 'nur_tna_na'
  | 'nur_notarzt'
  | 'hoehere_qualifikation'
  | 'nicht_vorgesehen'
  | 'in_planung'
  | 'ohne_angabe';

export interface FreigabeBewertung {
  art: FreigabeArt;
  /** Kurztext für Badge */
  label: string;
  /** Erläuterung der Rechtsgrundlage / was zu tun ist */
  hinweis: string;
  vorabdelegiert: boolean;
  /** Passende Fußnote(n) aus der Tabelle, wörtlich */
  fussnoten: string[];
  zelle: Zelle | null;
}

const RANG: Record<Exclude<Level, 'in_planung'>, number> = { RS: 1, NotSan: 2, TNA_NA: 3, Notarzt: 4 };

export function rangVon(q: Qualifikation): number {
  return q === 'RS' ? 1 : 2;
}

export const QUALI_NAME: Record<Qualifikation, string> = {
  RS: 'Rettungssanitäter/in',
  NotSan: 'Notfallsanitäter/in',
  NotSanAzubi: 'NotSan in Ausbildung',
};

export const LEVEL_NAME: Record<Level, string> = {
  RS: 'RS',
  NotSan: 'NotSan',
  TNA_NA: 'TNA / NA',
  Notarzt: 'Notarzt',
  in_planung: 'in Planung',
};

/** Fußnoten, deren Sternmarke exakt zur Zelle passt (z. B. "*" vs. "**") */
export function passendeFussnoten(f: Pick<Freigabe, 'fussnoten'>, zelle: Zelle | null, code: BereichCode): string[] {
  if (!zelle?.fussnote) return [];
  const marke = zelle.fussnote;
  const kandidaten = f.fussnoten.filter((n) => n.startsWith(marke) && n[marke.length] !== '*');
  const mitCode = kandidaten.filter((n) => new RegExp(`(^|[^A-Z-])${code.replace(' ', '\\s')}([^A-Z]|$)`).test(n.slice(marke.length)));
  return mitCode.length ? mitCode : kandidaten;
}

export function bewerte(f: Pick<Freigabe, 'zellen' | 'fussnoten'>, code: BereichCode, q: Qualifikation): FreigabeBewertung {
  const zelle = f.zellen[code] ?? null;
  const fussnoten = passendeFussnoten(f, zelle, code);
  const basis = { vorabdelegiert: !!zelle?.vorabdelegiert, fussnoten, zelle };

  if (!zelle) {
    return { ...basis, art: 'nicht_vorgesehen', label: 'nicht vorgesehen', hinweis: 'In deinem Bereich nicht vorgesehen (graues Feld).' };
  }
  if (zelle.level === null) {
    return {
      ...basis,
      art: 'ohne_angabe',
      label: 'ohne Angabe',
      hinweis: 'Feld ist farbig, nennt aber keine Qualifikation – bei der ÄLRD klären.',
    };
  }
  if (zelle.level === 'in_planung') {
    return { ...basis, art: 'in_planung', label: 'in Planung', hinweis: 'Schulung von SAA und BPR / Maßnahme in Planung (▶).' };
  }

  const benoetigt = RANG[zelle.level];
  const eigener = rangVon(q);
  const azubi = q === 'NotSanAzubi'
    ? ' Als Auszubildende/r nur unter Aufsicht der praxisanleitenden NotSan, sofern die ÄLRD dies zulässt (S. 15).'
    : '';

  if (benoetigt <= eigener) {
    if (q === 'RS') {
      return {
        ...basis,
        art: 'erlaubt',
        label: 'RS',
        hinweis: 'Nur im rechtfertigenden Notstand (§ 34 StGB): lebensbedrohlicher Zustand oder wesentliche Folgeschäden zu erwarten, keine weniger invasive Alternative – und du beherrschst die Maßnahme sicher (S. 15).',
      };
    }
    if (zelle.vorabdelegiert) {
      return {
        ...basis,
        art: 'erlaubt',
        label: 'NotSan ★',
        hinweis: `Vorabdelegiert durch die ÄLRD (§ 4 Abs. 2 Nr. 2c NotSanG). Indikation, Kontraindikationen und Durchführungsvorgaben müssen exakt der SAA entsprechen.${azubi}`,
      };
    }
    return {
      ...basis,
      art: 'erlaubt',
      label: LEVEL_NAME[zelle.level],
      hinweis: `Durchführung durch NotSan nach Vorgabe der SAA / des BPR (Rechtsgrundlagen S. 14–16).${azubi}`,
    };
  }

  if (zelle.level === 'TNA_NA' && eigener >= 2) {
    return {
      ...basis,
      art: 'nur_tna_na',
      label: 'TNA / NA',
      hinweis: 'Nur nach Delegation durch Telenotarzt oder Notarzt (Einzelfalldelegation, 2b). Komplikationen sofort an den TNA melden (S. 16).',
    };
  }
  if (zelle.level === 'Notarzt' || zelle.level === 'TNA_NA') {
    return { ...basis, art: 'nur_notarzt', label: LEVEL_NAME[zelle.level], hinweis: 'Ärztliche Maßnahme – vorbereiten, nicht selbst durchführen.' };
  }
  return {
    ...basis,
    art: 'hoehere_qualifikation',
    label: LEVEL_NAME[zelle.level],
    hinweis: `Mindestqualifikation in deinem Bereich: ${LEVEL_NAME[zelle.level]}.`,
  };
}

/** Sortierreihenfolge: was ich darf zuerst */
export const ART_REIHENFOLGE: FreigabeArt[] = [
  'erlaubt',
  'nur_tna_na',
  'hoehere_qualifikation',
  'nur_notarzt',
  'ohne_angabe',
  'in_planung',
  'nicht_vorgesehen',
];

/** Zusammenfassung über alle Tabellen eines Themas: bestes erreichbares Ergebnis */
export function besteBewertung(liste: Freigabe[], code: BereichCode, q: Qualifikation): FreigabeBewertung | null {
  let beste: FreigabeBewertung | null = null;
  for (const f of liste) {
    const b = bewerte(f, code, q);
    if (!beste || ART_REIHENFOLGE.indexOf(b.art) < ART_REIHENFOLGE.indexOf(beste.art)) beste = b;
  }
  return beste;
}

/** Für die Vergleichsansicht: in wie vielen Bereichen ist eine Qualifikation ausreichend? */
export function bereicheMitFreigabe(f: Pick<Freigabe, 'zellen' | 'fussnoten'>, q: Qualifikation, codes: BereichCode[]): BereichCode[] {
  return codes.filter((c) => bewerte(f, c, q).art === 'erlaubt');
}
