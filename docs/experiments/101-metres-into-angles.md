# 101 · Metres into angles, audited

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** validated — every site that converts a distance in metres into an angle is now
found, measured against an independent geodesic, and re-measurable by
`npm run audit:metres`. What to do about it is not decided, and the errors are not fixed.

## The question asked

[100](100-choosing-the-metric-crs.md) recorded that several widgets convert metres to an angle
on a mean sphere while every projection is on the WGS84 ellipsoid, and closed by admitting that
**nothing had audited the rest**. The two instances known then were found by accident: check 17
noticed that `buffer_point`'s 500 m circle has vertices 501.6 m away, and the donut card
noticed a 50–125 m band measuring 50.8–125.2 m. Both were found by a check that happened to
look.

So: **where else does this happen, and how wrong is each one?**

## How it was tried

[`scripts/audit-metre-conversions.mjs`](../../scripts/audit-metre-conversions.mjs) finds the
sites by grep — three constants (`6371008.8`, `111195`, `111320`) and every Turf call that takes
`units:'meters'` — then exercises each one with a real call into the built application at four
latitudes, and measures the result against a **Vincenty inverse on WGS84**, accurate to
millimetres and sharing no code with anything being measured.

Eight sites were found. The error is reported as a **range**, not a worst case, because it is
directional.

## What happened

```
widget                  conversion                         equator      Manila 14.6°N   Soho 51.5°N
buffer_point            Turf buffer, 32 steps        -0.56 to 0.11%   -0.49 to 0.13%  0.06 to 0.32%
area (circle)           Turf buffer, 32 steps        -0.56 to 0.11%   -0.49 to 0.13%  0.06 to 0.32%
buffer_area             Turf buffer, 8 steps         -0.56 to 0.11%   -0.49 to 0.13%  0.06 to 0.32%
donut_geomask           great circle, mean radius    -0.56 to 0.12%   -0.49 to 0.14%  0.06 to 0.32%
samples                 flat 111195 m per degree     -0.55 to 0.11%   -0.49 to 0.14%  0.07 to 0.36%
network_input           flat 111195 m per degree     -0.56 to 0.11%   -0.49 to 0.13%  0.06 to 0.32%
area (box dimensions)   flat 111195 m per degree     -0.56 to 0.11%   -0.49 to 0.13%  0.06 to 0.32%
measure_area            Turf spherical area                  0.449%           0.364%        -0.373%
```

**It is one defect with seven faces.** Three conversion methods that look unrelated — a Turf
buffer, a great circle on a mean radius, and a flat 111,195 m per degree — produce the *same*
error to two decimal places at every latitude. They agree because they are the same
approximation written three ways: all of them treat a degree as a constant.

The true figures, computed independently and matching the audit to three decimals:

| Latitude | True m per degree, N–S | Flat 111195 is | True m per degree, E–W | Flat is |
| --- | --- | --- | --- | --- |
| 0° | 110,574 | **+0.561%** | 111,320 | −0.112% |
| 14.6° | 110,645 | **+0.497%** | 107,748 | −0.133% |
| 26.2° | 110,791 | +0.365% | 99,948 | −0.177% |
| 51.5° | 111,258 | −0.056% | 69,441 | **−0.317%** |

A degree of latitude is 110,574 m at the equator and 111,694 m at the pole, because the
ellipsoid's meridian curvature varies; a degree of longitude needs the prime-vertical radius,
not the same constant. So the error is largest **north–south near the equator** and largest
**east–west at high latitude**, and in between it passes through zero — which is why
`measure_area` changes sign between Old Naledi and Soho.

**Two things worth saying plainly.**

The worst case is at the **equator**, not at Soho where it was found. Soho's 0.06–0.32% was the
mildest of the four latitudes measured, and recording it as the magnitude — which
[100](100-choosing-the-metric-crs.md) did — understated it by nearly a factor of two.

And **the Philippines sits in the worst band.** At Manila's latitude a 500 m buffer is 497.6 m
north–south and 500.7 m east–west. On a 5 km scope that is 4,976 m against 5,006 m: a **31 m
spread**, and the circle is an ellipse.

## What was decided

**The audit is a script, not a gate.** `npm run audit:metres` re-measures and prints the table;
it exits 0 whatever it finds. Gating would require a threshold, and no threshold is defensible
yet: 0.5% is irrelevant for a street-network acquisition margin and arguably matters for a
500 m service radius a decision rests on. Deciding that is a product judgement and belongs in a
document, which is this one.

**Nothing is corrected.** Each site could project properly — `metric()` already exists and nine
widgets use it — but doing so would change every one of these outputs, which means re-pinning
the Validation Lab's parity for `buffer_point`, `buffer_area` and anything downstream of a
buffer. That is the right change and it is not a small one.

**What the audit changes immediately** is that the figure is now quotable. `buffer_point`'s
release note and the donut card both state their error; the other six sites can now state
theirs without anyone re-deriving it.

## What changed our minds

**The expectation was a scatter of unrelated approximations.** The audit was written to find
out which widgets were affected and by how much, with an assumption that the answers would
differ — a Turf buffer is not a flat constant, and neither is a great circle on a mean radius.

They are the same answer. That reframes the work: not seven sites to fix one at a time, but one
decision — whether this application relates metres to degrees through a projection or through a
constant — with seven call sites downstream of it.

**And the magnitude recorded in [100](100-choosing-the-metric-crs.md) was the best case, not the
typical one.** It came from Soho because Soho is where the accident happened. Four latitudes
cost one more line of script and nearly doubled the number.

## What this does not establish

**That 0.5% matters.** It is 2.5 m on a 500 m radius and 31 m on a 5 km one. Whether a
practitioner deciding who is within walking distance of a clinic cares is a question about use,
and nobody has used this outside two worked examples.

**That the eight sites are all of them.** They were found by grepping for three constants and
for Turf's `units:'meters'`. A conversion written some other way — a hard-coded degree offset, a
radius in an example's data — would not have been caught, and nothing proves the list is
closed.

**That projecting properly would be better in every case.** `metric()` refuses coordinates
outside its zone, so a study area spanning two zones cannot use it as these sites are used now.
Replacing a constant with a projection introduces a failure mode where there was none, and
[100](100-choosing-the-metric-crs.md)'s guard question is unresolved.
