# Experiment 41: an accompanying Validation Lab

Date: October 7, 2026. Status: design specification and measured feasibility
check. No lab exists, no notebook has run, and nothing in this prototype has
been validated against a reference implementation yet.

## What it is, and what it must not become

The Validation Lab is a JupyterLite site whose notebooks **independently
recompute** Fieldwork's spatial results in Python and report agreement or
disagreement with a stated tolerance. It is a comparator, in the role
[prior art](../prior-art.md) assigns to QGIS for clipping and area, with better
reproducibility: the notebook is the recorded procedure, so a reviewer repeats
it instead of trusting a screenshot.

Independence is the entire value, so three things are prohibited by design.
The lab does not import or re-execute Fieldwork's JavaScript. The application
does not call, embed or depend on the lab. Neither side shares a numerical
module with the other. A notebook that reuses the implementation under test
measures nothing. For the same reason the lab reads **only** what a fixture
declares: it recomputes from the recorded parameters, not from Fieldwork's
intermediate values.

The lab also cannot establish scientific validity. Agreement with `pyproj`
shows that two implementations of the same transformation agree; it says nothing
about whether the declared CRS was right, whether the coordinates were recorded
correctly, or whether the operation suits a public-health question. Those remain
separate judgements, as the [N3 output evaluation](11-n3-output-evaluation.md)
and each widget's own note record.

## Measured feasibility

The relevant risk is Pyodide, not Python. This repository already warns, in the
[isochrone research note](../research/john-snow-isochrones.md), that an upstream
JupyterLite template declaring OSMnx "does not demonstrate successful execution
in Pyodide or offline in a browser."

Checked against the Pyodide package index on October 7, 2026 (distribution
314.0.7), the stack the first checks need is present:

| Package | Pyodide version | Use in the lab |
| --- | --- | --- |
| `pyproj` | 3.7.2 | Reference coordinate transformations and geodesic area |
| `shapely` | 2.1.2 | Polygon predicates, clipping, Voronoi comparison |
| `rasterio` | 1.5.0 | Reference raster masking; carries its own GDAL build |
| `geopandas` | 1.1.3 | Fixture loading and tabular comparison |
| `fiona` | 1.10.1 | Vector format reading |
| `numpy` | 2.4.6 | Array comparison and tolerances |
| `pandas` | 3.0.2 | Result tables |
| `h3` | 4.4.2 | Reference hexagonal indexing |
| `scipy` | 1.18.0 | Voronoi construction |

The GDAL command-line utilities are absent; `rasterio` supplies the raster
capability the first checks need, so no utility invocation is assumed.

Three consequences follow and must be stated in every result:

- **A package index is not a demonstrated run.** The lab's first notebook does
  nothing but import each package and print its version from inside the kernel.
  Self-reported versions are the evidence; this table is only a reason to try.
- **`h3` 4.4.2 is not `h3-js` 4.5.0.** The versions differ, so identical cell
  indexing must be verified and recorded, never assumed from the shared major
  version.
- **`pyproj` needs no transformation grid for WGS84 UTM**, which matches the
  WGS84-only bound in [experiment 40](40-reprojection-primitives.md). Any future
  datum-shift comparison needs PROJ grid data, and the lab must not download it
  silently; an unavailable grid is an explicit error, not an approximation.

## The fixture boundary

Data crosses in one direction only: Fieldwork exports, the lab reads.

| Requirement | Rule |
| --- | --- |
| Fixture content | An exported run receipt, GeoJSON or GeoTIFF, carrying the operation's declared parameters and its SHA-256 |
| Identity | The notebook records the fixture's hash and fails if it does not match the hash it was given |
| Recomputation | From declared parameters only; Fieldwork's own outputs are the comparison target, never an input to the computation |
| Versions | The notebook reports the Pyodide distribution and every package version it used |
| Tolerance | Stated before the comparison runs, with its unit, not chosen after seeing the result |
| Disagreement | Published with both values and the suspected cause; a mismatch is a finding, not something to retune the tolerance around |

## First three checks

