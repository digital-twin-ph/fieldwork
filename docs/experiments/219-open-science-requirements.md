# 219 · What open science asks of a Fieldwork project

_Created 2026-11-16 · Updated 2026-11-16_

**Status:** asked. Nothing built. Interconnected with [202](202-one-record-several-products.md) (the products and their
plan), [218](218-an-identity-you-carry.md) (who did what) and [150](150-can-several-authors-collaborate-in-a-project-repository.md)
(several authors in a repository).

## The question

The practitioner, 2026-11-16, while identity was being spiked for a publication's audit trail: *"There are also Open
Science requirements we need to think of so another interconnected experiment."* Earlier, 2026-11-15: identity
*"perhaps using Open Science as a platform (e.g., identities - ORCID, GitHub, etc.)"*.

What does a project need to hold, and to export, so that its products can be published as open science: findable,
attributable, reusable and checkable by someone else? Which of those Fieldwork already records, and which are gaps?

## What the record already says, found 2026-11-16

The practitioner: *"Look up open science first in existing experiments."* The phrase itself appears nowhere before
218, but the work does:

| Found | Where | What it gives this experiment |
| --- | --- | --- |
| The open-science item, 2026-11-11: *"Also after MERS let's build the Open Science components or FW and layer the collaborative project design to support it's principles."* It asks for an experiment record with the survey of what exists, before any widget, and leaves open which statement of principles | [TODO](../../TODO.md) item 27 | This is that record. The item orders it after MERS (item 8) |
| Pre-registration: *"A section written before the run is a prediction"*, the difference between pre-registration and confirmation bias, measurable because Fieldwork knows when a workflow ran | [133](133-the-planning-stage-and-historical-notes.md), [141](141-organising-snows-notes.md), from [27](27-workflow-learning-and-gamification.md)'s *What do I predict?* | 202's planning notes, dated before the run, are the pre-registration; a plan part the run contradicts changes or says why not |
| Omission made computable: *"a workflow whose answer appears in no section"* | 119, 141 | Reconciled with the practitioner's 2026-11-16 ruling in 202: reported as *not in the plan*, never flagged |
| Degrees of reproducibility: retained, pinned, versioned, dated snapshot, seeded, live; a figure takes its weakest input's grade, capped where its receipt does not name the application version that drew it | [53](53-reproducible-maps.md), [54](54-degrees-of-reproducibility.md), [55](55-embedded-provenance.md) | The reproducibility half, audited; the grading specified and unbuilt |
| **Receipt**, the per-step record of what ran and what it used, whose familiar name is *audit trail* | [glossary](../glossary.md) | A note's versions (218) are not receipts and need their own term |
| Zenodo answers a browser (`access-control-allow-origin: *`) | [47](47-sea-level-pack.md), [170](170-a-table-fetched-at-open.md), [180](180-brazil-dengue-and-area-exposures.md) | Measured as a source of data only; depositing a release there is untested |
| `CITATION.cff` in the example repositories | [189](189-a-measles-line-list-made-safe-to-teach-with.md), [195](195-the-sea-level-example-reports-a-sea-level.md) | Citation per example; not yet of Fieldwork's own products |
| Open evidence only, the closed paper's gap stated | the project's rule for every search | Already practised for what a project cites |

## What exists

| Requirement | Today | Where |
| --- | --- | --- |
| Who contributed what, in a shared vocabulary | CRediT's fourteen roles, on a project's contributions | `src/contributions.ts`, 141 |
| Who an author is | A GitHub login, declared or attested; ORCID and the signed identity file in the spike | `src/identity.ts`, 218 |
| What each input is, and its terms | Each input's provenance: source, licence, attribution, citation | `src/input-provenance.ts`, 140, 152 |
| Works cited, resolvable | Citations with DOIs, checked for gaps | 152 |
| Data a reader can reach | The Data availability part of the publication; worked examples pinned by commit and digest | 202, `widgets/examples.json` |
| The analysis, rerunnable | Workflows as files; a project exported as a repository | 150 |
| Versions of what was written | Planned for every note (202); signed versions in the spike | 218 |

## Candidate requirements, to check against open sources before any is adopted

Each is a question for this experiment, not a decision.

| Candidate | What it would ask of a project | Connects to |
| --- | --- | --- |
| **FAIR** (Findable, Accessible, Interoperable, Reusable) | A persistent identifier and machine-readable metadata for the project and its data | 150's repository; the ontology |
| **Persistent identifiers** for people, organisations, outputs | ORCID iD, ROR ID for affiliation, a DOI for the released project (for example by depositing a repository release in an open archive) | 218; the publication's affiliations |
| **A licence for everything released** | The project's own text and workflows under an open licence, kept apart from each input's terms, which it cannot change | input provenance |
| **Data availability, honest about limits** | What can be shared, what cannot and why: NYC counts and the Sierra Leone file are cases already | 202 Data availability |
| **A plan registered before the analysis** | The planning notes, dated and versioned, show what was planned before the results were seen | 202's planning notes; 218's versions |
| **Software and method citation** | Fieldwork and each widget cited at the version that ran | `NoteWidget` versions; release notes |
| **A packaged, self-describing release** | One archive holding data, workflows, products and their metadata (RO-Crate is one candidate form) | 150 |
| **Open access to what is cited** | Open copies preferred, the gap said where only a closed one exists | the open-evidence rule |
| **Ethics and privacy** | Nothing identifying is released; what was removed and why is recorded | 189's line list made safe to teach with |

## In the ontology, 2026-11-16

