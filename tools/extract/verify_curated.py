"""Prüft die kuratierten Daten gegen den Originaltext des Kompendiums.

Aufruf (aus dem Repo-Root):
    python -I tools/extract/verify_curated.py <pfad/zum/GemKompRD2026.pdf>

Geprüft wird:
  * jeder Belegtext einer Dosisregel steht wörtlich auf der angegebenen Seite,
  * jeder Konzentrationstext steht wörtlich auf seiner Seite,
  * jeder überschriebene Dosistext der Freigabe-Zuordnung steht wörtlich auf der
    Seite der Tabelle; ist er umformatiert (z. B. Tabellenspalten zu Zeilen),
    müssen zumindest alle Zahlen darin auf der Seite vorkommen,
  * die Zahlenwerte der Dosisregeln (Dosis, Maximum) kommen in den Belegen vor,
  * jede extrahierte Freigabetabelle ist zugeordnet oder bewusst ignoriert.

Exit-Code 1 bei Fehlern.
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]


def norm(s):
    s = s.replace(" ", " ").replace("–", "-").replace("—", "-").replace("‐", "-")
    s = s.replace("➞", "➜").replace("▪︎", "").replace("｜", "")
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def numbers(s):
    return set(re.findall(r"\d+(?:[.,]\d+)?", s))


def fmt(v):
    s = f"{v:g}".replace(".", ",")
    return s


def main():
    doc = pymupdf.open(sys.argv[1])
    page_text = {i + 1: norm(doc[i].get_text("text")) for i in range(doc.page_count)}
    # zusätzlich zeilenübergreifend ohne Bindestrich-Umbrüche
    errors, warnings = [], []

    def on_page(text, page):
        t = norm(text)
        return t in page_text[page] or t.replace(" ", "") in page_text[page].replace(" ", "")

    regeln = json.loads((ROOT / "data/curated/dosisregeln.json").read_text())["regeln"]
    ids = set()
    for r in regeln:
        if r["id"] in ids:
            errors.append(f"Regel {r['id']}: doppelte ID")
        ids.add(r["id"])
        for b in r["beleg"]:
            if not on_page(b, r["seite"]):
                errors.append(f"Regel {r['id']}: Beleg nicht auf S. {r['seite']} gefunden: {b!r}")
        k = r.get("konzentration")
        if k and not on_page(k["text"], k["seite"]):
            errors.append(f"Regel {r['id']}: Konzentrationstext nicht auf S. {k['seite']}: {k['text']!r}")
        belegzahlen = set().union(*(numbers(b) for b in r["beleg"]))
        werte = [r["dosis"]["wert"]]
        if "max" in r["dosis"]:
            werte.append(r["dosis"]["max"])
        mg = r.get("maxGesamt") or {}
        werte += [v for kk, v in mg.items() if kk in ("wert", "proKg")]
        for w in werte:
            kandidaten = {fmt(w), fmt(w).replace(",", "."), f"{w:,.0f}".replace(",", ".") if w >= 1000 else fmt(w)}
            if not (kandidaten & belegzahlen):
                errors.append(f"Regel {r['id']}: Wert {w} steht in keinem Beleg ({sorted(belegzahlen)})")

    zu = json.loads((ROOT / "data/curated/freigabe-zuordnung.json").read_text())
    tabellen = json.loads((ROOT / "data/generated/freigaben.json").read_text())["daten"]
    tab_ids = {t["id"]: t for t in tabellen}
    zugeordnet = {z["tabelle"] for z in zu["zuordnung"]}
    for tid in tab_ids:
        if tid not in zugeordnet and tid not in zu["ignoriert"]:
            errors.append(f"Tabelle {tid} ({tab_ids[tid]['titel']}) ist weder zugeordnet noch ignoriert")
    for z in zu["zuordnung"]:
        t = tab_ids.get(z["tabelle"])
        if not t:
            errors.append(f"Zuordnung verweist auf unbekannte Tabelle {z['tabelle']}")
            continue
        for zeile in z.get("dosistext", []):
            if on_page(zeile, t["seite"]):
                continue
            fehlend = [n for n in numbers(zeile) if n not in numbers(page_text[t["seite"]])]
            if fehlend:
                errors.append(f"{z['tabelle']}: Dosistext-Zahlen {fehlend} nicht auf S. {t['seite']}: {zeile!r}")
            else:
                warnings.append(f"{z['tabelle']}: umformatiert (Zahlen geprüft): {zeile!r}")

    for w in warnings:
        print("HINWEIS ", w)
    for e in errors:
        print("FEHLER  ", e)
    print(f"{len(regeln)} Dosisregeln, {len(zu['zuordnung'])} Zuordnungen geprüft – "
          f"{len(errors)} Fehler, {len(warnings)} Hinweise")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
