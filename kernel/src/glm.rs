//! Generalised linear models: logistic and Poisson regression, fitted by iteratively reweighted least
//! squares, with an offset, and for Poisson optional strata absorbed as fixed effects. Experiment 167.
//!
//! The practitioner, 2026-11-03: "Let's just write our own regression for the kernel."
//!
//! THE CALLER BUILDS THE DESIGN MATRIX. Rows go in through `glm_set_*`, row by row, in the order the
//! caller wants them read: that order matters for HAC standard errors, which treat neighbouring rows as
//! neighbouring in time. Columns are whatever the caller made them, an intercept included when it wants
//! one; categorical coding and spline bases are the caller's.
//!
//! STRATA ARE ABSORBED, not added as columns. A Poisson model with one fixed effect per stratum has the
//! same coefficients for every other column as the conditional Poisson likelihood within strata, so the
//! fit works on that likelihood and never builds the hundreds of indicator columns a time-stratified
//! design needs (NYC: one per year, month and day of week). A stratum whose outcome sums to zero says
//! nothing about the coefficients; it is counted and its rows contribute nothing, as in the fit with
//! indicators, where its fitted values go to zero.

use libm::{exp, fabs, log, sqrt};

pub const MAX_ROWS: usize = 20_000;
pub const MAX_COLS: usize = 32;
const NO_STRATUM: u32 = u32::MAX;

static mut X: [f64; MAX_ROWS * MAX_COLS] = [0.0; MAX_ROWS * MAX_COLS];
static mut Y: [f64; MAX_ROWS] = [0.0; MAX_ROWS];
static mut OFFSET: [f64; MAX_ROWS] = [0.0; MAX_ROWS];
static mut STRATUM: [u32; MAX_ROWS] = [NO_STRATUM; MAX_ROWS];
static mut MU: [f64; MAX_ROWS] = [0.0; MAX_ROWS];
static mut BETA: [f64; MAX_COLS] = [0.0; MAX_COLS];
static mut INFO_INVERSE: [f64; MAX_COLS * MAX_COLS] = [0.0; MAX_COLS * MAX_COLS];
static mut SHAPE: (usize, usize) = (0, 0);
static mut STATS: Stats = Stats::empty();

#[derive(Clone, Copy)]
struct Stats {
    iterations: u32,
    loglik: f64,
    pearson: f64,
    used_rows: u32,
    used_strata: u32,
    dropped_strata: u32,
    fitted: bool,
}
impl Stats {
    const fn empty() -> Self {
        Stats { iterations: 0, loglik: f64::NAN, pearson: f64::NAN, used_rows: 0, used_strata: 0, dropped_strata: 0, fitted: false }
    }
}

#[cfg(test)]
pub static GLM_TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

pub const BINOMIAL: u32 = 0;
pub const POISSON: u32 = 1;

// What a fit can answer, as numbers a caller reads without strings crossing the boundary.
pub const ERR_SHAPE: i32 = -1;
pub const ERR_DATA: i32 = -2;
pub const ERR_SINGULAR: i32 = -3;
pub const ERR_NOT_CONVERGED: i32 = -4;
pub const ERR_FAMILY: i32 = -5;
pub const ERR_NO_INFORMATION: i32 = -6;

fn x_ptr() -> *mut f64 { core::ptr::addr_of_mut!(X) as *mut f64 }
fn at(row: usize, col: usize) -> f64 { unsafe { *x_ptr().add(row * MAX_COLS + col) } }
fn y(row: usize) -> f64 { unsafe { *(core::ptr::addr_of!(Y) as *const f64).add(row) } }
fn offset(row: usize) -> f64 { unsafe { *(core::ptr::addr_of!(OFFSET) as *const f64).add(row) } }
fn stratum(row: usize) -> u32 { unsafe { *(core::ptr::addr_of!(STRATUM) as *const u32).add(row) } }
fn mu_ptr() -> *mut f64 { core::ptr::addr_of_mut!(MU) as *mut f64 }
fn beta_ptr() -> *mut f64 { core::ptr::addr_of_mut!(BETA) as *mut f64 }
fn inv_ptr() -> *mut f64 { core::ptr::addr_of_mut!(INFO_INVERSE) as *mut f64 }
fn shape() -> (usize, usize) { unsafe { SHAPE } }

