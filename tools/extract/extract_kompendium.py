"""Extrahiert strukturierte Daten aus dem Gemeinsamen Kompendium Rettungsdienst 2026.

Aufruf (aus dem Repo-Root, PyMuPDF installiert):
    python -I tools/extract/extract_kompendium.py <pfad/zum/GemKompRD2026.pdf> data/generated

Erzeugt:
    medikamente.json   SAA Medikamente (S. 49-79), Abschnitte wörtlich
    massnahmen.json    SAA invasive Maßnahmen (S. 28-45), Abschnitte wörtlich
    freigaben.json     alle Freigabetabellen (Bereich -> Mindestqualifikation, ★, Fußnoten)
    inhalt.json        Inhaltsverzeichnis (Titel -> Seite)

Grundsatz: Es wird nichts umformuliert. Alle Texte sind wörtlich übernommen und
tragen ihre Seitenzahl. Text in "Mitternachtsblau kursiv" (Ergänzungen des
Gemeinsamen Kompendiums gegenüber den SAA/BPR der 6-Länder-AG) wird markiert.

Die Qualifikationsstufe "RettAss" wird beim Export auf "NotSan" angehoben
(Berufsbild entfällt ab 01.01.2027, siehe docs/ENTSCHEIDUNGEN.md). Der
Originalwert bleibt im Feld "original" zur Nachvollziehbarkeit erhalten.
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

ERGAENZUNG_FARBE = 0x011993  # Mitternachtsblau

BEREICHE = [
    "RKN", "HS", "DU", "KR", "VIE", "OB",
    "MH", "MG", "DN", "KLE", "AC", "EU",
    "SR AC", "BO", "HER", "BOT", "E", "UN",
    "REK", "DO", "GL", "TNA-BL", "GE",
    "HSK", "D", "HA", "HAM", "E-3A",
]

# Reihenfolge wichtig: lange Codes zuerst, damit "SR AC" nicht als "AC" erkannt wird.
BEREICH_RE = re.compile(
    r"(TNA\s*-\s*Bergisches\s+Land|SR\s+AC|E-3A|RKN|HSK|HAM|HER|BOT|REK|KLE|VIE|"
    r"HS|DU|KR|OB|MH|MG|DN|AC|EU|BO|UN|DO|GL|GE|HA|D|E)(?![\w-])"
)
LEVEL_RE = re.compile(
    r"(TNA\s*\+\s*NotSan|TNA\s*/\s*NA|NotSan|Notsan|RettAss|Notarzt|RS|►|▶)", re.I
)

MED_HEADINGS = [
    ("wirkstoff", r"^Wirkstoff\s*:"),
    ("konzentration", r"^Konzentration\s*:"),
    ("gruppe", r"^Arzneimittelgruppe\s*:"),
    ("indikationen", r"^Indikation(en)?\s*:"),
    ("keineAnwendung", r"^Keine Anwendung,? wenn\s*:"),
    ("altersbegrenzung", r"^Altersbegrenzung\s*:"),
    ("nutzenRisiko", r"^Anwendung nach sorgfältiger Nutzen-Risiko-Abwägung,? wenn\s*:"),
    ("dosierung", r"^Durchführung\s*/\s*Dosierung\s*:?"),
    ("uaw", r"^Unerwünschte Arzneimittelwirkungen\s*(\(UAW\))?\s*(/\s*Risiken)?\s*:?"),
    ("besonderheiten", r"^Besonderheiten\s*:?"),
]

GROESSENTABELLE_RE = re.compile(r"^(Farbcode|LMA Supreme™|Ambu® AuraGain™|Größe der Maske)")

MASSNAHME_HEADINGS = [
    ("indikationen", r"^Indikation(en)?\s*(/\s*Symptome)?\s*:"),
    ("kontraindikationen", r"^Kontraindikation(en)?\s*:"),
    ("alternativen", r"^Alternative(n)?\s*:"),
    ("aufklaerung", r"^Aufklärung\s*/\s*Risiken\s*:"),
    ("einwilligung", r"^Einwilligung\s*:"),
    ("durchfuehrung", r"^Durchführung\s*:"),
    ("erfolgspruefung", r"^Erfolgsprüfung\s*:"),
    ("gegenmassnahmen", r"^Gegenmaßnahmen\s*(\(z\.\s*B\.\))?\s*:"),
    ("verlaufskontrolle", r"^Verlaufskontrolle\s*:"),
]


def normalize_level(raw):
    r = raw.strip()
    low = r.lower().replace(" ", "")
    if low in ("►", "▶"):
        return "in_planung"
    if low == "notsan":
        return "NotSan"
    if low == "rs":
        return "RS"
    if low == "rettass":
        return "NotSan"  # RettAss entfällt -> nächsthöhere verbleibende Stufe
    if low == "notarzt":
        return "Notarzt"
    if low == "tna/na":
        return "TNA_NA"
    if low == "tna+notsan":
        return "TNA_NA"
    return None


def norm_bereich(raw):
    r = re.sub(r"\s+", " ", raw.strip())
    if r.startswith("TNA"):
        return "TNA-BL"
    return r


def spans_of(page):
    """Alle Textspans der Seite ohne Fußzeile (Seitenzahl, "erstellt: ...")."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if not s["text"].strip():
                    continue
                x0, y0, x1, y1 = s["bbox"]
                if y0 > 770 and (s["size"] >= 20 or s["text"].strip().startswith("erstellt")):
                    continue
                out.append({
                    "x": x0, "y": y0, "x1": x1, "y1": y1,
                    "size": round(s["size"], 1),
                    "bold": "Bold" in s["font"],
                    "italic": bool(s["flags"] & 2),
                    "font": s["font"],
                    "color": s["color"],
                    "text": s["text"],
                })
    return out


