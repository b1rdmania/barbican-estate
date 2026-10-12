# Pull every flat type out of the City's per-block service charge actuals (2025/26).
# Usage: python3 parse.py  -> types.json, types.csv
import csv, glob, json, re

rows = []
for path in sorted(glob.glob('*.txt')):
    block = path[:-4].replace('-', ' ').title()
    pages = open(path).read().split('\f')
    current = None
    for page in pages:
        head = page.split('\n')[:8]
        if not any('FLAT COST' in l for l in head):
            continue
        text = '\n'.join(head)
        pct = next((m.group(1) for l in head if 'of Estate' not in l for m in [re.search(r'(\d+\.\d+)%', l)] if m), None)
        # Type label sits in the right-hand column, sometimes split over two lines.
        label = ' '.join(m.group(1).strip() for l in head for m in [re.search(r'\s{3,}((?:[Tt]ypes?|\()[^%]*?)\s*$', l)] if m)
        label = re.sub(r'\s+', ' ', label).strip()
        key = (pct, label)
        if key != current:
            rows.append({'block': block, 'pct': float(pct) if pct else None, 'label': label, 'total_2025_26': None})
            current = key
        m = re.search(r'^\s*Total\s+(-?£[\d,]+)\s+(-?£[\d,]+)\s*$', page, re.M)
        if m:
            rows[-1]['total_2025_26'] = int(m.group(2).replace('£', '').replace(',', ''))

# Split "Type 21 & 80" / "Type 22, 23 & 60" / "type 118 (3, 7 & 23)" into type codes.
for r in rows:
    body = re.sub(r'^[Tt]ypes?\s*', '', r['label'])
    body, _, flats = body.partition('(')
    r['flats_note'] = flats.rstrip(')').strip() or None
    r['types'] = [t for t in re.split(r'\s*(?:,|&|and)\s*', body.strip()) if t]

json.dump(rows, open('types.json', 'w'), indent=1)
with open('types.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['block', 'types', 'label', 'lease_pct', 'service_charge_2025_26', 'flats_note'])
    for r in rows:
        w.writerow([r['block'], ' '.join(r['types']), r['label'], r['pct'], r['total_2025_26'], r['flats_note']])

codes = sorted({t for r in rows for t in r['types']})
print(len(rows), 'rows;', len(codes), 'distinct type codes')
print(' '.join(codes))
