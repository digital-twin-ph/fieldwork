# Buffer study area

_Created 2026-11-20 · Updated 2026-11-21_

**A study area widened for acquiring data.** Streets, facilities or population just outside the district still
shape what happens inside it.

## What it does

It takes a study area and adds every place within the distance you set of its edge, outside it. The distance is
measured in metres on the ground, not in degrees. The wider area is passed on for acquiring data around the study
area; the area you report on does not change.

## What you connect

| Input | What it takes |
| --- | --- |
| **Study area** | the area to widen |

## How to use it

**Configure…** sets the **Buffer distance (metres)**, from 0 to 50,000, and nothing is written until **Apply**.

**Result** gives the size of the widened area at the last run.

## What it will not do

- **It will not change the reporting area.** Steps that count or rate within the district still use the district.
- **It will not follow roads or travel time.** The band is the same width all round.
- **It will not shrink an area.** A distance below 0 is refused.

## Where it is used

No worked example uses it today.
