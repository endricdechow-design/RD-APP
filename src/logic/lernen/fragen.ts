// Erzeugt Lernfragen ausschließlich aus den Kompendium-Daten.
// Jede Frage trägt ihre Quellseite. Falsche Antwortoptionen stammen aus anderen
// Einträgen desselben Feldes und werden gegen die richtige Antwort abgeglichen.
import {
  bereich,
  dosisregeln,
  freigaben,
  massnahmen,
  medikamente,
  zeilen,
} from '../../data/kompendium';
import type { BereichCode, Qualifikation } from '../../data/typen';
import { berechne, formatDosis, type Patient } from '../dosis';
import { bewerte, LEVEL_NAME } from '../freigabe';
import { news2Punkte, type News2Eingabe } from '../scores';

export type Thema = 'medikamente' | 'massnahmen' | 'dosierung' | 'freigaben' | 'reanimation' | 'scores';

export const THEMEN: { id: Thema; name: string; beschreibung: string }[] = [
  { id: 'medikamente', name: 'Medikamente', beschreibung: 'Indikationen, Kontraindikationen, Konzentrationen, Altersgrenzen' },
  { id: 'dosierung', name: 'Dosierungen', beschreibung: 'Rechnen mit Gewicht und Alter wie im Einsatz' },
  { id: 'massnahmen', name: 'Invasive Maßnahmen', beschreibung: 'Indikationen, Kontraindikationen, Erfolgsprüfung' },
  { id: 'reanimation', name: 'Reanimation', beschreibung: 'Medikamente und Abläufe ALS / PLS' },
  { id: 'freigaben', name: 'Freigaben im Bereich', beschreibung: 'Wer darf was – in deinem Rettungsdienstbereich' },
  { id: 'scores', name: 'Scores', beschreibung: 'NEWS2 und qSOFA' },
];

export interface Frage {
  id: string;
  thema: Thema;
  frage: string;
  optionen: string[];
  richtig: number;
  erklaerung: string;
  seite: number;
}

export interface FragenKontext {
  qualifikation: Qualifikation;
  bereich?: BereichCode;
}

// --- deterministischer Zufall, damit Fragen-IDs und Optionen stabil sind -----

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mische<T>(liste: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Bigramm-Ähnlichkeit (Dice), um Schreibvarianten derselben Aussage zu erkennen */
export function aehnlichkeit(a: string, b: string): number {
  const bigramme = (s: string) => {
    const t = s.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
    const m = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
    return { m, n: Math.max(0, t.length - 1) };
  };
  const x = bigramme(a);
  const y = bigramme(b);
  if (!x.n || !y.n) return a === b ? 1 : 0;
  let gemeinsam = 0;
  for (const [k, v] of x.m) gemeinsam += Math.min(v, y.m.get(k) ?? 0);
  return (2 * gemeinsam) / (x.n + y.n);
}

const FUELLWOERTER = new Set([
  'keine', 'nicht', 'durch', 'sowie', 'schwere', 'schwerer', 'schweres', 'akute', 'akuter', 'akutes', 'aktuell', 'aktuelle',
  'aktuelles', 'bekannte', 'bekannter', 'gegen', 'oder', 'patienten', 'erhöhte', 'erhöhter', 'bestehende', 'anwendung',
  'kinder', 'erwachsene', 'jahre', 'insbesondere', 'zustand', 'zustände', 'wirkstoff', 'substanz', 'ggf.',
]);

/** Inhaltswörter (Wortanfänge), um inhaltliche Überschneidungen zu erkennen – z. B. "Blutung" */
export function stichworte(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zäöüß-]+/)
      .flatMap((w) => w.split('-'))
      .filter((w) => w.length >= 5 && !FUELLWOERTER.has(w))
      .map((w) => w.slice(0, 6)),
  );
}

/** Ungeeignete Ablenker: Fragmente und Platzhalter wie "entfällt" / "keine" */
const UNGEEIGNET = /^(keine?\b|entfällt|bei korrekter|siehe\b)/i;

