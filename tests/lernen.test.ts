import { describe, expect, it } from 'vitest';

import { fragenpool, nachThema, THEMEN } from '../src/logic/lernen/fragen';
import { beantworte, fortschritt, stelleZusammen } from '../src/logic/lernen/training';

describe('Fragenpool', () => {
  const notsan = fragenpool({ qualifikation: 'NotSan', bereich: 'DU' });
  const rs = fragenpool({ qualifikation: 'RS', bereich: 'DU' });

  it('enthält Fragen zu jedem Thema', () => {
    for (const t of THEMEN) expect(nachThema(notsan, [t.id]).length, t.id).toBeGreaterThan(0);
  });

  it('hat eindeutige IDs, genau eine richtige Antwort und 4 verschiedene Optionen', () => {
    const ids = new Set<string>();
    for (const f of notsan) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(f.optionen).toHaveLength(4);
      expect(new Set(f.optionen).size, f.id).toBe(4);
      expect(f.richtig).toBeGreaterThanOrEqual(0);
      expect(f.seite).toBeGreaterThan(0);
    }
  });

  it('ist deterministisch', () => {
    const nochmal = fragenpool({ qualifikation: 'NotSan', bereich: 'DU' });
    expect(nochmal.map((f) => f.optionen.join('|'))).toEqual(notsan.map((f) => f.optionen.join('|')));
  });

  it('bietet keine Schreibvariante einer richtigen Antwort als falsche Option an', () => {
    // "Bewusstseinstörung" (Tippfehler in anderer SAA) ≙ "Bewusstseinsstörung" (KI Fentanyl, S. 57)
    for (const f of notsan.filter((x) => x.id.startsWith('med:fentanyl:ki'))) {
      const falsch = f.optionen.filter((_, i) => i !== f.richtig);
      expect(falsch.some((o) => /bewusstseins?törung/i.test(o)), f.id).toBe(false);
    }
  });

  it('bietet keine inhaltlich überlappende Aussage als falsche Option an', () => {
    // Heparin: "gastrointestinale oder urogenitale Blutung" ist KI (S. 62) → "innere Blutung" (ASS) darf kein Ablenker sein
    for (const f of notsan.filter((x) => x.id.startsWith('med:heparin:ki'))) {
      const falsch = f.optionen.filter((_, i) => i !== f.richtig);
      expect(falsch.some((o) => /blutung/i.test(o)), `${f.id}: ${falsch.join(' | ')}`).toBe(false);
    }
  });

  it('enthält keine Textfragmente als Optionen', () => {
    for (const f of notsan.filter((x) => x.id.startsWith('mas:') || x.id.startsWith('med:'))) {
      for (const o of f.optionen) expect(o.length, `${f.id}: ${o}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('RS-Pool ist kleiner und enthält keine Morphin-Fragen', () => {
    expect(rs.length).toBeLessThan(notsan.length);
    expect(rs.some((f) => f.id.startsWith('med:morphin'))).toBe(false);
  });
});

describe('Training', () => {
  const pool = fragenpool({ qualifikation: 'NotSan', bereich: 'DU' });

  it('"Alles durcheinander" mischt mehrere Themen', () => {
    const s = stelleZusammen(pool, {}, 'gemischt', 0, 42);
    expect(s).toHaveLength(10);
    expect(new Set(s.map((f) => f.thema)).size).toBeGreaterThan(3);
  });

  it('Prüfungssimulation hat 30 Fragen', () => {
    expect(stelleZusammen(pool, {}, 'pruefung', 0, 7)).toHaveLength(30);
  });

  it('Leitner: falsch → Fach 1 und im Fehlertraining; richtig → Fach steigt', () => {
    const id = pool[0].id;
    let stand = beantworte({}, id, false, 0);
    expect(stand[id].fach).toBe(1);
    expect(stelleZusammen(pool, stand, 'fehler', 0, 1).map((f) => f.id)).toContain(id);
    stand = beantworte(stand, id, true, 0);
    stand = beantworte(stand, id, true, 0);
    expect(stand[id].fach).toBe(3);
    expect(fortschritt(pool, stand, 0).gesehen).toBe(1);
  });
});
