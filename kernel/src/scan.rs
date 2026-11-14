//! THE SPACE-TIME PERMUTATION SCAN'S TEST, in the kernel (TODO 17, step 3; the practitioner, 2026-11-14: "Move scan
//! to kernel"). Fieldwork builds the places, the circles and the observed scan in TypeScript; this runs the shuffles:
//! the dates shuffled across the fixed cases by the same seeded stream (mulberry32, bit for bit), and each shuffle's
//! highest score anywhere, by the same arithmetic as `scan` in src/space-time-scan.ts. It stops early, as that does,
//! once `stop_after` shuffles have scored at least as high as the most likely cluster (Besag and Clifford 1991).
//!
//! Memory: the arrays are laid out in the module's own memory, grown when a scan needs more than it has and reused
//! after, so a page that never scans pays nothing. The caller writes the inputs through `scan_ptr` and reads the maxima
//! back the same way.

use libm::{floor, log};

const PAGE: usize = 65_536;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
// Offsets, in bytes from BASE, of each array, and the shape.
static mut OFF: [usize; 16] = [0; 16];
static mut SHAPE: Shape = Shape::empty();
static mut RNG: u32 = 0;
static mut DONE: u32 = 0;
static mut ABOVE: u32 = 0;

#[derive(Clone, Copy)]
struct Shape {
    n: usize,
    places: usize,
    bins: usize,
    centers: usize,
    circles: usize,
    order: usize,
    replications: usize,
}
impl Shape {
    const fn empty() -> Self {
        Shape { n: 0, places: 0, bins: 0, centers: 0, circles: 0, order: 0, replications: 0 }
    }
}

// The arrays, by their index in OFF.
const CASE_PLACE: usize = 0; // i32[n]
const CASE_BIN: usize = 1; // i32[n], the observed bins
const CENTER_START: usize = 2; // i32[centers+1], where each center's circles begin in the circle arrays
const CENTER_ORDER: usize = 3; // i32[centers+1], where each center's ordered places begin in ORDER
const ORDER: usize = 4; // i32[order]
const CIRCLE_SIZE: usize = 5; // i32[circles], places taken from the center's order
const CIRCLE_SHARE: usize = 6; // f64[circles], the circle's cases over n
const PLACE_BIN: usize = 7; // i32[places*bins]
const PER_BIN: usize = 8; // f64[bins]
const TIME_TOTALS: usize = 9; // f64[bins+1]
const ACC: usize = 10; // i32[bins]
const PREFIX: usize = 11; // f64[bins+1]
const OCCUPIED: usize = 12; // i32[bins]
const SHUFFLED: usize = 13; // i32[n]
const MAXIMA: usize = 14; // f64[replications]

fn ptr<T>(which: usize) -> *mut T {
    unsafe { (BASE + OFF[which]) as *mut T }
}
fn get_i(which: usize, i: usize) -> i32 {
    unsafe { *ptr::<i32>(which).add(i) }
}
fn set_i(which: usize, i: usize, v: i32) {
    unsafe { *ptr::<i32>(which).add(i) = v }
}
fn get_f(which: usize, i: usize) -> f64 {
    unsafe { *ptr::<f64>(which).add(i) }
}
fn set_f(which: usize, i: usize, v: f64) {
    unsafe { *ptr::<f64>(which).add(i) = v }
}

