# Open terrain models and the height they are measured from

_Created 2026-11-07 · Updated 2026-11-09_

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

![A cross-section of a low coast, not to scale. From the bottom: the WGS84 ellipsoid; the geoid (EGM2008, EGM96); local mean sea level over 1995–2014, the AR6 baseline, above the geoid by an offset a levelled tide gauge gives; and a projected sea level, the baseline plus the AR6 rise. On land, bare ground (DeltaDTM, FABDEM) and the surface with roofs and trees (Copernicus DEM GLO-30, NASADEM). At one place, h is its height above the ellipsoid, N the geoid's, H its height above the geoid, which the terrain models give: h = H + N, and its height above local sea is H minus the offset.](../images/vertical-datums.svg)

*Drawn 2026-11-08 from the relations in this note, not to scale. h = H + N; height above local sea = H − offset.*

- A height above a geoid (EGM2008, EGM96) is not a height above the local sea.
- The IPCC AR6 projections Fieldwork already uses are rises relative to mean sea level over 1995–2014.
- Putting the two together needs the offset between the geoid and local mean sea level, which can be tens of
  centimetres to over a metre. It comes from a tide gauge levelled to the same datum, or from a mean dynamic
  topography model.

So a place can only be said to sit below a projected sea level once the terrain model's datum **and** that offset are
both sourced and stated.

## The geoid-to-sea-level offset: open sources, read 2026-11-08

Searched and read on 2026-11-08, from the pages linked. Nothing was downloaded.

| Source | What it gives | Period | Access |
| --- | --- | --- | --- |
| **PGM2018**, NAMRIA's Philippine geoid, hybrid grid ([ISG repository](https://isgeoid.polimi.it/Geoid/Asia/Philippines/philippines18_g.html)) | A geoid "fitted to ITRF2005 GNSS/levelling benchmarks"; NAMRIA says the earlier PGM2016 was fitted "so that the existing vertical datum of the country, i.e., MSL is preserved". Its difference from EGM2008 would be the offset at Manila | The Philippine datum's own MSL epoch, not 1995–2014 | Served openly, "Status: PUBLIC", no sign-in; **no licence stated**. 0.025°, stated accuracy 1.2 cm |
| **DTU22MDT**, DTU Space mean dynamic topography (DOI 10.11583/DTU.26947894) | Mean sea surface above the XGM2019e geoid, global | 1993–2012 | The record refused an automated read (403); **licence and sign-in not confirmed** |
| **CNES-CLS22**, AVISO+ | Mean sea surface above the geoid, global | 1993–2012 | Needs an AVISO+ account and a licence agreement: not open |

**NAMRIA's own page, read 2026-11-09** ([projects](https://www.namria.gov.ph/projects.aspx)). It lists PGM2018 in two
kinds: a gravimetric geoid, `gravi-geoid2018.gri`, "for estimating elevation above the geoid surface", and a geoid
fitted to mean sea level, `geoid2018.98_wgs84fit.gri` and `geoid2018.98_itrffit.gri`, for "estimating elevations above
the MSL"; stated accuracy 1.2 cm. It links one download, `PhilGeoidApp2019.zip` (5,901,043 bytes, last modified
2024-07-09), an application that gives a point's geoid height N in H = h − N; the grids are named and not linked. The
page states no licence. It names no tide gauge or MSL epoch for the fitted geoid; for PGM2014 it says a constant of
+80 cm was added "to approximate the average geoid offset relative to GPS and levelling in the Manila areas".

**The practitioner, 2026-11-09:** NAMRIA says the files are for public use, and the model year is 2019. Recorded as
said; the page names the model PGM2018 and the application 2019.

**Not established:** whether its hybrid fit keeps the MSL datum as PGM2016's did (the
2021 paper, TAO 32(5), DOI 10.3319/TAO.2021.11.15.01, was not read); the correction between the Philippine datum's epoch
and 1995–2014; DTU22MDT's licence; whether a levelled tide gauge at Manila (PSMSL, SONEL) gives the offset directly,
which was not searched. Both global models are over the open ocean, so their value at the coast is the least certain.

