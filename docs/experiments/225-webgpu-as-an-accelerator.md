# 225 · WebGPU as an accelerator, never a requirement

_Created 2026-11-19 · Updated 2026-11-22_

**Status:** tried, 2026-11-22: the spike ran on four browsers. WebGPU is offered on every one tried, including the gate's
Chromium with one flag; the density surface agrees with the kernel to 3 in a million at 100,000 points and is about 40
times faster on the Mac's GPU at 1,000,000; at 1,000,000 points Apple's GPU misses the agreement set beforehand by 1.5%.
Not used by any widget.

## The question

The practitioner, 2026-11-19, told that the interactive map's large point layers are drawn with WebGL, not WebGPU:
*"I think we should push WebGPU so when the need arrives, which is foreseeable, we are prepared."*

So: can Fieldwork compute on the graphics card where one is there, give the same numbers as without it, and lose
nothing on a laptop that has none?

## Looking back

- [158](158-a-study-design-is-a-set-of-facets-and-the-literature-shows-it.md), 2026-11-01: a local AI model on WebGPU
  was set aside, partly because *"WebGPU would also exclude the low-resource settings this is for."*
- [182](182-brazil-across-years.md), 2026-11-06, asked *"if WebGPU and Web Worker can speed up the computation"*: not
  proposed, because that arithmetic was small; *measure first*.
- [221](221-large-rasters-with-terrio.md): rasters are decoded by terrio in WebAssembly; the Rust kernel holds the
  regression, the scan and the agent-based model. These are the paths WebGPU would sit beside.

- 2026-11-20, GHS-POP over DR Congo read from the JRC's address was slow, and the practitioner asked: *"If this can be
  sped up by WebGPU we should explore its use."* Measured first: from the 12.3 GB file on the development Mac, the
  reduced copy of the window (517,885,446 cells, decoded and summed in blocks) took under 30 s of a 91 s Apply, the
  rest being the file's SHA-256; by address the same window is 2,070 tiles, **162 MB compressed**, and the strips it is
  read in (340 rows, tiles 512 tall) fetch most tiles twice and wait on each strip before the next. **That read is the
  network's, not arithmetic's, so WebGPU would not shorten it.** What would: strips aligned to the tiles, the next
  strip fetched while one is summed, and the fetched tiles kept on the device so a run does not fetch them again.

What differs now: maps of 250,000 points (Map 0.37.0), country rasters at 100 m streamed in strips (TODO, GHS-POP over
DR Congo), and agent-based models at scale (199, 220) are the foreseeable work where arithmetic is large.

## The rule, proposed

**WebGPU accelerates; it never decides what can be done.** Every computation runs in the Rust kernel or TypeScript
first, and that path is the reference. A WebGPU path is added only beside one, and is used only where the device
offers WebGPU and the two have been shown to agree. A laptop without WebGPU gets the same result, slower.

## The spike, proposed

1. **Where it is.** Whether WebGPU is offered: Chromium and Safari on the development Mac; Edge on Windows on a
   tester's laptop; Chromium headless in the gate and in CI (with and without its software adapter). The answer
   decides whether a WebGPU path can be tested at all.
2. **One computation, both ways.** A density surface: points to a grid, each point spread by a kernel of a stated
   bandwidth. Written in the Rust kernel and in WGSL, and compared cell by cell at 10,000, 100,000 and 1,000,000
   points on a 1,000 × 1,000 grid.
3. **What decides which runs.** A device without WebGPU, a request refused, or a lost device falls back to the kernel,
   and says which ran in the receipt.

## What it commits to, written before the result

- Agreement: every cell within 1e-5 of the kernel's value relative to the largest cell (WGSL computes in 32 bits).
- Time: reported for both, by size, on each device tried. No threshold chosen in advance.
- If headless Chromium in the gate cannot run WebGPU, that is a result: the WebGPU path would then be checked only
  on a device, and the experiment says so.

**Practitioner observation, which can come out badly:** told which path ran in a receipt, does the practitioner read
the result as equally trustworthy either way?

## The spike, run 2026-11-22

**Built.** `kernel/src/density.rs`, the reference: each point adds 3 / (π h²) · (1 − (d/h)²)² to every cell centre
within the bandwidth, in 64-bit. `src/density.ts`: the kernel's surface, and the WebGPU path, in WGSL, which bins the
points on the CPU into squares one bandwidth wide and gives each grid cell a GPU thread summing the nine bins around it,
in 32-bit, with no atomics. `tests/density.test.mjs` (Node): one point sums to its weight; a point just outside the grid
reaches its edge; an unreadable point adds nothing. The spike's own runner is not in the repository.

**1. Where WebGPU is.** On the development Mac:

| Browser | WebGPU adapter |
| --- | --- |
| Playwright's Chromium, headless, as the gate runs it | none |
| The same, with `--enable-unsafe-webgpu` | SwiftShader, a software adapter on the CPU |
| Chromium's newer headless mode, with that flag | the Mac's GPU (Apple, Metal 3) |
| Playwright's WebKit, headless | the Mac's GPU |
| The practitioner's Chrome 157 | the Mac's GPU, storage buffers of 128 MB |