def group_lines(spans, tol=3.5):
    """Spans zu Zeilen zusammenfassen (Hoch-/Tiefstellungen inklusive)."""
    spans = sorted(spans, key=lambda s: (round(s["y"]), s["x"]))
    lines = []
    for s in spans:
        base = s["y"] + (s["y1"] - s["y"]) / 2
        # Hoch-/Tiefgestelltes (z. B. "RR syst", "O2") hat kleinere Schrift und versetzte Grundlinie
        t = tol + 3 if s["size"] < 7.5 else tol
        for ln in lines:
            if abs(ln["mid"] - base) <= t:
                # gleiche Zeile nur, wenn sich nichts horizontal überlappt
                if all(not (s["x"] < o["x1"] - 2 and s["x1"] > o["x"] + 2) for o in ln["spans"]):
                    ln["spans"].append(s)
                    break
        else:
            lines.append({"mid": base, "x0": s["x"], "spans": [s]})
    # Spalten trennen: große horizontale Lücken ergeben eigene Zeilen
    split = []
    for ln in lines:
        ln["spans"].sort(key=lambda s: s["x"])
        seg = [ln["spans"][0]]
        for s in ln["spans"][1:]:
            if s["x"] - seg[-1]["x1"] > 40:
                split.append({"mid": ln["mid"], "spans": seg})
                seg = []
            seg.append(s)
        split.append({"mid": ln["mid"], "spans": seg})
    lines = split
    for ln in lines:
        ln["y"] = min(s["y"] for s in ln["spans"])
        ln["x0"] = ln["spans"][0]["x"]
        parts = []
        prev = None
        for s in ln["spans"]:
            t = s["text"]
            if prev is not None and s["x"] - prev["x1"] > 1.5 and not t.startswith(" ") and not parts[-1].endswith(" "):
                parts.append(" ")
            parts.append(t)
            prev = s
        ln["text"] = re.sub(r"[ \t]+", " ", "".join(parts)).strip()
        ln["bold"] = all(s["bold"] for s in ln["spans"] if s["text"].strip() not in ("-", ":"))
        ln["ergaenzung"] = any(s["italic"] and s["color"] == ERGAENZUNG_FARBE for s in ln["spans"])
        ln["size"] = max(s["size"] for s in ln["spans"])
    lines.sort(key=lambda l: (round(l["y"]), l["x0"]))
    return lines


# ---------------------------------------------------------------- Freigaben

