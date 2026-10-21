/** THE worked examples, in one place.
 *
 *  There were three lists: the ternary chain that builds a template, the allow-list `?example=`
 *  checks, and a hand-written map inside `scripts/widget-evidence.mjs`. The third had drifted --
 *  it carried nine of the twelve -- so the evidence ledger reported that `coverage_check` had no
 *  example use while the Spatial coverage exercise was built around it, and the same silence
 *  covered `case_series`, `apply_ruleset` and the rest of what the uncounted examples hold. A
 *  ledger that reads a copy of a list reports on the copy.
 *
 *  `src/project.ts` holds the TITLES, keyed by the same strings, and its own check keeps the two
 *  in step. */
import type {Workflow} from './types.js';
import {exampleWorkflow} from './core.js';
import {blankWorkflow} from './study-area.js';
import {johnSnowExample,snowExtentExample} from './john-snow.js';
import {oldNalediWorkflow} from './old-naledi.js';
import {geoprivacyExample} from './geoprivacy-example.js';
import {seaLevelExample} from './sea-level-example.js';
import {rasterExample} from './raster-example.js';
import {rulesetExample} from './ruleset-example.js';
import {hagellochExample} from './hagelloch-example.js';
import {clipExercise} from './clip-points.js';

export const EXAMPLE_TEMPLATES:Record<string,()=>Workflow>={
  blank:blankWorkflow,
  heat:exampleWorkflow,
  'old-naledi':oldNalediWorkflow,
  coverage:clipExercise,
  raster:rasterExample,
  'snow-voronoi':()=>johnSnowExample('snow-voronoi'),
  'snow-isochrone':()=>johnSnowExample('snow-isochrone'),
  'snow-geoprivacy':geoprivacyExample,
  'sea-level':seaLevelExample,
  'snow-extent':snowExtentExample,
  rulesets:rulesetExample,
  hagelloch:hagellochExample,
};
export const EXAMPLE_KEYS=Object.keys(EXAMPLE_TEMPLATES);
/** Named for what it asks -- does a TEMPLATE exist under this key. `app.ts` has its own
 *  `isExampleKey`, which asks something else: whether a STORAGE key belongs to a worked example
 *  rather than to a project's own workflow. Two questions, so two names. */
export const hasExampleTemplate=(key:string):boolean=>Object.hasOwn(EXAMPLE_TEMPLATES,key);
/** The blank workflow is a starting point rather than a worked example: it demonstrates nothing,
 *  so a ledger counting example USES must not count it. */
export const WORKED_EXAMPLE_KEYS=EXAMPLE_KEYS.filter(key=>key!=='blank');
