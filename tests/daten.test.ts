import { describe, expect, it } from 'vitest';

import {
  bereiche,
  bpr,
  dosisregeln,
  freigaben,
  massnahmen,
  medikamente,
  regelnFuerFreigabe,
  zusatzmedikamente,
} from '../src/data/kompendium';

describe('Datenbasis Kompendium 2026', () => {
  it('enthält alle 31 Medikamenten-SAA (S. 49–79) und 18 Maßnahmen-SAA (S. 28–45)', () => {
    expect(medikamente).toHaveLength(31);
    expect(massnahmen).toHaveLength(18);
    for (const m of medikamente) {
      expect(m.seite).toBeGreaterThanOrEqual(49);
      expect(m.seite).toBeLessThanOrEqual(79);
      expect(m.abschnitte.indikationen?.length, m.id).toBeGreaterThan(0);
      expect(m.abschnitte.dosierung?.length, m.id).toBeGreaterThan(0);
    }
  });

  it('setzt umbrochene Aufzählungspunkte zusammen, Ergänzungen bleiben getrennt', () => {
    const heparin = medikamente.find((m) => m.id === 'heparin')!;
    expect(heparin.abschnitte.keineAnwendung?.map((p) => p.text)).toContain(
      'Z.n. großem operativem Eingriff oder schwerem Trauma sowie chirurgischen Eingriffen am Zentralnervensystem und Augenoperationen in den letzten 4 Wochen',
    );
    const epi = medikamente.find((m) => m.id === 'epinephrin')!.abschnitte.dosierung!;
    const u6 = epi.find((p) => p.text.startsWith('Kinder < 6 Jahre'))!;
    expect(u6.text).toBe('Kinder < 6 Jahre: 0,15 mg i.m.');
    expect(u6.ergaenzung).toBe(false);
    expect(epi.some((p) => p.ergaenzung && p.text.startsWith('Bei fehlender Wirkung'))).toBe(true);
  });

  it('kennt 28 Bereiche mit eindeutigen Codes', () => {
    expect(bereiche).toHaveLength(28);
    expect(new Set(bereiche.map((b) => b.code)).size).toBe(28);
  });

  it('enthält kein RettAss mehr als Qualifikationsstufe', () => {
    for (const f of freigaben) {
      for (const z of Object.values(f.zellen)) {
        expect(z?.level).not.toBe('RettAss');
      }
    }
  });

  it('verwendet in Freigaben nur bekannte Bereichscodes', () => {
    const codes = new Set(bereiche.map((b) => b.code));
    for (const f of freigaben) {
      for (const c of Object.keys(f.zellen)) expect(codes.has(c as never), `${f.tabelle}: ${c}`).toBe(true);
    }
  });

  it('trennt StädteRegion Aachen und Stadt Aachen (Regressionstest Parser)', () => {
    // S. 107 Morphin Erwachsene: SR AC = NotSan, AC = RettAss (→ NotSan), Glucose S. 139: SR AC NotSan, AC RS
    const glucose = freigaben.find((f) => f.tabelle === 's139_t1')!;
    expect(glucose.zellen['SR AC']?.level).toBe('NotSan');
    expect(glucose.zellen['AC']?.level).toBe('RS');
  });

  it('ordnet jede Freigabe einem existierenden Thema zu', () => {
    const ids = new Set([
      ...medikamente.map((m) => m.id),
      ...massnahmen.map((m) => m.id),
      ...zusatzmedikamente.map((m) => m.id),
      ...bpr.map((b) => b.id),
    ]);
    for (const f of freigaben) expect(ids.has(f.thema), `${f.tabelle} → ${f.thema}`).toBe(true);
  });

  it('verknüpft jeden Freigabe-Kontext mit einem Behandlungspfad', () => {
    const kontexte = new Set(bpr.flatMap((b) => b.kontexte));
    for (const f of freigaben) {
      if (f.typ === 'massnahme') continue;
      if (f.kontext?.startsWith('SAA ')) continue;
      expect(kontexte.has(f.kontext!), `${f.tabelle}: ${f.kontext}`).toBe(true);
    }
  });

  it('ordnet jede Dosisregel genau den passenden Freigabetabellen zu', () => {
    for (const r of dosisregeln) {
      const tabellen = freigaben.filter((f) => regelnFuerFreigabe(f).includes(r)).map((f) => f.tabelle);
      expect(tabellen.length, r.id).toBeGreaterThan(0);
    }
    // Anaphylaxie: drei Altersgruppen, drei Tabellen – keine Vermischung
    const ab12 = freigaben.find((f) => f.tabelle === 's123_t1')!;
    expect(regelnFuerFreigabe(ab12).map((r) => r.id)).toEqual(['epi-ana-ab12']);
  });

  it('hat Dosisregeln nur für existierende Medikamente mit Belegen', () => {
    const ids = new Set(medikamente.map((m) => m.id));
    for (const r of dosisregeln) {
      expect(ids.has(r.medikament), r.id).toBe(true);
      expect(r.beleg.length, r.id).toBeGreaterThan(0);
    }
  });
});
