# The FW epi kernel

_Created 2026-11-02 · Updated 2026-11-02_

The statistical arithmetic under Fieldwork: Rust, compiled to WebAssembly, with no runtime dependencies.
**This code is FW's own and grows here.** Measures are added, named and tested in this folder.

Its start is recorded in `ORIGIN.md`. The design is in
[experiment 161](../docs/experiments/161-the-epi-kernel-one-table-many-exposures.md).

**Not used by the application yet.**

`fieldwork-kernel.wasm` is committed, so building FW needs no Rust. To rebuild it after changing the
source, with Rust and the `wasm32-unknown-unknown` target:

    npm run build:kernel

Built with rustc 1.99.1. A different compiler gives different bytes, so compare results and not files.
