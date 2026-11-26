/** WHAT EACH STEP COMPUTES: the table steps: relate, group, append, select, deduplicate and vocabulary mapping. Moved
 *  out of `executeWorkflow` on 2026-11-25 (code review), one function per step type, each given the run's context
 *  rather than reaching into the executor. The text of each step is as it stood in the switch; a step that ended
 *  there now returns its value. */
import {appendPort,appendSentence,appendTableCount,appendTables} from './append-rows.js';
import {deduplicatePoints,deduplicateReceipt,type DeduplicateResult,deduplicateTableReceipt} from './deduplicate-points.js';
import {deduplicateTable} from './deduplicate-table.js';
import {groupTable} from './group-table.js';
import {machinedNotes,relateAtShifts,relateOutcome,relateReceiptFacts,relateShiftsReceiptFacts,relateTable} from './relate-table.js';
import type {DisplayValue,Receipt} from './results.js';
import {rangeSentence,selectRange,selectRows} from './select-rows.js';
import type {StepContext} from './core.js';
import {TYPES,portSourceName} from './core.js';

export async function runMapTermsToVocabulary(ctx:StepContext<'map_terms_to_vocabulary'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  // NO NETWORK HERE. The choosing happened in Configure…; this applies what was chosen.
  const {linkTerms}=await import('./vocabulary-map.js');
  const edge=workflow.edges.find(e=>e.to===node.id&&e.port==='records');
  if(!edge)throw new Error('Connect the table whose terms are linked.');
  const made=linkTerms(inputs.records as never,node,runId,edge.from);
  value=made.value as unknown as DisplayValue;receipts.push(made.receipt);return value;
}

export async function runRelateTable(ctx:StepContext<'relate_table'>):Promise<unknown>{
  const {inputs,machined,node,receipts,relateShifts,relations,runId,workflow}=ctx;
  let value:unknown;
  // RELATE, not MERGE. Statistical packages commonly offer three join commands and this project had none, which
  // the 0.12.0 release notes recorded as the reason South London's contingency table is
  // "prepared outside the application". The one that table needs is the narrowest: a long
  // table's value column can only hold numbers, so a CATEGORY brought across is a key
  // column and the row count does not change. Bringing MEASURES across adds rows and is a
  // different operation with a different failure mode -- see src/relate-table.ts.
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  const other=inputs.related as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table: this step adds a column to one.');
  if(other?.kind!=='data-table')throw new Error('Connect a second table on the "related" port: '
    +'this step brings a column across from it.');
  // SEVERAL SHIFTS (experiment 185): one column each, every row kept, the empties counted per shift.
  if((node.params.shifts?.length??0)>1){
    const {table:shifted,columns}=relateAtShifts(table,other,node.params,node.params.shifts!);
    value=shifted as unknown as DisplayValue;
    relateShifts[node.id]=columns;
    const facts=relateShiftsReceiptFacts(node.params,table.rows.length,columns,{runId,nodeId:node.id});
    receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
      method:`${node.params.bring} brought across at ${columns.length} shifts (${columns.map(c=>`${c.shiftDays} d`).join(', ')}), `
        +`every row kept; empty where unmatched: ${columns.map(c=>`${c.shiftDays} d ${c.empty}`).join(', ')}. `
        +'A model on a column leaves out the rows empty in it, and no others.'});
    return value;
  }
  const result=relateTable(table,other,node.params);
  value=result.table as unknown as DisplayValue;
  const outcome=relateOutcome(table,node.params,result);
  relations[node.id]=outcome;
  machined[node.id]=machinedNotes(outcome,
    {left:portSourceName(workflow,node.id,'records','the first table'),
     right:portSourceName(workflow,node.id,'related','the second table')});
  // THE CHOICE IS PART OF HOW THE NUMBERS WERE MADE, so it is in the receipt beside them.
  // The practitioner, 2026-10-28: *"The choice should be reflected in the receipts."* What
  // a reader needs in order to recompute this is the comparison the keys were matched
  // with, what was decided about the rows that did not match, and what the join did to
  // each numeric variable -- the shares, from which the multiplier on any rate of one
  // variable over another follows exactly.
  const decided=result.declared;
  const shareText=result.shares.map(s=>`${s.measure}: `
    +(s.share===null?'nothing to divide':`${(s.share*100).toFixed(1)}% of ${s.all.toLocaleString()} retained`))
    .join('; ');
  // THE FACTS, as N3. Built in `relate-table.ts` beside the computation, the way
  // `deduplicate-points.ts` and `area-join.ts` build theirs -- and because a release
  // declares the terms its own module asserts, which the gate checks.
  // ONE ROW PER MATCH, where asked: how many keys matched several rows and the rows it added, in the receipt.
  const relateFacts=relateReceiptFacts(outcome,machined[node.id],{runId,nodeId:node.id})
    +(result.several?`<urn:fieldwork:run:${runId}:output:${node.id}> <urn:fieldwork:oneRowPerMatch> [ `
      +`<urn:fieldwork:keysMatchingSeveral> ${result.several.keys}; <urn:fieldwork:rowsAddedForMatches> ${result.several.addedRows} ].\n`:'');
  receipts.push({nodeId:node.id,kind:'computation',
    facts:relateFacts,rules:'',input:relateFacts,conclusions:[],
    method:`${node.params.bring} brought across on ${outcome.on}`
      +`, keys compared ${result.normalisation==='fuzzy'?'with punctuation folded':'exactly'}`
      +`, ${result.related} row${result.related===1?'':'s'} related`
      +(result.dropped?`, ${result.dropped} dropped for keys the second table does not carry `
        +'at the practitioner\u2019s declared choice':'')
      +(result.kept?`, ${result.kept} kept as \u201c${decided?.label}\u201d at the `
        +'practitioner\u2019s declared choice, a category the second table never measured':'')
      +(result.several?`; one row per match: ${result.several.keys} key${result.several.keys===1?'':'s'} matched several rows, adding ${result.several.addedRows} row${result.several.addedRows===1?'':'s'}`:'')
      +(shareText?`. Retained by variable \u2014 ${shareText}`:''),
    related:result.related,dropped:result.dropped,kept:result.kept,gaps:result.gaps,
    values:result.values,normalisation:result.normalisation,
    overlap:result.overlap,shares:result.shares,
    machinedNotes:machined[node.id],
    ...(decided?{declared:decided}:{})} as unknown as Receipt);
  return value;
}

