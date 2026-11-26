/** WHAT EACH STEP COMPUTES: the outbreak and study steps: the scan, chains, study design, two-by-two, regression,
 *  rates and series. Moved out of `executeWorkflow` on 2026-11-25 (code review), one function per step type, each
 *  given the run's context rather than reaching into the executor. The text of each step is as it stood in the
 *  switch; a step that ended there now returns its value. */
import {detectSentence,detectTable} from './aberration.js';
import {caseSeries,caseSeriesFromTable,seriesChart,seriesReceipt,seriesTable} from './case-series.js';
import {rateEquationNote,rateTwoByTwoEquationNote,replayEquationNote,scanEquationNote,twoByTwoEquationNote} from './equations.js';
import {computeExposures} from './exposure-table.js';
import {computeRate,fromPoints,fromTable,fromWideTable,rateChart,rateReceipt,rateTable} from './rate.js';
import {exposureColumnsOf,fitEachExposureStepwise,fitRegression,regressionReceipt,regressionSentence,regressionsReceipt,regressionsSentence,regressionsTable,regressionTable,rowsOf,specFrom} from './regression.js';
import type {DisplayValue,Receipt} from './results.js';
import {runDetail} from './run-progress.js';
import {computeSpaceTimeReplay,computeSpaceTimeScan,replayValue,scanValue} from './space-time-scan.js';
import {investigatorAllocated,refinementSentences} from './study-design-questions.js';
import {type DeclaredDesign,DESIGN_LICENCES,includedMeasures,rateRatioDesignSentence,rateRatioMeasure,readUndeclared,readUnderDesign,regressionMeasure,studyDesignReceipt,studyDesignSentence} from './study-design.js';
import {computeRateTwoByTwo,readRatesUndeclared,readRatesUnderDesign} from './two-by-two-rates.js';
import {computeTwoByTwo,rateTwoByTwoReceipt,rateTwoByTwoSentence,twoByTwoReceipt,type TwoByTwoResult,twoByTwoSentence} from './two-by-two.js';
import type {WorkflowNode} from './types.js';
import type {StepContext} from './core.js';
import {TYPES} from './core.js';

export async function runSpaceTimeScan(ctx:StepContext<'space_time_scan'>):Promise<unknown>{
  const {inputs,machined,node,receipts,runId,withNote,workflow}=ctx;
  let value:unknown;
  // DETECT (experiment 200): the scan runs in a worker; a date column is named, never guessed.
  if(!node.params.dateField)throw new Error(`Choose, in Configure…, the column holding each case's date for "${node.params.label}".`);
  const {runDetail}=await import('./run-progress.js');
  // THE PROGRESS PANEL (the practitioner, 2026-11-10: "That may need a progress bar"): 999 shuffles by day take seconds.
  const cases={type:'FeatureCollection',features:inputs.points.features} as never;
  const source=workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from;
  if(node.params.replay){
    const replay=await computeSpaceTimeReplay(cases,node.params,
      (done,of)=>runDetail({nodeId:node.id,label:node.params.label||'Space-time scan',done,of,what:'the days',verb:'Scanning'}))
      .finally(()=>runDetail(null));
    const made=replayValue(replay,node,runId,source);value=made.value as never;receipts.push(made.receipt as never);
    const note=replayEquationNote(replay,node.id,node.params.dateField);machined[node.id]=[note];withNote(receipts,runId,node.id,[note]);return value;
  }
  const scanned=await computeSpaceTimeScan(cases,node.params,
    (done,of)=>runDetail({nodeId:node.id,label:node.params.label||'Space-time scan',done,of,what:'the dates',verb:'Shuffling'}))
    .finally(()=>runDetail(null));
  const made=scanValue(scanned,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from);
  value=made.value as never;receipts.push(made.receipt as never);const scanNote=scanEquationNote(scanned,node.id,node.params.dateField,node.params);
  if(scanNote){machined[node.id]=[scanNote];withNote(receipts,runId,node.id,[scanNote]);}
  return value;
}

