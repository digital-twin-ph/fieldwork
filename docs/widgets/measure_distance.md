# Measure distance

_Created 2026-11-09 · Updated 2026-11-11_

**For each point, the nearest of a set of candidates, and how far it is.** Each facility's nearest tide gauge; each
sampled location's nearest clinic.

## What it does

It measures the straight-line distance from every point to every candidate and keeps the nearest, on a sphere of
6,371.0088 km (Haversine). It gives one row per point: the point, its nearest candidate, and the distance.

## What you connect

- **Points to measure from**: any point layer.
- **Candidates, the nearest of which is found**: any point layer.

A step that reads a table, such as **Relate**, **Select rows** or **Table**, reads the result as a table with these
columns:

| Column | Holds |
| --- | --- |
| `point_id` | The point |
| `nearest_id` | Its nearest candidate |
| `nearest_<attribute>` | Each of that candidate's own attributes: `nearest_name`, `nearest_site_id` |
| `distance` | The distance, in the unit chosen |

So **Relate** can bring a value that belongs to the candidate onto each point: the sea-level example matches
`nearest_site_id` to the projections' `site_id`.

## How to use it

The step's panel holds its **Name**, its two inputs, one sentence saying what it measures, and **Configure…**:

| Setting | What it decides |
| --- | --- |
| **Distances in** | kilometres or metres |
| **Eligible candidates** | Conditions on a candidate's own attribute: its value is, or is not, one of those you list. A candidate without the attribute does not match |

## What it will not do

- **It will not follow roads or water.** A straight-line distance is not a travel distance.
- **It will not say a point belongs to its nearest candidate.** Nearest is a fact about distance; what it means is yours
  to state.
- **A point with no location keeps its row**, with no nearest candidate and no distance, so it is counted.

## Where it is used

The sea-level example (each facility's nearest tide gauge).
