import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {fitRegression,bsBasis,quantile7,regressionTable,regressionSentence,specFrom} from '../build/regression.js';
import {parseCSV} from '../build/input-data.js';

/** REGRESSION, over a table's rows, fitted by the kernel. Experiment 167. The practitioner, 2026-11-04: *"Why don't we
 *  develop the regression widget"*. The engine's own arithmetic is tested in kernel/src/glm.rs; these test the model
 *  built around it, and reproduce the published figures it was built for. */
const csvRows=text=>{const t=parseCSV(text,20000);const h=t.headers.map(x=>x.trim());
  return t.rows.map(v=>Object.fromEntries(h.map((x,i)=>[x,v[i]==='NA'?'':(v[i]??'')])));};

test('R quantiles and the bs() basis: knots where R puts them, and rows that sum with the dropped column to one',()=>{
  assert.equal(quantile7([1,2,3,4],0.5),2.5);
  assert.ok(Math.abs(quantile7([10,20,30],1/3)-50/3)<1e-12);
  const x=Array.from({length:21},(_,i)=>i/2);
  const {knots,boundary,basis}=bsBasis(x,4);
  assert.deepEqual(knots,[5]);assert.deepEqual(boundary,[0,10]);
  for(const v of [0,0.3,5,7.25,10]){
    const b=basis(v);
    assert.equal(b.length,4);
    assert.ok(b.every(c=>c>=0&&c<=1+1e-12));
    // B-splines partition unity; intercept = FALSE drops the first, so the rest sum to at most one.
    assert.ok(b.reduce((s,c)=>s+c,0)<=1+1e-12);
  }
  assert.deepEqual(basis(0),[0,0,0,0]);
  assert.ok(Math.abs(basis(10)[3]-1)<1e-12);
});

test('a two-by-two as a logistic model, and the refusals a model can meet',()=>{
  const rows=[...Array(20).fill({ill:'Y',ate:'Y'}),...Array(80).fill({ill:'N',ate:'Y'}),
              ...Array(10).fill({ill:'Y',ate:'N'}),...Array(90).fill({ill:'N',ate:'N'})];
  const r=fitRegression(rows,{family:'logistic',outcome:'ill',cases:['Y'],controls:['N'],exposure:{column:'ate',as:'categorical',reference:'N'}});
  assert.equal(r.estimates[0].term,'ateY');
  assert.ok(Math.abs(r.estimates[0].ratio-2.25)<1e-9);
  assert.deepEqual(r.columns,['(Intercept)','ateY']);
  assert.throws(()=>fitRegression(rows,{family:'logistic',outcome:'ill',exposure:{column:'ate',as:'categorical'}}),/cases and which are controls/);
  assert.throws(()=>fitRegression(rows,{family:'logistic',outcome:'ill',cases:['Y'],controls:['N'],
    exposure:{column:'ate',as:'categorical'},adjust:[{column:'ate',as:'numeric'}]}),/in the model twice/);
  assert.throws(()=>fitRegression(rows.map(x=>({...x,ate:'Y'})),{family:'logistic',outcome:'ill',cases:['Y'],controls:['N'],
    exposure:{column:'ate',as:'categorical'}}),/one value only/);
  // Rows missing a variable are left out and counted, by reason.
  const holed=[...rows,{ill:'Y',ate:''},{ill:'?',ate:'Y'}];
  const left=fitRegression(holed,{family:'logistic',outcome:'ill',cases:['Y'],controls:['N'],exposure:{column:'ate',as:'categorical',reference:'N'}});
  assert.deepEqual(left.rows,{used:200,leftOut:2,reasons:{'ate missing':1,'ill neither case nor control':1}});
});

