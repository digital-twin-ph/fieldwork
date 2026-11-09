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
| **DeltaDTM** v1.1 (2024) | **EGM2008**: not in its data record; stated in its paper, read 2026-11-09 (below) | CC BY 4.0 | Direct download, no sign-in seen: Cloud-Optimised GeoTIFF tiles zipped per continent (Asia ≈ 17.3 GB, all ≈ 36 GB) | Bare ground, made for low coasts; stated error ≈ 0.43 m |
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

**The 2021 TAO paper's abstract, supplied by the practitioner on 2026-11-09** (its page refused an automated read, HTTP
403, which was not worked around). It says the hybrid model was fitted to GNSS/levelling "taking into account the
different vertical datum used in the islands", fits it to 2 cm, and puts the hybrid geoid's formal error at "around
10 cm rms", limited by "island height system and geodynamics effects". So the 0.85 m at Manila is Luzon's datum and does
not carry to the other gauges, and about 10 cm is its stated uncertainty. **The abstract does not say which years or
which tide gauge the MSL refers to.**

**Both papers read in full on 2026-11-09**, from PDFs the practitioner added to example-2026-sea-level-rise-philippines
(`docs/`):

- **DeltaDTM** (Pronk et al. 2024, *Scientific Data*, CC BY 4.0): ICESat-2 and GEDI heights were transformed "to the
  Earth Gravitational Model (EGM2008) geoid (assumed to approximate global MSL in this study)", and the product is
  published in "the vertical CRS EGM2008 (EPSG:3855)". **Its datum is EGM2008**, as was inferred.
- **The TAO paper** (Gatchalian, Forsberg and Olesen 2021): the MSL-fitted geoid was "reduced to the benchmark ML-3
  reference level surface to roughly fit the geoid in Metro Manila area", then fitted to tidal and other benchmarks of
  each island; the Manila gauge is "the Primary MSL fundamental tide gauge"; ellipsoidal heights should be of about the
  same epoch as the GNSS/levelling, "2010 or later". **It does not say which years the Manila MSL refers to.**

**So, at the Manila gauge:** a DeltaDTM height, above EGM2008, is about **0.85 m more** than the same ground's height
above NAMRIA's MSL (43.862 − 43.009 m), within about 10 cm, the hybrid geoid's stated formal error. A pixel DeltaDTM
gives as 0.5 m stands about 0.35 m below NAMRIA's MSL there. This holds at Manila only: each island has its own MSL
datum.

**The period, searched for online on 2026-11-09.** Three documents read in full, fetched with the practitioner's
approval: NAMRIA's *Modernization of the Philippine Geodetic Reference System* (2016), NAMRIA's *Info Mapper* of July
2005, and the Philippines' 2006 national report to GLOSS.

- The vertical network "is referred to the mean sea level", started by the US Coast and Geodetic Survey "in the early
  1900s", with "most of the bench marks ... originally reckoned from the primary tide gauge bench mark located in Manila
  Harbor (i.e. BM-66)" (NAMRIA 2016).
- MSL is determined from long observation; "a period of 19 years is generally considered as constituting a full cycle"
  (NAMRIA 2005). That is the method, not the years.
- Each station's datum is a tide-staff zero "initially determined when the station was first established": Manila 1901;
  the GLOSS table lists South Harbor, Manila, as 1947 (GLOSS 2006).
- A paper on Manila and Legazpi bays used a 1990–2008 Manila MSL; that is its choice, not necessarily the datum's. The
  2026 MDPI paper on Manila subsidence and the ResearchGate copy refused automated reads (HTTP 403).

**None names the years.** How much they matter, from PSMSL 145's yearly means (relative sea level, so land motion at the
gauge is included):

| If NAMRIA's MSL is the mean of | 1995–2014 stands above it by |
| --- | --- |
| 1902–1920 | 757 mm (16 of 19 years held) |
| 1947–1965 | 686 mm (18 of 19) |
| 1960–1978 | 549 mm (18 of 19) |
| 1990–2008 | 104 mm (14 of 19) |

So the step from NAMRIA's MSL to AR6's baseline lies somewhere between about 0.1 and 0.76 m, as large as the geoid
offset and comparable to the projected rise. Benchmarks levelled long ago have moved with the land since, which these
figures do not resolve.

**Still missing, and only NAMRIA can answer it:** which years of tide observations at Manila define the mean sea level
that BM-66 (and ML-3) refers to, and has it been re-determined since? With the epoch, PSMSL's series gives the change in sea level between it and
1995–2014 at the same gauge, and the gauge's own datum drops out of the difference.

