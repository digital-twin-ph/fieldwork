/** RELATE, SHOWN ON A MADE-UP EXAMPLE (experiment 223). The practitioner, 2026-11-19: *"an animated visual aid to
 *  demonstrate step by step with dummy data what happens during table joins"*.
 *
 *  Two small tables, fixed here and never read from a port, so the example can never be taken for the person's data.
 *  Each row was chosen for a case: a plain match, a name spelled with a full stop in one table and without in the
 *  other, a name the second table does not have, a name it has twice, and a name only the second table has. The
 *  walkthrough follows the dialog's choices (how keys are compared, a key matching twice, the unmatched rows) and sets
 *  none of them. Its last step is the table `relateTable` itself makes from these rows, or the step's own words where
 *  it would stop, so the example cannot show something the step does not do. */
import type {DataTable} from './data-table.js';
import {relateShape,relateTable,type RelateRequest} from './relate-table.js';
import {normaliseName} from './deduplicate-points.js';
import type {Walkthrough,WalkTable,WalkStep} from './table-walkthrough.js';

const table=(keys:string[],valueField:string,rows:[Record<string,string>,number][]):DataTable=>
  ({kind:'data-table',keys,valueField,rows:rows.map(([key,value])=>({key,value})),rowCount:rows.length,missingValueCount:0});
export const RELATE_LEFT=table(['district'],'cases',[
  [{district:'Alpha'},4],[{district:'St. Ann'},3],[{district:'Delta'},1],[{district:'Epsilon'},5]]);
export const RELATE_RIGHT=table(['district','supplier'],'houses',[
  [{district:'Alpha',supplier:'North Water'},120],[{district:'St Ann',supplier:'North Water'},90],
  [{district:'Epsilon',supplier:'North Water'},60],[{district:'Epsilon',supplier:'South Water'},75],
  [{district:'Zeta',supplier:'South Water'},80]]);
const LEFT_LABEL='Cases by district',RIGHT_LABEL='Water supply by district';
/** THE EXAMPLE'S OWN NAME FOR ROWS KEPT UNMATCHED (2026-11-19). The person's name is for their data: Hagelloch's "no infector
 *  recorded" written into a made-up supplier column read as nonsense (the practitioner: "This one seems to be wrong"), and a
 *  name equal to a made-up value would have stopped the example. The choice to keep is followed; the name is the example's. */
export const EXAMPLE_KEEP_LABEL='Not known';

/** What the dialog has chosen that changes what this example does. */
export interface RelateWalkSettings {normalisation:'exact'|'fuzzy'; spelling:boolean; several:boolean;
  decision:'drop'|'keep'|''; label:string}

/** A row the walkthrough expects in the result: its district and the supplier brought across. */
export interface ExpectedRow {district:string; supplier:string}

