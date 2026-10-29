"""Convert every tab of spec/SLAM Build Spec.xlsx to spec/csv/<tab name>.csv."""
import csv, pathlib, sys
import openpyxl

SRC = pathlib.Path("spec/SLAM Build Spec.xlsx")
OUT = pathlib.Path("spec/csv")

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, data_only=True)
    for ws in wb.worksheets:
        rows = [["" if v is None else v for v in r] for r in ws.iter_rows(values_only=True)]
        while rows and not any(str(v).strip() for v in rows[-1]):
            rows.pop()
        with open(OUT / f"{ws.title}.csv", "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)
        print(f"{ws.title}: {len(rows)} rows")

if __name__ == "__main__":
    sys.exit(main())
