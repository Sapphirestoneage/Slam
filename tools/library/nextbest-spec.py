# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 43: add the Ask me next and certainty meter Math row (M9Q) to the spec's Math tab, once.

  python3 tools/library/nextbest-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9Q", "Ask me next and the certainty meter",
     "Built on the ranges (M9R). The certainty meter: for each key output (the FI date, the debt-free date, emergency fund months, the monthly surplus, net worth), 1 minus its width over the width it would have with every input on file read as a guess (the stand-in for age-only), clamped 0 to 1; the meter is their weighted average (Assumptions: CertaintyWeight*). A date that could run on and never come counts CertaintyOpenMonths wide. Ask me next: the Picture %'s next small things come first when the plan cannot run without one (nothing typed yet); then each input below Know it is read at the level its answer reaches (the gut number read off a statement or an app: Estimate; a statements total built from the lines, and any other number: Know it), that one input is run again, and each key output's drop in width over its all-guess width is added up by weight, plus CertaintyWeightFoo when the answer settles the FOO step. Score = that over the seconds the question takes (AskSecondsNumber for a number already given, AskSecondsLookup for one read off an app or statement, AskSecondsBuild for the lines). On a near tie (2%) the input behind These are big deals (M56) goes first, then the next small things order. Skipped: Will get it (homework) and Not now. The value is the meter; the parts are the question and the runner-up.",
     "the ranges and drivers (M9R), the Picture % and next small things (M73), These are big deals (M56), the FOO step's range (M69), the weights and question times",
     "Nothing on file: no meter and no question. An input already at Know it is never asked. A question whose answer would narrow nothing is left out",
     "Batch 43 (ROADMAP Phase 4 Track 1). Maya after Fast Track: meter 55%; Ask next: what you spend a month, read off a bank or card app (pins the FI date to within about 4 years); then the invested balance. Alexis: 54%; the spending total first, the card APR next. Tom: 79%; his invested balance, then the spending built from the lines."),
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

