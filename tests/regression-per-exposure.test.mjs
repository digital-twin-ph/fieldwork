import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {fitRegression,specFrom,rowsOf,exposureColumnsOf,fitEachExposure,regressionsTable,regressionsSentence,modelParams,
  regressionsReceipt} from '../build/regression.js';
import {relateAtShifts} from '../build/relate-table.js';

/** ONE MODEL PER EXPOSURE COLUMN, EACH ON ITS OWN ROWS. Experiment 185, stage 2. The Brazil lag workflows fitted one
 *  Regression per lag and stacked them with Append rows; one Regression now takes the list of Relate's shift columns.
 *  Synthetic data: four municipalities, forty weeks, a temperature series with weeks that have no clear-sky value. */

import {cases,satellite} from './fixtures/lag-weeks.mjs';

const request={on:'municipio',bring:'LST_Day_1km',within:{date:'data_iniSE',start:'period_start',end:'period_end'}};
const shifts=[0,-7,-14,-21,7];
const related=relateAtShifts(cases,satellite,request,shifts);
const columns=related.columns.map(c=>c.column);
const params={family:'poisson',outcome:'casos',exposure:{column:columns[0],as:'numeric'},exposureColumns:columns,
  adjust:[{column:'mes',as:'categorical'}],strata:'municipio',errors:'overdispersed'};
const rows=rowsOf(related.table);

test('each model is the single model with its exposure swapped, fitted on its own rows',()=>{
  const models=fitEachExposure(rows,params,related.table.columnShifts);
  assert.deepEqual(models.map(m=>m.column),columns);
  assert.deepEqual(models.map(m=>m.shiftDays),shifts);
  for(const m of models){
    const alone=fitRegression(rows,specFrom({...params,exposure:{column:m.column,as:'numeric'},exposureColumns:undefined}));
    assert.deepEqual(m.result.estimates,alone.estimates,`${m.column}: the same estimates as its own Regression`);
    assert.deepEqual(m.result.rows,alone.rows);
  }
  // A LAG IS NEVER FITTED ON ANOTHER LAG'S ROWS: each model uses exactly the rows its own column has a value on.
  const present=c=>rows.filter(r=>r[c]!==''&&r[c]!==undefined).length;
  const common=rows.filter(r=>columns.every(c=>r[c]!=='')).length;
  for(const m of models)assert.equal(m.result.rows.used,present(m.column),`${m.column} uses its own rows`);
  assert.ok(models.every(m=>m.result.rows.used>common),'no model is limited to the rows every column shares');
  assert.ok(new Set(models.map(m=>m.result.rows.used)).size>1,'the fixture has different gaps at different shifts');
  // The lag the cases were made from stands out, as it should.
  const ratio=c=>models.find(m=>m.column===c).result.estimates[0].ratio;
  assert.ok(ratio('LST_Day_1km_-14d')>ratio('LST_Day_1km_+7d'));
});

test('the models come out as one long table: exposure, shift in days, role, term and statistic',()=>{
  const models=fitEachExposure(rows,params,related.table.columnShifts);
  const table=regressionsTable(models);
  assert.deepEqual(table.keys,['exposure','shift_days','role','term','statistic']);
  assert.deepEqual(table.numericKeys,{shift_days:'days'});
  assert.deepEqual(table.interval,{column:'statistic',estimate:'rate ratio',lower:'lower 95%',upper:'upper 95%',level:95,ratio:true});
  const exposureRows=table.rows.filter(r=>r.key.role==='exposure'&&r.key.statistic==='rate ratio');
  assert.deepEqual(exposureRows.map(r=>[r.key.exposure,r.key.shift_days,r.key.term]),
    columns.map((c,i)=>[c,String(shifts[i]),c]));
  assert.equal(table.rows.length,models.reduce((n,m)=>n+4*m.result.estimates.length,0));
  assert.ok(table.rows.some(r=>r.key.role==='adjusted for'&&r.key.term.startsWith('mes')));
  // Without Relate's shifts there is no shift column, and nothing is invented for one.
  assert.deepEqual(regressionsTable(fitEachExposure(rows,params)).keys,['exposure','role','term','statistic']);
});

