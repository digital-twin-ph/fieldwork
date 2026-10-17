# geoBoundaries, tested rather than compared

_Created 2026-10-17 · Updated 2026-10-17_

The practitioner, 2026-10-17: *"We have not tested geoBoundaries though."* Correct. It was
chosen from a licence table in [47](../experiments/47-sea-level-pack.md) — a comparison made
from documentation — and the glossary records the result as *"geoBoundaries is used instead."*
Nothing in `src/` references it. This note is the first time anything asked the service a
question.

Read-only metadata requests to the public `gbOpen` endpoint, no key, 11 country-levels.
No geometry was downloaded.

## What the documentation already settles

`https://www.geoboundaries.org/api/current/{RELEASE}/{ISO3}/{ADM}/` returns JSON **metadata
without the geometry**, carrying `admUnitCount`, `meanVertices`, `minVertices`, `maxVertices`,
area and perimeter statistics, and separate `gjDownloadURL`, `tjDownloadURL` and
`simplifiedGeometryGeoJSON` links.

That answers the hardest design question for a selection modal: **a picker can list levels, show
how large each is, and download only what was chosen.** It does not have to fetch geometry to
offer a choice. `boundaryID` (`COD-ADM3-77481523`) is content-keyed — the documentation says it
"changes only if the underlying data changes" — which is an anchor for the versioned jurisdiction
identity [14](../experiments/14-gadm-jurisdiction-assets.md) A53 requires.

Releases: `gbOpen`, `gbHumanitarian` (UN OCHA mirror), `gbAuthoritative` (UN SALB, **not for
commercial use**). No stated rate limits; no guaranteed uptime.

## What only testing showed

### 1. `gbOpen` is not one licence, and one of them is share-alike

| | ADM1 | ADM2 | ADM3 |
| --- | --- | --- | --- |
| COD | **ODbL** | CC BY | **ODbL** |
| UGA | **ODbL** | Public Domain | CC0 1.0 |
| PHL | CC BY 3.0 IGO | CC BY 3.0 IGO | CC BY 3.0 IGO |
| KEN | Public Domain | CC BY 3.0 IGO | CC BY 4.0 |
| NGA | CC BY 4.0 | CC BY 4.0 | *(none)* |
| BGD | CC0 1.0 | CC BY 3.0 IGO | CC BY 3.0 IGO |
| BRA | CC BY 2.5 Generic | CC BY 3.0 IGO | *(none)* |

**Experiment 47's table records geoBoundaries as "CC BY 4.0 … attribution obligation only".**
That is the project's stated reason for preferring it to GADM, and it is not what the service
returns. Six distinct licences appear across eleven country-levels, and **ODbL carries
share-alike**, which is a materially different obligation from attribution — it reaches anything
derived and redistributed. The three ODbL levels here are the DRC and Uganda ones: exactly the
cross-border case that prompted the question.

The licence is per boundary and is carried on every response as `boundaryLicense`,
`licenseDetail` and `licenseSource`, so it can be recorded per selected member rather than
assumed per source. That is the fix, and it is also what [14](../experiments/14-gadm-jurisdiction-assets.md)
A52 already asks for: distribution and acquired bytes kept apart.

### 2. ADM3 is not always there

`NGA/ADM3` and `BRA/ADM3` return nothing. A selection modal cannot assume a fixed hierarchy
depth, and "pick an ADM level" is not a question every country can answer.

### 3. Levels within one country are from different years

| | ADM1 | ADM2 | ADM3 |
| --- | --- | --- | --- |
| COD | 2017 | 2019 | **2010** |
| UGA | 2017 | **2006** | 2020 |
| BGD | 2015 | 2020 | 2020 |
| BRA | **2006** | 2020 | — |

So a study that uses ADM2 for one purpose and ADM3 for another is mixing boundary vintages
within a single country, and nothing says so. `boundaryYearRepresented` is exactly the **frame
vintage** the glossary's **Vintage** entry already makes `rate` refuse on when it disagrees with
a numerator period — the field exists, and the refusal already exists, and they have never met.

**And across the border it is worse.** The DRC at ADM3 is 2010; Uganda at ADM3 is 2020. A joint
investigation of cases crossing that border would pair a ten-year-old boundary with a current
one. An epidemiologist would want to be told that before a rate is computed, not after.

### 4. The hierarchy is not nested by count

COD has 189 units at ADM2 and **188** at ADM3. UGA has 151 at ADM2 and **137** at ADM3. A level
below has fewer units than the level above, so ADM3 is not a subdivision of ADM2 in these
countries — it is a differently-sourced layer that happens to sit at that label. Selection
cannot present a tree.

### 5. Sizes invert, and the coarse levels are the heavy ones

Mean vertices per unit: COD ADM1 7,466 and ADM3 917; UGA ADM1 16,340 and ADM3 82. National and
regional outlines are long and detailed; local units are small and simple. Unit counts run the
other way — PHL ADM3 1,647, BRA ADM2 5,570 — so the practitioner's *"select only the boundaries
we need"* matters at both ends, for different reasons.

### 6. One parsing quirk

`COD/ADM3` returns `boundaryYearRepresented` as `"2010.0"`. A year arriving as a float is the
kind of thing that reaches a receipt as a vintage and fails a string comparison silently.

## What this does not establish

**That the data is fit for epidemiological use.** Nothing here opened a geometry. Topology,
coordinate precision, whether units are contiguous, and whether names match a surveillance
system's units are all unexamined.

**That the licences are correctly reported.** These are the service's own strings. A
share-alike obligation that matters would want checking against the source it names in
`licenseSource`, not against this table.

**That the ADM3 counts are errors.** Fewer units at a lower level may be correct for a country
whose ADM3 covers only part of its territory. The finding is that selection cannot assume
otherwise, not that the data is wrong.

## What would close it

Downloading one small level — UGA ADM3 is 137 units at 82 mean vertices — and checking the
geometry, the identifiers and whether `boundaryID` is stable across two releases. That last one
is what A53's versioning would rest on and is the only claim here taken from documentation
rather than observation.
