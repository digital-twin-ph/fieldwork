# John Snow case study: what the surviving data sets can and cannot support

_Created 2026-10-08 · Updated 2026-10-08_

Reviewed 2026-10-09. Source inspection and direct computation on the files named below. Figures in
this note were computed here, not copied from the literature, except where a paper is cited.

A recurring question for this project is how far the 1854 Broad Street outbreak can carry a
**person, place and time** workflow. The short answer: place is excellent, time exists separately,
person exists only as houses, and the three cannot be joined at the level of a case. Each limit is
specific and worth knowing before designing an exercise around it.

## The data sets

| Data set | What one row is | Person | Place | Time | Licence |
| --- | --- | --- | --- | --- | --- |
| `cholera_deaths.csv` (bundled) | a building, with a death count | counts only | WGS84 point | none | **unknown**, per the Chicago compilation |
| `snow_dates.csv` (bundled) | a day of the outbreak | counts only | none | **date** | Snow 1855, public-domain source |
| `deaths_nd_by_house` (not yet bundled) | a **house**, including houses with no deaths | counts, with a denominator of houses | OSGB36 point | none | GPL, per the documentation |
| Tobler's 578 "individual deaths" | a death, **displaced** — see below | one row per death | distorted | none | — |

### What this project bundles

`cholera_deaths.csv` is 250 buildings with death counts, shared by Wilson (2011); it is the same data
as the University of Chicago Center for Spatial Data Science compilation's `deaths_by_bldg`, whose
overview table records the licence as **unknown**. It carries 489 deaths in 250 rows, which is why
counting rows rather than summing the count column understates it by half.

`snow_dates.csv` is Snow's own Table 1 from the 1855 monograph: **616 deaths and 571 dated attacks**
between 19 August and 30 September 1854, plus one row carrying **45 attacks with no date**. A keyed
table cannot hold an empty key, so a workflow importing it excludes that row and must say so.

Two facts from that table do real work in this project: **attacks peak on 1 September and deaths on
2 September**, so a series must declare which kind of date it counts; and weekly totals show the lag
directly, 379 attacks against 279 deaths in the week beginning 28 August, reversing the week after.

### The trap: the 578 "individual deaths"

The obvious data set for case-level work is Tobler's digitisation of Snow's map, 578 points. **Those
are not the locations of the deaths.** Snow stacked multiple deaths beside a house, like a histogram,
so that deaths in one building stayed visible on a printed map; the digitisation preserves the stacked
positions, which are displaced from the building. The Chicago team **removed the data set** from later
versions of their compilation for that reason. Anyone looking for case-level Snow data reaches for
these first, and a nearest-pump or distance analysis built on them is measuring a cartographic device.

### The denominator, and what it is a denominator of

`deaths_nd_by_house` is the Chicago team's first digitisation of the **1855 General Board of Health**
map: **1,852 houses**, of which **369 had at least one death**, carrying `deaths_r` (residents, 661),
`deaths_nr` (non-residents, 45), `deaths` (706), a distance to the Broad Street pump in metres, and
distances to the former pest field and the nearest sewer grate.

Its value is that it includes **houses where nobody died**, which the bundled file does not. That is a
denominator — and the name "non-deaths" invites a misreading worth stating plainly: it is **houses
with no deaths, not a count of surviving people**. There is no population per house anywhere in these
files, so:

- a **rate per house** is computable and defensible;
- a **mortality rate per person** is not, and any figure presented as one would be invented.

A second subtlety: the 45 non-resident deaths are in the numerator while the houses they died in are
the denominator of residents' exposure. Using `deaths` rather than `deaths_r` therefore mixes a
numerator that includes visitors with a denominator of dwellings.

## Computed here: the gradient the denominator makes visible

Deaths per 100 houses, and the share of houses with at least one death, by distance band to the Broad
Street pump, over all 1,852 houses:

| Distance to pump | Houses | Deaths per 100 houses | Houses with ≥1 death |
| --- | --- | --- | --- |
| 0–50 m | 45 | **186.7** | 55.6 % |
| 50–100 m | 140 | 132.9 | 59.3 % |
| 100–150 m | 283 | 72.1 | 41.3 % |
| 150–200 m | 429 | 35.0 | 20.3 % |
| 200–250 m | 420 | 14.0 | 10.0 % |
| 250–300 m | 304 | 6.3 | 5.0 % |
| 300–350 m | 148 | 2.0 | — |
| All | 1,852 | 38.1 | 19.9 % |