So the WebGPU path can be checked in the gate and in CI on the software adapter, by one flag, and on a GPU only on a
device. Edge on Windows and a field laptop were not tried.

**2. One computation, both ways.** 1,000 × 1,000 grid, bandwidth 20 cells, points seeded, half around ten centres. Times
are the second WebGPU run; the first, which compiles the shader, took 80 to 470 ms.

| Points | Largest difference, of the peak | Kernel | Mac GPU (Chromium / WebKit / Chrome) | SwiftShader |
| --- | --- | --- | --- | --- |
| 10,000 | 8.2 × 10⁻⁷ | 31–170 ms | 8 / 12 / 15 ms | 73 ms |
| 100,000 | 3.1 × 10⁻⁶ | 216–232 ms | 16 / 18 / 21 ms | 238 ms |
| 1,000,000 | 1.01 × 10⁻⁵ | 2.1–2.3 s | 47 / 49 / 89 ms | 1.8 s |

**Against what was written before the result.** Agreement within 1 × 10⁻⁵ of the largest cell: met at 10,000 and
100,000; **not met at 1,000,000 on Apple's GPU, by 1.5%**. With compensated (Kahan) summation in the shader, SwiftShader
came to 6.7 × 10⁻⁸ at 1,000,000; Apple's Metal compiler, free to reorder floating-point arithmetic, removed the
compensation, and a second attempt to shield it (through the sum's bits) was removed as well. Time: reported above; no
threshold had been set.

**Found by the spike.** The first WebGPU surface was 6% off at 100,000 points on every adapter alike: its bins started
at the grid's edge, so points just outside it, which the kernel lets reach the edge cells, were dropped. The bins now
start one bandwidth before the grid. A disagreement identical on hardware and software is the algorithm's, not
precision's.

**3. What decides which runs.** `densityGpu` returns nothing where WebGPU is not offered, an adapter or device is
refused, or the work fails; the kernel's surface is then the answer. Checked with WebGPU absent (Chromium without the
flag): the kernel ran at every size. No widget uses either yet, so no receipt says which ran.

**What this does not establish.** That the 1,000,000-point surface on Apple's GPU is close enough: 1.01 × 10⁻⁵ of the
peak is far below what a map shows, but it is past the line drawn beforehand, and the line is kept. A WebGPU path to
use at that size needs summation the compiler cannot reorder (two-float arithmetic, or partial sums per bin), or the
line moved by a decision, not by this result. Nothing on Windows, Android or a field laptop. The practitioner observation
(whether a receipt naming the GPU reads as equally trustworthy) is not reached until a widget uses it.

## Travel time to care, measured in the kernel first (2026-11-22)

The first use the practitioner named for WebGPU: for every cell of a Nigerian state, the time to the nearest health
facility over a friction surface, for microplanning. Measured first in the kernel (`kernel/src/travel_time.rs`), as the
rule above asks. The method is the Malaria Atlas Project's, as its own script states (`R_generic_accessibilty_mapping_script_2020-1.txt`,
D. Weiss, 2020: gdistance `transition(friction, 1/mean, 8)`, `geoCorrection`, `accCost`): each cell joins its 8 neighbours, a step costs its length times the
mean of the two cells' friction, the least total found by Dijkstra's algorithm from every facility at once. Memory is
fixed at 16 bytes a cell. Four Rust tests: the 8-neighbour distances on a uniform surface, a wall gone round, an island
nothing reaches, the nearest facility winning, a row narrowed by latitude.

Timed in WebAssembly under Node on the development Mac, on synthetic states at 100 m cells (walking ground, a road every
5 km, rivers with a crossing every 10 km):

| Grid | Cells | Facilities | Time |
| --- | --- | --- | --- |
| 1,000 × 1,000 | 1.0 M | 300 | 0.6 s |
| 2,000 × 1,900 (about Kano) | 3.8 M | 1,300 | 2.7 s |
| 3,000 × 3,000 | 9.0 M | 1,300 | 8.1 s |
| 4,500 × 3,300 (about Niger state) | 14.9 M | 1,300 | 15.7 s |

