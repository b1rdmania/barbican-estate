# Barbican Estate

A site about the Barbican Estate in the City of London. It has three sections:

- **Lettings**: flats to rent on the estate.
- **Sales**: flats for sale on the estate.
- **History**: the story of the estate, its 21 blocks and its flat types.

Live site: https://mighty-raven-26kk.here.now/

## Where the listings come from

The site collects listings from four estate agents that sell and let Barbican flats:

| Agency | Fetcher | How it gets the data |
| --- | --- | --- |
| Frank Harris & Co. | `fetch.mjs` | JSON in each listing page. Uses a visible Chrome window to pass a Cloudflare check. |
| Nicola Lee | `fetchers/nicolalee.mjs` | Listing pages (HTML). Uses a visible Chrome window to pass a Cloudflare check. |
| Thomas Michael | `fetchers/thomasmichael.mjs` | Search and listing pages (HTML), plus a map JSON for positions. |
| Base Property Specialists | `fetchers/base.mjs` | Portfolio and listing pages (HTML). Lettings only. |

Each listing links back to the agency's own page and phone number. The site keeps only flats on the estate (postcode EC2Y 8, or a named estate block).

## Run it

You need Node and Google Chrome.

```sh
npm install
./flat barbican     # fetch all four agencies, build site/, publish
node build.mjs      # build site/ from data/ only
```

`./flat` publishes with here.now. To build without publishing, use `node build.mjs` and open `site/index.html`.

## Files

| Path | What it holds |
| --- | --- |
| `data/` | One JSON file per listing, plus the estate map (`estate.geojson`) and merged research (`research.json`) |
| `build.mjs` | Loads `data/`, finds the block for each flat, calls `archive.mjs` |
| `archive.mjs` | Renders every page |
| `content/` | History and block text |
| `research/` | Research notes and source data: history, blocks, flat types, service charges, Land Registry prices |
| `osm.py` | Builds the estate map from OpenStreetMap data |

See `HANDOVER.md` for design rules and open work.
