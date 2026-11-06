# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 47: add the benefits cliff Math row (M9B) to the spec's Math tab, once.

  python3 tools/library/cliff-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (a row already there is left alone), so it can be rerun after a rebase takes another batch's spec.
"""
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
ROWS = [
    ("M9B", "The benefits cliff: the lines a raise crosses and what the household keeps",
     "js/math/cliff.js. The household size is you, a partner when Solo or couple says Couple, and the children (Dependents or Kids ages); its income a year is every income row but gifts, earned (paychecks with cash tips, self-employment) or not, and MAGI is that less pre-tax money and half the SE tax. Each line is a multiple of the poverty line (Poverty_base + Poverty_perPerson x (size - 1)) or a table: SNAP's gross line a month (SNAP_limits at 130%; New York SNAP_nyEarned with earnings, SNAP_nyCare with child care paid out of pocket or someone 60 or older; outside New York the net line too), its benefit (the most for the size less SNAP_benefitShare of net income: gross less SNAP_earnedShare of earnings, the standard deduction and the shelter costs over SNAP_shelterShare of what is left, capped at SNAP_shelterCap; rent plus SNAP_suaNyc or SNAP_suaRest in New York; at least SNAP_minimum for SNAP_minimumUpTo people); health coverage as one chain (Medicaid to Medicaid_adults in an expansion state, the Essential Plan to NY_essential in New York at NY_essentialPremium, then the benchmark plan from ACA_benchmark less the ACA_applicable share of MAGI, none over ACA_cliff, none under ACA_floor); New York children (NY_kidsMedicaid, NY_infantMedicaid, NY_chpFree, then NY_chpBands, full price over 400% not priced); the EITC (EITC_2026, phased in at the full credit over its earnings and out from the threshold to the end, plus EITC_nyShare in New York; none with no children under EITC_ageMin or over EITC_ageMax). A raise is a W-2 paycheck added to the household: kept = the raise less the household tax it adds (M12); each program tapped Getting it (and still under its line) is read again at the higher income, and the net is kept less what each loses. The break-even is the smallest raise at or above the one tested, in $100 steps, that leaves the net at or above zero.",
     "Solo or couple, Dependents, Kids ages, State, NYC, Health coverage, Filing status, every income row, the Rent or mortgage and Electric, gas, water lines, Benefits now (six taps), SNAP a month, Child care paid out of pocket; the SNAP_*, Medicaid_*, NY_*, ACA_*, EITC_* values and tables",
     "No income: the screen asks for income first. A status not tapped is a Guess from Health coverage and the income. Getting it with an income already over the line: said apart (it may end at renewal) and left out of the raise. Nowhere near a line: one line and nothing else",
     "Batch 47 (ROADMAP Phase 4 Track 2, The benefits cliff; D-301 in the older suite). Jasmine (single parent, NY, 3 people, $28,000): SNAP $543 a month, a $13,000 raise crosses the $40,980 SNAP line and leaves her $305 a year behind until it is $13,700. Lena and Marco (NY couple, $84,000 on the marketplace): $11,023 of help ends at $86,560; a $5,000 raise leaves them $7,276 behind until it is $14,800."),
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