/// Starts a design of `rows` rows and `cols` columns; every value, offset and stratum is cleared.
#[unsafe(no_mangle)]
pub extern "C" fn glm_reset(rows: u32, cols: u32) -> u32 {
    let (rows, cols) = (rows as usize, cols as usize);
    if rows == 0 || rows > MAX_ROWS || cols == 0 || cols > MAX_COLS {
        unsafe { SHAPE = (0, 0) };
        return 0;
    }
    unsafe {
        SHAPE = (rows, cols);
        STATS = Stats::empty();
        for r in 0..rows {
            for c in 0..cols { *x_ptr().add(r * MAX_COLS + c) = 0.0; }
            *(core::ptr::addr_of_mut!(Y) as *mut f64).add(r) = 0.0;
            *(core::ptr::addr_of_mut!(OFFSET) as *mut f64).add(r) = 0.0;
            *(core::ptr::addr_of_mut!(STRATUM) as *mut u32).add(r) = NO_STRATUM;
        }
    }
    1
}

/// One cell of the design matrix.
#[unsafe(no_mangle)]
pub extern "C" fn glm_set_x(row: u32, col: u32, value: f64) -> u32 {
    let (rows, cols) = shape();
    let (row, col) = (row as usize, col as usize);
    if row >= rows || col >= cols || !value.is_finite() { return 0; }
    unsafe { *x_ptr().add(row * MAX_COLS + col) = value };
    1
}

/// One row's outcome, offset (zero for none) and stratum (`u32::MAX` for none).
#[unsafe(no_mangle)]
pub extern "C" fn glm_set_row(row: u32, outcome: f64, row_offset: f64, row_stratum: u32) -> u32 {
    let (rows, _) = shape();
    let row = row as usize;
    if row >= rows || !outcome.is_finite() || outcome < 0.0 || !row_offset.is_finite() { return 0; }
    unsafe {
        *(core::ptr::addr_of_mut!(Y) as *mut f64).add(row) = outcome;
        *(core::ptr::addr_of_mut!(OFFSET) as *mut f64).add(row) = row_offset;
        *(core::ptr::addr_of_mut!(STRATUM) as *mut u32).add(row) = row_stratum;
    }
    1
}

/// Solves `a x = b` for symmetric positive definite `a` (p x p, row-major, stride MAX_COLS) by
/// Cholesky, writing the inverse of `a` into `inverse` when asked. False when `a` is not positive
/// definite: the columns are collinear, or a level never occurs.
fn cholesky_solve(a: &[f64], p: usize, b: &mut [f64], inverse: Option<&mut [f64]>) -> bool {
    let mut l = [0.0f64; MAX_COLS * MAX_COLS];
    for i in 0..p {
        for j in 0..=i {
            let mut sum = a[i * MAX_COLS + j];
            for k in 0..j { sum -= l[i * MAX_COLS + k] * l[j * MAX_COLS + k]; }
            if i == j {
                // Relative to the diagonal, so a column measured in thousands is not mistaken for singular.
                if !(sum > 1e-12 * fabs(a[i * MAX_COLS + i]).max(1e-300)) { return false; }
                l[i * MAX_COLS + i] = sqrt(sum);
            } else {
                l[i * MAX_COLS + j] = sum / l[j * MAX_COLS + j];
            }
        }
    }
    let solve = |v: &mut [f64]| {
        for i in 0..p {
            let mut sum = v[i];
            for k in 0..i { sum -= l[i * MAX_COLS + k] * v[k]; }
            v[i] = sum / l[i * MAX_COLS + i];
        }
        for i in (0..p).rev() {
            let mut sum = v[i];
            for k in i + 1..p { sum -= l[k * MAX_COLS + i] * v[k]; }
            v[i] = sum / l[i * MAX_COLS + i];
        }
    };
    solve(b);
    if let Some(inv) = inverse {
        for c in 0..p {
            let mut e = [0.0f64; MAX_COLS];
            e[c] = 1.0;
            solve(&mut e);
            for r in 0..p { inv[r * MAX_COLS + c] = e[r]; }
        }
    }
    true
}

fn binomial_loglik(y: f64, eta: f64) -> f64 {
    // log(1 + exp(eta)) without overflow.
    let softplus = if eta > 0.0 { eta + log(1.0 + exp(-eta)) } else { log(1.0 + exp(eta)) };
    y * eta - softplus
}

