# Find building footprints · specification

_Created 2026-10-15 · Updated 2026-10-15_

**Proposed. Not built, not registered, not in the palette.** This is the specification; there is
no manual because there is nothing yet to use. Asked for by the practitioner on 2026-10-15.

## What it would be for

Nothing in the palette brings buildings in. Any question that depends on where people actually
are — exposure to a hazard, whether a settlement is covered, how a population is distributed
below the unit it was counted in — has no source for them today. A practitioner can import
points and polygons they already hold; they cannot ask Fieldwork for the buildings in a study
area.

## The source question is answered, and not here

`digitaltwin-aas/gaborone/03a-Building-Footprint-Augmentation.ipynb` evaluates five products
against one city and records a decision, with the comparability paper behind it: Tatem et al.,
*Building footprint data for countries in Africa: to what extent are existing data products
comparable?*

| Source | Access | Licence | Verdict there |
| --- | --- | --- | --- |
| OpenStreetMap | OSMnx / Overpass | ODbL | the baseline — 156k buildings for Gaborone, and the only one with rich attributes: type, name, levels |
| Overture Maps | `overturemaps` Python package, monthly release | per theme | **used** — richest schema: height, floors, class, subtype |
| 3D-GloBFP (Copernicus, ESSD 2024) | Zenodo grid index → Figshare zips, ~92 MB per grid | CC-BY | **used** — explicit height in metres |
| Google Open Buildings v3 | per-S2-tile CSV.gz, ~6 M rows for the tile covering Gaborone | CC-BY-4.0 | **excluded** |
| Microsoft GlobalML | country GeoJSON.gz from an index CSV | ODbL | **excluded** |

**Why the two were excluded is the finding worth carrying.** Not coverage: both cover the city.
Neither carries **height**, which the occupancy model needed, and their high counts in informal
settlements are **inflated by sliver detections** — more polygons, not more buildings. A
footprint count is not a measure of how many buildings there are, and a widget that reported one
as though it were would mislead exactly where the data is thinnest and the question is most
often asked.

The notebook's merge rule, for whoever builds this: keep OSM unchanged, add a footprint from
another source only when its centroid is more than 10 m from any OSM building, deduplicate
across the added sources, and impute conservatively — residential unless known otherwise, area
from the polygon.

## What is not answered: the contract

Fieldwork runs in a browser and has no Python. Of the five sources, **only OpenStreetMap is
reachable the way this application reaches anything**: the Overpass path `network_input` uses,
which means inheriting its caps, its politeness rules and its instability — four public
instances, none of them healthy at the same moment on 2026-10-15. Overture is GeoParquet on
object storage, 3D-GloBFP is a grid of zipped shapefiles, and the two excluded products are
country- or tile-sized files. None of those is a thing a browser fetches casually.

So the widget is one of two things, and they are different widgets:

| | Acquires | Imports |
| --- | --- | --- |
| Source | OpenStreetMap only, via Overpass, bounded by the study area | a file the practitioner prepared elsewhere — the notebook pipeline's output, or any of the five |
| Looks like | `find_health_facilities` | `point_input` / `network_input`'s file mode |
| Gives | what OSM records, which is uneven and says so | whatever they brought, with provenance only as good as what they state |
| Costs | another dependency on an unstable public service | a practitioner who already has the data, which is a narrower audience |

**Recommendation:** import first. The acquisition path is the one already known to be fragile,
and the evaluation above shows that the *useful* footprint layer for a real study is a merge of
several sources that no browser is going to assemble. An import widget serves the practitioner
who has done that work; an acquire widget serves nobody well until Overpass is dependable.

## What this does not establish

That any of the five is right for a place that is not Gaborone. The evaluation is one city, and
its decision turned on an attribute — height — that another study may not need at all; a study
that only needs *where* buildings are might reasonably prefer the products excluded here.

Nor that buildings are the right unit. The notebook allocates population to buildings by floor
area, which is a model with its own assumptions, and this widget would hand a practitioner the
geometry without any of them.
