/** FACILITIES FOUND FROM A LIST (experiment 190): each row of a list, by the facility it names, matched to one facility
 *  of a national register, a register at a time, in the order given.
 *
 *  Nothing here is one country's. A register is a catalogue entry (widgets/facility-registers.json, generated from the
 *  fw:FacilityRegister individuals in the ontology) that says which of its fields hold the name, type, area, identifier
 *  and coordinates; its type words are read from its own type field. The words that mark a name as an area are a
 *  setting. Matching compares a name's bare part and its type apart, so "Sanya MCHP" against the register's "Sanya CHP"
 *  is a type that differs, said for review, and never a match. No row is dropped; each gets one of the six outcomes the
 *  ontology closes (fw:FacilityMatchOutcome). */
import {jaroWinkler} from './deduplicate-points.js';

export type MatchOutcome='exact'|'spelling'|'type-differs'|'ambiguous'|'area'|'not-found';
/** The ontology's word for each outcome. */
export const OUTCOME_IRI:Record<MatchOutcome,string>={exact:'urn:fieldwork:MatchedExactly',
  spelling:'urn:fieldwork:MatchedAllowingForSpelling','type-differs':'urn:fieldwork:TypeDiffers',
  ambiguous:'urn:fieldwork:AmbiguousMatch',area:'urn:fieldwork:AreaNotFacility','not-found':'urn:fieldwork:NotFoundInRegister'};
export const OUTCOME_WORDS:Record<MatchOutcome,string>={exact:'matched exactly',spelling:'matched allowing for spelling',
  'type-differs':'type differs',ambiguous:'ambiguous',area:'an area, not a facility','not-found':'not found'};
export const MATCH_OUTCOMES=Object.keys(OUTCOME_WORDS) as MatchOutcome[];
/** Each outcome's row count, as the receipt asserts it, named in full so the ontology can declare each. */
export const OUTCOME_COUNT_PROPERTY:Record<MatchOutcome,string>={exact:'fw:matchedExactlyRowCount',
  spelling:'fw:matchedAllowingForSpellingRowCount','type-differs':'fw:typeDiffersRowCount',ambiguous:'fw:ambiguousMatchRowCount',
  area:'fw:areaNotFacilityRowCount','not-found':'fw:notFoundInRegisterRowCount'};

/** A step's settings for matching a list (experiment 190). */
export interface FacilityListSettings {nameColumn:string; areaColumn?:string; registers:string[]; threshold:number;
  areaMarkers:string[]; decisions:Record<string,string>}
export const DEFAULT_LIST_SETTINGS=(registers:string[]):FacilityListSettings=>
  ({nameColumn:'',registers,threshold:0.88,areaMarkers:['Communities'],decisions:{}});

export interface RegisterEntry {id:string; title:string; country:string; licence:string; url:string; readable:boolean;
  fields:{name:string|null; alternateName:string|null; type:string|null; area:string|null; identifier:string|null;
    latitude:string|null; longitude:string|null}}
export interface RegisterFacility {id:string; name:string; alternateName?:string; type:string; area:string;
  longitude:number|null; latitude:number|null}
export interface LoadedRegister {register:RegisterEntry; facilities:RegisterFacility[]}

/** A register's records, read through its own field map. */
export function facilitiesFrom(register:RegisterEntry,records:readonly Record<string,unknown>[]):RegisterFacility[]{
  const f=register.fields;
  if(!register.readable||!f.name||!f.type)throw new Error(`${register.title} cannot be read: its fields are not all known.`);
  const text=(v:unknown)=>v===null||v===undefined?'':String(v).trim();
  const number=(v:unknown)=>{const n=Number(v);return v===null||v===undefined||v===''||!Number.isFinite(n)?null:n;};
  return records.map((r,i)=>({id:text(f.identifier?r[f.identifier]:'')||`row-${i+1}`,name:text(r[f.name!]),
    ...(f.alternateName&&text(r[f.alternateName])?{alternateName:text(r[f.alternateName])}:{}),
    type:text(r[f.type!]),area:text(f.area?r[f.area]:''),
    longitude:f.longitude?number(r[f.longitude]):null,latitude:f.latitude?number(r[f.latitude]):null}))
    .filter(x=>x.name);
}