export async function runGroupTable(ctx:StepContext<'group_table'>):Promise<unknown>{
  const {inputs,machined,node,receipts,runId,withNote}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table: this step totals the rows of one.');
  const result=groupTable(table,node.params);
  value=result.table as unknown as DisplayValue;
  // AND THE WRITE-UP CARRIES IT, automatically. The practitioner, 2026-10-31: *"Once we
  // check that override box, it automatically adds the caveat in the machined note."* An
  // assumption that reaches the receipt and not the publication is an assumption the
  // reader of the publication never meets -- which is the whole failure the override had
  // to avoid being. Machined rather than written, because nobody should have to remember.
  if(result.excluded?.cells){
    const {cells,groups,of}=result.excluded;
    // EACH AFFECTED GROUP SAYS WHAT IT COVERS, "3 of 4", rather than a bare count of what
    // was left out: a reader needs the denominator of the total they are looking at.
    const covered=of.map(g=>`${g.group} (${g.rowsSummed} of ${g.rowsSummed+g.rowsEmpty})`)
      .join('; ');
    machined[node.id]=[{kind:'machined',id:`${node.id}:excluded-missing`,section:'Methods',
      fn:'limitation',nodeId:node.id,
      text:`${cells} empty cell${cells===1?'':'s'} ${cells===1?'was':'were'} excluded when `
        +`totalling "${node.params.label||node.id}", so ${groups===1?'one total covers':
          `${groups} totals cover`} fewer rows than the group holds: ${covered}. `
        +`An excluded cell is NOT a zero — nothing here claims there were none, only that `
        +`what was totalled is what was recorded. Any figure divided by the number of rows `
        +`in ${groups===1?'that group':'those groups'} has the smaller denominator.`}];
    withNote(receipts,runId,node.id,machined[node.id]);
  }
  receipts.push({nodeId:node.id,kind:'computation',
    // THE AGGREGATE IS NAMED, because "totalled" was true of every run until 2026-10-31
    // and is now one of four. A receipt that still said "totalled" over a maximum would
    // be the kind of stale sentence this project keeps finding.
    method:`${result.collapsedFrom} rows ${result.aggregate==='sum'?'totalled'
      :result.aggregate==='minimum'?'reduced to their minimum'
      :result.aggregate==='maximum'?'reduced to their maximum'
      :result.aggregate==='mean'?'reduced to their mean'
      :result.aggregate==='median'?'reduced to their median'
      :'counted'} into ${result.groups} within `
      +`${node.params.by.join(' and ')}`+(result.dropped.length?`, dropping ${result.dropped.join(' and ')}`
        :`, each row its own group, ${node.params.total} as the value`)
      // THE OVERRIDE IS IN THE RECEIPT'S OWN SENTENCE, not only in a field beside it. A
      // reader checking how a total was reached meets the assumption here or not at all.
      +(result.excluded
        ?`; ${result.excluded.cells} empty cell`
          +`${result.excluded.cells===1?'':'s'} excluded from `
          +`${result.excluded.groups} group`
          +`${result.excluded.groups===1?'':'s'}, as declared`
        :result.gaps.length?`; ${result.gaps.length} group`
        +`${result.gaps.length===1?'' :'s'} held an empty cell and total to nothing known`:'')
      // THE SHARES, AND OF WHAT (experiment 191), in the same sentence as the totals they are shares of.
      +(result.shares?`; each group's share, ${result.shares.within.length?`of the total within ${result.shares.within.join(' and ')}`
        :'of the whole table'}, as a percentage to one decimal place`
        +(result.shares.unknownStrata?`, unknown in ${result.shares.unknownStrata} stratum${result.shares.unknownStrata===1?'':'s'} whose total is unknown`:'')
        +(result.shares.zeroStrata?`, none in ${result.shares.zeroStrata} stratum${result.shares.zeroStrata===1?'':'s'} totalling zero`:''):'')
      // WHAT THE KEYS HOLD THAT A TOTAL HIDES (the table stress tests, 2026-11-22): said, never merged or dropped.
      +(result.blankKeys?`; ${result.blankKeys.rows} row${result.blankKeys.rows===1?'':'s'} with a blank ${node.params.by.join(' or ')}, totalled as a group of ${result.blankKeys.rows===1?'its':'their'} own`:'')
      +(result.nearKeys?`; ${result.nearKeys.map(n=>n.map(x=>`“${x}”`).join(' and ')).join(', ')} differ only in capitals or spaces and were totalled apart`:''),
    groups:result.groups,collapsedFrom:result.collapsedFrom,
    dropped:result.dropped,gaps:result.gaps} as unknown as Receipt);
  return value;
}