export function relateWalkthrough(settings:RelateWalkSettings):Walkthrough&{expected:ExpectedRow[]|null}{
  const fold=settings.spelling?'fuzzy':settings.normalisation;
  const compare=fold==='fuzzy'?'folding punctuation and case':'exactly, after trimming and lower case';
  const left:WalkTable={label:LEFT_LABEL,columns:['district','cases'],rows:RELATE_LEFT.rows.map(r=>[r.key.district!,String(r.value)])};
  const right:WalkTable={label:RIGHT_LABEL,columns:['district','supplier','houses'],
    rows:RELATE_RIGHT.rows.map(r=>[r.key.district!,r.key.supplier!,String(r.value)])};
  const steps:WalkStep[]=[{text:`A made-up example. Each row of ${LEFT_LABEL} looks for its district in ${RIGHT_LABEL}, `
    +`compared ${compare}, as you have chosen, and brings its supplier across.`,marks:[]}];
  const expected:ExpectedRow[]=[];let stops=false;
  // EVERY ROW IS CHECKED, AS THE STEP CHECKS THEM, THEN IT STOPS (2026-11-19). The practitioner, at Epsilon: *"Did not record
  // Epsilon in the result."*, and then: *"Should it continue with Epsilon as relate continues until all rows are checked?"*
  // Relate reads the whole table and stops with what it found, naming Epsilon's two rows first even though Delta comes
  // earlier; so each problem is marked where it is, the result says no table will come out, and the last step is its words.
  for(const [i,row] of RELATE_LEFT.rows.entries()){
    const name=row.key.district!,key=normaliseName(name,fold);
    const found=RELATE_RIGHT.rows.map((r,j)=>({r,j})).filter(({r})=>normaliseName(r.key.district!,fold)===key);
    const lookup={table:0,row:i,state:'looking' as const,word:'looking'};
    if(found.length===1){
      const [{r,j}]=found as [{r:typeof RELATE_RIGHT.rows[number];j:number}];
      const spelled=r.key.district!==name;
      steps.push({text:spelled
        ?`${name} and ${r.key.district} are the same district once punctuation is folded: matched, and ${r.key.supplier} is brought across.`
        :`${name} is found once: matched, and ${r.key.supplier} is brought across.`,
        marks:[{...lookup,state:'matched',word:'matched'},{table:1,row:j,state:'matched',word:'matched'}],
        result:[[name,String(row.value),r.key.supplier!]]});
      expected.push({district:name,supplier:r.key.supplier!});
    }else if(found.length>1){
      if(settings.several){
        steps.push({text:`${name} is found ${found.length} times. You chose one row per match, so it becomes ${found.length} rows, `
          +`one for each supplier, and its cases are counted on each.`,
          marks:[{...lookup,state:'several',word:`${found.length} matches`},...found.map(({j})=>({table:1,row:j,state:'several' as const,word:'matched'}))],
          result:found.map(({r})=>[name,String(row.value),r.key.supplier!])});
        for(const {r} of found)expected.push({district:name,supplier:r.key.supplier!});
      }else{
        stops=true;
        steps.push({text:`${name} is found ${found.length} times, and you chose to stop and say which key: so the step will stop `
          +`once every row is checked, and pass nothing on. Had you chosen Keep one row per match, ${name} would become `
          +`${found.length} rows, one for each supplier.`,willStop:true,
          marks:[{...lookup,state:'stopped',word:'will stop the step'},...found.map(({j})=>({table:1,row:j,state:'several' as const,word:'also matches'}))]});
      }
    }else{
      const near=RELATE_RIGHT.rows.findIndex(r=>normaliseName(r.key.district!,'fuzzy')===normaliseName(name,'fuzzy'));
      const why=near>=0?`Compared exactly, ${name} is not ${RELATE_RIGHT.rows[near]!.key.district}`:`${name} is not in ${RIGHT_LABEL}`;
      if(settings.decision==='drop'){
        steps.push({text:`${why}. You chose to drop unmatched rows, so ${name} and its ${row.value} case${row.value===1?'':'s'} leave the result.`,
          marks:[{...lookup,state:'unmatched',word:'dropped'}]});
      }else if(settings.decision==='keep'){
        steps.push({text:`${why}. You chose to keep unmatched rows under a name you give; in this example that name is `
          +`"${EXAMPLE_KEEP_LABEL}", so ${name} stays, its supplier written as "${EXAMPLE_KEEP_LABEL}".`,
          marks:[{...lookup,state:'kept',word:'kept'}],result:[[name,String(row.value),EXAMPLE_KEEP_LABEL]]});
        expected.push({district:name,supplier:EXAMPLE_KEEP_LABEL});
      }else{
        stops=true;
        steps.push({text:`${why}. You have not yet said what happens to unmatched rows, so the step will stop once every row is `
          +`checked, and pass nothing on. Under Decisions, choose to drop them or to keep them under a name you give.`,
          willStop:true,marks:[{...lookup,state:'stopped',word:'will stop the step'}]});
      }
    }
  }
  const unused=RELATE_RIGHT.rows.map((r,j)=>({r,j})).filter(({r})=>!RELATE_LEFT.rows.some(l=>normaliseName(l.key.district!,fold)===normaliseName(r.key.district!,fold)));
  if(unused.length)steps.push({text:`${unused.map(({r})=>r.key.district).join(' and ')} ${unused.length===1?'is':'are'} in ${RIGHT_LABEL} only. `
    +`Nothing in the first table asks for ${unused.length===1?'it, so it brings':'them, so they bring'} nothing and ${unused.length===1?'adds':'add'} no row.`,
    marks:unused.map(({j})=>({table:1,row:j,state:'unused' as const,word:'not asked for'}))});
  // THE LAST STEP IS THE STEP'S OWN: the table relateTable makes from these rows, or its words where it would stop.
  const outcome=walkOutcome(settings);
  // Once a problem that stops the step is found, every later step says no table will come out.
  if(stops)for(const step of steps.slice(steps.findIndex(x=>x.willStop)))step.willStop=true;
  steps.push('refusal' in outcome
    ?{text:`Every row checked, the step stops and passes nothing on. In its own words: ${outcome.refusal}`,marks:[],final:true,stopped:true}
    :{text:`The result: ${outcome.rows.length} rows, each with its supplier. This is the table the next step would read.`,marks:[],final:true,
      result:outcome.rows.map(r=>[r.district,r.cases,r.supplier])});
  return {title:'Relate a column from another table, on a made-up example',tables:[left,right],
    resultColumns:['district','cases','supplier'],steps,expected:stops?null:expected};
}

/** The table Relate itself makes from the made-up rows under these choices, read back as rows; or why it stops. */
export function walkOutcome(settings:RelateWalkSettings):{rows:{district:string;cases:string;supplier:string}[]}|{refusal:string}{
  const request:RelateRequest={on:'district',bring:'supplier',normalisation:settings.spelling?'fuzzy':settings.normalisation,
    ...(settings.several?{several:'each' as const}:{})};
  try{
    if(settings.decision){
      const shape=relateShape(RELATE_LEFT,RELATE_RIGHT,request);
      request.unmatched={decision:settings.decision,signature:shape.signature,
        ...(settings.decision==='keep'?{label:EXAMPLE_KEEP_LABEL}:{})};
    }
    const {table:out}=relateTable(RELATE_LEFT,RELATE_RIGHT,request);
    return {rows:out.rows.map(r=>({district:r.key.district??'',cases:r.value===null?'':String(r.value),supplier:r.key.supplier??''}))};
  }catch(error){return {refusal:error instanceof Error?error.message:String(error)};}
}
