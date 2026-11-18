//! A DECLARED DISEASE MODEL: experiment 220's spike (the practitioner, 2026-11-17: "Spike"). The model's structure is
//! not written here. The caller declares it: how many states, which one is susceptible, which one an infection leads
//! to, which states are infectious, the chain of periods that follows an infection, and the contact networks with a
//! daily probability for each. This runner steps whatever was declared, one day at a time from a recorded seed.
//!
//! Its rules are those of `abm`, stated generally so that measles declared reproduces measles written by hand, draw for
//! draw:
//!
//! - **A course is drawn at infection.** From the state an infection leads to, the course is walked to its end: where
//!   a state has one way on, its period is drawn, whole days uniform between its bounds; where it has several, the
//!   branches (recover or die; fast or slow latency), one random number chooses by their shares, then the period is
//!   drawn. A course with no branches draws only its periods, in order, as before branches existed.
//! - **Progression comes first each day**: an agent moves along its chain on the day each period ends, possibly more
//!   than one step in a day.
//! - **Then transmission**, from the agents infectious after progression. A susceptible agent escapes each network
//!   independently, `(1 - p)^k` for the `k` infectious agents it shares a group with there, or for every infectious
//!   agent on a network that is everyone; one random number is drawn for it, only on days when anyone is infectious.
//!
//! Memory: as in `abm` and `scan`, the arrays live in the module's own memory, a fresh region taken when a run needs
//! more than the last one held.

const PAGE: usize = 65_536;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
static mut OFF: [usize; 12] = [0; 12];
static mut N: usize = 0;
static mut DAYS: usize = 0;
static mut NETS: usize = 0;
static mut STEPS: usize = 0;
static mut STATES: usize = 0;

// The arrays, by their index in OFF. The first five are the caller's to write.
const GROUPS: usize = 0; // i32[nets*n]: network j, agent i at j*n + i
const NET_P: usize = 1; // f64[nets]: the daily probability of infection per infectious contact on each network
const NET_NONE: usize = 2; // i32[nets]: the group number that means "not on this network", or -1 if every number is a group
const NET_KIND: usize = 3; // i32[nets]: 0 groups, 1 everyone
const STEP: usize = 4; // i32[steps*4]: from, to, shortest, longest; steps from the same state are branches
const STATE: usize = 5; // u8[n]
const COURSE: usize = 6; // i32[n*steps*2]: an agent's course, (the state it moves to, the day it moves), -1 ends it
const COUNTS: usize = 7; // u32[days*states]: agents in each state at the end of each day
const INFECTED_ON: usize = 8; // i32[n]: the day each agent was infected, -1 never
const SCRATCH: usize = 9; // u32[nets*n]: infectious agents by network and group
const SHARE: usize = 10; // f64[steps]: the caller's; a branch's share of those leaving its state, unread for a step with no alternative
const CURSOR: usize = 11; // u32[n]: how far along its course each agent is

fn ptr<T>(which: usize) -> *mut T {
    unsafe { (BASE + OFF[which]) as *mut T }
}
fn at<T: Copy>(which: usize, i: usize) -> T {
    unsafe { *ptr::<T>(which).add(i) }
}
fn put<T>(which: usize, i: usize, v: T) {
    unsafe { *ptr::<T>(which).add(i) = v }
}

