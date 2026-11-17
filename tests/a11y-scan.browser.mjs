import {test,expect} from './fixtures.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

/** SECTION 508 AUDIT, THE AUTOMATED FLOOR (docs/audits/section-508-audit.md, 2026-11-16). axe-core against WCAG 2.0 A
 *  and AA, which Section 508 incorporates: every view and the main dialogs in both themes; then, in worked examples that
 *  between them hold maps, charts, tables and the data widgets, every widget's Inspector, every dialog an Inspector's
 *  buttons open, the Results and the note dialog. Writes test-results/a11y-scan.json; fails on any violation. */
test.use({serviceWorkers:'block'});
test.setTimeout(900000);

const VIEWS=['workflow','results','project','notes','manual','widgets','rules'];
const DIALOGS=[
  {name:'Help',open:page=>page.locator('#help-button').click()},
  {name:'Identity',open:page=>page.locator('#identity-button').click()},
  {name:'Credentials',open:page=>page.locator('#credentials-button').click()},
];
const EXAMPLES=['snow-isochrone','hagelloch','snow-voronoi','snow-curve','hagelloch-cluster','oswego-1940'];
// An Inspector button is pressed only to see whether it opens a dialog; these change or remove the work instead.
const NOT_PRESSED=/delete|remove|run|clear|reset|download|export|save|discard|unlink|forget|undo|redo|copy|duplicate|apply|fetch/i;

const found=[];
const scanner=(page,info)=>async(surface,theme,scope)=>{
  let b=new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']);
  if(scope)b=b.include(scope);
  // SETTLED BEFORE IT IS MEASURED (found on WebKit's CI run of 2026-11-16): a toast caught mid-fade in the dark theme
  // read as contrast 1.41, its colours halfway through the transition. Running animations finish before the scan.
  // A toast raised a moment after a click (2026-11-17, light theme, 1.69 on #project-new) had not begun to fade when
  // the first check ran, so the page must be settled twice, a quarter of a second apart.
  const settled=()=>page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'||a.effect?.getComputedTiming().iterations===Infinity),null,{timeout:5000}).catch(()=>{});
  for(let i=0;i<2;i++){await page.waitForTimeout(250);await settled();}
  const r=await b.analyze();
  for(const v of r.violations)found.push({project:info.project.name,surface,theme,rule:v.id,impact:v.impact,help:v.help,
    wcag:v.tags.filter(t=>/^wcag\d{3,}$/.test(t)),nodes:v.nodes.length,
    examples:v.nodes.slice(0,3).map(n=>n.target.join(' ')),
    detail:v.nodes.slice(0,3).map(n=>(n.any?.[0]?.message||n.all?.[0]?.message||n.none?.[0]?.message||'').slice(0,200))});
};
const report=(info,name)=>{
  mkdirSync('test-results',{recursive:true});
  const mine=found.filter(f=>f.project===info.project.name);
  writeFileSync(`test-results/a11y-scan-${name}-${info.project.name}.json`,JSON.stringify(mine,null,1));
  const lines=mine.map(f=>`${f.rule} (${f.impact}) on ${f.surface} ${f.theme}: ${f.examples.join(' | ')} :: ${f.detail[0]}`);
  console.log(`A11Y ${name} ${info.project.name}\n`+(lines.join('\n')||'no violations'));
  return lines;
};

test('every view and the main dialogs, both themes, against WCAG 2.0 A and AA',async({page},info)=>{
  const scan=scanner(page,info);
  for(const theme of ['light','dark']){
    await page.emulateMedia({colorScheme:theme});
    await page.goto('/');await page.evaluate(()=>localStorage.clear());
    await page.goto('/?example=snow-isochrone');
    await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
    for(const view of VIEWS){
      const tab=page.locator(`[data-view="${view}"]`).first();
      if(!await tab.isVisible())continue;
      await tab.click();
      await page.waitForTimeout(400);
      await scan(`view:${view}`,theme);
    }
    await page.locator('[data-view="project"]').first().click();
    for(const tab of ['#project-new','#project-tab-examples-button']){
      await page.locator(tab).click();await scan(`project tab:${tab}`,theme);
    }
    for(const d of DIALOGS){
      await d.open(page);await page.waitForTimeout(300);
      await scan(`dialog:${d.name}`,theme,'dialog[open]');
      await page.keyboard.press('Escape');await page.waitForTimeout(200);
    }
  }
  expect(report(info,'views')).toEqual([]);
});

