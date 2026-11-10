/** A SPACE-TIME PERMUTATION SCAN (experiment 200, Detect): were there more cases in some place, over some days, than the
 *  rest of the line list would lead one to expect?
 *
 *  The practitioner, 2026-11-09: *"Under detect can we add a cluster detection widget like SatScan?"* This is the
 *  retrospective space-time permutation model (Kulldorff and others, 2005), for a line list of cases with a date and a
 *  place and no population at risk. Circles over places, windows over time:
 *
 *  - every circle around each place, growing a place at a time until it holds a stated share of the cases or reaches
 *    a stated radius; places at the same distance join together, because a circle cannot hold one and not the other;
 *  - every run of consecutive days (or weeks) up to a stated share of the study period;
 *  - for each circle and run, the cases observed in both, against those expected if when a case happened had nothing to
 *    do with where: the circle's cases over the whole period times the run's cases everywhere, over all cases;
 *  - the most unusual is scored by the likelihood ratio, and tested by shuffling the dates across the fixed places
 *    many times and seeing how often a shuffle gives a higher maximum anywhere. The shuffle's random stream is seeded
 *    and recorded, so the same run gives the same p-value.
 *
 *  Secondary clusters are reported as SaTScan reports them by default: in order of score, each only where it shares no
 *  place with one already reported, and each tested against the same maximum, which is conservative.
 *
 *  What the model cannot see: a place where people simply live more densely is not a cluster here, because only the
 *  timing is compared across places. And a rise everywhere at once is not a cluster either. Nothing is dropped: a
 *  record without a readable date or a location, or outside the study period, is counted and named. */
import type {PointCollection,Position} from './types.js';

export interface ScanSettings {
  dateField:string;
  unit:'day'|'week';
  /** The largest circle, as a share of all cases (SaTScan's default 0.5) and, where given, a radius in km. */
  maxCaseShare:number; maxRadiusKm?:number;
  /** The longest run of days or weeks, as a share of the study period (SaTScan's default 0.5). */
  maxTimeShare:number;
  replications:number; seed:number;
  /** The study period, where it is not the first to the last date in the data. ISO dates. */
  start?:string; end?:string;
  /** How many clusters to report at most, the most likely first. */
  report?:number;
  /** PROSPECTIVE: only runs ending on the last day of the study period, as SaTScan's prospective scan: is something
   *  happening now, rather than was there ever a cluster. The day-by-day replay runs this once a day. */
  prospective?:boolean;
}
export interface ScanCluster {
  rank:number; start:string; end:string; units:number;
  center:Position; radiusKm:number; places:Position[]; caseIds:string[];
  observed:number; expected:number; ratio:number; llr:number;
  pValue:number; exceedances:number;
}
export interface ScanResult {
  clusters:ScanCluster[];
  totals:{records:number; cases:number; places:number; bins:number; circles:number; runs:number; windows:number};
  excluded:{noDate:number; noLocation:number; outsidePeriod:number};
  period:{start:string; end:string; unit:'day'|'week'};
  replications:number; seed:number; randomStream:'mulberry32-v1'; longestRunUnits:number; elapsedMs?:number;
}

const DAY=86_400_000, EARTH_KM=6371.0088;
const rad=(d:number)=>d*Math.PI/180;
export function haversineKm(a:Position,b:Position):number{
  const dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;
  return 2*EARTH_KM*Math.asin(Math.min(1,Math.sqrt(h)));
}
const iso=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const dayOf=(v:unknown):number|null=>{
  const t=v===null||v===undefined?'':String(v).trim();
  if(!/^\d{4}-\d{2}-\d{2}/.test(t))return null;
  const ms=Date.parse(t.slice(0,10)+'T00:00:00Z');return Number.isFinite(ms)?ms:null;
};

/** The seeded random stream, so a recorded seed reproduces a p-value exactly. */
export function mulberry32(seed:number):()=>number{
  let s=seed>>>0;
  return ()=>{s=(s+0x6d2b79f5)>>>0;let v=s;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return((v^v>>>14)>>>0)/4294967296;};
}

