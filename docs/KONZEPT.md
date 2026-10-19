# Nodexo – Produktkonzept

## Leitidee

Nachts um 3 Uhr, Regen, Handschuhe: in **höchstens drei Taps** zur richtigen Dosis oder zum richtigen Pfad –
und dabei sofort sehen, ob man es **im eigenen Rettungsdienstbereich mit der eigenen Qualifikation** darf.

Das Gemeinsame Kompendium Rettungsdienst 2026 ist die einzige Quelle. Jede Zeile in der App trägt ihre Seitenzahl.

## Profil (Onboarding, zwei Fragen)

1. **Qualifikation:** Rettungssanitäter/in · Notfallsanitäter/in · NotSan in Ausbildung
2. **Rettungsdienstbereich:** einer der 28 Bereiche aus der Legende (S. 12) oder „nur lernen“

Warum der Bereich nötig ist: „Die Kreise und Städte definieren das Kompetenzniveau (RS / RettAss / NotSan / NA)
und die inhaltliche Gestaltung in eigener Verantwortung“ (S. 6). Morphin für Erwachsene ist z. B. in Duisburg
NotSan, in Krefeld Notarzt, in Bochum TNA/NA und im Rhein-Kreis Neuss in Planung (S. 107).

## Navigation

| Tab | Inhalt | Beispiel (Taps) |
|---|---|---|
| **Einsatz** | REA Erwachsene / REA Kind (0 Taps entfernt), Suche, Favoriten, Zuletzt, Behandlungspfade nach Kategorie, Schnellzugriff Scores / Notfallkarte Opioid / 6-R | Einsatz → Anaphylaxie = 1 |
| **Medikamente** | A–Z mit Freigabe-Ampel, Filter „Was ich darf“, Notfallkarte Opioidüberdosierung oben | Medikamente → Amiodaron = 1 |
| **Maßnahmen** | 18 SAA gruppiert (Zugang, Atemweg, Blutung/Trauma, Elektrotherapie) | Maßnahmen → i.o.-Zugang = 1 |
| **Lernen** | Fortschritt, Serie, Lernplan, fünf Lernmodi, Themenauswahl | Lernen → Alles durcheinander = 1 |
| **Mehr** | Profil, Pro, Scores, REA, Grundlagen & Recht (Rechtliche Fragen, Aufklärung, Mitfahrtverweigerung, TNA, Kindeswohl, 6-R) | Mehr → Mitfahrtverweigerung = 1 |

Kinder bekommen keinen eigenen Tab: Der Schalter **Erwachsen / Kind** in der Patientenleiste filtert alle Dosierungen.

## Medikamenten-Seite (Aufbau von oben nach unten)

1. Name, Wirkstoff, Gruppe, **Konzentration** (fett)
2. **Keine Anwendung, wenn** – rot umrandet, immer offen, mit Altersbegrenzung und dem Hinweis von S. 46
   (absolute Kontraindikationen für NotSan ohne ärztliche Unterstützung)
3. **Patientenleiste** (Erwachsen/Kind, Alter, Gewicht – keine Gewichtsschätzung, das Kompendium nennt keine Formel)
4. **Dosierung & Freigabe in deinem Bereich** – je Einsatzlage (Reanimation, Schmerz, Anaphylaxie …) eine Karte:
   Dosistext wörtlich, berechnete Dosis in mg **und ml**, Rechenweg, Maximaldosis, Titrationszähler mit Wartezeit,
   Ampel + Rechtsgrundlage + passende Fußnote, Link „Alle Bereiche“
5. SAA aufklappbar: Indikationen (offen), Nutzen-Risiko, Durchführung, UAW, Besonderheiten
6. Quelle mit Seitenzahl; Ergänzungen des Kompendiums (Mitternachtsblau kursiv) sind auch in der App kursiv-blau

## Freigabe-Ampel

