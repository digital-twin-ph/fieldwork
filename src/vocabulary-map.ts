/** A COLUMN'S TERMS LINKED TO WIKIDATA, where a person chose each link (experiment 232).
 *
 *  WHY A PERSON CHOOSES. Wikidata's search gives candidates, not an identity. Measured 2026-11-24 on four terms
 *  from work in hand: "Kano" returns the CITY first where a Nigerian LGA table means the STATE, fourth down; and
 *  three of the four terms carried a competing entity of a different kind in the top four — a ward against the
 *  local government area that contains it, a pathogen against the disease it causes. A step that took the top hit
 *  would be silently wrong about one term in four, in a column that travels into every receipt after it. The
 *  practitioner, settling it: *"The Wikidata widget configure dialog can help filter in the right link. That is
 *  for a human to decide."*
 *
 *  SO THE RUN NEVER ASKS WIKIDATA. Choosing happens in Configure…, and what the step keeps is the choice. The run
 *  maps each term to the identifier a person picked for it, which makes a run deterministic, free of anyone
 *  else's service and of its rate limits, and reproducible from a saved workflow years later. What a re-run can no
 *  longer do is notice that Wikidata has changed its mind; the retrieval date is recorded so a reader knows how
 *  old the choice is.
 *
 *  WHAT A LINK IS NOT. It is not a claim that the row IS that entity. It is a claim that a person, on a date,
 *  judged this term to name that entity. The receipt says so, and says how many candidates were on offer. */
import type {DataTable} from './data-table.js';
import type {Receipt} from './results.js';
import type {WorkflowNode} from './types.js';

export const WIKIDATA_ENTITY='https://www.wikidata.org/wiki/';
/** How many candidates the dialog asks for. Enough that the right one is in the list for the terms measured —
 *  Kano State was fourth — without turning a choice into a search of its own. */
export const WIKIDATA_CANDIDATES=10;

/** One entity Wikidata offered for a term. `kind` is what it says the entity is an instance of, where it says. */
export interface WikidataCandidate {
  qid:string;
  label:string;
  description?:string;
  kind?:string;
}

/** WHAT A PERSON DECIDED ABOUT ONE TERM. `null` is a decision too: they looked and chose none, which is not the
 *  same as not having looked, and the two must not be reported alike. */
export type WikidataDecision={qid:string;label:string;description?:string;decidedAt:string;ofCandidates:number}|null;

export type LinkOutcome='linked'|'none chosen'|'not looked up'|'no term';

/** The state of every distinct term in the column, which is what the dialog lists and the receipt counts. */
export function termsOf(table:DataTable,column:string):string[]{
  const read=(row:DataTable['rows'][number]):string=>
    column===table.valueField&&!table.keys.includes(column)?String(row.value??''):String(row.key[column]??'');
  const seen=new Set<string>();
  for(const row of table.rows){const t=read(row).trim();if(t)seen.add(t);}
  return [...seen].sort((a,b)=>a.localeCompare(b));
}

/** What became of one term, from the decisions held on the step. */
export function outcomeFor(term:string,decisions:Record<string,WikidataDecision>):LinkOutcome{
  if(!term.trim())return 'no term';
  if(!(term in decisions))return 'not looked up';
  return decisions[term]===null?'none chosen':'linked';
}

/** THE SEARCH, used by the dialog and never by a run.
 *
 *  `fetchJson` is injected so this is testable without anyone's network and so the one place that names Wikimedia's
 *  endpoint is here. The client identifies itself generically: Wikimedia's policy asks an automated client to say
 *  who it is, and the person running it is not who it is — their details are theirs and are never sent. */
export async function searchWikidata(
  term:string,
  options:{language?:string;limit?:number;fetchJson:(url:string)=>Promise<unknown>},
):Promise<WikidataCandidate[]>{
  const query=term.trim();
  if(!query)return [];
  const language=options.language?.trim()||'en';
  const limit=Math.max(1,Math.min(50,options.limit??WIKIDATA_CANDIDATES));
  const url='https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&origin=*'
    +`&language=${encodeURIComponent(language)}&uselang=${encodeURIComponent(language)}`
    +`&limit=${limit}&search=${encodeURIComponent(query)}`;
  const body=await options.fetchJson(url) as {search?:{id?:string;label?:string;description?:string}[]};
  return (body?.search??[])
    .filter(r=>typeof r.id==='string'&&/^Q\d+$/.test(r.id))
    .map(r=>({qid:r.id!,label:String(r.label??r.id),
      ...(r.description?{description:String(r.description)}:{})}));
}

/** CANDIDATES NARROWED BY WHAT THE READER IS LOOKING FOR, which is a filter and never a chooser. The words are
 *  matched against the description Wikidata gives, because that is where it says what kind of thing an entity is
 *  ("local government area in Kano State", "viral disease affecting humans"). Nothing is removed: the ones that do
 *  not match are returned after the ones that do, so a filter cannot hide the right answer. */
export function narrowCandidates(candidates:readonly WikidataCandidate[],filter:string):WikidataCandidate[]{
  const words=filter.toLowerCase().split(/[,\s]+/).filter(Boolean);
  if(!words.length)return [...candidates];
  const score=(c:WikidataCandidate):number=>{
    const text=`${c.label} ${c.description??''} ${c.kind??''}`.toLowerCase();
    return words.reduce((n,w)=>n+(text.includes(w)?1:0),0);
  };
  return [...candidates].sort((a,b)=>score(b)-score(a));
}

