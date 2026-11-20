# Land subsidence: the sources that hold it, for the tide-gauge index

_Created 2026-11-20 · Updated 2026-11-20_

Asked by the practitioner on 2026-11-20, after the tide-gauge index reached coastal Africa: *"What other sources hold
land subsidence?"*, then *"Compile the above under docs/research"*.

Why it matters: a tide gauge measures the sea against the land it stands on. Where the land sinks, the gauge shows more
rise than the sea's own, and PSMSL's trends carry no correction for it. The index fills `nearest_gnss` and `gnss_*`
from SONEL's ULR7a solution, within 15 km of a gauge. In coastal Africa that column is almost empty: Nigeria has no
GNSS station in ULR7a, and of 25 African countries only Cabo Verde, Senegal, Seychelles, Tanzania and South Africa
have one near a gauge.

**What this is.** A list from what was already known, compiled without reading any source today. Nothing below has been
checked on 2026-11-20: not the licences, not the coverage, not whether a paper is open. Each entry is a lead to verify,
with what would have to be confirmed before it goes into the index.

## GNSS stations: the land's movement at a point

| Source | What it holds | Terms, as known | To confirm |
| --- | --- | --- | --- |
| **SONEL** ULR7a | Vertical velocities at GNSS stations near tide gauges | CC BY 4.0 (read 2026-11-19) | Already used |
| **SONEL** ULR20 | Newer solution, 2000–2025, 1,011 stations | No licence shown on its page (2026-11-19) | Its terms; left out until then |
| **Nevada Geodetic Laboratory (NGL)** | About 20,000 stations worldwide, vertical velocities by its MIDAS method, as plain text | Free with citation (Blewitt et al.), as recalled | The licence wording; coverage in Nigeria and the Philippines |
| **ITRF2020** (IGN, France) | Velocities of the reference networks | Open, as recalled | Few stations: likely no help at most gauges |
| **EPN** (EUREF) | European stations | Open, as recalled | Europe only |

The limit is the same for all of them: a GNSS station is rarely at the gauge, and the ground can sink at very different
rates a few kilometres apart.

## Vertical land motion at the gauges themselves

| Source | What it holds | Terms, as known | To confirm |
| --- | --- | --- | --- |
| **IPCC AR6 sea level projections** | Projections at PSMSL gauges, including a background vertical land motion term | Zenodo, CC BY 4.0, as recalled | Which file holds the term, its size, and whether the sea-level example already holds it. A **modelled** rate, not a measurement |
| **Satellite altimetry minus the gauge's record** | Per-gauge estimates of the land's movement (Oelsmann and colleagues, among others) | Some deposited as open datasets | Which datasets are open, and for which gauges |

## Satellite radar (InSAR): maps of the ground moving

| Source | What it holds | Terms, as known | To confirm |
| --- | --- | --- | --- |
| **COMET LiCSAR / LiCSBAS** (UK) | Sentinel-1 interferograms and velocity maps, wide coverage including Africa and the Philippines | Openly published, as recalled | Licence; whether frames cover the Nigerian and Philippine gauges. Raw products that need care to read |
| **European Ground Motion Service** (Copernicus) | Ground motion maps | Open, as recalled | Europe only |
| **NASA OPERA** | Surface displacement products | Open, as recalled | North America only |
| **ASF HyP3** | Sentinel-1 processing on request | Needs an Earthdata login | The login would be the practitioner's, not an agent's |

## Published estimates for coastal places

| Work | What it holds | Open? | To confirm |
| --- | --- | --- | --- |
| Wu, Wei and D'Hondt (2022), *Geophysical Research Letters* | InSAR subsidence in 48 coastal cities, including Manila and Lagos as recalled | Not known | Open access; whether Lagos and Manila are among the 48; any deposited data |
| Herrera-García et al. (2021), *Science*, "Mapping the global threat of land subsidence" | A global model of where subsidence is likely | Paper possibly closed; data possibly deposited | Both |
| Cian and colleagues (2019), *Remote Sensing* (MDPI) | Sentinel-1 subsidence in Lagos | MDPI journals are open access | The citation and figures, read from its page |
| Syvitski et al. (2009), *Nature Geoscience*, "Sinking deltas" | Delta subsidence, including the Niger | Likely closed | Any open copy |
| Reyes et al. (2023), *Philippine Engineering Journal* 44(1) | Local factors in Philippine coastal sea level | Open | Already cited in the index (`tide-gauges/PHL/README.md`) |
| Raucoules et al. (2013), *Remote Sensing of Environment* 139 | Manila subsidence, 1993–2010 | Closed | A HAL record exists (hal-00863850); whether it holds the full text |

## What could be added to the tide-gauge index

1. **AR6's per-gauge land motion term**, as a column clearly marked modelled, for every gauge PSMSL lists. The only
   source here that would fill the column at every gauge.
2. **NGL's nearest station** beside SONEL's, with its distance and years, still within 15 km.
3. **A "published estimates" section** in each country's README, open copies only, saying where a paper is closed and
   what that leaves unknown.

Each needs its source's terms and access confirmed first: a research run of web pages only, with no file downloaded,
and any file worth having listed by name, source and size.

## What this does not establish

- Any licence, coverage or access claim above. Every row is recalled, not read.
- That any source measures the land at a gauge. AR6's term is modelled; GNSS, InSAR and published estimates are near a
  gauge at best.
- Which countries are covered. None of these sources was checked for Nigeria or the Philippines.
