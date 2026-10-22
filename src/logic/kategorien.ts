// Kategorien der Startseite – Gliederung wie im Kompendium (SAA / BPR).
import { alleMedikamentNamen, bpr, massnahmen } from '../data/kompendium';
import type { Bpr } from '../data/typen';

export type KategorieId =
  | 'medikamente'
  | 'massnahmen'
  | 'kreislaufstillstand'
  | 'leitsymptome'
  | 'krankheitsbilder'
  | 'trauma'
  | 'herangehensweise'
  | 'grundlagen';

export interface Kategorie {
  id: KategorieId;
  titel: string;
  untertitel: string;
  farbe: 'gruen' | 'blau' | 'orange' | 'rot' | 'lila';
  icon: string;
}

export const KATEGORIEN: Kategorie[] = [
  { id: 'medikamente', titel: 'Medikamente', untertitel: 'Standardarbeitsanweisungen (SAA)', farbe: 'gruen', icon: 'medkit' },
  { id: 'massnahmen', titel: 'Invasive Maßnahmen', untertitel: 'Standardarbeitsanweisungen (SAA)', farbe: 'blau', icon: 'bandage' },
  { id: 'kreislaufstillstand', titel: 'Kreislaufstillstand', untertitel: 'Behandlungspfade (BPR)', farbe: 'rot', icon: 'heart' },
  { id: 'leitsymptome', titel: 'Leitsymptome', untertitel: 'Behandlungspfade (BPR)', farbe: 'orange', icon: 'pulse' },
  { id: 'krankheitsbilder', titel: 'Krankheitsbilder A–Z', untertitel: 'Behandlungspfade (BPR)', farbe: 'orange', icon: 'list' },
  { id: 'trauma', titel: 'Trauma, MANV & Sonstiges', untertitel: 'Behandlungspfade (BPR)', farbe: 'orange', icon: 'car' },
  { id: 'herangehensweise', titel: 'Herangehensweise', untertitel: 'Survey, Schockraum, SINNHAFT, Atemweg', farbe: 'blau', icon: 'compass' },
  { id: 'grundlagen', titel: 'Grundlagen & Recht', untertitel: 'Recht, Aufklärung, TNA, Kindeswohl', farbe: 'lila', icon: 'document-text' },
];

const BPR_KATEGORIE: Partial<Record<KategorieId, Bpr['kategorie']>> = {
  kreislaufstillstand: 'kreislaufstillstand',
  leitsymptome: 'leitsymptom',
  krankheitsbilder: 'krankheitsbild',
  trauma: 'trauma',
  herangehensweise: 'herangehensweise',
  grundlagen: 'grundlagen',
};

export interface Eintrag {
  id: string;
  titel: string;
  route: string;
  art: 'medikament' | 'massnahme' | 'bpr';
  hinweis?: string;
}

export function eintraege(k: KategorieId): Eintrag[] {
  if (k === 'medikamente') {
    return alleMedikamentNamen().map((m) => ({
      id: m.id,
      titel: m.name,
      route: `/medikament/${m.id}`,
      art: 'medikament',
      hinweis: m.hatSAA ? undefined : 'ohne eigene SAA',
    }));
  }
  if (k === 'massnahmen') {
    return massnahmen.map((m) => ({ id: m.id, titel: m.name, route: `/massnahme/${m.id}`, art: 'massnahme' }));
  }
  const kat = BPR_KATEGORIE[k];
  return bpr.filter((b) => b.kategorie === kat).map((b) => ({ id: b.id, titel: b.titel, route: `/bpr/${b.id}`, art: 'bpr' }));
}
