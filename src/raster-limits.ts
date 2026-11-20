/** THE RASTER'S LIMITS, apart from the GeoTIFF reader so a module may check a size without loading it (2026-11-12).
 *  Declared in widgets/caps.json. */
/** CELLS A KEPT WINDOW MAY HOLD, past which it is streamed: lowered 2026-11-20 to Nigeria's measured 166.4 million, when DR
 *  Congo's 2.1 GB windows, kept whole, could not be read back after a reload in a three-workflow project. Before: WorldPop over DR Congo, 518,812,635 cells of 4 bytes, through Raster input and two runs
 *  on 2026-11-17 in Chromium, rounded up to the next 100,000. Before, 166,400,000 (Nigeria, the same day) and 123,300,000
 *  (GHS-POP over Botswana, 2026-11-13). See widgets/caps.json. */
export const MAX_RASTER_CELLS=166_400_000;
/** THE TIFF BLOCKS ONE READ MAY DECODE, past which a window is streamed: lowered 2026-11-20 to 1.1 GB (GHS-POP over
 *  Botswana) for the same reason. Before: WorldPop's tiles over DR Congo, 2,123,366,400 bytes of 4-byte blocks, read and
 *  kept on 2026-11-17, rounded up to the next million. Before, 1.1 GB (GHS-POP over Botswana, 2026-11-13), 493 MB
 *  (Botswana's WorldPop, 2026-10-22), and a bare 64 MB with no evidence before that. */
export const MAX_DECODE_BYTES=1_100_000_000;
/** THE KEPT WINDOW'S FILE: no more than one read may decode, and a header. It was a bare 5 MB from when projects lived in
 *  5 MB of local storage, and refused a province at 100 m long before the cell cap could (2026-11-12). A window is kept
 *  at its source's precision, so a 4-byte source reaches the cell cap first and an 8-byte one this. */
export const rasterFileByteLimit=():number=>MAX_DECODE_BYTES+(1<<20);
/** A WINDOW SAVED BEFORE 2026-11-20 may hold up to the limits of then: its record is still read, its step still drawn, and
 *  Configure… opens on it to read the source again, streamed. Only the keeping of a new window uses the limits above. */
export const SAVED_WINDOW_CELLS=518_900_000;
export const SAVED_WINDOW_BYTES=2_124_000_000+(1<<20);
