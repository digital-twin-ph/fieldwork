# Open science inventory

_Created 2026-11-17 · Updated 2026-11-17_

A running list of the open science features a Fieldwork project needs, and where each stands. The practitioner,
2026-11-16: *"So by now we have begun to address a few Open Science items - ORCID, ROR. We can keep a running
inventory of the Open Science features needed."* Update a row whenever its feature is touched, with the date.

**Status:** **Built** works in the application today; **Partial** exists but does not yet reach the person or the
output; **Not built**; **Policy** is a rule the project keeps rather than a feature.

## People and organisations

| Item | Standard | Status | Where it stands | Evidence |
| --- | --- | --- | --- | --- |
| A person's identifier | ORCID iD | **Built** | In the identity file, checked by its check digit, looked up on ORCID on request. Signed into each note version and, by **This is me**, into the person's project membership. **Not** on the publication's byline yet | `src/identity-file.ts`, [218](../experiments/218-an-identity-you-carry.md), [150](../experiments/150-can-several-authors-collaborate-in-a-project-repository.md) |
| An organisation's identifier | ROR ID | **Built** 2026-11-16 | Affiliations in the identity file, found on ROR by name or checked by checksum, signed into the membership. The publication's affiliations are still typed text | `src/affiliations-ui.ts`, [150](../experiments/150-can-several-authors-collaborate-in-a-project-repository.md) |
| Who is in a project, and in what role | W3C ORG (`org:Membership`) | **Built** 2026-11-16 | Project roles (lead author, co-author, reviewer) in `project.json`, mapped to GitHub repository roles | `fw:ProjectMembership`, `src/project-roles.ts` |
| Who did what | NISO CRediT | **Partial** | `src/contributions.ts` proposes roles from the record and lists the ones it cannot evidence. Nothing in the application imports it, so nobody sees it | `src/contributions.ts` |
| That a note is its author's | Signature with the author's key, key published on GitHub | **Built** | Each version of an authored note signed and checked offline | [218](../experiments/218-an-identity-you-carry.md) |
| Byline and affiliations drawn from the members | ORCID, ROR | **Not built** | The publication's authors and affiliations are typed | `src/publication.ts` |

## The work and its record

| Item | Standard | Status | Where it stands | Evidence |
| --- | --- | --- | --- | --- |
| A project as a repository | git, one file per workflow | **Built** | `fieldwork-project-template`; Save to the repository as one commit; Get the latest; Load the project | [150](../experiments/150-can-several-authors-collaborate-in-a-project-repository.md) |
| Every step's provenance | W3C PROV-O | **Built** | Run receipts and evidence for each workflow step | `docs/audits/ontology-audit.md` |
| Independent recomputation | Validation Lab | **Partial** | 31 of 40 computing widgets checked (count of 2026-11-16) | [validation](validation.md) |
| The vocabulary, published | OWL, SHACL | **Built** | Read-only view at digital-twin-ph.github.io/fieldwork-ontology | `ontology/` |
| What each column means | Data dictionaries, column metadata | **Built** | Described by the practitioner; source metadata pre-fills | [211](../experiments/211-the-measurement-scale-of-a-column.md) |
| Worked examples as their own repositories | Pinned by digest | **Built** | Eleven example repositories, each with its terms | `widgets/examples.json` |
| Sources cited by DOI | DOI | **Built** | Citations keep a DOI and are matched by it | `src/references.ts` |
| Data availability statement | Journal practice | **Built** | A part of the publication the author writes | `src/publication.ts` |
| Decisions recorded in the open | GitHub Discussions | **Partial** | Discussions listed and posted from the project. A decision does not come back into the project | [150](../experiments/150-can-several-authors-collaborate-in-a-project-repository.md) |

## Licences, citation and persistence

| Item | Standard | Status | Where it stands | Evidence |
| --- | --- | --- | --- | --- |
| A licence for a project | SPDX identifier | **Not built** | The template carries none on purpose; Fieldwork asks for none. Until one is added, a repository is all rights reserved | template README |
| Terms of third-party data | NOTICE file | **Partial** | Recorded per worked example; a user's project has the template's empty `NOTICE.txt` and no prompt | `widgets/examples.json` |
| A project's persistent identifier | DOI through DataCite, by Zenodo deposit | **Not built** | The Zenodo community exists; a deposit is the practitioner's to approve | zenodo.org/communities/fieldwork |
| How to cite a project | `CITATION.cff` | **Not built** | Neither a project repository nor Fieldwork itself carries one | — |
| Fieldwork's own licence | Apache 2.0 | **Built** | `LICENSE` at the repository root | `LICENSE` |
| Open copies of evidence | — | **Policy** | Closed papers are not cited where an open copy exists; the gap is stated otherwise | — |

## Not yet considered

Listed so a gap is not mistaken for a decision: registering a protocol before the analysis (for example on OSF), a
FAIR assessment of a published project, and how a project cites the version of Fieldwork that ran it.
