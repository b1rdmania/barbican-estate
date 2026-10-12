# Barbican Estate market data (retrieved 2026-10-10)

## Files (research/market/)
- prices.csv: 3,463 sales, EC2Y 8*, 1995-01-05 to 2026-08-12, with a `block` column added.
- prices-summary.json: count and median by year, block, block x year; top 10; total.
- epc-sample-EC2Y8BX.csv: 5 EPC rows (floor area, rating).
- raw.csv: unprocessed SPARQL output.

## 1. Sales (HM Land Registry PPD, SPARQL endpoint, OGL)
Median by year (count): 1995 £105k (126) | 2000 £229.5k (137) | 2005 £330k (135) | 2010 £500k (129) | 2015 £846k (84) | 2016 £880k (68) | 2017 £860k (139) | 2019 £825k (58) | 2021 £815k (83) | 2023 £890k (72) | 2024 £877.5k (76) | 2025 £925k (84) | 2026 to Aug £809k (24, thin).
Median by block, all years (count): Brandon Mews £980k (13), Lauderdale Tower £580k (177), Shakespeare Tower £555k (165), Cromwell Tower £540k (150), Gilbert £490k (110), Defoe £425k (262), Mountjoy £395k (109), Thomas More £377.5k (263), Willoughby £377.5k (195), Seddon £353.5k (106), Speed £350k (171), Andrewes £341k (315), Bunyan £340k (124), Ben Jonson £295k (333), Breton £240k (179), John Trundle £204k (224), Bryer £200k (96). Other £470k (471). Use block x year in the JSON for like-for-like; all-years medians mix eras.
Top 10 sales are in the JSON. Three are not flat sales: £29.16M Blake Tower 2 Flat 114 (2017) and £28.5M Murray House rooftop installation (2023) look like bulk or non-residential deals. Exclude them from headlines.

## 2. EPC floor area
Register API needs a key (not used). The public service find-energy-certificate.service.gov.uk works without login. Postcode search returns address, rating, expiry (38 EPCs for EC2Y 8BX, all Seddon House). Each certificate page adds property type and total floor area in m2. Five fetched, 2s apart; sample in the CSV: Flat 101 79 m2 C; 208 74 m2 C; 411 84 m2 D; 501 75 m2 D; 507 74 m2 C. Feasible per postcode with polite throttling. Bulk scraping may breach service terms; the bulk download on the register is the proper route. Many certificates have expired (still show area). Only flats with an EPC are listed.

## 3. Rents
- ONS PIPR does not publish City of London (low collection volumes). No ONS/VOA figure for EC2Y. London average £2,332 pcm, Aug 2026 (ONS, bulletin Sept 2026).
- British Housing index, Barbican, Oct 2026 (median advertised asking rent): studio £2,300; 1 bed £2,500 (new build £3,400, rest £2,700); 2 bed £3,250 (new build £4,708, rest £3,450); 3 bed £3,800. https://www.britishhousing.co.uk/guaranteed-rent/barbican
- ResiRadar EC2Y 1-bed median £2,629 pcm, Apr 2025-Mar 2026, only 10 records. https://www.resiradar.com/area-insights/uk/london/postcode/ec2y-8bx
- Frank Harris live listings: Gilbert House 1-bed £3,497; Willoughby 2-bed £3,467; Seddon 1-bed £3,293 pcm (single adverts, not benchmarks).

## 4. Service charges and leases
- City of London publishes per-block service charge actuals 2025/26 and estimates 2025/26 and 2026/27 as PDFs (per flat type, charged by flat type proportional to size). Not downloaded or parsed. https://www.cityoflondon.gov.uk/services/barbican-estate/barbican-estate-resident-information-pack/barbican-estate-service-charges-by-block
- No reserve fund allowed under the leases, so major works are billed as extra contributions. The City does not apportion charges on resale. (service-charges page, same pack)
- Residents' committee reports (Barbican Estate Residents Consultation Committee, e.g. 3 Nov 2025 pack, item 8, 2024/25 actuals) on democracy.cityoflondon.gov.uk. Barbican Association: barbicanassociation.co.uk (not reviewed).
- Leases: most are 125 years from 1 July 1981. Exceptions: Cromwell Tower (16 Jun 1982), Lambert Jones Mews (6 Jun 1985), Mountjoy House (25 Feb 1982), The Postern (16 Sep 1982). Statutory extension is +90 years (1993 Act) after 2 years' ownership, premium plus City costs. I found no 250-year extension scheme; the user's premise looks wrong. https://www.cityoflondon.gov.uk/services/barbican-estate/barbican-estate-resident-information-pack/barbican-estate-other-charges
- Implication: unexpired terms are about 80 years in 2026, which matters for mortgageability and price.

## Caveats
- PPD has no floor area, bedrooms or price per m2; join to EPC for that.
- "other" block (471) is mostly non-estate: Cobalt Building (146), Blake Tower (82), unnamed addresses. Blake Tower is arguably on the estate; remap if wanted.
- Block matching is on PAON text; a few mis-mapped records are possible. Postcode sector EC2Y 8 may include non-estate buildings.
- Latest months are incomplete (registration lag). Medians are sale prices for mixed flat sizes, not like-for-like.
