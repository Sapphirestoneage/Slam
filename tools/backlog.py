"""Write BACKLOG.md from spec/csv/Feature list.csv: every Phase 4 to 8 row, grouped by phase."""
import csv, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = list(csv.reader(open(ROOT / "spec/csv/Feature list.csv", encoding="utf-8")))
header = rows[1]
col = {name: header.index(name) for name in header}
names = {r[0]: r[2] for r in csv.reader(open(ROOT / "spec/csv/Roadmap.csv", encoding="utf-8")) if r and r[0].isdigit()}

by_phase = {}
for r in rows[2:]:
    phase = r[col["Phase"]].strip()
    if phase.isdigit() and 4 <= int(phase) <= 8:
        by_phase.setdefault(int(phase), []).append(r)

out = ["# Backlog", "", "Feature list rows for roadmap phases 4 to 8. Not built in phase 3.",
       "Made by `python3 tools/backlog.py` from the spec; do not edit by hand.", ""]
for phase in sorted(by_phase):
    out += [f"## Phase {phase}: {names.get(str(phase), '')} ({len(by_phase[phase])})", "",
            "| Tier | Feature | What it does | Inspired by | Source | Time view |", "|---|---|---|---|---|---|"]
    for r in by_phase[phase]:
        cells = [r[col[k]] for k in ("Tier", "Feature", "What it does", "Inspired by (people)", "Source", "Time view")]
        out.append("| " + " | ".join(c.replace("|", "/").replace("\n", " ") for c in cells) + " |")
    out.append("")
(ROOT / "BACKLOG.md").write_text("\n".join(out))
print({p: len(v) for p, v in sorted(by_phase.items())})
