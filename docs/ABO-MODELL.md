# Abo-Modell (Vorschlag)

## Grundsatz: Einsatzwissen ist nie hinter einer Bezahlschranke

Alles, was im Einsatz gebraucht wird – SAA, BPR, Freigaben, Dosisrechner, REA-Cockpit, Scores – bleibt
kostenlos. Das ist ethisch geboten, schafft Vertrauen bei ÄLRD und Trägern (die die App dann empfehlen können)
und sorgt für Reichweite. Bezahlt wird für **Zeitersparnis und Sicherheit beim Lernen** und für
**Organisationsfunktionen**.

## Stufen

| | **Basis** | **Pro** | **Team** |
|---|---|---|---|
| Zielgruppe | alle | Azubis, Prüflinge, Fortbildung | Wachen, Träger, ÄLRD, Berufsfachschulen |
| Preis (Vorschlag) | 0 € | 4,99 €/Monat · 39,99 €/Jahr · Azubi 2,49 €/Monat | pro Kopf und Jahr, Staffelpreis |
| Einsatz-Teil komplett | ✓ | ✓ | ✓ |
| Lernen | 20 Fragen/Tag, durcheinander oder nach Themen | unbegrenzt + Wiederholen (Leitner), Fehlertraining, Prüfungssimulation, Lernplan | wie Pro |
| Update-Garantie | – | neues Kompendium am Erscheinungstag + „Was ist neu“-Lernpaket | ✓ |
| Organisation | – | – | Kompetenzüberprüfung, Auswertung, Kursmodus |

## Was Pro besonders macht

1. **Fragen aus dem eigenen Kompendium und dem eigenen Bereich.** Generische Rettungsdienst-Quiz-Apps können das
   nicht: Nodexo fragt „Welche Mindestqualifikation gilt in *Duisburg* für Morphin?“ – genau das, was in der
   Prüfung und auf der Wache zählt.
2. **Prüfungsdatum → Tagesplan.** Die App rechnet aus, wie viele neue Fragen pro Tag nötig sind, und wiederholt
   Schwachstellen automatisch.
3. **Jedes Jahr neu.** Das Kompendium erscheint jährlich; Pro-Nutzer bekommen die Änderungen als gezieltes Lernpaket
   statt 175 Seiten neu zu lesen.

## Was Team besonders macht (B2B – der eigentliche Hebel)

Das Kompendium fordert für vorabdelegierte Maßnahmen (★) eine **Kompetenzüberprüfung, z. B. Rezertifizierung**
(S. 12). Diese Pflicht hat jede ÄLRD – Nodexo Team liefert dafür:

- jährlichen, dokumentierten Test je Bereich mit genau den ★-Maßnahmen dieses Bereichs
- anonymisierte Auswertung für die ÄLRD („bei Esketamin nasal liegen 40 % falsch“) als Grundlage für Fortbildungen
- Kursmodus für Berufsfachschulen (Klassen, Lernstand, Prüfungssimulationen)
- Fortbildungsstunden-Nachweis

Damit zahlt nicht die einzelne Notfallsanitäterin, sondern der Träger – und der Einzelne bekommt Pro inklusive.

## Technische Umsetzung

- Digitale Abos müssen in den Stores über In-App-Kauf laufen (App Store / Google Play). Empfehlung: RevenueCat als
  Abstraktion, Webshop nur für Team-Lizenzen per Rechnung.
- Aktuell ist im Code nur ein **Demo-Schalter** (`src/app/abo.tsx`), der Pro lokal aktiviert.
- Freischaltlogik zentral über `abo` im App-Zustand (`src/state/AppState.tsx`), Pro-Modi in `MODI` markiert.

## Vor dem Verkauf zu klären

- **Nutzungsrecht am Kompendium** für eine kommerzielle App (siehe OFFENE-PUNKTE)
- **Medizinprodukterecht:** Dosisrechner und REA-Cockpit können Medizinprodukt-Software sein (siehe OFFENE-PUNKTE)
- Preise sind Platzhalter – vor Festlegung mit Zielgruppe testen (z. B. Azubi-Jahrgang einer Schule)
