# 169 · Stata files as tables

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** tried — the table import reads Stata files, checked on the London example's file.

## The task

The practitioner, 2026-11-03, while building the London example, whose data the authors published as a Stata file:
*"Can we add Stata input for table input?"*

## What was built

`src/stata.ts` reads formats 113 to 115 (Stata 8 to 12) and 117 to 119 (Stata 13 onward), and the file then meets the
same dialog a CSV does: shape, keys, value column, Data quality.

| In the file | Read as |
| --- | --- |
| Numbers | As stored; single precision written with nine significant figures, which is exact |
| `.` and `.a` to `.z` | Empty, never zero |
| A variable formatted `%td`, or `%d` in older files | The date it is |
| `%tc` | A date and time |
| Text, including long strings (`strL`) | Text |
| Value labels | Not applied: codes stay as stored, and the import says which variables carry labels |

## Validation, 2026-11-03

- The London file, `londondataset2002_2006.dta` (format 115, 1,826 days), read by this reader and by an independent
  script written for it: 0 of 9,130 cells differ.
- A Poisson model fitted by hand to the converted data gives 0.991 (0.987–0.994) per 10 µg/m³ ozone, the paper's crude
  figure.
- Unit tests write format 115 and format 118 files byte by byte: dates, missing values, text, a labelled variable and an
  unknown format. One browser test imports a Stata file through the dialog, Chromium and WebKit.

## What this does not establish

- Big-endian files, format 119's wider fields and long strings in format 119 are written to the specification and untested.
- Value labels, which a later option could apply on request, keeping the codes beside them.
- Files from SPSS, SAS or R.
