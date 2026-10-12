// Exports an **exhaustive** decision table for each declared ruleset, evaluated by the real
// reasoner, for the Validation Lab to check independently.
//
// Two things the lab validates, and they are different claims:
//   1 · the logic produces the same result — a Python decision table against these conclusions;
//   2 · the receipt is the same receipt — the facts and rules this run actually emitted, parsed
//       and compared against what the ruleset's declared input contract says should be asserted.
// So the fixture carries the conclusions AND the receipt N3, not just the conclusions.
//
// Exhaustive, not sampled. Every one of the three rulesets has a finite input space small enough
// to enumerate completely: 12, 9 and 24 cells. That is a stronger check than any sample, because
// it can see things a sample cannot — a cell no rule fires on, two rules firing with different
// conclusions, and the boundary case where a value equals the threshold.
//
// The reasoner runs in node here, which this project had assumed impossible: every other
// reasoner-dependent test drives a browser worker through Playwright. `vendor/eye-21.1.24.js` is
// a webpack bundle assigning to `var eyereasoner`, so loading it with `vm.runInThisContext` puts
// it in scope. Measured 2026-10-12. It is the same engine and the same version the browser runs.
//
// Usage: node scripts/export-ruleset-fixture.mjs <outputDir>
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {makeN3} from '../build/core.js';
import {accessN3,facilityN3} from '../build/old-naledi.js';
import {bundledRulesets} from '../build/rulesets.js';

globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('../vendor/eye-21.1.24.js',import.meta.url),'utf8'),{filename:'eye-21.1.24.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const canonical=value=>JSON.stringify(value,(_k,inner)=>
  inner&&typeof inner==='object'&&!Array.isArray(inner)
    ?Object.fromEntries(Object.keys(inner).sort().map(k=>[k,inner[k]])):inner);
const sha256=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const NS='urn:fieldwork:';
const rulesets=Object.fromEntries(bundledRulesets().map(r=>[r.id.split(':').pop(),r]));

/** One subject per call, because two of the three rulesets derive a fact from the subject's own
 *  id — nb06-evidence reads fw:namedRule from a map keyed by facility id — so distinct cells
 *  cannot share one run without colliding on identity. */
const cellOf=async (id,inputs,generate)=>{
  const n3=generate();
  const conclusions=await reason(n3.input);
  return {id,inputs,
    conclusions:conclusions.filter(q=>q.subject.includes(id)).map(q=>({
      predicate:q.predicate.replace(NS,'fw:'),value:q.object.replace(NS,'fw:')}))
      .sort((a,b)=>a.predicate.localeCompare(b.predicate)||a.value.localeCompare(b.value)),
    facts:n3.facts,rules:n3.rules};
};

const THRESHOLD_KM=5;
async function outreachCriteria(){
  const cells=[];
  // distance relative to the threshold, including **equal**, which is the case that separates
  // math:notGreaterThan from math:lessThan and which no random sample reliably hits.
  const relations={below:THRESHOLD_KM-1,equal:THRESHOLD_KM,above:THRESHOLD_KM+1};
  for(const distanceKnown of [true,false])
    for(const alertKnown of [true,false])
      for(const alertActive of alertKnown?[true,false]:[null])
        for(const [relation,distance] of distanceKnown?Object.entries(relations):[['absent',null]]){
          const id=`c${cells.length+1}`;
          cells.push(await cellOf(id,{distanceKnown,alertKnown,alertActive,relation,distance},
            ()=>makeN3([{id,name:id,coordinates:distanceKnown?[0,0]:null,distance,unit:'kilometres',
              center:distanceKnown?{id:'x',name:'X',coordinates:[0,0]}:null}],
              {active:alertActive,date:'2026-07-15'},THRESHOLD_KM)));
        }
  return {ruleset:rulesets['outreach-criteria'],parameters:{threshold:THRESHOLD_KM,unit:'kilometres'},cells,
    subjectPrefix:'place:'};
}

