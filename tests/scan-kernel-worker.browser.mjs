import {test,expect} from './fixtures.mjs';

/** THE SCAN'S TEST RUNS IN THE KERNEL, IN ITS WORKER, IN THE BROWSER (TODO 17, step 3). Found 2026-11-14: the workers'
 *  build could not take the kernel's loader and stopped, and tests that only ran the example passed on workers left from
 *  the previous build. So this asks the worker itself, and reads which engine answered. */
test('a scan posted to its worker is computed by the kernel',async({page})=>{
  await page.goto('/?example=blank');
  const out=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const worker=new Worker('./build/space-time-scan-worker.js');
    let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
    const points={type:'FeatureCollection',features:Array.from({length:80},(_,i)=>({type:'Feature',id:`c${i}`,
      geometry:{type:'Point',coordinates:[10+Math.floor(rnd()*8)*0.01,50+Math.floor(rnd()*6)*0.01]},
      properties:{d:new Date(Date.UTC(2024,0,1+Math.floor(rnd()*40))).toISOString().slice(0,10)}}))};
    worker.onmessage=({data})=>{if(data.alive||data.progress)return;worker.terminate();data.result?resolve(data.result):reject(new Error(data.error));};
    worker.postMessage({points,settings:{dateField:'d',unit:'day',maxCaseShare:0.5,maxTimeShare:0.5,replications:99,seed:42,report:1}});
  }));
  expect(out.engine).toBe('kernel');
  expect(out.clusters[0].pValue).toBeGreaterThan(0);
});