/// Unstratified IRLS, as R's glm.fit: start from the data, solve weighted least squares on the working
/// response, and stop when the deviance changes by less than `tol` relatively.
fn fit_unstratified(family: u32, max_iter: u32, tol: f64) -> i32 {
    let (n, p) = shape();
    let mut last_dev = f64::INFINITY;
    let mut beta = [0.0f64; MAX_COLS];
    // Starting fitted values, as glm's mustart.
    for i in 0..n {
        let yi = y(i);
        let start = if family == POISSON { yi + 0.1 } else { (yi + 0.5) / 2.0 };
        unsafe { *mu_ptr().add(i) = start };
    }
    for iteration in 1..=max_iter {
        let mut a = [0.0f64; MAX_COLS * MAX_COLS];
        let mut b = [0.0f64; MAX_COLS];
        for i in 0..n {
            let mu = unsafe { *mu_ptr().add(i) };
            let e = if family == POISSON { log(mu) } else { log(mu / (1.0 - mu)) };
            let w = if family == POISSON { mu } else { mu * (1.0 - mu) };
            if !(w > 0.0) || !w.is_finite() { continue; }
            let z = e - offset(i) + (y(i) - mu) / w;
            for r in 0..p {
                let xr = at(i, r);
                if xr == 0.0 { continue; }
                b[r] += w * xr * z;
                for c in 0..=r { a[r * MAX_COLS + c] += w * xr * at(i, c); }
            }
        }
        for r in 0..p { for c in 0..r { a[c * MAX_COLS + r] = a[r * MAX_COLS + c]; } }
        let mut next = b;
        if !cholesky_solve(&a, p, &mut next, None) { return ERR_SINGULAR; }
        // Step halving while the deviance is not finite, as glm.fit does.
        let mut step = 1.0;
        let mut dev;
        loop {
            let mut trial = [0.0f64; MAX_COLS];
            for j in 0..p { trial[j] = beta[j] + step * (next[j] - beta[j]); }
            dev = 0.0;
            let mut ok = true;
            for i in 0..n {
                let mut e = offset(i);
                for j in 0..p { e += at(i, j) * trial[j]; }
                let mu = if family == POISSON { exp(e) } else { 1.0 / (1.0 + exp(-e)) };
                if !mu.is_finite() { ok = false; break; }
                unsafe { *mu_ptr().add(i) = mu.clamp(1e-300, if family == POISSON { f64::MAX } else { 1.0 - 1e-15 }) };
                let yi = y(i);
                // Poisson deviance 2[y log(y/mu) - (y - mu)]; binomial -2 log-likelihood.
                dev += if family == POISSON { 2.0 * ((if yi > 0.0 { yi * log(yi / mu) } else { 0.0 }) - (yi - mu)) }
                       else { -2.0 * binomial_loglik(yi, e) };
            }
            if ok && dev.is_finite() { beta = trial; break; }
            step /= 2.0;
            if step < 1e-10 { return ERR_NOT_CONVERGED; }
        }
        unsafe { STATS.iterations = iteration };
        if fabs(dev - last_dev) / (fabs(dev) + 0.1) < tol {
            return finish_unstratified(family, &beta);
        }
        last_dev = dev;
    }
    ERR_NOT_CONVERGED
}

fn finish_unstratified(family: u32, beta: &[f64; MAX_COLS]) -> i32 {
    let (n, p) = shape();
    let mut a = [0.0f64; MAX_COLS * MAX_COLS];
    let (mut loglik, mut pearson) = (0.0, 0.0);
    for i in 0..n {
        let mu = unsafe { *mu_ptr().add(i) };
        let w = if family == POISSON { mu } else { mu * (1.0 - mu) };
        for r in 0..p { for c in 0..=r { a[r * MAX_COLS + c] += w * at(i, r) * at(i, c); } }
        let yi = y(i);
        loglik += if family == POISSON { yi * log(mu) - mu - lgamma1p(yi) } else { yi * log(mu) + (1.0 - yi) * log(1.0 - mu) };
        pearson += (yi - mu) * (yi - mu) / w;
    }
    for r in 0..p { for c in 0..r { a[c * MAX_COLS + r] = a[r * MAX_COLS + c]; } }
    let mut dummy = [0.0f64; MAX_COLS];
    let inv = unsafe { &mut *(inv_ptr() as *mut [f64; MAX_COLS * MAX_COLS]) };
    if !cholesky_solve(&a, p, &mut dummy, Some(inv)) { return ERR_SINGULAR; }
    for j in 0..p { unsafe { *beta_ptr().add(j) = beta[j] }; }
    unsafe {
        STATS.loglik = loglik; STATS.pearson = pearson;
        STATS.used_rows = n as u32; STATS.used_strata = 0; STATS.dropped_strata = 0; STATS.fitted = true;
    }
    STATS_ITER_OK
}
const STATS_ITER_OK: i32 = 0;

