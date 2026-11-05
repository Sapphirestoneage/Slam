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
import { LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, SESSIONS, MONEY_DATES } from './js/registry/program.js';
import { AREAS, RATINGS, THRESHOLDS, PAYOFF, FOO_ORDER } from './js/registry/scorecard.js';
console.log(JSON.stringify({ LEVELS, WEIGHTS, PACE, UNLOCKS, CONFIDENCE, SESSIONS, MONEY_DATES, SCORE: { AREAS, RATINGS, THRESHOLDS, PAYOFF, FOO_ORDER } }));
"""
RULE_WORDS = {
    "cashFlow": "The headline savings rate: Strong at or over strong, OK at or over ok, else Hole; a negative surplus is a Hole",
    "emergency": "Cash over a month of spending: Hole under holeMonths, Strong at or over strongMonths (or past the Rule of 5 target), else OK",
    "debt": "Heavy debt (cards, payday, personal, medical, BNPL, or any APR at or over the heavy line) is a Hole; low-rate debt with payments over dti of gross is OK; else Strong (no debt per About you is Strong)",
    "credit": "Cards used over utilizationHole is a Hole; a score under ok is a Hole; a score at or over strong with cards within utilizationOk is Strong; else OK; no score and cards within the line stays unrated",
    "retirement": "Match left on the table is a Hole; 401(k), HSA and after-tax retirement saving at or over strongPct of gross is Strong; some is OK; none while employed is a Hole",
    "investing": "What goes into investments a month at or over strongPct of take-home is Strong; something invested or going in is OK; nothing with a take-home known is a Hole",
    "taxes": "No rule: the coach rates it after a look at Taxes",
    "protection": "No health coverage (or no life or disability with dependents) is a Hole; a missing or Not sure coverage is OK; all in place is Strong; no coverage rows stays unrated",
    "income": "Between jobs is a Hole; steady income is Strong; varies or unpredictable is OK; no take-home or no stability answer stays unrated",
    "goals": "count short-term and count long-term goals complete is Strong; any goal is OK; none is a Hole",
    "mindset": "The latest money feeling: at or over strong is Strong, at or under hole is a Hole, between is OK; none stays unrated",
}
PAYOFF_WORDS = {
    "cashFlow": "The gap to the ok savings rate: ok times take-home minus the surplus, times 12",
    "emergency": "The gap to months of spending, carried on a card at the typical card APR",
    "debt": "Interest a year on the heavy debt (balance times APR, added up)",
    "credit": "aprPoints more APR on every debt balance",
    "retirement": "The match left on the table a year, plus (with nothing going in) the tax saved by putting targetPct of gross away before tax at the marginal rate",
    "investing": "Cash above the emergency target plus a surplus not invested, a year, grown at the real return",
    "taxes": "No rule: the coach types a payoff", "protection": "No rule: the coach types a payoff", "income": "No rule: the coach types a payoff",
    "goals": "No rule: the coach types a payoff", "mindset": "No rule: the coach types a payoff",
}
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

    title("Program: the 12 sessions, every number's level, the Picture %, the pace, what unlocks when, and the Scorecard (Phase 3, Nov 5 2026)")
    head("Section", "Item", "Detail", "Notes")
    row("Sessions", "", "Each client has a 12-session program. A session's checklist ticks itself from the data where it can (auto); the rest are checkboxes. Done when every item is ticked.", "js/registry/program.js SESSIONS; js/program.js autoChecks")
    for i, s in enumerate(cfg["SESSIONS"], 1):
        items = "; ".join(f"{it['label']} ({'auto' if it.get('auto') else 'manual'})" for it in s["items"])
        if s.get("itemsWhenClear"):
            items += "; once no hole is left: " + "; ".join(f"{it['label']} ({'auto' if it.get('auto') else 'manual'})" for it in s["itemsWhenClear"])
        note = "Placeholder: the name and checklist can be edited on Home" if s.get("placeholder") else "Pulls the top hole on the Scorecard when it starts" if s.get("hole") else ""
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
    row("Home", "After intake", "Once session 3 is done the progress bar reads 'X of 11 areas Strong or OK (Day 0: Y)'; the top holes show; a filled hole shows before and after with the FI days gained; the next chapter opens when no hole is left; the Game plan session takes next-year notes, a yearly review date and the monthly money date", "js/program.js afterIntake, filledHoles")
    row("Home", "Money date cadences", "; ".join(cfg["MONEY_DATES"]), "js/registry/program.js MONEY_DATES")
    # The scorecard (batch 2).
    sc = cfg["SCORE"]
    row("Scorecard", "", "Eleven areas, each Strong, OK or Hole. A rule suggests the rating from the data where it can; the coach can override any rating with a reason. Add or rename an area in js/registry/scorecard.js.", "M74; js/math/scorecard.js; Plan › Scorecard")
    for a in sc["AREAS"]:
        row("Scorecard", a["name"], RULE_WORDS[a["id"]], f"FOO step {a['foo']}; the usual effort {a['effort']} h; {a['route']}")
    for area, t in sc["THRESHOLDS"].items():
        for k, v in t.items():
            row("Thresholds", f"{area} {k}", str(v), "")
    row("Holes", "", "Each hole shows its payoff (dollars a year, hours of work, FI days: the $ / Hours / FI days view), an effort in hours (the usual, editable per client), and the best-return score = payoff over effort. Ranked: holes before the client's current FOO step first, then by score. 'How we got this' shows the math behind a caret. Strong areas show as slim rows.", "js/math/scorecard.js")
    for a in sc["AREAS"]:
        row("Holes", f"{a['name']} payoff", PAYOFF_WORDS[a["id"]], "; ".join(f"{k} {v}" for k, v in sc["PAYOFF"].get(a["id"], {}).items()))
    row("Holes", "Ranking", "FOO order " + ", ".join(sc["FOO_ORDER"]) + "; a hole before the client's step ranks first, then by best return, then by payoff", "")

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