| Order | Fieldwork operation | Reference | Expectation |
| --- | --- | --- | --- |
| 1 | Reproject input (UTM metres to CRS84) | `pyproj.Transformer` from `EPSG:326nn`/`EPSG:327nn` to `OGC:CRS84` | Agreement well below a millimetre. This closes the task experiment 40 names as open: its unit tests assert UTM definitional invariants but establish no agreement with PROJ or GDAL |
| 2 | Clip raster, all-touched with outer margin | `rasterio.mask.mask` with `all_touched=True` | Agreement on the included cell set and retained values. The outer margin has **no** `rasterio` equivalent, so it must be modelled as an explicit extra dilation and compared as such, not assumed equivalent |
| 3 | Calculate area | `pyproj.Geod(ellps='WGS84').geometry_area_perimeter` | **Disagreement is expected.** Fieldwork records `Turf 7.3.5 spherical polygon area; mean Earth radius 6371008.8 m`, while `Geod` is ellipsoidal. The gap is a property of the declared method, not a defect; the lab should quantify it for each worked example and that figure belongs in the widget note and [experiment 02](02-area-computation-and-resource-scope.md) |

Check 3 is deliberately placed early because it is the one expected to differ.
A lab that only confirms agreement has not been tested as a lab. Quantifying a
known methodological difference, and carrying the number back into the
documentation, is the behavior to establish before harder cases.

Later candidates, in rough order of difficulty: haversine facility distances;
unweighted mean centre in a projected CRS; H3 aggregation against Python `h3`;
Voronoi catchments against `scipy.spatial.Voronoi` with explicit tie and
boundary handling; and network isochrones, which are hardest because the
reachability and corridor-buffer semantics are Fieldwork's own and have no
direct reference equivalent. A check that has no reference implementation should
be recorded as unvalidatable here rather than compared against a reimplementation
written for the occasion.

## Where the lab lives

Decided: a **separate repository beside this one** in the same workspace,
`validation-lab`, on branch `main`. The independence rule is the one most likely
to erode under convenience, and a repository boundary makes it structural rather
than conventional. It also keeps a Python and Pyodide dependency and licence
story out of the Apache-2.0 browser bundle, and guarantees the notebooks never
reach `build/asset-manifest.json` or the Pages staging manifest.

The design notes and findings stay **here**, in this repository, beside the
widgets they concern. The lab holds notebooks, fixtures and machine-readable
results, and its README points back to this record rather than restating it.

Fixtures are produced on this side, which is the direction the boundary allows:
`scripts/export-validation-fixture.mjs` writes a fixture and its SHA-256 from
the built module under test. The fixture carries the declared parameters and the
application's output, and deliberately omits intermediate values, so a notebook
cannot accidentally recompute from Fieldwork's own working.

One practical note for anyone adding notebooks: an `nbstripout` clean filter is
configured for `.ipynb` in this workspace, so notebook **outputs do not survive
a commit**. Evidence therefore belongs in a committed `results/*.json` report,
not in a notebook's rendered output. The lab is structured that way.

## Result: check 01, reprojection

Run on October 8, 2026 against fixture `reproject-utm35s-001`, nine points
spanning UTM zone 35 south:

| Field | Value |
| --- | --- |
| Reference | `pyproj` 3.8.0 with PROJ 9.8.1 |
| Tolerance, stated before running | 1 mm, measured as geodesic separation on the ground |
| Maximum separation observed | 6.70 × 10⁻⁵ m |
| Verdict | Agrees |
| Runtime | CPython 3.13.3 on macOS arm64 — **not** Pyodide |

The residual is explained rather than merely tolerated. Fieldwork stores
coordinates rounded to nine decimal places, and at this fixture's latitudes
rounding alone can displace a point by up to about 7.8 × 10⁻⁵ m once longitude
and latitude are combined. The observed 6.70 × 10⁻⁵ m sits below that bound, so
the agreement is limited by the documented rounding, not by the projection. The
notebook computes that bound and compares it, rather than leaving the reader to
judge.

This closes the task [experiment 40](40-reprojection-primitives.md) recorded as
open: that widget's unit tests assert UTM definitional invariants, and this is
the first independent comparison against a reference implementation.

Two limits keep the acceptance criteria below from being satisfied in full. The
check ran in CPython rather than a browser kernel, so criterion 1 is unmet for
Pyodide and the figures above should be reproduced there before the lab is
described as browser-validated. And agreement over one zone is not agreement
over the projection: zone 35 south is the only zone covered, and no datum other
than WGS84 is in scope.

