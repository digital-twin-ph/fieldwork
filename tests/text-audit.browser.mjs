/** TEXT SIZE AND CONTRAST ON THREE SCREENS (TODO item 7, experiment 184). A measurement, run on demand:
 *  TEXT_AUDIT=1 npx playwright test tests/text-audit.browser.mjs --project=chromium
 *  Counts visible controls, words, words below 14 px and words whose colour against the nearest solid background is under WCAG's 4.5:1.
 *  Approximate: transparency is ignored. */
import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
test.use({serviceWorkers:'block',viewport:{width:1280,height:900}});
const bundle=readFileSync(new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url));
const audit=page=>page.evaluate(()=>{
  const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b]=m.slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;};
  const bgOf=el=>{for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;const a=c.match(/[\d.]+/g);if(a&&(a.length<4||Number(a[3])>0.5))return c;}return 'rgb(255,255,255)';};
  const rows=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const seen=new Set();
  while(walker.nextNode()){const t=walker.currentNode;const el=t.parentElement;if(!el||seen.has(el))continue;const txt=t.textContent.trim();if(txt.length<2)continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight*3)continue;const st=getComputedStyle(el);if(st.visibility==='hidden')continue;
    seen.add(el);const fg=lum(st.color),bg=lum(bgOf(el));
    const ratio=fg==null||bg==null?null:(Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
    rows.push({px:parseFloat(st.fontSize),ratio,words:txt.split(/\s+/).length,op:Number(st.opacity)});}
  const w=a=>a.reduce((s,r)=>s+r.words,0);const small=rows.filter(r=>r.px<14),faint=rows.filter(r=>r.ratio!=null&&r.ratio<4.5);
  const controls=[...document.querySelectorAll('button,select,input:not([type=hidden]),textarea,a[href],summary')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&getComputedStyle(e).visibility!=='hidden';}).length;
  return {controls,words:w(rows),smallWords:w(small),faintWords:w(faint),minPx:Math.min(...rows.map(r=>r.px)),sizes:[...new Set(rows.map(r=>r.px))].sort((a,b)=>a-b)};
});
test.skip(!process.env.TEXT_AUDIT,'run with TEXT_AUDIT=1: a measurement, not a regression test');
test('text audit',async({page})=>{
  test.setTimeout(120000);const out={};const save=()=>writeFileSync(process.env.TEXT_AUDIT_OUT||'test-results/text-audit.json',JSON.stringify(out,null,1));
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');await page.waitForTimeout(1500);
  out.workflowTab=await audit(page);save();
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:20000});
  await page.waitForTimeout(5000);
  await page.locator('[data-view="notes"]').click();await page.locator('.notes-part').first().waitFor();
  out.notesTab=await audit(page);save();
  await page.locator('.notes-part[data-section="Discussion"] [data-add-note]').first().click();
  out.noteDialog=await audit(page);save();
});
