// Seitenangaben werden intern geführt (Belege, PDF-Seiten), aber nie angezeigt.

/** Entfernt Seitenverweise wie "(S. 46)", "(S. 14–16)", "S. 107" aus Anzeigetexten */
export function ohneSeiten(text: string): string {
  return text
    .replace(/\s*\((?:siehe\s+|vgl\.\s+)?S\.\s*\d+(?:\s*[–-]\s*\d+)?(?:\s*(?:,|und)\s*(?:S\.\s*)?\d+(?:\s*[–-]\s*\d+)?)*\)/g, '')
    .replace(/\s*(?:auf\s+|siehe\s+)?\bS\.\s*\d+(?:\s*[–-]\s*\d+)?(?:\s*(?:,|und)\s*\d+(?:\s*[–-]\s*\d+)?)*/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