test('the result is a table of term by statistic, and a sentence that names what it is adjusted for',()=>{
  const rows=[...Array(20).fill({ill:'Y',ate:'Y',sex:'F'}),...Array(80).fill({ill:'N',ate:'Y',sex:'M'}),
              ...Array(10).fill({ill:'Y',ate:'N',sex:'M'}),...Array(90).fill({ill:'N',ate:'N',sex:'F'})];
  const params={family:'logistic',outcome:'ill',cases:['Y'],controls:['N'],exposure:{column:'ate',as:'categorical',reference:'N'},
    adjust:[{column:'sex',as:'categorical'}],errors:'profile'};
  const r=fitRegression(rows,specFrom(params));
  const table=regressionTable(r);
  assert.deepEqual(table.keys,['term','statistic']);
  assert.deepEqual(table.rows.filter(x=>x.key.term==='ateY').map(x=>x.key.statistic),['odds ratio','lower 95%','upper 95%','p']);
  assert.match(regressionSentence(r,params),/^Logistic regression of ill on ate, adjusted for sex: odds ratio .* likelihood-ratio \(profile\) intervals, 200 rows\./);
});

const SALMONELLA=new URL('../../example-2021-salmonella-germany/data/',import.meta.url);
test('Salmonella: Galia melon adjusted for age group and sex, the published 96 (15-2100) and 18 (4.6-100)',
  {skip:existsSync(SALMONELLA)?false:'example-2021-salmonella-germany is not checked out'},()=>{
  const all=csvRows(readFileSync(new URL('Complete_dataset_Luczynska_et_al_2022.csv',SALMONELLA),'utf8'));
  const panel=csvRows(readFileSync(new URL('FM_HuGo_controls_Luczynska_et_al_2022.csv',SALMONELLA),'utf8'));
  const model=rows=>fitRegression(rows,{family:'logistic',outcome:'fall',cases:['1'],controls:['0'],
    exposure:{column:'galiamelo_apr2',as:'categorical',reference:'0'},
    adjust:[{column:'age_group7',as:'categorical'},{column:'sex',as:'categorical'}],errors:{kind:'profile'}}).estimates[0];
  const classical=model(all.filter(r=>r.fall==='1'||r.fall==='0'));
  assert.equal(classical.ratio.toFixed(0),'96');
  assert.equal(classical.lower.toFixed(0),'15');
  assert.equal(Number(classical.upper.toPrecision(2)),2100);
  const matched=model([...all.filter(r=>r.fall==='1'),...panel]);
  assert.equal(matched.ratio.toFixed(0),'18');
  assert.equal(matched.lower.toFixed(1),'4.6');
  assert.equal(Number(matched.upper.toPrecision(2)),100);
});

const NYC=process.env.NYC_PKG;
test('NYC: ozone per 10 ppb, the authors\' archived coefficient and HAC standard error to 12 figures',
  {skip:NYC&&existsSync(NYC)?false:'Set NYC_PKG to a local copy of the authors\' Zenodo package.'},()=>{
  const zip=unzipSync(readFileSync(NYC));
  const file=Object.keys(zip).find(name=>name.endsWith('Data/Core/Derived/analysis_master_raw_rebuild.csv'));
  const rows=csvRows(new TextDecoder().decode(zip[file])).sort((a,b)=>a.date<b.date?-1:1);
  const r=fitRegression(rows,{family:'poisson',outcome:'count',exposure:{column:'o3_lag02_10',as:'numeric'},
    adjust:[{column:'pm25_lag02_10',as:'numeric'},{column:'no2_lag02_10',as:'numeric'},{column:'tmean_lag03',as:'spline',df:4},
      {column:'holiday',as:'numeric'}],strata:'stratum',errors:{kind:'hac',lag:14}});
  // R_core_primary_results.csv, "Asthma ED count", O3.
  assert.equal(r.rows.used,3643);
  assert.equal(r.strata.used,840);
  assert.ok(Math.abs(r.estimates[0].coefficient-0.059133132965951)<1e-12);
  assert.ok(Math.abs(r.estimates[0].se-0.0127276822785079)<1e-12);
});