/** Baut eine Frage mit 3 Ablenkern; null, wenn nicht genug eindeutige Ablenker existieren */
function baue(
  id: string,
  thema: Thema,
  frage: string,
  richtig: string,
  kandidaten: string[],
  ausschluss: string[],
  erklaerung: string,
  seite: number,
  textoptionen = false,
): Frage | null {
  const verboten = new Set([norm(richtig), ...ausschluss.map(norm)]);
  const gesehen = new Set<string>();
  const ablenker: string[] = [];
  for (const k of mische(kandidaten, hash(id))) {
    const n = norm(k);
    if (verboten.has(n) || gesehen.has(n) || k.length > 140) continue;
    if (textoptionen) {
      // Fragmente, Platzhalter und Schreibvarianten einer richtigen Antwort sind keine Ablenker
      if (k.length < 6 || UNGEEIGNET.test(k)) continue;
      if ([...verboten].some((v) => aehnlichkeit(v, n) > 0.8)) continue;
      // Inhaltliche Überschneidung (z. B. "innere Blutung" bei einem Antikoagulans) wäre irreführend
      const eigene = new Set(ausschluss.concat(richtig).flatMap((a) => [...stichworte(a)]));
      if ([...stichworte(k)].some((w) => eigene.has(w))) continue;
    }
    gesehen.add(n);
    ablenker.push(k);
    if (ablenker.length === 3) break;
  }
  if (ablenker.length < 3) return null;
  const optionen = mische([richtig, ...ablenker], hash(id + ':o'));
  return { id, thema, frage, optionen, richtig: optionen.indexOf(richtig), erklaerung, seite };
}

// --- Medikamente ----------------------------------------------------------------

function medikamentFragen(): Frage[] {
  const fragen: Frage[] = [];
  const feld = (m: (typeof medikamente)[number], k: 'konzentration' | 'gruppe' | 'altersbegrenzung') =>
    zeilen(m.abschnitte[k]).join(' ').trim();

  for (const m of medikamente) {
    for (const k of ['konzentration', 'gruppe', 'altersbegrenzung'] as const) {
      const wert = feld(m, k);
      if (!wert || ['entfällt', 'keine'].includes(wert)) continue;
      const titel = { konzentration: 'Welche Konzentration', gruppe: 'Zu welcher Arzneimittelgruppe gehört', altersbegrenzung: 'Welche Altersbegrenzung gilt für' }[k];
      const frage = k === 'konzentration' ? `${titel} hat ${m.name} laut SAA?` : `${titel} ${m.name}?`;
      const andere = medikamente.filter((x) => x.id !== m.id).map((x) => feld(x, k)).filter((x) => x && !['entfällt', 'keine'].includes(x));
      const f = baue(`med:${m.id}:${k}`, 'medikamente', frage, wert, andere, [], `SAA ${m.name}: ${wert}`, m.seite, true);
      if (f) fragen.push(f);
    }

    const indik = zeilen(m.abschnitte.indikationen).filter((t) => !t.endsWith(':'));
    for (const [i, ind] of indik.entries()) {
      const andere = medikamente.filter((x) => x.id !== m.id).flatMap((x) => zeilen(x.abschnitte.indikationen));
      const f = baue(`med:${m.id}:ind:${i}`, 'medikamente', `Welche ist eine Indikation für ${m.name}?`, ind, andere, indik, `Indikationen ${m.name}: ${indik.join('; ')}`, m.seite, true);
      if (f) fragen.push(f);
    }

    const ki = zeilen(m.abschnitte.keineAnwendung).filter((t) => !/entfällt/.test(t) && !t.endsWith(':'));
    for (const [i, k] of ki.entries()) {
      const andere = medikamente
        .filter((x) => x.id !== m.id)
        .flatMap((x) => zeilen(x.abschnitte.keineAnwendung))
        .filter((t) => !/überempfindlichkeit/i.test(t));
      if (/überempfindlichkeit/i.test(k)) continue; // gilt für fast alle – als Frage wertlos
      const f = baue(
        `med:${m.id}:ki:${i}`,
        'medikamente',
        `${m.name}: Bei welchem Befund gilt „Keine Anwendung“?`,
        k,
        andere,
        [...ki, ...zeilen(m.abschnitte.nutzenRisiko), ...zeilen(m.abschnitte.uaw)],
        `Keine Anwendung von ${m.name}, wenn: ${ki.join('; ')}`,
        m.seite,
        true,
      );
      if (f) fragen.push(f);
    }
  }
  return fragen;
}

