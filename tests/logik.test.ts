import { describe, expect, it } from 'vitest';

import { dosisregeln, freigaben } from '../src/data/kompendium';
import { berechne, naechsteTitrationsdosis } from '../src/logic/dosis';
import { bewerte, passendeFussnoten } from '../src/logic/freigabe';
import { anzahl, empfehlungen, neueRea, protokolliere, type ReaZustand } from '../src/logic/rea';
import { news2, qsofa, schockindex } from '../src/logic/scores';
import { suche } from '../src/logic/suche';

const regel = (id: string) => dosisregeln.find((r) => r.id === id)!;
const tabelle = (id: string) => freigaben.find((f) => f.tabelle === id)!;

describe('Freigabe nach Qualifikation und Bereich', () => {
  const morphinErw = tabelle('s107_t3'); // S. 107

  it('NotSan in Duisburg darf Morphin, mit passender Fußnote', () => {
    const b = bewerte(morphinErw, 'DU', 'NotSan');
    expect(b.art).toBe('erlaubt');
    expect(b.fussnoten[0]).toContain('DU: alternativ i.m. oder nasal');
  });

  it('RS darf Morphin nirgends selbst geben', () => {
    for (const code of ['DU', 'AC', 'D'] as const) {
      expect(bewerte(morphinErw, code, 'RS').art).not.toBe('erlaubt');
    }
  });

  it('Krefeld: Morphin nur Notarzt', () => {
    expect(bewerte(morphinErw, 'KR', 'NotSan').art).toBe('nur_notarzt');
  });

  it('Bochum: TNA / NA bedeutet Delegation für NotSan', () => {
    expect(bewerte(morphinErw, 'BO', 'NotSan').art).toBe('nur_tna_na');
  });

  it('▶ wird als "in Planung" gewertet (RKN)', () => {
    expect(bewerte(morphinErw, 'RKN', 'NotSan').art).toBe('in_planung');
  });

  it('graues Feld = nicht vorgesehen (Nalbuphin in Duisburg)', () => {
    expect(bewerte(tabelle('s107_t1'), 'DU', 'NotSan').art).toBe('nicht_vorgesehen');
  });

  it('★ wird als vorabdelegiert erkannt (Morphin, Kreis Kleve)', () => {
    const b = bewerte(morphinErw, 'KLE', 'NotSan');
    expect(b.vorabdelegiert).toBe(true);
    expect(b.label).toBe('NotSan ★');
  });

  it('ehemaliges RettAss-Feld gilt nicht für RS (i.v.-Zugang, Düsseldorf)', () => {
    const iv = tabelle('s28_t1');
    expect(bewerte(iv, 'D', 'RS').art).toBe('hoehere_qualifikation');
    expect(bewerte(iv, 'D', 'NotSan').art).toBe('erlaubt');
    expect(bewerte(iv, 'DU', 'RS').art).toBe('erlaubt');
  });

  it('ordnet Fußnoten mit * und ** korrekt zu', () => {
    const z = morphinErw.zellen['D']!;
    expect(passendeFussnoten(morphinErw, z, 'D')).toEqual(['*D: ausschließlich bei Patienten > 30 kg KG']);
  });
});