// A worked example's write-up is read-only; the note dialog is scanned in a project of the practitioner's own.
test('the note dialog, both themes',async({page},info)=>{
  const scan=scanner(page,info);
  for(const theme of ['light','dark']){
    await page.emulateMedia({colorScheme:theme});
    await page.goto('/');await page.evaluate(()=>localStorage.clear());
    await page.goto('/?example=blank');
    await page.locator('[data-view="project"]').click();
    await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
    await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
    await page.locator('[data-view="notes"]').click();
    await page.locator('.notes-part[data-section="Results"] [data-add-note]').first().click();
    await expect(page.locator('#note-dialog')).toBeVisible();
    await scan('dialog:note',theme,'dialog[open]');
    await page.keyboard.press('Escape');
  }
  expect(report(info,'note')).toEqual([]);
});

/** CHROMIUM ONLY (2026-11-16): axe reads the page's markup, which both engines are given alike, and the six examples cost
 *  WebKit about 4.5 minutes, enough to stop CI's WebKit run at its 75-minute limit. WebKit still scans the views and dialogs. */
for(const example of EXAMPLES)test(`${example}: each widget's Inspector, the dialogs it opens, and the Results`,async({page,browserName},info)=>{
  test.skip(browserName==='webkit','Inspector markup is scanned on Chromium; WebKit runs out of CI time');
  const scan=scanner(page,info);
  for(const theme of example==='snow-isochrone'?['light','dark']:['light']){
    await page.emulateMedia({colorScheme:theme});
    await page.goto('/');await page.evaluate(()=>localStorage.clear());
    await page.goto(`/?example=${example}`);
    await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
    await expect(page.locator('#workflow-state')).toContainText(/Run complete|Not ready|Ready/,{timeout:180000});
    await page.locator('[data-view="workflow"]').first().click();
    const ids=await page.locator('.react-flow__node').evaluateAll(ns=>ns.map(n=>n.dataset.id));
    const dialogsSeen=new Set(),skipped=[];
    for(const id of ids){
      const node=page.locator(`.react-flow__node[data-id="${id}"]`);
      // Reached as a keyboard user reaches it (a node outside the canvas's view cannot be clicked): focus, then Enter.
      if(!await node.count())continue; // a button pressed on an earlier widget may have changed the workflow
      if(!await node.evaluate(el=>{el.focus();return true;},null,{timeout:3000}).catch(()=>false)){skipped.push(id);continue;}await page.keyboard.press('Enter');await page.waitForTimeout(250);
      const type=await page.evaluate(i=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')??'{}').nodes?.find(n=>n.id===i)?.type??i,id);
      await scan(`${example} inspector:${type}`,theme,'#inspector');
      // Each Inspector button that opens a dialog: scanned once per dialog.
      const buttons=await page.locator('#inspector button:visible').evaluateAll(bs=>bs.map((b,i)=>({i,text:(b.textContent||b.getAttribute('aria-label')||'').trim(),disabled:b.disabled})));
      for(const b of buttons){
        if(b.disabled||!b.text||NOT_PRESSED.test(b.text))continue;
        const button=page.locator('#inspector button:visible').nth(b.i);
        if(!await button.count())continue;
        await button.click({timeout:3000}).catch(()=>{});await page.waitForTimeout(400);
        const open=page.locator('dialog[open]');
        if(await open.count()){
          const did=await open.first().getAttribute('id')??b.text;
          if(!dialogsSeen.has(did)){dialogsSeen.add(did);await scan(`${example} dialog:${did} (from ${type}: ${b.text})`,theme,'dialog[open]');}
          for(let k=0;k<3&&await page.locator('dialog[open]').count();k++){
            await page.keyboard.press('Escape');await page.waitForTimeout(250);
            const keep=page.locator('dialog[open] button:visible',{hasText:/^(Discard|Close|Cancel|Leave)/});
            if(await keep.count())await keep.first().click().catch(()=>{});
          }
        }
      }
    }
    if(skipped.length)console.log(`A11Y ${example}: not reached after the workflow re-rendered: ${skipped.join(', ')}`);
    await page.locator('[data-view="results"]').first().click();await page.waitForTimeout(800);
    await scan(`${example} view:results`,theme);
  }
  expect(report(info,example)).toEqual([]);
});