export async function runTransmissionChains(ctx:StepContext<'transmission_chains'>):Promise<unknown>{
  const {inputs,machined,node,receipts,runId,withNote}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table of cases: this step follows each case to its chain.');
  const p=node.params;
  if(!p.id||!p.parent)throw new Error('Name the case id and infected-by columns in this step\u2019s Configure\u2026');
  const {transmissionChains,chainsFacts}=await import('./transmission-chains.js');
  const result=transmissionChains(table,{id:p.id,parent:p.parent,...(p.none?{none:p.none}:{}),...(p.date?{date:p.date}:{})});
  value=result.table as unknown as DisplayValue;
  const facts=chainsFacts(`<urn:fieldwork:run:${runId}:step:${node.id}>`,{id:p.id,parent:p.parent},result);
  receipts.push({nodeId:node.id,kind:'computation',method:result.sentence,facts,rules:'',input:facts,conclusions:[]});
  // WHAT A CHAIN HERE IS, in the write-up beside the method: the record's links, not proven infections.
  machined[node.id]=[{kind:'machined',id:`${node.id}:what-a-chain-is`,section:'Methods',fn:'limitation',nodeId:node.id,
    text:`A chain in "${p.label||'Transmission chains'}" follows the source each case's record names. It is the record's `
      +`chain: a recorded link is not a proven infection, and a case with no source recorded starts a chain of its own.`}];
  withNote(receipts,runId,node.id,machined[node.id]!);
  return value;
}

export async function runStudyDesign(ctx:StepContext<'study_design'>):Promise<unknown>{
  const {machined,node,receipts,runId,withNote}=ctx;
  let value:unknown;
  const sentence=studyDesignSentence(node as WorkflowNode<'study_design'>);
  value={kind:'study-design',...(investigatorAllocated(node.params)?{stopped:true}:{}),
    design:node.params.design,period:node.params.period,
    unitOfAnalysis:node.params.unitOfAnalysis
      ||DESIGN_LICENCES[node.params.design].unitOfAnalysis,
    licence:DESIGN_LICENCES[node.params.design],sentence,
    included:includedMeasures(node.params),
    withheld:DESIGN_LICENCES[node.params.design].estimates
      .filter(name=>!includedMeasures(node.params).includes(name))} as unknown as DisplayValue;
  // STAGE 2 WRITES ITSELF INTO METHODS, one sentence per answer. No answers, no note.
  const refined=refinementSentences(node.params);
  if(refined.length){
    machined[node.id]=[{kind:'machined',id:`${node.id}:design`,section:'Methods',fn:'method',
      nodeId:node.id,text:[sentence,...refined].join(' ')}];
  }
  const declared=studyDesignReceipt(node as WorkflowNode<'study_design'>,runId);
  receipts.push(declared as unknown as Receipt);
  if(machined[node.id])withNote(receipts,runId,node.id,machined[node.id]!);
  return value;
}

