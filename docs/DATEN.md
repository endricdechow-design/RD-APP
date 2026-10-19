# Datenpipeline

```
GemKompRD2026.pdf
   │  tools/extract/extract_kompendium.py (PyMuPDF: Text mit Position, Schrift, Farbe)
   ▼
data/generated/                     ← nie von Hand ändern
   medikamente.json   31 SAA (S. 49–79), Abschnitte wörtlich, Ergänzungen markiert
   massnahmen.json    18 SAA (S. 28–45)
   freigaben.json     89 Tabellen: Bereich → Level, ★, Fußnotenmarke
   inhalt.json        Inhaltsverzeichnis
   │
   │  + data/curated/   (von Hand, aber geprüft)
   │      freigabe-zuordnung.json  Tabelle → Medikament/Maßnahme, Kontext, Zielgruppe, ggf. Dosistext
   │      dosisregeln.json         33 Regeln für den Rechner, jede mit wörtlichem Beleg
   │      bpr.json                 Kapitelstruktur (Inhaltsverzeichnis S. 5)
   │      bereiche.json            28 Bereiche (Legende S. 12)
   ▼
src/data/kompendium.ts  → App
```

## Wie die Freigabetabellen gelesen werden

- Jede Zelle beginnt mit dem fetten Bereichscode (RKN, HS, DU …, „TNA - Bergisches Land“, „SR AC“, „E-3A“).
  Graue Felder enthalten keinen Text – fehlt ein Code, ist die Maßnahme dort **nicht vorgesehen**.
- Das Level steht rechts daneben (RS, NotSan, TNA / NA, Notarzt, ▶). Das ★ (U+2605, Hiragino-Schrift) wird über
  seine Position der Zelle zugeordnet – mit der normalen Textextraktion geht es verloren.
- Fußnotenmarken (`*`, `**`) werden der Zelle zugeordnet, der Fußnotentext unter der Tabelle über die Marke.
- Zwei Tabellen werden getrennt, wenn zwischen den Zeilen normaler Text steht; leere graue Zeilen trennen nicht.
- **RettAss → NotSan:** Felder mit „RettAss“ werden auf NotSan angehoben, der Originalwert bleibt im Feld
  `original`. Damit darf RS diese Maßnahmen in der App nicht (konservativ).

Gefundene und behobene Parserfehler (mit Regressionstest):
- „SR AC“ wurde in „SR“ + „AC“ zerlegt → Werte der StädteRegion landeten bei der Stadt Aachen.
- Umbrochene Aufzählungspunkte, Hoch-/Tiefstellungen (RR syst, O2), zweispaltige Kästen (Aufklärung | Einwilligung).
- Ergänzungen in Mitternachtsblau dürfen nicht mit dem Punkt davor verschmolzen werden.

## Prüfung (`tools/extract/verify_curated.py`)

- Jeder Belegtext jeder Dosisregel muss **wörtlich** auf der angegebenen Seite stehen.
- Jede Zahl, mit der gerechnet wird (Dosis, Maximum), muss in einem Beleg vorkommen.
- Jeder Konzentrationstext muss wörtlich auf seiner Seite stehen.
- Überschriebene Dosistexte: wörtlich – oder, wo Tabellenspalten zu Zeilen umgestellt wurden, mindestens alle Zahlen.
- Jede extrahierte Tabelle ist zugeordnet oder bewusst ignoriert (2 Fehlerkennungen in Flussdiagrammen).

Letzter Lauf: 33 Dosisregeln, 87 Zuordnungen – 0 Fehler, 12 Hinweise (umformatierte Tabellen S. 147, 148, 152).

## Nicht automatisch digitalisiert

- Flussdiagramme der BPR (Verweis auf Seite + alle freigegebenen Medikamente des Pfads)
- Größen-/Farbtabellen der EGA (S. 31–33) – Hinweis auf Originalseite
- Tabellen auf S. 147 (Midazolam intranasal/bukkal) wurden spaltenweise umgestellt und zahlengeprüft
