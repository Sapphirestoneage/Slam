#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Add three columns to the market history, from the same source as the returns: the CAPE (Shiller's PE10) in
January of each year, the dividend yield of the stock index in January (the dividend of the last twelve months
divided by the price), and the yield of the 10-year government bond in January. Before it writes, it works every
stock return and inflation number out again from the file and stops when one does not match the rows on file, so the
new columns can only sit beside the series they belong to.

Usage: python3 tools/history_extra.py <data.csv> <date fetched, YYYY-MM-DD>
The file is data/data.csv of github.com/datasets/s-and-p-500 (Robert J. Shiller, Online Data).
Writes data/history-returns.json and game/data/market.js. The CAPE is null for 1871 to 1880: it needs ten years of
earnings, and the record starts in 1871."""
import csv, json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src, fetched = sys.argv[1], sys.argv[2]
by = {r['Date'][:7]: r for r in csv.DictReader(open(src))}
path = root / 'data' / 'history-returns.json'
h = json.loads(path.read_text())
for y in h['years']:
    Y = y['year']; a, b = by[f'{Y}-01'], by[f'{Y + 1}-01']
    cpi = float(b['Consumer Price Index']) / float(a['Consumer Price Index'])
    div = sum(float(by[f'{Y}-{m:02d}']['Dividend']) for m in range(1, 13)) / 12
    stocks = (float(b['SP500']) + div) / float(a['SP500']) / cpi - 1
    if abs(stocks - y['stocks']) > 0.0006 or abs(cpi - 1 - y['inflation']) > 0.0006:
        sys.exit(f'{Y}: the file gives stocks {stocks:.4f} and inflation {cpi - 1:.4f}, the rows on file say {y["stocks"]} and {y["inflation"]}. Nothing written.')
    pe = float(a['PE10'])
    y['cape'] = round(pe, 2) if pe > 0 else None
    y['yield'] = round(float(a['Dividend']) / float(a['SP500']), 4)
    y['bondYield'] = round(float(a['Long Interest Rate']) / 100, 4)
h['extra'] = ('cape: the cyclically adjusted price to earnings ratio (PE10) in January of the year, null for 1871 to 1880 (it needs ten years of earnings). '
              'yield: the dividend of the last twelve months divided by the price, in January. bondYield: the yield of the 10-year government bond in January. '
              f'Same source, fetched {fetched}; tools/history_extra.py checked every return on file against that copy before it added them.')
path.write_text(json.dumps(h, indent=0) + '\n')

game = root / 'game' / 'data' / 'market.js'
text = game.read_text()
rows = ''.join(f"    [{y['year']}, {y['stocks']:g}, {y['bonds']:g}, {y['inflation']:g}, {'null' if y['cape'] is None else format(y['cape'], 'g')}, {y['yield']:g}, {y['bondYield']:g}],\n" for y in h['years'])
text = re.sub(r'  years: \[\n.*?\n  \],', lambda m: '  years: [\n' + rows + '  ],', text, flags=re.S)
game.write_text(text)
print(f"{len(h['years'])} years written. CAPE from {next(y['year'] for y in h['years'] if y['cape'] is not None)}.")
