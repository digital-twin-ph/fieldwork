# 215 · Domain packs: widgets with their worked examples

_Created 2026-11-14 · Updated 2026-11-14_

**Status:** asked — design and admission review, written before the code.

## The question

The practitioner, 2026-11-14, after two future case studies were recorded (road traffic injuries on a street network,
and genomic epidemiology): *"I am beginning to wonder revisiting the idea that even widgets can be packaged with their
worked examples this time since road traffic injuries or more generic specialized widget packages like street network
analytics, genomic epidemiology analytics."* Then, of Snow's walking-time catchments: *"So for John Snow isochrones, we
need the street network analytics pack if we move the currently street network related widgets to the SNA (street
network analytics) pack?"* And: *"From a DE perspective this is an important milestone in the conceptual framework for
FW"* ([105](105-five-directions.md), Above, 2026-11-14). Asked to build on [43](43-widget-packs.md), as a new
experiment.

So: **can a domain's widgets, worked examples and lab checks travel together as a pack, switched on where a project
needs it, without anything fetched while the application runs?**

## What exists

| | What it settled |
| --- | --- |
| [43](43-widget-packs.md), 2026-10-08 | Two kinds of pack: semantic (vocabulary, shapes, rules, contracts, examples) and code. Curated by this project, three reviews, withdrawal. **Corrected 2026-10-09:** a pack may ship widget code if installed at build time at a pinned commit; the rule forbids fetching while running, not installing. Worked examples are part of a pack |
| [49](49-catalog-in-the-interface.md), [127](127-examples-as-repositories.md) | Resources may be fetched, widget definitions never; examples live in their own repositories, pinned |
| [58](58-sea-level-widgets.md), [59](59-pattern-for-engineered-knowledge.md) | The one pack so far, sea-level rise: declaration only; the host implemented its widgets itself and vendored its vocabulary by hand |
| `widgets/packs.json` | The curated catalog: owners, reviews, admission states, `runtimeFetching: none` |
| `src/core.ts` | Every widget is a branch of one run function, 52 of them; a widget's definition, Inspector, dialog and manual are spread across `core.ts`, `app.ts`, `types.ts` and a module of its own |

What none of these asked: moving widgets that exist into a pack, switching a pack on per project, or shaping a pack
around a case study.

## The design

