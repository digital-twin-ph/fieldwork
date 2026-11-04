import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {guessMapping,readDictionary,checkDictionary,proposeFrom,metadataFindings,meaningOf,isDescribed} from '../build/column-metadata.js';
import {parseCSV} from '../build/input-data.js';

/** WHAT THE COLUMNS MEAN (experiment 172). The practitioner, 2026-11-04: *"So let's include the data dictionary work.
 *  It's actually critical for data quality work. Which is upstream."* */
const table={keys:['date','o3'],valueField:'count'};

test('an undescribed column, a proposal not yet accepted, and a described one',()=>{
  const none=metadataFindings(table,{});
  assert.equal(none.length,1);
  assert.equal(none[0].kind,'undescribed-column');
  assert.match(none[0].text,/3 of 3 kept columns have no stated meaning: date, o3, count/);
  const some=metadataFindings(table,{
    o3:{label:'Ozone, 8-hour maximum',unit:'ppb',origin:'dictionary',confirmed:false,from:'dict.csv'},
    count:{label:'Asthma ED visits',unit:'visits/day',origin:'practitioner',confirmed:true},
    date:{origin:'practitioner',confirmed:true}});
  assert.deepEqual(some.map(f=>f.kind),['undescribed-column','unconfirmed-description']);
  assert.match(some[0].text,/: date\.$/);
  assert.match(some[1].text,/: o3\.$/);
  assert.equal(meaningOf({label:'Ozone',unit:'ppb',origin:'dictionary',confirmed:false}),'','an unconfirmed label is not shown as the meaning');
  assert.equal(meaningOf({label:'Ozone',unit:'ppb',origin:'dictionary',confirmed:true}),'Ozone (ppb)');
  assert.equal(isDescribed({unit:'ppb',origin:'practitioner',confirmed:true}),false,'a unit alone does not say what a column is');
});

test('a dictionary read by a mapping the practitioner confirms, checked mechanically against the file',()=>{
  const headers=['variable','unit_or_coding','description_and_derivation','missing_n'];
  const mapping=guessMapping(headers);
  assert.deepEqual(mapping,{name:'variable',description:'description_and_derivation',unit:'unit_or_coding',missing:'missing_n'});
  const entries=readDictionary(headers,[['date','Date','Local calendar date','0'],['count','visits/day','Visits ages 5-17','1'],
    ['gone','x','not in the file','0']],mapping);
  const check=checkDictionary('dict.csv',entries,{headers:['date','count','o3'],rows:[['2023-06-01','3','40'],['2023-06-02','','41']]});
  assert.deepEqual(check.notInFile,['gone']);
  assert.deepEqual(check.notInDictionary,['o3']);
  assert.deepEqual(check.missingDisagree,[]);
  const proposed=proposeFrom(entries,'dict.csv',['date','o3','count']);
  assert.equal(proposed.count.confirmed,false);
  assert.equal(proposed.count.unit,'visits/day');
  assert.equal(proposed.o3,undefined);
  const findings=metadataFindings(table,proposed,check);
  assert.ok(findings.some(f=>f.kind==='dictionary-mismatch'&&/does not describe this kept column: o3/.test(f.text)));
  // A proposal never overwrites what the practitioner confirmed.
  const kept=proposeFrom(entries,'dict.csv',['count'],{count:{label:'Mine',origin:'practitioner',confirmed:true}});
  assert.equal(kept.count.label,'Mine');
});

const NYC=process.env.NYC_PKG;
test('NYC: the authors\' dictionary against their analysis file, all 92 columns and every missing count',
  {skip:NYC&&existsSync(NYC)?false:'Set NYC_PKG to a local copy of the authors\' Zenodo package.'},()=>{
  const zip=unzipSync(readFileSync(NYC));
  const read=end=>parseCSV(new TextDecoder().decode(zip[Object.keys(zip).find(n=>n.endsWith(end))]),20000);
  const dictionary=read('Metadata/Core/ANALYSIS_DATA_DICTIONARY.csv'),file=read('Data/Core/Derived/analysis_master_raw_rebuild.csv');
  const entries=readDictionary(dictionary.headers,dictionary.rows,guessMapping(dictionary.headers));
  const check=checkDictionary('ANALYSIS_DATA_DICTIONARY.csv',entries,file);
  assert.equal(check.checked,92);
  assert.deepEqual([check.notInFile,check.notInDictionary,check.missingDisagree],[[],[],[]]);
  assert.equal(entries.get('o3_lag02_10').unit,'10 ppb');
  assert.equal(entries.get('count').missing,7);
  assert.match(entries.get('count').description,/asthma-syndrome ED visit count for ages 5-17/);
});

import {suggestConnections,dictionaryCsv,entriesFrom} from '../build/column-metadata.js';
import {readXlsx} from '../build/xlsx.js';
const SALMONELLA=new URL('../../example-2021-salmonella-germany/data/',import.meta.url);
test('Salmonella: the codebook connected to the data file, the same names connected and the near ones only suggested',
  {skip:existsSync(SALMONELLA)?false:'example-2021-salmonella-germany is not checked out'},()=>{
  const [codebook]=readXlsx(readFileSync(new URL('Codebook_Luczynska_et_al_2022.xlsx',SALMONELLA)));
  const variables=codebook.rows.map(r=>r[0]).filter(Boolean);
  const file=parseCSV(readFileSync(new URL('Complete_dataset_Luczynska_et_al_2022.csv',SALMONELLA),'utf8'),20000);
  const columns=file.headers.map(h=>h.trim());
  const s=suggestConnections(columns,variables);
  assert.deepEqual(s.fall,{variable:'fall',how:'same name'});
  assert.deepEqual(s.sex,{variable:'sex*',how:'suggested'},'the codebook marks sex with an asterisk');
  assert.deepEqual(s.galiamelo_apr2,{variable:'galiamelo*',how:'suggested'},'the April week of the codebook\'s variable');
  assert.deepEqual(s.galiamelo2,{variable:'galiamelo*',how:'suggested'});
  // The codebook writes it in capitals; case alone does not make a different variable.
  assert.deepEqual(s.vruntime,{variable:'vRUNTIME',how:'suggested'});
});

test('a dictionary made from accepted descriptions, as a CSV and as entries for the next table from the same source',()=>{
  const declared={count:{label:'Visits, ages 5 to 17',unit:'visits/day',origin:'practitioner',confirmed:true},
    o3:{label:'Ozone, "8-hour"',origin:'practitioner',confirmed:true},
    pm25:{label:'PM2.5',origin:'dictionary',confirmed:false}};
  assert.equal(dictionaryCsv(declared,['date','count','o3','pm25']),
    'variable,label,unit,description\ncount,"Visits, ages 5 to 17",visits/day,\no3,"Ozone, ""8-hour""",,\n');
  assert.deepEqual([...entriesFrom(declared).keys()],['count','o3']);
});
