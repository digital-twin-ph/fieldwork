//! A RASTER TOTALLED OVER AREAS, ONE STRIP OF ROWS AT A TIME (2026-11-19; the practitioner: "Start streaming").
//!
//! GHS-POP over DR Congo is about 519 million cells of 8 bytes, 4.2 GB, past what a browser tab decodes at once. Read in
//! strips of whole rows and added up here, no more than one strip is ever held. The rule is `centreRuns` and
//! `totalOver`'s in src/raster-areas.ts, which lab check 02 holds against rasterio: a cell counts for an area when its
//! centre is inside or on it, read even-odd from where the area's outline crosses the row's centre line; a cell the
//! raster marks as no data counts apart and adds nothing; a cell of the area beyond the window counts as outside.
//!
//! Coordinates are the window's cells: x from its first column, y from its first row, y growing downward, so a row's
//! centre line is y = r + 0.5. Rows must be fed in increasing order, each pass from the first row of the areas' extent.
//!
//! Three passes give everything `zonalStatistics` reports, the median exactly: the sums (mode 0); a histogram of each
//! area's values between its least and greatest (mode 1); and the values in the bins holding the middle rank, collected
//! to be sorted by the caller (mode 2). A bin too full to collect is narrowed by another histogram over it.

use libm::{ceil, floor};

const PAGE: usize = 65_536;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
static mut OFF: [usize; 12] = [0; 12];
static mut SHAPE: Shape = Shape::empty();
static mut NEXT: usize = 0; // the next edge, in row order, not yet active
static mut ACTIVE_N: usize = 0;
static mut ROW: i64 = i64::MIN; // the last row added up, so rows are fed in order

