// Globaler App-Zustand: Profil, aktueller Patient, Lernstand, Abo. Lokal gespeichert.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { BereichCode, Qualifikation } from '../data/typen';
import type { Patient } from '../logic/dosis';
import type { Lernstand } from '../logic/lernen/training';

export interface Profil {
  qualifikation: Qualifikation;
  bereich: BereichCode | null;
}

export interface Einstellungen {
  darstellung: 'auto' | 'dunkel' | 'hell';
  pruefungsdatum: number | null;
}

export type Abo = 'basis' | 'pro';

interface Gespeichert {
  version: 1;
  eingerichtet: boolean;
  profil: Profil;
  einstellungen: Einstellungen;
  lernstand: Lernstand;
  abo: Abo;
  favoriten: string[];
  zuletzt: string[];
  tagesfragen: { tag: number; anzahl: number };
}

const SCHLUESSEL = 'nodexo:zustand:v1';

const START: Gespeichert = {
  version: 1,
  eingerichtet: false,
  profil: { qualifikation: 'NotSan', bereich: null },
  einstellungen: { darstellung: 'auto', pruefungsdatum: null },
  lernstand: {},
  abo: 'basis',
  favoriten: [],
  zuletzt: [],
  tagesfragen: { tag: 0, anzahl: 0 },
};

/** Fragen pro Tag im Basis-Abo */
export const BASIS_TAGESFRAGEN = 20;

interface AppKontext extends Gespeichert {
  geladen: boolean;
  /** Haftungshinweis in dieser Sitzung bestätigt – wird bewusst nicht gespeichert */
  hinweisBestaetigt: boolean;
  bestaetigeHinweis: () => void;
  patient: Patient;
  setzePatient: (p: Patient) => void;
  setzeProfil: (p: Profil) => void;
  richteEin: (p: Profil) => void;
  setzeEinstellungen: (e: Partial<Einstellungen>) => void;
  setzeLernstand: (l: Lernstand) => void;
  setzeAbo: (a: Abo) => void;
  schalteFavorit: (route: string) => void;
  merkeBesuch: (route: string) => void;
  zaehleFrage: () => void;
  fragenHeute: () => number;
  zuruecksetzen: () => void;
}

const Kontext = createContext<AppKontext | null>(null);

/** Zustand der laufenden App-Sitzung (übersteht Neuaufbau der Navigation, nicht aber einen Neustart) */
const sitzung = { hinweisBestaetigt: false };

const tagNr = (t: number) => Math.floor(t / 86_400_000);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [zustand, setZustand] = useState<Gespeichert>(START);
  const [geladen, setGeladen] = useState(false);
  // Patient ist bewusst flüchtig: jeder Einsatz beginnt ohne alte Patientendaten.
  const [patient, setzePatient] = useState<Patient>({ erwachsen: true });
  // Bei jedem App-Start neu zu bestätigen (gilt für die laufende Sitzung, wird nie gespeichert)
  const [hinweisBestaetigt, setHinweisBestaetigt] = useState(sitzung.hinweisBestaetigt);

  useEffect(() => {
    AsyncStorage.getItem(SCHLUESSEL)
      .then((roh) => {
        if (roh) setZustand({ ...START, ...(JSON.parse(roh) as Gespeichert) });
      })
      .catch(() => {})
      .finally(() => setGeladen(true));
  }, []);

  const aendere = useCallback((f: (z: Gespeichert) => Gespeichert) => {
    setZustand((alt) => {
      const neu = f(alt);
      AsyncStorage.setItem(SCHLUESSEL, JSON.stringify(neu)).catch(() => {});
      return neu;
    });
  }, []);

  const wert = useMemo<AppKontext>(
    () => ({
      ...zustand,
      geladen,
      hinweisBestaetigt,
      bestaetigeHinweis: () => {
        sitzung.hinweisBestaetigt = true;
        setHinweisBestaetigt(true);
      },
      patient,
      setzePatient,
      setzeProfil: (profil) => aendere((z) => ({ ...z, profil })),
      richteEin: (profil) => aendere((z) => ({ ...z, profil, eingerichtet: true })),
      setzeEinstellungen: (e) => aendere((z) => ({ ...z, einstellungen: { ...z.einstellungen, ...e } })),
      setzeLernstand: (lernstand) => aendere((z) => ({ ...z, lernstand })),
      setzeAbo: (abo) => aendere((z) => ({ ...z, abo })),
      schalteFavorit: (route) =>
        aendere((z) => ({
          ...z,
          favoriten: z.favoriten.includes(route) ? z.favoriten.filter((r) => r !== route) : [...z.favoriten, route],
        })),
      merkeBesuch: (route) =>
        aendere((z) => ({ ...z, zuletzt: [route, ...z.zuletzt.filter((r) => r !== route)].slice(0, 6) })),
      zaehleFrage: () =>
        aendere((z) => {
          const heute = tagNr(Date.now());
          const anzahl = z.tagesfragen.tag === heute ? z.tagesfragen.anzahl + 1 : 1;
          return { ...z, tagesfragen: { tag: heute, anzahl } };
        }),
      fragenHeute: () => (zustand.tagesfragen.tag === tagNr(Date.now()) ? zustand.tagesfragen.anzahl : 0),
      zuruecksetzen: () => aendere(() => START),
    }),
    [zustand, geladen, hinweisBestaetigt, patient, aendere],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useApp(): AppKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error('useApp außerhalb von AppStateProvider');
  return k;
}
