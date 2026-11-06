# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 44: add the bank fire drill Math row (M9F) to the spec's Math tab, once.

  python3 tools/library/firedrill-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9F", "Bank fire drill: days the reachable money covers the must-pay bills",
     "Pick a bank account (default: where the largest paycheck lands, its Lands in or its owner's checking). If it froze today: the calendar's next FireDrillDays (30) days, each paycheck by its Lands in and each bill by its Paid with (else its owner's checking); out of reach = its balance + accounts known at the same bank (Institutions, or Same bank tapped on the drill) + the pay landing there. Still reachable = other bank accounts (not Purpose: Taxes, listed apart) + cash on hand; card room = limit - balance on cards not at that bank (no limit: none). Must-pay a month = the Budget lines in housing, utilities and phone, food, getting to work, health and childcare, plus the mortgage and car payments, plus every other debt's minimum (M30); with only a gut number, the gut number (less the other debts' payments in it) plus the minimums. Days = floor(reachable / (must-pay x 12 / 365)); with the card = floor(min((reachable + room) / (must-pay x 12 / 365), reachable / ((housing + minimums) x 12 / 365))). The order (Bill_order: housing, utilities, food, getting to work, health, minimums, taxes, the rest): every outflow in the window not on a working card, a debt split into its minimum and the rest, paid in that order from the reachable cash and pay landing elsewhere, then the card room for a tier a card can pay. Stranded: a platform's held balance = net a month x 12 / 365 x hold days.",
     "Bank accounts (balance, institution, owner, purpose), income Lands in, Paid with, cash on hand, card limits and balances, M60 calendar entries, Budget lines or the gut number, M30, Bill_order, FireDrillDays, platform hold days (M12)",
     "No bank account: asks for a checking or savings account. No spending: Needs spending. No must-pay bills: no days.",
     "Batch 44 (Phase 4 Track 2). Dancer, checking at Bank A: $8,925 out of reach, $6,500 reachable (savings at Online Bank B and cash at home; $3,500 for taxes not counted), $3,300 a month, 59 days. Maya: $8,400 out of reach, $4,000, $3,685 ($3,500 + the $185 card minimum), 33 days. Creator: OnlyFans holds $540.82 ($2,350 x 12 / 365 x 7)."),
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

