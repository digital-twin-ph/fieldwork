# The UTM zone

_Created 2026-11-26 · Updated 2026-11-26_

## What it does

Some widgets measure in metres: Mean center, Compare point sets, Combined area, Convex hull, Snap to street network,
Reachable corridor, Voronoi catchments and Network isochrone. Longitude and latitude are angles, not lengths. So
these widgets first move every point onto a flat grid in metres. That move is a projection.

Fieldwork uses UTM. UTM divides the world into 60 zones, each six degrees of longitude wide, north and south of the
equator. Inside its own zone, UTM keeps distances true to about one part in a thousand. Outside its zone, the error
grows fast.

The zone you choose is part of how the answer is computed.

- **Two zones can both be reasonable.** Gaborone, near 25.9° E, sits close to the line between zones 34 and 35.
  Measured in zone 34, an area there comes out about 0.6% different from the same area measured in zone 35.
- **That difference is not an error in either.** It comes from the projection's scale, which grows with distance
  from the middle of the zone. It is small, but it does not average out: it moves every length, area and centre in
  the workflow the same way.
- **Coordinates from two zones cannot be mixed.** The same easting and northing mean different places in different
  zones, and in both hemispheres.

## How to use it

1. In **Configure…**, check the zone. The dialog says which zone this workflow's points suggest: the one whose middle
   is closest to them.
2. Use the same zone in every step of the workflow that measures in metres. A run that finds two zones stops and
   names the steps and the zones.
3. Write the zone down with your results, so a reader can measure the same way.

## What it will not do

- It will not choose a zone for an area that spans two. If your study area crosses a zone line and needs one frame,
  UTM is the wrong tool. An equal-area projection chosen for the region is better, and these widgets do not offer one.
- It will not convert coordinates from another projection or datum for you, other than WGS84 UTM zones.
