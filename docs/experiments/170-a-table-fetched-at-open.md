# 170 · A table fetched when the example opens

_Created 2026-11-04 · Updated 2026-11-04_

**Status:** asked — designed here, not built.

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