#[cfg(target_arch = "wasm32")]
fn grow(bytes: usize) -> bool {
    unsafe {
        if bytes <= CAPACITY {
            return true;
        }
        let pages = (bytes - CAPACITY + PAGE - 1) / PAGE;
        let old = core::arch::wasm32::memory_grow(0, pages);
        if old == usize::MAX {
            return false;
        }
        if CAPACITY == 0 {
            BASE = old * PAGE;
        }
        CAPACITY += pages * PAGE;
        true
    }
}
#[cfg(not(target_arch = "wasm32"))]
fn grow(bytes: usize) -> bool {
    // Tests on the host: a leaked buffer is enough.
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

/// Lays out the arrays for one scan and returns 1, or 0 where memory could not be had. Then the caller writes the
/// inputs at `scan_ptr(which)`.
#[unsafe(no_mangle)]
pub extern "C" fn scan_prepare(
    n: u32,
    places: u32,
    bins: u32,
    centers: u32,
    circles: u32,
    order: u32,
    replications: u32,
) -> u32 {
    let s = Shape {
        n: n as usize,
        places: places as usize,
        bins: bins as usize,
        centers: centers as usize,
        circles: circles as usize,
        order: order as usize,
        replications: replications as usize,
    };
    let sizes: [usize; 15] = [
        4 * s.n,
        4 * s.n,
        4 * (s.centers + 1),
        4 * (s.centers + 1),
        4 * s.order,
        4 * s.circles,
        8 * s.circles,
        4 * s.places * s.bins,
        8 * s.bins,
        8 * (s.bins + 1),
        4 * s.bins,
        8 * (s.bins + 1),
        4 * s.bins,
        4 * s.n,
        8 * s.replications,
    ];
    let mut at = 0usize;
    let mut offsets = [0usize; 16];
    for (i, size) in sizes.iter().enumerate() {
        at = (at + 7) & !7;
        offsets[i] = at;
        at += size;
    }
    if !grow(at + 8) {
        return 0;
    }
    unsafe {
        OFF = offsets;
        SHAPE = s;
    }
    1
}

/// Where array `which` starts in the module's memory, for the caller to write or read.
#[unsafe(no_mangle)]
pub extern "C" fn scan_ptr(which: u32) -> u32 {
    unsafe { (BASE + OFF[which as usize]) as u32 }
}

/// The log likelihood ratio of the space-time permutation model, as `llrOf`.
fn llr(c: f64, e: f64, n: f64) -> f64 {
    if !(c > e) || e <= 0.0 || e >= n {
        return 0.0;
    }
    c * log(c / e) + if n - c > 0.0 { (n - c) * log((n - c) / (n - e)) } else { 0.0 }
}

/// mulberry32, as `mulberry32` in src/space-time-scan.ts: the same numbers from the same seed.
fn next() -> f64 {
    unsafe {
        RNG = RNG.wrapping_add(0x6d2b_79f5);
        let mut v = RNG;
        v = (v ^ (v >> 15)).wrapping_mul(v | 1);
        v ^= v.wrapping_add((v ^ (v >> 7)).wrapping_mul(v | 61));
        ((v ^ (v >> 14)) as f64) / 4_294_967_296.0
    }
}

/// One assignment of cases to bins, scored: the highest score anywhere, as `scan` without the windows kept.
fn score(longest: usize, prospective: bool) -> f64 {
    let s = unsafe { SHAPE };
    let (n, bins) = (s.n, s.bins);
    for i in 0..s.places * bins {
        set_i(PLACE_BIN, i, 0);
    }
    for t in 0..bins {
        set_f(PER_BIN, t, 0.0);
    }
    for i in 0..n {
        let p = get_i(CASE_PLACE, i) as usize;
        let b = get_i(SHUFFLED, i) as usize;
        set_i(PLACE_BIN, p * bins + b, get_i(PLACE_BIN, p * bins + b) + 1);
        set_f(PER_BIN, b, get_f(PER_BIN, b) + 1.0);
    }
    set_f(TIME_TOTALS, 0, 0.0);
    for t in 0..bins {
        set_f(TIME_TOTALS, t + 1, get_f(TIME_TOTALS, t) + get_f(PER_BIN, t));
    }
    let nf = n as f64;
    let last = bins - 1;
    let mut best = 0.0f64;
    for center in 0..s.centers {
        for t in 0..bins {
            set_i(ACC, t, 0);
        }
        let order_at = get_i(CENTER_ORDER, center) as usize;
        let mut taken = 0usize;
        for circle in get_i(CENTER_START, center) as usize..get_i(CENTER_START, center + 1) as usize {
            let size = get_i(CIRCLE_SIZE, circle) as usize;
            while taken < size {
                let p = get_i(ORDER, order_at + taken) as usize;
                taken += 1;
                for t in 0..bins {
                    set_i(ACC, t, get_i(ACC, t) + get_i(PLACE_BIN, p * bins + t));
                }
            }
            set_f(PREFIX, 0, 0.0);
            for t in 0..bins {
                set_f(PREFIX, t + 1, get_f(PREFIX, t) + get_i(ACC, t) as f64);
            }
            let mut k = 0usize;
            for t in 0..bins {
                if get_i(ACC, t) > 0 {
                    set_i(OCCUPIED, k, t as i32);
                    k += 1;
                }
            }
            let share = get_f(CIRCLE_SHARE, circle);
            let mut own = 0.0f64;
            for i in 0..k {
                let a = get_i(OCCUPIED, i) as usize;
                if prospective && last - a >= longest {
                    continue;
                }
                let from = if prospective { k - 1 } else { i };
                for j in from..k {
                    let b = if prospective { last } else { get_i(OCCUPIED, j) as usize };
                    if b - a >= longest {
                        break;
                    }
                    let c = get_f(PREFIX, b + 1) - get_f(PREFIX, a);
                    let e = share * (get_f(TIME_TOTALS, b + 1) - get_f(TIME_TOTALS, a));
                    if c <= e {
                        continue;
                    }
                    let l = llr(c, e, nf);
                    if l > own {
                        own = l;
                    }
                }
            }
            if own > best {
                best = own;
            }
        }
    }
    best
}

/// Starts the test: the stream at `seed`, the shuffled bins as observed, nothing run.
#[unsafe(no_mangle)]
pub extern "C" fn scan_begin(seed: u32) {
    unsafe {
        RNG = seed;
        DONE = 0;
        ABOVE = 0;
    }
    let n = unsafe { SHAPE.n };
    for i in 0..n {
        set_i(SHUFFLED, i, get_i(CASE_BIN, i));
    }
}

/// Runs up to `count` more shuffles, writing each one's highest score to the maxima. Returns the shuffles run so far,
/// and stops there, early, once `stop_after` of them have scored at least as high as `top` (0: never).
#[unsafe(no_mangle)]
pub extern "C" fn scan_run(count: u32, top: f64, stop_after: u32, longest: u32, prospective: u32) -> u32 {
    let s = unsafe { SHAPE };
    let n = s.n;
    let mut done = unsafe { DONE } as usize;
    let until = core::cmp::min(s.replications, done + count as usize);
    while done < until {
        let mut i = n - 1;
        while i > 0 {
            let j = floor(next() * (i as f64 + 1.0)) as usize;
            let t = get_i(SHUFFLED, i);
            set_i(SHUFFLED, i, get_i(SHUFFLED, j));
            set_i(SHUFFLED, j, t);
            i -= 1;
        }
        let m = score(longest as usize, prospective != 0);
        set_f(MAXIMA, done, m);
        done += 1;
        if stop_after > 0 && m + 1e-9 >= top {
            unsafe {
                ABOVE += 1;
                if ABOVE >= stop_after {
                    DONE = done as u32;
                    return done as u32 | 0x8000_0000;
                }
            }
        }
    }
    unsafe { DONE = done as u32 };
    done as u32
}