def is_table_span(s):
    return s["size"] <= 8.5 and (s["bold"] or "Hiragino" in s["font"])


def parse_table_rows(page):
    """Liefert Tabellenzeilen: Liste von (y, [token...]) mit Tokens in x-Reihenfolge."""
    sp = [s for s in spans_of(page) if is_table_span(s)]
    rows = {}
    for s in sp:
        # Sterne sitzen 3pt höher als der Zelltext
        y = s["y"] + (3.0 if "Hiragino" in s["font"] else 0.0)
        key = None
        for k in rows:
            if abs(k - y) <= 2.5:
                key = k
                break
        rows.setdefault(key if key is not None else y, []).append(s)
    result = []
    for y in sorted(rows):
        toks = []
        for s in sorted(rows[y], key=lambda s: s["x"]):
            t = s["text"].replace("｜", " ").replace("·", " ")
            for m in re.finditer(
                r"TNA\s*-\s*Bergisches\s+Land|SR\s+AC|TNA\s*\+\s*NotSan|TNA\s*/\s*NA|★|\*+|[^\s★*]+", t
            ):
                toks.append((s["x"], m.group(0)))
        result.append((y, toks))
    return [r for r in result if any(BEREICH_RE.fullmatch(t) for _, t in r[1])]


def tables_on_page(page):
    rows = parse_table_rows(page)
    # Zeilen mit normalem Text (Titel, Dosierung) trennen zwei Tabellen.
    # Leere graue Tabellenzeilen erzeugen dagegen nur eine Lücke ohne Text.
    text_ys = [
        s["y"] for s in spans_of(page)
        if s["size"] >= 8.9 or (not s["bold"] and not re.fullmatch(r"[►▶★｜·\s*]+", s["text"]))
    ]
    tables = []
    cur = []
    for y, toks in rows:
        if cur and y - cur[-1][0] > 22:
            prev = cur[-1][0]
            if y - prev > 80 or any(prev + 6 < ty < y - 2 for ty in text_ys):
                tables.append(cur)
                cur = []
        cur.append((y, toks))
    if cur:
        tables.append(cur)
    parsed = []
    for t in tables:
        cells = {}
        for _, toks in t:
            current = None
            for _, tok in toks:
                if BEREICH_RE.fullmatch(tok):
                    current = norm_bereich(tok)
                    cells[current] = {"level": None, "original": None, "vorabdelegiert": False, "fussnote": None}
                    continue
                if current is None:
                    continue
                c = cells[current]
                if tok == "★":
                    c["vorabdelegiert"] = True
                elif re.fullmatch(r"\*+", tok):
                    c["fussnote"] = tok
                elif LEVEL_RE.fullmatch(tok.replace(" ", "")) or LEVEL_RE.fullmatch(tok):
                    m = LEVEL_RE.search(tok)
                    raw = m.group(0)
                    lvl = normalize_level(raw)
                    c["original"] = re.sub(r"\s+", " ", raw)
                    c["level"] = lvl
                    if tok.endswith("*"):
                        c["fussnote"] = re.search(r"\*+$", tok).group(0)
                else:
                    m = re.match(r"(NotSan|Notsan|RettAss|Notarzt|RS)(\*+)$", tok)
                    if m:
                        c["original"] = m.group(1)
                        c["level"] = normalize_level(m.group(1))
                        c["fussnote"] = m.group(2)
        parsed.append({"y0": t[0][0], "y1": t[-1][0], "zellen": cells})
    return parsed


def footnotes_below(lines, y1, limit=40):
    out = []
    for ln in lines:
        if y1 < ln["y"] <= y1 + limit and ln["text"].startswith("*") and not ln["bold"]:
            out.append(ln["text"])
    return out


