import {test,expect} from '@playwright/test';
import {writeFileSync,mkdirSync,statSync} from 'node:fs';

/** HOW LARGE A TABLE (experiment 175). Not a gate test: skipped unless MEASURE_ROWS is set, and meant to run against a
 *  build whose row ceilings are lifted, so the steps meet the size and not the cap. The practitioner, 2026-11-04: *"It's
 *  not about limits. It's about discovering what those are."*
 *
 *  Data shaped like the NYC remote-sensing plan: a long table of seven measures by day (3,653 days, 25,571 rows), with
 *  sites added past that; and a wide table of the same length for the regression. Each step is timed on its own and its
 *  outcome is recorded as the page states it, failure included. Results go to test-results/measure-<rows>.json. */
test.use({serviceWorkers:'block'});

const N=Number(process.env.MEASURE_ROWS||0);
const LIMIT=Number(process.env.MEASURE_LIMIT_MS||300_000);
const VARS=['count','o3','pm25','no2','tmean','ndvi','lst'];
const DAYS=3653,START=Date.UTC(2016,0,1);
const dayOn=i=>new Date(START+i*86_400_000).toISOString().slice(0,10);
const day=i=>new Date(START+(i%DAYS)*86_400_000).toISOString().slice(0,10);

function longCsv(n){const out=['date,variable,site,value'];
  for(let i=0;i<n;i++){const d=Math.floor(i/7);out.push(`${dayOn(d)},${VARS[i%7]},s0,${((i*7919)%1000)/10}`);}
  return out.join('\n')+'\n';}
function wideCsv(n){const out=['date,site,o3,tmean,stratum,holiday,count'];
  for(let i=0;i<n;i++){const t=START+(i%DAYS)*86_400_000,date=new Date(t),site=Math.floor(i/DAYS);
    const o3=(20+15*Math.sin(i/58)+((i*31)%9)).toFixed(1),tmean=(12+12*Math.sin(i/58-1)+((i*17)%5)).toFixed(1);
    const stratum=`s${site}-${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDay()}`;
    out.push(`${day(i)},s${site},${o3},${tmean},${stratum},${(i%41)===0?1:0},${10+((i*13)%17)+Math.round(Number(o3)/10)}`);}
  return out.join('\n')+'\n';}

const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const heap=page=>page.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null);
const state=page=>page.locator('#workflow-state').innerText().catch(()=>'');

test.skip(!N,'Set MEASURE_ROWS to measure; this is experiment 175, not a gate test.');

