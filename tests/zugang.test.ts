import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeKorrekt, normalisiereCode } from '../src/logic/zugang';

describe('Zugangscode', () => {
  it('lehnt falsche Codes ab', async () => {
    expect(await codeKorrekt('')).toBe(false);
    expect(await codeKorrekt('RD-000000')).toBe(false);
  });
  it('normalisiert Leerzeichen und Kleinschreibung', () => {
    expect(normalisiereCode(' rd-ab c1 ')).toBe('RD-ABC1');
  });
  it('akzeptiert den hinterlegten Code (falls lokal vorhanden)', async () => {
    const code = process.env.NODEXO_ZUGANGSCODE;
    if (!code) return;
    expect(await codeKorrekt(code.toLowerCase())).toBe(true);
  });
  it('enthält den Klartext-Code nicht im Quelltext', () => {
    const quelle = readFileSync('src/logic/zugang.ts', 'utf8');
    expect(quelle).not.toMatch(/RD-[A-Z0-9]{6}/);
  });
});
