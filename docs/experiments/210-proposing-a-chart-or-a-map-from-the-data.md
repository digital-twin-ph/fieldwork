# 210 · Proposing a chart or a map from what the data declare

_Created 2026-11-12 · Updated 2026-11-12_

**Status:** asked. The practitioner, 2026-11-12, after asking whether Vega-Lite could detect incoming data and propose chart
types: *"Let's make that an experiment. We really want FW to shine and impress with its intelligent data visualizations."*
Map types are included the same day, and the first exercises are Hagelloch and John Snow.

## The question

Given what a table or a layer declares about its columns, can Fieldwork propose the few charts and maps that suit it,
each with one sentence saying why, so that the practitioner chooses and learns the reason?

## What exists, measured on the two examples, 2026-11-12

Nine workflows (Hagelloch's five, John Snow's four) draw 22 figures: 9 charts and 13 maps.

| Form drawn today | Where | How it was chosen |
| --- | --- | --- |
| Bars of a count by category | Snow's deaths by catchment | the default |
| Epidemic curve | both, four times | the table's shape: a case series |
| Bars by weekday | Hagelloch | a case series by day of the week |
| Panels, one per value | Hagelloch's cases by age and gender | set by hand, `panelsBy` |
| Transmission tree | Hagelloch's who infected whom | set by hand, `figure: tree` |
| Estimate with interval | elsewhere (Brazil) | the table's declaration, automatically |
| Points, polygons, links, a replay, a sheet under the cases | the 13 maps | set by hand |

So Chart already chooses some forms from declarations, and most are chosen by a person who knew the form existed.

**What the two steps can draw, read from the code the same day.** Chart: bars, dots or a line, panels, estimates with
their intervals, and the transmission tree. Map: points, polygons, links, a raster, an image under the layers, symbols
per layer, and a classed choropleth, quantile or equal-interval, with its legend in both renderers. **Not yet drawn by
either:** stacked bars, a histogram, a population pyramid, a scatter, a marked date on a curve, proportional symbols,
and a density surface. Each would extend Chart or Map, not add a widget.

## The order, Hagelloch and John Snow first

1. **Population pyramid** in Chart: Hagelloch's cases by age and gender, drawn today as two panels.
2. **Proportional symbols** in Map: deaths per house on Snow's map, the figure Snow drew as bars; cases per house in
   Hagelloch.
3. **A marked date** in Chart: Snow's epidemic curve with 8 September 1854, the day the pump handle came off.
4. **Stacked epidemic curve** in Chart: Hagelloch's by school class.
5. **Histogram and scatter** in Chart: Hagelloch's serial intervals; Snow's deaths against walking distance to the pump.
6. **The proposer**: the rules above, with their sentences, offered in Chart's and Map's Configure…, measured on every
   worked example's figures.

Each form is built where an example needs it, so it is exercised the day it lands; the proposer comes last, when there
are forms to propose.

## Proposed: rules from declarations, each with its reason

A proposal reads the table's declared kinds (a date, a number with its unit, a category, a key holding numbers, an
estimate with its interval, shares that add to one), or a layer's geometry and what its values measure. No model and no
AI: the rule and its sentence are the teaching. The practitioner picks; nothing is drawn without a pick.

| The data declare | Proposed | Because |
| --- | --- | --- |
| a date and a count | epidemic curve; cumulative curve | a count over time |
| a date and a category | stacked epidemic curve | when, and of which kind |
| a category and a count | bars, largest first | comparing amounts |
| a number, one per record | histogram | how the values spread |
| age bands by sex | population pyramid | two distributions back to back |
| a number by group | box or dot plot | spread within each group |
| two numbers per record | scatter | whether one moves with the other |
| an estimate with its interval | points with whiskers | an estimate is not a bar from zero |
| shares that add to one | stacked bar | parts of a whole |
| a case and its source | transmission tree | who infected whom |
| a weekday and a week | calendar heatmap | a weekly rhythm |

| The layer is | Proposed | Because |
| --- | --- | --- |
| points, each a case | dots; density surface | where cases are, and where they crowd |
| points carrying a count | proportional symbols | a count belongs to a place, not an area |
| areas carrying a rate or a share | choropleth, classed | a rate is comparable across areas of any size |
| areas carrying a count | proportional symbols at their centres; never a choropleth | a big area looks like a big count |
| a change between two times | diverging choropleth | above and below no change |
| links between places or cases | lines | from where to where |
| a series of days | the day-by-day replay | how it unfolded |

**A rule that refuses is part of the design:** a raw count on a choropleth is not proposed, and the sentence says why.

## By the question being asked, as well as the data