1. **A pack is built in, never fetched** (43's correction). A pack repository holds widget source, contracts, manual
   pages, worked examples and lab fixtures' exporters. Fieldwork's build takes each admitted pack at its pinned commit,
   checks the digests the catalog holds, type-checks and compiles it. The application fetches no pack while running.
2. **A pack is loaded when a project uses it.** Its code is a separate chunk of the build, loaded on first use, so a
   project that does not use genomic sequence readers does not pay for them.
3. **Switched on per project.** A project lists the packs it uses. The widget list shows a pack's widgets only where it
   is switched on; the widget catalog lists every pack and its widgets. Opening a project, a worked example or a shared
   file that holds a pack's widget switches the pack on, and says so.
   **A project declares its domains** (the practitioner, 2026-11-14: *"So projects that are not worked examples need to
   declare requirement for specialized widgets - they can name the domain -- earth observation, street network
   analytics, genomic epidemiology (for now)."*). A project's own record names each domain it needs, by name, and that
   declaration is what switches its pack on; a worked example declares its domains as any project does. The domains,
   for now: **Earth observation**, **Street network analytics**, **Genomic epidemiology**. A practitioner names a
   domain in the project's settings, or is asked to when adding a widget that belongs to one; a shared project carries
   the declaration, so whoever opens it knows what it needs before anything runs, and a domain this build does not hold
   is named, not silently dropped. The domains are a closed list, as a widget's group is, each defined once in the
   ontology, so a project cannot declare a domain no pack provides.
4. **A pack widget has a boundary.** Today a widget can reach anything in the application. A pack widget is written
   against one interface: its definition (title, group, ports), its parameters and their check, a run that takes its
   inputs and parameters and returns its value, its record of the run (receipt, facts, machined notes), its Inspector
   sentence, its configuration dialog, its manual page. What else it may call is listed, and nothing outside the list
   is reachable from a pack's source. Writing this interface is most of the work, and it is designed on the first pack
   before any widget moves.
5. **The record names the pack.** A run's receipt states the pack and its commit beside the widget and its release, so a
   reader can tell where a widget came from.
6. **The first pack is street network analytics.** Its widgets: Street network, Isochrone, Snap sites to the network,
   Reachable junctions, Travel time band, Reachable corridor, moved from the core, and kernel density along the network
   and betweenness, new, admitted on their own reviews. Its worked examples: Snow's *who lived within a walk of the
   pump?*, the only example any of the six is in today (Street network and Isochrone), and road traffic injuries, once
   a dataset is checked (TODO). Its lab checks travel with it.
7. **A move keeps the widget's type.** `network_input` stays `network_input`; it is built from the pack. A saved
   workflow holding it needs no migration, and a project holding it switches the pack on.

8. **Offline, as the rest of the application.** The practitioner, 2026-11-14: *"So fetching has to go with online
   offline workflow since fetch needs connection right?"* Two fetches, kept apart. A pack's **code** is never fetched
   while working: it is part of the build, and the service worker (`sw.js`) stores every file of the build, every
   chunk included, the first time the application is opened online, so an admitted pack works offline, on first use
   too; "loaded when used" is about memory, not the network. A pack's **data** (a street network, a crash table, a
   raster) is fetched as any source's is: once, with a connection, then kept on the device by digest. **The cost to
   watch:** each pack adds to that first download. Storing only the packs a project has switched on would keep it
   small, at the price of a connection the first time a pack is switched on; decided when a large pack (genomics, with
   a sequence reader) is designed, not before.

9. **A pack may carry its own engine.** The practitioner, 2026-11-14: *"Even ABM can be a pack or is it a kernel?"*
   Both, at two levels. The **kernel** is computation with no domain words, as Fieldwork's epi kernel is
   ([161](161-the-epi-kernel-one-table-many-exposures.md)): for an agent-based model, stepping agents week by week from
   a recorded seed, in homes and contacts. The **pack** is what gives it meaning: the widgets for a population, a
   natural history with its sourced rates, a run, and its weekly counts, with the Gaborone TB example, the lab check
   against Starsim, and later the 7-1-7 response simulation ([199](199-an-agent-based-model-in-the-browser.md)). Not
   decided: whether the engine sits in the pack, loaded only where the pack is used, or in the core kernel, where
   another pack could use it (spread along a street network; a response simulated step by step). Proposed: in the pack
   while it has one user, moved to the core when a second pack needs it. The ABM spike (TODO 29) comes first.

**Not in this experiment:** a pack from outside this project's curated owners; loading code while running; a pack for
genomic epidemiology (a second pack, after the first is tried); moving any widget besides the six.

## What is emerging: general field tools and specialized ones

The practitioner, 2026-11-14: *"There will be pros and cons but I think what's emerging is what are general field work
tools and what are specialized?"* The line exists in the data model and was never drawn: `widgets/classification.json`
classes a widget as standard (any domain) or domain (a pack), and all 50 active widgets are standard; the only domain
widgets ever recorded, sea-level rise's three, are retired.

A first sort, **proposed, not decided**, for the practitioner to judge:

| | Widgets |
| --- | --- |
| **General field tools** (about 29) | Tabular data, Point data, Polygon layer, Study area, Raster input; all six of Epidemiology; most of Summaries; Deduplicate records, Apply ruleset; Keep points inside the area, Calculate area, Measure distance, Area around a point, Sample a raster, Clip raster, Clip polygons, Reproject points; Map, Table, Chart |
| Street network analytics | Street network, Network isochrone, Travel time band, Reachable corridor, Reachable junctions, Snap to street network |
| Earth observation | Find satellite products, Search a satellite catalog, and the reading of satellite files inside Sample a raster (see below) |
| Geoprivacy | Move points in a donut, Aggregate points to H3 cells, Compare point sets, Mean center, Comparison map |
| Facility access | Find health facilities, Voronoi catchments (the observed stage, below, keeps both in the core) |
| Unclear | Georeferenced map image, Point grid, Fill interior gaps, Combined area, Convex hull |

Packs from the start, when they are built: syndromic surveillance ([206](206-syndromic-surveillance-aberration-detection.md)),
the agent-based model, genomic epidemiology, road traffic injuries.

What the sort shows, if it holds: the specialization is mostly spatial (about 13 of Spatial operations' 20) and none of
it is epidemiological, so the core reads as a field epidemiology tool with GIS depth in packs. What it costs: a learner
may not find a specialized tool (the observation below), widgets on the line will be argued over, and every boundary
drawn is one someone disagrees with. The widget count is recorded, not argued from.

## Another perspective: how much each widget is used, measured 2026-11-14

The practitioner: *"We have enough examples and enough widgets to say which widgets are most used (general tools) and
which ones are only exercised in very few examples. That's one perspective."* Measured over the 13 worked examples (the
two built in, read from their workflows; the 11 repositories, from their pinned projects) and their 66 workflows, for
the 50 active widgets:

| Examples using it | Widgets |
| --- | --- |
| 11–12 | Tabular data, Table, Map, Study area |
| 7–8 | Total within groups, Point data, Chart, Select rows by value, Apply ruleset, Relate a column |
| 4–5 | Join a table to the study area, Sample a raster, Two-by-two table, Cases by period |
| 2–3 | Rate, Append rows, Regression, Polygon layer, Study design, Find health facilities, Find satellite products, Search a satellite catalog, Georeferenced map image, Raster input |
| 1 | Measure distance, Clip polygons, Summarize points to polygons, Reproject points, Convex hull, Space-time scan, Street network, Network isochrone, Voronoi catchments, and the five geoprivacy widgets |
| 0 | Area around a point, Keep points inside the area, Clip raster, Deduplicate records, Fill interior gaps, Calculate area, Point grid, Combined area, Reachable corridor, Reachable junctions, Snap to street network, Travel time band |

Where it agrees with the sort above: the core of bringing data in, shaping tables, rules, maps, tables, charts and the
basic epidemiology is used widely, and the pack candidates sit at 0 to 2. Where it disagrees: tools a field team needs
anywhere (Calculate area, Keep points inside the area, Clip raster, Deduplicate records) are in no example, and parts of
the epidemiology (Regression, Rate, Study design, Space-time scan) in one to three. Usage measures what the examples
happened to teach, and they were chosen one at a time; one workflow, Snow's geoprivacy, puts five widgets at 1. So
usage confirms the core and finds widgets with no evidence; it does not by itself say what is specialized. Together with
judgement: a core used widely; packs of tools used rarely and belonging together; and general tools that need a worked
example, not a pack.

## Earth observation as a domain, 2026-11-14

The practitioner: *"Earth observation is perhaps another domain."* It has its own sources, its own standards (STAC
catalogs, satellite product formats and quality flags) and its own practice, the world of a colleague's EO Guide and
STAC Browser ([179](179-eo-and-stac-for-the-nyc-monitors.md)). Its widgets: Find satellite products and Search a
satellite catalog, used by New York's ozone and Brazil's dengue examples, and the reading of satellite files.

**The boundary cuts a widget.** Reading satellite files was its own widget until
[205](205-one-sampler-for-rasters.md) folded it into Sample a raster, which is general: a raster read at points or over
areas, used by four examples. As a pack, Earth observation would take the satellite reading back out, and Sample a
raster would stay in the core for rasters. A pack boundary drawn after widgets were merged for the practitioner's
convenience may have to undo the merge, or let a core widget offer more when a pack is switched on. Not decided which.
The population rasters (WorldPop, GRID3, GHS-POP) are modelled from Earth observation and are read as ordinary rasters,
by Raster input: in the core, whichever way the pack goes.

**The practitioner's lean, 2026-11-14:** *"I lean towards this -- let Sample a raster offer satellite reading only when
the EO pack is switched on."* Recorded as a lean, not a decision. What it adds to the design: **a pack may extend a core
widget**, not only add widgets of its own. Sample a raster would offer a second kind of source, satellite files, only
where the Earth observation pack is switched on; a workflow already reading satellite files would switch the pack on
when opened, as one holding a pack's widget does (point 3), so New York's and Brazil's examples keep working unchanged.
The interface (point 4) then needs a second part: the places in a core widget a pack may extend (here, a source kind
with its own settings, reading and record), named in the core widget and nowhere else, so a pack cannot reach into a
core widget the core did not open to it. The receipt names the pack that read the files.

## Are these the right domains, and the right boundaries? Open, 2026-11-14

The practitioner: *"The question is are these the right domains and domain boundaries?"* Not known yet. Found on
asking: the three are drawn on different axes. Earth observation is **a kind of data**, street network analytics **a
method**, genomic epidemiology **a field** (its data, sequences; its questions, transmission and lineage). Mixed axes
blur the edges: road traffic injuries is a question that uses network methods; facility access (Find health facilities,
catchments, travel time) is a question that could sit with networks or apart; syndromic surveillance is everyday field
epidemiology, so likely the core.

**A test, proposed:** a domain earns a pack when it brings what a general field team does not need, all three of its
own data and formats, its own standards and references to check against, and its own practice. Applied as a first
reading: Earth observation (satellite products; STAC; remote sensing) passes; street networks (graphs; OSM; transport
geography) pass, perhaps better named for networks and accessibility, holding travel time and catchments; genomic
epidemiology (sequences; Nextclade, Nextstrain; molecular epidemiology) passes; an agent-based model, as modelling and
simulation (agent populations; Starsim; modelling), passes; geoprivacy probably fails, as a concern every investigation
has, though one example uses it; syndromic surveillance fails, as core field epidemiology. Case studies (road traffic
injuries, MERS, New York's ozone) stay worked examples that declare the domains they use, which keeps the list short.

**How to find out:** apply candidate boundaries to the 13 examples there are, each declaring its domains, and record
the widgets that fit no domain or two, and the examples that need a domain for one widget: the observed stage, before
anything is built. The evidence is thin: Earth observation has two examples, street networks one, genomics none, so
the domains are mostly anticipated and the boundaries will move as examples arrive.

## Result of the observed stage, 2026-11-14

The practitioner: *"Let's add the result of this to 215."* The candidate boundaries applied to the 13 worked examples (the
two built in, read from their workflows; the 11 repositories, from their pinned projects), each example declaring the
domains its steps need. Street networks tried two ways: **narrow**, the six street widgets; **broad**, those and Voronoi
catchments and Find health facilities. Geoprivacy tried as a candidate, to see whether the test above holds. Satellite
reading counted where Sample a raster reads satellite files.

| Example | Workflows | Domains it would declare |
| --- | --- | --- |
| 1854 Cholera Outbreak in London | 6 | Street networks: Street network, Network isochrone, in 1 workflow. Broad: also Voronoi catchments, in a 2nd. Geoprivacy: all five widgets, in 1 workflow |
| New York ozone and child asthma | 6 | Earth observation: catalog, products and satellite reading, in 1 workflow |
| Dengue, Rio de Janeiro | 5 | Earth observation: the same three, in 3 workflows |
| Measles in Sierra Leone | 4 | Broad only: Find health facilities, 1 step |
| Sea-level rise at Manila's health facilities | 3 | Broad only: Find health facilities, in 3 workflows |
| Hagelloch, South London, Oswego, Nigeria, Salmonella, Rules on synthetic data, MERS, Population models | 2–9 each | none: core only |

What it found:

1. **Nine of the 13 examples need no domain.** The core carries most fieldwork as the examples practise it.
2. **Earth observation holds.** Its three parts always arrive together, in both examples that use it, and nowhere else.
   Sample a raster is the one widget in two places, core and Earth observation, as the practitioner's lean expects.
3. **The narrow street-network boundary holds; the broad one strains.** Broad, Sierra Leone and Manila would each declare
   a domain for one widget, Find health facilities, which finds where facilities are and does no network analysis; and
   Voronoi catchments is drawn on the plane, not the network. So both stay in the core, and the domain is street
   networks, narrow. Four of its six widgets are in no example; it has one, Snow's.
4. **Geoprivacy contradicts the test.** It failed the test as a concern every investigation has, yet in use it behaves
   like a pack: five widgets, always together, in one workflow of one example, nowhere else. Not settled; the next
   example that protects locations would show whether it is used piecemeal, as a core concern, or whole, as a pack.
5. **Genomic epidemiology and modelling have no example**, so nothing here tests them: they are anticipated domains.

Not established: that the boundaries fit examples not yet made; this stage tests the examples there are, which were
made one at a time, mostly before the question was asked.

## Admission review

D1: no new widget in this experiment. Six existing widgets move; the two new ones are admitted by their own reviews.

| Distinction | Enforced as |
| --- | --- |
| A pack's code is not fetched while the application runs | **hard stop**: packs are compiled into the build; the catalog's `runtimeFetching: none` is asserted, as now |
| A pack is admitted only from this project, at a pinned commit, after its reviews | **validation rule**: `validate:packs` refuses a pack whose digest, owner or review record does not match |
| Pack code is application code | **validation rule**: a pack's tests and worked examples run in the gate with the core's |
| Switched off hides a pack's widgets; it never removes or refuses them | **run-time check**: a project holding a pack's widget switches the pack on when opened, and says so |
| A project needing a specialized widget declares its domain | **validation rule**: a project holding a pack's widget without its domain declared is reported, and the declaration offered; a domain not in the closed list is refused |
| A domain is not a pack's internal name | **hard stop**: projects name domains from the ontology's list; which pack provides a domain is the catalog's, so a pack can be replaced without a project changing |
| A pack widget reaches only its interface | **validation rule**: a pack's source may import only the interface module; checked on every build |
| Curation reviews pack code; it does not isolate it | **limitation**: pack code runs with the application's own access to the workflow store and credentials, as 43 recorded |

## What it commits to, written before the result

- The interface, designed and written for the six street-network widgets, with each widget built through it and its
  existing tests passing unchanged.
- A browser test: Snow's isochrone workflow opens with the pack switched on and runs to the same catchments and counts as
  before the move; a blank project does not list the pack's widgets until it is switched on.
- The build refuses a pack source file that imports outside the interface.
- **Practitioner observation, which can come out badly:** with packs switched on per project, can the practitioner
  find a widget they need that their project has not switched on, without being told which pack holds it?

## What this does not establish

That packs make Fieldwork easier to learn: a shorter widget list may hide what a learner should find. That the interface
fits genomic epidemiology's widgets, which have not been designed. That a pack written by someone else would be safe:
admission stays curated.
