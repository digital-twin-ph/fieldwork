import {test,expect} from './fixtures.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';

/** HOW MANY POINTS A MAP DRAWS. Not a gate test: skipped unless MEASURE_POINTS is set. Experiment 175's method, for
 *  points: the 2,000-record ceiling on a map's point layers was lifted, and this finds where drawing stops coping.
 *  Points are read from a table (Point data from its longitude and latitude columns), so the size is not met first
 *  at an import ceiling. Each output is run on its own and timed from Run to the figure on screen. Results go to
 *  test-results/measure-points-<n>.json. */
test.use({serviceWorkers:'block'});

const N=Number(process.env.MEASURE_POINTS||0);
const LIMIT=Number(process.env.MEASURE_LIMIT_MS||300_000);
// Spread over about 1 degree around Kinshasa, deterministic, with a class and a number to colour and size by.
function csv(n){const out=['id,lon,lat,cls,count'];
  for(let i=0;i<n;i++){const a=(i*7919)%100000/100000,b=(i*104729)%100000/100000;
    out.push(`p${i},${(15.0+a).toFixed(5)},${(-4.8+b).toFixed(5)},c${i%5},${1+(i*13)%40}`);}
  return out.join('\n')+'\n';}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const heap=page=>page.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null);

test.skip(!N,'Set MEASURE_POINTS to measure; this is not a gate test.');