#[derive(Clone, Copy)]
struct Shape {
    areas: usize,
    edges: usize,
    width: usize,
    strip: usize,
    bins: usize,
    collect: usize,
}
impl Shape {
    const fn empty() -> Self {
        Shape { areas: 0, edges: 0, width: 0, strip: 0, bins: 0, collect: 0 }
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
struct Cross {
    x: f64,
    area: u32,
    _pad: u32,
}

// The arrays, by their index in OFF.
const EDGE: usize = 0; // f64[edges*4]: ax, ay, bx, by
const EDGE_AREA: usize = 1; // u32[edges]
const EDGE_ROWS: usize = 2; // i32[edges*2]: the first and last row whose centre line it crosses
const ORDER: usize = 3; // u32[edges], by first row
const ACTIVE: usize = 4; // u32[edges]
const CROSSES: usize = 5; // Cross[edges]
const STRIP: usize = 6; // f64[width*strip]
const ACC: usize = 7; // f64[areas*8]: total, cells, noData, outside, min, max, squares, populated
const HIST: usize = 8; // u32[areas*bins]
const RANGE: usize = 9; // f64[areas*2]: lo, hi, for the histogram or the collection
const COLLECTED: usize = 10; // f64[collect]
const SLOTS: usize = 11; // u32[areas*5]: where each area's collection starts, how many it may hold, how many it found,
                         // how many values fell below the range, and how many equal its low end

fn ptr<T>(which: usize) -> *mut T {
    unsafe { (BASE + OFF[which]) as *mut T }
}

#[cfg(target_arch = "wasm32")]
fn grow(bytes: usize) -> bool {
    // A FRESH BLOCK, not the old one extended: other modules grow the same memory, so pages added later need not follow
    // this module's.
    unsafe {
        if bytes <= CAPACITY {
            return true;
        }
        let pages = (bytes + PAGE - 1) / PAGE;
        let old = core::arch::wasm32::memory_grow(0, pages);
        if old == usize::MAX {
            return false;
        }
        BASE = old * PAGE;
        CAPACITY = pages * PAGE;
        true
    }
}
#[cfg(not(target_arch = "wasm32"))]
fn grow(bytes: usize) -> bool {
    unsafe {
        if bytes <= CAPACITY {
            return true;
        }
        extern crate std;
        let buffer = std::vec![0u64; bytes / 8 + 1].leak();
        BASE = buffer.as_mut_ptr() as usize;
        CAPACITY = bytes;
        true
    }
}

/// Lays out the arrays and returns 1, or 0 where memory could not be had. `strip` is the most rows one call adds up;
/// `bins` the histogram's bins per area; `collect` how many values a collection may hold in all.
#[unsafe(no_mangle)]
pub extern "C" fn zonal_prepare(areas: u32, edges: u32, width: u32, strip: u32, bins: u32, collect: u32) -> u32 {
    let s = Shape {
        areas: areas as usize,
        edges: edges as usize,
        width: width as usize,
        strip: strip as usize,
        bins: (bins as usize).max(1),
        collect: collect as usize,
    };
    let sizes: [usize; 12] = [
        s.edges * 4 * 8,
        s.edges * 4,
        s.edges * 2 * 4,
        s.edges * 4,
        s.edges * 4,
        s.edges * 16,
        s.width * s.strip * 8,
        s.areas * 8 * 8,
        s.areas * s.bins * 4,
        s.areas * 2 * 8,
        s.collect * 8,
        s.areas * 5 * 4,
    ];
    let mut at = 0usize;
    let mut off = [0usize; 12];
    for (i, size) in sizes.iter().enumerate() {
        off[i] = at;
        at += (size + 15) & !15;
    }
    if !grow(at) {
        return 0;
    }
    unsafe {
        OFF = off;
        SHAPE = s;
    }
    1
}

/// Where to write: 0 the edges, 1 each edge's area, 6 a strip of values, 9 the ranges, 11 the collection slots.
/// Where to read: 7 the sums, 8 the histograms, 10 the collected values, 11 the slots' counts (five per area).
#[unsafe(no_mangle)]
pub extern "C" fn zonal_ptr(which: u32) -> u32 {
    if which as usize >= 12 {
        return 0;
    }
    ptr::<u8>(which as usize) as u32
}

/// After the edges are written: the rows each one crosses, edges put in row order, and every count set to zero for a
/// pass in `mode` (0 sums, 1 histogram, 2 collect). Call again before each pass.
#[unsafe(no_mangle)]
pub extern "C" fn zonal_begin(mode: u32) -> u32 {
    let s = unsafe { SHAPE };
    unsafe {
        let edge = core::slice::from_raw_parts(ptr::<f64>(EDGE), s.edges * 4);
        let rows = core::slice::from_raw_parts_mut(ptr::<i32>(EDGE_ROWS), s.edges * 2);
        let order = core::slice::from_raw_parts_mut(ptr::<u32>(ORDER), s.edges);
        for e in 0..s.edges {
            let (ay, by) = (edge[e * 4 + 1], edge[e * 4 + 3]);
            // Rows whose centre line y = r + 0.5 lies in [low, high): each crossing counted once, at a shared vertex too.
            let (low, high) = if ay < by { (ay, by) } else { (by, ay) };
            if ay == by || !low.is_finite() || !high.is_finite() {
                rows[e * 2] = 1;
                rows[e * 2 + 1] = 0;
            } else {
                rows[e * 2] = ceil(low - 0.5) as i32;
                rows[e * 2 + 1] = ceil(high - 0.5) as i32 - 1;
            }
            order[e] = e as u32;
        }
        order.sort_unstable_by_key(|&e| rows[e as usize * 2]);
        NEXT = 0;
        ACTIVE_N = 0;
        ROW = i64::MIN;
        match mode {
            0 => {
                let acc = core::slice::from_raw_parts_mut(ptr::<f64>(ACC), s.areas * 8);
                for a in 0..s.areas {
                    acc[a * 8..a * 8 + 8].copy_from_slice(&[0.0, 0.0, 0.0, 0.0, f64::INFINITY, f64::NEG_INFINITY, 0.0, 0.0]);
                }
            }
            1 => {
                core::slice::from_raw_parts_mut(ptr::<u32>(HIST), s.areas * s.bins).fill(0);
            }
            _ => {
                let slots = core::slice::from_raw_parts_mut(ptr::<u32>(SLOTS), s.areas * 5);
                for a in 0..s.areas {
                    slots[a * 5 + 2] = 0;
                    slots[a * 5 + 3] = 0;
                    slots[a * 5 + 4] = 0;
                }
            }
        }
    }
    1
}

/// Adds up `rows` rows from `first`, in `mode`. With `values` 1 the strip holds them, `width` values a row from the
/// window's first column; with 0 the rows are beyond the window and their cells count as outside. A value equal to
/// `no_data` (where `has_no_data` is 1), or not a finite number, is no data. Returns 1, or 0 where rows came out of order.
#[unsafe(no_mangle)]
pub extern "C" fn zonal_rows(first: i32, rows: u32, values: u32, mode: u32, no_data: f64, has_no_data: u32) -> u32 {
    let s = unsafe { SHAPE };
    if values == 1 && rows as usize > s.strip {
        return 0;
    }
    for i in 0..rows as i32 {
        let r = first + i;
        unsafe {
            if (r as i64) <= ROW {
                return 0;
            }
            ROW = r as i64;
        }
        let strip_row = if values == 1 { Some(i as usize) } else { None };
        row(r, strip_row, mode, no_data, has_no_data == 1, &s);
    }
    1
}

fn row(r: i32, strip_row: Option<usize>, mode: u32, no_data: f64, has_no_data: bool, s: &Shape) {
    unsafe {
        let edge = core::slice::from_raw_parts(ptr::<f64>(EDGE), s.edges * 4);
        let edge_area = core::slice::from_raw_parts(ptr::<u32>(EDGE_AREA), s.edges);
        let rows = core::slice::from_raw_parts(ptr::<i32>(EDGE_ROWS), s.edges * 2);
        let order = core::slice::from_raw_parts(ptr::<u32>(ORDER), s.edges);
        let active = core::slice::from_raw_parts_mut(ptr::<u32>(ACTIVE), s.edges);
        let crosses = core::slice::from_raw_parts_mut(ptr::<Cross>(CROSSES), s.edges);
        // Edges whose first row has come, in; edges whose last row has passed, out.
        while NEXT < s.edges && rows[order[NEXT] as usize * 2] <= r {
            active[ACTIVE_N] = order[NEXT];
            ACTIVE_N += 1;
            NEXT += 1;
        }
        let mut kept = 0usize;
        let mut n = 0usize;
        let y = r as f64 + 0.5;
        for k in 0..ACTIVE_N {
            let e = active[k] as usize;
            if rows[e * 2 + 1] < r {
                continue;
            }
            active[kept] = e as u32;
            kept += 1;
            if rows[e * 2] > r {
                continue;
            }
            let (ax, ay, bx, by) = (edge[e * 4], edge[e * 4 + 1], edge[e * 4 + 2], edge[e * 4 + 3]);
            crosses[n] = Cross { x: ax + (y - ay) * (bx - ax) / (by - ay), area: edge_area[e], _pad: 0 };
            n += 1;
        }
        ACTIVE_N = kept;
        let crosses = &mut crosses[..n];
        crosses.sort_unstable_by(|a, b| a.area.cmp(&b.area).then(a.x.partial_cmp(&b.x).unwrap_or(core::cmp::Ordering::Equal)));
        let values = strip_row.map(|i| core::slice::from_raw_parts(ptr::<f64>(STRIP).add(i * s.width), s.width));
        let mut i = 0usize;
        while i + 1 < n {
            if crosses[i].area != crosses[i + 1].area {
                // An area with an odd number of crossings on this row: its last one has no partner.
                i += 1;
                continue;
            }
            let area = crosses[i].area as usize;
            let c0 = ceil(crosses[i].x - 0.5) as i64;
            let c1 = floor(crosses[i + 1].x - 0.5) as i64;
            if c1 >= c0 {
                run(area, c0, c1, values, mode, no_data, has_no_data, s);
            }
            i += 2;
        }
    }
}

fn run(area: usize, c0: i64, c1: i64, values: Option<&[f64]>, mode: u32, no_data: f64, has_no_data: bool, s: &Shape) {
    unsafe {
        let acc = core::slice::from_raw_parts_mut(ptr::<f64>(ACC).add(area * 8), 8);
        let Some(values) = values else {
            if mode == 0 {
                acc[3] += (c1 - c0 + 1) as f64;
            }
            return;
        };
        let w = s.width as i64;
        let (lo, hi) = (*ptr::<f64>(RANGE).add(area * 2), *ptr::<f64>(RANGE).add(area * 2 + 1));
        for c in c0..=c1 {
            if c < 0 || c >= w {
                if mode == 0 {
                    acc[3] += 1.0;
                }
                continue;
            }
            let v = values[c as usize];
            if !v.is_finite() || (has_no_data && v == no_data) {
                if mode == 0 {
                    acc[2] += 1.0;
                }
                continue;
            }
            match mode {
                0 => {
                    acc[0] += v;
                    acc[1] += 1.0;
                    if v < acc[4] {
                        acc[4] = v;
                    }
                    if v > acc[5] {
                        acc[5] = v;
                    }
                    acc[6] += v * v;
                    if v > 0.0 {
                        acc[7] += 1.0;
                    }
                }
                1 => {
                    if v < lo || v > hi {
                        continue;
                    }
                    let b = if hi > lo { ((v - lo) / (hi - lo) * s.bins as f64) as usize } else { 0 };
                    *ptr::<u32>(HIST).add(area * s.bins + b.min(s.bins - 1)) += 1;
                }
                _ => {
                    // Values in [lo, hi) are collected; those below are counted, and those equal to lo counted again, so a
                    // middle rank that falls on a run of one value (a population raster's zeros) needs nothing collected.
                    let slots = core::slice::from_raw_parts_mut(ptr::<u32>(SLOTS).add(area * 5), 5);
                    if v < lo {
                        slots[3] += 1;
                        continue;
                    }
                    if v == lo {
                        slots[4] += 1;
                    }
                    if v >= hi {
                        continue;
                    }
                    if slots[2] < slots[1] {
                        *ptr::<f64>(COLLECTED).add((slots[0] + slots[2]) as usize) = v;
                    }
                    slots[2] += 1;
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    extern crate std;
    use super::*;
    use std::vec::Vec;
    /// The module keeps its arrays in statics, so its tests take turns.
    static TURN: std::sync::Mutex<()> = std::sync::Mutex::new(());

    /// One area's cells the slow way: every cell centre of its box tested against the row's crossings, sorted and paired,
    /// a centre on a crossing counted in, as `centreRuns` counts it.
    fn brute(rings: &[Vec<(f64, f64)>], values: &[f64], width: usize, height: usize) -> (f64, f64, f64) {
        let (mut total, mut cells, mut outside) = (0.0, 0.0, 0.0);
        let (mut x0, mut x1, mut y0, mut y1) = (f64::MAX, f64::MIN, f64::MAX, f64::MIN);
        for ring in rings {
            for &(x, y) in ring {
                x0 = x0.min(x);
                x1 = x1.max(x);
                y0 = y0.min(y);
                y1 = y1.max(y);
            }
        }
        for r in (y0.floor() as i64 - 1)..=(y1.ceil() as i64 + 1) {
            let py = r as f64 + 0.5;
            let mut xs: Vec<f64> = Vec::new();
            for ring in rings {
                for k in 1..ring.len() {
                    let ((ax, ay), (bx, by)) = (ring[k - 1], ring[k]);
                    let (low, high) = if ay < by { (ay, by) } else { (by, ay) };
                    if ay != by && py >= low && py < high {
                        xs.push(ax + (py - ay) * (bx - ax) / (by - ay));
                    }
                }
            }
            xs.sort_by(|a, b| a.partial_cmp(b).unwrap());
            for c in (x0.floor() as i64 - 1)..=(x1.ceil() as i64 + 1) {
                let px = c as f64 + 0.5;
                let inside = xs.chunks(2).any(|p| p.len() == 2 && p[0] <= px && px <= p[1]);
                if !inside {
                    continue;
                }
                if c < 0 || r < 0 || c >= width as i64 || r >= height as i64 {
                    outside += 1.0;
                } else {
                    total += values[r as usize * width + c as usize];
                    cells += 1.0;
                }
            }
        }
        (total, cells, outside)
    }

    fn sums(areas: &[Vec<Vec<(f64, f64)>>], values: &[f64], width: usize, height: usize, strip: usize) -> Vec<[f64; 8]> {
        let edges: usize = areas.iter().flat_map(|a| a.iter()).map(|r| r.len() - 1).sum();
        assert_eq!(zonal_prepare(areas.len() as u32, edges as u32, width as u32, strip as u32, 16, 0), 1);
        let mut e = 0;
        for (a, rings) in areas.iter().enumerate() {
            for ring in rings {
                for k in 1..ring.len() {
                    unsafe {
                        let p = ptr::<f64>(EDGE).add(e * 4);
                        *p = ring[k - 1].0;
                        *p.add(1) = ring[k - 1].1;
                        *p.add(2) = ring[k].0;
                        *p.add(3) = ring[k].1;
                        *ptr::<u32>(EDGE_AREA).add(e) = a as u32;
                    }
                    e += 1;
                }
            }
        }
        zonal_begin(0);
        let top = -3i32;
        assert_eq!(zonal_rows(top, (-top) as u32, 0, 0, 0.0, 0), 1);
        let mut r = 0;
        while r < height {
            let n = strip.min(height - r);
            unsafe {
                core::ptr::copy_nonoverlapping(values[r * width..].as_ptr(), ptr::<f64>(STRIP), n * width);
            }
            assert_eq!(zonal_rows(r as i32, n as u32, 1, 0, -1.0, 1), 1);
            r += n;
        }
        assert_eq!(zonal_rows(height as i32, 4, 0, 0, 0.0, 0), 1);
        (0..areas.len()).map(|a| unsafe { *(ptr::<[f64; 8]>(ACC).add(a)) }).collect()
    }

    #[test]
    fn the_scanline_counts_the_cells_a_centre_test_counts() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        let (width, height) = (40usize, 30usize);
        let values: Vec<f64> = (0..width * height).map(|i| ((i * 7919) % 97) as f64).collect();
        // A square, a triangle with a hole, and a shape reaching past the window's left and top edges.
        let areas = std::vec![
            std::vec![std::vec![(2.0, 2.0), (12.3, 2.0), (12.3, 11.7), (2.0, 11.7), (2.0, 2.0)]],
            std::vec![
                std::vec![(15.0, 3.0), (38.0, 8.0), (20.0, 28.0), (15.0, 3.0)],
                std::vec![(19.0, 9.0), (24.0, 10.0), (21.0, 15.0), (19.0, 9.0)],
            ],
            std::vec![std::vec![(-5.5, -2.5), (9.5, 14.0), (3.0, 25.25), (-4.0, 20.0), (-5.5, -2.5)]],
        ];
        for strip in [1usize, 7, 30] {
            let got = sums(&areas, &values, width, height, strip);
            for (a, rings) in areas.iter().enumerate() {
                let (total, cells, outside) = brute(rings, &values, width, height);
                assert_eq!(got[a][0], total, "area {a}, strip {strip}: total");
                assert_eq!(got[a][1], cells, "area {a}, strip {strip}: cells");
                assert_eq!(got[a][3], outside, "area {a}, strip {strip}: outside");
            }
        }
    }

    #[test]
    fn no_data_counts_apart_and_adds_nothing() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        let (width, height) = (4usize, 4usize);
        let mut values = std::vec![1.0; 16];
        values[5] = -1.0;
        values[6] = f64::NAN;
        let areas = std::vec![std::vec![std::vec![(0.0, 0.0), (4.0, 0.0), (4.0, 4.0), (0.0, 4.0), (0.0, 0.0)]]];
        let got = sums(&areas, &values, width, height, 2);
        assert_eq!((got[0][0], got[0][1], got[0][2], got[0][3]), (14.0, 14.0, 2.0, 0.0));
    }

    #[test]
    fn the_histogram_and_the_collection_find_each_cell_once() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        let (width, height) = (20usize, 20usize);
        let values: Vec<f64> = (0..width * height).map(|i| ((i * 37) % 23) as f64 * 0.5).collect();
        let square = std::vec![std::vec![(1.0, 1.0), (17.5, 1.0), (17.5, 18.0), (1.0, 18.0), (1.0, 1.0)]];
        let acc = sums(&[square.clone()], &values, width, height, 5);
        let (cells, lo, hi) = (acc[0][1], acc[0][4], acc[0][5]);
        let bins = 16usize;
        assert_eq!(zonal_prepare(1, 4, width as u32, 5, bins as u32, 1000), 1);
        let feed = |mode: u32| {
            unsafe {
                for (k, w) in square[0].windows(2).enumerate() {
                    let p = ptr::<f64>(EDGE).add(k * 4);
                    (*p, *p.add(1), *p.add(2), *p.add(3)) = (w[0].0, w[0].1, w[1].0, w[1].1);
                    *ptr::<u32>(EDGE_AREA).add(k) = 0;
                }
            }
            zonal_begin(mode);
            let mut r = 0;
            while r < height {
                let n = 5.min(height - r);
                unsafe { core::ptr::copy_nonoverlapping(values[r * width..].as_ptr(), ptr::<f64>(STRIP), n * width) };
                assert_eq!(zonal_rows(r as i32, n as u32, 1, mode, 0.0, 0), 1);
                r += n;
            }
        };
        unsafe { (*ptr::<f64>(RANGE), *ptr::<f64>(RANGE).add(1)) = (lo, hi) };
        feed(1);
        let hist: Vec<u32> = (0..bins).map(|b| unsafe { *ptr::<u32>(HIST).add(b) }).collect();
        assert_eq!(hist.iter().sum::<u32>() as f64, cells);
        // Collect [2, 6): exactly the cells of the square with a value from 2 up to, not including, 6.
        unsafe {
            (*ptr::<f64>(RANGE), *ptr::<f64>(RANGE).add(1)) = (2.0, 6.0);
            (*ptr::<u32>(SLOTS), *ptr::<u32>(SLOTS).add(1)) = (0, 1000);
        }
        feed(2);
        let found = unsafe { *ptr::<u32>(SLOTS).add(2) } as usize;
        let mut got: Vec<f64> = (0..found).map(|i| unsafe { *ptr::<f64>(COLLECTED).add(i) }).collect();
        let mut want = Vec::new();
        for r in 0..height {
            for c in 0..width {
                let (px, py) = (c as f64 + 0.5, r as f64 + 0.5);
                if px >= 1.0 && px <= 17.5 && py >= 1.0 && py < 18.0 && values[r * width + c] >= 2.0 && values[r * width + c] < 6.0 {
                    want.push(values[r * width + c]);
                }
            }
        }
        got.sort_by(|a, b| a.partial_cmp(b).unwrap());
        want.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert_eq!(got, want);
    }

    #[test]
    fn rows_out_of_order_are_refused() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        assert_eq!(zonal_prepare(1, 1, 4, 4, 1, 0), 1);
        zonal_begin(0);
        assert_eq!(zonal_rows(5, 1, 0, 0, 0.0, 0), 1);
        assert_eq!(zonal_rows(5, 1, 0, 0, 0.0, 0), 0);
    }
}
