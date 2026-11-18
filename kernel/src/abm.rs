//! AN AGENT-BASED MODEL IN THE KERNEL: experiment 199's spike (the practitioner, 2026-11-17: "Let's investigate the ABM
//! spike next", on Hagelloch's measles). Susceptible, exposed, infectious, recovered, stepped one day at a time from a
//! recorded seed, over three contact networks: the household, the school class and the whole village. Each day, as in
//! Starsim, progression comes first and then transmission: an exposed child whose latent period has ended becomes
//! infectious, an infectious one whose infectious period has ended recovers, and then each susceptible child is infected
//! with probability
//!
//!     1 - (1 - p_household)^h (1 - p_class)^c (1 - p_village)^v
//!
//! where h, c and v count the infectious children in the same household, the same school class (a class of 0 is not at
//! school, and is no class), and the village (everyone else). That is Starsim's per-edge transmission with a beta per
//! network, each edge drawn independently, an infection reached twice counted once.
//!
//! The random numbers are SplitMix64, written here so that the same seed gives the same table natively and in
//! WebAssembly. They are not Starsim's: the two agree, if they do, as distributions, not draw by draw.
//!
//! Memory: as in `scan`, the arrays live in the module's own memory. A region is taken fresh when a run needs more than
//! the last one held, never assumed to follow it, since `scan` grows memory too.

const PAGE: usize = 65_536;
static mut BASE: usize = 0;
static mut CAPACITY: usize = 0;
static mut OFF: [usize; 8] = [0; 8];
static mut N: usize = 0;
static mut DAYS: usize = 0;

// The arrays, by their index in OFF.
const HOUSEHOLD: usize = 0; // i32[n], the caller's
const CLASS: usize = 1; // i32[n], the caller's; 0 is no class
const STATE: usize = 2; // u8[n]: 0 S, 1 E, 2 I, 3 R
const TO_INFECTIOUS: usize = 3; // i32[n], the day the latent period ends
const TO_RECOVERED: usize = 4; // i32[n], the day the infectious period ends
const COUNTS: usize = 5; // u32[days*4], S E I R at the end of each day
const INFECTED_ON: usize = 6; // i32[n], the day each child was infected, -1 never
const SCRATCH: usize = 7; // u32[n*2], infectious counts by household and by class

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

/// Lays out the arrays for `n` children over `days` days and returns 1, or 0 where memory could not be had. Then the
/// caller writes each child's household and class at `abm_ptr(0)` and `abm_ptr(1)`, as 32-bit integers.
#[unsafe(no_mangle)]
pub extern "C" fn abm_prepare(n: u32, days: u32) -> u32 {
    let (n, days) = (n as usize, days as usize);
    if n == 0 || days == 0 {
        return 0;
    }
    let sizes = [4 * n, 4 * n, n, 4 * n, 4 * n, 16 * days, 4 * n, 8 * n];
    let mut offsets = [0usize; 8];
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
    }
    1
}

#[unsafe(no_mangle)]
pub extern "C" fn abm_ptr(which: u32) -> u32 {
    unsafe { (BASE + OFF[which as usize]) as u32 }
}

/// The same address at full width, for a caller on the host, where an address does not fit in 32 bits (the native
/// half of the check that a seed gives the same table natively and in WebAssembly).
pub fn abm_address(which: u32) -> usize {
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
    /// Uniform on [0, 1), from the top 53 bits.
    fn unit(&mut self) -> f64 {
        (self.next() >> 11) as f64 * (1.0 / 9_007_199_254_740_992.0)
    }
    /// Uniform on the whole numbers low..=high.
    fn between(&mut self, low: i32, high: i32) -> i32 {
        let span = (high - low + 1) as u64;
        low + (self.next() % span) as i32
    }
}

fn power(base: f64, count: u32) -> f64 {
    libm::pow(base, count as f64)
}

