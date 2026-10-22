// Dosisrechner auf Basis der kuratierten Dosisregeln (data/curated/dosisregeln.json).
// Es wird nur gerechnet, was die Regel hergibt: Dosis pro kg × Gewicht, gedeckelt
// durch die angegebene Maximaldosis, und das Volumen bei bekannter Konzentration.
// Keine Gewichtsschätzung – das Kompendium nennt dafür keine Formel.
import type { Bedingung, Dosisregel } from '../data/typen';

export interface Patient {
  erwachsen: boolean;
  alterJahre?: number;
  gewichtKg?: number;
}

export type Passung = 'passt' | 'passt_nicht' | 'angaben_fehlen';

export interface Dosisergebnis {
  regel: Dosisregel;
  passung: Passung;
  /** Begründung, warum die Regel nicht passt oder was fehlt */
  grund?: string;
  dosis?: number;
  einheit: string;
  /** true, wenn die Maximaldosis die Rechnung begrenzt hat */
  gedeckelt: boolean;
  volumenMl?: number;
  /** Höchste kumulative Dosis (z. B. Morphin 10 mg, Fentanyl 2 µg/kgKG) */
  maxGesamt?: number;
  rechenweg: string;
}

function zahl(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('de-DE', { maximumFractionDigits: 3 });
}

/** Rundet auf sinnvolle Nachkommastellen ohne Fließkomma-Artefakte (0,1 × 3 = 0,30000000000000004) */
export function runde(n: number, stellen = 3): number {
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
}

function grenze(wert: number, min?: number, minInkl?: boolean, max?: number, maxInkl?: boolean): boolean {
  if (min !== undefined && (minInkl ? wert < min : wert <= min)) return false;
  if (max !== undefined && (maxInkl ? wert > max : wert >= max)) return false;
  return true;
}

function bereichText(name: string, einheit: string, min?: number, minInkl?: boolean, max?: number, maxInkl?: boolean): string {
  const teile: string[] = [];
  if (min !== undefined) teile.push(`${minInkl ? '≥' : '>'} ${zahl(min)} ${einheit}`);
  if (max !== undefined) teile.push(`${maxInkl ? '≤' : '<'} ${zahl(max)} ${einheit}`);
  return `${name} ${teile.join(' und ')}`;
}

/** Prüft die Bedingungen einer Regel. Liefert null, wenn alles passt. */
export function pruefeBedingung(b: Bedingung, p: Patient): { passung: Passung; grund: string } | null {
  if (b.erwachsen !== undefined && b.erwachsen !== p.erwachsen) {
    return { passung: 'passt_nicht', grund: b.erwachsen ? 'gilt für Erwachsene' : 'gilt für Kinder' };
  }
  if (b.alterMin !== undefined || b.alterMax !== undefined) {
    const text = bereichText('Alter', 'Jahre', b.alterMin, b.alterMinInkl, b.alterMax, b.alterMaxInkl);
    if (p.alterJahre === undefined) return { passung: 'angaben_fehlen', grund: `Alter eingeben (${text})` };
    if (!grenze(p.alterJahre, b.alterMin, b.alterMinInkl, b.alterMax, b.alterMaxInkl)) {
      return { passung: 'passt_nicht', grund: `gilt für ${text}` };
    }
  }
  if (b.gewichtMin !== undefined || b.gewichtMax !== undefined) {
    const text = bereichText('Gewicht', 'kg', b.gewichtMin, b.gewichtMinInkl, b.gewichtMax, b.gewichtMaxInkl);
    if (p.gewichtKg === undefined) return { passung: 'angaben_fehlen', grund: `Gewicht eingeben (${text})` };
    if (!grenze(p.gewichtKg, b.gewichtMin, b.gewichtMinInkl, b.gewichtMax, b.gewichtMaxInkl)) {
      return { passung: 'passt_nicht', grund: `gilt für ${text}` };
    }
  }
  return null;
}

