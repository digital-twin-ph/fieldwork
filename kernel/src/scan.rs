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

#[cfg(test)]
mod tests {
    extern crate std;
    use super::*;
    use std::vec::Vec;
    /// The module keeps its arrays in statics, so its tests take turns.
    static TURN: std::sync::Mutex<()> = std::sync::Mutex::new(());

    /// Three places over four bins, nine cases, two centres and three circles: small enough to score by hand. Chosen so
    /// that the best score rises with each window length from one bin to three, retrospective and prospective alike, so a
    /// window bound off by one changes the answer.
    const CASES: [(i32, i32); 9] = [(0, 1), (0, 2), (0, 2), (0, 2), (0, 3), (0, 3), (1, 2), (1, 3), (2, 0)];
    const CENTER_STARTS: [i32; 3] = [0, 2, 3];
    const CENTER_ORDERS: [i32; 3] = [0, 3, 5];
    const ORDERS: [i32; 5] = [0, 1, 2, 1, 2];
    const SIZES: [i32; 3] = [1, 2, 1];
    /// Each circle's places, as the order and sizes above make them.
    const CIRCLES: [&[i32]; 3] = [&[0], &[0, 1], &[1]];

    fn prepare(replications: u32) {
        let n = CASES.len();
        assert_eq!(scan_prepare(n as u32, 3, 4, 2, 3, 5, replications), 1);
        for (i, &(p, b)) in CASES.iter().enumerate() {
            set_i(CASE_PLACE, i, p);
            set_i(CASE_BIN, i, b);
        }
        for (i, v) in CENTER_STARTS.iter().enumerate() {
            set_i(CENTER_START, i, *v);
        }
        for (i, v) in CENTER_ORDERS.iter().enumerate() {
            set_i(CENTER_ORDER, i, *v);
        }
        for (i, v) in ORDERS.iter().enumerate() {
            set_i(ORDER, i, *v);
        }
        for (i, places) in CIRCLES.iter().enumerate() {
            set_i(CIRCLE_SIZE, i, SIZES[i]);
            let inside = CASES.iter().filter(|(p, _)| places.contains(p)).count();
            set_f(CIRCLE_SHARE, i, inside as f64 / n as f64);
        }
    }

    /// The highest score the slow way: every circle against every window of at most `longest` bins, the
    /// prospective ones ending on the last bin. The kernel only tries windows that start and end on a bin the circle
    /// has a case in; a window widened past those holds the same cases and expects more, so it cannot score higher.
    fn brute(bins: &[i32], longest: usize, prospective: bool) -> f64 {
        let n = CASES.len() as f64;
        let last = 3usize;
        let mut best = 0.0f64;
        for places in CIRCLES {
            let share = CASES.iter().filter(|(p, _)| places.contains(p)).count() as f64 / n;
            for a in 0..=last {
                for b in a..=last {
                    if b - a + 1 > longest || (prospective && b != last) {
                        continue;
                    }
                    let within = |t: i32| (a as i32..=b as i32).contains(&t);
                    let c = CASES.iter().zip(bins).filter(|((p, _), t)| places.contains(p) && within(**t)).count();
                    let total = bins.iter().filter(|t| within(**t)).count();
                    best = best.max(llr(c as f64, share * total as f64, n));
                }
            }
        }
        best
    }

    #[test]
    fn the_stream_is_mulberry32_as_the_script_draws_it() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        // From `mulberry32` in src/space-time-scan.ts, each draw times 2^32.
        let expected: [(u32, [u32; 5]); 3] = [
            (0, [1144304738, 1416247, 958946056, 627933444, 2007157716]),
            (12345, [4207900869, 1317490944, 2079646450, 3513001552, 2187978186]),
            (4294967295, [3850105811, 813802916, 3073704848, 4054706436, 3630262831]),
        ];
        for (seed, draws) in expected {
            unsafe { RNG = seed };
            for d in draws {
                assert_eq!(next() * 4_294_967_296.0, d as f64, "seed {seed}");
            }
        }
    }

    #[test]
    fn the_ratio_is_zero_unless_more_are_observed_than_expected() {
        assert_eq!(llr(2.0, 2.0, 9.0), 0.0);
        assert_eq!(llr(1.0, 2.0, 9.0), 0.0);
        assert_eq!(llr(3.0, 0.0, 9.0), 0.0);
        assert_eq!(llr(9.0, 9.0, 9.0), 0.0);
        let (c, e, n) = (4.0f64, 1.5f64, 9.0f64);
        let by_hand = c * (c / e).ln() + (n - c) * ((n - c) / (n - e)).ln();
        assert!((llr(c, e, n) - by_hand).abs() < 1e-12);
    }

    #[test]
    fn the_observed_score_is_the_best_window_anywhere() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        prepare(5);
        scan_begin(1);
        let observed: Vec<i32> = CASES.iter().map(|(_, b)| *b).collect();
        for longest in 1..=4 {
            for prospective in [false, true] {
                let got = score(longest, prospective);
                let want = brute(&observed, longest, prospective);
                assert!((got - want).abs() < 1e-12, "longest {longest}, prospective {prospective}: {got} against {want}");
            }
        }
        for prospective in [false, true] {
            assert!(score(1, prospective) < score(2, prospective) && score(2, prospective) < score(3, prospective),
                "the fixture's best window is three bins long, so each bound below it scores less");
        }
    }

    #[test]
    fn a_shuffle_moves_dates_between_cases_and_keeps_every_date() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        prepare(20);
        scan_begin(12345);
        assert_eq!(scan_run(20, f64::MAX, 0, 2, 0), 20);
        let mut shuffled: Vec<i32> = (0..CASES.len()).map(|i| get_i(SHUFFLED, i)).collect();
        let mut observed: Vec<i32> = CASES.iter().map(|(_, b)| *b).collect();
        let moved = shuffled != observed;
        shuffled.sort();
        observed.sort();
        assert_eq!(shuffled, observed, "the same dates, reassigned");
        assert!(moved, "twenty shuffles moved something");
        // Each maximum is the score of its own shuffle, so none exceeds the best a window can give any assignment.
        for i in 0..20 {
            let m = get_f(MAXIMA, i);
            assert!(m >= 0.0 && m.is_finite());
        }
    }

    #[test]
    fn the_same_seed_gives_the_same_maxima() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        prepare(30);
        let run = |seed: u32| {
            scan_begin(seed);
            // In two batches, as the caller runs it, so the stream carries across calls.
            scan_run(12, f64::MAX, 0, 3, 0);
            scan_run(18, f64::MAX, 0, 3, 0);
            (0..30).map(|i| get_f(MAXIMA, i)).collect::<Vec<f64>>()
        };
        let a = run(99);
        assert_eq!(a, run(99));
        assert_ne!(a, run(100), "another seed shuffles otherwise");
    }

    #[test]
    fn it_stops_early_and_says_so() {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        prepare(10);
        // Every shuffle scores at least 0, so a top of 0 is met at once.
        scan_begin(7);
        assert_eq!(scan_run(10, 0.0, 1, 2, 0), 1 | 0x8000_0000);
        scan_begin(7);
        assert_eq!(scan_run(10, 0.0, 3, 2, 0), 3 | 0x8000_0000);
        // A top no shuffle reaches runs them all, unflagged; so does a stop of 0.
        scan_begin(7);
        assert_eq!(scan_run(10, f64::MAX, 1, 2, 0), 10);
        scan_begin(7);
        assert_eq!(scan_run(10, 0.0, 0, 2, 0), 10);
    }
}