The practitioner: *"Let us also remember to represent this in the FW ontology using open science ontologies if they even
exist."* What the Fieldwork ontology already uses: PROV-O, Dublin Core terms, DCAT, the Data Quality Vocabulary, EARL,
SKOS, QUDT and GeoSPARQL; CRediT roles by NISO's IRIs (`https://credit.niso.org/contributor-roles/`, in
`ontology/fieldwork.ttl` and `src/contributions.ts`).

A first search, the same day, found no single open-science ontology that is published and usable, and several that
cover parts:

| Vocabulary | Covers | State found |
| --- | --- | --- |
| [Research Object suite](https://arxiv.org/pdf/1401.4307) (OWL) | Packaging data, methods and their metadata as one object; workflow provenance | Published 2014; current use not checked |
| [SPAR ontologies](https://force11.org/post/spar-ontologies-new-website/) (FaBiO, CiTO, PRO and others) | Publications, citations and their purpose, roles in publishing | Maintained, served from w3id.org |
| [Contributor Role Ontology](https://obofoundry.org/ontology/cro) (OBO, CC BY) and a [CRediT ontology](https://w3id.org/credit/ontology) | Contributor roles, CRediT extended | Published; which to align `contributions.ts` with is open |
| [OGC Open Science Ontology](https://defs-dev.opengis.net/bblocks-meta-register/orgs/ogc/registers/openscience/bblocks/ogc.osc.ontology.openscience) | Reproducible scientific workflows | A draft, v0.1, with no schema, context or shapes published |
| Preregistration, registered reports | — | No OWL vocabulary found; the [CASRAI dictionary](https://casrai.org/wp/?p=1206) defines the terms in prose |

**The rule this follows** is the project's own: prefer reuse when the meaning is the same, and do not equate similar
labels with identical semantics. So each Fieldwork term (a note's version, a plan, a shell, a signed contribution) is
compared with the nearest term in these, and aligned only where the meaning holds. Where none holds, as for a plan
dated before the run, the term is Fieldwork's own and says which vocabulary came closest.

**To check before aligning anything:** schema.org and RO-Crate's use of it, and the FAIR Data Point metadata, which
this search did not reach; whether the Research Object suite is still maintained.

## The checklist the person completes, planned 2026-11-16

Steps outside Fieldwork, each the person's to take; Fieldwork shows which are done and how it knows, and refuses
nothing for the ones that are not.

| Step | What the person does | How Fieldwork knows |
| --- | --- | --- |
| 1. A GitHub account | Create one | The login, attested by a token with no permissions or by step 6 |
| 2. An ORCID iD | Register at orcid.org; set the record public | Declared; the check digit verified offline |
| 3. Affiliation | Choose the organisation | Its ROR ID, from ROR's registry |
| 4. The identity file | Make it in Fieldwork; keep a copy somewhere safe | Opened in this tab |
| 5. ORCID and GitHub linked | List the GitHub profile on the ORCID record, and the iD on the GitHub profile | Shown as links for a reader to follow |
| 6. The signing key published | Add the identity file's public key to GitHub as an SSH signing key | The key read back from GitHub matches (218, step 7) |
| 7. A token for the project repository | A fine-grained GitHub token, that repository only, no workflows | In the credentials file |
| 8. A Zenodo account and token | Sign in to Zenodo (it accepts GitHub or ORCID); make a token | In the credentials file |
| 9. A licence for your own work | Choose one for the text and workflows; inputs keep their own terms | Recorded with the project |

## Zenodo: storage, a DOI, and what it does not take

What Zenodo is for here: depositing a **release** of a project (its workflows, notes, products and the data it may
share) so it has a DOI and a fixed version that can be cited. From Zenodo's documentation as recalled, **to be checked
against its current pages before anything is built:**

| | |
| --- | --- |
| A DOI | Minted when a deposit is published; a DOI can be reserved before publishing, to print in the product first |
| Versions | A new version of a record gets its own DOI, with one DOI standing for all versions |
| Permanent | A published record's files cannot be changed or withdrawn by the depositor, so publishing is irreversible, and Fieldwork would ask before it, every time |
| A sandbox | A separate test service, where deposits are thrown away; where this is tried first |
| GitHub releases | Zenodo can archive each release of a linked GitHub repository with a DOI, set up on Zenodo's site, with no token in Fieldwork |
| A token | Scopes for depositing and for publishing, chosen separately |

**What never goes to Zenodo:** data whose terms do not allow it. The NYC counts are not redistributed, and the Sierra
Leone FETP file is never in any repository; a deposit carries what the example's own repository carries, the remote
specification and digest, not the data. Zenodo answering a browser was measured for reading record files only;
depositing from a browser is unmeasured.

**Open:** whether a deposit from Fieldwork is needed at all, when Zenodo's GitHub link archives a project repository's
releases without one.

## Open questions

1. Which open-science frameworks to check against: the UNESCO Recommendation on Open Science (2021) and the FAIR
   principles are the obvious first two; which others matter to field epidemiology programmes and their ministries?
2. Whether a sit rep or a surveillance report owes the same as a paper, or less.
3. Which of these a trainee should meet as practice (a plan dated before analysis; a data availability statement) and
   which Fieldwork should simply record for them.
4. Where the line falls between what Fieldwork records and what an archive or journal does at deposit.

## What it commits to, written before the result

An inventory of each candidate against open sources, with what Fieldwork records today and the gap, for South London
as the first case: could it be deposited as open science today, and what would stop it?

**The observation that can come out badly:** whether open-science requirements read to a trainee as practice that
builds judgement, or as forms to fill.

## What it does not establish

Anything yet. It records the question and the inventory the work starts from.
