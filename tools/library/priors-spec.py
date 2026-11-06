# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 31: add the typical-at-your-age Math row (M9E) to the spec's Math tab, once.

  python3 tools/library/cards-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9E", "Typical at your age",
     "From data/priors-2026.json (only the Primary rows of docs/engines/priors-sources.md): for the client's age band (the all-ages row where the source has no age split), the typical range of a field is the source's median (SCF) or mean (CE) times TypicalLow and TypicalHigh, since no Primary row publishes percentiles. Cash is every checking and savings balance together (SCF transaction accounts), cards every card balance (SCF, among carriers), student loans every education loan (SCF, among holders), spending the gut number a month (CE total expenditures less personal insurance and pensions, over 12). A total is far outside when above high x high / likely or below low x low / likely; debts and spending note only the high side. The value counts the totals far outside. Part: the SCF median net worth for the age. A place row would scale a range; none is Primary yet, so NY reads national.",
     "age (profile.birthYear, birthMonth), the cash accounts' balances, Credit card and Student loan balances, the gut spending number (spending All in), RULES typicalLow and typicalHigh, data/priors-2026.json",
     "No age: the all-ages rows only. No Primary row (rent, retirement balances): no range, said so",
     "Batch 31 (ROADMAP Track 1; Eli Nov 6: the coach always sees typical-at-your-age ranges, one switch shows them in client view; both as a check). Words: Below what most households have in checking and savings. Alexis, 28, $400 checking: typical at all ages $4,920 to $12,300 (SCF 2025 median $8,200), far below under $2,952, so the note shows under her checking box."),
]

wb = openpyxl.load_workbook(SPEC)
ws = wb["Math"]
have = {ws.cell(r, 1).value for r in range(1, ws.max_row + 1)}
last = ws.max_row
for row in ROWS:
    if row[0] in have:
        continue
    last += 1
    for i, v in enumerate(row, start=1):
        c = ws.cell(last, i, v)
        src = ws.cell(last - 1, i)
        if src.has_style:
            c.font, c.alignment, c.border, c.fill, c.number_format = copy(src.font), copy(src.alignment), copy(src.border), copy(src.fill), src.number_format
    print("added", row[0])
wb.save(SPEC)
