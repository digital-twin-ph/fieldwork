# 170 · A table fetched when the example opens

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** tried — built on Table input and used by the NYC example, Chromium.

## The task

The NYC child asthma example (Lian et al., Zenodo 10.5281/zenodo.22757330) rests on daily emergency department counts
from NYC DOHMH's EpiQuery. The authors' CC BY 4.0 covers only their own materials; the counts "remain subject to each
custodian's applicable terms", and NYC.gov's terms reserve all rights. Read 2026-11-03.

The practitioner, 2026-11-03: *"we can do NYC asthma just download data at open time."*

## What a table does today, and why it cannot be used

`table_input` stores the table it read inside the workflow. A project file, and so an example repository, carries every
row. Publishing NYC that way republishes the counts.

## The design

**A remote source, kept as a spec.** The same rule as imported tiles (experiment 163): *"we keep specs not the asset."*

| Kept in the project | Kept on the device |
| --- | --- |
| URL, the file inside an archive, the expected digests and bytes, a citation, the read settings | The table, by digest, in IndexedDB |

- **Fetched on an explicit action**, never in the background: **Fetch** on the node, or opening an example that names
  a remote source, which already fetches on an explicit action and says from where.
- **Checked by digest.** The archive's digest and the file's digest must both match, or the table is refused with what
  differed. The catalogue's existing rule for GitHub files, applied to a second host.
- **Unpacked in the browser.** The counts are one CSV inside an 8.8 MB zip; `fflate`, already installed, reads one entry.
- **An export carries no rows** for a remote table, only the spec. Another device fetches when it opens.

Measured 2026-11-03: Zenodo answers a cross-origin request with `access-control-allow-origin: *`; the archive is
8,817,679 bytes, md5 `ba80a4dbfe2393e505cdb4bfa750b14d`; the entry
`Data/Core/Derived/analysis_master_raw_rebuild.csv` is 2,869,419 bytes, 559,901 compressed.

## Built, 2026-11-03

- **Or fetch from a URL** in the table dialog: a CSV, Stata file or zip; for a zip, the file inside is chosen. The
  fetched file is handed to the dialog as a chosen file would be, so everything after is unchanged.
- The node keeps `remote`: URL, entry, the file's and the archive's digests, bytes.
- `workflowDocument`, which every export goes through, removes the rows of a remote table.
- **Fetch the table** on a node that has the spec and no rows; a run before it says to fetch.
- Not built: fetching on opening an example. The node's button is the explicit action for now.

Validated: unit tests on stripping and on reading an archive; a browser test, Chromium and WebKit, that fetches a
zip, saves, exports and finds no rows in the file, imports it into a fresh workspace, is refused a changed file and
reads the original again to the same rows.

## The NYC example, 2026-11-03

`example-2025-nyc-ozone`, two workflows, pinned in the catalogue. Its exported project is 6,191 bytes and holds no row
of either table. Opened from its pin, the table says its rows are not kept, **Fetch the table** reads the package from
Zenodo by digest, and the run completes. Built from an empty canvas with a real fetch from Zenodo for the export.

Found on the way: the CSV reader capped every file at 2,000 rows, though tables allow 20,000; a table now passes its own
ceiling. And a wide file of about 100 columns is slow to set up, recorded in TODO.

## Design audit

This changes `table_input` and adds no widget.

- **D3, distinctions and how each is enforced:**
  - *A table fetched is the one the spec names.* Digests checked before anything is read: a run-time check.
  - *Terms travel with the source.* The citation and the custodian are part of the spec, shown wherever the table is.
    A limitation: nothing stops a user exporting rows they fetched themselves.
  - *No fetch without an action.* A run-time check in the interface.
- **D10.** The NYC example.

## What this does not establish

- That Zenodo keeps the record, or keeps serving it cross-origin.
- That the custodian's terms permit even fetching and analysing locally. They reserve rights over republication; private
  analysis of a file the authors published openly is the reading here, recorded as a reading.
- Offline use before the first fetch.

## One download per file (added 2026-11-04)

The practitioner: *"I had to download the data set for NYC twice for 2 workflows. Double download."* and *"How does
another widget know that what it needs is already downloaded? Assume it's a different project."*

**By digest, not by project.** What is fetched is kept on the device under its SHA-256, in the store imported tiles
use, and a table whose spec names that digest reads it from there after checking it again; a copy that no longer
matches is fetched afresh. The store is the device's, so another project on the same device finds it; another device,
or a browser whose site data was cleared, downloads again. A URL typed in the dialog is remembered with the digest it
gave, and asked for again it reads the device's copy, saying when it was fetched, with **Fetch again from the source**
for a file that may have changed.

What this changes about the refusal above: a changed file at the source is still refused, but only when the device has
no copy of the named file to read instead. Either way only the named file is ever read.

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/remote-table.test.mjs` | 5 of 5, three of them new: three reads of one file make one request, a damaged copy is fetched again, a URL typed again reads the copy and Fetch again goes to the source |
| 2026-11-04 | `tests/remote-table.browser.mjs`, Chromium | Passed: on a second device (byte store emptied) a changed file is refused; opened again as another project on the same device, the table is read with no request to the source while the source serves different bytes |
| 2026-11-04 | `tests/nyc-from-scratch.browser.mjs` against Zenodo, Chromium | Passed: three workflows, one request for the package |