/** THE STEP ITSELF, and it touches no network. Each row gains the link a person chose for its term. */
export function linkTerms(
  table:DataTable, node:WorkflowNode<'map_terms_to_vocabulary'>, runId:string, sourceNodeId:string,
):{value:DataTable;receipt:Receipt}{
  const p=node.params;
  const column=p.column?.trim();
  if(!column)throw new Error('Choose the column whose terms are linked, in Configure…');
  const columns=[...table.keys,table.valueField];
  if(!columns.includes(column))
    throw new Error(`This table has no "${column}" column. Its columns are ${columns.join(', ')}.`);
  const linkColumn=p.linkColumn?.trim()||`${column}_wikidata`;
  if(columns.includes(linkColumn))
    throw new Error(`This table already has a "${linkColumn}" column. Name the column the links go into something else, in Configure…`);
  const decisions=p.decisions??{};
  const read=(row:DataTable['rows'][number]):string=>
    column===table.valueField&&!table.keys.includes(column)?String(row.value??''):String(row.key[column]??'');
  const added=[linkColumn,...(p.alsoQid?[`${column}_qid`]:[]),...(p.alsoLabel?[`${column}_wikidata_label`]:[])];
  const counts:Record<LinkOutcome,number>={linked:0,'none chosen':0,'not looked up':0,'no term':0};
  const rows=table.rows.map(row=>{
    const term=read(row).trim();
    const outcome=outcomeFor(term,decisions);
    counts[outcome]++;
    const chosen=outcome==='linked'?decisions[term]:null;
    return {...row,key:{...row.key,
      [linkColumn]:chosen?`${WIKIDATA_ENTITY}${chosen.qid}`:'',
      ...(p.alsoQid?{[`${column}_qid`]:chosen?chosen.qid:''}:{}),
      ...(p.alsoLabel?{[`${column}_wikidata_label`]:chosen?chosen.label:''}:{})}};
  });
  const terms=termsOf(table,column);
  const decided=terms.filter(t=>t in decisions).length;
  const notes=[
    `${counts.linked.toLocaleString('en')} of ${table.rows.length.toLocaleString('en')} rows carry a Wikidata link in ${linkColumn}, `
      +`from ${decided.toLocaleString('en')} of ${terms.length.toLocaleString('en')} distinct terms in ${column} that were looked up.`,
    'A LINK IS NOT A CLAIM THAT THE ROW IS THAT ENTITY. It records that a person, on the date below, judged this '
      +'term to name that entity. Wikidata’s search offers candidates and not an identity: on the terms this step '
      +'was designed against, the first candidate was the wrong one about once in four, so nothing here was chosen '
      +'by rank.',
    'Wikidata is edited by anyone and changes. An entity cited here may since have been merged, split or removed, '
      +'and this step does not re-check: it keeps what was decided, so a run is reproducible rather than current.',
  ];
  if(counts['not looked up'])notes.unshift(`${counts['not looked up'].toLocaleString('en')} row${counts['not looked up']===1?'' :'s'} `
    +`hold${counts['not looked up']===1?'s':''} a term nobody has looked up yet, and ${counts['not looked up']===1?'its link is':'their links are'} empty. `
    +'Open Configure… to look them up. An empty link is not a statement that the term is absent from Wikidata.');
  if(counts['none chosen'])notes.unshift(`${counts['none chosen'].toLocaleString('en')} row${counts['none chosen']===1?'' :'s'} `
    +`hold${counts['none chosen']===1?'s':''} a term somebody looked up and deliberately left unlinked, which is a finding about the term `
    +'and not a gap in the work.');
  if(counts['no term'])notes.push(`${counts['no term'].toLocaleString('en')} row${counts['no term']===1?' has':'s have'} nothing in ${column}.`);
  const activity=`urn:fieldwork:run:${runId}:${node.id}:wikidata`;
  const chosen=terms.filter(t=>decisions[t]).map(t=>({term:t,qid:decisions[t]!.qid,
    label:decisions[t]!.label,at:decisions[t]!.decidedAt,ofCandidates:decisions[t]!.ofCandidates}));
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`<${activity}> a fw:TermLinking, prov:Activity; `
    +`fw:linkedTermColumn ${JSON.stringify(column)}; `
    +`fw:linkColumn ${JSON.stringify(linkColumn)}; `
    +`fw:distinctTermCount ${terms.length}; `
    +`fw:linkedTermCount ${chosen.length}; `
    +`fw:unlinkedTermCount ${terms.length-chosen.length}; `
    +`fw:linkedRowCount ${counts.linked}; `
    +(chosen.length?`fw:chosenEntities ${JSON.stringify(JSON.stringify(chosen))}; `:'')
    +`fw:linkAuthority "Wikidata"; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`
    // EACH LINK AS A STATEMENT AN OUTSIDE READER CAN FOLLOW, which is the point of linking at all.
    +chosen.map(c=>`<${WIKIDATA_ENTITY}${c.qid}> fw:namedByTerm ${JSON.stringify(c.term)}.\n`).join('');
  return {value:{...table,keys:[...table.keys,...added],rows,
    columns:{...(table.columns??{}),[linkColumn]:{label:`${column} in Wikidata`,origin:'practitioner' as const,
      confirmed:false,description:'A Wikidata entity a person judged this term to name. Not a claim that the row is that entity.'}}},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Each term in ${column} linked to the Wikidata entity a person chose for it. ${notes.join(' ')}`}};
}