/** The log likelihood ratio of the space-time permutation model, for c observed against e expected of n. */
export function llrOf(c:number,e:number,n:number):number{
  if(!(c>e)||e<=0||e>=n)return 0;
  return c*Math.log(c/e)+(n-c>0?(n-c)*Math.log((n-c)/(n-e)):0);
}

export function spaceTimeScan(points:PointCollection,s:ScanSettings,onProgress?:(done:number,of:number)=>void):ScanResult{
  const began=Date.now();
  const excluded={noDate:0,noLocation:0,outsidePeriod:0};
  const startMs=s.start?dayOf(s.start):null,endMs=s.end?dayOf(s.end):null;
  const read:{id:string;ms:number;at:Position}[]=[];
  for(const f of points.features){
    const ms=dayOf(f.properties?.[s.dateField]);
    if(ms===null){excluded.noDate++;continue;}
    const at=f.geometry?.coordinates as Position|undefined;
    if(!at||!Number.isFinite(at[0])||!Number.isFinite(at[1])){excluded.noLocation++;continue;}
    if((startMs!==null&&ms<startMs)||(endMs!==null&&ms>endMs)){excluded.outsidePeriod++;continue;}
    read.push({id:String(f.id),ms,at:[at[0],at[1]]});
  }
  const n=read.length;
  if(n<4)throw new Error(`A space-time scan needs at least 4 cases with a date and a location; ${n} have both.`);
  const first=startMs??Math.min(...read.map(r=>r.ms)),last=endMs??Math.max(...read.map(r=>r.ms));
  const width=(s.unit==='week'?7:1)*DAY;
  const bins=Math.floor((last-first)/width)+1;

  // Places: one per distinct location, in a fixed order.
  const placeIndex=new Map<string,number>(),places:Position[]=[];
  const caseBin=new Int32Array(n),casePlace=new Int32Array(n);
  read.sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
  read.forEach((r,i)=>{
    const key=`${r.at[0].toFixed(6)},${r.at[1].toFixed(6)}`;
    let p=placeIndex.get(key);
    // THE PLACE IS ITS KEY, rounded to 6 decimals (about 0.1 m), and distances are measured from it. Measured from each
    // first record's raw coordinates instead, two houses equidistant from a centre after rounding differed by a hair
    // before it, so one circle was split and a set of houses never scanned: 1,346 circles where 1,347 (lab check 46).
    if(p===undefined){p=places.length;placeIndex.set(key,p);places.push([Number(r.at[0].toFixed(6)),Number(r.at[1].toFixed(6))]);}
    casePlace[i]=p;caseBin[i]=Math.floor((r.ms-first)/width);
  });
  const P=places.length;
  if(P<2||bins<2)throw new Error(`A space-time scan needs cases at 2 places or more, over 2 ${s.unit}s or more; these are at ${P} place${P===1?'':'s'} over ${bins} ${s.unit}${bins===1?'':'s'}.`);
  const placeCases=new Int32Array(P);for(let i=0;i<n;i++)placeCases[casePlace[i]!]++;

  // Circles: around each place, places joined in order of distance, ties together, up to the limits. Each distinct
  // set of places is kept once, at its smallest radius, as a step (center, how many of its ordered places).
  const cap=n*s.maxCaseShare,maxKm=s.maxRadiusKm??Infinity;
  const orders:Int32Array[]=[],distances:Float64Array[]=[];
  const circles:{center:number;size:number;radiusKm:number;cases:number}[]=[];
  const seen=new Set<string>();
  for(let c=0;c<P;c++){
    const order=[...Array(P).keys()].map(p=>({p,d:haversineKm(places[c]!,places[p]!)})).sort((a,b)=>a.d-b.d||a.p-b.p);
    orders.push(Int32Array.from(order.map(o=>o.p)));distances.push(Float64Array.from(order.map(o=>o.d)));
    let k=0,cases=0;
    while(k<P){
      const d=order[k]!.d;if(d>maxKm+1e-9)break;
      let j=k,add=0;while(j<P&&Math.abs(order[j]!.d-d)<1e-9){add+=placeCases[order[j]!.p]!;j++;}
      if(cases+add>cap+1e-9)break;
      cases+=add;k=j;
      const key=order.slice(0,k).map(o=>o.p).sort((a,b)=>a-b).join(',');
      if(!seen.has(key)){seen.add(key);circles.push({center:c,size:k,radiusKm:d,cases});}
    }
  }
  if(!circles.length)throw new Error('The limits on the circle leave no circle to scan: even one place holds more than the share of cases allowed.');
  const longest=Math.max(1,Math.floor(bins*s.maxTimeShare));
  const runs=(()=>{let r=0;for(let a=0;a<bins;a++)r+=Math.min(longest,bins-a);return r;})();

  // THE SCAN, over one assignment of cases to bins: the highest score anywhere, and every circle's best window when
  // asked for. Counts per bin are built per center a place at a time, so nested circles share the work.
  const byCenter=new Map<number,typeof circles>();
  for(const c of circles)(byCenter.get(c.center)??byCenter.set(c.center,[]).get(c.center)!).push(c);
  const placeBin=new Int32Array(P*bins),timeTotals=new Float64Array(bins+1),acc=new Int32Array(bins),prefix=new Float64Array(bins+1),occupied=new Int32Array(bins);
  type Window={circle:number;a:number;b:number;c:number;e:number;llr:number};
  const scan=(binOf:Int32Array,keep?:Window[]):number=>{
    placeBin.fill(0);const perBin=new Float64Array(bins);
    for(let i=0;i<n;i++){placeBin[casePlace[i]!*bins+binOf[i]!]!++;perBin[binOf[i]!]!++;}
    timeTotals[0]=0;for(let t=0;t<bins;t++)timeTotals[t+1]=timeTotals[t]!+perBin[t]!;
    let best=0;
    for(const [center,list] of byCenter){
      acc.fill(0);const order=orders[center]!;let taken=0;
      for(const circle of list){
        while(taken<circle.size){const p=order[taken++]!;for(let t=0;t<bins;t++)acc[t]!+=placeBin[p*bins+t]!;}
        prefix[0]=0;for(let t=0;t<bins;t++)prefix[t+1]=prefix[t]!+acc[t]!;
        // ONLY RUNS THAT START AND END ON A DAY WITH A CASE IN THE CIRCLE. Trimming an empty day off either end lowers
        // what is expected and leaves what is observed, so the score can only rise: the best run is always among these.
        // Exact, not an approximation, and it is what makes the shuffles fast enough to run in a browser.
        let k=0;for(let t=0;t<bins;t++)if(acc[t]!>0)occupied[k++]=t;
        const share=circle.cases/n;let own=0,ownA=0,ownB=0,ownC=0,ownE=0;
        // Prospective: the run must end on the last day, empty or not; only its start is trimmed to a day with a case.
        const lastBin=bins-1;
        for(let i=0;i<k;i++){
          const a=occupied[i]!;
          if(s.prospective&&lastBin-a>=longest)continue;
          for(let j=s.prospective?k-1:i;j<k;j++){
            const b=s.prospective?lastBin:occupied[j]!;if(b-a>=longest)break;
            const c=prefix[b+1]!-prefix[a]!,e=share*(timeTotals[b+1]!-timeTotals[a]!);
            if(c<=e)continue;
            const l=llrOf(c,e,n);
            if(l>own){own=l;ownA=a;ownB=b;ownC=c;ownE=e;}
          }
        }
        if(own>best)best=own;
        if(keep&&own>0)keep.push({circle:circles.indexOf(circle),a:ownA,b:ownB,c:ownC,e:ownE,llr:own});
      }
    }
    return best;
  };

  const windows:Window[]=[];
  scan(caseBin,windows);
  windows.sort((x,y)=>y.llr-x.llr||y.c-x.c||x.a-y.a);
  const picked:Window[]=[],used=new Set<number>(),limit=s.report??10;
  for(const w of windows){
    if(picked.length>=limit)break;
    const circle=circles[w.circle]!,members=[...orders[circle.center]!.slice(0,circle.size)];
    if(members.some(p=>used.has(p)))continue;
    members.forEach(p=>used.add(p));picked.push(w);
  }

  // THE TEST: dates shuffled across the fixed places, the highest score anywhere each time.
  const random=mulberry32(s.seed),shuffled=Int32Array.from(caseBin),maxima=new Float64Array(s.replications);
  for(let r=0;r<s.replications;r++){
    for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=shuffled[i]!;shuffled[i]=shuffled[j]!;shuffled[j]=t;}
    maxima[r]=scan(shuffled);
    if(onProgress&&((r+1)%Math.max(1,Math.floor(s.replications/100))===0||r+1===s.replications))onProgress(r+1,s.replications);
  }

  const clusters=picked.map((w,index)=>{
    const circle=circles[w.circle]!,members=[...orders[circle.center]!.slice(0,circle.size)],inside=new Set(members);
    const exceedances=maxima.reduce((k,m)=>k+(m+1e-9>=w.llr?1:0),0);
    const caseIds:string[]=[];for(let i=0;i<n;i++)if(inside.has(casePlace[i]!)&&caseBin[i]!>=w.a&&caseBin[i]!<=w.b)caseIds.push(read[i]!.id);
    return {rank:index+1,start:iso(first+w.a*width),end:iso(Math.min(last,first+(w.b+1)*width-DAY)),units:w.b-w.a+1,
      center:places[circle.center]!,radiusKm:circle.radiusKm,places:members.map(p=>places[p]!),caseIds,
      observed:w.c,expected:w.e,ratio:w.c/w.e,llr:w.llr,pValue:(1+exceedances)/(1+s.replications),exceedances};
  });
  return {clusters,
    totals:{records:points.features.length,cases:n,places:P,bins,circles:circles.length,runs,windows:circles.length*runs},
    excluded,period:{start:iso(first),end:iso(last),unit:s.unit},
    replications:s.replications,seed:s.seed,randomStream:'mulberry32-v1',longestRunUnits:longest,elapsedMs:Date.now()-began};
}