/// Runs one outbreak from `seed`, the child `index` exposed on day 0, and writes the counts of S, E, I and R at the end
/// of each day at `abm_ptr(5)`, and the day each child was infected at `abm_ptr(6)`. Returns how many were ever
/// infected, the index included, or u32::MAX for parameters out of range. The latent and infectious periods are whole
/// days, uniform between their bounds inclusive.
#[unsafe(no_mangle)]
pub extern "C" fn abm_run(
    seed: u64,
    index: u32,
    p_household: f64,
    p_class: f64,
    p_village: f64,
    latent_min: i32,
    latent_max: i32,
    infectious_min: i32,
    infectious_max: i32,
) -> u32 {
    let (n, days) = unsafe { (N, DAYS) };
    let index = index as usize;
    let probability = |p: f64| p.is_finite() && (0.0..=1.0).contains(&p);
    if index >= n
        || !probability(p_household)
        || !probability(p_class)
        || !probability(p_village)
        || latent_min < 1
        || latent_max < latent_min
        || infectious_min < 1
        || infectious_max < infectious_min
    {
        return u32::MAX;
    }
    // Households and classes are numbered by the caller; their counts are kept in two arrays of n, so a number must be
    // below n. Checked, not assumed.
    for i in 0..n {
        let h: i32 = at(HOUSEHOLD, i);
        let c: i32 = at(CLASS, i);
        if h < 0 || h as usize >= n || c < 0 || c as usize >= n {
            return u32::MAX;
        }
    }
    let mut rng = SplitMix(seed);
    for i in 0..n {
        put::<u8>(STATE, i, 0);
        put::<i32>(INFECTED_ON, i, -1);
    }
    let expose = |i: usize, day: i32, rng: &mut SplitMix| {
        let latent = rng.between(latent_min, latent_max);
        let infectious = rng.between(infectious_min, infectious_max);
        put::<u8>(STATE, i, 1);
        put::<i32>(INFECTED_ON, i, day);
        put::<i32>(TO_INFECTIOUS, i, day + latent);
        put::<i32>(TO_RECOVERED, i, day + latent + infectious);
    };
    expose(index, 0, &mut rng);
    let mut ever = 1u32;
    let (q_household, q_class, q_village) = (1.0 - p_household, 1.0 - p_class, 1.0 - p_village);
    for day in 0..days {
        let today = day as i32;
        // Progression first.
        for i in 0..n {
            match at::<u8>(STATE, i) {
                1 if at::<i32>(TO_INFECTIOUS, i) <= today => put::<u8>(STATE, i, 2),
                _ => {}
            }
            if at::<u8>(STATE, i) == 2 && at::<i32>(TO_RECOVERED, i) <= today {
                put::<u8>(STATE, i, 3);
            }
        }
        // Then transmission, from the children infectious after progression.
        for i in 0..2 * n {
            put::<u32>(SCRATCH, i, 0);
        }
        let mut infectious = 0u32;
        for i in 0..n {
            if at::<u8>(STATE, i) == 2 {
                infectious += 1;
                let h = at::<i32>(HOUSEHOLD, i) as usize;
                let c = at::<i32>(CLASS, i) as usize;
                put::<u32>(SCRATCH, h, at::<u32>(SCRATCH, h) + 1);
                if c != 0 {
                    put::<u32>(SCRATCH, n + c, at::<u32>(SCRATCH, n + c) + 1);
                }
            }
        }
        if infectious > 0 {
            for i in 0..n {
                if at::<u8>(STATE, i) != 0 {
                    continue;
                }
                let h = at::<i32>(HOUSEHOLD, i) as usize;
                let c = at::<i32>(CLASS, i) as usize;
                let in_household = at::<u32>(SCRATCH, h);
                let in_class = if c != 0 { at::<u32>(SCRATCH, n + c) } else { 0 };
                // A susceptible child is not itself infectious, so every infectious housemate and classmate is
                // someone else; the village is everyone infectious.
                let escape =
                    power(q_household, in_household) * power(q_class, in_class) * power(q_village, infectious);
                if rng.unit() < 1.0 - escape {
                    expose(i, today, &mut rng);
                    ever += 1;
                }
            }
        }
        let mut counts = [0u32; 4];
        for i in 0..n {
            counts[at::<u8>(STATE, i) as usize] += 1;
        }
        for (k, count) in counts.iter().enumerate() {
            put::<u32>(COUNTS, day * 4 + k, *count);
        }
    }
    ever
}

