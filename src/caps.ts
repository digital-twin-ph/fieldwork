import caps from '../widgets/caps.json';

/** CAPS A RUN WAS GOVERNED BY, in the receipt.
 *
 *  The practitioner, 2026-10-22, after meeting six of them one at a time: *"Caps should also be
 *  queryable in the ontology and receipts."* A number that refuses work and appears nowhere a
 *  reader can ask about is a number nobody can argue with. Every cap is an individual in
 *  ontology/fieldwork.ttl carrying its value, its unit, what it refuses and where the number came
 *  from; this asserts which ones were in force for a run, and -- where a practitioner can change
 *  one -- what it was set to, which is not the declared default.
 *
 *  Declared in widgets/caps.json and gated by scripts/validate-caps.mjs, so a cap cannot be added
 *  in code without appearing here. */
export interface Cap {
  id:string; constant:string; iri:string; value:number; unit:string;
  basis:'measured'|'derived'|'undderived'; evidence:string; refuses:string; liftTest:string;
}
export const CAPS=(caps as {caps:Cap[]}).caps;
export const capById=(id:string):Cap|undefined=>CAPS.find(cap=>cap.id===id);

/** The caps that bound a street network, and what they were set to for this run. */
export function networkCaps(settings:{maxNodes?:number}={}):{cap:Cap;inForce:number}[] {
  const held=['graph-limit-ceiling','download-bytes-per-junction','predicted-bytes-per-element',
    'features-per-junction','edge-length','download-floor-bytes','download-floor-features']
    .map(capById).filter((cap):cap is Cap=>!!cap)
    .map(cap=>({cap,inForce:cap.value}));
  const limit=capById('graph-limit-default');
  // The graph limit is a KNOB: its declared value is the default and the run was governed by
  // whatever the practitioner set. Asserting the default here would misreport the run.
  if(limit)held.unshift({cap:limit,inForce:settings.maxNodes??limit.value});
  return held;
}

/** Turtle for those assertions, appended to an activity's facts. */
export function capFacts(activity:string,governing:{cap:Cap;inForce:number}[]):string {
  return governing.map(({cap,inForce})=>
    `<${activity}> fw:governedBy <${cap.iri}>.\n`
    +`<${cap.iri}> fw:capValueInForce ${inForce}.\n`).join('');
}