describe('Dosisrechner', () => {
  it('Amiodaron REA Erwachsene: 300 mg = 6 ml', () => {
    const e = berechne(regel('amio-rea-erw-1'), { erwachsen: true });
    expect(e.dosis).toBe(300);
    expect(e.volumenMl).toBe(6);
  });

  it('Amiodaron REA Kind 20 kg: 100 mg = 2 ml (wie Tabelle S. 93)', () => {
    const e = berechne(regel('amio-rea-kind-1'), { erwachsen: false, gewichtKg: 20 });
    expect(e.dosis).toBe(100);
    expect(e.volumenMl).toBe(2);
  });

  it('Amiodaron REA Kind: Deckelung auf 300 mg bzw. 150 mg', () => {
    expect(berechne(regel('amio-rea-kind-1'), { erwachsen: false, gewichtKg: 70 }).dosis).toBe(300);
    const zweite = berechne(regel('amio-rea-kind-2'), { erwachsen: false, gewichtKg: 40 });
    expect(zweite.dosis).toBe(150);
    expect(zweite.gedeckelt).toBe(true);
  });

  it('Epinephrin REA Kind 15 kg: 0,15 mg = 1,5 ml (wie Tabelle S. 93)', () => {
    const e = berechne(regel('epi-rea-kind'), { erwachsen: false, gewichtKg: 15 });
    expect(e.dosis).toBe(0.15);
    expect(e.volumenMl).toBe(1.5);
  });

  it('Epinephrin REA Erwachsene: 1 mg = 10 ml der Mischung', () => {
    expect(berechne(regel('epi-rea-erw'), { erwachsen: true }).volumenMl).toBe(10);
  });

  it('verlangt Gewicht, wenn die Regel es braucht', () => {
    expect(berechne(regel('epi-rea-kind'), { erwachsen: false }).passung).toBe('angaben_fehlen');
  });

  it('Morphin Kind unter 21 kg passt nicht', () => {
    expect(berechne(regel('morphin-kind'), { erwachsen: false, gewichtKg: 20 }).passung).toBe('passt_nicht');
    expect(berechne(regel('morphin-kind'), { erwachsen: false, gewichtKg: 21 }).passung).toBe('passt');
  });

  it('Paracetamol: 15–50 kg nach Gewicht, über 50 kg 1000 mg', () => {
    expect(berechne(regel('paracetamol-15-50'), { erwachsen: false, gewichtKg: 30 }).dosis).toBe(450);
    expect(berechne(regel('paracetamol-15-50'), { erwachsen: true, gewichtKg: 50 }).passung).toBe('passt');
    expect(berechne(regel('paracetamol-ue50'), { erwachsen: true, gewichtKg: 50 }).passung).toBe('passt_nicht');
    expect(berechne(regel('paracetamol-ue50'), { erwachsen: true, gewichtKg: 51 }).volumenMl).toBe(100);
  });

  it('Morphin Titration: nie über 10 mg gesamt', () => {
    const e = berechne(regel('morphin-erw'), { erwachsen: true, gewichtKg: 80 });
    expect(naechsteTitrationsdosis(e, 8)).toEqual({ dosis: 2, rest: 2 });
    expect(naechsteTitrationsdosis(e, 9)).toEqual({ dosis: 1, rest: 1 });
    expect(naechsteTitrationsdosis(e, 10)).toEqual({ dosis: 0, rest: 0 });
  });

  it('Fentanyl: Maximaldosis 2 µg/kgKG ideales Körpergewicht', () => {
    expect(berechne(regel('fentanyl-iv'), { erwachsen: true, gewichtKg: 70 }).maxGesamt).toBe(140);
  });

  it('Tranexamsäure: max. 1000 mg', () => {
    const e = berechne(regel('txa'), { erwachsen: true, alterJahre: 40, gewichtKg: 90 });
    expect(e.dosis).toBe(1000);
    expect(e.volumenMl).toBe(10);
  });

  it('Epinephrin Anaphylaxie nach Alter', () => {
    expect(berechne(regel('epi-ana-ab12'), { erwachsen: false, alterJahre: 12 }).passung).toBe('passt');
    expect(berechne(regel('epi-ana-6-12'), { erwachsen: false, alterJahre: 12 }).passung).toBe('passt_nicht');
    expect(berechne(regel('epi-ana-u6'), { erwachsen: false, alterJahre: 5 }).dosis).toBe(0.15);
  });
});

describe('Scores', () => {
  it('NEWS2: gesunder Erwachsener = 0, leichtes Risiko', () => {
    const r = news2({ bewusstseinsveraenderung: false, atemfrequenz: 16, rrSys: 125, spo2: 98, sauerstoff: false, herzfrequenz: 72, temperatur: 36.8 });
    expect(r.summe).toBe(0);
    expect(r.risiko).toBe('leicht');
  });

  it('NEWS2: Einzelparameter mit 3 Punkten = mindestens moderat', () => {
    const r = news2({ bewusstseinsveraenderung: false, atemfrequenz: 26, rrSys: 125, spo2: 98, sauerstoff: false, herzfrequenz: 72, temperatur: 36.8 });
    expect(r.summe).toBe(3);
    expect(r.risiko).toBe('moderat');
  });

  it('NEWS2: Grenzwerte der Tabelle S. 155', () => {
    const basis = { bewusstseinsveraenderung: false, atemfrequenz: 16, rrSys: 125, spo2: 98, sauerstoff: false, herzfrequenz: 72, temperatur: 36.8 };
    expect(news2({ ...basis, temperatur: 39.1 }).punkte.temperatur).toBe(2);
    expect(news2({ ...basis, temperatur: 39.0 }).punkte.temperatur).toBe(1);
    expect(news2({ ...basis, rrSys: 220 }).punkte.rrSys).toBe(3);
    expect(news2({ ...basis, herzfrequenz: 131 }).punkte.herzfrequenz).toBe(3);
    expect(news2({ ...basis, spo2: 94 }).punkte.spo2).toBe(1);
  });

  it('qSOFA ≥ 2 nur mit Infektionsverdacht = hohes Risiko', () => {
    expect(qsofa({ rrSys: 95, atemfrequenz: 24, gcsUnter15: false, infektionsverdacht: true }).hohesRisiko).toBe(true);
    expect(qsofa({ rrSys: 95, atemfrequenz: 24, gcsUnter15: false, infektionsverdacht: false }).hohesRisiko).toBe(false);
  });

  it('Schockindex', () => {
    expect(schockindex(120, 100)).toEqual({ wert: 1.2, ueber09: true });
  });
});