const fold=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

/** A NAME'S PARTS: the bracket set aside as a qualifier ("Sumbuya (Koya) CHP"), the type when its last word is one of the
 *  register's type words, and the bare name that is left. */
export function nameParts(name:string,typeWords:ReadonlySet<string>):{bare:string; type:string; qualifier:string}{
  const qualifier=fold([...name.matchAll(/\(([^)]*)\)/g)].map(m=>m[1]).join(' '));
  const words=fold(name.replace(/\([^)]*\)/g,' ')).split(' ').filter(Boolean);
  const last=words.at(-1)??'';
  const type=words.length>1&&typeWords.has(last)?last:'';
  return {bare:(type?words.slice(0,-1):words).join(' '),type,qualifier};
}

export interface MatchSettings {
  /** Jaro-Winkler similarity a bare name must reach, as Deduplicate records' default. */
  threshold:number;
  /** Two candidates within this of the best are both kept, and the name is ambiguous unless something tells them apart. */
  margin?:number;
  /** Words that mark a name as an area, not a facility: "Communities". */
  areaMarkers:string[];
  /** What the practitioner chose for a name: a facility's identifier, or "none". By the list's own name. */
  decisions?:Record<string,string>;
}
export interface Candidate {facility:RegisterFacility; register:string; score:number}
export interface RowMatch {
  outcome:MatchOutcome;
  /** The facility handed on: matched, or chosen by the practitioner. */
  facility?:RegisterFacility; register?:string; score?:number;
  /** What was weighed, best first: for ambiguous names and types that differ, what the practitioner chooses among. */
  candidates:Candidate[];
  /** A choice the practitioner made, which is why an ambiguous or type-differs row has a facility. */
  decided?:boolean;
}