/** The scan in a Worker where there is one, and inline where there is not (Node, the tests). */
export function computeSpaceTimeScan(points:PointCollection,settings:ScanSettings,onProgress?:(done:number,of:number)=>void):Promise<ScanResult>{
  return inWorker(points,settings,false,onProgress) as Promise<ScanResult>;
}
export function computeSpaceTimeReplay(points:PointCollection,settings:ScanSettings,onProgress?:(done:number,of:number)=>void):Promise<ScanReplay>{
  return inWorker(points,settings,true,onProgress) as Promise<ScanReplay>;
}
function inWorker(points:PointCollection,settings:ScanSettings,replay:boolean,onProgress?:(done:number,of:number)=>void):Promise<ScanResult|ScanReplay>{
  if(typeof Worker==='undefined')return Promise.resolve(replay?spaceTimeReplay(points,settings,onProgress):spaceTimeScan(points,settings,onProgress));
  return new Promise((resolve,reject)=>{
    const worker=new Worker('./build/space-time-scan-worker.js');
    const boot=setTimeout(()=>{worker.terminate();reject(new Error('The space-time scan did not start, so nothing was computed. Reload the page; if it persists, the offline cache may be incomplete.'));},4000);
    worker.onmessage=({data}:MessageEvent<{alive?:boolean;progress?:[number,number];result?:ScanResult|ScanReplay;error?:string}>)=>{
      if(data.alive){clearTimeout(boot);return;}
      if(data.progress){onProgress?.(...data.progress);return;}
      worker.terminate();
      if(data.result)resolve(data.result);else reject(new Error(data.error??'The space-time scan failed.'));
    };
    worker.onerror=event=>{clearTimeout(boot);worker.terminate();reject(new Error(event.message||'The space-time scan failed to start.'));};
    worker.postMessage({points,settings,replay});
  });
}

