import { describe, expect, it } from 'vitest';

import { ohneSeiten } from '../src/logic/text';

describe('ohneSeiten', () => {
  it('entfernt Seitenverweise in allen Schreibweisen', () => {
    expect(ohneSeiten('Absolute Kontraindikationen (S. 46).')).toBe('Absolute Kontraindikationen.');
    expect(ohneSeiten('Rechtsgrundlagen (S. 14–16) beachten')).toBe('Rechtsgrundlagen beachten');
    expect(ohneSeiten('alle 4 Minuten (S. 91, 100)')).toBe('alle 4 Minuten');
    expect(ohneSeiten('Tabelle auf S. 107.')).toBe('Tabelle.');
    expect(ohneSeiten('S. 105–112')).toBe('');
  });
  it('lässt Dosierungen und Abkürzungen unverändert', () => {
    expect(ohneSeiten('z. B. 0,5 mg i.m. – Repetition nach 5–10 min')).toBe('z. B. 0,5 mg i.m. – Repetition nach 5–10 min');
    expect(ohneSeiten('SpO2 94 – 98 %')).toBe('SpO2 94 – 98 %');
  });
});
