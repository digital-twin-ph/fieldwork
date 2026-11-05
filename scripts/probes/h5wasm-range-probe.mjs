// Experiment 179, side experiment S6: can h5wasm, in a browser worker, read NYC's NO2 from a Sentinel-5P swath by range?
// Chromium via Playwright; every request to the storage counted; aborted past 20 MB. No Fieldwork code involved.
import {chromium} from '/Users/hermantolentino/workspace/digitaltwin-ph/fieldwork/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';

const CAP=20_000_000;
const [href,token]=process.argv.slice(2);
const IIFE=readFileSync(new URL('./node_modules/h5wasm/dist/iife/h5wasm.js',import.meta.url));
const WORKER=`
importScripts('/h5wasm.js');
onmessage=async e=>{
  try{
    const {FS}=await h5wasm.ready;
    FS.createLazyFile('/', 'f.nc', e.data.url, true, false);
    const t0=performance.now();
    const f=new h5wasm.File('/f.nc','r');
    postMessage({step:'opened'});
    const lat=f.get('PRODUCT/latitude'),lon=f.get('PRODUCT/longitude');
    const [_,rows,cols]=lat.shape;
    const la=lat.value,lo=lon.value;
    postMessage({step:'latitude and longitude',shape:lat.shape});
    const [W,S,E,N]=e.data.box;let r0=Infinity,r1=-1;const inside=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;
      if(lo[i]>=W&&lo[i]<=E&&la[i]>=S&&la[i]<=N){inside.push([r,c]);r0=Math.min(r0,r);r1=Math.max(r1,r);}}
    const no2=f.get('PRODUCT/nitrogendioxide_tropospheric_column').slice([[0,1],[r0,r1+1],[0,cols]]);
    const qa=f.get('PRODUCT/qa_value').slice([[0,1],[r0,r1+1],[0,cols]]);
    const units=f.get('PRODUCT/nitrogendioxide_tropospheric_column').attrs['units']?.value;
    const rawScale=f.get('PRODUCT/qa_value').attrs['scale_factor']?.value;const scale=Number(Array.isArray(rawScale)||ArrayBuffer.isView(rawScale)?rawScale[0]:rawScale);
    let n=0,good=0,sum=0;
    for(const [r,c] of inside){const i=(r-r0)*cols+c;n++;const q=qa[i]*(Number.isFinite(scale)?scale:1);
      if(q>=0.75&&no2[i]<9e36){good++;sum+=no2[i];}}
    postMessage({done:true,scale,pixels:n,good,mean:good?sum/good:null,units,rows:[r0,r1],ms:Math.round(performance.now()-t0)});
  }catch(err){postMessage({error:String(err&&err.message||err)});}
};`;

const browser=await chromium.launch();
const context=await browser.newContext();
let requests=0,bytes=0,aborted=false;const sizes=[];
await context.route('http://h5.test/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/h5wasm.js')return route.fulfill({body:IIFE,contentType:'text/javascript'});
  if(path==='/worker.js')return route.fulfill({body:WORKER,contentType:'text/javascript'});
  return route.fulfill({body:'<!doctype html><title>probe</title>',contentType:'text/html'});
});
await context.route(/blob\.core\.windows\.net/,async route=>{
  if(aborted)return route.abort();
  const response=await route.fetch({timeout:180000});
  const body=await response.body();
  requests++;bytes+=body.length;sizes.push([route.request().method(),route.request().headers()['range']??'none',body.length]);
  if(bytes>CAP){aborted=true;console.log(`STOP: over the ${CAP/1e6} MB cap after ${requests} requests`);return route.abort();}
  return route.fulfill({response,body});
});
const page=await context.newPage();
await page.goto('http://h5.test/');
const result=await page.evaluate(({url})=>new Promise(resolve=>{
  const w=new Worker('/worker.js');const steps=[];
  w.onmessage=e=>{if(e.data.done||e.data.error)resolve({...e.data,steps});else steps.push(e.data);};
  w.postMessage({url,box:[-74.26,40.49,-73.70,40.92]});
}),{url:`${href}?${token}`});
console.log(JSON.stringify(result));
console.log(`requests ${requests}, bytes ${(bytes/1e6).toFixed(2)} MB`);
console.log('first requests:',JSON.stringify(sizes.slice(0,6)));
await browser.close();
