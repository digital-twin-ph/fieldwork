//! TRAVEL TIME OVER A FRICTION SURFACE: from every cell of a grid to the nearest of a set of places (health facilities),
//! the least time over the surface (TODO, travel time to care for Nigeria microplanning, 2026-11-22). Measured here first,
//! in 64-bit arithmetic over 32-bit stores; a WebGPU path is wanted only where this is too slow.
//!
//! The method is the one the Malaria Atlas Project's travel-time maps use (Weiss et al. 2018, 2020; R's gdistance):
//! each cell joins its 8 neighbours, a step costs its length times the mean of the two cells' friction, and the least
//! total is found by Dijkstra's algorithm from all the places at once. Friction is in minutes per metre; a cell whose
//! friction is not a finite number at or above 0 cannot be crossed (water, outside the area).
//!
//! The grid is a geographic one: a cell's height in metres is the same in every row, its width shrinks with latitude, so
//! the width is given for the top and the bottom rows and taken as linear between (to well under 0.1% over a state).
//!
//! Memory is fixed before the run, 16 bytes a cell: the friction and the times (f32), and an indexed heap (u32 cells and
//! u32 positions), so a cell is in the heap once and its time is lowered in place.

const PAGE: usize = 65_536;
const NOT_IN_HEAP: u32 = u32::MAX;
const DONE: u32 = u32::MAX - 1;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
static mut WIDTH: usize = 0;
static mut HEIGHT: usize = 0;

// After BASE: f32[n] friction, f32[n] times, u32[n] heap, u32[n] positions.
fn cells() -> usize {
    unsafe { WIDTH * HEIGHT }
}
fn friction_ptr() -> *mut f32 {
    unsafe { BASE as *mut f32 }
}
fn time_ptr() -> *mut f32 {
    unsafe { (BASE + cells() * 4) as *mut f32 }
}
fn heap_ptr() -> *mut u32 {
    unsafe { (BASE + cells() * 8) as *mut u32 }
}
fn position_ptr() -> *mut u32 {
    unsafe { (BASE + cells() * 12) as *mut u32 }
}

#[cfg(target_arch = "wasm32")]
fn grow(bytes: usize) -> bool {
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

/// Room for a `width` × `height` grid; 1, or 0 where memory could not be had.
#[unsafe(no_mangle)]
pub extern "C" fn travel_prepare(width: u32, height: u32) -> u32 {
    let n = width as usize * height as usize;
    if n == 0 || n >= DONE as usize || !grow(n * 16) {
        return 0;
    }
    unsafe {
        WIDTH = width as usize;
        HEIGHT = height as usize;
    }
    1
}

/// Where the friction (0) or the times (1) are, for the caller to fill or read.
#[unsafe(no_mangle)]
pub extern "C" fn travel_ptr(which: u32) -> usize {
    if which == 0 { friction_ptr() as usize } else { time_ptr() as usize }
}

/// The heap reads the times through a raw pointer, since the run lowers them while cells are in it.
struct Heap<'a> {
    cells: &'a mut [u32],
    position: &'a mut [u32],
    time: *const f32,
    len: usize,
}
impl Heap<'_> {
    fn less(&self, a: usize, b: usize) -> bool {
        unsafe { *self.time.add(self.cells[a] as usize) < *self.time.add(self.cells[b] as usize) }
    }
    fn swap(&mut self, a: usize, b: usize) {
        self.cells.swap(a, b);
        self.position[self.cells[a] as usize] = a as u32;
        self.position[self.cells[b] as usize] = b as u32;
    }
    fn up(&mut self, mut i: usize) {
        while i > 0 {
            let parent = (i - 1) / 2;
            if !self.less(i, parent) {
                break;
            }
            self.swap(i, parent);
            i = parent;
        }
    }
    fn down(&mut self, mut i: usize) {
        loop {
            let (l, r) = (2 * i + 1, 2 * i + 2);
            let mut least = i;
            if l < self.len && self.less(l, least) {
                least = l;
            }
            if r < self.len && self.less(r, least) {
                least = r;
            }
            if least == i {
                break;
            }
            self.swap(i, least);
            i = least;
        }
    }
    fn push(&mut self, cell: u32) {
        self.cells[self.len] = cell;
        self.position[cell as usize] = self.len as u32;
        self.len += 1;
        self.up(self.len - 1);
    }
    fn pop(&mut self) -> u32 {
        let top = self.cells[0];
        self.len -= 1;
        if self.len > 0 {
            self.cells[0] = self.cells[self.len];
            self.position[self.cells[0] as usize] = 0;
            self.down(0);
        }
        self.position[top as usize] = DONE;
        top
    }
}