/** A circle on the ground, as a polygon of 64 sides, `km` from `center`. A cluster at one place has no radius; it is
 *  drawn 15 m round, and its radius is reported as 0. */
const DRAWN_MIN_KM=0.015;
function circle(center:Position,km:number):Position[]{
  const r=Math.max(km,DRAWN_MIN_KM)/EARTH_KM,lat=rad(center[1]),lon=rad(center[0]),ring:Position[]=[];
  for(let i=0;i<=64;i++){
    const bearing=(i%64)/64*2*Math.PI;
    const la=Math.asin(Math.sin(lat)*Math.cos(r)+Math.cos(lat)*Math.sin(r)*Math.cos(bearing));
    const lo=lon+Math.atan2(Math.sin(bearing)*Math.sin(r)*Math.cos(lat),Math.cos(r)-Math.sin(lat)*Math.sin(la));
    ring.push([lo*180/Math.PI,la*180/Math.PI]);
  }
  return ring;
}

const round=(v:number,d=2)=>Math.round(v*10**d)/10**d;
const plural=(v:number,one:string,many=one+'s')=>`${v.toLocaleString('en-US')} ${v===1?one:many}`;

/** One sentence of what the scan found, for the result and the receipt. The p-value is stated as computed; no
 *  threshold is applied here, because which one to use is the practitioner's call, and stated in their write-up. */