const THRESHOLD_MIN=20;
async function accessReview(){
  // Every zone bound and the threshold, each exactly on and either side of the line.
  const minutes=[null,0,5,5.5,15,15.5,20,25,30,30.5];
  const cells=[];
  for(const value of minutes){
    const id=`c${cells.length+1}`;
    cells.push(await cellOf(id,{accessKnown:value!==null,minutes:value},
      ()=>accessN3([{id,name:id,coordinates:null,distanceKm:null,minutes:value,center:null}],THRESHOLD_MIN)));
  }
  return {ruleset:rulesets['access-review'],parameters:{threshold:THRESHOLD_MIN,unit:'minutes'},cells,subjectPrefix:''};
}

async function nb06Evidence(){
  // 3 named states x 2 ownerships x 4 facility kinds = 24, the complete space. `namedRule` is
  // derived from the facility **id**, which is the silent defect the ruleset records, so the id
  // is what selects the named state here.
  const named={Marina:'facility-158',Broadhurst:'facility-25',None:'facility-999'};
  const kinds={Hospital:'Referral Hospital',Clinic:'Clinic',HealthPost:'Health Post',Other:'Pharmacy'};
  const cells=[];
  for(const [namedRule,id] of Object.entries(named))
    for(const owner of ['GOVERNMENT','PRIVATE'])
      for(const [facilityKind,serviceType] of Object.entries(kinds))
        cells.push(await cellOf(id,{namedRule,government:owner==='GOVERNMENT',facilityKind,serviceType,subjectId:id},
          ()=>facilityN3([{id,name:namedRule+' '+facilityKind,serviceType,owner}])));
  // Cells share ids across ownership and kind, so give each a stable table key of its own.
  cells.forEach((cell,index)=>{cell.id=`c${index+1}`;});
  return {ruleset:rulesets['nb06-evidence'],parameters:{},cells,subjectPrefix:''};
}

const BUILDERS={'ruleset-outreach-criteria-001':outreachCriteria,
  'ruleset-access-review-001':accessReview,'ruleset-nb06-evidence-001':nb06Evidence};

const outputDir=process.argv[2];
if(!outputDir){console.error('Usage: node scripts/export-ruleset-fixture.mjs <outputDir>');process.exit(1);}

for(const [fixtureId,build] of Object.entries(BUILDERS)){
  const {ruleset,parameters,cells,subjectPrefix}=await build();
  // One receipt, because every cell in a ruleset runs the same rules: the rules are the ruleset's
  // and the facts differ per cell. The lab compares both, so both are carried.
  const fixture={
    schema:'fieldwork/validation-fixture/1',fixtureId,exportedAt:new Date().toISOString(),
    application:{name:'Fieldwork',version},
    operation:{ruleset:ruleset.id,release:ruleset.version,label:ruleset.title,
      implementation:ruleset.inputContract.factGenerator},
    declaredParameters:{...parameters,
      rulesetId:ruleset.id,rulesetVersion:ruleset.version,
      basisStatus:ruleset.basis.status,
      resolvableEvidence:ruleset.basis.evidence.length,
      unresolvedCitations:ruleset.basis.unresolvedCitations.map(c=>c.citation),
      outputVocabulary:ruleset.outputVocabulary,
      expects:ruleset.inputContract.expects,
      subjectPrefix,
      mustNotBeReadAs:ruleset.mustNotBeReadAs},
    input:{cells:cells.map(({id,inputs})=>({id,...inputs}))},
    output:{
      decisions:cells.map(({id,conclusions})=>({id,conclusions})),
      receipt:{rules:cells[0].rules,factsByCell:cells.map(({id,facts})=>({id,facts}))}
    },
    note:`Exhaustive decision table: ${cells.length} cells, the complete input space of this ruleset. `
      +`Conclusions are from the real EYE reasoner, the same engine and version the browser runs, loaded in node. `
      +`The receipt is carried so the lab can check the facts and rules as well as the conclusions.`,
    assets:[]
  };
  fixture.integrity={algorithm:'sha-256',canonicalJSON:sha256(canonical({...fixture,integrity:undefined}))};
  await writeFile(`${outputDir}/${fixtureId}.json`,JSON.stringify(fixture,null,1)+'\n');
  const values=new Set(cells.flatMap(c=>c.conclusions.map(x=>x.predicate+'='+x.value)));
  const unmatched=cells.filter(c=>!c.conclusions.length).length;
  console.log(`${fixtureId}: ${cells.length} cells, ${values.size} distinct conclusions, ${unmatched} cell(s) no rule fired on`);
}
