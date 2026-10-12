# Barbican Estate site: handover (banked 2026-10-11)

Live: https://barbican.estate/ on a Cloudflare Worker (`barbican-estate`, `wrangler.jsonc`, `worker/index.js`; www 301s to the bare domain). The old here.now address (mighty-raven-26kk) now only holds redirect pages to the same paths on barbican.estate.
Three main sections: History, Sales, Lettings. Root is the History landing page. History connects The story (`/history/`), The estate (`/blocks/`), Inside the flats (`/inside/`), Life here (`/life/`) and Watch (`/watch/`).

## Run it

```sh
cd ~/Documents/flatview
./flat barbican          # fetch every agency's Barbican listings, rebuild, deploy to Cloudflare
./flat 22184890          # fetch one listing by ID or URL, rebuild, deploy to Cloudflare
node build.mjs           # rebuild site/ from data/ only (no fetch)
node ios-check.mjs https://barbican.estate/ <out-dir>   # WebKit iPhone 15 check
```

Fetching opens visible Chrome windows (Frank Harris, Nicola Lee) for a few minutes. Cloudflare blocks curl and headless Chrome on those two.

Repo: https://github.com/b1rdmania/barbican-estate (public).

## Files

| File | What it does |
| --- | --- |
| `fetchers/*.mjs` | Nicola Lee, Thomas Michael, Base fetchers. Each writes `data/<agency>-<id>.json` in the Frank Harris field shape |
| `fetch.mjs` | Frank Harris fetcher (Homeflow: `Ctesius.addConfig` JSON in each listing page; feeds at `/properties/{lettings,sales}[/page-N].ljson`) |
| `build.mjs` | Loads `data/<id>.json`, works out the block, calls `archive.mjs` |
| `archive.mjs` | Renders every page: listing cards + map, flat pages, history overview, 21 block pages, credits |
| `archive.css` | The Variant "archive" layout, copied verbatim. Theme overrides (white, Helvetica) live in `archive.mjs` |
| `content/history.json` | History copy (plain English): intro, numbers, story, how it was built, people, facts, plates |
| `content/blocks.json` | Block copy (plain English): lede, namesake, setting, inside, way in |
| `research/` | Raw research with sources: history, blocks, flat types, City service charges, Land Registry. `compile.py` merges it into `data/research.json` |
| `osm.py` | Builds `data/estate.geojson` (block outlines, streets, highwalks) from an OSM extract |
| `assets/og.png` | Share card: crop of the 1966 CPB roof plan, no text |

## Design rules Andy set

- Show things. No sources, citations or caveats on pages. Photo credits only on `/credits/`.
- Plain English. Detail goes in fold-outs.
- Listings are just listings: big photo, block, price, beds. Click through for the rest.
- Colour photos. No counts next to blocks. No CLASS/DATE/SEQ meta.
- Share: title BARBICAN ESTATE, description HISTORY / SALES / LETTINGS, image with no text.

## Next (Andy's list)

1. **More listings.** Four agencies in (Frank Harris, Nicola Lee, Thomas Michael, Base). Others that list some Barbican flats: Hurford Salvi Carr, Hamptons, Foxtons, Winkworth, Benham. Don't scrape Rightmove or Zoopla.
2. **Design tightening.** Andy is doing a pass himself.
3. **History page.** Work through the story and plates.
4. **Flat types: another data pass.** Find historic diagrams (original City brochures, the 1959 report, London Metropolitan Archives, RIBA, Historic England's John Laing collection, Stefi Orazi's book). Floor areas per type: the public EPC register lists m² per flat, one postcode at a time. Barbican Living's plans are all rights reserved, so link, don't copy.

## Editorial additions (2026-10-12)

`editorial.mjs` uses the existing archive shell; `editorial.css` adds styles without changing `archive.css`. Six films and five flat-type guides are curated in `content/`. Read `content/EDITORIAL.md` for the contribution review workflow and sources. `node tests/editorial.mjs` checks the generated pages. The contribution page previews/downloads drafts; set a public inbox in `content/contribute.json` to enable email handoff. New contributions are never published automatically.

## Known gaps

- Fetchers overwrite their own files but never delete listings that have gone from the agency site.
- Thomas Michael and Base give only "EC2Y" as the postcode. Thomas Michael floorplans are PDFs, so they are not shown.

- Weak lead photos on some blocks (Ben Jonson's is a bus stop). Six Commons photos don't name the block in the file title, so check by eye.
- The Postern has no service-charge PDF at the usual URL; Wallside's PDF didn't parse.
- One sold listing has no block (address is just "Barbican").
