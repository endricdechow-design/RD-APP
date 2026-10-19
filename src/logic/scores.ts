// Scores laut Kompendium: NEWS2 und qSOFA (BPR Sepsis, S. 155), Schockindex (S. 85).

export interface News2Eingabe {
  bewusstseinsveraenderung: boolean;
  atemfrequenz: number;
  rrSys: number;
  spo2: number;
  sauerstoff: boolean;
  herzfrequenz: number;
  temperatur: number;
}

export type News2Parameter = keyof News2Eingabe;

export interface News2Ergebnis {
  punkte: Record<News2Parameter, number>;
  summe: number;
  risiko: 'leicht' | 'moderat' | 'hoch';
  /** true, wenn ein Einzelparameter 3 Punkte hat (mindestens moderates Risiko) */
  einzelparameterDrei: boolean;
  text: string;
}

export function news2Punkte(e: News2Eingabe): Record<News2Parameter, number> {
  const af = e.atemfrequenz;
  const rr = e.rrSys;
  const sp = e.spo2;
  const hf = e.herzfrequenz;
  const t = e.temperatur;
  return {
    bewusstseinsveraenderung: e.bewusstseinsveraenderung ? 3 : 0,
    atemfrequenz: af <= 8 ? 3 : af <= 11 ? 1 : af <= 20 ? 0 : af <= 24 ? 2 : 3,
    rrSys: rr <= 90 ? 3 : rr <= 100 ? 2 : rr <= 110 ? 1 : rr <= 219 ? 0 : 3,
    spo2: sp <= 91 ? 3 : sp <= 93 ? 2 : sp <= 95 ? 1 : 0,
    sauerstoff: e.sauerstoff ? 2 : 0,
    herzfrequenz: hf <= 40 ? 3 : hf <= 50 ? 1 : hf <= 90 ? 0 : hf <= 110 ? 1 : hf <= 130 ? 2 : 3,
    temperatur: t <= 35 ? 3 : t <= 36 ? 1 : t <= 38 ? 0 : t <= 39 ? 1 : 2,
  };
}

export function news2(e: News2Eingabe): News2Ergebnis {
  const punkte = news2Punkte(e);
  const summe = Object.values(punkte).reduce((a, b) => a + b, 0);
  const einzelparameterDrei = Object.values(punkte).some((p) => p === 3);
  let risiko: News2Ergebnis['risiko'] = summe >= 7 ? 'hoch' : summe >= 5 ? 'moderat' : 'leicht';
  if (risiko === 'leicht' && einzelparameterDrei) risiko = 'moderat';
  const text = {
    leicht: 'leichtes Risiko für eine Sepsis mit schwerem Krankheitsverlauf',
    moderat: 'moderates Risiko für eine Sepsis mit schwerem Krankheitsverlauf',
    hoch: 'hohes Risiko für eine Sepsis mit schwerem Krankheitsverlauf',
  }[risiko];
  return { punkte, summe, risiko, einzelparameterDrei, text };
}

export interface QsofaEingabe {
  rrSys: number;
  atemfrequenz: number;
  gcsUnter15: boolean;
  infektionsverdacht: boolean;
}

export function qsofa(e: QsofaEingabe): { punkte: number; hohesRisiko: boolean } {
  const punkte = (e.rrSys <= 100 ? 1 : 0) + (e.atemfrequenz >= 22 ? 1 : 0) + (e.gcsUnter15 ? 1 : 0);
  return { punkte, hohesRisiko: punkte >= 2 && e.infektionsverdacht };
}

/** Schockindex = Pulsfrequenz ÷ RR syst. (S. 85); > 0,9 ist ein Schockraumkriterium Trauma */
export function schockindex(hf: number, rrSys: number): { wert: number; ueber09: boolean } {
  const wert = Math.round((hf / rrSys) * 100) / 100;
  return { wert, ueber09: wert > 0.9 };
}