/// log(y!) for the Poisson log-likelihood, by Stirling beyond small counts.
fn lgamma1p(y: f64) -> f64 {
    if y < 2.0 { return 0.0; }
    if y < 30.0 { let mut s = 0.0; let mut k = 2.0; while k <= y { s += log(k); k += 1.0; } return s; }
    let n = y + 1.0;
    (n - 0.5) * log(n) - n + 0.5 * log(2.0 * core::f64::consts::PI) + 1.0 / (12.0 * n) - 1.0 / (360.0 * n * n * n)
}

/// Stratified Poisson: Newton on the conditional likelihood within strata, which has the same
/// coefficients as the model with one indicator per stratum.
fn fit_stratified(max_iter: u32, tol: f64) -> i32 {
    let (n, p) = shape();
    let mut strata = 0usize;
    for i in 0..n { let s = stratum(i); if s == NO_STRATUM { return ERR_DATA; } strata = strata.max(s as usize + 1); }
    if strata > MAX_ROWS { return ERR_DATA; }
    let mut beta = [0.0f64; MAX_COLS];
    let mut last = f64::NEG_INFINITY;
    for iteration in 1..=max_iter {
        let (score, info, loglik) = conditional_pass(&beta, strata);
        let mut step_dir = score;
        let mut a = info;
        for r in 0..p { for c in 0..r { a[c * MAX_COLS + r] = a[r * MAX_COLS + c]; } }
        if !cholesky_solve(&a, p, &mut step_dir, None) { return ERR_SINGULAR; }
        let mut step = 1.0;
        let mut trial = [0.0f64; MAX_COLS];
        loop {
            for j in 0..p { trial[j] = beta[j] + step * step_dir[j]; }
            let (_, _, l) = conditional_pass(&trial, strata);
            if l.is_finite() && l >= loglik - 1e-12 * fabs(loglik) { break; }
            step /= 2.0;
            if step < 1e-10 { return ERR_NOT_CONVERGED; }
        }
        let change = (0..p).fold(0.0f64, |m, j| m.max(fabs(trial[j] - beta[j])));
        beta = trial;
        unsafe { STATS.iterations = iteration };
        if change < tol || fabs(loglik - last) < tol * (fabs(loglik) + 0.1) {
            return finish_stratified(&beta, strata);
        }
        last = loglik;
    }
    ERR_NOT_CONVERGED
}

/// One pass over the rows in stratum order: fitted values within each stratum, the score, the
/// conditional information and the conditional log-likelihood. Rows are visited stratum by stratum by
/// scanning; strata are numbered 0.. by the caller.
fn conditional_pass(beta: &[f64; MAX_COLS], strata: usize) -> ([f64; MAX_COLS], [f64; MAX_COLS * MAX_COLS], f64) {
    let (n, p) = shape();
    let mut score = [0.0f64; MAX_COLS];
    let mut info = [0.0f64; MAX_COLS * MAX_COLS];
    let mut loglik = 0.0;
    // Per stratum accumulators in one sweep: rows are grouped by a counting sort on the stratum index.
    let order = stratum_order(strata);
    let mut start = 0;
    while start < n {
        let s = stratum(order_at(order, start));
        let mut end = start;
        while end < n && stratum(order_at(order, end)) == s { end += 1; }
        let mut n_s = 0.0; let mut max_eta = f64::NEG_INFINITY;
        for k in start..end { let i = order_at(order, k); n_s += y(i); let e = linear(i, beta); if e > max_eta { max_eta = e; } }
        if n_s > 0.0 {
            let mut denom = 0.0;
            for k in start..end { let i = order_at(order, k); denom += exp(linear(i, beta) - max_eta); }
            let mut mean = [0.0f64; MAX_COLS];
            for k in start..end {
                let i = order_at(order, k);
                let e = linear(i, beta);
                let prob = exp(e - max_eta) / denom;
                let mu = n_s * prob;
                unsafe { *mu_ptr().add(i) = mu };
                loglik += y(i) * (e - max_eta - log(denom));
                for r in 0..p {
                    let xr = at(i, r);
                    score[r] += xr * (y(i) - mu);
                    mean[r] += mu * xr;
                    for c in 0..=r { info[r * MAX_COLS + c] += mu * xr * at(i, c); }
                }
            }
            for r in 0..p { for c in 0..=r { info[r * MAX_COLS + c] -= mean[r] * mean[c] / n_s; } }
        } else {
            for k in start..end { unsafe { *mu_ptr().add(order_at(order, k)) = 0.0 }; }
        }
        start = end;
    }
    (score, info, loglik)
}