// --- Maßnahmen -----------------------------------------------------------------

function massnahmenFragen(): Frage[] {
  const fragen: Frage[] = [];
  for (const m of massnahmen) {
    for (const k of ['indikationen', 'kontraindikationen', 'erfolgspruefung'] as const) {
      const eigene = zeilen(m.abschnitte[k]).filter((t) => !t.endsWith(':') && t.length > 3);
      const titel = {
        indikationen: `Welche ist eine Indikation für: ${m.name}?`,
        kontraindikationen: `Welche ist eine Kontraindikation für: ${m.name}?`,
        erfolgspruefung: `Woran prüfst du den Erfolg bei: ${m.name}?`,
      }[k];
      for (const [i, wert] of eigene.entries()) {
        const andere = massnahmen.filter((x) => x.id !== m.id).flatMap((x) => zeilen(x.abschnitte[k]));
        const f = baue(`mas:${m.id}:${k}:${i}`, 'massnahmen', titel, wert, andere, eigene, `SAA ${m.name} – ${eigene.join('; ')}`, m.seite, true);
        if (f) fragen.push(f);
      }
    }
  }
  return fragen;
}

// --- Dosierung ------------------------------------------------------------------

const BEISPIEL_PATIENTEN: Patient[] = [
  { erwachsen: true, alterJahre: 45, gewichtKg: 80 },
  { erwachsen: true, alterJahre: 72, gewichtKg: 60 },
  { erwachsen: false, alterJahre: 4, gewichtKg: 16 },
  { erwachsen: false, alterJahre: 8, gewichtKg: 26 },
  { erwachsen: false, alterJahre: 11, gewichtKg: 36 },
];

function patientText(p: Patient): string {
  return `${p.erwachsen ? 'Erwachsene/r' : 'Kind'}, ${p.alterJahre} Jahre, ${p.gewichtKg} kg`;
}

function dosisFragen(): Frage[] {
  const fragen: Frage[] = [];
  for (const r of dosisregeln) {
    for (const p of BEISPIEL_PATIENTEN) {
      const e = berechne(r, p);
      if (e.passung !== 'passt' || e.dosis === undefined) continue;
      const richtig = formatDosis(e.dosis, e.einheit) + (e.volumenMl !== undefined ? ` (${formatDosis(e.volumenMl, 'ml')})` : '');
      const faktoren = [0.5, 2, 10, 0.1, 1.5, 3];
      const andere = faktoren.map((f) => {
        const d = Math.round(e.dosis! * f * 1000) / 1000;
        const v = e.volumenMl !== undefined ? Math.round(e.volumenMl * f * 100) / 100 : undefined;
        return formatDosis(d, e.einheit) + (v !== undefined ? ` (${formatDosis(v, 'ml')})` : '');
      });
      const med = medikamente.find((m) => m.id === r.medikament)?.name ?? r.medikament;
      const frage = `${r.kontext}: ${patientText(p)}. Einzeldosis ${med} ${r.applikation}${r.schritt ? ` ${r.schritt}` : ''}?`;
      const f = baue(`dos:${r.id}:${p.alterJahre}:${p.gewichtKg}`, r.kontext === 'Reanimation' ? 'reanimation' : 'dosierung', frage, richtig, andere, [], `${e.rechenweg}. Beleg: „${r.beleg.join(' … ')}“`, r.seite);
      if (f) fragen.push(f);
    }
  }
  return fragen;
}

// --- Freigaben im eigenen Bereich ---------------------------------------------------

function freigabeFragen(kontext: FragenKontext): Frage[] {
  if (!kontext.bereich) return [];
  const code = kontext.bereich;
  const name = bereich(code)?.name ?? code;
  const fragen: Frage[] = [];
  const optionen = ['RS', 'NotSan', 'TNA / NA', 'Notarzt', 'in deinem Bereich nicht vorgesehen'];
  for (const f of freigaben) {
    const z = f.zellen[code];
    const richtig = !z ? optionen[4] : z.level && z.level !== 'in_planung' ? LEVEL_NAME[z.level] : null;
    if (!richtig) continue;
    const frage = baue(
      `frei:${code}:${f.tabelle}`,
      'freigaben',
      `${name}: Welche Mindestqualifikation gilt für „${f.titel}“${f.kontext ? ` (${f.kontext})` : ''}?`,
      richtig,
      optionen,
      [],
      `${bewerte(f, code, kontext.qualifikation).hinweis} Tabelle auf S. ${f.seite}.`,
      f.seite,
    );
    if (frage) fragen.push(frage);
  }
  return fragen;
}

