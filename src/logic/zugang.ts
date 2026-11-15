// Zugangscode für die Web-Version (Testphase). Gespeichert ist nur der SHA-256-Hash,
// nicht der Code selbst. Neuen Code setzen:
//   printf '%s' 'NEUER-CODE' | sha256sum
// und den Hash hier eintragen.
//
// Hinweis: Das ist ein Sichtschutz für den Link, kein echter Zugriffsschutz – die
// Dateien einer statischen Seite (GitHub Pages) bleiben technisch abrufbar.

export const ZUGANGS_HASH = '7335f542c4cd202c36fb4110582d5df346e37c3f213b768226bbe2bbfe28a722';

export function normalisiereCode(eingabe: string): string {
  return eingabe.trim().toUpperCase().replace(/\s+/g, '');
}

export async function sha256Hex(text: string): Promise<string> {
  const daten = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', daten);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function codeKorrekt(eingabe: string): Promise<boolean> {
  return (await sha256Hex(normalisiereCode(eingabe))) === ZUGANGS_HASH;
}