/// For `declared`'s tests, which check that measles declared reproduces measles written here, draw for draw.
#[cfg(test)]
pub mod tests_support {
    use super::*;
    extern crate std;
    pub fn setup(households: &[i32], classes: &[i32], days: u32) {
        assert_eq!(abm_prepare(households.len() as u32, days), 1);
        for (i, (h, c)) in households.iter().zip(classes).enumerate() {
            put::<i32>(HOUSEHOLD, i, *h);
            put::<i32>(CLASS, i, *c);
        }
    }
    pub fn table(days: usize) -> std::vec::Vec<u32> {
        (0..days * 4).map(|i| at::<u32>(COUNTS, i)).collect()
    }
    pub fn infected_on(n: usize) -> std::vec::Vec<i32> {
        (0..n).map(|i| at::<i32>(INFECTED_ON, i)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup(households: &[i32], classes: &[i32], days: u32) {
        assert_eq!(abm_prepare(households.len() as u32, days), 1);
        for (i, (h, c)) in households.iter().zip(classes).enumerate() {
            put::<i32>(HOUSEHOLD, i, *h);
            put::<i32>(CLASS, i, *c);
        }
    }
    fn table(days: usize) -> std::vec::Vec<u32> {
        (0..days * 4).map(|i| at::<u32>(COUNTS, i)).collect()
    }

    #[test]
    fn the_same_seed_gives_the_same_table() {
        let households: std::vec::Vec<i32> = (0..60).map(|i| i / 3).collect();
        let classes: std::vec::Vec<i32> = (0..60).map(|i| i % 3).collect();
        setup(&households, &classes, 90);
        let a = abm_run(7, 0, 0.1, 0.03, 0.002, 8, 12, 7, 9);
        let first = table(90);
        let b = abm_run(7, 0, 0.1, 0.03, 0.002, 8, 12, 7, 9);
        assert_eq!(a, b);
        assert_eq!(first, table(90));
        let c = abm_run(8, 0, 0.1, 0.03, 0.002, 8, 12, 7, 9);
        assert!(c != a || first != table(90), "another seed gives another outbreak");
    }

    #[test]
    fn every_day_counts_every_child_once() {
        let households: std::vec::Vec<i32> = (0..40).map(|i| i / 4).collect();
        let classes = std::vec![1; 40];
        setup(&households, &classes, 60);
        abm_run(3, 5, 0.2, 0.05, 0.001, 8, 12, 7, 9);
        let t = table(60);
        for day in 0..60 {
            assert_eq!(t[day * 4..day * 4 + 4].iter().sum::<u32>(), 40);
        }
    }

    #[test]
    fn with_no_transmission_only_the_index_is_infected_and_it_follows_its_periods() {
        setup(&[0, 1, 2], &[0, 0, 0], 30);
        assert_eq!(abm_run(1, 1, 0.0, 0.0, 0.0, 10, 10, 8, 8), 1);
        let t = table(30);
        // Exposed on day 0, infectious from day 10, recovered from day 18.
        assert_eq!(&t[9 * 4..9 * 4 + 4], &[2, 1, 0, 0]);
        assert_eq!(&t[10 * 4..10 * 4 + 4], &[2, 0, 1, 0]);
        assert_eq!(&t[17 * 4..17 * 4 + 4], &[2, 0, 1, 0]);
        assert_eq!(&t[18 * 4..18 * 4 + 4], &[2, 0, 0, 1]);
    }

    #[test]
    fn certain_household_transmission_reaches_the_household_on_the_first_infectious_day() {
        setup(&[0, 0, 1], &[0, 0, 0], 20);
        abm_run(1, 0, 1.0, 0.0, 0.0, 5, 5, 3, 3);
        assert_eq!(at::<i32>(INFECTED_ON, 1), 5);
        assert_eq!(at::<i32>(INFECTED_ON, 2), -1);
    }

    /// The table a recorded seed gives, as a checksum. tests/abm-kernel.test.mjs asserts the same number from the
    /// WebAssembly build: the two must agree exactly (experiment 199, the first of its three checks).
    #[test]
    fn a_recorded_seed_gives_the_recorded_table() {
        let households: std::vec::Vec<i32> = (0..60).map(|i| i / 3).collect();
        let classes: std::vec::Vec<i32> = (0..60).map(|i| i % 3).collect();
        setup(&households, &classes, 90);
        assert_eq!(abm_run(42, 0, 0.08, 0.02, 0.002, 10, 12, 8, 9), 16);
        let sum = table(90).iter().enumerate().fold(0u64, |acc, (i, x)| acc + (i as u64 + 1) * *x as u64) % (1 << 32);
        assert_eq!(sum, 967_536);
    }

    #[test]
    fn out_of_range_parameters_are_refused() {
        setup(&[0, 1], &[0, 0], 10);
        assert_eq!(abm_run(1, 2, 0.1, 0.1, 0.1, 5, 5, 3, 3), u32::MAX);
        assert_eq!(abm_run(1, 0, 1.5, 0.1, 0.1, 5, 5, 3, 3), u32::MAX);
        assert_eq!(abm_run(1, 0, 0.1, 0.1, 0.1, 6, 5, 3, 3), u32::MAX);
    }
}