export function berechne(regel: Dosisregel, p: Patient): Dosisergebnis {
  const einheit = regel.dosis.einheit;
  const basis = { regel, einheit, gedeckelt: false };
  const fehler = pruefeBedingung(regel.bedingung, p);
  if (fehler) return { ...basis, ...fehler, rechenweg: '' };

  let dosis: number;
  let rechenweg: string;
  let gedeckelt = false;
  if (regel.dosis.art === 'fix') {
    dosis = regel.dosis.wert;
    rechenweg = `${zahl(dosis)} ${einheit} (feste Dosis)`;
  } else {
    if (p.gewichtKg === undefined) {
      return { ...basis, passung: 'angaben_fehlen', grund: 'Gewicht eingeben', rechenweg: '' };
    }
    const roh = runde(regel.dosis.wert * p.gewichtKg);
    rechenweg = `${zahl(regel.dosis.wert)} ${einheit}/kgKG × ${zahl(p.gewichtKg)} kg = ${zahl(roh)} ${einheit}`;
    dosis = roh;
    if (regel.dosis.max !== undefined && roh > regel.dosis.max) {
      dosis = regel.dosis.max;
      gedeckelt = true;
      rechenweg += ` → begrenzt auf max. ${zahl(regel.dosis.max)} ${einheit}`;
    }
  }

  let volumenMl: number | undefined;
  if (regel.konzentration && regel.konzentration.einheit === `${einheit}/ml`) {
    volumenMl = runde(dosis / regel.konzentration.wert, 2);
    rechenweg += ` ≙ ${zahl(volumenMl)} ml bei ${zahl(regel.konzentration.wert)} ${regel.konzentration.einheit}`;
  }

  let maxGesamt: number | undefined;
  if (regel.maxGesamt) {
    if (regel.maxGesamt.wert !== undefined) maxGesamt = regel.maxGesamt.wert;
    else if (regel.maxGesamt.proKg !== undefined && p.gewichtKg !== undefined) {
      maxGesamt = runde(regel.maxGesamt.proKg * p.gewichtKg);
    }
  }

  return { ...basis, passung: 'passt', dosis, gedeckelt, volumenMl, maxGesamt, rechenweg };
}

/** Bei Titration: bisher gegeben + nächste Einzeldosis darf die Maximaldosis nicht überschreiten */
export function naechsteTitrationsdosis(ergebnis: Dosisergebnis, bisherGegeben: number): { dosis: number; rest: number } | null {
  if (ergebnis.passung !== 'passt' || ergebnis.dosis === undefined) return null;
  if (ergebnis.maxGesamt === undefined) return { dosis: ergebnis.dosis, rest: Infinity };
  const rest = runde(ergebnis.maxGesamt - bisherGegeben);
  if (rest <= 0) return { dosis: 0, rest: 0 };
  return { dosis: Math.min(ergebnis.dosis, rest), rest };
}

export function formatDosis(n: number | undefined, einheit: string): string {
  if (n === undefined) return '–';
  return `${zahl(n)} ${einheit}`;
}

/** Welche Angaben brauchen die Regeln für Erwachsene bzw. Kinder? */
export function benoetigteAngaben(regeln: Dosisregel[], erwachsen: boolean): { alter: boolean; gewicht: boolean } {
  const relevant = regeln.filter(
    (r) =>
      (r.bedingung.erwachsen === undefined || r.bedingung.erwachsen === erwachsen) &&
      (r.zielgruppe === 'alle' || r.zielgruppe === (erwachsen ? 'erwachsene' : 'kinder')),
  );
  return {
    alter: relevant.some((r) => r.bedingung.alterMin !== undefined || r.bedingung.alterMax !== undefined),
    gewicht: relevant.some(
      (r) =>
        r.dosis.art === 'proKg' ||
        r.maxGesamt?.proKg !== undefined ||
        r.bedingung.gewichtMin !== undefined ||
        r.bedingung.gewichtMax !== undefined,
    ),
  };
}
