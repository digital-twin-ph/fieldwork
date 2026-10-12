import type {Position} from './types.js';

/** Nearest-neighbour with distance, once.
 *
 *  Three widgets implemented this separately — `nearest`, `access` and `slr_site_assignment` —
 *  which [the widget audit](../docs/audits/widget_audit.md) recorded as a D2 duplicate on
 *  2026-10-09 and which survived because D2 detected without deciding
 *  ([103](../docs/experiments/103-duplicates-should-merge.md)). `nearest` is the general one; the
 *  other two add domain, and all three now call this.
 *
 *  What stays with the callers is deliberate. Each pre-filters its candidates — `access` to
 *  facilities meeting an evidence threshold, `slr_site_assignment` to sites the projection extract
 *  can answer for — and each shapes the result into its own carrier with its own wording for why
 *  a point could not be matched. Those are the domain. The search is not. */

/** Great-circle distance in kilometres, on a sphere of radius 6,371.0088 km.
 *
 *  Moved here from `core.ts` on 2026-10-12 so that the one distance every nearest-neighbour
 *  search uses sits beside the search. `core.ts` re-exports it for existing callers.
 *
 *  It is a sphere, and every projection in this application is on the WGS84 ellipsoid, so it
 *  reads −0.11% to +0.56% against a geodesic depending on latitude and bearing — worst at the
 *  equator, which is nearer the practitioners this project is for than the latitude it was
 *  measured at. Audited with the other eight conversion sites by `npm run audit:metres`
 *  ([101](../docs/experiments/101-metres-into-angles.md)). */
export function distanceKm(a:Position,b:Position):number{
  const rad=(x:number)=>x*Math.PI/180, dlat=rad(b[1]-a[1]),dlon=rad(b[0]-a[0]);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dlon/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}

export interface NearestMatch<T> {candidate:T; kilometres:number}

/** The candidate nearest `from`, or null when there is nothing to match against.
 *
 *  Returns null rather than throwing, because every caller has its own thing to say about why a
 *  point went unmatched and each says it to a practitioner. A thrown error would take that away.
 *
 *  Ties go to the first candidate in the given order, which makes the result depend on the
 *  caller's ordering. That is only safe because it is stable: `nearest` keeps the layer's order,
 *  and check 19 measured the smallest margin between first and second place in the Soho fixture
 *  at 0.43 m, so a tie is near enough to arrive that the ordering is worth being deliberate
 *  about rather than incidental. */
export function nearestOf<T>(
  from:Position, candidates:readonly T[], positionOf:(candidate:T)=>Position|null|undefined,
  distance:(a:Position,b:Position)=>number=distanceKm,
):NearestMatch<T>|null{
  let best:NearestMatch<T>|null=null;
  for(const candidate of candidates){
    const position=positionOf(candidate);
    if(!position)continue;
    const kilometres=distance(from,position);
    if(!best||kilometres<best.kilometres)best={candidate,kilometres};
  }
  return best;
}