test('a column that cannot be fitted is a row saying so; the step stops only when none can be',()=>{
  const withBroken={...params,exposureColumns:[...columns.slice(0,2),'no_such_column']};
  const models=fitEachExposure(rows,withBroken);
  assert.equal(models[2].result,null);
  assert.match(models[2].reason,/No row has every variable/);
  const table=regressionsTable(models);
  assert.deepEqual(table.rows.filter(r=>r.key.exposure==='no_such_column').map(r=>r.value),[null,null,null,null]);
  const sentence=regressionsSentence(models,withBroken);
  assert.match(sentence,/^3 Poisson regressions of casos, one per exposure column and each on its own rows, each adjusted for /);
  assert.match(sentence,/2 95% intervals, none adjusted for the number of comparisons\./);
  assert.match(sentence,/Not fitted: no_such_column \(/);
  assert.throws(()=>fitEachExposure(rows,{...params,exposureColumns:['nothing','nor_this']}),/No exposure column could be fitted/);
  assert.throws(()=>fitEachExposure(rows,{...params,exposureColumns:[columns[0],columns[0]]}),/listed twice/);
  // One column, or none listed, is the single model.
  assert.deepEqual(exposureColumnsOf({exposure:{column:'x',as:'numeric'}}),['x']);
  assert.deepEqual(exposureColumnsOf({exposure:{column:'x',as:'numeric'},exposureColumns:['x']}),['x']);
});

test('every fitted model is its own fw:RegressionModel in one receipt, and the receipt conforms to the shapes',async()=>{
  const models=fitEachExposure(rows,{...params,exposureColumns:[...columns,'no_such_column']},related.table.columnShifts);
  const receipt=regressionsReceipt({id:'lags'},models,params,'r1','related',false,'method');
  assert.equal((receipt.facts.match(/a fw:RegressionModel/g)??[]).length,columns.length,'one per fitted model, none for the unfitted');
  for(const c of columns)assert.ok(receipt.facts.includes(`fw:exposureAttribute ${JSON.stringify(c)}`));
  const report=await validateGraph(new Store(new Parser().parse(receipt.facts)));
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
  assert.deepEqual(receipt.models.map(m=>m.shiftDays),[...shifts,undefined]);
  assert.match(receipt.models.at(-1).reason,/No row has every variable/);
});

/** AN ADJUSTMENT THAT FOLLOWS THE SHIFT: Brazil's 2010-2025 models adjust the temperature at each lag for the rain at
 *  the same lag (experiment 182). Model k is adjusted for the k-th rain column; nothing else changes between models. */
test('an adjustment that follows the shift adjusts each model for its own column',()=>{
  const rainShifts=[0,-7,-14,-21,7];
  const rainColumn=d=>`rain_${d>0?'+':''}${d}d`;
  // Rain at each shift, empty now and then, and on other weeks than the temperature's gaps.
  const withRain=rows.map((r,i)=>({...r,...Object.fromEntries(rainShifts.map((d,k)=>
    [rainColumn(d),(i*7+k*13)%23===0?'':String(20+((i*31+k*17)%40))]))}));
  const followed={...params,adjust:[{column:'mes',as:'categorical'},
    {column:rainColumn(0),as:'numeric',perModel:rainShifts.map(rainColumn)}]};
  const models=fitEachExposure(withRain,followed,related.table.columnShifts);
  models.forEach((m,k)=>{
    const alone=fitRegression(withRain,specFrom({...params,exposure:{column:columns[k],as:'numeric'},exposureColumns:undefined,
      adjust:[{column:'mes',as:'categorical'},{column:rainColumn(rainShifts[k]),as:'numeric'}]}));
    assert.deepEqual(m.result.estimates,alone.estimates,`model ${k+1} is adjusted for ${rainColumn(rainShifts[k])}`);
    assert.deepEqual(m.result.rows,alone.rows,'and left out the rows its own rain column is empty on');
  });
  assert.deepEqual(modelParams(followed,2).adjust.map(t=>t.column),['mes','rain_-14d']);
  assert.match(regressionsSentence(models,followed),/each adjusted for mes, rain at its own shift, municipio \(strata\)/);
  const receipt=regressionsReceipt({id:'m'},models,followed,'r1','related',false,'');
  for(const d of rainShifts)assert.ok(receipt.facts.includes(`fw:termAttribute "${rainColumn(d)}"`));
  assert.throws(()=>fitEachExposure(withRain,{...followed,adjust:[{column:'rain_0d',as:'numeric',perModel:['rain_0d']}]}),
    /needs one column for each of the 5 models; it has 1/);
});