#[cfg(target_arch = "wasm32")]
fn take(bytes: usize) -> bool {
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
fn take(bytes: usize) -> bool {
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

/// Lays out the arrays for `n` agents over `days` days, `nets` networks, a chain of `steps` periods and `states` states,
/// and returns 1, or 0 where the sizes are out of range or memory could not be had.
#[unsafe(no_mangle)]
pub extern "C" fn decl_prepare(n: u32, days: u32, nets: u32, steps: u32, states: u32) -> u32 {
    let (n, days, nets, steps, states) = (n as usize, days as usize, nets as usize, steps as usize, states as usize);
    if n == 0 || days == 0 || nets == 0 || nets > 16 || steps == 0 || steps > 16 || states < 2 || states > 32 {
        return 0;
    }
    let sizes = [4 * nets * n, 8 * nets, 4 * nets, 4 * nets, 16 * steps, n, 8 * n * steps, 4 * days * states, 4 * n, 4 * nets * n, 8 * steps, 4 * n];
    let mut offsets = [0usize; 12];
    let mut total = 0usize;
    for (i, size) in sizes.iter().enumerate() {
        total = (total + 7) & !7;
        offsets[i] = total;
        total += size;
    }
    if !take(total) {
        return 0;
    }
    unsafe {
        OFF = offsets;
        N = n;
        DAYS = days;
        NETS = nets;
        STEPS = steps;
        STATES = states;
    }
    1
}

#[unsafe(no_mangle)]
pub extern "C" fn decl_ptr(which: u32) -> u32 {
    unsafe { (BASE + OFF[which as usize]) as u32 }
}

/// The same address at full width, for a caller on the host.
pub fn decl_address(which: u32) -> usize {
    unsafe { BASE + OFF[which as usize] }
}

struct SplitMix(u64);
impl SplitMix {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    fn unit(&mut self) -> f64 {
        (self.next() >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0)
    }
    fn between(&mut self, low: i32, high: i32) -> i32 {
        let span = (high - low + 1) as u64;
        low + (self.next() % span) as i32
    }
}

/// Runs one outbreak from `seed`, agent `index` infected on day 0. `susceptible` is the state an infection takes an
/// agent from, `infected` the state it leads to, and bit `s` of `infectious` is set when state `s` transmits. Writes
/// the count in each state at the end of each day and the day each agent was infected. Returns how many were ever
/// infected, the index included, or u32::MAX for a declaration or parameters out of range.
#[unsafe(no_mangle)]
pub extern "C" fn decl_run(seed: u64, index: u32, susceptible: u32, infected: u32, infectious: u32) -> u32 {
    let (n, days, nets, steps, states) = unsafe { (N, DAYS, NETS, STEPS, STATES) };
    let (index, susceptible, infected) = (index as usize, susceptible as usize, infected as usize);
    if index >= n || susceptible >= states || infected >= states || susceptible == infected {
        return u32::MAX;
    }
    if states < 32 && infectious >> states != 0 || infectious & (1 << susceptible) != 0 {
        return u32::MAX;
    }
    // Every step leads to a declared state with sensible bounds; the shares of a state's branches make a whole; the
    // course from the infected state ends, never returning to a state it has left.
    for k in 0..steps {
        let (f, t, low, high) = (at::<i32>(STEP, 4 * k), at::<i32>(STEP, 4 * k + 1), at::<i32>(STEP, 4 * k + 2), at::<i32>(STEP, 4 * k + 3));
        if f < 0 || f as usize >= states || t < 0 || t as usize >= states || f == t || low < 1 || high < low {
            return u32::MAX;
        }
        let ways = (0..steps).filter(|&m| at::<i32>(STEP, 4 * m) == f).count();
        if ways > 1 {
            let share: f64 = at(SHARE, k);
            if !share.is_finite() || !(0.0..=1.0).contains(&share) {
                return u32::MAX;
            }
            if (0..steps).find(|&m| at::<i32>(STEP, 4 * m) == f) == Some(k) {
                let total: f64 = (0..steps).filter(|&m| at::<i32>(STEP, 4 * m) == f).map(|m| at::<f64>(SHARE, m)).sum();
                if (total - 1.0).abs() > 1e-9 {
                    return u32::MAX;
                }
            }
        }
    }
    // Acyclic: a course is at most `steps` long, so a walk that has not ended by then has come round again.
    let mut reach = [false; 32];
    reach[infected] = true;
    for _ in 0..=steps {
        for k in 0..steps {
            if reach[at::<i32>(STEP, 4 * k) as usize] {
                reach[at::<i32>(STEP, 4 * k + 1) as usize] = true;
            }
        }
    }
    {
        let mut depth = [0usize; 32];
        let mut changed = true;
        let mut rounds = 0;
        while changed {
            changed = false;
            rounds += 1;
            if rounds > steps + 1 {
                return u32::MAX;
            }
            for k in 0..steps {
                let (f, t) = (at::<i32>(STEP, 4 * k) as usize, at::<i32>(STEP, 4 * k + 1) as usize);
                if reach[f] && depth[t] < depth[f] + 1 {
                    depth[t] = depth[f] + 1;
                    changed = true;
                }
            }
        }
        if reach[susceptible] && (0..steps).any(|k| at::<i32>(STEP, 4 * k + 1) as usize == susceptible) {
            // Back to susceptible would be a course that never ends for the walk below; immunity that wanes is a later addition.
            return u32::MAX;
        }
    }
    let mut q = [0f64; 16];
    for j in 0..nets {
        let p: f64 = at(NET_P, j);
        let kind: i32 = at(NET_KIND, j);
        if !p.is_finite() || !(0.0..=1.0).contains(&p) || (kind != 0 && kind != 1) {
            return u32::MAX;
        }
        q[j] = 1.0 - p;
        if kind == 0 {
            let none: i32 = at(NET_NONE, j);
            for i in 0..n {
                let g: i32 = at(GROUPS, j * n + i);
                if g != none && (g < 0 || g as usize >= n) {
                    return u32::MAX;
                }
            }
        }
    }
    let transmits = |s: u8| infectious & (1u32 << s) != 0;
    let mut rng = SplitMix(seed);
    for i in 0..n {
        put::<u8>(STATE, i, susceptible as u8);
        put::<i32>(INFECTED_ON, i, -1);
        put::<u32>(CURSOR, i, 0);
    }
    let infect = |i: usize, day: i32, rng: &mut SplitMix| {
        let (mut at_state, mut ends, mut length) = (infected as i32, day, 0usize);
        loop {
            let first = (0..steps).find(|&m| at::<i32>(STEP, 4 * m) == at_state);
            let Some(first) = first else { break };
            let ways = (0..steps).filter(|&m| at::<i32>(STEP, 4 * m) == at_state).count();
            let mut chosen = first;
            if ways > 1 {
                let u = rng.unit();
                let mut cumulative = 0.0;
                for m in (0..steps).filter(|&m| at::<i32>(STEP, 4 * m) == at_state) {
                    chosen = m;
                    cumulative += at::<f64>(SHARE, m);
                    if u < cumulative {
                        break;
                    }
                }
            }
            ends += rng.between(at(STEP, 4 * chosen + 2), at(STEP, 4 * chosen + 3));
            at_state = at(STEP, 4 * chosen + 1);
            put::<i32>(COURSE, (i * steps + length) * 2, at_state);
            put::<i32>(COURSE, (i * steps + length) * 2 + 1, ends);
            length += 1;
        }
        if length < steps {
            put::<i32>(COURSE, (i * steps + length) * 2, -1);
        }
        put::<u32>(CURSOR, i, 0);
        put::<u8>(STATE, i, infected as u8);
        put::<i32>(INFECTED_ON, i, day);
    };
    infect(index, 0, &mut rng);
    let mut ever = 1u32;
    for day in 0..days {
        let today = day as i32;
        for i in 0..n {
            if at::<i32>(INFECTED_ON, i) < 0 {
                continue;
            }
            let mut k = at::<u32>(CURSOR, i) as usize;
            while k < steps {
                let to: i32 = at(COURSE, (i * steps + k) * 2);
                if to < 0 || at::<i32>(COURSE, (i * steps + k) * 2 + 1) > today {
                    break;
                }
                put::<u8>(STATE, i, to as u8);
                k += 1;
            }
            put::<u32>(CURSOR, i, k as u32);
        }
        for i in 0..nets * n {
            put::<u32>(SCRATCH, i, 0);
        }
        let mut everyone = 0u32;
        for i in 0..n {
            if transmits(at::<u8>(STATE, i)) {
                everyone += 1;
                for j in 0..nets {
                    if at::<i32>(NET_KIND, j) == 0 {
                        let g: i32 = at(GROUPS, j * n + i);
                        if g != at::<i32>(NET_NONE, j) {
                            let slot = j * n + g as usize;
                            put::<u32>(SCRATCH, slot, at::<u32>(SCRATCH, slot) + 1);
                        }
                    }
                }
            }
        }
        if everyone > 0 {
            for i in 0..n {
                if at::<u8>(STATE, i) as usize != susceptible {
                    continue;
                }
                let mut escape = 1.0f64;
                for j in 0..nets {
                    let count = if at::<i32>(NET_KIND, j) == 1 {
                        everyone
                    } else {
                        let g: i32 = at(GROUPS, j * n + i);
                        if g == at::<i32>(NET_NONE, j) { 0 } else { at::<u32>(SCRATCH, j * n + g as usize) }
                    };
                    escape *= libm::pow(q[j], count as f64);
                }
                if rng.unit() < 1.0 - escape {
                    infect(i, today, &mut rng);
                    ever += 1;
                }
            }
        }
        for s in 0..states {
            put::<u32>(COUNTS, day * states + s, 0);
        }
        for i in 0..n {
            let slot = day * states + at::<u8>(STATE, i) as usize;
            put::<u32>(COUNTS, slot, at::<u32>(COUNTS, slot) + 1);
        }
    }
    ever
}

#[cfg(test)]
mod tests {
    use super::*;
    extern crate std;
    use std::vec::Vec;

    /// Measles as `abm` has it, declared: S E I R, an infection from S to E, I infectious, then E to I and I to R, over
    /// households (every number a household), classes (0 is no class) and the village.
    fn declare_measles(households: &[i32], classes: &[i32], days: u32, p: [f64; 3], latent: (i32, i32), infectious: (i32, i32)) {
        let n = households.len();
        assert_eq!(decl_prepare(n as u32, days, 3, 2, 4), 1);
        for i in 0..n {
            put::<i32>(GROUPS, i, households[i]);
            put::<i32>(GROUPS, n + i, classes[i]);
            put::<i32>(GROUPS, 2 * n + i, 0);
        }
        for (j, (kind, none)) in [(0, -1), (0, 0), (1, -1)].iter().enumerate() {
            put::<f64>(NET_P, j, p[j]);
            put::<i32>(NET_KIND, j, *kind);
            put::<i32>(NET_NONE, j, *none);
        }
        for (k, v) in [1, 2, latent.0, latent.1, 2, 3, infectious.0, infectious.1].iter().enumerate() {
            put::<i32>(STEP, k, *v);
        }
    }
    fn table(days: usize) -> Vec<u32> {
        (0..days * 4).map(|i| at::<u32>(COUNTS, i)).collect()
    }
    fn hagelloch_like() -> (Vec<i32>, Vec<i32>) {
        ((0..60).map(|i| i / 3).collect(), (0..60).map(|i| i % 3).collect())
    }

    #[test]
    fn the_recorded_seed_gives_the_table_recorded_for_measles_written_by_hand() {
        let (h, c) = hagelloch_like();
        declare_measles(&h, &c, 90, [0.08, 0.02, 0.002], (10, 12), (8, 9));
        assert_eq!(decl_run(42, 0, 0, 1, 1 << 2), 16);
        let checksum: u64 = table(90).iter().enumerate().map(|(i, v)| (i as u64 + 1) * *v as u64).sum();
        assert_eq!(checksum, 967_536);
    }

    #[test]
    fn every_seed_gives_the_same_table_and_the_same_infections_as_measles_written_by_hand() {
        let (h, c) = hagelloch_like();
        for seed in 0..300u64 {
            crate::abm::tests_support::setup(&h, &c, 90);
            let by_hand = crate::abm::abm_run(seed, 7, 0.08, 0.02, 0.002, 10, 12, 8, 9);
            let hand_table = crate::abm::tests_support::table(90);
            let hand_days = crate::abm::tests_support::infected_on(60);
            declare_measles(&h, &c, 90, [0.08, 0.02, 0.002], (10, 12), (8, 9));
            let declared = decl_run(seed, 7, 0, 1, 1 << 2);
            assert_eq!(declared, by_hand, "seed {seed}");
            assert_eq!(table(90), hand_table, "seed {seed}");
            let days: Vec<i32> = (0..60).map(|i| at::<i32>(INFECTED_ON, i)).collect();
            assert_eq!(days, hand_days, "seed {seed}");
        }
    }

    #[test]
    fn a_course_that_comes_round_again_or_branches_that_do_not_make_a_whole_are_refused() {
        let (h, c) = hagelloch_like();
        declare_measles(&h, &c, 30, [0.08, 0.02, 0.002], (10, 12), (8, 9));
        // R back to E: a course that never ends.
        assert_eq!(decl_prepare(60, 30, 3, 3, 4), 1);
        for i in 0..60 {
            put::<i32>(GROUPS, i, h[i]);
            put::<i32>(GROUPS, 60 + i, c[i]);
            put::<i32>(GROUPS, 120 + i, 0);
        }
        for (j, (kind, none)) in [(0, -1), (0, 0), (1, -1)].iter().enumerate() {
            put::<f64>(NET_P, j, 0.05);
            put::<i32>(NET_KIND, j, *kind);
            put::<i32>(NET_NONE, j, *none);
        }
        for (k, v) in [1, 2, 3, 3, 2, 3, 4, 4, 3, 1, 9, 9].iter().enumerate() {
            put::<i32>(STEP, k, *v);
        }
        assert_eq!(decl_run(1, 0, 0, 1, 1 << 2), u32::MAX);
        // Two branches from I, recover or die (a fifth state), whose shares are 0.3 and 0.3.
        ebola_like(&h, &c, 30, 0.0, [0.3, 0.3]);
        assert_eq!(decl_run(1, 0, 0, 1, (1 << 2) | (1 << 4)), u32::MAX);
        ebola_like(&h, &c, 30, 0.0, [0.33, 0.67]);
        assert_eq!(decl_run(1, 0, 0, 1, (1 << 2) | (1 << 4)), 1);
    }

    /// S E I R D B: an infectious person recovers or dies; the dead are infectious until burial. Steps E->I, I->R,
    /// I->D (the branches, shares given), D->B. Households, classes and the village as for measles.
    fn ebola_like(h: &[i32], c: &[i32], days: u32, p: f64, shares: [f64; 2]) {
        let n = h.len();
        assert_eq!(decl_prepare(n as u32, days, 3, 4, 6), 1);
        for i in 0..n {
            put::<i32>(GROUPS, i, h[i]);
            put::<i32>(GROUPS, n + i, c[i]);
            put::<i32>(GROUPS, 2 * n + i, 0);
        }
        for (j, (kind, none)) in [(0, -1), (0, 0), (1, -1)].iter().enumerate() {
            put::<f64>(NET_P, j, if j == 2 { p / 10.0 } else { p });
            put::<i32>(NET_KIND, j, *kind);
            put::<i32>(NET_NONE, j, *none);
        }
        for (k, v) in [1, 2, 8, 10, 2, 3, 6, 9, 2, 4, 5, 8, 4, 5, 2, 3].iter().enumerate() {
            put::<i32>(STEP, k, *v);
        }
        put::<f64>(SHARE, 1, shares[0]);
        put::<f64>(SHARE, 2, shares[1]);
    }

    #[test]
    fn a_branch_is_taken_in_its_share() {
        // Many infections, each choosing recover or die: the share who die is 0.67 within binomial spread.
        let (h, c) = hagelloch_like();
        let (mut died, mut ended) = (0u64, 0u64);
        for seed in 0..400u64 {
            ebola_like(&h, &c, 120, 0.12, [0.33, 0.67]);
            decl_run(seed, (seed % 60) as u32, 0, 1, (1 << 2) | (1 << 4));
            let last = 119 * 6;
            let (r, d, b) = (at::<u32>(COUNTS, last + 3), at::<u32>(COUNTS, last + 4), at::<u32>(COUNTS, last + 5));
            died += (d + b) as u64;
            ended += (r + d + b) as u64;
        }
        let share = died as f64 / ended as f64;
        let spread = (0.67 * 0.33 / ended as f64).sqrt();
        assert!(ended > 5_000, "{ended} courses ended");
        assert!((share - 0.67).abs() < 4.0 * spread, "{share} died against 0.67, spread {spread}");
    }

    #[test]
    fn the_dead_transmit_until_burial_and_every_day_counts_everyone() {
        let (h, c) = hagelloch_like();
        ebola_like(&h, &c, 120, 0.12, [0.33, 0.67]);
        let ever = decl_run(5, 0, 0, 1, (1 << 2) | (1 << 4));
        assert!(ever > 1 && ever <= 60);
        for day in 0..120 {
            assert_eq!((0..6).map(|s| at::<u32>(COUNTS, day * 6 + s)).sum::<u32>(), 60);
        }
        // The index's course: infectious, then recovered, or dead and then buried.
        let course: Vec<i32> = (0..4).map(|k| at::<i32>(COURSE, k * 2)).collect();
        assert_eq!(course[0], 2);
        assert!(course[1] == 3 || (course[1] == 4 && course[2] == 5), "{course:?}");
        // The same outbreaks with the unburied dead not transmitting infect fewer, on average over 300 seeds.
        let mean = |mask: u32| {
            (0..300u64).map(|seed| { ebola_like(&h, &c, 120, 0.06, [0.33, 0.67]); decl_run(seed, (seed % 60) as u32, 0, 1, mask) as f64 }).sum::<f64>() / 300.0
        };
        let (with_dead, without) = (mean((1 << 2) | (1 << 4)), mean(1 << 2));
        assert!(with_dead > without, "{with_dead} infected with the dead transmitting, {without} without");
    }

    #[test]
    fn a_susceptible_state_that_transmits_or_a_probability_out_of_range_is_refused() {
        let (h, c) = hagelloch_like();
        declare_measles(&h, &c, 30, [0.08, 0.02, 0.002], (10, 12), (8, 9));
        assert_eq!(decl_run(1, 0, 0, 1, 1 << 0), u32::MAX);
        put::<f64>(NET_P, 1, 1.5);
        assert_eq!(decl_run(1, 0, 0, 1, 1 << 2), u32::MAX);
    }

    #[test]
    fn a_longer_chain_runs_every_period_in_order() {
        // S E I1 I2 R: two infectious stages, as a declaration with three periods. With no transmission the index alone
        // passes through them, on the days its course says.
        let (h, c) = hagelloch_like();
        assert_eq!(decl_prepare(60, 40, 3, 3, 5), 1);
        for i in 0..60 {
            put::<i32>(GROUPS, i, h[i]);
            put::<i32>(GROUPS, 60 + i, c[i]);
            put::<i32>(GROUPS, 120 + i, 0);
        }
        for (j, (kind, none)) in [(0, -1), (0, 0), (1, -1)].iter().enumerate() {
            put::<f64>(NET_P, j, 0.0);
            put::<i32>(NET_KIND, j, *kind);
            put::<i32>(NET_NONE, j, *none);
        }
        for (k, v) in [1, 2, 5, 5, 2, 3, 3, 3, 3, 4, 2, 2].iter().enumerate() {
            put::<i32>(STEP, k, *v);
        }
        assert_eq!(decl_run(9, 4, 0, 1, (1 << 2) | (1 << 3)), 1);
        let state_on = |day: usize| (0..5).find(|s| at::<u32>(COUNTS, day * 5 + s) == 1 && *s != 0).unwrap();
        assert_eq!([state_on(4), state_on(5), state_on(8), state_on(10)], [1, 2, 3, 4]);
    }
}
