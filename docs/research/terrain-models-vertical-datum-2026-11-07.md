# Open terrain models and the height they are measured from

_Created 2026-11-07 · Updated 2026-11-07_

**Standing of this note.** A survey to decide whether a sea-level-rise question can be asked honestly in Fieldwork:
which open terrain models state the surface their heights are measured from, under what licence, and how they are
reached. Nothing is built. It came from working backwards: no open epidemiological dataset carrying sea-level-rise
risk was found, so the question became what an exposure layer would have to be built from.

**How it was read.** On 2026-11-07, from the data records and catalogue pages linked below. The DeltaDTM methods paper
was not read: its PubMed Central copy showed a bot check and the publisher redirected to a sign-in, and neither was
worked around.

## What was found

| Terrain model | Heights measured from | Licence | How it is reached | What the surface is |
| --- | --- | --- | --- | --- |
| **DeltaDTM** v1.1 (2024) | **Not stated in its data record** | CC BY 4.0 | Direct download, no sign-in seen: Cloud-Optimised GeoTIFF tiles zipped per continent (Asia ≈ 17.3 GB, all ≈ 36 GB) | Bare ground, made for low coasts; stated error ≈ 0.43 m |
| **Copernicus DEM GLO-30** | EGM2008 geoid (EPSG:3855) | Free worldwide, credited "© DLR e.V." | Several hosts; whether the AWS copy needs an account was not checked | Surface: roofs and trees included |
| **NASADEM** | EGM96 geoid (EPSG:5773) | NASA data, any use | NASA's archive asks for a login | Surface, from 2000 radar |
| **FABDEM** | EGM2008, according to one secondary source | CC BY-NC-SA 4.0: non-commercial, share-alike | Free download | Bare ground, but the licence limits reuse |

**Sources.**
- DeltaDTM: [4TU.ResearchData record](https://data.4tu.nl/datasets/1da2e70f-6c4d-4b03-86bd-b53e789cc629),
  DOI 10.4121/21997565. It gives the licence, format and files, and describes the target area only as land "below
  10 m +Mean Sea Level". Methods paper: [PMC10917791](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10917791/),
  not read. Because DeltaDTM corrects the Copernicus DEM, EGM2008 is likely; that is an inference, not a reading.
- Copernicus DEM GLO-30: [Earth Engine catalogue](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1).
  The page warns that a height of 0 m does not imply mean sea level.
- NASADEM: [Earth Engine catalogue](https://developers.google.com/earth-engine/datasets/catalog/NASA_NASADEM_HGT_001).
- FABDEM: [UN-SPIDER](https://www.un-spider.org/links-and-resources/data-sources/fabdem-0) and the
  [GEE community catalogue](https://gee-community-catalog.org/projects/fabdem/).

## Why a stated datum is not enough

From prior knowledge; not searched on this date.

- A height above a geoid (EGM2008, EGM96) is not a height above the local sea.
- The IPCC AR6 projections Fieldwork already uses are rises relative to mean sea level over 1995–2014.
- Putting the two together needs the offset between the geoid and local mean sea level, which can be tens of
  centimetres to over a metre. It comes from a tide gauge levelled to the same datum, or from a mean dynamic
  topography model.

So a place can only be said to sit below a projected sea level once the terrain model's datum **and** that offset are
both sourced and stated.

## What this suggests, not yet decided

- **Candidate:** DeltaDTM, the only one that is bare ground, made for coasts, and openly licensed.
- **Before any experiment:**
  - confirm DeltaDTM's datum from its methods paper (the practitioner can open the PMC copy in a browser);
  - find an open source for the geoid-to-sea-level offset.
- **First test:** the Manila example, which has tide gauges, so its local sea level can be compared with the terrain
  model's datum.

## What this does not establish

- DeltaDTM's datum.
- Whether the Copernicus DEM on AWS can be read without an account.
- FABDEM's datum from its own documentation.
- That no other open bare-ground coastal model exists: only these four were compared.
- Any open source for the geoid-to-sea-level offset.
- No file was downloaded.
