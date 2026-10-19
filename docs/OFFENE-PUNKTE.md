# Offene Punkte

## Fachlich – Klärung mit der ÄLRD / Herausgebern

Beim Abgleich der Daten aufgefallen. Die App zeigt in diesen Fällen beide Angaben bzw. rechnet nicht.

| # | Thema | Fundstellen | Umgang in der App |
|---|---|---|---|
| 1 | **Amiodaron bei Kindern:** SAA nennt „Altersbegrenzung: Säuglinge und Kinder < 3 Jahre (Gehalt an Benzylalkohol)“, die Reanimationstabelle nennt 5 mg/kgKG ohne Altersgrenze | S. 50 ↔ S. 100, S. 93 | Dosis wird berechnet, Altersbegrenzung als gelber Hinweis daneben |
| 2 | **Fentanyl Gewichtsgrenze:** SAA „keine Anwendung bei Kindern < 21 kgKG“, BPR „Erwachsene und Kinder ≥ 20 kg KG“ | S. 57 ↔ S. 108 | Rechner folgt S. 108 (≥ 20 kg), Hinweis auf S. 57 |
| 3 | **Esketamin i.m.:** „Initialtherapie nasal oder i.m.: 1 mg/kgKG“ und darunter „Dosierung intramuskulär: 0,5 mg/kgKG“ | S. 110 | kein Rechner, nur Originaltext |
| 4 | **Farbige Felder ohne Qualifikation** (z. B. Morphin Erwachsene: Kreis Viersen; i.v.-Zugang: Hagen) | S. 107, S. 28 | Ampel „ohne Angabe – bei der ÄLRD klären“ |
| 5 | **„TNA+NotSan“** (Herne, ASS/Heparin beim ACS) | S. 119 | als „TNA / NA“ gewertet, Originaltext wird angezeigt |
| 6 | **Ehemalige RettAss-Felder** ab 2027: Sollen diese Maßnahmen künftig für NotSan oder auch für RS gelten? | alle Tabellen | konservativ NotSan (siehe ENTSCHEIDUNGEN) |
| 7 | **Nalbuphin Kinder:** Dosis ergibt sich aus „Pat. < 65 Jahre 0,2 mg/kgKG“ (SAA), die BPR-Tabelle schreibt „Erwachsene < 65 Jahre“ | S. 70 ↔ S. 107 | Rechner nach SAA (< 65 Jahre, ≥ 21 kg) |

## Rechtlich / regulatorisch – vor Veröffentlichung klären

1. **Nutzungsrecht am Kompendium.** Die App übernimmt Texte und Tabellen wörtlich. Für eine (kommerzielle)
   Veröffentlichung braucht es die Zustimmung der Herausgeber (Verantwortliche S. 8–10). Das Kompendium selbst
   vermerkt, dass die Weitergabe von Unterlagen der Zustimmung des Urhebers bedarf (S. 6).
   Chance: eine offizielle Kooperation („empfohlen von …“) wäre zugleich das stärkste Marketing.
2. **Medizinprodukterecht (MDR).** Software, die patientenbezogen Dosen berechnet oder Therapieschritte
   zeitlich steuert, kann ein Medizinprodukt sein (Klassifizierung nach MDR Anhang VIII, Regel 11). Vor einem
   Store-Release fachkundig prüfen lassen. Möglicher Weg: zuerst Nachschlage- und Lernfunktionen veröffentlichen,
   Rechner/REA-Cockpit nach Konformitätsbewertung.
3. **Haftungshinweis/AGB/Datenschutzerklärung** für die Stores.
4. **Öffentliche Repositories:** `RD-APP` und `PDF-hochladen` sind derzeit öffentlich. Empfehlung: auf privat stellen,
   solange die Nutzungsrechte nicht geklärt sind.

## Technisch

- Kauf über App Store / Google Play anbinden (Demo-Schalter ersetzen)
- BPR-Flussdiagramme als Entscheidungsbäume
- EGA-Größentabellen digitalisieren
- Native Builds (EAS) testen – bisher geprüft: Typecheck, Lint, 50 Tests, Web-Export im Browser