test(`measure a table of ${N} rows`,async({page,browserName})=>{
  test.setTimeout(3_600_000);
  const results={rows:N,browser:browserName,steps:[]};
  const record=(step,ms,outcome,extra={})=>{results.steps.push({step,ms:Math.round(ms),outcome,...extra});
    console.log(`${N} ${step}: ${Math.round(ms)} ms · ${outcome}`);};
  const timed=async(step,fn,extra)=>{const t=performance.now();
    try{const outcome=await fn();record(step,performance.now()-t,outcome??'ok',{heapMB:await heap(page),...(extra?.()??{})});return true;}
    catch(e){record(step,performance.now()-t,`FAILED: ${String(e.message).split('\n')[0].slice(0,300)}`,{heapMB:await heap(page).catch(()=>null)});return false;}};
  const long=Buffer.from(longCsv(N)),wide=Buffer.from(wideCsv(N));
  results.longBytes=long.length;results.wideBytes=wide.length;

  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click({timeout:LIMIT});

  const importTable=async(name,buffer,value,keys)=>{
    await page.locator('#node-library [data-add="table_input"]').click();
    const id=(await saved(page)).nodes.filter(n=>n.type==='table_input').at(-1).id;
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#open-table').click();
    const read=await timed(`import ${name}: read and preview`,async()=>{
      await page.locator('#table-file').setInputFiles({name:`${name}.csv`,mimeType:'text/csv',buffer});
      const refused=page.getByText(/could not be read/);
      await expect(page.locator('#table-keys').or(refused)).toBeVisible({timeout:LIMIT});
      if(await refused.isVisible())throw new Error(await page.locator('#table-dialog, dialog, [role="dialog"]').first().innerText().then(t=>t.split('could not be read.')[1]?.trim().split('\n')[0]??'refused'));});
    if(!read){await page.screenshot({path:`test-results/measure-${N}-${name}-import.png`});await page.keyboard.press('Escape');}
    if(!read)return null;
    await page.locator('#table-shape').selectOption('long');
    await page.locator('#table-value').selectOption(value);
    for(const box of await page.locator('#table-keys input[type="checkbox"]').all()){
      const v=await box.getAttribute('value');if(v)await box.setChecked(keys.includes(v));}
    const ok=await timed(`import ${name}: save`,async()=>{
      await page.locator('#table-save').click();
      await expect(page.locator('#table-save')).toBeHidden({timeout:LIMIT});
      await expect.poll(async()=>(await saved(page)).nodes.find(n=>n.id===id)?.params?.dataRef,{timeout:LIMIT}).toBeTruthy();});
    return ok?id:null;
  };
  const longId=await importTable('long',long,'value',['date','variable','site']);
  const wideId=await importTable('wide',wide,'count',['date','site','o3','tmean','stratum','holiday']);
  results.savedWorkflowBytes=(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1').length));

  await timed('reload: tables back whole',async()=>{
    await page.reload();
    await page.locator('[data-view="workflow"]').click({timeout:LIMIT});
    if(longId){await page.locator(`.react-flow__node[data-id="${longId}"]`).click();
      await expect(page.locator('.inspector')).toContainText(new RegExp(`${N.toLocaleString('en-US').replace(/,/g,',?')} rows`),{timeout:LIMIT});}
  });

  // EACH STEP ON ITS OWN: the downstream nodes are replaced, the workflow reopened, and run.
  const base=await saved(page);
  const tables=base.nodes.filter(n=>n.type==='table_input');
  const runStep=async(step,nodes,edges,after)=>{
    await page.evaluate(({tables,nodes,edges})=>{
      const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
      w.nodes=[...tables,...nodes];w.edges=edges;delete w.manifest;
      localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
      const all=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');all.blank=w;
      localStorage.setItem('fieldwork-examples-v1',JSON.stringify(all));},{tables,nodes,edges});
    await page.goto('/?example=blank');
    await page.locator('[data-view="workflow"]').click({timeout:LIMIT});
    await timed(step,async()=>{
      await page.locator('#run-button').click();
      await expect(page.locator('#workflow-state')).toContainText(/Run complete|failed|refused|cannot|Not ready/i,{timeout:LIMIT});
      const said=await state(page);
      if(!/Run complete/.test(said)){
        const why=await page.locator('.toast, [data-node-error], .node-error').allInnerTexts().catch(()=>[]);
        throw new Error(`${said} ${why.join(' | ')}`.trim());}
      if(after)await after();
      return said.trim();});
  };
  let y=0;const at=(type,id,params)=>({id,type,x:400,y:(y+=120),params:{label:type,...params}});
  const edge=(from,to,port)=>({id:`e-${from}-${to}`,from,to,port});
  if(longId){
    await runStep('run: whole long table to a table',[at('table_output','out1',{})],[edge(longId,'out1','table')],async()=>{
      await page.locator('[data-view="results"]').click();
      await expect(page.locator('main').first()).toContainText(/rows/i,{timeout:LIMIT});});
    await runStep('run: select a date range',[at('select_rows','sel',{keyColumn:'date',values:[],range:{from:'2016-02-01',to:'2016-02-29'}}),
      at('table_output','out2',{})],[edge(longId,'sel','records'),edge('sel','out2','table')]);
    await runStep('run: panel chart, every row',[at('chart_output','chart',{keyColumn:'date',panelsBy:'variable'})],[edge(longId,'chart','records')],async()=>{
      await page.locator('[data-view="results"]').click();
      await page.locator('#result-tabs [data-output="chart"]').click();
      await expect(page.locator('#vega-chart svg.marks').first()).toBeVisible({timeout:LIMIT});
      return 'drawn';});
    // The Inspector's value list for a date column of this table.
    await runStep('run: select (for the Inspector)',[at('select_rows','sel2',{keyColumn:'date',values:['2016-01-01']}),at('table_output','out3',{})],
      [edge(longId,'sel2','records'),edge('sel2','out3','table')]);
    await page.locator('[data-view="workflow"]').click({timeout:LIMIT});
    await timed('Inspector: the value list for date',async()=>{
      await page.locator('.react-flow__node[data-id="sel2"]').click();
      await page.locator('#configure-step').click();
      await expect(page.locator('#select-config [data-select-value]').first()).toBeAttached({timeout:LIMIT});
      const listed=await page.locator('#select-config [data-select-value]').count();
      await page.locator('#select-config #config-cancel').click();
      return `${listed} values listed`;});
  }
  if(wideId)await runStep('run: Poisson regression, strata, HAC',[at('regression','reg',{family:'poisson',outcome:'count',
    exposure:{column:'o3',as:'numeric'},adjust:[{column:'tmean',as:'spline'},{column:'holiday',as:'numeric'}],errors:'hac',strata:'stratum',
    hacLag:14,order:'date'}),at('table_output','out4',{})],[edge(wideId,'reg','records'),edge('reg','out4','table')]);

  await timed('export the project',async()=>{
    const download=page.waitForEvent('download',{timeout:LIMIT});
    await page.locator('#backup-button').click();
    await page.locator('#export-button').click();
    const file=await (await download).path();
    results.exportBytes=statSync(file).size;
    return `${(results.exportBytes/1e6).toFixed(1)} MB`;});

  mkdirSync('test-results',{recursive:true});
  writeFileSync(`test-results/measure-${N}.json`,JSON.stringify(results,null,2));
});
