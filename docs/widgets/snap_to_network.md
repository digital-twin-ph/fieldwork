# Snap to network

_Created 2026-10-14 · Updated 2026-10-14_

Moves each site to the nearest junction of a street network, so that steps which
route along streets have somewhere to start.

## What you connect

| Port | What it expects |
| --- | --- |
| `sites` | the points to move |
| `network` | a street network, from **Street network** |

## What it assumes

**It moves your data.** Every site comes out at a junction, not where it stood.
How far each one travelled is measured and published as
`fw:greatestSnapDistanceMetres` in the run evidence, and the output points are a
**derived** dataset — they are not observations any more.

**A site too far from the network is snapped anyway, and marked.** Past the snap
limit the point still moves to its nearest node, and carries `offNetworkMetres`
as well as `snapDistanceM` — the first leg of its route crosses ground no street
covers. The widget glows red on the canvas and the Inspector names each such site
and the distance. What the limit decides is whether the point says so, not
whether the site is in the result.

Nothing is dropped, and the widget refuses nothing on these grounds. Both of the
earlier behaviours — an error before 2026-10-14, a silent omission for the hours
after it — removed the places furthest from a mapped road, which is where street
mapping is thinnest and where an access analysis is most often needed. The alert
is the feedback loop instead: raise the limit, extend the network, or accept what
is listed and say so in what you publish.

## What to check

The snap distance, every time. If a site moved 200 m to reach a junction, then
everything measured downstream starts 200 m from where it should, and that error
does not appear anywhere in the final numbers.

## Going deeper

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
checks the junction choice against pyproj and measures each displacement against
a five-minute budget — one of the eight example pumps was decided by 0.43 m.
