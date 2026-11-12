# 207 · An ontology for data issues

_Created 2026-11-12 · Updated 2026-11-12_

**Status:** tried. The practitioner, 2026-11-12: *"There should be an ontology for data issues"*, after *"Those columns
should map to ontology and show up in N3 receipts"*, of the warning table Apply ruleset shows and of 7-1-7's columns.

## The question

Can every data issue Fieldwork finds, wherever it is found, be one kind of thing with one closed list of kinds, stated
in the run's N3 receipt in those terms and shown on screen under the same labels?

## What exists, checked against the code on 2026-11-12

| Where found | Kinds | Code | In the N3 receipt |
| --- | --- | --- | --- |
| Apply ruleset, through the reasoner | value absent, value unreadable | `authoredDataIssues` | yes: `fw:ReadingProblem`, a `dqv:QualityMeasurement` (`ontology/fieldwork.ttl`) |
| Apply ruleset, evaluated directly | the same; division by zero; conflicting conclusions | `evaluateAuthored` | **no**: the receipt held start and end times only, prefixed "undefined" |
| Table input, Data quality | repeated key, missing key, unreadable value, undescribed column, unconfirmed description, dictionary mismatch | `TableFinding` | **no** |
| Join to area | missing data key, unmatched data key, unmatched boundary, duplicate boundary key, ambiguous data key, multiple data rows | `area-join.ts` | yes: `fw:JoinFinding`, with a code as text |
| Rulesets' declarations; travel time | declaration not stated; site unreachable; routed off the network | `RunAlert` | **no** |

Three models of one idea, and three places with none. On screen the same issue is "No value" in the Inspector and
`missing` in code; the warning table's headings were a retired example's ("Site", "Distance").

## Decided

**One module, `ontology/fieldwork.ttl`.** `fw:DataIssue`, a `dqv:QualityMeasurement`: a count of the records one step
found with one kind of issue, of how many it considered. `fw:ReadingProblem` and `fw:JoinFinding` become subclasses,
their IRIs unchanged. Each kind is a `fw:DataIssueKind`, with a label, a definition and the DQV dimension it measures.
DQV is W3C's (open, CC BY 4.0); it names no dimensions, so these are Fieldwork's, as `fw:completeness` and
`fw:readability` already are.

| Kind | Label | Dimension |
| --- | --- | --- |
| `fw:ValueAbsent` | No value | completeness |
| `fw:ValueUnreadable` | Not the declared kind | readability |
| `fw:KeyAbsent` | No key | completeness |
| `fw:KeyRepeated` | Key repeated | uniqueness |
| `fw:ColumnUndescribed` | Column not described | documentation |
| `fw:DescriptionUnconfirmed` | Description not confirmed | documentation |
| `fw:DictionaryMismatch` | Disagrees with the data dictionary | consistency |
| `fw:DeclarationAbsent` | Not declared | documentation |
| `fw:DivisionByZero` | Divided by zero | computability |
| `fw:ConclusionsConflict` | Rules disagree | consistency |
| `fw:SiteUnreachable` | No result | coverage |
| `fw:RoutedOffNetwork` | Routed off the network | coverage |
| the six join codes | as Join to area names them | consistency or completeness |

**Each issue in the receipt:** `<step> fw:dataIssue [ a fw:DataIssue; fw:issueKind …; fw:issueColumn "…"; fw:affectedRecordCount n;
fw:consideredRecordCount m; rdfs:comment "what it means" ]`, written by one function every step calls.

**On screen, the ontology's labels.** The warning dialog's *What happened* is the kind's label; its other columns are
named for what they hold.

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| An issue is not an error: the result stands, and says which part is about an absence | Limitation, in each kind's definition |
| A value absent is not a value unreadable | Run-time: counted as two kinds |
| Every kind a step can report is declared | Validation: a unit test reads each kind the code emits from the ontology |

## Validation it commits to

- Unit: each kind the code can emit is declared in the module with a label, a definition and a dimension; a receipt
  from each emitting step parses and carries its issues.
- Browser: the warning dialog shows the ontology's labels.
- **Practitioner observation, before it is known:** whether *What happened* reads the same in the dialog as in the N3
  & evidence tab.

## Built 2026-11-12

- `ontology/fieldwork.ttl`: `fw:DataIssue` and fifteen kinds, the twelve above and the Data quality inspector's
  three (the practitioner, the same day: *"we have data quality inspector that should be a target for knowledge
  representation"*): *Field missing* and *Empty*, each narrower than *No value*, and *Beyond 1.5×IQR*, a value to look at
  and not an error. `fw:ReadingProblem` and `fw:JoinFinding` are subclasses.
- `src/data-issues.ts`: the labels and `issueFacts`, one writer. `tests/data-issues.test.mjs` reads every kind the
  code can report from the module, label and dimension included.
- **Receipts:** Apply ruleset on both paths (its reading problems are also data issues; a directly evaluated step now
  states its bindings, each record's values read and computed, divisions by zero and conflicts); Table input, its
  findings and each column's profile, through the inspector's own `profileColumn`. On the MERS line list: *No key in
  dt_onset: 27 of 162 rows*, *Empty* in dt_onset 27 of 162, and seven columns not described.
- **On screen:** the warning dialog's *What happened* and the inspector's problems lead with the kind's label; the
  inspector's sentence on why nothing is offered to fill a gap went, as design commentary.

**Moved and restated the same day.** The practitioner, 2026-11-12: *"Data issues are upstream problems and should be
represented in the FW ontology."* Two changes, both chosen by the practitioner from three:

| Before | After |
| --- | --- |
| A module of its own, `data-issues.ttl` | In `ontology/fieldwork.ttl`, the FW ontology |
| An issue hung off the step that found it (`<step> fw:dataIssue …`) | An issue is about the data: `<data> dqv:hasQualityMeasurement <issue>`, `<issue> dqv:computedOn <data>`, and the step only `prov:wasGeneratedBy` |
| A kind was a SKOS concept with its own `fw:inDimension` | A kind is also the DQV metric measured (`dqv:isMeasurementOf`), in DQV's own `dqv:inDimension` |

**The data an issue is about** is where what the step read came in: back along its one input, through each step with one
input, to the step that brought it in. A step with two inputs stops the walk. Found while doing it: Table input names
its table `…:table:<id>` and every step after it names the same table `…:output:<id>`, with nothing joining them; Table
input now states `prov:alternateOf` between the two. On the MERS line list, all five issues, three from Table input and
two from 7-1-7, are now about one IRI, the line list's.

**Not yet:** Join to area's six codes as kinds (its `fw:JoinFinding` is a subclass, its codes still text); declaration
gaps and travel-time sites in a receipt; the Data quality inspector reading its findings back from the receipt.

## What this does not establish

That these dimensions are the right ones, or match any standard's: DQV leaves dimensions to its users, and ISO/IEC
25012, which names some, is not openly available and was not read. That every issue Fieldwork could find is listed:
only what the code reports today.
