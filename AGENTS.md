# Fieldwork semantic development checkpoints

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
