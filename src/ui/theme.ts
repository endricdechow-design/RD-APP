// Farben und Maße. Dunkel ist Standard (Einsatz nachts), Hell für Tageslicht.
// Ampelfarben bewusst kräftig und mit Text kombiniert – nie nur Farbe als Information.
import { useColorScheme } from 'react-native';

import { useApp } from '../state/AppState';

export const palette = {
  dunkel: {
    hintergrund: '#0B0F14',
    flaeche: '#151B23',
    flaecheHoch: '#1E2631',
    rand: '#2A3442',
    text: '#F2F5F8',
    textLeise: '#9AA7B6',
    akzent: '#3DA9FC',
    akzentText: '#04121F',
    notfall: '#E5484D',
    notfallText: '#FFFFFF',
    gruen: '#30A46C',
    gelb: '#F5B700',
    rot: '#E5484D',
    grau: '#5B6675',
    ergaenzung: '#8FB8FF',
  },
  hell: {
    hintergrund: '#F4F6F8',
    flaeche: '#FFFFFF',
    flaecheHoch: '#EEF1F4',
    rand: '#D5DBE1',
    text: '#0B0F14',
    textLeise: '#525E6B',
    akzent: '#0B6BCB',
    akzentText: '#FFFFFF',
    notfall: '#C62828',
    notfallText: '#FFFFFF',
    gruen: '#1E7F4F',
    gelb: '#B07D00',
    rot: '#C62828',
    grau: '#6B7684',
    ergaenzung: '#0E2A8A',
  },
} as const;

export type Farben = { [K in keyof (typeof palette)['dunkel']]: string };

export function useFarben(): Farben {
  const system = useColorScheme();
  const { einstellungen } = useApp();
  const modus = einstellungen.darstellung === 'auto' ? (system === 'light' ? 'hell' : 'dunkel') : einstellungen.darstellung;
  return palette[modus];
}

export const abstand = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 12, l: 16 } as const;
/** Mindestgröße für Touch-Ziele (Handschuhe, Regen) */
export const TOUCH = 56;
