import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {dateRange,bboxOf,searchCatalog,searchSentence,searchFacts,MAX_ITEMS} from '../build/satellite-catalog.js';
import {productFor} from '../build/satellite-products.js';

/** SEARCH A SATELLITE CATALOG (experiment 179): JLT's search, ported; the chosen product kept; metadata only. */

const NYC=[-74.26,40.49,-73.70,40.92];
const item=(id,type,dt='2023-06-07T17:23:49Z')=>({type:'Feature',id,bbox:[-80,35,-65,45],
  properties:{datetime:dt,platform:'Sentinel-5P','s5p:product_type':type},
  assets:{no2:{href:`https://sentinel5euwest.blob.core.windows.net/x/${id}.nc`,type:'application/x-netcdf',roles:['data']}}});
const stub=pages=>{const calls=[];return {calls,fetch:async url=>{calls.push(url);const page=pages[calls.length-1];
  if(page instanceof Error)throw page;
  return {ok:page.status?false:true,status:page.status??200,json:async()=>page};}};};

test('JLT\'s date rules, ported: real dates, start not after end, an open end allowed',()=>{
  assert.equal(dateRange('2023-06-01','2023-06-14'),'2023-06-01T00:00:00Z/2023-06-14T23:59:59.999999Z');
  assert.equal(dateRange('2023-06-01',''),'2023-06-01T00:00:00Z/..');
  assert.throws(()=>dateRange('2023-02-30',''),/real calendar dates/);
  assert.throws(()=>dateRange('2023-06-14','2023-06-01'),/before or equal/);
});

test('the study area\'s extent, from its geometry',()=>{
  assert.deepEqual(bboxOf({type:'MultiPolygon',coordinates:[[[[-74.26,40.49],[-73.70,40.49],[-73.70,40.92],[-74.26,40.92]]]]}),NYC);
  assert.equal(bboxOf(undefined),null);
});

test('a search reads the collection\'s items over the box and dates, pages, and keeps only the chosen product',async()=>{
  const {calls,fetch}=stub([
    {type:'FeatureCollection',features:[item('a','L2__NO2___'),item('b','L2__O3____')],links:[{rel:'next',href:'https://pc/next'}]},
    {type:'FeatureCollection',features:[item('c','L2__NO2___')],links:[]}]);
  const product=productFor('no2','pc-s5p-no2');
  const s=await searchCatalog(product,NYC,'2023-06-07','2023-06-07',fetch);
  assert.match(calls[0],/\/collections\/sentinel-5p-l2-netcdf\/items\?bbox=-74\.26%2C40\.49%2C-73\.7%2C40\.92&datetime=2023-06-07T00%3A00%3A00Z%2F2023-06-07T23%3A59%3A59\.999999Z&limit=100$/);
  assert.equal(calls[1],'https://pc/next');
  assert.equal(s.returned,3);
  assert.deepEqual(s.items.map(i=>i.id),['a','c']);
  assert.equal(s.items[0].files[0].host,'sentinel5euwest.blob.core.windows.net');
  assert.equal(s.truncated,false);
  assert.match(searchSentence(s,product),/^2 L2__NO2___ items in sentinel-5p-l2-netcdf over the study area from 2023-06-07 to 2023-06-07, of 3 the catalog returned for the area and dates\. Metadata only/);
});

test('a search stops at JLT\'s bound and says so; it needs dates; failures say which',async()=>{
  const many=Array.from({length:100},(_,i)=>item(`i${i}`,'L2__NO2___'));
  const pages=Array.from({length:6},()=>({type:'FeatureCollection',features:many,links:[{rel:'next',href:'https://pc/next'}]}));
  const product=productFor('no2','pc-s5p-no2');
  const s=await searchCatalog(product,NYC,'2023-01-01','2023-12-31',stub(pages).fetch);
  assert.equal(s.returned,MAX_ITEMS);assert.equal(s.truncated,true);
  assert.match(searchSentence(s,product),/stopped at 500 items/);
  await assert.rejects(searchCatalog(product,NYC,'','',stub([]).fetch),/Choose the dates/);
  await assert.rejects(searchCatalog(product,NYC,'2023-06-07','2023-06-07',stub([{status:503}]).fetch),/HTTP 503 from provider/);
  await assert.rejects(searchCatalog(product,NYC,'2023-06-07','2023-06-07',stub([new TypeError('x')]).fetch),/provider CORS support/);
});

test('the receipt states the search and that completeness was not read, and conforms',async()=>{
  const {fetch}=stub([{type:'FeatureCollection',features:[item('a','L2__NO2___')],links:[]}]);
  const s=await searchCatalog(productFor('no2','pc-s5p-no2'),NYC,'2023-06-07','2023-06-07',fetch);
  const facts=searchFacts('<urn:fieldwork:run:r:output:s>',s,1);
  const conforms=async f=>(await validateGraph(new Store(new Parser().parse(f)))).conforms;
  assert.equal(await conforms(facts),true);
  // A search never claims completeness it did not read.
  assert.equal(await conforms(facts.replace('fw:completenessRead false','fw:completenessRead true')),false);
});
