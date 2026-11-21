#!/usr/bin/env python3
"""Build public/data/hs-code-tax-2026-27.js from the 2026-27 HS code / tax markdown table.

The source file is a markdown table with columns:

    | HS Code | Description | Statistical Unit | CD | SD | VAT | AIT | RD | AT | TOTAL TAX (%) |

Each row is kept exactly as published: the description and every tax value are
stored as trimmed strings, so the tool can display them verbatim.

The output is a browser-loadable JS file:

    window.HS_CODE_TAX_2026_27 = {
      "01012100": { "description": "...", "unit": "u", "cd": "5", ... }
    };

Usage:

    python3 scripts/build-hs-code-tax-data.py "HS_Code_Unit_TOTAL_TAX_2026-27 (1).md"
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

COLUMNS = ("description", "unit", "cd", "sd", "vat", "ait", "rd", "at", "total")


def parse_markdown_table(path: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        parts = [part.strip() for part in stripped.strip("|").split("|")]
        if len(parts) < 10:
            continue
        code = parts[0]
        if not re.fullmatch(r"\d{8}", code):
            continue
        row = {column: parts[index + 1] for index, column in enumerate(COLUMNS)}
        rows[code] = row
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Markdown HS/tax table (2026-27)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/hs-code-tax-2026-27.js"),
        help="Output JS file path",
    )
    args = parser.parse_args()

    data = parse_markdown_table(args.source)
    if not data:
        raise SystemExit("No valid 8-digit HS rows found in source file.")

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "/* Auto-generated from the 2026-27 HS code / unit total tax table.\n"
        "   8-digit lookup only. Rebuild with scripts/build-hs-code-tax-data.py.\n"
        "*/\nwindow.HS_CODE_TAX_2026_27 = " + payload + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {args.output} rows={len(data)} unique={len(data)} bytes={args.output.stat().st_size}")
    print(f"sample {args.output}: {data.get('01012100')}")


if __name__ == "__main__":
    main()
