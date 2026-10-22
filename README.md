# Nodexo – der smarte Rettungsdienst

App für Rettungssanitäter/innen und Notfallsanitäter/innen: alle Standardarbeitsanweisungen (SAA),
Behandlungspfade (BPR), Medikamentendosierungen und regionalen Freigaben aus dem
**Gemeinsamen Kompendium Rettungsdienst 2026** – im Einsatz in höchstens drei Taps, dazu ein Lernbereich
für die Prüfungsvorbereitung.

> Nodexo ersetzt weder Ausbildung noch Kompendium und trifft keine Therapieentscheidung.
> Maßgeblich sind das Kompendium und die Vorgaben der jeweiligen ÄLRD.

## Was drin ist (v0.2)

| Bereich | Inhalt |
|---|---|
| **Start** | Suche mit Kurzformen (Amio, ASS, TXA …), Favoriten, 8 farbige Kategorien wie im Kompendium (SAA Medikamente, SAA Maßnahmen, BPR …) |
| **Medikamente** | 31 SAA wörtlich in farbigen Kästen + 3 Medikamente ohne eigene SAA, Dosisrechner (mg **und** ml), Titrationszähler mit Maximaldosis |
| **Originalseite** | Am Ende jeder Seite die passende(n) Kompendium-Seite(n) als Vorschau, Tippen öffnet Vollbild mit Zoom. Seitenzahlen werden in der App nirgends angezeigt |
| **Freigabe-Ampel** | 87 Freigabetabellen × 28 Bereiche: „Darf ich das hier?“ für RS / NotSan / NotSan-Azubi, inkl. ★ (2c), Fußnoten, Bereichsvergleich |
| **Maßnahmen** | 18 invasive SAA, Lese- und Checklistenmodus nach Standardvorgehen (S. 27) |
| **Praxis** | Fallbeispiele Reanimation (Erwachsene/Kind, VF/Asystolie): Beobachter protokolliert Analyse, Schocks, Medikamente mit Dosis, Atemweg, Zugang, 4 Hs/HITS – Auswertung gegen den BPR (Zeitpunkte, Intervalle, Dosen) zum Teilen |
| **Scores** | NEWS2 (inkl. 3-Punkte-Regel), qSOFA, Schockindex |
| **Lernen** | ~560 Fragen aus den Kompendium-Daten, gefiltert nach Qualifikation und Bereich; Modi: durcheinander, nach Themen, Wiederholen (Leitner), Fehlertraining, Prüfungssimulation; Serie, Lernplan bis Prüfungsdatum |
| **Abo** | Basis kostenlos (Einsatzwissen nie hinter Paywall), Pro für Prüfungsvorbereitung, Team für Wachen/ÄLRD – siehe [docs/ABO-MODELL.md](docs/ABO-MODELL.md) |

RettAss wird nicht mehr berücksichtigt (Berufsbild entfällt ab 01.01.2027) – siehe [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md).

## Starten

```bash
npm install
npm start            # Expo Dev-Server (App: Expo Go / Dev-Build, Web: Taste w)
npm run web          # direkt im Browser
npm test             # 60 Tests: Daten, Freigaben, Dosisrechner, REA-Auswertung, Scores, Lernfragen
npm run typecheck
npm run lint
npm run export:web   # statischer Web-Build nach dist/
```

Technik: Expo SDK 58, React Native 0.88, Expo Router, TypeScript, AsyncStorage (alles lokal, offline).

## Daten aus dem Kompendium

Die Inhalte werden **nicht abgetippt**, sondern aus dem PDF extrahiert und gegen den Originaltext geprüft:

```bash
python -m venv .venv && .venv/bin/pip install pymupdf
export KOMPENDIUM_PDF=/pfad/zu/GemKompRD2026.pdf
npm run daten:extrahieren   # → data/generated/*.json
npm run daten:pruefen       # jede Dosis, jeder Beleg muss wörtlich im PDF stehen
python -I tools/extract/render_seiten.py "$KOMPENDIUM_PDF"   # Originalseiten → assets/kompendium/
```

Details: [docs/DATEN.md](docs/DATEN.md). Offene fachliche Fragen an die ÄLRD: [docs/OFFENE-PUNKTE.md](docs/OFFENE-PUNKTE.md).

## Ordner

```
src/app/        Bildschirme (Expo Router)
src/logic/      Fachlogik ohne UI: Freigabe, Dosis, REA, Scores, Suche, Lernen
src/data/       Typen + Zusammenführung der Daten
src/ui/         Bausteine, Theme (Nacht als Standard)
data/generated/ aus dem PDF extrahiert (nicht von Hand ändern)
data/curated/   kuratierte Zuordnungen, Dosisregeln, Kapitelstruktur
tools/extract/  Extraktion und Prüfung (Python, PyMuPDF)
tests/          Vitest
docs/           Konzept, Entscheidungen, Abo-Modell, offene Punkte
```
