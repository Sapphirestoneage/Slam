# SPDX-License-Identifier: AGPL-3.0-only
"""Batch 53: head of household, the Child Tax Credit and New York's child care help on the spec's Math tab (M10, M9B).

  python3 tools/library/b53-spec.py && python3 tools/xlsx_to_csv.py

Safe to run again (each cell is set to its batch 53 words), so it can be rerun after a rebase takes another batch's spec.
"""
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
CELLS = {
    "M10": {
        3: "Taxable = annual gross - pretax deductions - the standard deduction for the filing status (floor 0); apply that status's brackets from Reference data (Single and Married separately: Fed_single, StdDed_single; Married jointly: Fed_joint, StdDed_joint; Head of household: Fed_head, StdDed_head, batch 53). The Child Tax Credit (batch 53) is worked on the return that claims the children and said apart: CTC_perChild a child under CTC_ageUnder and CTC_other each other dependent, less CTC_phaseStep for each $1,000 or part over CTC_phaseSingle (CTC_phaseJoint), off the income tax first, the rest back as a refund up to CTC_refundMax a child and CTC_refundRate of earnings over CTC_earnedFloor",
        5: "No filing status: Married jointly once married, Head of household with a dependent on About you, else Single (a Guess until picked on About you or Taxes)",
    },
    "M9B": {
        4: "Solo or couple, Dependents, Kids ages, State, NYC, Health coverage, Filing status, every income row, the Rent or mortgage and Electric, gas, water lines, Benefits now (seven taps), SNAP a month, Child care paid out of pocket, Child care at full price; the SNAP_*, Medicaid_*, NY_*, ACA_*, EITC_*, CCAP_* and CTC_* values and tables",
        6: "Batch 47 (ROADMAP Phase 4 Track 2, The benefits cliff; D-301 in the older suite); batch 53 adds New York's child care help (CCAP_line: 85% of the state median income; the family share CCAP_shareRate of income over the poverty line, weekly, rounded down to CCAP_round; over the line care is full price) and the Child Tax Credit's change on the raise (a phase-out, not a cliff), and taxes a head of household on its own brackets. Jasmine (single parent, NY, 3 people, $28,000, head of household): SNAP $543 a month; a $13,000 raise crosses the $40,980 SNAP line and leaves her $430 a year ahead ($10,020.12 kept, SNAP $6,516, CCAP $130, EITC $3,559.12, Child Tax Credit +$615); no raise to $50,000 leaves her behind. Lena and Marco (NY couple, $84,000 on the marketplace): $16,399 of help (2027 prices, batch 54) ends at $86,560; a $5,000 raise leaves them $12,652 behind until it is $21,900.",
    },
}

wb = openpyxl.load_workbook(SPEC)
ws = wb["Math"]
for r in range(1, ws.max_row + 1):
    mid = ws.cell(r, 1).value
    for col, text in CELLS.get(mid, {}).items():
        if ws.cell(r, col).value != text:
            ws.cell(r, col).value = text
            print("set", mid, col)
wb.save(SPEC)
