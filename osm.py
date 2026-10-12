# Turn an OSM map extract of the Barbican into data/estate.geojson.
# Usage:
#   curl -A flatview "https://api.openstreetmap.org/api/0.6/map?bbox=-0.1005,51.5168,-0.0890,51.5228" -o data/osm-raw.xml
#   python3 osm.py
import json
import xml.etree.ElementTree as ET

BLOCKS = {
    'Andrewes House', 'Ben Jonson House', 'Breton House', 'Bryer Court', 'Bunyan Court',
    'Cromwell Tower', 'Defoe House', 'Frobisher Crescent', 'Gilbert House', 'John Trundle Court',
    'Lauderdale Tower', 'Mountjoy House', 'Seddon House', 'Shakespeare Tower', 'Speed House',
    'Thomas More House', 'Willoughby House', 'Wallside', 'Brandon Mews', 'Blake Tower',
}
STREETS = {'The Postern', 'Lambert Jones Mews'}  # terraced houses, one footprint per house
ALIASES = {'London City YMCA': 'Blake Tower'}  # OSM still has the pre-2017 name
LANDMARKS = {'Barbican Arts Centre', 'Barbican Conservatory', 'St Giles-without-Cripplegate', 'Barbican Lake'}

root = ET.parse('data/osm-raw.xml').getroot()
nodes = {n.get('id'): (float(n.get('lon')), float(n.get('lat'))) for n in root.iter('node')}
ways = {w.get('id'): w for w in root.iter('way')}
tags = lambda el: {t.get('k'): t.get('v') for t in el.findall('tag')}
ring = lambda w: [nodes[nd.get('ref')] for nd in w.findall('nd') if nd.get('ref') in nodes]

features = []
def add(coords, props):
    if len(coords) >= 4 and coords[0] == coords[-1]:
        features.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [coords]}})

for w in ways.values():
    t = tags(w)
    name = t.get('addr:housename') or t.get('name')
    name = ALIASES.get(name, name)
    if 'building' in t and name in BLOCKS:
        add(ring(w), {'kind': 'block', 'name': name, 'levels': t.get('building:levels')})
    elif 'building' in t and t.get('addr:street') in STREETS:
        add(ring(w), {'kind': 'block', 'name': t['addr:street']})
    elif name in LANDMARKS:
        add(ring(w), {'kind': 'landmark', 'name': name})
    elif t.get('natural') == 'water' or t.get('water'):
        add(ring(w), {'kind': 'water'})
    elif t.get('leisure') in ('garden', 'park') or t.get('landuse') == 'grass':
        add(ring(w), {'kind': 'green'})

# Streets and walkways as lines; the Barbican highwalks are footways on layer 1+.
ROADS = {'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street', 'pedestrian'}
WALKS = {'footway', 'path', 'steps'}
for w in ways.values():
    t = tags(w)
    hw = t.get('highway')
    if hw in ROADS or hw in WALKS:
        coords = ring(w)
        if len(coords) >= 2 and t.get('tunnel') != 'yes':
            kind = 'road' if hw in ROADS else 'walk'
            features.append({'type': 'Feature', 'properties': {'kind': kind, 'name': t.get('name') if kind == 'road' else None},
                             'geometry': {'type': 'LineString', 'coordinates': [[round(x, 6), round(y, 6)] for x, y in coords]}})

# Multipolygons (lake, conservatory): add each outer way.
for rel in root.iter('relation'):
    t = tags(rel)
    if t.get('type') != 'multipolygon':
        continue
    kind = 'water' if t.get('natural') == 'water' or 'Lake' in t.get('name', '') else \
           'landmark' if t.get('name') in LANDMARKS else \
           'green' if t.get('leisure') in ('garden', 'park') or t.get('landuse') == 'grass' else None
    if not kind:
        continue
    for m in rel.findall('member'):
        if m.get('type') == 'way' and m.get('role') == 'outer' and m.get('ref') in ways:
            add(ring(ways[m.get('ref')]), {'kind': kind, 'name': t.get('name')})

json.dump({'type': 'FeatureCollection', 'features': features}, open('data/estate.geojson', 'w'))
kinds = {}
for f in features:
    kinds[f['properties']['kind']] = kinds.get(f['properties']['kind'], 0) + 1
print(kinds, sorted({f['properties'].get('name') for f in features if f['properties']['kind'] == 'block'}))
