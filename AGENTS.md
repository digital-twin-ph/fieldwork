# Fieldwork semantic development checkpoints

_Created 2026-10-07 · Updated 2026-10-07_

Before adding a primitive, perform the semantic admission review in
[the ontology audit procedure](docs/ontology-audit.md): define the term and its
limits, distinguish the widget/plan/activity/data roles, compare existing
primitives and reusable vocabularies, and specify typed ports, units/CRS,
provenance, missing-data policies and validation evidence. Prefer reuse when
the operation has the same meaning. Do not equate similar labels with identical
semantics or treat a declaration as an implemented capability.

After adding or changing a worked example, audit the connected workflow and its
actual N3/evidence outputs against those contracts. Include positive and negative
semantic regression checks, inspect the N3 & evidence UI, and update the registry,
terminology, audit record and README where needed. Keep proposed learning/game
concepts separate from implemented scientific operations. Report unclosed gaps
explicitly; passing syntax or SHACL structure alone is not scientific validation.

Preserve existing user work and unrelated working-tree changes. These local audit
checkpoints do not authorize publication or sending messages to other people.

## Versioning and release notes

The application version has one source of truth: the root `package.json` version,
with the matching root entry in `package-lock.json`. The header displays this
value. Use `npm version <major.minor.patch> --no-git-tag-version` to change both
files together; do not maintain a second hard-coded version in HTML or CSS.

During this prototype's `0.x` series, increase MINOR for a new user-visible
capability or a meaningful change to workflow behavior, and PATCH for fixes and
small interface improvements. Reserve MAJOR for an intentionally incompatible
workflow, package, or public semantic contract, with a documented migration.
Internal work may accumulate under the current version; decide the next version
when preparing a release. Never imply that changing the number publishes the app.

Update `CHANGELOG.md` for each version with the date or "In development", the
user-visible changes, migration effects, and validation limits. Set the release
date in the release commit after local checks pass; if publication fails, correct
the notes before retrying. Claim publication only after both deployment and live
assets are verified. Keep the README's usage and release links consistent. The app
version is distinct from independent widget release versions, ontology versions,
workflow/package schema identifiers, and saved project revision counters; changing
one does not automatically change the others. Validate the header version on
desktop and a narrow screen before releasing.