/** Every distinct name, matched once: a list names the same facility on many rows. */
export function matchFacilityNames(names:readonly {name:string; area?:string}[],registers:readonly LoadedRegister[],
  settings:MatchSettings):Map<string,RowMatch>{
  const margin=settings.margin??0.02;
  const markers=settings.areaMarkers.map(fold).filter(Boolean);
  const indexed=registers.map(({register,facilities})=>{
    const typeWords=new Set(facilities.map(f=>fold(f.type)).filter(Boolean));
    const parts=facilities.map(f=>{const p=nameParts(f.name,typeWords);
      // A register that writes its names bare (a type field beside them) gives its type from the field.
      return {facility:f,bare:p.bare,type:fold(f.type)||p.type,
        alternate:f.alternateName?nameParts(f.alternateName,typeWords).bare:''};});
    const byBare=new Map<string,typeof parts>();
    for(const p of parts)for(const key of new Set([p.bare,p.alternate].filter(Boolean)))
      byBare.set(key,[...(byBare.get(key)??[]),p]);
    return {register:register.id,typeWords,parts,byBare};
  });
  const areaOf=(area?:string)=>fold((area??'').replace(/\b(district|region|province|state|county)\b/gi,' '));
  const out=new Map<string,RowMatch>();
  for(const {name,area} of names){
    if(out.has(name))continue;
    const folded=` ${fold(name)} `;
    if(markers.some(m=>folded.includes(` ${m} `))){out.set(name,{outcome:'area',candidates:[]});continue;}
    let found:RowMatch|undefined;
    for(const reg of indexed){
      const row=nameParts(name,reg.typeWords);
      if(!row.bare)continue;
      // Tell candidates apart by what the row says of its place: its area, then its bracketed qualifier.
      const narrow=(list:{facility:RegisterFacility}[])=>{
        const a=areaOf(area),q=row.qualifier;
        let keep=a?list.filter(c=>areaOf(c.facility.area)===a||areaOf(c.facility.area).includes(a)||a.includes(areaOf(c.facility.area))):list;
        if(keep.length!==1&&q)keep=(keep.length?keep:list).filter(c=>fold(`${c.facility.area} ${c.facility.name} ${c.facility.alternateName??''}`).includes(q));
        return keep.length===1?keep:list;
      };
      const sameType=(p:{type:string})=>!row.type||!p.type||p.type===row.type;
      const exact=reg.byBare.get(row.bare)??[];
      let pool:{facility:RegisterFacility;type:string;score:number}[];
      if(exact.length)pool=exact.map(p=>({facility:p.facility,type:p.type,score:1}));
      else{
        // A SPELLING IS A WORD MISSPELT, not a word missing: "Makump" and "Makump Bana" share a beginning, which
        // Jaro-Winkler rewards, and are two names. One that is the other's words and more is no spelling match
        // (2026-11-08, on Sierra Leone's names).
        const similar=(a:string,b:string)=>{if(!b)return 0;const x=a.split(' '),y=b.split(' ');
          const [short,long]=x.length<=y.length?[x,y]:[y,x];
          return short.length<long.length&&short.every((w,i)=>long[i]===w)?0:jaroWinkler(a,b);};
        const scored=reg.parts.map(p=>({facility:p.facility,type:p.type,
          score:Math.max(similar(row.bare,p.bare),similar(row.bare,p.alternate))}))
          .filter(c=>c.score>=settings.threshold).sort((x,y)=>y.score-x.score);
        pool=scored.length?scored.filter(c=>c.score>=scored[0]!.score-margin):[];
      }
      if(!pool.length)continue;
      const candidates=pool.map(c=>({facility:c.facility,register:reg.register,score:c.score}));
      const typed=pool.filter(sameType);
      const narrowed=narrow(typed.length?typed:pool) as typeof pool;
      const one=narrowed.length===1?narrowed[0]!:undefined;
      found=!one?{outcome:'ambiguous',candidates}
        :!sameType(one)?{outcome:'type-differs',candidates,register:reg.register,score:one.score}
        :{outcome:one.score===1?'exact':'spelling',facility:one.facility,register:reg.register,score:one.score,candidates};
      if(found.outcome==='type-differs')found.candidates=[{facility:one!.facility,register:reg.register,score:one!.score},
        ...candidates.filter(c=>c.facility!==one!.facility)];
      break;
    }
    found??={outcome:'not-found',candidates:[]};
    // THE PRACTITIONER'S CHOICE, where there was one to make. "none" leaves the row without a facility, said.
    const chosen=settings.decisions?.[name];
    if(chosen&&(found.outcome==='ambiguous'||found.outcome==='type-differs')){
      const pick=found.candidates.find(c=>c.facility.id===chosen);
      if(pick)found={...found,facility:pick.facility,register:pick.register,score:pick.score,decided:true};
      else if(chosen==='none')found={...found,decided:true};
    }
    out.set(name,found);
  }
  return out;
}

/** The counts by outcome, rows and names, in the outcomes' own order. */
export function matchCounts(rows:readonly string[],matches:ReadonlyMap<string,RowMatch>){
  const names=new Set(rows);
  return MATCH_OUTCOMES.map(outcome=>({outcome,
    names:[...names].filter(n=>matches.get(n)?.outcome===outcome).length,
    rows:rows.filter(n=>matches.get(n)?.outcome===outcome).length}));
}

/** A REGISTER'S FACILITIES, fetched from where its catalogue entry says it is served, through its own field map: an
 *  ArcGIS feature layer, read a page at a time. Facilities with no position are kept, and counted by the caller. */