export async function runAppendRows(ctx:StepContext<'append_rows'>):Promise<unknown>{
  const {inputs,node,receipts,workflow}=ctx;
  let value:unknown;
  const count=appendTableCount(node.params);
  const tables=Array.from({length:count},(_,i)=>(inputs as unknown as Record<string,unknown>)[appendPort(i)] as
    import('./data-table.js').DataTable|undefined);
  const absent=tables.flatMap((t,i)=>t?.kind==='data-table'?[]:[i+1]);
  if(absent.length)throw new Error(count===2?'Connect two tables: this step stacks the rows of the second under the first.'
    :`Connect a table to every port: ${absent.map(i=>`table ${i}`).join(', ')} ${absent.length===1?'has':'have'} none. `
      +'Remove a port you do not need.');
  const names=Array.from({length:count},(_,i)=>{const from=workflow.edges.find(e=>e.to===node.id&&e.port===appendPort(i))?.from;
    const up=workflow.nodes.find(x=>x.id===from);return up?String((up.params as {label?:string}).label||TYPES[up.type]?.title||up.id):'';});
  const result=appendTables(tables as import('./data-table.js').DataTable[],node.params,names);
  value={...result.table,sentence:appendSentence(result,node.params)} as unknown as DisplayValue;
  receipts.push({nodeId:node.id,kind:'computation',method:appendSentence(result,node.params),
    from:result.from,fromFirst:result.fromFirst,fromSecond:result.fromSecond,missing:result.missing} as unknown as Receipt);
  return value;
}

export async function runSelectRows(ctx:StepContext<'select_rows'>):Promise<unknown>{
  const {inputs,node,receipts}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table: this step keeps rows of one.');
  const range=node.params.range;
  const result=range?selectRange(table,node.params.keyColumn,range.from,range.to)
    :selectRows(table,node.params.keyColumn,node.params.values,!!node.params.leaveOut);
  value=result.table as unknown as DisplayValue;
  receipts.push({nodeId:node.id,kind:'computation',
    method:range?`kept ${rangeSentence(node.params.keyColumn,range.from.trim(),range.to.trim())}, both ends included`
      :node.params.leaveOut?`left out ${node.params.values.join(', ')} of ${node.params.keyColumn}, ${result.dropped} rows`
      :`kept ${node.params.values.join(', ')} of ${node.params.keyColumn}`,
    kept:result.kept,dropped:result.dropped,absent:result.absent} as unknown as Receipt);
  return value;
}

// The conversion ran when the file was saved; execution replays it offline without reprojecting again.
export async function runDeduplicatePoints(ctx:StepContext<'deduplicate_points'>):Promise<unknown>{
  const {inputs,linkages,node,pointInputs,receipts,runId,workflow}=ctx;
  let value:unknown;
  if(node.params.format==='table'){
    const table=inputs.records as unknown as import('./data-table.js').DataTable;
    if(table?.kind!=='data-table')throw new Error('Connect a table: this step compares its rows.');
    const from=workflow.edges.find(e=>e.to===node.id&&e.port==='records')?.from??node.id;
    const label=String(workflow.nodes.find(n=>n.id===from)?.params.label||'Table');
    const linked=deduplicateTable(table,from,label,node.params,node.params.decisions);
    linkages[node.id]=linked as unknown as DeduplicateResult;
    value=linked.table as unknown as DisplayValue;
    receipts.push(deduplicateTableReceipt(node,linked,runId,from));
    return value;
  }
  const layers=pointInputs().layers;
  if(layers.length<2)throw new Error('Deduplication compares records ACROSS sources, so it needs at least two point layers.');
  const linked=deduplicatePoints(layers,node.params,node.params.decisions);
  linkages[node.id]=linked;
  value={...linked.collection,sourceNodeId:node.id,sourceKind:'input-points',
    sourceInfo:{format:'deduplicated-points',
      notes:[`${linked.merged} records merged from ${linked.inputCount}`,
        `${linked.awaiting} pairs awaiting a decision`]},
    linkage:{candidates:linked.candidates,compared:linked.compared,blocked:linked.blocked,
      matched:linked.matched,awaiting:linked.awaiting,merged:linked.merged}} as unknown as DisplayValue;
  receipts.push(deduplicateReceipt(node,linked,runId,layers.map(l=>l.sourceNodeId)));
  return value;
}