## The open estimate: DTU25MSS, with no national datum, 2026-11-09

The practitioner chose an open estimate that needs no NAMRIA period. **DTU25MSS** (Andersen and Nilsson, DTU Space,
[doi:10.11583/DTU.29412275](https://doi.org/10.11583/DTU.29412275), CC BY 4.0) is the mean sea surface of 1993–2012
("center time 2003.01.0") as heights above the WGS84 ellipsoid, on a 0.01° grid, from nadir and SWOT altimetry. Its
Philippine blocks, 4–22° N and 116–128° E (1801 × 1201 cells, `mss` and `sigma`), were read by HTTP range through h5py
with the practitioner's approval: **117.4 MB transferred**, against 63 MB estimated, because the reader fetched in 4 MB
pieces. A browser cannot read the file where it is published: DTU's storage server sends no
`Access-Control-Allow-Origin` and refuses the preflight ([198](../experiments/198-a-published-grid-read-at-points.md)).

At each gauge, bilinear on DTU's grid at PSMSL's positions, EGM2008 by pyproj as before:

| Gauge (PSMSL) | Mean sea surface, 1993–2012 | DTU sigma | EGM2008 N | Sea surface above EGM2008 |
| --- | --- | --- | --- | --- |
| Manila (145) | 43.937 m | 0.008 | 43.009 m | **+0.928 m** |
| Jolo (260) | 66.983 m | 0.008 | 66.032 m | +0.950 m |
| Cebu (394) | 64.098 m | 0.010 | 63.048 m | +1.050 m |
| Legaspi (522) | 53.880 m | 0.010 | 53.269 m | +0.611 m |
| Davao (537) | 68.340 m | 0.010 | 67.717 m | +0.623 m |
| Tacloban (664) | 64.888 m | 0.010 | 63.780 m | +1.108 m |
| Surigao (1708) | 68.112 m | 0.010 | 66.967 m | +1.145 m |
| San Jose (1711) | 51.079 m | 0.010 | 50.258 m | +0.821 m |

**Cross-check at Manila:** NAMRIA's MSL-fitted surface is 0.853 m above EGM2008, DTU's 1993–2012 sea surface 0.928 m;
the 7.5 cm between them is inside NAMRIA's stated 10 cm.

**To AR6's baseline:** PSMSL 145's 1995–2014 mean is 37 mm above its 1993–2012 mean (16 years each; 2001–2004 missing,
around the gauge's 2002 move). So at the Manila gauge, **the 1995–2014 mean sea level stands about 0.965 m above
EGM2008**, the surface DeltaDTM and Copernicus DEM measure from: ground they give as H stands about H − 0.965 m above
AR6's baseline there.

**Not established:** the sea surface's accuracy at the coast, where altimetry is least certain (`sigma` is DTU's model
estimate, not a coastal validation); the 37 mm, from incomplete years; anything away from the gauges, where the offset
differs by half a metre between them.

## Which facilities: a first count, in Python, 2026-11-09

DeltaDTM's two Manila tiles, `DeltaDTM_v1_1_N14E120.tif` and `N14E121.tif` (15.7 MB, stored uncompressed inside the
17.3 GB `Asia.zip`), read out of the zip by range with the practitioner's approval: 24.1 MB transferred. 1 arcsecond,
EPSG:4326, nodata −9999; its paper gives a mean absolute error of **0.45 m**. A value of exactly 30.0 m is a ceiling
(63–83% of the tiles' cells), meaning above DeltaDTM's range, not a height. Like DTU, 4TU's server serves ranges and
sends no `Access-Control-Allow-Origin`, so a browser cannot read it where it is published.

At each of the 194 facilities, the cell containing it, its height above EGM2008 less the Manila gauge's 0.965 m, against
the rise at the gauge, 1.124 m (SSP2-4.5, median, with vertical land motion, 2100):

| Ground stands | Facilities |
| --- | --- |
| Below today's mean sea level (1995–2014) | 0 |
| Below projected mean sea level | 16 |
| Below projected high water (plus half Manila's 0.758 m mean tide range, GLOSS 2006) | 37 |
| Within 0.45 m of the mean-sea-level threshold, either side | 32 |

Ground under them runs from 1.29 m to the 30 m ceiling above EGM2008, median 4.96 m.

**Not established:** a flood. This is a bathtub comparison: no seawall, drainage, pump or connection to the sea is in
it, so it is an upper estimate of exposure. 32 facilities are too close to call. One gauge's offset is applied to
facilities up to 13 km away, and a 30 m ground cell is not a building's floor. This count is what the canvas run must
reproduce.

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