export async function fetchRegister(register:RegisterEntry,fetcher:typeof fetch=fetch):Promise<RegisterFacility[]>{
  if(!register.readable)throw new Error(`${register.title} cannot be read: its service gave no layer when it was catalogued.`);
  const fields=[...new Set(Object.values(register.fields).filter((f):f is string=>!!f))];
  const records:Record<string,unknown>[]=[];
  for(let offset=0;;){
    const url=`${register.url}/query?where=1%3D1&outFields=${encodeURIComponent(fields.join(','))}&returnGeometry=false`
      +`&resultOffset=${offset}&resultRecordCount=2000&f=json`;
    const response=await fetcher(url);
    if(!response.ok)throw new Error(`${register.title} answered ${response.status}.`);
    const body=await response.json() as {features?:{attributes:Record<string,unknown>}[];error?:{message?:string};exceededTransferLimit?:boolean};
    if(body.error)throw new Error(`${register.title}: ${body.error.message??'the service refused the query'}.`);
    const page=(body.features??[]).map(f=>f.attributes);
    records.push(...page);
    if(!page.length||!body.exceededTransferLimit&&page.length<2000)break;
    offset+=page.length;
  }
  return facilitiesFrom(register,records);
}

/** The registers' facilities as one point layer, to keep on the step and to match against at the run. */
export function registerLayer(loaded:readonly LoadedRegister[]):import('./types.js').PointCollection{
  return {type:'FeatureCollection',features:loaded.flatMap(({register,facilities})=>facilities.map(f=>({type:'Feature' as const,
    id:`${register.id}#${f.id}`,properties:{name:f.name,...(f.alternateName?{alternate_name:f.alternateName}:{}),type:f.type,
      area:f.area,register:register.id,register_id:f.id},
    geometry:f.longitude!==null&&f.latitude!==null?{type:'Point' as const,coordinates:[f.longitude,f.latitude] as [number,number]}:null})))};
}
/** The kept layer back into registers, in the step's order. */
export function registersFromLayer(layer:import('./types.js').PointCollection,catalogue:readonly RegisterEntry[],order:readonly string[]):LoadedRegister[]{
  return order.map(id=>catalogue.find(r=>r.id===id)).filter((r):r is RegisterEntry=>!!r).map(register=>({register,
    facilities:layer.features.filter(f=>f.properties?.register===register.id).map(f=>({id:String(f.properties!.register_id),
      name:String(f.properties!.name),...(f.properties!.alternate_name?{alternateName:String(f.properties!.alternate_name)}:{}),
      type:String(f.properties!.type??''),area:String(f.properties!.area??''),
      longitude:f.geometry?f.geometry.coordinates[0]:null,latitude:f.geometry?f.geometry.coordinates[1]:null}))}));
}

/** THE RUN, FROM A LIST: every row of the table matched by its name, one point per row that has a facility, and the
 *  counts of each outcome over every row. A row with no facility is not a point and is not lost: it is counted, and
 *  named in the method by outcome. The point is where the register places the facility, which the receipt says. */
