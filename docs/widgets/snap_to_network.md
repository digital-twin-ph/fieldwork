# Snap to network

_Created 2026-10-14 · Updated 2026-10-15_

**A process widget.** It moves each of your sites onto the nearest junction of a street
network, so that steps which travel along streets have somewhere to start.

## What it does

A route has to begin on the street network. Your sites almost never sit exactly on a
junction — a pump is in a yard, a clinic is set back from the road — so this widget finds the
nearest junction to each one and puts it there.

It also records **how far each site moved**, which is the number to watch.

## What you connect

| Connect | What it needs |
| --- | --- |
| your sites | the points to move |
| a street network | from the **Street network** widget |

Out come the same sites, at junctions, each carrying the distance it travelled. Feed them to
**Reachable junctions** or a walking-catchment step.

## How to use it

1. **Add it** from the palette, under Catchments.
2. **Connect your sites and a street network.**
3. **Set the snap limit** — how far a site may be from the network before the result says so.
4. **Run the workflow**, then read the snap distances in the output or the Inspector.

## Worked examples that use it

| Example | What it does there |
| --- | --- |
| **John Snow · walking catchments** | puts the eight pumps onto the Soho street network before travel times are computed |

## What it will not do

- **It will not leave your data where it was.** Every site comes out at a junction. The output
  is derived data, not observations any more, and the furthest any site moved is recorded in
  the run evidence.
- **It will not drop a site that is far from the network.** A site past the snap limit is still
  moved to its nearest junction and is **marked**: its first leg crosses ground no street
  covers. The widget glows red on the canvas and the Inspector lists each one with its
  distance. The limit decides whether the result says so, not whether the site is in it.
- **It will not tell you the move was acceptable.** If a site travelled 200 m to reach a
  junction, everything measured afterwards starts 200 m from where it should, and that error
  appears nowhere in the final numbers. Check the snap distance every time.

When sites are marked, you have three honest options: raise the limit, extend the street
network where it stops short, or accept the list and say so in what you publish.

## Checking it yourself

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
checks the junction choice against pyproj and measures each displacement against a five-minute
walking budget — one of the eight example pumps was decided by 0.43 m.