/// The least time from every cell to the nearest place, into the times. Before the run the caller sets each place's cell
/// to its starting time (0, or the time already spent getting there) and every other cell to anything not finite; after
/// it, a cell nothing reaches is +∞. Returns the cells reached, or u32::MAX for a cell size not above 0.
#[unsafe(no_mangle)]
pub extern "C" fn travel_run(cell_height_m: f64, top_width_m: f64, bottom_width_m: f64) -> u32 {
    if !(cell_height_m > 0.0 && top_width_m > 0.0 && bottom_width_m > 0.0) {
        return u32::MAX;
    }
    let (w, h, n) = unsafe { (WIDTH, HEIGHT, cells()) };
    let friction = unsafe { core::slice::from_raw_parts(friction_ptr(), n) };
    let time = unsafe { core::slice::from_raw_parts_mut(time_ptr(), n) };
    let heap_cells = unsafe { core::slice::from_raw_parts_mut(heap_ptr(), n) };
    let position = unsafe { core::slice::from_raw_parts_mut(position_ptr(), n) };
    let passable = |f: f32| f.is_finite() && f >= 0.0;
    for p in position.iter_mut() {
        *p = NOT_IN_HEAP;
    }
    for t in time.iter_mut() {
        if !(t.is_finite() && *t >= 0.0) {
            *t = f32::INFINITY;
        }
    }
    // The places, each a start; one on a cell that cannot be crossed starts nothing.
    let time_raw = time.as_mut_ptr();
    let mut heap = Heap { cells: heap_cells, position, time: time_raw, len: 0 };
    for i in 0..n {
        let t = unsafe { *time_raw.add(i) };
        if t.is_finite() {
            if passable(friction[i]) {
                heap.push(i as u32);
            } else {
                unsafe { *time_raw.add(i) = f32::INFINITY };
            }
        }
    }
    let width_at = |row: usize| -> f64 {
        if h < 2 { top_width_m } else { top_width_m + (bottom_width_m - top_width_m) * row as f64 / (h - 1) as f64 }
    };
    let mut reached = 0u32;
    while heap.len > 0 {
        let cell = heap.pop() as usize;
        reached += 1;
        let base = unsafe { *time_raw.add(cell) } as f64;
        let (row, col) = (cell / w, cell % w);
        let here = friction[cell] as f64;
        for dr in [-1isize, 0, 1] {
            let r = row as isize + dr;
            if r < 0 || r >= h as isize {
                continue;
            }
            // The step's width is the mean of the two rows' widths, its height the cell height.
            let dx = 0.5 * (width_at(row) + width_at(r as usize));
            for dc in [-1isize, 0, 1] {
                if dr == 0 && dc == 0 {
                    continue;
                }
                let c = col as isize + dc;
                if c < 0 || c >= w as isize {
                    continue;
                }
                let next = r as usize * w + c as usize;
                if heap.position[next] == DONE {
                    continue;
                }
                let there = friction[next];
                if !passable(there) {
                    continue;
                }
                let length = match (dr != 0, dc != 0) {
                    (true, true) => libm::sqrt(dx * dx + cell_height_m * cell_height_m),
                    (true, false) => cell_height_m,
                    _ => dx,
                };
                let candidate = (base + length * 0.5 * (here + there as f64)) as f32;
                let held = unsafe { *time_raw.add(next) };
                if candidate < held {
                    unsafe { *time_raw.add(next) = candidate };
                    if heap.position[next] == NOT_IN_HEAP {
                        heap.push(next as u32);
                    } else {
                        let at = heap.position[next] as usize;
                        heap.up(at);
                    }
                }
            }
        }
    }
    reached
}

