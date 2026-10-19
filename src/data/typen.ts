// Datentypen für die Inhalte aus dem Gemeinsamen Kompendium Rettungsdienst 2026.
// Die Rohdaten entstehen durch tools/extract/extract_kompendium.py (data/generated)
// und werden durch data/curated ergänzt.

export type Qualifikation = 'RS' | 'NotSan' | 'NotSanAzubi';

/** Mindestqualifikation laut Freigabetabelle. RettAss ist beim Export bereits auf NotSan angehoben. */
export type Level = 'RS' | 'NotSan' | 'TNA_NA' | 'Notarzt' | 'in_planung';

export type BereichCode =
  | 'RKN' | 'HS' | 'DU' | 'KR' | 'VIE' | 'OB'
  | 'MH' | 'MG' | 'DN' | 'KLE' | 'AC' | 'EU'
  | 'SR AC' | 'BO' | 'HER' | 'BOT' | 'E' | 'UN'
  | 'REK' | 'DO' | 'GL' | 'TNA-BL' | 'GE'
  | 'HSK' | 'D' | 'HA' | 'HAM' | 'E-3A';

export interface Textpunkt {
  text: string;
  /** Text in "Mitternachtsblau kursiv": Ergänzung des Gemeinsamen Kompendiums gegenüber den SAA/BPR der 6-Länder-AG */
  ergaenzung: boolean;
  bold: boolean;
  bullet: boolean;
}

export type MedAbschnitt =
  | 'wirkstoff' | 'konzentration' | 'gruppe' | 'indikationen' | 'keineAnwendung'
  | 'altersbegrenzung' | 'nutzenRisiko' | 'dosierung' | 'uaw' | 'besonderheiten';

export interface MedikamentSAA {
  id: string;
  name: string;
  seite: number;
  abschnitte: Partial<Record<MedAbschnitt, Textpunkt[]>>;
}

export type MassnahmeAbschnitt =
  | 'indikationen' | 'kontraindikationen' | 'alternativen' | 'aufklaerung' | 'einwilligung'
  | 'durchfuehrung' | 'erfolgspruefung' | 'gegenmassnahmen' | 'verlaufskontrolle';

export interface MassnahmeSAA {
  id: string;
  name: string;
  seite: number;
  abschnitte: Partial<Record<MassnahmeAbschnitt, Textpunkt[]>>;
  /** Seite enthält eine Größen-/Farbtabelle (EGA), die nicht automatisch digitalisiert wird */
  groessentabelle?: boolean;
}

export interface Zelle {
  level: Level | null;
  /** Wert wie im Kompendium gedruckt (z. B. "RettAss" vor der Anhebung) */
  original: string | null;
  /** ★ – vorabdelegiert nach § 4 Abs. 2 Nr. 2c NotSanG */
  vorabdelegiert: boolean;
  fussnote: string | null;
}

export interface FreigabeTabelle {
  id: string;
  seite: number;
  seitentitel: string | null;
  titel: string | null;
  text: string[];
  zellen: Partial<Record<BereichCode, Zelle>>;
  fussnoten: string[];
}

export interface Zuordnung {
  tabelle: string;
  typ: 'medikament' | 'massnahme' | 'bpr';
  thema: string;
  titel: string;
  kontext: string | null;
  zielgruppe: 'erwachsene' | 'kinder' | 'alle';
  dosistext?: string[];
}

/** Freigabe = Tabelle + kuratierte Zuordnung */
export interface Freigabe extends Zuordnung {
  seite: number;
  zellen: FreigabeTabelle['zellen'];
  fussnoten: string[];
  dosis: string[];
}

export interface Bedingung {
  erwachsen?: boolean;
  alterMin?: number;
  alterMinInkl?: boolean;
  alterMax?: number;
  alterMaxInkl?: boolean;
  gewichtMin?: number;
  gewichtMinInkl?: boolean;
  gewichtMax?: number;
  gewichtMaxInkl?: boolean;
}

export interface Dosisregel {
  id: string;
  medikament: string;
  kontext: string;
  seite: number;
  beleg: string[];
  zielgruppe: 'erwachsene' | 'kinder' | 'alle';
  bedingung: Bedingung;
  dosis: { art: 'fix' | 'proKg'; wert: number; einheit: string; max?: number };
  applikation: string;
  wiederholung?: { intervallMin?: number; text: string };
  maxGesamt?: { wert?: number; proKg?: number; einheit: string; idealgewicht?: boolean };
  konzentration?: { wert: number; einheit: string; text: string; seite: number };
  hinweis?: string;
  schritt?: string;
}

export interface Bpr {
  id: string;
  titel: string;
  seite: number;
  bisSeite?: number;
  kategorie: 'herangehensweise' | 'kreislaufstillstand' | 'leitsymptom' | 'krankheitsbild' | 'trauma' | 'grundlagen';
  kontexte: string[];
  suchbegriffe?: string[];
}

export interface Bereich {
  code: BereichCode;
  name: string;
  teil?: string[];
}
