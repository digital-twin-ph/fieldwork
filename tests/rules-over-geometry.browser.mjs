import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {syncProjectManifest} from '../build/project-manifest.js';

// Experiment 113: can a ruleset run over a quantity DERIVED from geometry rather than over a
// column someone imported? The rules only evaluate under the real EYE reasoner, which is vendored
// for the browser, so this is the only place the question can actually be asked.
//
// The chain is: points -> summarize_hull (projects, computes an area, and from 2026-10-14 ATTACHES
// it to the record) -> apply_ruleset with extent-review -> a decisions table.
const ruleset=JSON.parse(readFileSync(new URL('../rulesets/extent-review/1.0.0.json',import.meta.url),'utf8'));
const pinned={id:ruleset.id,version:ruleset.version,title:ruleset.title,
  inputs:ruleset.inputContract.ports.inputs,output:ruleset.inputContract.ports.output};
const pt=(id,lon,lat)=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[lon,lat]}});

// A box about 693 m by 1113 m at this latitude: 0.772 km2, checked by hand against the hull.
const corners=[pt('a',-0.14,51.51),pt('b',-0.13,51.51),pt('c',-0.13,51.52),pt('d',-0.14,51.52)];
const workflow=thresholdM2=>{
  const w={schema:'fieldwork/workflow/1',name:'Extent review',nodes:[
    {id:'obs',type:'point_input',x:20,y:20,params:{label:'Observed cases',
      data:{type:'FeatureCollection',features:corners}}},
    {id:'hull',type:'summarize_hull',x:280,y:20,params:{label:'Observed extent',zone:30,hemisphere:'north'}},
    {id:'rules',type:'apply_ruleset',x:540,y:20,params:{label:'Extent review',ruleset:pinned,
      parameters:{threshold:thresholdM2}}},
    {id:'out',type:'table_output',x:800,y:20,params:{label:'Extent decisions',inputMode:'decisions'}}],
    edges:[{id:'e1',from:'obs',to:'hull',port:'points'},
      {id:'e2',from:'hull',to:'rules',port:'polygons'},
      {id:'e3',from:'rules',to:'out',port:'decisions'}]};
  syncProjectManifest(w);
  return w;
};

const run=async(page,w)=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles(
    {name:'extent.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
};

const decision=async page=>{
  // The DECISION, read from the results table -- not from the page text. The N3 panel prints the
  // rules, and those contain the words "Review", "NoFlag" and "Unknown" whatever the run
  // concluded, so matching the body passes for the wrong reason and fails for the wrong reason.
  const tabs=page.locator('#result-tabs [data-output]');
  for(let i=0;i<await tabs.count();i++)
    if(/decision/i.test((await tabs.nth(i).textContent())||'')){await tabs.nth(i).click();break;}
  const row=page.locator('#result-rows tr').first();
  await expect(row).toBeVisible({timeout:15000});
  return (await row.textContent())||'';
};

test('a ruleset classifies a hull by the area the hull derived',async({page})=>{
  // Threshold below the hull's 0.772 km2: the rules must flag it.
  await run(page,workflow(500000));
  const row=await decision(page);
  assert.match(row,/Flagged for review|Review/,`expected a flag, got: ${row}`);
  assert.match(row,/0\.772 km²/,`expected the derived area in the row, got: ${row}`);
  await page.screenshot({path:'test-results/rules-over-geometry.png',fullPage:true});
});

test('the same chain above the threshold does not flag, and the decision follows the area',async({page})=>{
  // Threshold above it: same data, same rules, the other conclusion. If this passed in both
  // directions the rule would not be reading the area at all.
  await run(page,workflow(2000000));
  const row=await decision(page);
  assert.match(row,/No flag|NoFlag/,`expected no flag, got: ${row}`);
  assert.doesNotMatch(row,/Flagged for review/,`the row must not also say flagged: ${row}`);
  assert.match(row,/0\.772 km²/,`expected the derived area in the row, got: ${row}`);
});

// The practitioner's test for a composition, in their words: substitute it into the worked
// example workflow. A composite of hull + ruleset replaces two nodes with one, and the question
// is whether the example still wires up -- which is what the output port type decides.
// Experiment 113.
test('the composite replaces the hull and the ruleset, and the example keeps every edge',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // The hand-wired answer, to compare against.
  await page.locator('#result-tab-decisions').click();
  // The hull encloses 0.139 km2 against a 0.250 km2 threshold, so the answer is NoFlag with the
  // comparison spelled out. Both travel on the polygon now, which is why they are in this table.
  const before=await page.locator('#result-rows').textContent();
  expect(before).toContain('NoFlag');
  expect(before).toContain('Encloses 0.139 km²');

  // Substitute. The composite takes the points and gives back polygons, so the map and the
  // decision table connect to it exactly as they connected to the two nodes it replaces.
  const swapped=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const review=w.nodes.find(n=>n.id==='review');
    const host={id:'composite',type:'micro_workflow',x:330,y:20,
      params:{label:'Extent review',
        composition:{id:'urn:fieldwork:composition:classify_extent',nodeType:'classify_extent',
          version:'0.1.0',title:'Extent review',stage:'classify',output:'polygons',
          inputs:[['points','points']]},
        parameters:{zone:30,hemisphere:'north',threshold:review.params.parameters.threshold}}};
    w.nodes=w.nodes.filter(n=>!['extent','review'].includes(n.id)).concat([host]);
    w.edges=w.edges.filter(e=>!['deaths-extent','extent-review','review-decisions','extent-map'].includes(e.id))
      .concat([{id:'deaths-host',from:'deaths',to:'composite',port:'points'},
        {id:'host-decisions',from:'composite',to:'decisions',port:'polygons'},
        {id:'host-map',from:'composite',to:'map',port:'polygons'}]);
    // The project manifest lists the nodes it was synced against, and two of them are being
    // replaced; the application re-syncs it on an edit, and this edit is made from outside.
    delete w.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    // Also into the saved-workspace map, which is what ?example= restores before it reaches for
    // the published template. Otherwise the substitution is overwritten by the example itself.
    const saved=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    saved['snow-extent']=w;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(saved));
    return w.nodes.length;
  });
  expect(swapped).toBeGreaterThan(0);
  // Reopened the way a practitioner would: the workspace is saved per example, so ?example=
  // restores what was edited rather than the published template.
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // One node on the canvas, four edges intact, and the same answer.
  await expect(page.locator('.react-flow__node[data-id="composite"]')).toBeVisible();
  await page.locator('#result-tab-decisions').click();
  const after=await page.locator('#result-rows').textContent();
  expect(after).toContain('NoFlag');
  expect(after).toContain('Encloses 0.139 km²');
  await page.locator('#result-tab-map').click();
  await expect(page.locator('#map path')).not.toHaveCount(0);

  // One receipt per member, which is what a composition owes: it may not claim its members' work.
  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();
  expect(n3).toContain('composite-hull');
  expect(n3).toContain('composite-review');
  expect(errors).toEqual([]);
});
