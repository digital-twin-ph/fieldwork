/** THE RASTER'S LIMITS, apart from the GeoTIFF reader so a module may check a size without loading it (2026-11-12).
 *  Declared in widgets/caps.json. */
/** Cells a kept window may hold. Measured 2026-10-22; see widgets/caps.json. */
export const MAX_RASTER_CELLS=16_777_216;
/** THE TIFF BLOCKS ONE READ MAY DECODE: Botswana's whole 123.2M-cell raster, 493 MB of blocks, was read in 8.4 s on
 *  2026-10-22. It was a bare 64 MB with no evidence. */
export const MAX_DECODE_BYTES=512_000_000;
/** THE KEPT WINDOW'S FILE, from the cell cap rather than a number of its own: at most 8 bytes a cell, and a header. It was
 *  a bare 5 MB from when projects lived in 5 MB of local storage, and refused a province at 100 m long before the cell
 *  cap could (2026-11-12). */
export const rasterFileByteLimit=():number=>MAX_RASTER_CELLS*8+(1<<20);