def title_and_text_above(lines, y0, prev_end):
    """Titel und Dosistext zwischen vorheriger Tabelle und dieser Tabelle.

    Titel = erste Zeile mit der größten Schrift im Abschnitt (ohne Seitentitel),
    Text = alle folgenden Zeilen bis zur Tabelle.
    """
    block = [
        l for l in lines
        if prev_end < l["y"] < y0 - 1
        and l["size"] >= 7.9
        and not (l["y"] < 50 and l["size"] >= 10.9)
        and not BEREICH_RE.match(l["text"])
        and not re.fullmatch(r"[►▶★｜·\s*]+", l["text"])
    ]
    if not block:
        return None, []
    biggest = max(l["size"] for l in block)
    idx = next(i for i, l in enumerate(block) if l["size"] == biggest)
    return block[idx]["text"], [l["text"] for l in block[idx + 1:]]


def extract_freigaben(doc, pages, heading_of_page):
    out = []
    for pn in pages:
        page = doc[pn - 1]
        lines = group_lines(spans_of(page))
        tabs = tables_on_page(page)
        prev_end = 0
        for i, t in enumerate(tabs):
            title, text = title_and_text_above(lines, t["y0"], prev_end)
            prev_end = t["y1"] + 8
            fns = footnotes_below(lines, t["y1"])
            if fns:
                prev_end = max(prev_end, t["y1"] + 8 + 10 * len(fns))
            out.append({
                "id": f"s{pn}_t{i + 1}",
                "seite": pn,
                "seitentitel": heading_of_page.get(pn),
                "titel": title,
                "text": text,
                "zellen": t["zellen"],
                "fussnoten": fns,
            })
    return out


# ------------------------------------------------------------ SAA-Abschnitte

def section_key(text, headings):
    for key, pat in headings:
        if re.match(pat, text):
            return key
    return None


def collect_sections(lines, headings, skip_y_from=None):
    sections = {}
    anchors = []
    for l in lines:
        key = section_key(l["text"], headings) if l["spans"][0]["bold"] else None
        if key:
            anchors.append((l["y"], l["x0"], key))
    pending_bullet = {}  # Spalte -> x des Aufzählungszeichens
    for l in lines:
        if skip_y_from is not None and l["y"] >= skip_y_from - 4:
            continue
        if l["size"] <= 8.5 and BEREICH_RE.match(l["text"]):
            continue
        col = "r" if l["x0"] > 300 else "l"
        key = section_key(l["text"], headings) if l["spans"][0]["bold"] else None
        if key:
            pat = headings[[k for k, _ in headings].index(key)][1]
            rest = re.sub(pat, "", l["text"]).strip(" :")
            sections.setdefault(key, [])
            pending_bullet.pop(col, None)
            if rest:
                sections[key].append({"text": rest, "ergaenzung": l["ergaenzung"], "bold": False, "bullet": False, "x": round(l["x0"])})
            continue
        cands = [a for a in anchors if a[0] <= l["y"] + 1 and ((a[1] > 300) == (col == "r"))]
        if not cands:
            cands = [a for a in anchors if a[0] <= l["y"] + 1]
        if not cands:
            continue
        current = max(cands, key=lambda a: a[0])[2]
        txt = l["text"]
        if re.fullmatch(r"[-▪︎•]+", txt.strip()):
            pending_bullet[col] = l["x0"]
            continue
        bullet = bool(re.match(r"^[-▪•]", txt))
        if col in pending_bullet and l["x0"] > pending_bullet[col]:
            bullet = True
            del pending_bullet[col]
        txt = re.sub(r"^[-▪︎•\s]+", "", txt).strip()
        if not txt:
            continue
        # x des eigentlichen Textes (ohne Aufzählungszeichen), damit Fortsetzungszeilen fluchten
        text_x = next((sp["x"] for sp in l["spans"] if sp["text"].strip() not in ("-", "▪︎", "▪", "•")), l["x0"])
        sections.setdefault(current, []).append(
            {"text": txt, "ergaenzung": l["ergaenzung"], "bold": l["bold"], "bullet": bullet, "x": round(text_x)}
        )
    # Fortsetzungszeilen (gleiche Einrückung wie der vorherige Aufzählungspunkt) anhängen
    for key, items in sections.items():
        merged = []
        for it in items:
            prev = merged[-1] if merged else None
            if (
                prev is not None
                and not it["bullet"]
                and not it["bold"]
                and not prev["bold"]
                and abs(it["x"] - prev["x"]) <= 3
                and it["ergaenzung"] == prev["ergaenzung"]  # Ergänzungen bleiben eigene Punkte
                and (
                    prev["bullet"]
                    or re.match(r"^[a-zäöü(]", it["text"])
                    or re.search(r"(\bund|\boder|\bsowie|\bmit|\bbei|,|-|–|/)$", prev["text"])
                )
            ):
                prev["text"] += " " + it["text"]
            else:
                merged.append(dict(it))
        for m in merged:
            m.pop("x", None)
        sections[key] = merged
    return sections