## Result: check 02, all-touched clipping

Run on October 8, 2026 against fixture `clip-all-touched-001`: a synthetic
24 × 18 CRS84 grid with a deterministic value ramp, and a concave cutline whose
vertices are deliberately placed on pixel corners, since pixel-edge alignment is
where rasterization conventions diverge.

| Case | Reference included | Fieldwork included | Verdict |
| --- | --- | --- | --- |
| Cell center inside, margin 0 | 132 | 132 | **Agrees**: same window, same cells, same retained values |
| All touched, margin 0 | 146 | 181 | **Differs**: 35 cells, all Fieldwork-only |
| All touched, margin 1 | 195 (modelled) | 228 | **Differs**: 61 cells; the margin has no `rasterio` equivalent |

Reference: `rasterio` 1.5.2 with GDAL 3.12.2, `shapely` 2.2.0 with GEOS 3.14.1,
in CPython 3.13.3 on macOS arm64 — again not Pyodide.

The disagreement is one-sided and explained. Every one of the 35 differing cells
is adjacent to a cutline coordinate lying exactly on a pixel boundary, and none
is included by GDAL but missed by Fieldwork. The cause is this prototype's own
definition: the inclusion test measures distance to a **closed** cell rectangle,
so an edge running along the border between two cells touches both, whereas
GDAL's ALL_TOUCHED assigns it to one. A second, smaller cause is the 1e-9 pixel
pad `clipRaster` applies to the All touched window, which widens the crop by a
whole cell when the cutline is exactly aligned.

The margin-1 case cannot be compared directly, because `rasterio` has no margin
parameter. The check models it as a one-pixel binary dilation with a 3 × 3
square element and **says so in the report**, so the 61-cell difference is read
as the gap between Fieldwork's Euclidean margin and that discrete model, not as
a validated disagreement. A margin defined as a Euclidean distance from a cell
rectangle has no exact discrete analogue, which is itself worth knowing.

This result is the lab working as intended. It confirms one path exactly, finds
a real difference on another, attributes it to a specific line of this
prototype's own code, and reports a third comparison as inconclusive by
construction rather than forcing a verdict. The finding is recorded beside the
operation in [experiment 29](29-raster-edge-inclusion.md). The committed
`clip_raster` release file is left unchanged, because this is a finding about
existing behavior and not a change to it; a convention change would need a new
release with a migration note.

## Result: check 03, ontology structure and meaning

Run on October 8, 2026 over the six files in `ontology/`, 917 triples, using
Konclude through `rdf-reasoner-konclude` 0.7.2 — the same OWL 2 DL reasoner
[Ontosphere](https://github.com/ThHanke/ontosphere) runs in the browser, driven
headlessly so the result is reproducible without a UI.

| Aspect | Result |
| --- | --- |
| Structure | Clean where checkable: no fieldwork term is used in a domain, range or subClassOf without being declared. Annotation coverage is partial |
| Meaning | Consistent with no unsatisfiable classes, but the vocabulary holds zero disjointness, cardinality or restriction axioms, so that verdict is unfalsifiable; classification infers no new subsumption |
| Conflation probe | Typing one individual as two terms the audit says must stay distinct leaves the graph consistent; adding one `owl:disjointWith` per pair makes it inconsistent |

This check differs from the others in kind: it examines a vocabulary rather than
recomputing a number, and its reference is a reasoner rather than a second
implementation. The findings, the recommendation and the tooling assessment are
written up separately in
[experiment 42](42-ontology-structure-and-meaning.md), beside the audit
procedure they concern. The reasoner is LGPL-3.0 and about 25 MB, so it is a
dependency of the lab and deliberately not of this repository.

## Acceptance criteria

Before any Fieldwork document claims the lab validates an operation:

1. The kernel notebook has run and self-reported its package versions.
2. The fixture hash in the notebook matches the exported artifact.
3. The tolerance was stated before the comparison.
4. Agreements and disagreements are both published, with values.
5. The notebook reruns in a clean kernel with the same result.
6. The widget's registry release and this note record what the check does and
   does not cover.

Until all six hold for a given operation, its validation status is unchanged.
Running a notebook is not validation, and neither is a green comparison whose
tolerance was selected afterwards.
