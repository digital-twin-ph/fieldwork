# 155 · Discussions as the governance surface of a project

_Created 2026-10-31 · Updated 2026-10-31_

**Status:** asked — nothing is built. Opened as the companion to
[150](150-can-several-authors-collaborate-in-a-project-repository.md), which made a clash legible
and cannot make one rare.

## The task

The practitioner, 2026-10-31: *"after push we can also add to TODO to add the discussion feature
for projects — experiment 155, will it work in tandem with 150?"* And, settling what a discussion
is for, earlier the same day:

> So research discussions should have user exercised governance. For example always document
> decisions and free text can also have some structure the ways issues are described on GitHub.

And on why GitHub rather than something built here:

> But the fact that the discussion is hosted on GitHub is good enough. That is the joint public
> record of a collaboration like any open source project. This actually promotes open research.

## Does it work in tandem with 150? Yes, and the division is exact

They are not two takes on one problem. They solve adjacent halves and neither substitutes for the
other.

| | 150 | 155 |
| --- | --- | --- |
| decides | what a clash **is** | how a clash is **avoided** |
| mechanism | one file per workflow, `workflows/*.json -merge` | claiming work, and recording decisions |
| when it acts | after two people have edited | before either starts |
| failure it accepts | a conflict a person must settle by choosing one graph | an agreement nobody honours |

150's own conclusion is what creates the need: there is no merge base in a browser, so a
same-workflow collision **cannot** be merged, only refused. That is correct and it is a last
resort. **150 made conflicts honest; it cannot make them rare.** Making them rare is social, and
this is where that happens.

So: in tandem, and 150 should be read first — its governance section names the two files that do
not divide (`project.json` and `assets/manifest.json`, both touched by ADDING a workflow or an
asset), which is precisely what a discussion has to coordinate.

## What a discussion is for here, and what it is not

- **Claiming a workflow before editing it.** The cheap preventive for the one collision git cannot
  settle.
- **Recording a decision.** The template already ships `.github/DISCUSSION_TEMPLATE/decisions.yml`
  — a form rather than free text, on the practitioner's reasoning that an issue is legible because
  its shape is agreed.
- **Not review.** That is a pull request.
- **Not the work.** That is the repository.

## What has to be found out before anything is built

- **Whether writing is reachable at all from a browser.** Reading discussions was measured on
  2026-10-31 as REST-reachable; the WRITE path is believed to be GraphQL only, with no REST
  create. Unverified, and it decides the shape of the client. A fine-grained token with
  Discussions: Read and write now exists for this, held outside the repository.
- **Whether the CORS wall stands where it stood for DHIS2 and geoBoundaries.** `api.github.com`
  answered `access-control-allow-origin: *` for the Contents API, measured for 150. The GraphQL
  endpoint has not been checked and is a different host path.
- **What a category is, and who makes it.** The decision form binds only to a category with the
  slug `decisions`, and enabling Discussions is an account-level action. Like repository creation
  in 150, that stays a human act in a browser rather than something this application performs.
- **Whether a decision can come back into the repository.** The asymmetry 150 names: a repository
  clones and a discussion does not, so the artifact travels and the conversation stays behind.
  Exporting decisions into the repo is the obvious closing move and may be the whole of what
  Fieldwork should do here.

## What this does not establish

- **That a discussion prevents anything.** It is an agreement, and an agreement nobody honours
  fails silently — which is strictly worse than a git conflict, because a conflict announces
  itself. Nothing here can enforce a claim, and a design that pretended to would be claiming an
  authority this application does not have over a repository it does not own.
- **That GitHub is the right host.** It is the decided one, on the practitioner's reasoning about
  open research. A project repository on another forge has no equivalent, and this experiment does
  not say what such a project should do.
- **That any of this is wanted by a second author.** 150 ran a two-author merge test with one
  person playing both; nobody has yet collaborated on a Fieldwork project who did not write
  Fieldwork. That is a field question, not a design one.
- **Anything about scale.** Two authors and eight workflows is the only case measured. A project
  with thirty workflows and six authors may find the file boundary too coarse or too fine, and
  nothing here predicts which.

## What would close it

A project's discussions are reachable from the application — at minimum readable beside the
project they belong to, so an author meets the claim on a workflow before opening it — and a
decision recorded in the structured form can be brought back into the repository, so the joint
record survives the forge. Whether Fieldwork should POST a discussion at all is the open design
question, and the answer may be no: reading and exporting might be the whole of the useful
surface, with writing left to the place that already does it well.
