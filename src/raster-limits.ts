/** THE RASTER'S LIMITS, apart from the GeoTIFF reader so a module may check a size without loading it (2026-11-12).
 *  Declared in widgets/caps.json. */
/** CELLS A KEPT WINDOW MAY HOLD: GHS-POP over Botswana, 123,276,912 cells of 8 bytes, run beside WorldPop and GRID3 on
 *  2026-11-13 in a Chromium tab, rounded up to the next 100,000. See widgets/caps.json. */
export const MAX_RASTER_CELLS=123_300_000;
/** THE TIFF BLOCKS ONE READ MAY DECODE: GHS-POP's tiles over Botswana, 1.06 GB of 8-byte blocks, read and kept on
 *  2026-11-13. Before, 493 MB (Botswana's WorldPop, 2026-10-22), and a bare 64 MB with no evidence before that. */
export const MAX_DECODE_BYTES=1_100_000_000;
/** THE KEPT WINDOW'S FILE: no more than one read may decode, and a header. It was a bare 5 MB from when projects lived in
 *  5 MB of local storage, and refused a province at 100 m long before the cell cap could (2026-11-12). A window is kept
 *  at its source's precision, so a 4-byte source reaches the cell cap first and an 8-byte one this. */
export const rasterFileByteLimit=():number=>MAX_DECODE_BYTES+(1<<20);
