"""Write data/fields.json from spec/csv/Fields.csv: what Find searches (field, area, where it lives)."""
import csv, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = list(csv.reader(open(ROOT / "spec/csv/Fields.csv", encoding="utf-8")))
hdr = rows[1]
c = {k: hdr.index(k) for k in hdr}
out = []
for r in rows[2:]:
    if not r[c["ID"]].startswith("F"):
        continue
    out.append({"id": r[c["ID"]], "field": r[c["Field"]], "area": r[c["Area"]], "group": r[c["Secondary area"]],
                "layer": r[c["Layer"]], "livesOn": r[c["Lives on (screen)"]], "scope": r[c["Scope"]], "phase": r[c["Build phase"]]})
(ROOT / "data/fields.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(len(out), "fields;", sorted({f["livesOn"] for f in out}))
