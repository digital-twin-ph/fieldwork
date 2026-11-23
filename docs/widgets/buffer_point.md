# Area around a point

_Created 2026-11-20 · Updated 2026-11-20_

**A study area drawn around one place.** Everything within a stated distance of a well, a clinic or a city centre.

## What it does

It takes one named point and draws a circle of the radius you set around it, as a polygon of 128 sides, 32 to each
quarter. That polygon becomes a study area, which any step that takes a study area can use.

## What you connect

| Input | What it takes |
| --- | --- |
| **Points** | a point layer that holds the point, named by its name or its id |

## How to use it

**Configure…** sets two things, and nothing is written until **Apply**:

| Setting | What it decides |
| --- | --- |
| **Point in ‹layer‰ that defines the area** | chosen from the points the connected layer carries. One point arriving is the choice; several, and the list opens on *Choose a point*. A layer that holds no records of its own and has not run offers none, and the name is typed in until it has |
| **Radius in metres** | above 0 and up to 5,000 |

**Show me how it works**, in the dialog, draws a made-up well and the area around it, step by step, with the radius
you have set.

**Result** gives the size of the area drawn at the last run.

## What it will not do

- **It will not draw around several points.** One point, named; the others are ignored.
- **It will not follow roads or terrain.** The distance is straight, on the ground; for travel time, use a travel-time
  step.
- **It will not draw more than 5,000 metres.** For a wider area, draw it under Study area.

## Where it is used

No worked example uses it today.
