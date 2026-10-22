import { describe, expect, it } from 'vitest';

import { auswertung, FAELLE } from '../src/logic/praxis';
import { neueRea, protokolliere, REVERSIBLE_URSACHEN, type ReaZustand } from '../src/logic/rea';

const MIN = 60_000;
const t0 = 1_000_000;

function vfFall(fehler: { epiZuFrueh?: boolean; amioDosis?: number } = {}): ReaZustand {
  let z = neueRea('erwachsen', t0);
  let t = t0;
  const analyse = () => (z = protokolliere(z, 'analyse', 'Analyse', (t += 0), { rhythmus: 'schockbar' }));
  for (let i = 1; i <= 5; i++) {
    analyse();
    z = protokolliere(z, 'schock', `${i}. Schock`, (t += 5_000));
    if (i === 2 && fehler.epiZuFrueh) z = protokolliere(z, 'epinephrin', 'Epinephrin', (t += 5_000), { dosisMg: 1 });
    if (i === 3) {
      z = protokolliere(z, 'epinephrin', 'Epinephrin', (t += 5_000), { dosisMg: 1 });
      z = protokolliere(z, 'amiodaron', 'Amiodaron', (t += 5_000), { dosisMg: fehler.amioDosis ?? 300 });
    }
    if (i === 5) z = protokolliere(z, 'amiodaron', 'Amiodaron', (t += 5_000), { dosisMg: 150 });
    t = t0 + i * 2 * MIN;
  }
  z = protokolliere(z, 'epinephrin', 'Epinephrin', t0 + 2 * 2 * MIN + 4 * MIN + 10_000, { dosisMg: 1 });
  z = protokolliere(z, 'ende', 'Ende', t0 + 10 * MIN);
  return z;
}

describe('Fallbeispiele', () => {
  it('haben eindeutige IDs und Kinderfälle mit Gewicht', () => {
    expect(new Set(FAELLE.map((f) => f.id)).size).toBe(FAELLE.length);
    for (const f of FAELLE.filter((x) => x.modus === 'kind')) expect(f.gewichtKg).toBeGreaterThan(0);
  });
});

describe('Auswertung Beobachtungsprotokoll', () => {
  it('bewertet korrekten VF-Ablauf: Epinephrin und Amiodaron nach dem 3., Amiodaron 2 nach dem 5. Schock', () => {
    const p = auswertung(vfFall());
    expect(p.find((x) => x.titel.startsWith('1. Epinephrin'))?.bewertung).toBe('ok');
    expect(p.find((x) => x.titel === '1. Amiodaron nach dem 3. Schock')?.bewertung).toBe('ok');
    expect(p.find((x) => x.titel === '2. Amiodaron nach dem 5. Schock')?.bewertung).toBe('ok');
  });

  it('erkennt Epinephrin vor dem 3. Schock', () => {
    const p = auswertung(vfFall({ epiZuFrueh: true }));
    expect(p.find((x) => x.titel === '1. Epinephrin nach dem 2. Schock')?.bewertung).toBe('abweichung');
  });

  it('erkennt falsche Amiodaron-Dosis', () => {
    const p = auswertung(vfFall({ amioDosis: 150 }));
    const d = p.find((x) => x.titel.startsWith('1. Amiodaron: Dosis'));
    expect(d?.bewertung).toBe('abweichung');
    expect(d?.text).toContain('300 mg');
  });

  it('erkennt zu lange Epinephrin-Intervalle und fehlende Analysen', () => {
    let z = neueRea('erwachsen', t0);
    z = protokolliere(z, 'analyse', 'Asystolie', t0, { rhythmus: 'nicht_schockbar' });
    z = protokolliere(z, 'epinephrin', 'Epinephrin', t0 + 30_000, { dosisMg: 1 });
    z = protokolliere(z, 'analyse', 'Asystolie', t0 + 4 * MIN, { rhythmus: 'nicht_schockbar' });
    z = protokolliere(z, 'epinephrin', 'Epinephrin', t0 + 30_000 + 7 * MIN, { dosisMg: 1 });
    z = protokolliere(z, 'ende', 'Ende', t0 + 9 * MIN);
    const p = auswertung(z);
    expect(p.find((x) => x.titel.startsWith('2. Epinephrin nach 7:00'))?.bewertung).toBe('abweichung');
    expect(p.find((x) => x.titel.startsWith('Analyse 2 nach 4:00'))?.bewertung).toBe('abweichung');
    expect(p.find((x) => x.titel.startsWith('1. Epinephrin 0:30 nach'))?.bewertung).toBe('hinweis');
  });

  it('prüft Kinderdosis nach Gewicht und listet offene 4 Hs/HITS', () => {
    let z = neueRea('kind', t0, 20);
    z = protokolliere(z, 'analyse', 'Asystolie', t0, { rhythmus: 'nicht_schockbar' });
    z = protokolliere(z, 'epinephrin', 'Epinephrin', t0 + 20_000, { dosisMg: 2 });
    z = protokolliere(z, 'ursache', 'Hypoxie', t0 + 40_000, { ursache: REVERSIBLE_URSACHEN.kind.hs[0] });
    z = protokolliere(z, 'ende', 'Ende', t0 + 3 * MIN);
    const p = auswertung(z);
    expect(p.find((x) => x.titel.startsWith('Epinephrin: Dosis 2 mg'))?.text).toContain('0,2 mg');
    const ursachen = p.find((x) => x.titel.startsWith('4 Hs und HITS'))!;
    expect(ursachen.titel).toContain('1 von 8');
    expect(ursachen.text).not.toContain('Hypoxie,');
  });

  it('erkennt Schock bei Asystolie und Amiodaron ohne VF', () => {
    let z = neueRea('erwachsen', t0);
    z = protokolliere(z, 'analyse', 'Asystolie', t0, { rhythmus: 'nicht_schockbar' });
    z = protokolliere(z, 'schock', 'Schock', t0 + 10_000);
    z = protokolliere(z, 'amiodaron', 'Amiodaron', t0 + 20_000, { dosisMg: 300 });
    const p = auswertung(z);
    expect(p.some((x) => x.titel.startsWith('Schock bei Asystolie') && x.bewertung === 'abweichung')).toBe(true);
    expect(p.some((x) => x.titel === 'Amiodaron ohne VF / pVT')).toBe(true);
  });
});

describe('Zyklus-Timer', () => {
  it('läuft erst nach manuellem Start und zeigt Überziehung negativ', async () => {
    const { zyklusRest } = await import('../src/logic/rea');
    let z = neueRea('erwachsen', t0);
    expect(zyklusRest(z, t0 + 10_000)).toBeNull();
    z = protokolliere(z, 'zyklus', 'Zyklus gestartet', t0 + 20_000);
    expect(zyklusRest(z, t0 + 20_000 + 30_000)).toBe(90_000);
    expect(zyklusRest(z, t0 + 20_000 + 2 * MIN + 5_000)).toBe(-5_000);
  });
});
