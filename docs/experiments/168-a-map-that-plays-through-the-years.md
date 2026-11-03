# 168 · A map that plays through the years

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** tried — built, and Nigeria's third workflow plays 20 birth cohorts. Chromium and WebKit, from an empty canvas.

## The task

The practitioner, 2026-11-03: *"One thing I want to improve is the Nigeria immunization interactive map playback
through the years."* Nothing played. Each Nigeria map shows one year: the third workflow selects one year column, or the
change from 2005 to 2024, before the join. TODO recorded the year slider as "designed and not built".

## The design

1. **The join keeps every frame.** `join_table_to_area` gains an optional **frame column**, a key column whose values
   are the frames, such as `measure` holding `dtp1_2005` to `dtp1_2024`. Each part then carries one value per frame,
   and a repeated key is reported only where it repeats within a frame. The part's single `value` is the last frame, so
   every consumer that reads one value works unchanged.
2. **The interactive map plays them.** Where the parts carry frames, the map shows a frame control: a slider, Play,
   Pause and a step each way, with the pace chosen. The popup gives the part's value in the frame shown.
3. **One key for every frame.** Classes are computed over every value in every frame, so a part darker in one frame
   than another really is higher. Classes recomputed per frame hide the trend the animation exists to show.
4. **Frames named as the data names them.** The frame label is the value in the file, `dtp1_2014`, with a caption the
   practitioner writes, such as "Birth cohort", because these values are by birth cohort and not by calendar year.
5. **The static figure is unchanged** and draws the last frame, so downloads and the write-up stay single images.

**The rule from the point reveal applies:** the control plays only while every part is in view, so no frame looks
complete while hiding places. The practitioner, 2026-10-25: *"We only need the playback for maps where the zoom level
has all the data."* Out of view, it says so and offers to fit.

**Its name.** "Playback" alone already names two things, the build replay and the point reveal. This is the frame
control, and the interface says "Play through the frames".

## Design audit

This changes two widgets and adds none.

- **D2.** Nothing plays frames on a polygon map. The point reveal, designed for case dates, is not built either.
- **D3, distinctions and how each is enforced:**
  - *A frame is not a year.* The caption is the practitioner's, and the frame label is the data's. A limitation.
  - *A trend needs one key.* Classes over all frames: built into the renderer, so not optional.
  - *A frame partly out of view is not the whole picture.* Play is withheld until every part is in view. A run-time
    check in the interface.
- **D10.** Nigeria's third workflow becomes the playing map.

## What this does not establish

- That a reader reads change from an animation better than from a map of the change. The change map stays.
- Campaign markers on the frame scale, which are later and need WHO's terms respected.
- Frames on the static figure, or exported as an animation.