export function listFacilitiesValue(node:{id:string;params:{list?:FacilityListSettings;data:import('./types.js').PointCollection|null;
    registerRetrieved?:{registers:{id:string;title:string;licence:string;records:number}[];at:string}}},
  table:import('./data-table.js').DataTable,catalogue:readonly RegisterEntry[],runId:string){
  const settings=node.params.list;
  if(!settings?.nameColumn)throw new Error('Find health facilities is set to find them from a list: choose the column that names the facility, in Configure…');
  if(!table||table.kind!=='data-table')throw new Error('Connect the list: a table with a column naming each facility.');
  const columns=[...table.keys,table.valueField];
  if(!columns.includes(settings.nameColumn))throw new Error(`The list has no "${settings.nameColumn}" column. Its columns are ${columns.join(', ')}.`);
  if(!node.params.data||!node.params.registerRetrieved)throw new Error('Find health facilities has no register yet: fetch it under Settings.');
  const loaded=registersFromLayer(node.params.data,catalogue,settings.registers);
  const read=(row:import('./data-table.js').DataTable['rows'][number],c?:string)=>!c?'':c===table.valueField&&!table.keys.includes(c)
    ?String(row.value??''):String(row.key[c]??'');
  const list=table.rows.map(row=>({name:read(row,settings.nameColumn).trim(),area:read(row,settings.areaColumn).trim()}));
  const matches=matchFacilityNames(list.filter(r=>r.name),loaded,settings);
  const features:import('./types.js').PointFeature[]=[];
  table.rows.forEach((row,i)=>{
    const m=matches.get(list[i]!.name);
    if(!m?.facility||m.facility.longitude===null||m.facility.latitude===null)return;
    features.push({type:'Feature',id:`row-${i+1}`,geometry:{type:'Point',coordinates:[m.facility.longitude,m.facility.latitude]},
      properties:{...Object.fromEntries(columns.map(c=>[c,c===table.valueField&&!table.keys.includes(c)?row.value:row.key[c]??null])),
        name:list[i]!.name,match_outcome:OUTCOME_WORDS[m.outcome],register_name:m.facility.name,register_id:m.facility.id,
        register:m.register??'',match_score:m.score===undefined?null:Number(m.score.toFixed(3)),
        ...(m.decided?{match_chosen:'by the practitioner'}:{})}});
  });
  const counts=matchCounts(list.map(r=>r.name),matches);
  const noName=list.filter(r=>!r.name).length;
  const noPosition=table.rows.filter((_,i)=>{const m=matches.get(list[i]!.name);return m?.facility&&(m.facility.longitude===null||m.facility.latitude===null);}).length;
  const registers=node.params.registerRetrieved.registers.filter(r=>settings.registers.includes(r.id));
  const entity=`<urn:fieldwork:run:${runId}:${node.id}:facilities>`,activity=`<urn:fieldwork:run:${runId}:${node.id}:matching>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${activity} a fw:FacilityListMatching, prov:Activity; fw:nameField ${JSON.stringify(settings.nameColumn)}; `
    +`fw:fuzzyThreshold ${settings.threshold}; fw:areaNameMarkers ${JSON.stringify(settings.areaMarkers.join(', '))}; `
    +registers.map(r=>`prov:used <${r.id}>`).join('; ')+(registers.length?'; ':'')
    +counts.map(c=>`${OUTCOME_COUNT_PROPERTY[c.outcome]} ${c.rows}`).join('; ')+'.\n'
    +`${entity} a fw:PointDataset, prov:Entity; fw:recordCount ${features.length}; fw:positionIsRegisters true; prov:wasGeneratedBy ${activity}.\n`
    +registers.map(r=>`<${r.id}> a fw:FacilityRegister; dcterms:title ${JSON.stringify(r.title)}; dcterms:license <${r.licence}>.\n`).join('');
  const said=counts.filter(c=>c.rows).map(c=>`${c.rows.toLocaleString('en-US')} ${OUTCOME_WORDS[c.outcome]} (${c.names} name${c.names===1?'':'s'})`).join(', ');
  const method=`Matched ${list.length.toLocaleString('en-US')} rows by ${settings.nameColumn} to ${registers.map(r=>r.title).join(', then ')}, `
    +`fetched ${node.params.registerRetrieved.at.slice(0,10)}: ${said}. `
    +`${features.length.toLocaleString('en-US')} point${features.length===1?'':'s'}, each at the register's position for the facility, not where anyone on the list lived. `
    +(noName?`${noName} row${noName===1?' names':'s name'} no facility. `:'')
    +(noPosition?`${noPosition} matched row${noPosition===1?' has':'s have'} no position in the register. `:'')
    +'A type that differs, an ambiguous name, an area and a name not found have no point until reviewed. '
    +registers.map(r=>`${r.title} is under ${r.licence.includes('by/4.0')?'CC BY 4.0':r.licence}.`).join(' ');
  return {value:{type:'FeatureCollection' as const,features,sourceNodeId:node.id,matchCounts:counts},
    receipt:{nodeId:node.id,kind:'computation' as const,facts,input:facts,rules:'',conclusions:[],method},counts};
}
