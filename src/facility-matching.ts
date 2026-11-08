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