#[cfg(test)]
mod tests {
    use super::*;
    extern crate std;
    // The kernel's memory is one static region, so the tests take turns.
    static TURN: std::sync::Mutex<()> = std::sync::Mutex::new(());
    fn run(w: u32, h: u32, friction: &[f32], starts: &[(usize, f32)], size: (f64, f64, f64)) -> (u32, std::vec::Vec<f32>) {
        let _turn = TURN.lock().unwrap_or_else(|e| e.into_inner());
        assert_eq!(travel_prepare(w, h), 1);
        let n = (w * h) as usize;
        unsafe {
            core::slice::from_raw_parts_mut(friction_ptr(), n).copy_from_slice(friction);
            let t = core::slice::from_raw_parts_mut(time_ptr(), n);
            for v in t.iter_mut() {
                *v = f32::INFINITY;
            }
            for &(i, v) in starts {
                t[i] = v;
            }
        }
        let reached = travel_run(size.0, size.1, size.2);
        (reached, unsafe { core::slice::from_raw_parts(time_ptr(), n) }.to_vec())
    }
    #[test]
    fn uniform_friction_gives_the_eight_neighbour_distance() {
        // 1 minute per 100 m, 100 m cells: a straight step is 1 minute, a diagonal √2.
        let f = [0.01f32; 25];
        let (reached, t) = run(5, 5, &f, &[(12, 0.0)], (100.0, 100.0, 100.0));
        assert_eq!(reached, 25);
        assert!((t[13] - 1.0).abs() < 1e-5);
        assert!((t[18] - core::f32::consts::SQRT_2).abs() < 1e-5);
        // Two cells away along a knight's line: one diagonal and one straight step.
        assert!((t[14 + 5] - (1.0 + core::f32::consts::SQRT_2)).abs() < 1e-5);
    }
    #[test]
    fn a_wall_is_gone_round_and_a_cell_nothing_reaches_is_infinite() {
        // A wall down column 2 with one gap at the bottom; an island cut off at the corner.
        let mut f = [0.01f32; 25];
        for r in 0..4 {
            f[r * 5 + 2] = f32::NAN;
        }
        let (_, t) = run(5, 5, &f, &[(0, 0.0)], (100.0, 100.0, 100.0));
        assert!(t[2].is_infinite());
        assert!(t[4] > 4.0, "round the wall, not through it: {}", t[4]);
        let mut g = [0.01f32; 9];
        g[1] = f32::NAN;
        g[3] = f32::NAN;
        g[4] = f32::NAN;
        let (reached, t) = run(3, 3, &g, &[(8, 0.0)], (100.0, 100.0, 100.0));
        assert!(t[0].is_infinite(), "the corner is cut off by the three walls");
        assert_eq!(reached, 5);
    }
    #[test]
    fn the_nearest_place_wins_and_a_start_time_carries() {
        let f = [0.01f32; 10];
        let (_, t) = run(10, 1, &f, &[(0, 0.0), (9, 5.0)], (100.0, 100.0, 100.0));
        assert!((t[4] - 4.0).abs() < 1e-5);
        assert!((t[8] - 6.0).abs() < 1e-5, "the far place started 5 minutes late: {}", t[8]);
    }
    #[test]
    fn a_narrower_row_is_crossed_faster() {
        let f = [0.01f32; 6];
        // Bottom row 50 m wide: its far cell is two half-minute steps away; the top row's far cell is nearer by the bottom
        // row and one diagonal (0.5 + √(75² + 100²)/100 = 1.75) than by its own two 100 m steps (2).
        let (_, t) = run(3, 2, &f, &[(0, 0.0), (3, 0.0)], (100.0, 100.0, 50.0));
        assert!((t[5] - 1.0).abs() < 1e-5);
        assert!((t[2] - 1.75).abs() < 1e-5, "{}", t[2]);
    }
}
