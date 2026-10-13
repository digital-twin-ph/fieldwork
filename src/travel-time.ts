/** Travel time from a distance, at a stated speed.
 *
 *  Extracted from `access`, which derived proxy minutes inside a nearest-neighbour search. This is
 *  the one genuinely new primitive that decomposition needs, and the reason it is a widget rather
 *  than a knob is the test experiment 107 derived: a knob is honest when the contract does not move
 *  with it. A `minutes` column changes every row for every consumer of `distances`, so the contract
 *  moves, and the knob test refuses it.
 *
 *  **It must not hide behind the unit knob either**, which is the tempting shortcut.
 *  `metres | kilometres` is a pure conversion with nothing assumed. Minutes is a **model**: a
 *  straight-line distance walked at a constant speed, which `access`'s own method string already
 *  admitted — *"Straight-line distance / walking speed; not street routing"*. Putting a model
 *  behind a unit selector would present an assumption as a unit, which is the failure this project
 *  refuses everywhere else. So the assumption is named in the receipt, every run.
 *
 *  What it is not: a routed travel time. The network widgets compute those from a graph, and this
 *  deliberately does not pretend to. A location whose straight-line proxy is five minutes may be
 *  twenty minutes away on the streets, and the receipt says so rather than leaving a reader to
 *  assume otherwise.
 */
import type {WorkflowNode} from './types.js';
import type {NearestRow,Receipt} from './results.js';

export const TRAVEL_TIME_METHOD='Straight-line distance divided by a stated walking speed. '
  +'A proxy, not a routed travel time: no street network, no barriers, no terrain and no waiting.';

export function validateTravelTime(speedMPerMin:number):void{
  if(!Number.isFinite(speedMPerMin)||speedMPerMin<10||speedMPerMin>400)
    throw new Error('Walking speed must be between 10 and 400 metres per minute.');
}

/** Minutes per row, from each row's own distance and its declared unit.
 *
 *  Reads the unit rather than assuming kilometres, because `nearest` carries a unit knob and a
 *  metre reading divided by metres-per-minute is right while a kilometre reading is wrong by a
 *  thousand. A row with no distance keeps its reason and gains no minutes: a missing distance is
 *  not a travel time of zero. */
export function travelTime(rows:NearestRow[],speedMPerMin:number):NearestRow[]{
  validateTravelTime(speedMPerMin);
  return rows.map(row=>{
    if(row.distance===null||row.distance===undefined)return {...row,minutes:null};
    const metres=row.unit==='metres'?row.distance:row.distance*1000;
    return {...row,minutes:metres/speedMPerMin};
  });
}

export function travelTimeReceipt(node:WorkflowNode<'travel_time'>,rows:NearestRow[],runId:string,sourceNodeId:string):Receipt{
  const activity=`<urn:fieldwork:run:${runId}:traveltime:${node.id}>`;
  const timed=rows.filter(r=>r.minutes!==null&&r.minutes!==undefined).length;
  const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'
    +`${activity} a fw:TravelTimeEstimate, prov:Activity; `
    +`prov:used <urn:fieldwork:run:${runId}:output:${sourceNodeId}>; `
    +`fw:assumedSpeedMetresPerMinute ${node.params.speedMPerMin}; `
    +`fw:travelMode "walking"; fw:recordCount ${rows.length}; fw:sampledCount ${timed}.\n`;
  return {nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:TRAVEL_TIME_METHOD};
}
