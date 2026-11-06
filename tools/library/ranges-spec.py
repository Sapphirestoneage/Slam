# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 41: add the ranges Math row (M9R) to the spec's Math tab, once.

  python3 tools/library/ranges-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9R", "Ranges on the key outputs: low, likely and high",
     "The corner method (docs/engines/ranges.md): likely is the plan as entered, the number every screen shows. Then the whole plan is run again with each uncertain input at its low and at its high, the rest as entered. An input's swing on an output is the gap between its two runs; the swings combine as the root of the sum of their squares, one side at a time (inputs taken as independent). The gut number and the Budget lines are one input (they move together); each income, balance, value and APR is its own. How far an input moves comes from its level and kind (Assumptions: RangeBalance*, RangeSpend*, RangeIncome*, RangeVariable*, RangeApr*, RoughBalanceShare, AprGuessSwing); a typical amount not answered yet moves TypicalLow to TypicalHigh. Outputs: the FI date, the debt-free date, emergency fund months, the monthly surplus, net worth (low, likely, high each) and the FOO step (the earliest and latest step any one input reaches). A date that never comes at an end is blank there (or later). Shown only when the inputs below Know it move it more than the materiality (MaterialHours at the real hourly wage, never under MaterialFloor; a surplus counts a year; a date at least RangeMinMonths, its months valued at a month of spending; emergency fund months at least RangeMinEfMonths). The value counts the outputs wide enough to show.",
     "every input's level (M73), its kind, the width rules, M17 materiality, and every formula the outputs use (M27, M34, M40, M43, M53, M69)",
     "An output with no likely value has no range. Nothing below Know it: the range is the balances' 2% only and no line shows",
     "Batch 41 (ROADMAP Phase 4 Track 1). Alexis after Fast Track: debt free likely 64 months, 35 to 85 (the guessed card APR and the gut spending). Tom, statements total and a rough invested total: FI likely Dec 2040, could be Sep 2039 to May 2042. Words under the number: Likely Mar 2041, could be Aug 2039 to Jan 2044; a tap names the two inputs widening it most, each with a button to its box."),
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

