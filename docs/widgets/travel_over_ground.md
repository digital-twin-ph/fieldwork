# Travel time over ground

_Created 2026-11-24 · Updated 2026-11-24_

**A spatial operation.** It takes a friction surface, the places a walk starts from and the places you want an answer
for, and writes onto each of those places the time to the nearest starting point.

## What it does

A **friction surface** is a raster whose value in each cell is the cost of crossing one metre of that cell — minutes
per metre. The Malaria Atlas Project publishes one for walking, worldwide, at about a kilometre.

The step starts at every starting point at once and spreads outwards across the cells, always continuing from the
cheapest cell reached so far. A step between two neighbouring cells costs the metres between their centres times the
average of the two cells' friction. Because every starting point is seeded together, the time a cell settles at is
the time from the **nearest** of them, and you do not have to ask which one that was.

Then it reads the settled time at each place you asked about and writes it into a column you name.

Use this instead of **Reachable junctions** where the walk is mostly not on a mapped road. Use Reachable junctions
instead where the streets are how people move and the network is published.

## What you connect

| Port | What goes there |
| --- | --- |
| **Friction surface** | a raster of cost per metre, from **Raster input** or **Clip raster** |
| **Start from** | the points a walk begins at: health facilities, vaccination posts, a team's base |
| **Places** | the points you want an answer for: settlements, schools, households |

All three are needed. A street network cannot be connected here — that is a different operation.

## How to use it

1. Read the friction surface with **Raster input**, and clip it to your area with **Clip raster** if it is large.
2. Connect it, the starting points and the places.
3. In **Configure…**, name the column the minutes go into, and set a ceiling if you only care up to an hour.
4. Run. The Result says how many places were reached and how many were not.

## What it will not do

- **It does not give a route.** Nobody walks the line this grid implies. The walk steps between cell centres in eight
  directions; it is a model of crossing ground, and the minutes are what the surface says the ground costs.
- **It does not tell two places in one cell apart.** The cell is the finest distinction the answer can make.
- **It does not drop a place it cannot reach.** That place keeps its row, with nothing in the time column and
  `_why` beside it saying whether it fell outside the surface or no path reached it. A settlement nobody can reach is
  usually the finding you are looking for.
- **It does not choose a speed.** The surface states the cost of the ground, which is the reason for using one.
- **It does not give back a surface.** The answer is at the places you asked about, not as a new raster. A computed
  raster would have no file behind it, and the evidence would end up citing a digest for values those bytes do not
  produce.
- **It does not cross more than 16,000,000 cells in one pass.** Past that it refuses and says the figure. Clip the
  surface, or read a coarser one.

## What this does not establish

That the surface is right about the ground. A road built since it was made, a river in flood, a season — any of these
makes every minute wrong, and nothing in this step can tell. Where a ceiling is set, a place past it is unreached
*here*, which is not the same as unreachable.

## How it was checked

Unit tests on made-up grids: zero minutes standing on a starting point, a known time one cell away, the nearest of
several starting points found in one pass, cheap ground against dear, a wall of no-data leaving a place unreached with
its reason, a starting point on no-data named rather than quietly dropped, the ceiling leaving a place unreached
rather than given a large number, and the cell limit refused with its figure.

It has never been run against a published friction surface. Whether its minutes resemble a real walk is open.

## History

### 2026-11-24 · First release (0.1.0)

Added for campaign microplanning, where most of the walk to a settlement is not on a mapped road
([experiment 231](../experiments/231-travel-time-over-ground.md)).

**The cell limit was measured, not chosen.** The first version found the next cell to continue from by scanning a
list, which on a 250,000-cell grid was 94% of the whole time — so the first limit measured the list and not the
ground. With an ordinary heap in its place, the cost is linear at about a quarter of a microsecond a cell in
Chromium, and what binds is memory rather than patience: the walk keeps eight bytes a cell beside the raster's own
values, so 16,000,000 cells is 128 MB in one browser tab. For scale, a Nigerian LGA at this resolution is a few
thousand cells and all of Nigeria about 924,000.