export async function runTwoByTwo(ctx:StepContext<'two_by_two'>):Promise<unknown>{
  const {inputs,machined,node,receipts,runId,withNote,workflow}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table: this step reads four cells of one.');
  // STEP 3: A DECLARED DESIGN DECIDES WHAT IS REPORTED. An absent one keeps every measure
  // under a neutral name, because an undeclared design is not a cohort.
  const connected=inputs.design as unknown as DeclaredDesign|undefined;
  const declaredDesign=connected?.stopped?undefined:connected;
  const read=(found:TwoByTwoResult)=>
    declaredDesign?readUnderDesign(found,declaredDesign):readUndeclared(found);
  // THE RATE LAYOUT: events and units at risk per group, and the rate ratio. The design is read BEFORE the
  // computation, so a rate ratio the design cannot support is never computed and then hidden. Experiment 161,
  // step 6; the Rate ratio widget it replaces read only a Rate step's result.
  if(node.params.unitsAtRiskValue!==undefined){
    rateRatioMeasure(declaredDesign);
    const computed=computeRateTwoByTwo(table,node.params);
    const result=declaredDesign?readRatesUnderDesign(computed,declaredDesign.design):readRatesUndeclared(computed);
    const cell=(exposure:string,outcome:string,count:number)=>
      ({key:{[node.params.exposureColumn]:exposure,[node.params.outcomeColumn]:outcome},value:count});
    const {exposed,unexposed,caseValue}=node.params,units=result.request.unitsAtRiskValue;
    value={kind:'data-table',keys:[node.params.exposureColumn,node.params.outcomeColumn],
      valueField:table.valueField,...(table.unit?{unit:table.unit}:{}),
      rows:[cell(exposed,caseValue,result.cells.exposedEvents),
        cell(exposed,units,result.cells.exposedUnitsAtRisk),
        cell(unexposed,caseValue,result.cells.unexposedEvents),
        cell(unexposed,units,result.cells.unexposedUnitsAtRisk)],
      rowCount:4,missingValueCount:0,twoByTwo:result,
      ...(declaredDesign?{design:{...declaredDesign,sentence:rateRatioDesignSentence(declaredDesign)}}:{}),
      sentence:rateTwoByTwoSentence(result)
        +(declaredDesign?` ${rateRatioDesignSentence(declaredDesign)}`:'')} as unknown as DisplayValue;
    receipts.push(rateTwoByTwoReceipt(node,result,runId,
      workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from) as unknown as Receipt);
    machined[node.id]=[rateTwoByTwoEquationNote(result,node.id)];
    withNote(receipts,runId,node.id,machined[node.id]);
    return value;
  }
  if((node.params.exposureColumns?.length??0)>1){
    const several=computeExposures(table,node.params,node.params.exposureColumns!,read);
    value={...several.table,sentence:several.sentence
      +(declaredDesign?` ${declaredDesign.sentence}`:'')} as unknown as DisplayValue;
    receipts.push({nodeId:node.id,kind:'computation',method:several.sentence,
      exposures:several.rows.map(row=>row.column),
      unreadable:several.rows.filter(row=>!row.result).map(row=>row.column)} as unknown as Receipt);
    // THE KERNEL'S ARITHMETIC, ONCE, IN SYMBOLS. The practitioner, 2026-11-03: the two-by-two
    // "should emit the kernel computations for the study design in the notes", and with many
    // exposures "best to present the notes as a table". The numbers are not retyped: the table
    // this step emits is drawn where a Table output describes it, which machines its own note.
    const first=several.rows.find(row=>row.result);
    machined[node.id]=[
      ...(first?.result?[twoByTwoEquationNote(first.result,node.id,true)]:[]),
      {kind:'machined',id:`${node.id}:comparisons`,section:'Methods',
        fn:'limitation',nodeId:node.id,text:several.sentence}];
    withNote(receipts,runId,node.id,machined[node.id]);
    return value;
  }
  const computed=computeTwoByTwo(table,node.params);
  const result=read(computed);
  // THE COUNTS ARE THE VALUE AND THE ESTIMATES RIDE ON IT, the arrangement `rate_ratio`
  // settled on 2026-10-26 after one row holding 8.40 showed the summary and hid the thing
  // a reader checks it against. An epidemiologist reads the cells first.
  const cell=(exposure:string,outcome:string,count:number)=>
    ({key:{[node.params.exposureColumn]:exposure,[node.params.outcomeColumn]:outcome},value:count});
  const {exposed,unexposed,caseValue,nonCaseValue}=node.params;
  value={kind:'data-table',keys:[node.params.exposureColumn,node.params.outcomeColumn],
    ...(node.params.rowsAreSubjects?{valueField:'rows'}
      :{valueField:table.valueField,...(table.unit?{unit:table.unit}:{})}),
    rows:[cell(exposed,caseValue,result.cells.exposedCases),
      cell(exposed,nonCaseValue,result.cells.exposedNonCases),
      cell(unexposed,caseValue,result.cells.unexposedCases),
      cell(unexposed,nonCaseValue,result.cells.unexposedNonCases)],
    // THE SENTENCE WAS WRITTEN AND NEVER ATTACHED. `twoByTwoSentence` has existed since
    // this step was built, for the reason `rateRatioSentence` exists -- "the figure, the
    // table and the receipt cannot word the same finding three ways" -- and `rate_ratio`
    // puts its own on the value, where `app.ts` renders it as the result statement. This
    // one did not, so the step with three estimates was the one that stated none of them
    // on screen. Found 2026-10-31; experiment 153.
    // THE DECLARED DESIGN TRAVELS WITH THE RESULT where one is connected, so the figure
    // and the receipt can state it.
    rowCount:4,missingValueCount:0,twoByTwo:result,
    ...(declaredDesign?{design:declaredDesign}:{}),
    sentence:twoByTwoSentence(result)
      +(declaredDesign?` ${declaredDesign.sentence}`:'')} as unknown as DisplayValue;
  receipts.push(twoByTwoReceipt(node,result,runId,
    workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from));
  machined[node.id]=[twoByTwoEquationNote(result,node.id)];
  withNote(receipts,runId,node.id,machined[node.id]);
  return value;
}