describe('REA-Ablauf', () => {
  const t0 = 1_000_000;
  it('Asystolie: Epinephrin sofort', () => {
    let z = neueRea('erwachsen', t0);
    z = { ...z, rhythmus: 'nicht_schockbar' };
    expect(empfehlungen(z, t0).some((e) => e.typ === 'epinephrin' && e.dringend)).toBe(true);
  });

  it('VF: Epinephrin und Amiodaron erst nach dem 3. Schock, Amiodaron 2 nach dem 5.', () => {
    let z: ReaZustand = { ...neueRea('erwachsen', t0), rhythmus: 'schockbar' };
    z = protokolliere(z, 'schock', '1. Schock', t0 + 1);
    z = protokolliere(z, 'schock', '2. Schock', t0 + 2);
    expect(empfehlungen(z, t0 + 3).filter((e) => e.dringend)).toHaveLength(0);
    z = protokolliere(z, 'schock', '3. Schock', t0 + 4);
    const nach3 = empfehlungen(z, t0 + 5);
    expect(nach3.find((e) => e.typ === 'amiodaron')?.dosis?.dosis).toBe(300);
    expect(nach3.some((e) => e.typ === 'epinephrin' && e.dringend)).toBe(true);
    z = protokolliere(z, 'amiodaron', 'Amiodaron 300 mg', t0 + 6);
    z = protokolliere(z, 'schock', '4. Schock', t0 + 7);
    z = protokolliere(z, 'schock', '5. Schock', t0 + 8);
    expect(empfehlungen(z, t0 + 9).find((e) => e.typ === 'amiodaron')?.dosis?.dosis).toBe(150);
    expect(anzahl(z, 'schock')).toBe(5);
  });

  it('Epinephrin wird nach 4 Minuten wieder fällig', () => {
    let z: ReaZustand = { ...neueRea('erwachsen', t0), rhythmus: 'nicht_schockbar' };
    z = protokolliere(z, 'epinephrin', 'Epinephrin 1 mg', t0);
    expect(empfehlungen(z, t0 + 3 * 60_000).find((e) => e.typ === 'epinephrin')?.dringend).toBe(false);
    expect(empfehlungen(z, t0 + 4 * 60_000).find((e) => e.typ === 'epinephrin')?.dringend).toBe(true);
  });
});

describe('Suche', () => {
  it('findet Synonyme', () => {
    expect(suche('Adrenalin')[0].id).toBe('epinephrin');
    expect(suche('amio')[0].id).toBe('amiodaron');
    expect(suche('txa')[0].id).toBe('tranexamsaeure');
  });
  it('findet Behandlungspfade über Suchbegriffe', () => {
    expect(suche('Pseudokrupp').some((t) => t.id === 'obere-atemwege-kind')).toBe(true);
  });
});

describe('Patientenangaben nur bei Bedarf', () => {
  it('Amiodaron: Erwachsene brauchen nichts, Kinder brauchen das Gewicht', async () => {
    const { benoetigteAngaben } = await import('../src/logic/dosis');
    const amio = dosisregeln.filter((r) => r.medikament === 'amiodaron');
    expect(benoetigteAngaben(amio, true)).toEqual({ alter: false, gewicht: false });
    expect(benoetigteAngaben(amio, false)).toEqual({ alter: false, gewicht: true });
  });
  it('Epinephrin Anaphylaxie braucht das Alter, Paracetamol das Gewicht', async () => {
    const { benoetigteAngaben } = await import('../src/logic/dosis');
    expect(benoetigteAngaben(dosisregeln.filter((r) => r.id.startsWith('epi-ana')), true).alter).toBe(true);
    expect(benoetigteAngaben(dosisregeln.filter((r) => r.medikament === 'paracetamol'), true).gewicht).toBe(true);
  });
});