export function scanSentence(r:ScanResult,dateField:string):string{
  const top=r.clusters[0];
  const ex=r.excluded,left=ex.noDate+ex.noLocation+ex.outsidePeriod;
  return `${plural(r.totals.cases,'case')} at ${plural(r.totals.places,'place')}, ${r.period.start} to ${r.period.end} by ${r.period.unit} of ${dateField}`
    +(left?` (${[ex.noDate?`${ex.noDate} without a readable date`:'',ex.noLocation?`${ex.noLocation} without a location`:'',ex.outsidePeriod?`${ex.outsidePeriod} outside the period`:''].filter(Boolean).join(', ')}, not scanned)`:'')
    +`; ${r.totals.windows.toLocaleString('en-US')} circles and runs scanned. `
    +(top?`The most likely cluster: ${plural(top.observed,'case')} where ${round(top.expected)} were expected, at ${plural(top.places.length,'place')}`
      +`${top.radiusKm>0?` within ${round(top.radiusKm*1000,0)} m`:''}, ${top.start} to ${top.end}; p = ${round(top.pValue,3)} from ${r.replications.toLocaleString('en-US')} shuffles of the dates (seed ${r.seed}).`
      +(r.clusters.length>1?` ${plural(r.clusters.length-1,'secondary cluster')} sharing no place with it, each tested against the same shuffles.`:'')
     :'No circle and run held more cases than expected.');
}

