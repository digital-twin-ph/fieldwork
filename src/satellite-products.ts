/** FIND SATELLITE PRODUCTS: which satellites and products measure a variable, and what each one measures.
 *
 *  The practitioner, 2026-11-05: *"EO identifies the satellite groups for those variables and STAC zeroes in on the
 *  source URLs"*, and *"The EO and STAC widgets should identify the open data sources very easily."* Experiment 179.
 *
 *  ADAPTED FROM JLT'S EO SATELLITE GUIDE (https://github.com/jltobias/JupyterLite-EO-Satellite-Guide, commit 684833c,
 *  MIT). Its curated topics and routes are vendored unchanged in `examples/eo/research-topics.json`; `resolve` below
 *  is its `explorer/research.js` matcher, ported to TypeScript. Fieldwork's additions (the routes needing no sign-in,
 *  an ozone topic, and per route what it measures, its unit, sign-in and licence as read) are in
 *  `examples/eo/routes-fieldwork.json`, kept apart so the vendored file stays exactly JLT's.
 *
 *  NOTHING HERE FETCHES. It chooses a route; where the files are is the next widget's question. */
import jlt from '../examples/eo/research-topics.json';
import fieldwork from '../examples/eo/routes-fieldwork.json';

export interface SatelliteTopic {
  id:string; label:string; aliases:string[]; broader?:string; property?:string; platforms:string[];
  routes:string[]; chain?:string; caution?:string; sources?:string[];
}
export interface SatelliteRoute {
  id:string; label:string; endpoint:string; collection:string; collection_url?:string; productType?:string;
  measurement:string; format:string; access_note:string; note?:string; platforms:string[]; verified:string;
}
export type SignIn='none'|'anonymous-token'|'account';
/** What Fieldwork has read about a route. Null is "not read", never "none". */
export interface RouteFacts {
  kind:'observation'|'model'; quantity:'column'|'optical-depth'|'index'|'surface'|string;
  unit:string|null; unitReadFrom:string|null; signIn:SignIn; licence:string|null;
  browserReadable:string; qualityRule:string|null; stream:string|null; coverageStart:string|null;
  /** The dataset citation as the producer asks for it, with where and when it was read. Null: not yet read. */
  citation:DatasetCitation|null;
}
/** A DATASET CITATION, as the producer states it, for the write-up's References. Read from the producer's own page,
 *  not the catalog: Planetary Computer's collection record carries no citation or DOI (experiment 179, S7). A DOI is
 *  per processor version, so `appliesTo` says which files it covers. */
export interface DatasetCitation {text:string; doi:string|null; appliesTo:string; readAt:string; readOn:string}
export interface Licence {
  name:string; terms:string; open:boolean; readAt:string; readOn:string; catalogSays?:string;
  attribution?:{original:string; modified:string};
}
/** A route with its facts, as the dialog shows it and the port hands it on. Facts are null where Fieldwork has none. */
export interface SatelliteProduct {
  topic:{id:string; label:string; property?:string; caution?:string; chain?:string};
  route:SatelliteRoute; facts:RouteFacts|null; licence:Licence|null;
  /** Where the route came from: JLT's curated list, or Fieldwork's additions. */
  curatedBy:'eo-satellite-guide'|'fieldwork';
}

const vendoredRoutes=(jlt as {routes:SatelliteRoute[]}).routes;
const addedRoutes=(fieldwork as unknown as {routes:SatelliteRoute[]}).routes;
const FACTS=(fieldwork as unknown as {facts:Record<string,RouteFacts>}).facts;
const LICENCES=(fieldwork as unknown as {licences:Record<string,Licence>}).licences;
const TOPIC_ROUTES=(fieldwork as unknown as {topicRoutes:Record<string,string[]>}).topicRoutes;

/** Every topic: JLT's, with Fieldwork's routes appended where it added any, then Fieldwork's new topics. */
export const SATELLITE_TOPICS:SatelliteTopic[]=[
  ...(jlt as {topics:SatelliteTopic[]}).topics.map(t=>({...t,routes:[...t.routes,...(TOPIC_ROUTES[t.id]??[])]})),
  ...(fieldwork as unknown as {topics:SatelliteTopic[]}).topics,
];
export const SATELLITE_ROUTES:Record<string,{route:SatelliteRoute; curatedBy:SatelliteProduct['curatedBy']}>=
  Object.fromEntries([...vendoredRoutes.map(r=>[r.id,{route:r,curatedBy:'eo-satellite-guide' as const}]),
    ...addedRoutes.map(r=>[r.id,{route:r,curatedBy:'fieldwork' as const}])]);
export const VENDORED=(fieldwork as unknown as {vendored:{repository:string;commit:string}}).vendored;
/** The date JLT's file was curated, as it states it. */
export const CURATED_ON=(jlt as {verified?:string}).verified??null;

