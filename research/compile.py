# Merge the research files into data/research.json for build.mjs.
# Usage: python3 research/compile.py   (run from the flatview folder)
import ast, json, re

R = 'research/'
blocks = json.load(open(R + 'blocks.json'))
history = json.load(open(R + 'history.json'))
types = json.load(open(R + 'flat-types.json'))
charges = json.load(open(R + 'service-charges/types.json'))
summary = json.load(open(R + 'market/prices-summary.json'))
# The market agent wrote some values as Python reprs; read them back as data.
summary = {k: ast.literal_eval(v) if isinstance(v, str) and v[:1] in '{[' else v for k, v in summary.items()}

clean = lambda u: re.sub(r'\?utm_.*$', '', u or '')
short = lambda name: re.sub(r'\s*\(.*\)$', '', name)

def block_name(b):
    return short(b['name']).split(' / ')[0]

out_blocks = {}
for b in blocks:
    name = block_name(b)
    out_blocks[name] = {
        'name': name,
        'category': b.get('category'),
        'named_after': b.get('named_after'),
        'story': b.get('story'),
        'completed': b.get('completed'),
        'completed_note': b.get('completed_note'),
        'floors': b.get('floors'),
        'height_m': b.get('height_m'),
        'flats': b.get('flats'),
        'types_note': b.get('types'),
        'views': b.get('views'),
        'features': b.get('features'),
        'entrance': b.get('nearest_station_entrance'),
        'listing': b.get('listing_entry'),
        'photos': [{**p, 'url': clean(p['url'])} for p in b.get('photos') or []],
        'photo_note': b.get('photo_note'),
        'sources': sorted({u for v in (b.get('sources') or {}).values() for u in (v if isinstance(v, list) else [v]) if u}),
    }

# Flat types: Barbican Living catalogue, keyed by code.
type_map = {}
for t in types['types']:
    if t.get('scheme', '').startswith('Original'):
        type_map[str(t['type'])] = {
            'type': str(t['type']), 'beds': t.get('beds'), 'count': t.get('count'),
            'blocks': t.get('blocks') or {}, 'layout': (t.get('layout') or '')[:600],
            'sqft': t.get('sqft'), 'sqm': t.get('sqm'), 'source': (t.get('sources') or [None])[0],
        }

# Service charges: City 2025/26 actuals per block and type.
sc = {}
for r in charges:
    block = {'Ben Jonson House': 'Ben Jonson House'}.get(r['block'], r['block'])
    for code in r['types'] or ['standard']:
        sc.setdefault(block, {})[code.replace(' ', '')] = {'pct': r['pct'], 'charge': r['total_2025_26'], 'label': r['label'] or 'Standard flats'}

listing_types = {m['listing_id']: m['type_normalised'] or m['type'] for m in types['listing_mentions']}

json.dump({
    'blocks': out_blocks,
    'types': type_map,
    'service_charges': sc,
    'listing_types': listing_types,
    'prices': {
        'source': summary['source'], 'retrieved': summary['retrieved'], 'total': summary['total'],
        'by_year': summary['by_year'], 'by_block_year': summary['by_block_year'], 'by_block': summary['by_block'],
    },
    'history': {
        'timeline': history['timeline'], 'people': history['people'], 'design': history['design'],
        'facts': history['facts'],
        'images': [{**i, 'url': clean(i.get('thumb_1200px') or i['url'])} for i in history['images']],
    },
}, open('data/research.json', 'w'))
print(len(out_blocks), 'blocks,', len(type_map), 'types,', sum(len(v) for v in sc.values()), 'charge rows,', len(listing_types), 'typed listings')
print('charge blocks:', sorted(sc))
