#!/usr/bin/env python3
"""Build public/data/hs-tariff-descriptions.js from a markdown HS/tariff table.

The source file is a markdown table with columns:

    | Hscode | TARIFF_DESCRIPTION |  |
    | 01012100 | Pure-bred breeding animals of horses.. |  |

The HS code column is expected to contain exactly 8 digits with no dots.
The output is a small browser-loadable JS file:

    window.HS_TARIFF_DESCRIPTIONS = { "01012100": "..." };

Usage:

    python3 scripts/build-hs-tariff-data.py "Hscode TARIFF DESCRIPTION.md"
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def parse_markdown_table(path: Path) -> dict[str, str]:
    rows: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        parts = [part.strip() for part in stripped.strip("|").split("|")]
        if len(parts) < 2:
            continue
        code = parts[0]
        if not re.fullmatch(r"\d{8}", code):
            continue
        description = parts[1].strip()
        rows[code] = description
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Markdown HS/tariff table")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/hs-tariff-descriptions.js"),
        help="Output JS file path",
    )
    args = parser.parse_args()

    data = parse_markdown_table(args.source)
    if not data:
        raise SystemExit("No valid 8-digit HS rows found in source file.")

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "/* Auto-generated from the uploaded HS code / tariff description table.\n"
        "   Exact 8-digit lookup only. Rebuild with scripts/build-hs-tariff-data.py.\n"
        "*/\nwindow.HS_TARIFF_DESCRIPTIONS = " + payload + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {args.output} rows={len(data)} unique={len(data)} bytes={args.output.stat().st_size}")
    print(f"sample {args.output}: {data.get('52083900')}")


if __name__ == "__main__":
    main()