Two different quantities, and the distinction matters: **deaths per 100 houses exceeds 100** near the
pump, because a house can have more than one death. That is a ratio. The share of houses with a death
cannot exceed 100 %; that is a proportion. A tool that lets both be computed must make the author say
which, or the two will be read as the same number.

It also carries a **vintage mismatch** that cannot be resolved: the numerator is the 1854 outbreak and
the denominator is an 1855 map. The houses counted are not exactly the houses at risk.

## Time and place cannot be joined

The dates are outbreak-wide daily totals; the places are buildings without dates. HistData's own
documentation states that the dates of individual deaths are not recorded and that this prevents
analysis of the time course. No data set in the Chicago compilation carries a date field.

The serious attempt to reconstruct both is Shiode and colleagues,
[*The mortality rates and the space-time patterns of John Snow's cholera epidemic map*](https://doi.org/10.1186/s12942-015-0011-y)
(International Journal of Health Geographics, 2015), which merged historical documents to obtain
per-victim space and time. It reports high mortality rates close to the pump and **no distinctive
space-time pattern**, read as consistent with waterborne rather than airborne transmission. The merged
data set is not distributed with the files above.

**So a space-time cluster statistic on Snow's data would require assigning dates to addresses that the
historical record does not assign.** That is fabrication with a citation attached, and this project
will not do it.

## The licence position, stated accurately

An earlier draft of this note implied that the GPL prevents this project from redistributing
`deaths_nd_by_house`. That is wrong, and the correction matters because the same reasoning will come
up for every third-party data set:

- **Using it locally is uncontroversial** and is what produced the table above. The file was
  downloaded and read; nothing in the licence restricts that.
- **The GPL permits redistribution** — that is its purpose. What it requires is that the licence and
  attribution travel with the file and that the source form remains available, which for a CSV is the
  file itself.
- **Bundling it would not relicense Fieldwork.** Copyleft reaches works *based on* the licensed work.
  A data file in its own directory beside unrelated code is mere aggregation, which the GPL
  explicitly excludes from that reach.
- **The real constraint is on derived copies.** A version reprojected to WGS84, filtered, or re-keyed
  is plausibly a modified work, and would have to carry the GPL and be marked as modified. That is a
  design consequence rather than an obstacle: the file can be bundled verbatim, and a converted form
  cannot quietly become Apache-2.0.

Two gaps worth closing before bundling. **No licence file ships with the data** — the GPL is asserted
in a table inside the documentation PDF, and the download contains only `.csv`, `.dbf`, `.shp`,
`.shx`, `.prj` and `.geojson`. And **the GPL version is not stated**, which matters if the file is
ever combined with anything rather than aggregated beside it. Both are questions for the publisher
rather than assumptions for us to make.

Underneath the digitisation, the facts are from the General Board of Health's 1855 map, an HMSO
publication; the copyrightable contribution is the Center for Spatial Data Science's work of
digitising it, which is what the licence covers.

## A technical limit worth recording

`deaths_nd_by_house` is projected in **OSGB 1936 / Airy 1830**, not WGS84. Bringing its points onto a
map here needs a **datum shift**, which Fieldwork's reprojection deliberately does not perform
([experiment 40](../experiments/40-reprojection-primitives.md)). The data set is still usable without
any geometry, because the distance to the pump is a column in the file — which is how the table above
was computed.

## What this supports

| Exercise | Supported? |
| --- | --- |
| Deaths mapped by building; catchments; nearest-pump allocation | Yes, with the bundled file |
| Epidemic curve by day or week, by a stated kind of date | Yes, with Snow's Table 1 |
| Rate per house by distance from the pump, with a denominator | Yes, with the Chicago house file; redistributable under its licence if bundled with that licence and its attribution |
| Mortality rate per person | **No** — no population denominator exists |
| Case-level space-time clustering | **No** — no data set carries both, and the one reconstruction found no pattern |

## Sources

- University of Chicago Center for Spatial Data Science, *John Snow & the Cholera Epidemic in
  Mid-19th Century London: 8 Datasets With Documentation for Use in GeoDa*, version 5, 20 September
  2023, and the data at <https://geodacenter.github.io/data-and-lab//snow/>.
- HistData `Snow.deaths` and `Snow.dates` documentation, retrieved through Rdatasets.
- Snow, J. *On the Mode of Communication of Cholera*, 2nd edition, 1855, Table 1.
- Shiode et al. 2015, as cited above.
