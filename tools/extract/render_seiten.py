"""Rendert die Kompendium-Seiten, auf die die App verweist, als JPEG.

Aufruf (aus dem Repo-Root):
    python -I tools/extract/render_seiten.py <pfad/zum/GemKompRD2026.pdf>

Erzeugt:
    assets/kompendium/s<seite>.jpg
    src/data/seitenBilder.ts   (statische require()-Tabelle für Metro)
"""

import json
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
ZOOM = 2.0  # ≈ 144 dpi – beim Vergrößern noch gut lesbar
QUALITAET = 65


def benoetigte_seiten():
    seiten = set()
    for name in ("medikamente", "massnahmen"):
        for e in json.loads((ROOT / f"data/generated/{name}.json").read_text())["daten"]:
            seiten.add(e["seite"])
    for t in json.loads((ROOT / "data/generated/freigaben.json").read_text())["daten"]:
        seiten.add(t["seite"])
    for b in json.loads((ROOT / "data/curated/bpr.json").read_text())["bpr"]:
        seiten.update(range(b["seite"], b.get("bisSeite", b["seite"]) + 1))
    return sorted(seiten)


def main():
    doc = pymupdf.open(sys.argv[1])
    ziel = ROOT / "assets/kompendium"
    ziel.mkdir(parents=True, exist_ok=True)
    seiten = benoetigte_seiten()
    groesse = 0
    for pn in seiten:
        pix = doc[pn - 1].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM))
        daten = pix.tobytes("jpeg", jpg_quality=QUALITAET)
        (ziel / f"s{pn}.jpg").write_bytes(daten)
        groesse += len(daten)
    zeilen = [
        "// Automatisch erzeugt von tools/extract/render_seiten.py – nicht von Hand ändern.",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const SEITEN_BILDER: Record<number, ImageSourcePropType> = {",
        *[f"  {pn}: require('../../assets/kompendium/s{pn}.jpg')," for pn in seiten],
        "};",
        "",
    ]
    (ROOT / "src/data/seitenBilder.ts").write_text("\n".join(zeilen), encoding="utf-8")
    print(f"{len(seiten)} Seiten, {groesse / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