**What decides it is the friction surface's resolution.** The Malaria Atlas Project's motorized and walking-only surfaces
(nominal 2019, CC BY 4.0 as Earth Engine's catalogue states, Weiss et al. 2020) are 30 arc-seconds, about 1 km: a state is
about 240 × 240 cells and takes milliseconds. GRID3's Nigeria surface (v1.0, October 2025) is 30 m: Kano would be about
42 million cells, roughly a minute and 680 MB here, which is where WebGPU or coarsening would be wanted. At 1 km, by the
rule, WebGPU is not.

**Held to that method, on Kano (2026-11-22).** MAP's 2019 motorized and walking-only friction surfaces, cut by its
WCS to 7.6–9.5° E, 10.3–12.7° N (228 × 288 cells of 30 arc-seconds), and Kano's 1,561 health facilities (eHealth
Africa's Nigeria list of 2020 on HDX, CC BY; 1,512 primary, 31 secondary, 18 tertiary). gdistance 1.6 in R 4.4 took
1.7 s for each surface; the kernel 28–32 ms. Every cell either reaches, the other reaches. The first comparison was off
by up to 0.53%, with a median of 0.17%: the kernel measured cells on a sphere and `raster` on the WGS84 ellipsoid, whose
north–south radius of curvature at 11° N is 0.53% shorter. With the ellipsoid's two radii (the meridian's for the
cell's height, the prime vertical's times the cosine for its width), the two agree on every one of the 65,664 cells
to 0.022% at most, the largest difference 0.12 minutes. So the caller gives the kernel cell sizes on the ellipsoid.
The files stay in the scratchpad, not in any repository.

**What resolution microplanning asks for (read 2026-11-22).** The WHO-UNICEF Geo-enabled Microplanning Handbook (2023)
states no friction-surface resolution. It asks that data resolution match the microplan's fidelity, so that no group is
missed; it works from settlements and from GRID3's population at 90–100 m; and the thresholds it and the AFRO RED guide
(2008) use are 2, 5 and 10 km from a facility (walk in, outreach, mobile team, in GRID3's Nigeria example) and one hour.
It recommends AccessMod, and validating modelled times with local partners against a minimum acceptable error set at the
outset, since a model gives the best case. A 1 km cell is about 12 minutes of walking and half the 2 km threshold, so
MAP's surface can place a state's or a district's settlements in the 5 and 10 km or one-hour bands, but not decide which
side of 2 km a settlement is. Deciding that matches a 100 m surface, as GRID3's population is: GRID3's 30 m friction
coarsened to 100 m, about 3.8 million cells for Kano and about 3 seconds in the kernel. So WebGPU is still not wanted;
only at 30 m would it be.

**What this does not establish.** Agreement with AccessMod; facilities beyond the box, which a cell near the state's
edge may be nearer to; the time in a browser rather than Node; and whether 1 km is fine enough for microplanning, which is a
question for the practitioner and the handbook, not for a timing. Dijkstra settles one cell at a time; a GPU version
would sweep the grid many times over, so a speed-up there is not the density spike's to assume.

## Kano at 30 m against 90 m, on GRID3's walking surface (2026-11-23)

GRID3's walking-only travel-time friction surface for Nigeria (v1.0, 2025; CC BY-SA 4.0; 30.005 m cells in UTM 32N,
minutes per metre; downloaded with the practitioner's yes, 3.37 GB, kept in the scratchpad), cut to the convex hull of
Kano's health facilities widened by 10 km, and averaged three by three to 90 m. Facilities: GRID3's Nigeria health
facilities v4.0 for Kano (CC BY 4.0), 1,847 of 2,122 kept: 264 have no coordinates, 11 are marked not functional, one
lies at 11.98° E. Cells of constant size, as the projection gives. Measured in WebAssembly under Node on the development
Mac.

| | 30 m | 90 m |
| --- | --- | --- |
| Cells | 53.6 million | 6.0 million |
| Time | 39.8 s | 2.8 s |
| Kernel memory | 893 MB | (the same buffer) |
| Within 30 minutes' walk | 36.4% | 33.9% |
| 31 to 60 minutes | 31.4% | 31.5% |
| 61 to 120 minutes | 13.2% | 14.0% |
| More than 2 hours | 19.1% | 20.6% |
| Median | 39 minutes | 42 minutes |

Shares are of the 28.7 million 30 m cells inside the facilities' hull, each against the 90 m cell holding it.

**Found:** 94.0% of the hull falls in the same band at both. The 90 m surface is slower: by 2.2 minutes at the median,
by 23 minutes or more for one place in ten. The largest differences are barriers. A cell the surface makes almost
impassable (friction above 1 minute a metre: water, mostly) is 1.22% of the hull at 30 m and 1.62% at 90 m, because
averaging spreads a barrier over a crossing narrower than 90 m; and the share of places more than ten hours away
doubles, from 1.3% to 2.7%. So 90 m places most of a state in the band 30 m does, and misplaces what lies beyond a narrow
crossing. 30 m takes 40 seconds and 900 MB in one process, which a laptop holds; WebGPU is not needed for one state.

**What this does not establish.** Kano's outline: the hull takes in about 5,800 km² of neighbouring states, where no
facility is listed, which lengthens the slow tail at both resolutions alike. Whether averaging is the right way to
coarsen (the slowest, or the median, would close or open different crossings; not tried). Settlements: the comparison is
by cell, and village-level microplanning would compare by GRID3's settlements, a further download. The time in a
browser tab. Facilities marked functional "Unknown" (808) are kept.

## What it does not establish

That a density surface is the first place WebGPU will be needed is a guess; streaming rasters and the agent-based model
may need it first. Which laptops in the field have WebGPU is not known. The spike's results are above, with their own
limits.