test(`measure a map of ${N} points`,async({page,browserName})=>{
  test.setTimeout(3_600_000);
  const results={points:N,browser:browserName,steps:[]};
  const record=(step,ms,outcome,extra={})=>{results.steps.push({step,ms:Math.round(ms),outcome,...extra});
    console.log(`${N} ${step}: ${Math.round(ms)} ms · ${outcome}`);};
  const timed=async(step,fn)=>{const t=performance.now();
    try{const outcome=await fn();record(step,performance.now()-t,outcome??'ok',{heapMB:await heap(page)});return true;}
    catch(e){record(step,performance.now()-t,`FAILED: ${String(e.message).split('\n')[0].slice(0,300)}`,{heapMB:await heap(page).catch(()=>null)});return false;}};

  if(process.env.MEASURE_CONSOLE)page.on('console',m=>{if(m.type()!=='log')console.log('CONSOLE',m.type(),m.text().slice(0,300));});
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  // THE POINTS AS A WORKFLOW FILE (MEASURE_VIA=file): past what the Tabular data dialog handles, the points are held by
  // Point data itself, read from the file, and the table steps are skipped.
  if(process.env.MEASURE_VIA==='file'){
    const features=csv(N).trim().split('\n').slice(1).map(line=>{const [id,lon,lat,cls,count]=line.split(',');
      return {type:'Feature',id,properties:{name:id,cls,count:Number(count)},geometry:{type:'Point',coordinates:[Number(lon),Number(lat)]}};});
    const area={id:'area',type:'study_area',x:0,y:200,params:{label:'Around the points',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[14.95,-4.85],[16.05,-4.85],[16.05,-3.75],[14.95,-3.75],[14.95,-4.85]]]}}};
    const pts={id:'pts',type:'point_input',x:0,y:0,params:{label:'Points',data:{type:'FeatureCollection',features}}};
    for(const [step,node,mapped,drawn] of [
      ['static map',{id:'map',type:'map_output',x:400,y:0,params:{label:'Static',presentation:'plot'}},true,
        async()=>{await expect(page.locator('#map-panel svg').first()).toBeVisible({timeout:LIMIT});return 'drawn';}],
      ['interactive map',{id:'imap',type:'map_output',x:400,y:0,params:{label:'Interactive',presentation:'interactive'}},true,
        async()=>{const gpu=page.locator('.catchment-leaflet[data-marks-drawn]');
          await expect(gpu).toBeVisible({timeout:LIMIT}).catch(async e=>{await page.screenshot({path:`test-results/measure-points-${N}-interactive-timeout.png`});throw e;});
          await page.screenshot({path:`test-results/measure-points-${N}-interactive.png`});
          return `large layers drawn as ${await gpu.getAttribute('data-marks-drawn')}`;}],
      ['table of the points',{id:'tab',type:'table_output',x:400,y:0,params:{label:'Records'}},false,
        async()=>{await expect(page.locator('#table-panel table').first()).toBeVisible({timeout:LIMIT});return 'drawn';}]]){
      if((process.env.MEASURE_SKIP||'').split(',').includes(node.id))continue;
      const w={schema:'fieldwork/workflow/1',id:'w',label:'Points',nodes:[pts,area,node],
        edges:[{id:'e1',from:'pts',to:node.id,port:'points'},...(mapped?[{id:'e2',from:'area',to:node.id,port:'area'}]:[])]};
      await page.goto('/?example=blank');
      const loaded=await timed(`${step}: open the workflow file`,async()=>{
        await page.locator('#workflow-file').setInputFiles({name:'points.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
        await expect(page.locator('.react-flow__node[data-id="pts"]')).toBeAttached({timeout:LIMIT});});
      if(!loaded){await page.screenshot({path:`test-results/measure-points-${N}-${node.id}.png`});continue;}
      let ran=false;
      await timed(`${step}: run`,async()=>{
        await page.locator('#run-button').click({timeout:LIMIT});
        await expect(page.locator('#workflow-state')).toContainText(/Run complete|failed|refused|cannot|Not ready/i,{timeout:LIMIT});
        const said=(await page.locator('#workflow-state').innerText()).trim();
        if(!/Run complete/.test(said))throw new Error(said);ran=true;return said;});
      if(!ran)continue;
      await timed(`${step}: drawn`,async()=>{await page.locator('[data-view="results"]').click({timeout:LIMIT});
        await page.locator(`#result-tab-${node.id}`).click({timeout:LIMIT});return await drawn();});
      await timed(`${step}: page answers a click`,async()=>{await page.locator('[data-view="workflow"]').click({timeout:15_000});});
    }
    mkdirSync('test-results',{recursive:true});
    writeFileSync(`test-results/measure-points-${N}-file.json`,JSON.stringify(results,null,2));
    return;
  }
  await page.locator('[data-view="workflow"]').click({timeout:LIMIT});
  await page.locator('#node-library [data-add="table_input"]').click();
  const tableId=(await saved(page)).nodes.filter(n=>n.type==='table_input').at(-1).id;
  await page.locator(`.react-flow__node[data-id="${tableId}"]`).click();
  await page.locator('#configure-step').click();
  const read=await timed('import the table: read and preview',async()=>{
    await page.locator('#table-file').setInputFiles({name:'points.csv',mimeType:'text/csv',buffer:Buffer.from(csv(N))});
    await expect(page.locator('#table-keys')).toBeVisible({timeout:LIMIT});});
  if(!read)throw new Error('The table was not read.');
  await page.locator('#table-shape').selectOption('long',{timeout:LIMIT});
  await page.locator('#table-value').selectOption('count',{timeout:LIMIT});
  await expect(page.locator('#table-keys input[type="checkbox"]').first()).toBeAttached({timeout:LIMIT});
  // EACH TICK REBUILDS THE TABLE: timed on its own (2026-11-19, the dialog took over an hour at 250,000 rows).
  await timed('import the table: tick the four key columns',async()=>{
    for(const box of await page.locator('#table-keys input[type="checkbox"]').all()){
      const v=await box.getAttribute('value',{timeout:LIMIT});if(v)await box.setChecked(['id','lon','lat','cls'].includes(v),{timeout:LIMIT});}});
  if(process.env.MEASURE_ONLY==='import')return;
  await timed('import the table: save',async()=>{
    await page.locator('#table-save').click({timeout:LIMIT});
    await expect(page.locator('#table-save')).toBeHidden({timeout:LIMIT});
    await expect.poll(async()=>(await saved(page)).nodes.find(n=>n.id===tableId)?.params?.dataRef,{timeout:LIMIT}).toBeTruthy();});
  const table=(await saved(page)).nodes.find(n=>n.id===tableId);

  const points={id:'pts',type:'point_input',x:400,y:0,params:{label:'Points',data:{type:'FeatureCollection',features:[]},
    fromTable:{x:'lon',y:'lat',id:'id'}}};
  // The study area a Map places its points against: drawn around them, with a margin.
  const area={id:'area',type:'study_area',x:0,y:200,params:{label:'Around the points',source:'drawn',selectionMode:'bbox',
    geometry:{type:'Polygon',coordinates:[[[14.95,-4.85],[16.05,-4.85],[16.05,-3.75],[14.95,-3.75],[14.95,-4.85]]]}}};
  const edges=(out,mapped)=>[{id:'e-t-p',from:tableId,to:'pts',port:'records'},{id:'e-p-o',from:'pts',to:out,port:'points'},
    ...(mapped?[{id:'e-a-o',from:'area',to:out,port:'area'}]:[])];
  const runOutput=async(step,node,drawn)=>{
    await page.evaluate(({nodes,edges})=>{
      const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
      w.nodes=nodes;w.edges=edges;delete w.manifest;
      localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
      const all=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');all.blank=w;
      localStorage.setItem('fieldwork-examples-v1',JSON.stringify(all));},{nodes:[table,points,area,node],edges:edges(node.id,node.type==='map_output')});
    await page.goto('/?example=blank');
    await page.locator('[data-view="workflow"]').click({timeout:LIMIT});
    let ran=false;
    await timed(`${step}: run`,async()=>{
      await page.locator('#run-button').click({timeout:LIMIT});
      await expect(page.locator('#workflow-state')).toContainText(/Run complete|failed|refused|cannot|Not ready/i,{timeout:LIMIT});
      const said=(await page.locator('#workflow-state').innerText()).trim();
      if(!/Run complete/.test(said)){
        const why=await page.locator('.toast, [data-node-error], .node-error, .standard-result-warning').allInnerTexts().catch(()=>[]);
        throw new Error(`${said} ${why.join(' | ')}`.trim());}
      ran=true;return said;});
    if(!ran)return;
    await timed(`${step}: drawn`,async()=>{
      await page.locator('[data-view="results"]').click({timeout:LIMIT});
      await page.locator(`#result-tab-${node.id}`).click({timeout:LIMIT});
      return await drawn();});
    // STILL ANSWERING: a click on the Workflow tab, within 15 s, after the figure is up.
    await timed(`${step}: page answers a click`,async()=>{await page.locator('[data-view="workflow"]').click({timeout:15_000});});
  };
  await runOutput('static map',{id:'map',type:'map_output',x:800,y:0,params:{label:'Static',presentation:'plot'}},async()=>{
    const svg=page.locator('#map-panel svg').first();
    await expect(svg).toBeVisible({timeout:LIMIT});
    return `${await page.locator('#map-panel svg circle, #map-panel svg path').count()} svg shapes`;});
  await runOutput('interactive map',{id:'imap',type:'map_output',x:800,y:0,params:{label:'Interactive',presentation:'interactive'}},async()=>{
    await expect(page.locator('.catchment-leaflet').first()).toBeVisible({timeout:LIMIT});
    const gpu=page.locator('.catchment-leaflet[data-marks-drawn]');
    await expect(gpu.or(page.locator('.catchment-point-mark').first())).toBeVisible({timeout:LIMIT});
    return (await gpu.count())?`large layers drawn as ${await gpu.getAttribute('data-marks-drawn')}`
      :`${await page.locator('.catchment-point-mark').count()} markers`;});
  await runOutput('table of the points',{id:'tab',type:'table_output',x:800,y:0,params:{label:'Records'}},async()=>{
    await expect(page.locator('#table-panel table').first()).toBeVisible({timeout:LIMIT});
    return 'drawn';});

  mkdirSync('test-results',{recursive:true});
  writeFileSync(`test-results/measure-points-${N}.json`,JSON.stringify(results,null,2));
});
