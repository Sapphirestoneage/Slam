# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 42: add the lender's-eye view Math row (M9W) to the spec's Math tab, once.

  python3 tools/library/lender-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9W", "What a lender sees: a mortgage lender, a landlord and a card issuer",
     "Each income row read three ways (js/math/lender.js). A paycheck counts at its gross (card tips are on it); cash tips only when reported. Self-employment (1099, a business, a side hustle, a Platform row) counts from the returns filed, net of costs written off: two returns averaged but never more than the latest (Fannie Mae B3-3.1-01 on a declining trend; FHA 4000.1 the lesser of the averages); one return, a mortgage lender waits for the second and a landlord reads it; none, nothing. Unemployment does not count for a mortgage (seasonal work only); a benefit counts when it runs LenderBenefitYears (mortgage) or LenderLeaseMonths (landlord); Rental as typed, its loan netted; gifts in neither. Debts at the payment on the credit report: a card at its minimum (M30), a student loan with none at LenderStudentPct of the balance, no family loans. The mortgage read is total DTI against LenderBack, LenderFhaBack, LenderBackStrong and LenderBackDu, and the home payment the usual lines clear (min of LenderFront x income and LenderBack x income less other debts), as a loan at LenderMortgageRate over LenderMortgageYears after LenderTaxInsShare for taxes and insurance. The landlord read is gross a month over the rent against LenderRentTimes (LenderRentYearNyc / 12 in NYC). The card read is utilization against UtilHigh and UtilBest, with what to pay before the statement closes. The gap is earned less what a mortgage lender counts, a month, and the home loan and rent it rules out. Each move is the reading run again with one change (reporting tips, filing the next return in full, paying off the debt with the biggest payment for its balance); the two that move each read most are shown.",
     "every income row (gross, cash tips and Cash tips reported, Tax returns filed, Net profit on the last return and the one before), benefit end dates, debts (payments, minimums, linked home or rental), the rent line, card balances, limits and statement days; the Lender* rules, UtilHigh, UtilBest",
     "No income: the screen asks for income first. Returns not answered: read as two returns at this year's pace, marked Guess. No card limit: the card read asks for one (a button to the limit box)",
     "Batch 42 (ROADMAP Phase 4 Track 2, Lender's-eye view). Nova (dancer): earns $6,175 a month, returns $41,000 and $52,000 average to $3,875 a month for a mortgage lender, $4,333 for a landlord; the $2,300 gap rules out about $79,000 of home loan. Riley (bartender): $1,430 a month of cash tips not reported. Kai (creator): one return with OnlyFans, so a mortgage lender counts only the job."),
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