The practitioner, 2026-11-12, offered a reference: the figure list of *Making Data Visual* (Danyel Fisher and Miriah
Meyer, O'Reilly, 2018; https://makingdatavisual.github.io/figurelist.html), 30 figures in Vega and Vega-Lite. It groups
them by the question a reader asks, not by mark: *How is a value distributed?* (histograms, a box plot, density plots),
*How do groups differ?* (bars, paired bars, a heatmap), relationships over time (a line, stacked areas), *How are objects
related in a network or hierarchy?* (node-link, adjacency matrix, tree, treemap), *Where are objects located?* (a
choropleth, a dot map), and several views together (small multiples, a scatterplot matrix, linked views).

That answers what this record says it cannot do: the rules above see what the data are, not what is asked. **Decided**
(the practitioner, the same day: *"Yes to 210"*): the proposer asks the question first, in those words where they fit a public health reader, and offers the forms that
answer it for these data, each with its reason. Two of the book's questions are not among its figures and are this
application's own: *How sure is the estimate?* (an interval) and *Who infected whom?* (a transmission tree).

**A question leads to others.** The practitioner, the same day: *"Chart and Map design is like our workflow design.
Workflows answer questions. Same with Charts and Maps. So who infected whom is a valid question in an outbreak. From it
arise other related questions like how, when, context and if data are available for those other questions we can create
workflows for those too."* Recorded as said. What the examples already show of it:

| Question | Related questions | Data that answer them | Where |
| --- | --- | --- | --- |
| Who infected whom? (Hagelloch) | When? Where? Among whom? | prodrome dates (serial intervals), houses, school class | the chains workflow; the house map; class not yet drawn |
| Who infected whom? (MERS) | How? Where? When? | the contacts' place of exposure, the hospitals table, onset dates | two workflows; the hospitals not yet mapped |

What it asks of the proposer: from a question answered, name the related questions, and say for each whether the data
at hand declare what it needs (a date, a place, a setting, a group), so a figure that answers one question points to the
next one the data can answer, and says plainly which they cannot.

**John Snow, one question per workflow.** The practitioner, the same day: *"In fact we need to revisit John Snow so we
can break up the complex workflows to each answer a questions."* Its four workflows answered eleven questions between
them, the epidemic curve three times over. Chosen from options, seven workflows:

| Workflow | Question | From |
| --- | --- | --- |
| `snow-deaths` | Where were the deaths? Snow's map of deaths and pumps, and where the pumps were measured (UTM 30N) | Voronoi's spot map and pump table |
| `snow-curve` | When did people die? | the epidemic curve, once |
| `snow-voronoi` | Which pump was nearest each death? | Voronoi, without the rest |
| `snow-isochrone` | Who lived within a walk of the Broad Street pump? | the isochrones, without the rest |
| `snow-extent` | How far did the outbreak spread? | the extent, without the curve |
| `snow-geoprivacy` | Can the death locations be shared without revealing homes? | unchanged for now, see below |

The four kept keep their addresses, so links and saved copies still open them.

**Geoprivacy goes to a worked example of its own.** The practitioner, the same day, mid-split: *"We may have to spin off
the geoprivacy workflows on their own as geoprivacy worked examples which would include map encryption which we haven't
ported yet to FW."* So the moved points and the H3 cells are not split inside the John Snow project; `snow-geoprivacy`
stays as it is until the spin-off, last in the project's order, and `snow-cells` was not made. A TODO item holds the
spin-off and the port.

**Terms.** The site states no licence, and says only that it is open source. It is cited and learnt from here; no
specification is copied from it.

## First exercises: Hagelloch and John Snow

| Example | Figure proposed and not drawn today | From |
| --- | --- | --- |
| Hagelloch | population pyramid of the cases by age and gender | the people workflow's table |
| Hagelloch | epidemic curve stacked by school class, or by generation | the case series and the tree |
| Hagelloch | histogram of serial intervals | the chains workflow |
| Hagelloch | cases per household as proportional symbols | the houses |
| John Snow | deaths per house as proportional symbols, as Snow drew them as bars | the deaths |
| John Snow | deaths against walking distance to the Broad Street pump | the isochrones |
| John Snow | the epidemic curve marked on 8 September 1854, when the pump handle came off | the case series |

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A proposal is not a choice: nothing is drawn until the practitioner picks | Run-time: the picker sets the step's settings |
| A count is not a rate: no count on a choropleth | Validation rule, in the proposer and its tests |
| A share is not a count | Limitation, said in the caption |

## Validation it commits to

- Unit: each rule, positive and negative, on declared tables and layers.
- Measured: on the worked examples' figures, how many would the rules have proposed first, second, or not at all.
- Draco's published design constraints (BSD-3) as a second opinion on each rule, where they speak to it.
- Readable: palettes from the application's own, contrast WCAG AA, text at 14 px or more.
- **Practitioner observation, before it is known:** whether the reason sentence is read, and whether it changes the pick.

## What this does not establish

That a proposed form is the right one for a question: the rules see what the data are, not what is being asked. That
Draco's constraints suit public health figures; they were written for general analysis.