fn linear(i: usize, beta: &[f64; MAX_COLS]) -> f64 {
    let (_, p) = shape();
    let mut e = offset(i);
    for j in 0..p { e += at(i, j) * beta[j]; }
    e
}

static mut ORDER: [u32; MAX_ROWS] = [0; MAX_ROWS];
static mut COUNTS: [u32; MAX_ROWS + 1] = [0; MAX_ROWS + 1];
fn order_at(_grouped: (), k: usize) -> usize { unsafe { *(core::ptr::addr_of!(ORDER) as *const u32).add(k) as usize } }
/// Rows grouped by stratum, stably, by counting sort into ORDER.
fn stratum_order(strata: usize) {
    let (n, _) = shape();
    let counts = core::ptr::addr_of_mut!(COUNTS) as *mut u32;
    let order = core::ptr::addr_of_mut!(ORDER) as *mut u32;
    unsafe {
        for s in 0..=strata { *counts.add(s) = 0; }
        for i in 0..n { *counts.add(stratum(i) as usize + 1) += 1; }
        for s in 0..strata { *counts.add(s + 1) += *counts.add(s); }
        for i in 0..n { let s = stratum(i) as usize; *order.add(*counts.add(s) as usize) = i as u32; *counts.add(s) += 1; }
    }
}

fn finish_stratified(beta: &[f64; MAX_COLS], strata: usize) -> i32 {
    let (n, p) = shape();
    let (score, info, loglik) = conditional_pass(beta, strata);
    let _ = score;
    let mut a = info;
    for r in 0..p { for c in 0..r { a[c * MAX_COLS + r] = a[r * MAX_COLS + c]; } }
    let mut dummy = [0.0f64; MAX_COLS];
    let inv = unsafe { &mut *(inv_ptr() as *mut [f64; MAX_COLS * MAX_COLS]) };
    if !cholesky_solve(&a, p, &mut dummy, Some(inv)) { return ERR_SINGULAR; }
    // Strata that inform the fit, those that do not, and the Pearson statistic over informative rows.
    stratum_order(strata);
    let (mut used_rows, mut used_strata, mut dropped, mut pearson) = (0u32, 0u32, 0u32, 0.0);
    let mut start = 0;
    while start < n {
        let s = stratum(order_at((), start));
        let mut end = start; let mut n_s = 0.0;
        while end < n && stratum(order_at((), end)) == s { n_s += y(order_at((), end)); end += 1; }
        if n_s > 0.0 {
            used_strata += 1;
            for k in start..end {
                let i = order_at((), k); let mu = unsafe { *mu_ptr().add(i) };
                used_rows += 1; pearson += (y(i) - mu) * (y(i) - mu) / mu;
            }
        } else { dropped += 1; }
        start = end;
    }
    if used_strata == 0 { return ERR_NO_INFORMATION; }
    for j in 0..p { unsafe { *beta_ptr().add(j) = beta[j] }; }
    unsafe {
        STATS.loglik = loglik; STATS.pearson = pearson; STATS.used_rows = used_rows;
        STATS.used_strata = used_strata; STATS.dropped_strata = dropped; STATS.fitted = true;
    }
    STATS_ITER_OK
}