/** The clusters as a polygon layer, so Map draws them and Table lists them, with the receipt. */
export function scanValue(r:ScanResult,node:{id:string;params:{label:string;dateField:string}},runId:string,sourceId:string){
  const features=r.clusters.map(c=>({
    id:`cluster-${c.rank}`,name:`Cluster ${c.rank}`,
    // SaTScan's own two kinds, so the key tells the most likely cluster from the rest. No p-value threshold is drawn.
    category:c.rank===1?'Most likely cluster':'Secondary cluster',
    geometry:{type:'Polygon' as const,coordinates:[circle(c.center,c.radiusKm)]},
    properties:{cluster:c.rank,first_day:c.start,last_day:c.end,[`${r.period.unit}s`]:c.units,places:c.places.length,
      radius_m:round(c.radiusKm*1000,0),observed:c.observed,expected:round(c.expected),observed_over_expected:round(c.ratio),
      log_likelihood_ratio:round(c.llr,3),p_value:round(c.pValue,4),cases:c.caseIds.join(', ')},
  }));
  const sentence=scanSentence(r,node.params.dateField);
  const activity=`<urn:fieldwork:run:${runId}:scan:${node.id}>`;
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'
    +`${activity} a fw:SpaceTimeScan, prov:Activity; prov:used <urn:fieldwork:source:${sourceId}>; `
    +`fw:scanModel "space-time permutation"; fw:dateColumn ${JSON.stringify(node.params.dateField)}; fw:timeUnit "${r.period.unit}"; `
    +`fw:studyStart "${r.period.start}"; fw:studyEnd "${r.period.end}"; fw:casesScanned ${r.totals.cases}; fw:placesScanned ${r.totals.places}; `
    +`fw:windowsScanned ${r.totals.windows}; fw:longestRunUnits ${r.longestRunUnits}; fw:replications ${r.replications}; fw:randomSeed ${r.seed}; `
    +`fw:randomStream "${r.randomStream}"; fw:recordsWithoutDate ${r.excluded.noDate}; fw:recordsWithoutLocation ${r.excluded.noLocation}; `
    +`fw:recordsOutsidePeriod ${r.excluded.outsidePeriod}.\n`;
  for(const c of r.clusters){
    const id=`<urn:fieldwork:run:${runId}:scan:${node.id}:cluster:${c.rank}>`;
    facts+=`${activity} fw:reportsCluster ${id}.\n${id} a fw:ScanCluster; fw:clusterRank ${c.rank}; fw:firstDay "${c.start}"; fw:lastDay "${c.end}"; `
      +`fw:placesInCluster ${c.places.length}; fw:radiusMetres ${round(c.radiusKm*1000,1)}; fw:observedCases ${c.observed}; `
      +`fw:expectedCases ${round(c.expected,4)}; fw:logLikelihoodRatio ${round(c.llr,6)}; fw:pValue ${round(c.pValue,6)}; fw:monteCarloExceedances ${c.exceedances}.\n`;
  }
  const value={features,sites:[],crs:'EPSG:4326',layerName:node.params.label,featuresNamed:true,
    method:'Space-time permutation scan (Kulldorff and others, 2005): circles over places and runs over time, scored by the likelihood ratio and tested by shuffling the dates across fixed places.',
    notes:[sentence,'A cluster at one place has no radius and is drawn 15 m round.']};
  return {value,sentence,receipt:{nodeId:node.id,kind:'computation' as const,input:facts,facts,rules:'',conclusions:[],
    method:`${sentence} Scored by the log likelihood ratio of the space-time permutation model; secondary clusters reported, in order of score, only where they share no place with one already reported.`}};
}

export const SCAN_DEFAULTS={unit:'day' as const,maxCaseShare:0.5,maxTimeShare:0.5,replications:999,report:10};
/** A recorded seed, so a run is reproducible; chosen once when the step is made. */
export const newScanSeed=()=>Math.floor(Math.random()*0xffffffff)>>>0;

export function validateScanParams(p:Record<string,unknown>):void{
  const isDate=(v:unknown)=>v===undefined||(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v));
  if(typeof p.dateField!=='string'||p.dateField.length>200)throw new Error('Invalid space-time scan settings.');
  if(p.unit!=='day'&&p.unit!=='week')throw new Error('Scan by day or by week.');
  for(const key of ['maxCaseShare','maxTimeShare'] as const){const v=p[key];
    if(typeof v!=='number'||!(v>0&&v<=0.5))throw new Error('The largest circle and the longest run are each a share of more than 0 and at most 0.5, as in SaTScan.');}
  if(p.maxRadiusKm!==undefined&&(typeof p.maxRadiusKm!=='number'||!(p.maxRadiusKm>0&&p.maxRadiusKm<=20000)))throw new Error('The largest radius is more than 0 and at most 20,000 km.');
  if(!Number.isInteger(p.replications)||(p.replications as number)<99||(p.replications as number)>99999)throw new Error('Shuffle the dates from 99 to 99,999 times.');
  if(!Number.isInteger(p.seed)||(p.seed as number)<0||(p.seed as number)>0xffffffff)throw new Error('The seed is a whole number from 0 to 4,294,967,295.');
  if(!isDate(p.start)||!isDate(p.end))throw new Error('Write the study period as YYYY-MM-DD.');
  if(p.start&&p.end&&String(p.start)>String(p.end))throw new Error('The study period starts on or before it ends.');
  if(p.replay!==undefined&&typeof p.replay!=='boolean')throw new Error('Invalid space-time scan settings.');
  if(p.report!==undefined&&(!Number.isInteger(p.report)||(p.report as number)<1||(p.report as number)>50))throw new Error('Report from 1 to 50 clusters.');
}

