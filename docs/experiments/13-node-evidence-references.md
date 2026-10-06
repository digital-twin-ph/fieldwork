# Node evidence references and provenance

Date: October 6, 2026. Status: implemented locally; validation record below. This experiment extends Fieldwork's audit trail with PDF and URL references attached to individual workflow nodes. The motivating example is an annual census cited as the source of input data, alongside publications or notebook sections supporting processing methods and assumptions.

## Practitioner exercise

1. Select an Input data node, then choose **Manage references** in its Inspector.
2. Choose **Upload PDF** or **Web URL**. Give the reference a title and select what it supports: data source, method, assumption/parameter, or background context.
3. Record the author or organization, publication date/year, page/table/section and a note describing how this source supports the node. For example: “Population denominator from Table 4, page 27.” The census example is illustrative; no census document is bundled or asserted as a source of the current synthetic data.
4. Choose **Save reference**. The editor confirms persistence and lists the reference. PDF entries show local availability and a Download PDF action. URLs open on explicit selection.
5. Repeat on a processing node to document its method or parameter basis. References are also supported on output nodes.
6. Run the workflow. **N3 & evidence** includes a reference-provenance section, and **Run receipt** contains the executed nodes' reference snapshots, provenance graph and attached PDF bytes.
7. Choose **Export** to transfer the workflow and its PDFs. Import that bundle into a fresh browser, disconnect the network and retrieve the PDF again.
8. Edit or remove a reference, then inspect the previous run receipt before rerunning. It must retain the earlier title, locator and PDF hash. Undo must restore a removed reference and its local file access.

The development question is whether practitioners can trace each input and method to the specific supporting passage and distinguish cited documentation from computed or inferred evidence. The automated checks below verify software behavior; they do not establish practitioner comprehension or source quality.

## A48 Separate citation metadata from PDF storage

Each node has an optional `references` array outside its computational parameters. Existing workflow schema `fieldwork/workflow/1`, source data and saved workspaces remain compatible. A reference records its kind, stable ID, title, support role, author/organization text, publication label, locator, support note and creation/modification timestamps.

PDF bytes reside in the browser's `fieldwork-evidence-v1` IndexedDB database, keyed by SHA-256. Workflow JSON in localStorage contains the filename, byte length, media type and digest, keeping binary files out of the small synchronous workflow store. Files remain local; there is no upload to a server. Both stores are unencrypted and subject to browser storage limits and clearing.

Limits are 5 MB per PDF, 10 MB of distinct referenced PDFs per workflow, 20 references per node and 100 per workflow. Files are checked for size and the PDF header; this is not a full PDF parser or a document-content validation step. A digest identifies exact bytes and detects a mismatch during import/download/export. It does not authenticate the publisher or establish that a claim is correct.

Reference metadata edits keep the same reference ID and original creation time. Replacing the file computes a new digest. Removal unlinks the reference without deleting its bytes, preserving Undo, other nodes/workspaces that share the file and earlier run exports. Unreferenced file garbage collection and long-term storage management are deferred; this prototype has no append-only central archive or multi-user attribution system.

## A49 Make references portable and explicit when missing

The existing Export action returns ordinary workflow JSON when no PDFs are referenced. With PDFs, it returns `fieldwork/bundle/1`: a workflow plus unique PDF attachments encoded as base64. The bundle importer accepts at most 20 MB, validates workflow metadata, requires exactly the referenced attachments, and checks each file's size, header and digest before one atomic IndexedDB write. Only then is the workflow applied and saved. Storage failure preserves the previous workflow; a file written before a later metadata-save failure may remain as an unreferenced local blob.

Plain workflows with PDF metadata can still be imported. If their bytes are absent, the editor explicitly reports the missing file and offers reattachment through Edit reference. Download and portable export fail with a recovery message rather than claiming to include a missing attachment. Reattaching the original yields the same hash.

