# Combined area

_Created 2026-10-22 · Updated 2026-10-22_

Takes areas and gives back one area, or takes polygons and gives back one polygons result. It
combines whatever kind it is given, and hands back the same kind.

## What it does

**Given two study areas** — say two adjacent provinces — it carries both outlines through as the
parts of one study area. That area can then be given to everything a study area feeds: the street
network, the facility sources, the clip, the buffer.

**Given a polygons result** — catchments, hulls, buffers — it dissolves the ones that overlap or
touch into single polygons and leaves separate ones separate, in a metric projection you choose.

## What you connect

| port | what it takes |
|---|---|
| `polygons` | a polygons result, to dissolve |
| `area` and `area2` | two study areas, to combine |

Every port is always there. What the widget *yields* follows what you wire: connect areas and the
output is an area; connect polygons and it is a polygons result. Nothing to set.

## How to use it

**To combine two study areas.** Add the widget, then connect one study area to `area` and the
other to `area2`. The output becomes an area the moment the first one is wired, so it can be given
to a Street network, a facility source, a clip or a buffer exactly as a single study area would be.
Name it if you want; unnamed, it takes the parts' names joined with a plus.

**To dissolve a polygons result.** Connect it to `polygons` and set the metric zone and hemisphere
for the projection the dissolve is computed in. Overlapping and touching polygons become one;
separate ones stay separate, and the count of each is reported.

## What it assumes

**That a touching border should not be dissolved when combining areas.** Two provinces that share
a border come through as two parts, not one welded outline. A published outline is an authority's
record of where a boundary lies; two authorities describe a shared border differently, and welding
them would assert a third line that neither drew while still citing both as the source. Every
question this application asks of a study area — is this point inside, what does an extract clip
to, what are the bounds — is answered identically by two parts. What they do not do is pretend the
border is gone.

**That dissolving IS right for polygons.** A catchment is this application's own construction, not
somebody's record of where a line is, so two that overlap are one reachable region and are merged.

**That the first area's spatial reference is the combination's.** Combining areas held in different
projections is a question nobody has asked here yet, and guessing an answer would bury it.

## What it will not do

- It will not dissolve areas, for the reason above.
- It will not combine an area with a polygons result. They are different kinds and the output
  would have to be one of them.
- It will not reproject. The metric projection on the polygons path is yours to set; the area path
  carries the first part's reference through unchanged.

## What the receipt says

On the area path: `fw:AreaCombination` as the activity, `prov:used` for each part, `fw:partCount`,
and `fw:ringCount` on the geometry — so a reader can see the parts were kept rather than merged.

## Checked against

The polygons path is checked against shapely/GEOS in the validation lab (`12-combined-area`,
agrees: combined area 701,662.61 m² against 701,662.61 m², zero symmetric difference). **That check
covers the polygons path only.** The area path, added 2026-10-22, has no external check yet, and
no Dive Deeper lesson — those are two different repositories and two different questions: the lab
recomputes what this widget computed, and a lesson teaches what the method IS.
