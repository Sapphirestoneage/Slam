# SPDX-License-Identifier: AGPL-3.0-only
"""Write the spec's Program tab from js/registry/program.js, so the spec and the code say the same thing.

  python3 tools/program_tab.py
  python3 tools/xlsx_to_csv.py

Rewrites the Program tab of spec/SLAM Build Spec.xlsx (sessions and their checklists, levels, weights, pace, unlocks,
confidence, and the Home layout). test/program.test.js checks spec/csv/Program.csv against the registry.
"""
import json
import subprocess
from copy import copy
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec" / "SLAM Build Spec.xlsx"
TAB = "Program"

READ = """
import { LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, SESSIONS } from './js/registry/program.js';
console.log(JSON.stringify({ LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, SESSIONS }));
"""
LEVEL_WORDS = {
    "Missing": "Nothing typed (or parked with I'll find it later)",
    "Gut": "A guess: a starter line, Not sure, or the gut spending number",
    "Rough": "Marked Roughly",
    "Estimate": "Typed and Know it",
    "Actual": "Confirmed: a month of actuals on a Budget line, a balance from a statement or the bank, or locked by the coach",
}
WEIGHT_WORDS = {
    "income": "Each income row's take-home", "debtBalance": "Each debt's balance", "debtApr": "Each debt's APR",
    "account": "Each account's balance", "thing": "Each home, car or other thing's value",
    "gut": "The gut spending number, standing in for the categories until the lines are the source",
    "draftt": "Each DRAFTT category of Budget lines (the average of its lines' levels)", "otherLines": "The other Budget lines, as one item",
    "age": "Age (About you)", "areas": "What you have today (About you)",
}
HOME = [
    ("One nav row", "The five tabs (Home, Net worth, Cash flow, Plan, Report). Home has no sub-tab row; About you is a link in the strip and shows the bar with the way back"),
    ("Session strip", "Client name, About you, 'Session N of 12 · name', Next session date, client status; Start session (the one main button) switches the session on: Next step, End session, minutes left, Show all fields"),
    ("Path", "Twelve nodes, done ones ticked, the current one outlined; a node opens its checklist. Auto items tick from the numbers; the rest are checkboxes; placeholder sessions can be renamed and their checklists edited"),
    ("Picture bar", "Picture N% with Ahead, On track or Catch up and the pace sentence; By section opens one bar per section"),
    ("Next small things", "Three cards: +X%, the number, its level now and the step; a button opens the exact field"),
    ("Money in one line", "Net worth, monthly surplus, savings rate, and the FI date locked (with the plain reason) or unlocked (with a confidence label)"),
    ("Hidden when empty", "Payday, open items, the cash dip, runway, Day 0 vs now and net worth over time show only when they have something to say"),
    ("More menu", "Undo, redo, Add anything and the parking lot sit behind one labeled More button in the top bar"),
    ("End session", "Saves the snapshot (Day 0 the first time, End of session N after), the homework, the one-pager, the next date and a backup; then Send summary"),
]


def main():
    cfg = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", READ], cwd=ROOT))
    wb = openpyxl.load_workbook(SPEC)
    head_src = wb["Math"]["A2"]
    title_src = wb["Math"]["A1"]
    body_src = wb["Math"]["A3"]
    if TAB in wb.sheetnames:
        del wb[TAB]
    ws = wb.create_sheet(TAB, index=wb.sheetnames.index("Math") + 1)
    rows = []

    def title(text):
        rows.append(("title", [text]))

    def head(*cells):
        rows.append(("head", list(cells)))

    def row(*cells):
        rows.append(("body", list(cells)))

    title("Program: the 12 sessions, every number's level, the Picture %, the pace, and what unlocks when (Phase 3, Nov 5 2026)")
    head("Section", "Item", "Detail", "Notes")
    row("Sessions", "", "Each client has a 12-session program. A session's checklist ticks itself from the data where it can (auto); the rest are checkboxes. Done when every item is ticked.", "js/registry/program.js SESSIONS; js/program.js autoChecks")
    for i, s in enumerate(cfg["SESSIONS"], 1):
        items = "; ".join(f"{it['label']} ({'auto' if it.get('auto') else 'manual'})" for it in s["items"])
        note = "Placeholder: the name and checklist can be edited on Home" if s.get("placeholder") else ""
        row("Sessions", f"S{i} {s['name']}", items, note)
    row("Levels", "", "Each number has a level, in points. The Picture % is the weighted average of every number's level.", "M73; js/registry/program.js LEVELS")
    for k, v in cfg["LEVELS"].items():
        row("Levels", k, str(v), LEVEL_WORDS[k])
    row("Weights", "", "Big items count more. A missing big thing (no income row yet) is one item at Missing, so an empty client reads 0%.", "js/registry/program.js WEIGHTS")
    for k, v in cfg["WEIGHTS"].items():
        row("Weights", k, str(v), WEIGHT_WORDS[k])
    row("Pace", "", "The Picture % expected by the end of each session; later sessions hold the session 3 mark. Ahead: at or past this session's mark. On track: within the margin of what was due by now. Catch up: below it.", "js/registry/program.js PACE")
    for n in range(1, len(cfg["SESSIONS"]) + 1):
        row("Pace", f"S{n}", f"{cfg['PACE']['expected'].get(str(n), cfg['PACE']['hold'])}%", "")
    row("Pace", "Margin", f"{cfg['PACE']['margin']} points", "")
    row("Unlocks", "", "A calculator shows locked, with a plain reason ('Unlocks when spending reaches Estimate (2 of 5 there)'), until every item in each group is at or above the level.", "js/registry/program.js UNLOCKS")
    for k, u in cfg["UNLOCKS"].items():
        row("Unlocks", u["label"], "; ".join(f"{n['label']} (every {n['group']} item at {n['min']}+)" for n in u["needs"]), "")
    row("Confidence", "", f"Once unlocked: High at a weighted input level of {cfg['CONFIDENCE']['high']} or more, Medium at {cfg['CONFIDENCE']['medium']} or more, else Low; any input older than the aged-check days drops it one step. Shown instead of the Guess tag.", "js/registry/program.js CONFIDENCE")
    row("Snapshots", "", "Ending a session saves a snapshot with the key numbers and the Picture %: Day 0 the first time, End of session N after. They live in the client file, so they export and import with it.", "js/program.js endSession")
    for k, v in HOME:
        row("Home", k, v, "")

    for r, (kind, cells) in enumerate(rows, 1):
        src = {"title": title_src, "head": head_src, "body": body_src}[kind]
        for c, v in enumerate(cells, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = copy(src.font)
            cell.fill = copy(src.fill)
            cell.alignment = copy(src.alignment)
            cell.border = copy(src.border)
        if kind in ("title", "head"):
            for c in range(len(cells) + 1, 5):
                ws.cell(row=r, column=c).fill = copy(src.fill)
    for col, w in zip("ABCD", (14, 30, 90, 50)):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A3"
    wb.save(SPEC)
    print(f"{TAB}: {len(rows)} rows")


if __name__ == "__main__":
    main()
