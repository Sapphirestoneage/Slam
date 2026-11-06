# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 49: add the households of any size Math row (M9N) to the spec's Math tab, once.

  python3 tools/library/households-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9N", "Households of any size: one adult's part of a shared row",
     "js/math/household.js. The adults in the plan are this client, the partner in a couple mode and People P3 to P7 (up to 6). A row is shared when its Owner is Joint (everyone on this row) or it is a bill split with them. Shared among: the adults ticked, blank is everyone. Split how: Equal is 1 / the people it is shared among; Percent is the percent typed for each, the people with none typed sharing what is left equally; By income is their take-home over the take-home of everyone on the row (equal while none is known); blank follows Shared bills split on About you. The household's books (and its view, Everyone) count every row whole, a shared bill once (less the roommates' part when roommates outside the plan share it); one adult's view counts their own rows and their part of the shared ones, and a row shared among others is not in it. Past two adults every adult's income is taxed on their own return (Single).",
     "Owner, Shared among, Split how, the percents, Shared bills split, each adult's take-home, Roommates",
     "No other adults: Owner and the switch do not show. A couple with no split typed reads as before (a Joint row at half, a shared bill at the couple's split). An adult taken out of the plan: their rows become this client's",
     "Batch 49 (ROADMAP Phase 4 Track 2, Households of any size). Riley, Jules and Dev: rent $3,000 at 40/40/20, groceries $900 at 35/35/30, utilities in thirds, internet for two; Riley's surplus $3,010, Jules's $1,970, Dev's $1,510, Everyone $6,490."),
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

