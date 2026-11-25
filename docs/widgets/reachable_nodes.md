# Reachable junctions

_Created 2026-11-23 · Updated 2026-11-25_

**A spatial operation.** It takes sites and a street network and gives back the street junctions each site can reach
within a travel time, each junction carrying the time and distance it took and the budget left on arrival.

## What it does

The travel time and the speed make a budget in metres: 10 minutes at 80 metres a minute is 800 m. From each site's
junction, the step follows the streets, cheapest route first, and keeps every junction it reaches within the budget.
**To each site** reverses every street, so it answers who can reach the site rather than where the site can reach. On
one-way streets the two differ.

Each junction reached is a point carrying the site it was reached from, the metres and minutes travelled, and
`remainingM`, the budget left. **Reachable corridor** reads that to draw where the time runs out between junctions.

## What you connect

| Port | What goes there |
| --- | --- |
| **sites** | the sites to travel from or to, snapped to the network or not |
| **network** | a street network, from **Street network** |

## How to use it

1. Connect the sites and the network.
2. In **Configure…**, choose the direction, the travel time, how people travel and the speed. The speed must suit the
   mode: walking is 30 to 110 metres a minute, cycling 100 to 400, driving 150 to 1,200.
3. Sites that **Snap sites to the network** has moved need nothing else. For sites that have not been snapped, set the
   UTM zone and hemisphere this step attaches them in, and a snap limit if you want sites far from a street marked.
4. Run. The Result counts the junctions reached, the sites that reach nothing in the time and the sites past the snap
   limit.

## What it will not do

- **It does not follow a timetable.** Public transport is not a mode here: it follows routes and a timetable, not the
  street network.
- **It does not vary the speed.** Every time is a street length divided by one speed, an assumption about one place
  in one period.
- **It does not tell a far junction from a missing street.** A junction can be unreached because it is too far or
  because the downloaded network stops short of it. The two look the same.
- **It does not re-measure the streets.** Lengths are the network's, as supplied.

## What this does not establish

That the speed holds where you use it, or that the network is complete. A site set back from the road spends its walk
to the junction first, so it reaches less than one on the road.

## How it was checked

The lab's [reachability notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=07-reachability-vs-networkx.ipynb) recomputes the junctions with networkx.

## History

### 2026-11-25 · The Preview says what it is waiting for, exactly (0.7.0)

Its Preview multiplied the minutes by the speed, which is the two numbers just typed: the same sentence whether the
network reaches a thousand junctions or none.

The budget sentence stays, because it is what the two settings mean, and what that budget buys is counted where the
sites and the network can both be read. Where they cannot, what is missing is said exactly: a port with nothing on it is
waiting to be connected, while a downloaded street network is held outside the page and read when the workflow runs.
Asking for a street network over a connected one sends you to fix something that is not broken.

### 2026-11-23 · On the standard (0.6.0)

Moved off the old catchment panel to the standard Inspector: one sentence of what it finds, every setting in
**Configure…**, which holds Apply while the speed is outside the mode's range, and the run's counts in the Result.
