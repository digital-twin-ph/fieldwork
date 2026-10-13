import test from 'node:test';
import assert from 'node:assert/strict';
import {utmZoneFor,utmScaleFactor,suggestUTM,workflowPositions} from '../build/utm.js';
import {johnSnowExample} from '../build/john-snow.js';
import {oldNalediWorkflow} from '../build/old-naledi.js';

test('a zone is the 6 degree band the longitude falls in',()=>{
  assert.deepEqual(utmZoneFor([-0.1379,51.5]),{zone:30,hemisphere:'north'});   // Soho
  assert.deepEqual(utmZoneFor([120.98,14.6]),{zone:51,hemisphere:'north'});    // Manila
  assert.deepEqual(utmZoneFor([27.9,-26.2]),{zone:35,hemisphere:'south'});     // Old Naledi's zone
  assert.deepEqual(utmZoneFor([0,0]),{zone:31,hemisphere:'north'});            // the origin
});

test('the zone boundaries fall where UTM puts them',()=>{
  // Zone 31 is 0 to 6 degrees east. Its edges belong to it and to its neighbour respectively.
  assert.equal(utmZoneFor([0,10]).zone,31);
  assert.equal(utmZoneFor([5.999,10]).zone,31);
  assert.equal(utmZoneFor([6,10]).zone,32);
  assert.equal(utmZoneFor([-0.001,10]).zone,30);
});

test('the antimeridian wraps rather than falling off the end',()=>{
  assert.equal(utmZoneFor([180,0]).zone,1);
  assert.equal(utmZoneFor([-180,0]).zone,1);
  assert.equal(utmZoneFor([179.999,0]).zone,60);
  assert.equal(utmZoneFor([-181,0]).zone,60);   // wrapped to +179
});

test('the equator counts as north, and anything below it as south',()=>{
  assert.equal(utmZoneFor([10,0]).hemisphere,'north');
  assert.equal(utmZoneFor([10,-0.0001]).hemisphere,'south');
});

// The figures experiment 100 records, recomputed here so a change to the formula is caught.
test('the scale factor is smallest on the central meridian and grows away from it',()=>{
  const london=[-3,51.5],zone30={zone:30,hemisphere:'north'};
  assert.ok(Math.abs(utmScaleFactor(london,zone30)-0.9996)<1e-6,'on the meridian it is k0');
  const atZoneEdge=utmScaleFactor([0,51.5],zone30);
  const oneZoneOut=utmScaleFactor([3,51.5],zone30);
  assert.ok(atZoneEdge>0.9996&&atZoneEdge<1.0002,`zone edge ${atZoneEdge}`);
  assert.ok(oneZoneOut>1.0015&&oneZoneOut<1.0020,`one zone out at 51.5N is +0.17%, got ${oneZoneOut}`);
  // Nearer the equator a degree of longitude is longer, so the same angular error costs more.
  const tropics=utmScaleFactor([3,15],{zone:30,hemisphere:'north'});
  assert.ok(tropics>1.0045&&tropics<1.0050,`one zone out at 15N is +0.47%, got ${tropics}`);
  assert.ok(tropics>oneZoneOut,'the same zone error costs more nearer the equator');
});

test('a workflow suggests the zone its own data is in',()=>{
  const snow=suggestUTM(johnSnowExample('snow-isochrone'));
  assert.deepEqual(snow.choice,{zone:30,hemisphere:'north'});
  assert.ok(snow.positions>500,`expected the network and the deaths, got ${snow.positions}`);
  const naledi=suggestUTM(oldNalediWorkflow());
  assert.equal(naledi.choice.hemisphere,'south');
  assert.equal(naledi.choice.zone,35);
});

test('a workflow with no coordinates suggests nothing rather than guessing',()=>{
  assert.equal(suggestUTM({schema:'fieldwork/workflow/1',name:'empty',nodes:[],edges:[]}),null);
  assert.deepEqual(workflowPositions({schema:'fieldwork/workflow/1',name:'empty',nodes:[],edges:[]}),[]);
});

test('data spanning two zones says so instead of picking silently',()=>{
  const straddling={schema:'fieldwork/workflow/1',name:'two zones',edges:[],nodes:[{id:'p',type:'point_input',x:0,y:0,
    params:{label:'Across a boundary',data:{type:'FeatureCollection',features:[
      {type:'Feature',id:'a',properties:{name:'west'},geometry:{type:'Point',coordinates:[-1,51]}},
      {type:'Feature',id:'b',properties:{name:'east'},geometry:{type:'Point',coordinates:[1,51]}}]}}}]};
  const suggestion=suggestUTM(straddling);
  assert.deepEqual(suggestion.straddles,[30,31]);
  // The mean longitude is 0, which is zone 31: the side holding the eastern point.
  assert.equal(suggestion.choice.zone,31);
});

test('a drawn study area contributes its ring, not just its points',()=>{
  const drawn={schema:'fieldwork/workflow/1',name:'drawn',edges:[],nodes:[{id:'a',type:'area',x:0,y:0,
    params:{label:'Manila bbox',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[120.9,14.5],[121.1,14.5],[121.1,14.7],[120.9,14.7],[120.9,14.5]]]}}}]};
  assert.equal(workflowPositions(drawn).length,5);
  assert.deepEqual(suggestUTM(drawn).choice,{zone:51,hemisphere:'north'});
});