## NAMRIA's geoid at Manila, and what PSMSL and AR6 say about the gauge, 2026-11-09

**Downloaded with the practitioner's approval:** `PhilGeoidApp2019.zip` from namria.gov.ph, 5,901,043 bytes, sha256
`24bd8817…981a`. It holds the three PGM2018 grids, two `.ggf` copies, a Word note, sample point files and a Windows
program, which was not run. The grids are GRAVSOFT text: 4–22° N, 0.025°. Read in Python, interpolated bilinearly.

Checked against NAMRIA's own sample output: the `wgsfit` grid comes closest, within 0.28 m everywhere and 0.02 m at
the sample point nearest Manila. The differences vary smoothly, and the sample file is dated September 2018 against
grids of December 2018, so the sample was likely made from an earlier grid. That is an inference.

At Manila's gauge, 14°35′ N, 120°58′ E:

| Grid | N |
| --- | --- |
| `geoid2018.98_itrffit.gri`, fitted to MSL, ITRF | 43.862 m |
| `geoid2018.98_wgsfit.gri`, fitted to MSL, WGS84 | 45.239 m |
| `gravi-geoid2018.gri`, gravimetric | 43.011 m |

The MSL-fitted ITRF grid is 0.85 m above the gravimetric geoid there. NAMRIA's note says PGM2014 was shifted
"+80 cm to approximate the average geoid offset relative to GPS and levelling in the Manila areas". NAMRIA's note also
says the model will be refitted "to an adjusted level network for a new version until 2035". It names no MSL epoch.

**PSMSL, Manila South Harbor (145)** ([station](https://psmsl.org/data/obtaining/stations/145.php),
[datum](https://psmsl.org/data/obtaining/rlr.diagrams/145.php)): 1901–2024, 85% complete, a quality flag set. The
gauge moved about 1 km NNW in 2002. Its datum is TSO 1901; nothing on either page ties it to the Philippine MSL datum.
The nearest GNSS station listed, PIMO, is not at the gauge. A note of 1987 suspects the rising trend is partly
"deposition ... and excessive reclamation although subsidence not totally discarded".

**All eight AR6 sites are PSMSL tide gauges by ID, name and position** (each station page read 2026-11-09). AR6's own
pages ([README](https://github.com/Rutgers-ESSP/IPCC-AR6-Sea-Level-Projections), Zenodo record) do not say their
location IDs are PSMSL's; the file that would, `location_list.lst` (2.7 MB), was not read.

**EGM2008 at Manila, 2026-11-09, fetched with the practitioner's approval:** read through pyproj 3.8.0 from PROJ's
`us_nga_egm08_25.tif` on cdn.proj.org, network access reading only the tile needed: **N = 43.009 m**. It agrees with
NAMRIA's gravimetric PGM2018 (43.011 m) within 2 mm there, and NAMRIA's MSL-fitted surface (ITRF) is **0.85 m above
both**. So a height above EGM2008 at the gauge is about 0.85 m more than the same point's height above NAMRIA's MSL.
The `wgsfit` grid differs from `itrffit` by 1.38 m at the same point, which neither the page nor the Word note explains;
ITRF is used here because EGM2008's ellipsoid heights are WGS84 (G-series), which agrees with ITRF at the centimetre
level.

**PSMSL 145, yearly means, fetched with the practitioner's approval** (`145.rlrdata`, 2,299 bytes): 16 of the 20 years
1995–2014 hold a value, 1999 flagged; their mean is **7,472 mm above the gauge's RLR datum**, and their trend is about
**15 mm a year**. The gauge moved about 1 km in 2002, within the period.

**Still missing:** which years NAMRIA's MSL stands for. The 2021 TAO paper should say; its page refused an automated
read (HTTP 403) and was not worked around. With the epoch, PSMSL's series gives the change in sea level between it and
1995–2014 at the same gauge, and the gauge's own datum drops out of the difference.

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
- A licensed open source for the geoid-to-sea-level offset. NAMRIA's page states no licence; the practitioner reports
  NAMRIA says the files are for public use (2026-11-09). Whether that permits republishing the grids is not written.
- No file was downloaded.