/** ONE DAY OF THE REPLAY: what a prospective scan would have said that evening, from the cases known by then. */
export interface ReplayDay {day:string; cases:number; cluster:ScanCluster|null; skipped?:string}
export interface ScanReplay {days:ReplayDay[]; replications:number; seed:number;
  /** The first day the most likely cluster's p-value was at or under each level, where it was. */
  firstAt:Record<string,string|null>}
export const REPLAY_LEVELS=[0.05,0.01] as const;

/** THE DAY-BY-DAY REPLAY (experiment 200, Detect): the prospective scan run each day of the outbreak on the cases with a
 *  date up to that day, the study period always starting on the first case. Each day's p-value is that day's alone:
 *  looking every day and stopping at the first small p-value raises the chance of a false alarm, which SaTScan can
 *  correct for over a run of analyses and this does not. So the replay says when a scan would first have flagged
 *  something; it does not say that flag was right. Cases are placed on the day of their date, which was not the day
 *  they were reported. */
export function spaceTimeReplay(points:PointCollection,s:ScanSettings,onProgress?:(done:number,of:number)=>void):ScanReplay{
  const days=points.features.map(f=>dayOf(f.properties?.[s.dateField])).filter((d):d is number=>d!==null);
  if(!days.length)throw new Error(`No case has a readable date in ${s.dateField}.`);
  const first=s.start?dayOf(s.start)!:Math.min(...days),last=s.end?dayOf(s.end)!:Math.max(...days);
  const out:ReplayDay[]=[],step=(s.unit==='week'?7:1)*DAY;
  const total=Math.floor((last-first)/step)+1;
  for(let i=0,at=first;at<=last;i++,at+=step){
    const day=iso(at);
    const known=points.features.filter(f=>{const d=dayOf(f.properties?.[s.dateField]);return d!==null&&d<=at;}).length;
    try{
      const r=spaceTimeScan(points,{...s,start:iso(first),end:day,prospective:true,report:1});
      out.push({day,cases:r.totals.cases,cluster:r.clusters[0]??null});
    }catch(error){out.push({day,cases:known,cluster:null,skipped:error instanceof Error?error.message:String(error)});}
    onProgress?.(i+1,total);
  }
  const firstAt=Object.fromEntries(REPLAY_LEVELS.map(level=>[String(level),out.find(d=>d.cluster&&d.cluster.pValue<=level)?.day??null]));
  return {days:out,replications:s.replications,seed:s.seed,firstAt};
}

/** What the replay found, in one sentence. Each level is the conventional one, stated; none is applied as a rule. */
export function replaySentence(r:ScanReplay,dateField:string):string{
  const scanned=r.days.filter(d=>!d.skipped),skipped=r.days.length-scanned.length;
  const at=(level:string)=>r.firstAt[level];
  const flagged=r.days.find(d=>d.day===at('0.05'))?.cluster;
  return `A prospective scan each day by ${dateField}, ${r.days[0]?.day} to ${r.days.at(-1)?.day}: ${plural(scanned.length,'day')} scanned`
    +(skipped?`, ${skipped} too early to scan (fewer than 4 cases, 2 places or 2 days)`:'')+'. '
    +(flagged?`The first day the most likely cluster had p at or under 0.05 was ${at('0.05')}: ${plural(flagged.observed,'case')} where ${round(flagged.expected)} were expected, at ${plural(flagged.places.length,'place')}, from ${flagged.start}`
      +` (p = ${round(flagged.pValue,3)}).`:'On no day did the most likely cluster have p at or under 0.05.')
    +(at('0.01')?` At or under 0.01: first on ${at('0.01')}.`:' On no day at or under 0.01.')
    +` Each day's p-value is that day's alone, from ${r.replications.toLocaleString('en-US')} shuffles (seed ${r.seed}); looking every day raises the chance of a false alarm, which this does not correct.`;
}