Run receipts retain their existing `fieldwork/run/1` schema and add reference snapshots, provenance N3 and, when needed, PDF attachments from that run's workflow snapshot. Receipts are downloadable audit artifacts, not workflow-import bundles. They do not change when the current editor subsequently changes a citation. Previous runs survive as exported artifacts; the application still retains only its current completed run in memory.

URLs are HTTP/HTTPS links with no embedded credentials. They are not fetched, mirrored, checked for availability or cached for offline access. Recording time is not represented as a retrieval date. A locator, edition/version and support note help identify the intended passage; upload the PDF when preserving exact document bytes matters.

## A50 Describe documentation separately from executable premises

The graph uses [PROV-O](https://www.w3.org/TR/prov-o/) for run activities, node plans and generated entities, and [Dublin Core metadata](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/) for citation links and descriptive fields. Existing GeoSPARQL facts remain unchanged.

| Relationship | Representation |
| --- | --- |
| Node configuration snapshot | A run-scoped `prov:Plan` identified by the node ID |
| Executed step and its configuration | `prov:Activity` linked to that plan by `fw:workflowNode` |
| Step output and downstream consumption | `prov:wasGeneratedBy` and `prov:used`, following executed workflow edges |
| Supporting document reference | Plan `dcterms:references` a run-scoped `fw:EvidenceReference` / `prov:Entity` |
| Source identity | `dcterms:source` points to a URL or `urn:sha256:` PDF identifier |
| Bibliographic description | `dcterms:title`, `dc:creator`, `dcterms:issued`, `dcterms:description`, creation/modification dates |
| Citation purpose and passage | `fw:referenceRole` and `fw:locator` |

Citation metadata is supplied by the workflow author. A reference does not imply that the PDF was parsed, that its values were imported, or that its claims were verified. Document contents are not inserted into N3 rule premises. In particular, the graph does not assert that a cited PDF was consumed as computational data solely because it was attached. The support note records that relationship as the author's explanation.

Run-scoped citation identities include both node and reference IDs, preserving context when the same file supports different steps. Only executed nodes appear in the run's evidence/provenance section. The full workflow snapshot may also contain disconnected nodes. Existing Old Naledi source links and pinned dataset provenance remain in place; these references supplement them.

The field names and roles are declared in [the Fieldwork ontology](../../ontology/fieldwork.ttl). Implementation is divided among [evidence contracts and graph generation](../../src/evidence.ts), [local storage and portability](../../src/evidence-storage.ts), and [the reference editor](../../src/evidence-ui.ts).

## A51 Preserve explicit save and recovery behavior

The editor uses **Save reference**, confirms successful persistence, and keeps a failed draft open beside a prominent sticky error message. Closing or clearing a dirty draft requires an explicit discard choice. The node Inspector lists saved citations. Reference changes mark the run stale; rerunning creates a new provenance snapshot. Removing a reference is reversible through the canvas Undo action.

This follows the earlier pushpin evaluation finding: an action must visibly distinguish saved data, an editable draft and an unsuccessful save. It also avoids implying that local PDF availability guarantees permanent storage or source validity.

## Evaluation and validation

The added unit checks cover metadata/URL validation, file identity and limits, graph scope and escaping, snapshot retention, separation from rule inputs, and rejection of tampered or incomplete bundles. The added browser scenarios cover both input and processing nodes, actual EYE parsing of the provenance graph, byte-exact downloads, fresh-browser transfer, offline reopening, edit/remove/Undo, previous-run receipts, short-screen errors, failed persistence/retry, unsaved-draft recovery and missing files.

The full `npm run check` gate passed locally on October 6, 2026: strict TypeScript checks, the production build, all 38 unit tests and all 26 Chromium scenarios (2.9 minutes for the browser suite). This includes five new unit tests and five new browser scenarios for references. No practitioner sessions, Firefox/WebKit validation or remote CI execution are claimed.

In a later practitioner session, ask the participant to identify the exact census edition/table, explain which processing decision a reference supports, distinguish an available PDF from a URL-only citation, and identify which citation version belongs to an earlier run. Record incorrect attribution or an inference that “attached” means “verified” as a design failure requiring revision.
