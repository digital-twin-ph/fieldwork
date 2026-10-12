# 102 · Widget names and worked examples

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** asked — the principle is the practitioner's, the audit against it is done, and
nothing is renamed. A rename is a breaking change to saved workflows and the scope is a decision
this document exists to put in front of someone.

## The question asked

Raised by the practitioner, about the sea-level widgets: *no widget should be name-attached to a
worked example. Widgets should be worked example agnostic.*

A widget is the versioned contract; a worked example is one arrangement of widgets telling one
story. A name that encodes the story makes the contract smaller than it is: a practitioner
wanting to assign points to their nearest reference station should not have to reach for
something called sea-level rise, and one counting cases by neighbourhood should not have to
reach for a widget called `places`.

## How it was tried

By checking the principle against all 51 widgets rather than the three it was raised about.

**The three `slr_*` widgets are not what the principle is aimed at, or not only that.** They are
classified `domain`, not `standard`: `widgets/classification.json` records that *"a domain widget
maps to a pack namespace and belongs to that pack"*, and their ontology terms are
`widget-pack-sea-level-rise/ns#` IRIs, not `fw:` ones. They are attached to a **pack**, which is
a deliberate design, and the pack is not a worked example.

**Eleven standard widgets are attached to a worked example**, which is the principle's actual
reach:

| Widget | Title | Attached to |
| --- | --- | --- |
| `alert` | Heat alert | the heat demo |
| `centers` | Cooling centers | the heat demo |
| `places` | Neighborhoods | the heat demo |
| `policy` | Outreach criteria | the heat demo |
| `nearest` | Nearest center | the heat demo — "center" is a cooling centre |
| `access` | Facility access | Old Naledi |
| `access_policy` | Access review | Old Naledi |
| `facilities` | Select nearby facilities | Old Naledi |
| `facility_audit` | Evidence register | Old Naledi |
| **`xpert`** | Diagnostic evidence | Old Naledi — and it is a **product name**, GeneXpert |
| `samples` | Sample locations | Old Naledi's generated grid |

**And the refactor has already been done twice.** `places` and `centers` both carry
`migrationFrom` adapters into `observations`, so a worked-example name has already been replaced
by a general one, with a migration, in this codebase. The principle and the mechanism are both
established; what is missing is having applied them consistently.

## How generic the sea-level three actually are

Worth separating, because "rename it" is not one answer for all three.

| Widget | What it does | Generic? |
| --- | --- | --- |
| `slr_site_assignment` | Assigns each point its nearest site from a reference layer, reports the distance, refuses a site absent from the extract | **Fully.** Nearest-site assignment with a keyed join. Nothing in the operation is about sea level |
| `slr_extract_import` | Declares a long-format keyed extract: dataset IRI, version, baseline period, units, three citations | **Mostly.** The shape is general; the required keys (`scenario`, `basis`, `family`, `year`, `quantile`) and the three obligatory citations are AR6's |
| `slr_threshold_comparison` | Compares a projected value with a point's elevation, refusing any elevation not measured from the baseline sea surface | **No.** The datum refusal is real domain knowledge: a change from a baseline sea surface and a height on a geodetic datum are not commensurable, and the widget exists partly to say so |

So the principle lands hardest on `slr_site_assignment`, which is a general capability wearing a
domain name, and barely at all on `slr_threshold_comparison`, whose domain is the point.

## What renaming costs

Not an argument against it — a statement of what the change is.

| | |
| --- | --- |
| **Saved workflows** | `type` is persisted. A rename needs a `migrationFrom` adapter, as `observations`, `chart_output`, `map_output`, `table_output`, `facilities` and `find_health_facilities` already have |
| **Widget identity** | `urn:fieldwork:widget:<nodeType>`. A new name is a new widget, so the old one is superseded rather than edited, and release files are immutable |
| **Parity evidence** | `widgets/parity.json` keys on the widget IRI. Nineteen widgets have evidence; `access`, `facilities`, `nearest`, `samples` and the three `slr_*` are among the thirteen that do not, so renaming those costs nothing in evidence — and renaming a checked one means re-pointing it |
| **Ontology** | `fw:` terms and the pack IRIs are per-widget. The `slr_*` mappings point at a pack namespace this repository does not own |
| **Compositions** | pinned members name a `nodeType`. `compute_walking_catchment` pins four, none of them on this list |

The cheapest order is therefore: rename the unchecked, example-named widgets first, because the
only cost is the migration adapter.

## What was decided

**Nothing yet, deliberately.** Three scopes are available and they are not the same decision:

1. **The three `slr_*` only**, as asked. Smallest, and it leaves `xpert` — a product name — in
   place, which is harder to defend than anything in the sea-level pack.
2. **Every example-attached standard widget**, eleven of them. Consistent with the principle as
   stated, a breaking change for eleven node types, and it needs a general name per widget that
   is not merely vaguer: `nearest` → nearest what, from which layer?
3. **The principle written down and enforced on new widgets**, with the eleven as recorded debt
   and renamed as touched — which is how `ontology.emits` and the experiment-document standard
   were applied, and the only approach in this project that has actually worked.

The third is what the project's own history suggests, and it is not obviously right here: a name
is a public contract, and a debt list of eleven misleading names is a different thing from a
debt list of eleven missing declarations.

## What this does not establish

**That the general names are obvious.** `xpert` → `graded_evidence`? `nearest` →
`nearest_point`? `alert` → `declared_condition`? Each is a naming decision with a worse failure
mode than the current one: a name so general it says nothing. The audit found the problem; it
does not supply the answers.

**That `domain` classification is the right home for the sea-level three.** It may be exactly
right — a pack is how a domain ships without the host learning its vocabulary — or the
classification may be doing the work a better name would do. Nothing here tests that.

**And nothing about whether this has misled anybody.** No practitioner has used this application
outside the worked examples, so the cost of the names is inferred from what they say, not
observed.
