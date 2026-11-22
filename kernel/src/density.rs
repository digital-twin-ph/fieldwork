//! A KERNEL DENSITY SURFACE: points spread onto a grid by a quartic kernel of a stated bandwidth (experiment 225's spike,
//! 2026-11-22). The reference the WebGPU path is held to: computed here in 64-bit, point by point, each point adding to
//! the cells whose centres lie within the bandwidth of it.
//!
//! Coordinates are the grid's own: x from the left edge, y from the top, one unit a cell, so a cell's centre is at
//! (column + 0.5, row + 0.5). The bandwidth is in cells. A point's contribution to a cell at distance d < h is
//! 3 / (π h²) · (1 − (d/h)²)², which integrates to one over the plane: the quartic (biweight) kernel, as QGIS's heatmap
//! and most GIS kernel density tools use. A point's weight multiplies it.

const PAGE: usize = 65_536;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
static mut POINTS: usize = 0;
static mut WIDTH: usize = 0;
static mut HEIGHT: usize = 0;

// The arrays, after BASE: f64[points*3] (x, y, weight), then f64[width*height] (the grid).
fn points_ptr() -> *mut f64 {
    unsafe { BASE as *mut f64 }
}
fn grid_ptr() -> *mut f64 {
    unsafe { (BASE + POINTS * 3 * 8) as *mut f64 }
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

/// Room for `points` points and a `width` × `height` grid; 1, or 0 where memory could not be had.
#[unsafe(no_mangle)]
pub extern "C" fn density_prepare(points: u32, width: u32, height: u32) -> u32 {
    let bytes = (points as usize * 3 + width as usize * height as usize) * 8;
    if !grow(bytes) {
        return 0;
    }
    unsafe {
        POINTS = points as usize;
        WIDTH = width as usize;
        HEIGHT = height as usize;
    }
    1
}

/// Where the points (0) or the grid (1) are, for the caller to fill or read.
#[unsafe(no_mangle)]
pub extern "C" fn density_ptr(which: u32) -> usize {
    if which == 0 { points_ptr() as usize } else { grid_ptr() as usize }
}

/// The surface, into the grid. Returns the number of points that added to it, or u32::MAX for a bandwidth not above 0.
#[unsafe(no_mangle)]
pub extern "C" fn density_run(bandwidth: f64) -> u32 {
    if !(bandwidth > 0.0) {
        return u32::MAX;
    }
    let (n, w, h) = unsafe { (POINTS, WIDTH, HEIGHT) };
    let grid = unsafe { core::slice::from_raw_parts_mut(grid_ptr(), w * h) };
    let pts = unsafe { core::slice::from_raw_parts(points_ptr(), n * 3) };
    for cell in grid.iter_mut() {
        *cell = 0.0;
    }
    let scale = 3.0 / (core::f64::consts::PI * bandwidth * bandwidth);
    let h2 = bandwidth * bandwidth;
    let mut added = 0u32;
    for i in 0..n {
        let (x, y, weight) = (pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
        if !(x.is_finite() && y.is_finite() && weight.is_finite()) {
            continue;
        }
        let c0 = libm::floor(x - bandwidth - 0.5).max(0.0) as usize;
        let c1 = (libm::ceil(x + bandwidth - 0.5).min(w as f64 - 1.0)).max(-1.0) as isize;
        let r0 = libm::floor(y - bandwidth - 0.5).max(0.0) as usize;
        let r1 = (libm::ceil(y + bandwidth - 0.5).min(h as f64 - 1.0)).max(-1.0) as isize;
        let mut touched = false;
        let mut r = r0 as isize;
        while r <= r1 {
            let dy = r as f64 + 0.5 - y;
            let mut c = c0 as isize;
            while c <= c1 {
                let dx = c as f64 + 0.5 - x;
                let d2 = dx * dx + dy * dy;
                if d2 < h2 {
                    let u = 1.0 - d2 / h2;
                    grid[r as usize * w + c as usize] += weight * scale * u * u;
                    touched = true;
                }
                c += 1;
            }
            r += 1;
        }
        if touched {
            added += 1;
        }
    }
    added
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn one_point_integrates_to_its_weight() {
        assert_eq!(density_prepare(1, 200, 200), 1);
        let pts = unsafe { core::slice::from_raw_parts_mut(points_ptr(), 3) };
        pts.copy_from_slice(&[100.0, 100.0, 2.0]);
        assert_eq!(density_run(20.0), 1);
        let grid = unsafe { core::slice::from_raw_parts(grid_ptr(), 200 * 200) };
        let total: f64 = grid.iter().sum();
        assert!((total - 2.0).abs() < 0.01, "total {total}");
        // The peak is at the point: the cells around it equal, by symmetry.
        assert!((grid[99 * 200 + 99] - grid[100 * 200 + 100]).abs() < 1e-12);
    }
}
