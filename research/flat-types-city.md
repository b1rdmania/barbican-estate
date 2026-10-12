# Flat types: City of London service charge schedules (2025/26)

Source: per-block "Service Charge Actuals 25-26" PDFs, City of London Corporation,
https://www.cityoflondon.gov.uk/assets/Services-DCCS/<block>-service-charge-actuals-25-26.pdf
(retrieved 2026-10-10). Parsed by service-charges/parse.py into service-charges/types.csv / types.json.

Each block PDF has one section per flat type (or group of types that share a charge), with the
lease percentage of the block's costs and the actual 2025/26 charge. The percentage is set by flat size.

## What it confirms
- 108 original-estate type codes appear. Every one is also in Barbican Living's list except "70H"
  (handed 70) and "Type A" in Andrewes House (0.60%, no heating charge; probably the pub flat, type 81, unconfirmed).
- Not split out by the City:
  - Towers: all standard tower flats (1A–3C, 5A, 7C, 8A–9C) share one rate per tower; only penthouses 4A/4B/4C and 6B are separate.
  - Lambert Jones Mews: two unlabelled rows (Barbican Living's 63/64 and 67/68).
  - The Postern: no PDF at the usual URL (types 10 and 98 missing).
  - Wallside: PDF downloaded, no type rows parsed (check by hand).
- Frobisher Crescent is listed per flat (701–926, i.e. 7.1–9.26), 69 rows = 69 flats.
- Conclusion: Barbican Living's 128 original types are the full set, and no hidden types turned up.
  The "some 140" figure probably counts handed (H) versions and variants. Stefi Orazi's book
  The Barbican Estate (2018) is the only source with drawings of every type.

## Use on the site
- Annual service charge per type per block (real 2025/26 actuals): show on every listing with a known type.
- Lease % is a relative-size index within a block (not comparable across blocks).