def page_title(lines):
    top = [l for l in lines if l["y"] < 70 and l["size"] >= 10.9 and l["spans"][0]["bold"]]
    if not top:
        return None
    biggest = max(l["size"] for l in top)
    return " ".join(l["text"] for l in top if l["size"] == biggest)


def slug(s):
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def extract_medikamente(doc):
    meds = []
    for pn in range(49, 80):
        page = doc[pn - 1]
        lines = group_lines(spans_of(page))
        title = page_title(lines)
        tabs = tables_on_page(page)
        table_y = tabs[0]["y0"] - 2 if tabs else None
        secs = collect_sections(lines, MED_HEADINGS, skip_y_from=table_y)
        if not title or not ({"wirkstoff", "gruppe"} & secs.keys()):
            continue
        name = title.rstrip("*").strip()
        meds.append({
            "id": slug(name),
            "name": name,
            "seite": pn,
            "abschnitte": secs,
        })
    return meds


def extract_massnahmen(doc):
    out = []
    for pn in range(28, 46):
        page = doc[pn - 1]
        lines = group_lines(spans_of(page))
        title = page_title(lines)
        tabs = tables_on_page(page)
        grenzen = [tabs[0]["y0"] - 2] if tabs else []
        # Größentabellen der EGA (S. 31–33) lassen sich nicht zeilenweise lesen:
        # Abschnitte enden davor, die App verweist auf die Originalseite.
        groessen = [l["y"] for l in lines if GROESSENTABELLE_RE.match(l["text"])]
        grenzen += groessen
        secs = collect_sections(lines, MASSNAHME_HEADINGS, skip_y_from=min(grenzen) if grenzen else None)
        if not title:
            continue
        eintrag = {"id": slug(title), "name": title, "seite": pn, "abschnitte": secs}
        if groessen:
            eintrag["groessentabelle"] = True
        out.append(eintrag)
    return out


def extract_inhalt(doc):
    """Inhaltsverzeichnis (S. 5): abwechselnd Titelzeile(n) und Seitenzahl."""
    toc = []
    buf = []
    for raw in doc[4].get_text("text").splitlines():
        t = raw.strip()
        if not t or t == "Inhaltsverzeichnis":
            continue
        if re.fullmatch(r"\d{1,3}", t):
            if buf:
                toc.append({"titel": " ".join(buf), "seite": int(t)})
                buf = []
            continue
        buf.append(t)
    if buf and toc:  # mehrzeiliger letzter Titel ("... Säugling / Kleinkind")
        toc[-1]["titel"] += " " + " ".join(buf)
    return sorted(toc, key=lambda e: e["seite"])


def main():
    pdf, outdir = sys.argv[1], Path(sys.argv[2])
    outdir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)

    heading_of_page = {}
    table_pages = []
    for pn in range(1, doc.page_count + 1):
        page = doc[pn - 1]
        lines = group_lines(spans_of(page))
        heading_of_page[pn] = page_title(lines)
        if pn >= 26 and tables_on_page(page):
            table_pages.append(pn)

    data = {
        "medikamente.json": extract_medikamente(doc),
        "massnahmen.json": extract_massnahmen(doc),
        "freigaben.json": extract_freigaben(doc, table_pages, heading_of_page),
        "inhalt.json": extract_inhalt(doc),
    }
    meta = {"quelle": "Gemeinsames Kompendium Rettungsdienst 2026", "seiten": doc.page_count, "bereiche": BEREICHE}
    for name, payload in data.items():
        (outdir / name).write_text(json.dumps({"meta": meta, "daten": payload}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(name, len(payload))


if __name__ == "__main__":
    main()
