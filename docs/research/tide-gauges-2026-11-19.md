# Tide gauges for coastal countries: the archives, their terms, and what each country has

_Created 2026-11-19 · Updated 2026-11-19_

Asked by the practitioner on 2026-11-19: *"On the side I am also thinking of creating a repo of tide gauges for
countries with coasts for sea level rise"*, then *"Can you research that and record in docs/research"*.

The question behind it: should tide-gauge records be gathered into a curated repository, as census counts were in
`census-tables`, or should Fieldwork keep only a curated index and fetch from the archives when a workflow needs them?

Everything below was read from the archives' own web pages on 2026-11-19. No data file was downloaded and no PDF was
opened. Whether a browser can read an archive was tested by asking for **headers only**
(`curl -sI -H 'Origin: https://example.org' <url>`), plus three small JSON answers (IOC, NOAA, UHSLC's ERDDAP) of a
few kilobytes. Confidence is given as high, medium or low.

## Short answer

1. **The two archives that matter for long records, PSMSL and UHSLC, cannot be fetched by a browser** (no CORS
   header) **and state no licence that allows copying them into a public repository.** So an index-only design cannot
   reach them, and a repository of copies needs their permission first. Both are reachable by email; asking is the
   open action. (High confidence on CORS for UHSLC; medium for PSMSL, where the header may be sent on a GET and not
   on a HEAD, though an HTML GET on the same server also had none.)
2. **Only NOAA (public domain) and the IOC monitoring facility can be read from a browser.** NOAA covers US
   stations only. IOC's data are raw, unchecked and non-commercial: right for a live storm surge, wrong for a trend.
3. **The countries most at risk have the thinnest records.** Bangladesh, Indonesia, Nigeria and Mozambique have no
   record that is both 30 years long and 70% complete (PSMSL's minimum for a trend). The Philippines has 6 such
   records, India 13, Viet Nam 5 (all ending in 2013).
4. **Nothing open puts the observed trend, the land's own movement, the projection and the extremes side by side
   for a country, with provenance.** PSMSL publishes trends; NOAA's global trends table is gone; IPCC AR6 projections
   exist per gauge. That combination is what a repository could add.

**What this does not establish:** what PSMSL or UHSLC would say if asked; PSMSL's actual licence (a 2017 PSMSL report
reportedly says no licensing terms are attached, seen only in a search snippet of a PDF that was not opened); whether
GESLA's providers would agree to redistribution; any trend recomputed by us.

## The archives

| Archive | What it holds | Licence and citation | In a public repository? | Browser can read it? | Registration |
|---|---|---|---|---|---|
| PSMSL (Permanent Service for Mean Sea Level) | Monthly and annual mean sea level, about 1,500 stations. **RLR** (Revised Local Reference, a fixed datum per station) is for trends; "metric" data should never be used for trends | None stated. Cite Holgate et al. 2013 and the dataset with its extraction date | Unclear: ask psmsl@noc.ac.uk | No (medium) | No |
| UHSLC (University of Hawaii Sea Level Center) | Hourly and daily. **Research Quality** (checked, 1 to 2 years behind) and **Fast Delivery** (basic checks, 1 to 2 months behind) | None stated; the site's footer says "All Rights Reserved". Cite Caldwell et al. 2015, doi:10.7289/V5V40S7W. South African stations need permission | Unclear: ask | No (high), including its ERDDAP server | No |
| GESLA 4.1 (Global Extreme Sea Level Analysis) | High-frequency records gathered from many agencies, each value flagged; for extremes | Mixed, per provider, "some of which are non-commercial"; free for research | No safe grant | No (shared by iCloud links) | No |
| IOC Sea Level Station Monitoring Facility (VLIZ) | Real-time, minutes apart | Non-commercial only; DOI 10.14284/482 | Not suitable: raw and non-commercial | **Yes** | The old `service.php` works without a key today; its new API needs one, which a public browser app would expose |
| NOAA CO-OPS | US stations; verified and preliminary; several datums | Public domain; attribution asked | **Yes** | **Yes**, data and station APIs | No |
| SONEL | GNSS measurements of the land's own vertical movement at or near tide gauges | ULR7a: CC BY 4.0. ULR20: none shown | ULR7a yes; ULR20 ask | No (medium) | Not for the velocity tables |

Copernicus Marine's in-situ product `INSITU_GLO_PHY_SSH_DISCRETE_MY_013_053` (checked, updated twice a year) allows
redistribution "in their original form" with attribution, but needs a login; its CORS was not tested. National
agencies (BODC, REFMAR, BOM, MEDS, JODC) feed PSMSL and GESLA and were not checked one by one.

**How the data are reached**, for whoever builds this: PSMSL serves one text file per station,
`https://psmsl.org/data/obtaining/rlr.monthly.data/{ID}.rlrdata`, with missing values as -99999, and an index,
`filelist.txt`. UHSLC serves a CSV and netCDF per station and ERDDAP datasets named `global_{daily,hourly}_{fast,rqds}`.
NOAA's API is `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`, at most 1 month of 6-minute data, 1 year
hourly or 200 years monthly per request.

**Relative, not absolute.** A tide gauge measures the sea against the land it stands on. PSMSL and UHSLC remove no
land movement, so a gauge on sinking ground shows a faster rise than the sea's own. SONEL's GNSS velocities are the
correction, where a GNSS station is near enough; UHSLC's series letters (a, b) mark segments measured from different
zeros.

## What each country has

Counted from the PSMSL and UHSLC station pages. "30+ years" is the record's span; the number in brackets is those
also at least 70% complete.

| Country | PSMSL stations (RLR / metric) | Longest record | 30+ years [70%+] | UHSLC fast / research | Notes |
|---|---|---|---|---|---|
| Philippines | 35 (26 / 9) | Manila (145), 1901–2024, 85% | 11 [6] | 6 / 9 | Manila is flagged; the gauge moved in 2002; 15 newer gauges start in 2011 |
| Bangladesh | 12 (5 / 7) | Chittagong Sadarghat (416), 1937–1991, metric | 1 [0] | 1 / 7 | RLR records end 2000–2003 |
| Indonesia | 46 (8 / 38) | Bitung II (1709), 1986–2018, 49% | 1 [0] | 15 / 17 | 25 records are 1925–31 fragments; Jakarta is metric only |
| Viet Nam | 7 (7 / 0) | Hon Dau (841), 1957–2013, 100% | 5 [5] | 2 / 4 | Every long record stops in 2013 in PSMSL |
| India | 33 (29 / 4) | Mumbai (43), 1878–2024, 88% | 20 [13] | 4 / 0 | The richest set; no research-quality data at UHSLC |
| Nigeria | 6 (1 / 5) | Lagos (451), 1940–1985, 28%, metric | 3 [0] | 1 / 1 | Nothing in PSMSL after 1996 |
| Mozambique | 9 (2 / 7) | Maputo (986), 1961–2001, 40% | 2 [0] | 2 / 5 | Nothing after 2013 |
| Brazil | 29 (12 / 17) | Ilha Fiscal (1032), 1963–2022, 94% | 4 [3] | 3 / 22 | Most RLR records stop in 1968 |
| Tuvalu | 2 (2 / 0) | Funafuti B (1839), 1993–2026, 93% | 1 [1] | 1 / 1 | |
| Kiribati | 14 (9 / 5) | Kanton-B (1329), 1972–2024, 82% | 3 [3] | 3 / 4 | Betio 1992–2026 |
| Marshall Islands | 7 (5 / 2) | Kwajalein (513), 1946–2025, 98% | 4 [4] | 2 / 3 | PSMSL files Wake Island here; UHSLC under the USA |
| Fiji | 4 (3 / 1) | Lautoka (1805), 1992–2026, 95% | 2 [2] | 2 / 2 | Suva A then Suva B, 1972–2026 |

### The Philippines

Usable long records: Manila, Cebu, Legaspi, Davao, Jolo (ends 1996) and San Jose. UHSLC's hourly Manila record starts
in 1984.

**Manila is not a clean measure of the sea.** PSMSL's station page flags it, notes benchmark changes in 1981 and
2002, and quotes a 1987 agency letter that blames reclamation and river deposition, with subsidence "not totally
discarded". Open evidence on the land's movement:

- Reyes et al. 2023, *Philippine Engineering Journal* 44(1), [journal page](https://journals.upd.edu.ph/index.php/pej/article/view/9137):
  13.13 mm/yr of relative rise in Manila Bay, and 8 to 12 mm/yr of subsidence north of Manila from satellite radar.
  Read from the abstract only: the landing page failed with an expired certificate. Medium confidence.
- EGU21-12815, [abstract](https://meetingorganizer.copernicus.org/EGU21/EGU21-12815.html): GNSS land movement at San
  Fernando, La Union. Read in full.
- Raucoules et al. 2013, *Remote Sensing of Environment*: ground movement up to about 15 cm/yr, not linear, so GPS
  cannot correct the Manila gauge. **Closed** in the journal; the HAL copy (hal-00863850) sat behind a bot check that
  was not bypassed, so whether an open copy exists is unconfirmed.
- Rodolfo and Siringan 2006: **closed**, not read.

SONEL lists GNSS stations near Manila (PTAG, PTGG, MANL, PIMO), at Puerto Princesa (PPPC) and General Santos (PGEN).
Their rates are in a file not downloaded (below).

## What a worked example would want, and where it is

- **The observed trend**, mm/yr with its uncertainty: PSMSL's [trends](https://psmsl.org/products/trends/long_term_trends.php)
  give one for qualifying stations, with an uncertainty that allows for autocorrelation. PSMSL says these carry no
  land-movement correction and are not for planning.
- **The projection for the same place**: IPCC AR6 projections at 1,012 tide-gauge locations, from a 1995–2014
  baseline, with and without land movement (Garner et al., [doi:10.5281/zenodo.5914709](https://doi.org/10.5281/zenodo.5914709);
  [NASA's tool](https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool)). **Not verified:** how AR6 estimates
  land movement at a gauge. If it is taken from the gauge's own record, Manila's subsidence is carried into its
  projection.
- **Extreme water levels**, for flooding: computed from UHSLC hourly data or GESLA, which is work, not a lookup.
- **The land's movement**: SONEL.

NOAA's global sea level trends table no longer exists: its old addresses redirect to a US-only page that points to
PSMSL.

## What this suggests

Not a decision; the practitioner's to make.

- **Ask PSMSL and UHSLC first.** One email each: may a public, curated repository mirror RLR monthly records (PSMSL)
  and Research Quality daily records (UHSLC) for named stations, with their citation; and would they consider a CORS
  header. The answer decides between a repository of copies and an index.
- **What the repository would add even without copies:** per country, the stations, spans, completeness, the PSMSL
  trend, the SONEL land movement where a GNSS station is near, the AR6 projection's location, and a plain statement
  of what each record cannot show (Manila's subsidence; Nigeria's record ending in 1996). That is the census-tables
  pattern: curated, with provenance, reviewed six-monthly.
- **The thin records are themselves a finding.** For Bangladesh, Indonesia, Nigeria and Mozambique the repository
  would say there is no usable long record, and why, rather than leave a gap unexplained.

## Files worth having, not downloaded (ask first)

| File | Source | Size |
|---|---|---|
| `trends_longest.csv` | https://psmsl.org/products/trends/trends_longest.csv | 76,522 bytes |
| `vertical_velocities_table-7.txt` (SONEL ULR20, no licence shown) | https://www.sonel.org/IMG/txt/vertical_velocities_table-7.txt | 86,661 bytes |
| `ulr7_vertical_velocities.txt` (SONEL ULR7a, CC BY 4.0) | https://www.sonel.org/IMG/txt/ulr7_vertical_velocities.txt | 46,012 bytes |
| `rlr_monthly.zip` | https://psmsl.org/data/obtaining/rlr.monthly.data/rlr_monthly.zip | 18,967,897 bytes |
| `rlr_annual.zip` | https://psmsl.org/data/obtaining/rlr.annual.data/rlr_annual.zip | 15,690,492 bytes |
| `ULR20.zip` | https://www.sonel.org/IMG/zip/ULR20.zip | 43.5 MB |
| AR6 `location_list.txt` | the AR6 projections' repository | not checked |

## Sources

PSMSL: [obtaining data](https://psmsl.org/data/obtaining/), [RLR](https://psmsl.org/data/obtaining/rlr.php),
[metric](https://psmsl.org/data/obtaining/metric.php), [reference](https://psmsl.org/data/obtaining/reference.php),
[Manila](https://psmsl.org/data/obtaining/stations/145.php), [trend methods](https://psmsl.org/products/trends/methods.php).
UHSLC: [data](https://uhslc.soest.hawaii.edu/data/), [data information](https://uhslc.soest.hawaii.edu/datainfo/),
[ERDDAP](https://uhslc.soest.hawaii.edu/erddap/). GESLA: [licence](https://gesla787883612.wordpress.com/license/),
[downloads](https://gesla787883612.wordpress.com/downloads/). IOC: [disclaimer](https://www.ioc-sealevelmonitoring.org/disclaimer.php),
[API documentation](https://github.com/SLSMF/API-Documentation). NOAA: [disclaimers](https://tidesandcurrents.noaa.gov/disclaimers.html).
SONEL: [data policy](https://www.sonel.org/-Data-policy,88-.html), [vertical land movements](https://www.sonel.org/-Vertical-land-movements-.html?lang=en).
Copernicus Marine: [product](https://data.marine.copernicus.eu/product/INSITU_GLO_PHY_SSH_DISCRETE_MY_013_053/description),
[licence](https://marine.copernicus.eu/user-corner/service-commitments-and-licence). AR6:
[projections repository](https://github.com/Rutgers-ESSP/IPCC-AR6-Sea-Level-Projections). All checked 2026-11-19.