// --- Reanimation (feste Fakten aus S. 91–94, 100) ------------------------------------

function reaFragen(): Frage[] {
  const f: (Frage | null)[] = [
    baue('rea:epi-zeitpunkt-vf', 'reanimation', 'ALS, VF / pVT: Wann wird Epinephrin erstmals gegeben?', 'nach dem 3. Schock', ['nach dem 1. Schock', 'sofort vor der ersten Analyse', 'nach dem 5. Schock', 'nur nach ROSC'], [], 'Bei VF / pVT nach dem 3. Schock, bei Asystolie / PEA so früh wie möglich (S. 100).', 100),
    baue('rea:epi-intervall', 'reanimation', 'In welchem Intervall wird Epinephrin bei der Reanimation wiederholt?', 'alle 4 Minuten', ['alle 2 Minuten', 'alle 6 Minuten', 'alle 10 Minuten', 'nur einmalig'], [], 'Wiederholung bis ROSC jeweils alle 4 Minuten, d. h. nach jedem zweiten Zyklus (S. 91, 100).', 100),
    baue('rea:amio-2', 'reanimation', 'ALS: Wann folgt die 2. Amiodaron-Gabe (150 mg)?', 'nach dem 5. Schock', ['nach dem 4. Schock', 'nach dem 6. Schock', '4 Minuten nach der 1. Gabe', 'nach dem 3. Schock'], [], '300 mg nach dem 3. Schock, 150 mg nach dem 5. Schock (S. 100).', 100),
    baue('rea:kompression-erw', 'reanimation', 'ALS: Welche Kompressionsfrequenz und -tiefe gelten?', '100 – 120/min, 5 – 6 cm', ['80 – 100/min, 4 – 5 cm', '120 – 140/min, 6 – 7 cm', '100 – 120/min, 3 – 4 cm', '60 – 80/min, 5 – 6 cm'], [], 'Thoraxkompressionen 100 – 120/min, Kompressionstiefe 5 – 6 cm (S. 91).', 91),
    baue('rea:pls-verhaeltnis', 'reanimation', 'PLS: In welchem Verhältnis werden Kompressionen und Beatmung durchgeführt?', '15:2', ['30:2', '5:1', '3:1', '30:1'], [], 'Thoraxkompressionen + Beatmung im Verhältnis 15:2 (S. 93).', 93),
    baue('rea:pls-initial', 'reanimation', 'PLS: Wie viele initiale Beatmungen werden gegeben?', '5', ['2', '3', '10', 'keine'], [], '5 initiale Beatmungen, dann Lebenszeichen prüfen (S. 93).', 93),
    baue('rea:pls-joule', 'reanimation', 'PLS: Mit welcher Energie wird defibrilliert?', '4 J/kgKG', ['2 J/kgKG', '1 J/kgKG', '6 J/kgKG', '150 J fix'], [], 'Defibrillation mit 4 J/kgKG (S. 93).', 93),
    baue('rea:elektroden', 'reanimation', 'ALS (neu 2026): Was erwägst du nach drei erfolglosen Defibrillationen?', 'Elektroden in anterior-posteriore Position wechseln', ['Energie halbieren', 'Defibrillation beenden', 'Amiodaron verdoppeln', 'auf AED-Modus wechseln'], [], 'Erwäge: Wechsel der Defibrillationselektroden in die anterior-posteriore Position nach drei erfolglosen Defibrillationsversuchen (S. 91).', 91),
    baue('rea:etco2', 'reanimation', 'Welcher etCO₂-Sollwert zeigt eine effektive Herzdruckmassage an?', '> 15 mmHg (2 kPa)', ['> 5 mmHg', '> 45 mmHg', '< 10 mmHg', '> 60 mmHg'], [], 'Effektivität der HDM; Soll: etCO2 > 15 mmHg (2 kPa) (S. 92).', 92),
  ];
  return f.filter((x): x is Frage => x !== null);
}

