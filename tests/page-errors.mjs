/** Collect real page errors, and only those.
 *
 *  Every browser test asserts that a page raised no errors. Under the full WebKit suite the
 *  `pageerror` handler also receives "Context is stopped" -- WebKit's own message for script
 *  that runs as the browser context closes, after the test's last assertion. It failed
 *  `micro-workflow.browser.mjs` once in the 2026-10-14 gate and passed 2/2 in isolation,
 *  which is the signature of a teardown race rather than a defect.
 *
 *  Filtered by exact message, so anything the application actually throws still fails the
 *  test. Nothing here suppresses a class of error: it suppresses one string that the browser
 *  emits about its own shutdown.
 *
 *  **And it only ever protected the files that used it.** On 2026-10-17 the full gate flaked on
 *  `rules-over-geometry` with exactly this message, and the cause was that **eighteen** test
 *  files had rolled their own `page.on('pageerror', e => errors.push(e.message))` rather than
 *  calling this. A fix written for a class of flake, documented, and applied to a fraction of
 *  the places that needed it is a fix that keeps being rediscovered — this one was rediscovered
 *  three days later. All eighteen were migrated; there are no inline handlers left, and a new
 *  one would be a regression worth catching in review.
 */
const TEARDOWN=['Context is stopped'];

export function collectPageErrors(page){
  const errors=[];
  page.on('pageerror',e=>{if(!TEARDOWN.includes(e.message))errors.push(e.message);});
  return errors;
}