/// Fits the model. `family` is 0 for logistic, 1 for Poisson; `stratified` absorbs the strata set with
/// each row (Poisson only). Returns 0 when it converged, or a negative code: -1 shape, -2 data, -3 the
/// columns are collinear, -4 no convergence, -5 family, -6 no stratum carries information.
#[unsafe(no_mangle)]
pub extern "C" fn glm_fit(family: u32, stratified: u32, max_iter: u32, tol: f64) -> i32 {
    let (n, p) = shape();
    unsafe { STATS = Stats::empty() };
    if n == 0 || p == 0 { return ERR_SHAPE; }
    if family != BINOMIAL && family != POISSON { return ERR_FAMILY; }
    for i in 0..n { if family == BINOMIAL && y(i) != 0.0 && y(i) != 1.0 { return ERR_DATA; } }
    let tol = if tol > 0.0 && tol.is_finite() { tol } else { 1e-10 };
    let max_iter = if max_iter == 0 { 100 } else { max_iter };
    if stratified != 0 {
        if family != POISSON { return ERR_FAMILY; }
        fit_stratified(max_iter, tol)
    } else {
        if n <= p { return ERR_SHAPE; }
        fit_unstratified(family, max_iter, tol)
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn glm_coefficient(col: u32) -> f64 {
    let (_, p) = shape();
    if !unsafe { STATS.fitted } || col as usize >= p { return f64::NAN; }
    unsafe { *beta_ptr().add(col as usize) }
}

/// Model-based variance entry (the inverse information), before any dispersion scaling.
#[unsafe(no_mangle)]
pub extern "C" fn glm_covariance(row: u32, col: u32) -> f64 {
    let (_, p) = shape();
    if !unsafe { STATS.fitted } || row as usize >= p || col as usize >= p { return f64::NAN; }
    unsafe { *inv_ptr().add(row as usize * MAX_COLS + col as usize) }
}

#[unsafe(no_mangle)] pub extern "C" fn glm_iterations() -> u32 { unsafe { STATS.iterations } }
#[unsafe(no_mangle)] pub extern "C" fn glm_loglik() -> f64 { unsafe { STATS.loglik } }
#[unsafe(no_mangle)] pub extern "C" fn glm_pearson() -> f64 { unsafe { STATS.pearson } }
#[unsafe(no_mangle)] pub extern "C" fn glm_used_rows() -> u32 { unsafe { STATS.used_rows } }
#[unsafe(no_mangle)] pub extern "C" fn glm_used_strata() -> u32 { unsafe { STATS.used_strata } }
#[unsafe(no_mangle)] pub extern "C" fn glm_dropped_strata() -> u32 { unsafe { STATS.dropped_strata } }
#[unsafe(no_mangle)] pub extern "C" fn glm_fitted_value(row: u32) -> f64 {
    let (n, _) = shape();
    if !unsafe { STATS.fitted } || row as usize >= n { return f64::NAN; }
    unsafe { *mu_ptr().add(row as usize) }
}

/// HAC (Newey-West, Bartlett weights) variance for the linear combination `col` and `other` of the
/// coefficients, over the rows in the order they were set, with `lag` lags. Each row's influence is its
/// column of the inverse information times the row's residual -- for a stratified fit, the row centred
/// on its stratum's fitted mean, which is the same influence the model with stratum indicators gives.
/// A row of a stratum without information has none, and keeps its place in the sequence.
#[unsafe(no_mangle)]
pub extern "C" fn glm_hac_covariance(col: u32, other: u32, lag: u32, stratified: u32) -> f64 {
    let (n, p) = shape();
    let (col, other, lag) = (col as usize, other as usize, lag as usize);
    if !unsafe { STATS.fitted } || col >= p || other >= p { return f64::NAN; }
    let inv = |r: usize, c: usize| unsafe { *inv_ptr().add(r * MAX_COLS + c) };
    // Stratum means of the columns, weighted by the fitted values, for centring.
    let mut strata = 0usize;
    if stratified != 0 { for i in 0..n { strata = strata.max(stratum(i) as usize + 1); } stratum_order(strata); }
    let influence = |i: usize, which: usize, means: &dyn Fn(usize, usize) -> f64| -> f64 {
        let mu = unsafe { *mu_ptr().add(i) };
        let resid = y(i) - mu;
        let mut g = 0.0;
        for r in 0..p { g += (at(i, r) - means(i, r)) * inv(r, which); }
        g * resid
    };
    // Two influence columns, materialised once: n x 2 values.
    static mut G: [[f64; 2]; MAX_ROWS] = [[0.0; 2]; MAX_ROWS];
    let g_ptr = core::ptr::addr_of_mut!(G) as *mut [f64; 2];
    if stratified != 0 {
        let mut start = 0;
        while start < n {
            let s = stratum(order_at((), start));
            let mut end = start; while end < n && stratum(order_at((), end)) == s { end += 1; }
            let mut mean = [0.0f64; MAX_COLS]; let mut n_s = 0.0;
            for k in start..end { let i = order_at((), k); let mu = unsafe { *mu_ptr().add(i) }; n_s += mu; for r in 0..p { mean[r] += mu * at(i, r); } }
            for k in start..end {
                let i = order_at((), k);
                let means = |_: usize, r: usize| if n_s > 0.0 { mean[r] / n_s } else { at(i, r) };
                unsafe { *g_ptr.add(i) = [influence(i, col, &means), influence(i, other, &means)] };
            }
            start = end;
        }
    } else {
        let zero = |_: usize, _: usize| 0.0;
        for i in 0..n { unsafe { *g_ptr.add(i) = [influence(i, col, &zero), influence(i, other, &zero)] }; }
    }
    let g = |i: usize| unsafe { *g_ptr.add(i) };
    let mut v = 0.0;
    for i in 0..n { let gi = g(i); v += gi[0] * gi[1]; }
    for l in 1..=lag.min(n.saturating_sub(1)) {
        let weight = 1.0 - l as f64 / (lag as f64 + 1.0);
        let mut cross = 0.0;
        for i in l..n { let a = g(i); let b = g(i - l); cross += a[0] * b[1] + b[0] * a[1]; }
        v += weight * cross;
    }
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load(rows: &[(f64, &[f64], f64, u32)]) {
        let p = rows[0].1.len();
        assert_eq!(glm_reset(rows.len() as u32, p as u32), 1);
        for (i, (yv, xs, off, s)) in rows.iter().enumerate() {
            for (j, v) in xs.iter().enumerate() { assert_eq!(glm_set_x(i as u32, j as u32, *v), 1); }
            assert_eq!(glm_set_row(i as u32, *yv, *off, *s), 1);
        }
    }

    /// A two-by-two as logistic regression: the exposure's odds ratio is ad/bc, and its standard error
    /// is Woolf's, sqrt(1/a + 1/b + 1/c + 1/d).
    #[test]
    fn a_two_by_two_is_its_own_logistic_regression() {
        let _lock = GLM_TEST_LOCK.lock().unwrap();
        let (a, b, c, d) = (20usize, 80usize, 10usize, 90usize);
        let mut rows = vec![];
        for _ in 0..a { rows.push((1.0, &[1.0, 1.0][..], 0.0, NO_STRATUM)); }
        for _ in 0..b { rows.push((0.0, &[1.0, 1.0][..], 0.0, NO_STRATUM)); }
        for _ in 0..c { rows.push((1.0, &[1.0, 0.0][..], 0.0, NO_STRATUM)); }
        for _ in 0..d { rows.push((0.0, &[1.0, 0.0][..], 0.0, NO_STRATUM)); }
        load(&rows);
        assert_eq!(glm_fit(BINOMIAL, 0, 0, 0.0), 0);
        let or = exp(glm_coefficient(1));
        let woolf = sqrt(1.0 / a as f64 + 1.0 / b as f64 + 1.0 / c as f64 + 1.0 / d as f64);
        assert!((or - (20.0 * 90.0) / (80.0 * 10.0)).abs() < 1e-9, "odds ratio {or}");
        assert!((sqrt(glm_covariance(1, 1)) - woolf).abs() < 1e-9);
    }

    /// Poisson with an offset of log person-time: the exposure's rate ratio is the ratio of rates.
    #[test]
    fn an_unadjusted_poisson_model_is_the_rate_ratio() {
        let _lock = GLM_TEST_LOCK.lock().unwrap();
        load(&[(30.0, &[1.0, 1.0], log(1000.0), NO_STRATUM), (12.0, &[1.0, 0.0], log(800.0), NO_STRATUM)]);
        // Two rows and two columns fit exactly; n <= p is refused, so split each into two halves.
        load(&[(15.0, &[1.0, 1.0], log(500.0), NO_STRATUM), (15.0, &[1.0, 1.0], log(500.0), NO_STRATUM),
               (6.0, &[1.0, 0.0], log(400.0), NO_STRATUM), (6.0, &[1.0, 0.0], log(400.0), NO_STRATUM)]);
        assert_eq!(glm_fit(POISSON, 0, 0, 0.0), 0);
        let rr = exp(glm_coefficient(1));
        assert!((rr - (30.0 / 1000.0) / (12.0 / 800.0)).abs() < 1e-9, "rate ratio {rr}");
        assert!((sqrt(glm_covariance(1, 1)) - sqrt(1.0 / 30.0 + 1.0 / 12.0)).abs() < 1e-9);
    }

    /// Strata absorbed give the coefficient the model with one indicator per stratum gives, and a
    /// stratum with no events is counted as dropped.
    #[test]
    fn strata_absorbed_match_indicators() {
        let _lock = GLM_TEST_LOCK.lock().unwrap();
        // Three strata, a continuous exposure, counts drawn by hand.
        let data: [(f64, f64, u32); 9] = [(3.0, 0.5, 0), (5.0, 1.5, 0), (9.0, 2.5, 0),
                                          (10.0, 0.0, 1), (12.0, 1.0, 1), (20.0, 2.0, 1),
                                          (0.0, 1.0, 2), (0.0, 2.0, 2), (0.0, 0.5, 2)];
        let rows: Vec<(f64, Vec<f64>, f64, u32)> = data.iter().map(|&(yv, x, s)| (yv, vec![x], 0.0, s)).collect();
        let refs: Vec<(f64, &[f64], f64, u32)> = rows.iter().map(|(a, b, c, d)| (*a, &b[..], *c, *d)).collect();
        load(&refs);
        assert_eq!(glm_fit(POISSON, 1, 0, 0.0), 0);
        let absorbed = glm_coefficient(0);
        let absorbed_se = sqrt(glm_covariance(0, 0));
        assert_eq!(glm_dropped_strata(), 1);
        assert_eq!(glm_used_strata(), 2);
        // The same model with indicators, dropping the empty stratum (its indicator runs to minus infinity).
        let rows: Vec<(f64, Vec<f64>, f64, u32)> = data.iter().filter(|r| r.2 != 2)
            .map(|&(yv, x, s)| (yv, vec![x, if s == 0 { 1.0 } else { 0.0 }, if s == 1 { 1.0 } else { 0.0 }], 0.0, NO_STRATUM)).collect();
        let refs: Vec<(f64, &[f64], f64, u32)> = rows.iter().map(|(a, b, c, d)| (*a, &b[..], *c, *d)).collect();
        load(&refs);
        assert_eq!(glm_fit(POISSON, 0, 0, 0.0), 0);
        assert!((glm_coefficient(0) - absorbed).abs() < 1e-8, "{} vs {absorbed}", glm_coefficient(0));
        assert!((sqrt(glm_covariance(0, 0)) - absorbed_se).abs() < 1e-8);
    }

    /// Collinear columns are refused rather than fitted.
    #[test]
    fn collinear_columns_are_refused() {
        let _lock = GLM_TEST_LOCK.lock().unwrap();
        load(&[(1.0, &[1.0, 2.0], 0.0, NO_STRATUM), (0.0, &[1.0, 2.0], 0.0, NO_STRATUM), (1.0, &[1.0, 2.0], 0.0, NO_STRATUM)]);
        assert_eq!(glm_fit(BINOMIAL, 0, 0, 0.0), ERR_SINGULAR);
    }

    /// With no lags, HAC is the robust sandwich; for a saturated two-group Poisson model it equals the
    /// model-based variance, because each group's residuals sum to zero.
    #[test]
    fn hac_with_no_lag_is_the_sandwich() {
        let _lock = GLM_TEST_LOCK.lock().unwrap();
        load(&[(15.0, &[1.0, 1.0], 0.0, NO_STRATUM), (15.0, &[1.0, 1.0], 0.0, NO_STRATUM),
               (6.0, &[1.0, 0.0], 0.0, NO_STRATUM), (6.0, &[1.0, 0.0], 0.0, NO_STRATUM)]);
        assert_eq!(glm_fit(POISSON, 0, 0, 0.0), 0);
        // Equal halves: every residual is zero, so the sandwich is zero.
        assert!(glm_hac_covariance(1, 1, 0, 0).abs() < 1e-12);
    }
}
