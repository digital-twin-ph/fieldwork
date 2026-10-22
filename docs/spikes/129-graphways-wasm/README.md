# Spike · Graphways in WebAssembly

_Created 2026-10-22 · Updated 2026-10-22_

Everything needed to reproduce the measurements in
[experiment 129](../../experiments/129-graphways-and-the-pbf-question.md), kept because the work
that produced them was a 1.5 GB Rust build tree in a temporary directory and the useful part is
these four files.

**Nothing here is shipped.** No fieldwork code imports it, `npm run check` does not build it, and
the application still acquires street networks from Overpass. This is the evidence behind a
direction, not the start of one.

## What each file is

| file | what it is |
|---|---|
| `graphways-bf2184f.patch` | the change to Graphways itself: `read_pbf_bytes`, because every PBF entry takes a `Path` and wasm32 has no filesystem, and a study-area bbox applied while the extract is decoded. 68 lines against commit `bf2184f`. |
| `probe/` | a `cdylib` around the patched crate exporting four C functions: `rayon_probe`, `alloc`, `set_bbox`, `graph_from_pbf`. No wasm-bindgen — the module is instantiated directly and the extract is written into its memory. |
| `run.mjs` | loads the module, copies an extract into wasm memory, applies a bbox and reports junctions, seconds and the module's memory. |
| `pbf-reader-spike.mjs` | the other half of experiment 129: a PBF reader in JavaScript with no dependency, against `DecompressionStream` and typed arrays. It is what the browser measurements were taken with, and it is what a fieldwork implementation would start from if the Rust path is not taken. |

## Reproducing it

```sh
rustup target add wasm32-unknown-unknown            # rustc 1.99.1 was used
git clone https://github.com/kyleloving/graphways   # into ../graphways-fork
git -C ../graphways-fork checkout bf2184f
git -C ../graphways-fork apply .../graphways-bf2184f.patch
cd probe && cargo build --release --target wasm32-unknown-unknown
node run.mjs target/wasm32-unknown-unknown/release/graphways_wasm_probe.wasm \
  ~/Downloads/drc.osm.pbf driving "28.9,0.3,31.5,3.7"
```

The extracts are at `~/Downloads/*.osm.pbf`, deliberately outside this repository: they are
published ODbL files that Geofabrik already hosts.

## What it measured

| extract | mode | junctions | time | wasm memory |
|---|---|---|---|---|
| Andorra 3.5 MB | walk | 145,690 | 0.4 s | 92 MB |
| Rwanda 68.2 MB | walk | 3,795,541 | 12.7 s | 2,102 MB |
| Rwanda, province bbox | walk | 1,425,531 | 6.5 s | 1,438 MB |
| DRC 416.3 MB, Ituri bbox | drive | 1,152,974 | 23.7 s | 3,587 MB |
| DRC 416.3 MB, Ituri bbox | walk | — | — | out of memory at the 4 GB ceiling |

Measured in Node, and repeated in both browsers: Chromium builds Ituri's driving graph in 20.2 s
and WebKit in 17.9 s, both at 3,587 MB of wasm memory.

## Spike 1: getting the graph out

`export_nodes` and `export_edges` write flat `f64` buffers and `drop_graph` lets the original go.
Crossing the boundary is nearly free — 10.6 million doubles in under a tenth of a second, 85 MB as
typed arrays — and building fieldwork's `{id, coordinates}` / `{from, to, lengthM}` objects from
them costs 0.6 s and 388 MB of JS heap, for a tab holding about 4.5 GB in all.