// --- Scores ---------------------------------------------------------------------------

function scoreFragen(): Frage[] {
  const basis: News2Eingabe = { bewusstseinsveraenderung: false, atemfrequenz: 16, rrSys: 130, spo2: 97, sauerstoff: false, herzfrequenz: 80, temperatur: 37 };
  const faelle: [string, Partial<News2Eingabe>][] = [
    ['Atemfrequenz 23/min', { atemfrequenz: 23 }],
    ['Atemfrequenz 8/min', { atemfrequenz: 8 }],
    ['RR syst. 98 mmHg', { rrSys: 98 }],
    ['SpO₂ 93 %', { spo2: 93 }],
    ['Herzfrequenz 115/min', { herzfrequenz: 115 }],
    ['Herzfrequenz 45/min', { herzfrequenz: 45 }],
    ['Temperatur 39,4 °C', { temperatur: 39.4 }],
    ['Temperatur 35,8 °C', { temperatur: 35.8 }],
    ['O₂-Gabe', { sauerstoff: true }],
    ['akute Bewusstseinsveränderung', { bewusstseinsveraenderung: true }],
  ];
  const fragen: (Frage | null)[] = faelle.map(([name, delta]) => {
    const p = news2Punkte({ ...basis, ...delta });
    const key = Object.keys(delta)[0] as keyof News2Eingabe;
    const richtig = `${p[key]} Punkte`;
    return baue(`score:news2:${name}`, 'scores', `NEWS2: Wie viele Punkte gibt „${name}“?`, richtig, ['0 Punkte', '1 Punkte', '2 Punkte', '3 Punkte'], [], 'NEWS2-Tabelle, BPR Sepsis (S. 155).', 155);
  });
  fragen.push(
    baue('score:qsofa', 'scores', 'qSOFA: Ab wie vielen Punkten besteht bei Infektionsverdacht ein hohes Risiko?', '2 Punkte', ['1 Punkt', '3 Punkte', '4 Punkte', '5 Punkte'], [], 'Errechnen sich 2 oder mehr Punkte und besteht der Verdacht einer Infektion, ergibt sich ein hohes Risiko (S. 155).', 155),
    baue('score:news2-hoch', 'scores', 'NEWS2: Ab welcher Summe besteht ein hohes Risiko?', '≥ 7 Punkte', ['≥ 3 Punkte', '≥ 5 Punkte', '≥ 10 Punkte', '≥ 12 Punkte'], [], '≥ 7 Punkte: hohes Risiko für eine Sepsis mit schwerem Krankheitsverlauf (S. 155).', 155),
  );
  return fragen.filter((x): x is Frage => x !== null);
}

// --- Gesamtpool ---------------------------------------------------------------------

/** Fragenpool gefiltert nach Qualifikation: RS lernt nur, was in seinem Bereich für RS freigegeben ist. */
export function fragenpool(kontext: FragenKontext): Frage[] {
  const alle = [
    ...medikamentFragen(),
    ...massnahmenFragen(),
    ...dosisFragen(),
    ...freigabeFragen(kontext),
    ...reaFragen(),
    ...scoreFragen(),
  ];
  if (kontext.qualifikation !== 'RS') return alle;

  const rsThemen = new Set(
    freigaben
      .filter((f) => Object.entries(f.zellen).some(([c, z]) => z?.level === 'RS' && (!kontext.bereich || c === kontext.bereich)))
      .map((f) => f.thema),
  );
  return alle.filter((fr) => {
    const [art, id] = fr.id.split(':');
    if (art === 'med' || art === 'mas') return rsThemen.has(id);
    if (art === 'dos') {
      const r = dosisregeln.find((d) => d.id === id);
      return !!r && rsThemen.has(r.medikament);
    }
    return true;
  });
}

export function nachThema(pool: Frage[], themen: Thema[]): Frage[] {
  const set = new Set(themen);
  return pool.filter((f) => set.has(f.thema));
}
