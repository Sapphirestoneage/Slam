# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 30: add the card library's Math rows (M9C, M9D) to the spec's Math tab, once.

  python3 tools/library/cards-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9C", "Is the card worth its fee",
     "For a card picked from the card library (data/library/cards.json) with an annual fee: the rewards on the Budget's everyday lines a year (each line category at the card's best rate, caps and shared caps, a pick-your-category rate on the biggest one, the rest at the base rate, points at the library's point value), unless tapped Don't, plus each credit tapped Use it, less the fee (the row's typed fee, else the library's). A difference under the client's materiality (MaterialHours at the real hourly wage, never under MaterialFloor, M17) reads as about even. Part: card benefits (cell phone protection, rental car coverage, extended warranty) a Budget line or Protection row may be doubling up, by the line's name.",
     "the library card, the Use it and Don't taps (debt.cardUse), debt.annualFee, the Budget lines by category, M17, assumptions.materialHours and materialFloor; PlainCardRate for the no-fee comparison",
     "No library card: Which card is it?. No fee: nothing to earn back. No Budget lines: rewards say Needs Budget lines",
     "Batch 30 (Eli Oct 2026: a card library with benefits as prefill templates, materiality applied). Words: Worth about $X a year more than its $Y fee; Gives back about $X a year less than its $Y fee; About even. Sapphire Preferred on $300 dining, $600 groceries, $150 gas, $40 streaming: $250 in rewards, worth about $155 more than its $95 fee."),
    ("M9D", "What would move the credit score most",
     "One line, in FICO's order of weight: a late payment or a card with autopay off (payment history, 35%); then utilization over UtilHigh, with the dollars to pay down to get under it (amounts owed, 30%); then over UtilBest; then InquiriesMany hard inquiries in 2 years (new credit); then an oldest card under 2 years (length of history); with nothing typed, start with the score and the limits; else keep doing what works.",
     "credit.score, M35 utilization and each card's balance and limit, credit.latePayments, debt.autopay, credit.inquiries, debt.opened",
     "Nothing typed: start with the score and each card's limit",
     "Batch 30 (Eli: see a client's credit beyond a simple debt view). On Credit cards › Your credit, in view while the section is closed. Example: $4,200 on a $6,000 limit: Paying the cards down by about $2,400, to under 30% of the limits, moves it most."),
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
