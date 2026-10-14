# Observed extent (convex hull)

_Created 2026-10-14 · Updated 2026-10-14_

Draws the smallest convex outline containing your points, and measures the area
it encloses.

## What you connect

| Port | What it expects |
| --- | --- |
| `points` | at least three located points |

It produces one polygon carrying `areaSquareMetres` and `spanMetres`, which a
rule or a table can read.

## What it assumes

**A hull is convex and your data may not be.** Cases along a river, facilities
along a coast — the hull fills in the space between them, so it **asserts area
where nothing was observed**.

**It is an outline of what was seen, not a boundary.** Not a service area, not a
catchment, not anything anyone agreed to. Where observation stopped is not where
the thing being observed stopped.

**Points without coordinates take no part**, and the count that did is stated in
the notes.

## What to check

The span against the area. A hull far longer than it is wide is close to a line,
and should be read as one — the widget says so in its notes when it happens.

## Going deeper

The lab's [hull notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=10-hull-vs-shapely.ipynb)
checks the outline and the area against Shapely.