/** JLT's matcher, ported: whole-phrase alias matching, and a named pollutant drops its broad parent. */
export const normalize=(text:string):string=>String(text).normalize('NFKD').replace(/₂/g,'2').replace(/₃/g,'3')
  .toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();
export function resolve(question:string):{topics:SatelliteTopic[]; platforms:Set<string>; routes:string[]}{
  const q=` ${normalize(question)} `;
  let topics=SATELLITE_TOPICS.filter(t=>t.aliases.some(a=>q.includes(` ${normalize(a)} `)));
  topics=topics.filter(t=>!topics.some(c=>c.broader===t.id));
  return {topics,platforms:new Set(topics.flatMap(t=>t.platforms)),routes:[...new Set(topics.flatMap(t=>t.routes))]};
}

const SIGN_IN_ORDER:Record<SignIn|'unknown',number>={'none':0,'anonymous-token':1,'account':2,'unknown':3};
/** THE OPEN ONES FIRST. The practitioner, 2026-11-05: *"Before sign in lets use those that don't require sign ins
 *  first."* No sign-in, then an anonymous token, then an account, then routes nobody has checked; a stable order
 *  within each. */
export function productsFor(topic:SatelliteTopic):SatelliteProduct[]{
  return topic.routes.flatMap(id=>{
    const found=SATELLITE_ROUTES[id];if(!found)return [];
    const facts=FACTS[id]??null;
    return [{topic:{id:topic.id,label:topic.label,property:topic.property,caution:topic.caution,chain:topic.chain},
      route:found.route,facts,licence:facts?.licence?LICENCES[facts.licence]??null:null,curatedBy:found.curatedBy}];
  }).map((p,i)=>({p,i})).sort((a,b)=>
    SIGN_IN_ORDER[a.p.facts?.signIn??'unknown']-SIGN_IN_ORDER[b.p.facts?.signIn??'unknown']||a.i-b.i).map(x=>x.p);
}

export const productFor=(topicId:string,routeId:string):SatelliteProduct|null=>{
  const topic=SATELLITE_TOPICS.find(t=>t.id===topicId);
  return topic?productsFor(topic).find(p=>p.route.id===routeId)??null:null;
};

export const SIGN_IN_WORDS:Record<SignIn,string>={'none':'No sign-in','anonymous-token':'No account (anonymous token)',
  'account':'Needs an account'};

/** The sentence a run states. */
export const productSentence=(p:SatelliteProduct):string=>
  `${p.topic.label}: ${p.route.label}, ${p.route.measurement.toLowerCase()}`
  +(p.facts?.unit?` in ${p.facts.unit}`:'')+'. '
  +(p.facts?SIGN_IN_WORDS[p.facts.signIn]+'. ':'Access not yet checked by Fieldwork. ')
  +(p.licence?`${p.licence.open?'Open':'Licence'}: ${p.licence.name}, read ${p.licence.readOn}.`:'Licence not yet read.')
  +(p.facts?.kind==='model'?' A model, not an observation.':'');

/** The receipt's facts: the choice, and what was and was not read about it. */
export function productFacts(entity:string,p:SatelliteProduct):string{
  const q=(v:string)=>JSON.stringify(v);
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:SatelliteProductChoice;\n`
    +`  fw:researchTopic ${q(p.topic.id)};\n  fw:satelliteRoute ${q(p.route.id)};\n`
    +`  fw:stacCatalog ${q(p.route.endpoint)};\n  fw:stacCollection ${q(p.route.collection)};\n`
    +(p.route.productType?`  fw:productType ${q(p.route.productType)};\n`:'')
    +`  fw:measuredQuantity ${q(p.facts?.quantity??'unread')};\n`
    +`  fw:observationKind ${q(p.facts?.kind??'unread')};\n`
    +`  fw:signIn ${q(p.facts?.signIn??'unread')};\n`
    +(p.licence?`  fw:licenceRead [ fw:licenceName ${q(p.licence.name)}; fw:licenceReadAt ${q(p.licence.readAt)}; `
      +`fw:licenceReadOn "${p.licence.readOn}"^^xsd:date; fw:licenceOpen ${p.licence.open} ];\n`:`  fw:licenceUnread true;\n`)
    +(p.facts?.citation?`  fw:citationRead [ fw:citationText ${q(p.facts.citation.text)}; `
      +(p.facts.citation.doi?`fw:citationDoi ${q(p.facts.citation.doi)}; `:'')
      +`fw:citationAppliesTo ${q(p.facts.citation.appliesTo)}; fw:citationReadAt ${q(p.facts.citation.readAt)}; `
      +`fw:citationReadOn "${p.facts.citation.readOn}"^^xsd:date ];\n`:`  fw:citationUnread true;\n`)
    +`  fw:curatedBy ${q(p.curatedBy)}.\n`;
}
