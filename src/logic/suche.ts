// Volltextsuche über Medikamente, Maßnahmen und Behandlungspfade.
import { alleMedikamentNamen, bpr, massnahmen } from '../data/kompendium';

export interface Treffer {
  art: 'medikament' | 'massnahme' | 'bpr';
  id: string;
  titel: string;
  untertitel: string;
  route: string;
  punkte: number;
}

/** Gebräuchliche Kurzformen → Begriff im Kompendium */
const SYNONYME: Record<string, string> = {
  adrenalin: 'epinephrin',
  supra: 'epinephrin',
  amio: 'amiodaron',
  ass: 'acetylsalicylsäure',
  aspirin: 'acetylsalicylsäure',
  txa: 'tranexamsäure',
  vel: 'vollelektrolytlösung',
  nitro: 'glyceroltrinitrat',
  gtn: 'glyceroltrinitrat',
  dormicum: 'midazolam',
  buccolam: 'midazolam',
  atrovent: 'ipratropiumbromid',
  narcan: 'naloxon',
  nyxoid: 'naloxon',
  zofran: 'ondansetron',
  vomex: 'dimenhydrinat',
  fenistil: 'dimetinden',
  buscopan: 'butylscopolamin',
  lasix: 'furosemid',
  ebrantil: 'urapidil',
  'beloc': 'metoprolol',
  berodual: 'fenoterol',
  novalgin: 'metamizol',
  io: 'i.o.',
  iv: 'i.v.',
  rea: 'reanimation',
  cpr: 'reanimation',
  herzinfarkt: 'acs',
  krampf: 'krampfanfall',
};

function normal(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

function bewerte(text: string, begriff: string): number {
  const t = normal(text);
  if (!begriff) return 0;
  if (t === begriff) return 100;
  if (t.startsWith(begriff)) return 80;
  if (t.split(' ').some((w) => w.startsWith(begriff))) return 60;
  if (t.includes(begriff)) return 40;
  return 0;
}

export function suche(eingabe: string): Treffer[] {
  const roh = normal(eingabe);
  if (roh.length < 2) return [];
  const begriffe = [roh, ...(SYNONYME[roh] ? [normal(SYNONYME[roh])] : [])];
  const treffer: Treffer[] = [];
  const nimm = (t: Omit<Treffer, 'punkte'>, texte: string[]) => {
    const punkte = Math.max(...begriffe.flatMap((b) => texte.map((x) => bewerte(x, b))));
    if (punkte > 0) treffer.push({ ...t, punkte });
  };
  for (const m of alleMedikamentNamen()) {
    nimm({ art: 'medikament', id: m.id, titel: m.name, untertitel: 'Medikament', route: `/medikament/${m.id}` }, [m.name]);
  }
  for (const m of massnahmen) {
    nimm({ art: 'massnahme', id: m.id, titel: m.name, untertitel: 'Invasive Maßnahme', route: `/massnahme/${m.id}` }, [m.name]);
  }
  for (const b of bpr) {
    nimm(
      { art: 'bpr', id: b.id, titel: b.titel, untertitel: 'Behandlungspfad', route: `/bpr/${b.id}` },
      [b.titel, ...(b.suchbegriffe ?? [])],
    );
  }
  return treffer.sort((a, b) => b.punkte - a.punkte || a.titel.localeCompare(b.titel, 'de')).slice(0, 25);
}

/** Anzeigename für eine gespeicherte Route (Favoriten, Verlauf) */
export function titelFuerRoute(route: string): string {
  const [, art, id] = route.split('/');
  if (art === 'medikament') return alleMedikamentNamen().find((m) => m.id === id)?.name ?? id;
  if (art === 'massnahme') return massnahmen.find((m) => m.id === id)?.name ?? id;
  if (art === 'bpr') return bpr.find((b) => b.id === id)?.titel ?? id;
  return route;
}