/** The replay as a layer: one feature per day with a cluster, at that day's most likely circle, carrying the day. */
export function replayValue(r:ScanReplay,node:{id:string;params:{label:string;dateField:string}},runId:string,sourceId:string){
  const withCluster=r.days.filter(d=>d.cluster);
  const features=withCluster.map(d=>{const c=d.cluster!;return {
    id:`day-${d.day}`,name:d.day,geometry:{type:'Polygon' as const,coordinates:[circle(c.center,c.radiusKm)]},
    properties:{analysis_day:d.day,cases_known:d.cases,first_day:c.start,places:c.places.length,radius_m:round(c.radiusKm*1000,0),
      observed:c.observed,expected:round(c.expected),observed_over_expected:round(c.ratio),log_likelihood_ratio:round(c.llr,3),
      p_value:round(c.pValue,4),cases:c.caseIds.join(', ')}};});
  const sentence=replaySentence(r,node.params.dateField);
  const activity=`<urn:fieldwork:run:${runId}:replay:${node.id}>`;
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'
    +`${activity} a fw:SpaceTimeReplay, prov:Activity; prov:used <urn:fieldwork:source:${sourceId}>; fw:dateColumn ${JSON.stringify(node.params.dateField)}; `
    +`fw:daysScanned ${r.days.filter(d=>!d.skipped).length}; fw:daysTooEarly ${r.days.filter(d=>d.skipped).length}; fw:replications ${r.replications}; fw:randomSeed ${r.seed}`
    +(r.firstAt['0.05']?`; fw:firstDayAtOrUnder05 "${r.firstAt['0.05']}"`:'')+(r.firstAt['0.01']?`; fw:firstDayAtOrUnder01 "${r.firstAt['0.01']}"`:'')+'.\n';
  for(const d of withCluster){const c=d.cluster!,id=`<urn:fieldwork:run:${runId}:replay:${node.id}:${d.day}>`;
    facts+=`${activity} fw:reportsCluster ${id}.\n${id} a fw:ScanCluster; fw:analysisDay "${d.day}"; fw:firstDay "${c.start}"; fw:lastDay "${c.end}"; `
      +`fw:placesInCluster ${c.places.length}; fw:observedCases ${c.observed}; fw:expectedCases ${round(c.expected,4)}; fw:logLikelihoodRatio ${round(c.llr,6)}; fw:pValue ${round(c.pValue,6)}.\n`;}
  const captions=Object.fromEntries(r.days.map(d=>[d.day,d.skipped?`${plural(d.cases,'case')} known: too early to scan`
    :d.cluster?`${plural(d.cases,'case')} known; most likely cluster ${plural(d.cluster.observed,'case')} where ${round(d.cluster.expected)} were expected, p = ${round(d.cluster.pValue,3)}`
    :`${plural(d.cases,'case')} known; no circle above what was expected`]));
  const value={features,sites:[],crs:'EPSG:4326',layerName:node.params.label,featuresNamed:false,
    timeline:{days:r.days.map(d=>d.day),dateField:node.params.dateField,captions},
    method:'Prospective space-time permutation scan, run each day on the cases known by then: only runs ending that day.',
    notes:[sentence]};
  return {value,sentence,receipt:{nodeId:node.id,kind:'computation' as const,input:facts,facts,rules:'',conclusions:[],method:sentence}};
}