| Ampel | Bedeutung | Grundlage |
|---|---|---|
| 🟢 RS | RS darf – nur im rechtfertigenden Notstand (§ 34 StGB) | S. 15 |
| 🟢 NotSan / NotSan ★ | NotSan darf; ★ = vorabdelegiert (§ 4 Abs. 2 Nr. 2c NotSanG) | S. 12, 14–16 |
| 🟡 TNA / NA | nur nach Delegation durch Telenotarzt/Notarzt (2b) | S. 16 |
| 🔴 Notarzt / höhere Qualifikation | vorbereiten, nicht selbst durchführen | S. 12 |
| ⚪ nicht vorgesehen / in Planung / ohne Angabe | graues Feld, ▶, farbiges Feld ohne Level | S. 12 |

Nicht Erlaubtes wird **nicht versteckt**, nur nach unten sortiert – im Team muss jede/r sehen, was als Nächstes kommt.

## Smarte Funktionen

- **REA-Cockpit:** Zyklus-Timer, Schockzähler steuert Epinephrin (VF/pVT nach dem 3. Schock, Asystolie/PEA sofort,
  dann alle 4 min) und Amiodaron (3. und 5. Schock); Kind: 4 J/kgKG und Dosen nach Gewicht; „Erwäge
  anterior-posteriore Elektrodenposition nach drei erfolglosen Defibrillationen“ (neu 2026, S. 91);
  4 Hs/HITS als Checkliste; Protokoll mit Zeitstempeln zum Teilen; Bildschirm bleibt an.
- **Dosisrechner:** nur aus geprüften Regeln (33 Stück), jede mit wörtlichem Beleg; Volumen aus der Konzentration
  der SAA bzw. der im BPR genannten Verdünnung (z. B. Epinephrin 1 mg = 10 ml, Naloxon 0,1 mg/ml).
- **Titrationszähler:** Morphin, Fentanyl, Naloxon …: „+ 2 mg gegeben“, Rest bis Maximaldosis, Wartezeit bis zur nächsten Gabe.
- **Checklisten** für invasive Maßnahmen nach Standardvorgehen S. 27.
- **Bereichsvergleich:** Wie ist es in den anderen 27 Bereichen? (Wechsel des Arbeitgebers, Einsätze an Bereichsgrenzen)
- **Scores:** NEWS2 mit Sonderregel „Einzelparameter 3 Punkte = mindestens moderat“, qSOFA, Schockindex.

## Lernen

- Fragen werden **aus den Daten erzeugt**, nicht ausgedacht: Konzentrationen, Indikationen, „Keine Anwendung“,
  Altersgrenzen, Maßnahmen-Indikationen/-Kontraindikationen/-Erfolgsprüfung, Dosisrechnungen an Beispielpatienten,
  Freigaben im eigenen Bereich, REA-Fakten, NEWS2/qSOFA. Jede Frage zeigt die Erklärung und Seitenzahl.
- **Gefiltert nach Qualifikation:** RS lernt nur Themen, die im eigenen Bereich für RS freigegeben sind.
- **Modi:** Alles durcheinander (ausgewogen über Themen) · Nach Themen · Wiederholen (Leitner, 5 Fächer:
  0/1/3/7/14 Tage) · Fehlertraining · Prüfungssimulation (30 Fragen, 30 Minuten, Auswertung am Ende)
- **Motivation:** Tagesserie, „sicher gewusst“, Lernplan bis zum Prüfungsdatum.
- **Qualitätssicherung der Fragen:** keine Textfragmente, keine Schreibvarianten der richtigen Antwort und keine
  inhaltlich überlappenden Aussagen als falsche Optionen (z. B. „innere Blutung“ bei Heparin) – per Test abgesichert.

## Nächste Ausbaustufen (Vorschlag)

1. Flussdiagramme der BPR als interaktive Entscheidungsbäume (zuerst Schmerz S. 105–106, ACS, Krampfanfall)
2. Originalseite als Bild in jeder Ansicht (benötigt Nutzungsrecht, siehe OFFENE-PUNKTE)
3. EGA-Größentabellen (S. 31–33) geprüft digitalisieren
4. Fallsimulationen im Lernbereich („Einsatz 03:12 Uhr, 74 J., Brustschmerz …“) über mehrere Schritte
5. Kauf über App Store / Google Play anbinden (z. B. RevenueCat), Team-Lizenzen
6. Jährliches Kompendium-Update: Extraktion neu laufen lassen, Differenz als „Was ist neu“-Lernpaket