export async function runRegression(ctx:StepContext<'regression'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow,markDrawn}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable;
  if(table?.kind!=='data-table')throw new Error('Connect a table: a regression reads the rows of one.');
  // WHAT THE DECLARED DESIGN LICENSES, read from the declaration the two-by-two reads (experiment 176): a rate
  // ratio under cohort and ecological designs, an odds ratio wherever the two-by-two allows one. A run-time check,
  // before the fit, so a measure the design cannot support is never computed and then hidden.
  const declared=inputs.design as unknown as DeclaredDesign|undefined;
  const licensed=regressionMeasure(declared,node.params.family);
  const source=workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from;
  const designed=!!declared&&!declared.stopped;
  // ONE MODEL PER EXPOSURE COLUMN (experiment 185), each on its own rows, in one table.
  if(exposureColumnsOf(node.params).length>1){
    const label=node.params.label||TYPES.regression.title;
    const models=await fitEachExposureStepwise(rowsOf(table,node.params.order),node.params,table.columnShifts,licensed,async(k,of)=>{
      runDetail({nodeId:node.id,label,done:k,of,what:'models',verb:'Fitting'});
      await new Promise(resolve=>setTimeout(resolve,0));markDrawn();});
    const sentence=regressionsSentence(models,node.params)+(designed?` ${declared!.sentence}`:'');
    value={...regressionsTable(models,table.columns),sentence} as unknown as DisplayValue;
    receipts.push(regressionsReceipt(node,models,node.params,runId,source,designed,sentence) as unknown as Receipt);
    return value;
  }
  const fitted=fitRegression(rowsOf(table,node.params.order),specFrom(node.params));
  const result=licensed?{...fitted,measure:licensed}:fitted;
  const sentence=regressionSentence(result,node.params)
    +(declared&&!declared.stopped?` ${declared.sentence}`:'');
  value={...regressionTable(result,table.columns),sentence} as unknown as DisplayValue;
  receipts.push({...regressionReceipt(node,result,node.params,runId,
    workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from,!!declared&&!declared.stopped),
    method:sentence} as unknown as Receipt);
  return value;
}

export async function runDetectUnusualCounts(ctx:StepContext<'detect_unusual_counts'>):Promise<unknown>{
  const {inputs,node,receipts}=ctx;
  let value:unknown;
  const table=inputs.records as unknown as import('./data-table.js').DataTable|undefined;
  if(table?.kind!=='data-table')throw new Error('Connect a table of counts per period, such as Cases by period gives.');
  if(!node.params.timeField)throw new Error(`Choose, in Configure…, the column holding each period for "${node.params.label}".`);
  const found=detectTable(table,node.params),sentence=detectSentence(found,node.params);
  value={...found.table,sentence} as unknown as DisplayValue;
  receipts.push({nodeId:node.id,kind:'computation',method:sentence,facts:'',input:'',rules:'',conclusions:[]} as unknown as Receipt);
  return value;
}

export async function runRate(ctx:StepContext<'rate'>):Promise<unknown>{
  const {inputs,machined,node,receipts,runId,withNote,workflow}=ctx;
  let value:unknown;
  const records=node.params.source==='table'
  ?node.params.tableForm==='wide'
    ?fromWideTable(inputs.records as unknown as import('./data-table.js').DataTable,[node.params.numeratorField,node.params.denominatorField,node.params.groupBy??''])
    :fromTable(inputs.records as unknown as import('./data-table.js').DataTable,node.params.measureKey||'measure')
  :fromPoints(inputs.records);
  const result=computeRate(records,node.params);value={...rateTable(result),chart:rateChart(result)} as unknown as DisplayValue;receipts.push(rateReceipt(node,result,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from));
  const rateNote=rateEquationNote(result,node.id);
  if(rateNote){machined[node.id]=[rateNote];withNote(receipts,runId,node.id,[rateNote]);}
  return value;
}

export async function runCaseSeries(ctx:StepContext<'case_series'>):Promise<unknown>{
  const {inputs,node,receipts,runId,workflow}=ctx;
  let value:unknown;
  const series=node.params.source==='table'?caseSeriesFromTable(inputs.cases,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period,splitBy:node.params.splitBy??null,rowAsCase:!!node.params.rowAsCase,caseId:node.params.caseId??null}):caseSeries(inputs.points,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period,weightField:node.params.weightField,splitBy:node.params.splitBy});value={...seriesTable(series),chart:seriesChart(series)} as unknown as DisplayValue;receipts.push(seriesReceipt(node,series,runId,workflow.edges.find(e=>e.to===node.id&&(e.port==='points'||e.port==='cases'))!.from));return value;
}

