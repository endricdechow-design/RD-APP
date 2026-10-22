// Führt extrahierte und kuratierte Daten zu einem typisierten Modell zusammen.
import medikamenteRoh from '../../data/generated/medikamente.json';
import massnahmenRoh from '../../data/generated/massnahmen.json';
import freigabenRoh from '../../data/generated/freigaben.json';
import zuordnungRoh from '../../data/curated/freigabe-zuordnung.json';
import dosisRoh from '../../data/curated/dosisregeln.json';
import bprRoh from '../../data/curated/bpr.json';
import bereicheRoh from '../../data/curated/bereiche.json';

import type {
  Bereich,
  BereichCode,
  Bpr,
  Dosisregel,
  Freigabe,
  FreigabeTabelle,
  MassnahmeSAA,
  MedikamentSAA,
  Zuordnung,
} from './typen';

export const QUELLE = 'Gemeinsames Kompendium Rettungsdienst 2026';

export const medikamente = medikamenteRoh.daten as MedikamentSAA[];
export const massnahmen = massnahmenRoh.daten as MassnahmeSAA[];
export const dosisregeln = dosisRoh.regeln as Dosisregel[];
export const bpr = bprRoh.bpr as Bpr[];
export const bereiche = bereicheRoh.bereiche as Bereich[];
export const zusatzmedikamente = zuordnungRoh.zusatzmedikamente as { id: string; name: string; hinweis: string }[];

const tabellen = new Map(
  (freigabenRoh.daten as FreigabeTabelle[]).map((t) => [t.id, t] as const),
);

/** Dosistext einer Tabelle: kuratierte Fassung, sonst der extrahierte Text ohne Tabellenreste */
function dosistext(z: Zuordnung, t: FreigabeTabelle): string[] {
  if (z.dosistext) return z.dosistext;
  return t.text.filter((zeile) => zeile.trim().length > 0 && !zeile.startsWith('*'));
}

export const freigaben: Freigabe[] = (zuordnungRoh.zuordnung as Zuordnung[]).map((z) => {
  const t = tabellen.get(z.tabelle);
  if (!t) throw new Error(`Freigabetabelle ${z.tabelle} fehlt in data/generated/freigaben.json`);
  return { ...z, seite: t.seite, zellen: t.zellen, fussnoten: t.fussnoten, dosis: dosistext(z, t) };
});

export function medikament(id: string): MedikamentSAA | undefined {
  return medikamente.find((m) => m.id === id);
}

export function massnahme(id: string): MassnahmeSAA | undefined {
  return massnahmen.find((m) => m.id === id);
}

export function bereich(code: BereichCode): Bereich | undefined {
  return bereiche.find((b) => b.code === code);
}

export function freigabenFuer(thema: string): Freigabe[] {
  return freigaben.filter((f) => f.thema === thema);
}

export function freigabenImKontext(kontext: string): Freigabe[] {
  return freigaben.filter((f) => f.kontext === kontext);
}

export function dosisregelnFuer(medikamentId: string): Dosisregel[] {
  return dosisregeln.filter((r) => r.medikament === medikamentId);
}

/** Alle Medikamente, die in Freigabetabellen vorkommen, auch ohne eigene SAA (z. B. Metamizol) */
export function alleMedikamentNamen(): { id: string; name: string; hatSAA: boolean }[] {
  const liste = medikamente.map((m) => ({ id: m.id, name: m.name, hatSAA: true }));
  for (const z of zusatzmedikamente) liste.push({ id: z.id, name: z.name, hatSAA: false });
  return liste.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Textinhalt eines Abschnitts als einfache Zeilen */
export function zeilen(punkte: { text: string }[] | undefined): string[] {
  return (punkte ?? []).map((p) => p.text);
}

const normal = (s: string) => s.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Dosisregeln, die zu genau dieser Freigabetabelle gehören: gleiches Medikament,
 * gleicher Kontext und mindestens ein Belegtext steht im Dosistext der Tabelle.
 */
export function regelnFuerFreigabe(fr: Freigabe): Dosisregel[] {
  const text = normal(fr.dosis.join(' '));
  return dosisregeln.filter(
    (r) => r.medikament === fr.thema && r.kontext === fr.kontext && r.beleg.some((b) => text.includes(normal(b))),
  );
}
