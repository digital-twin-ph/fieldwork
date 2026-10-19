import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {costsWithin,nearestTargetCost} from '../build/reachable-nodes.js';

const graph=edges=>{
  const a=new Map();
  for(const [from,to,lengthM] of edges){
    for(const [f,t] of [[from,to],[to,from]]){const l=a.get(f)||[];l.push({to:t,lengthM});a.set(f,l);}
  }
  return a;
};

test('the nearest target is found, and the three legs are reported separately',()=>{
  // a -10- b -10- c -10- d
  const a=graph([['a','b',10],['b','c',10],['c','d',10]]);
  const got=nearestTargetCost(a,'a',new Map([['d',0],['c',0]]));
  assert.deepEqual(got,{nodeId:'c',networkM:20,arrivalM:0,totalM:20});
  const withLegs=nearestTargetCost(a,'a',new Map([['c',5]]),Infinity,3);
  assert.equal(withLegs.networkM,23,'the first leg is carried into the network cost, as costsWithin carries it');
  assert.equal(withLegs.arrivalM,5);
  assert.equal(withLegs.totalM,28,'D1 + D2 + D3');
});

// The subtlety that makes this more than "stop at the first target": a nearer node can have a
// longer walk off the network at the far end.
test('a target that settles first can still lose to a further one with a shorter arrival leg',()=>{
  const a=graph([['home','near',100],['near','far',10]]);
  const got=nearestTargetCost(a,'home',new Map([['near',80],['far',5]]));
  assert.equal(got.nodeId,'far','110 + 5 beats 100 + 80');
  assert.equal(got.networkM,110);
  assert.equal(got.arrivalM,5);
  assert.equal(got.totalM,115);
});

test('the budget refuses a target rather than reporting it, and nothing unreachable is invented',()=>{
  const a=graph([['a','b',10],['b','c',10]]);
  assert.equal(nearestTargetCost(a,'a',new Map([['c',0]]),15),null,'beyond the budget is not reached');
  assert.equal(nearestTargetCost(a,'a',new Map([['c',0]]),20).totalM,20,'the budget is inclusive');
  assert.equal(nearestTargetCost(a,'a',new Map([['c',6]]),20),null,'the arrival leg counts against the budget');
  assert.equal(nearestTargetCost(a,'a',new Map()),null,'no targets is no answer');
  assert.equal(nearestTargetCost(graph([['a','b',10]]),'a',new Map([['island',0]])),null,'a disconnected target is not reached');
  assert.deepEqual(nearestTargetCost(a,'a',new Map([['a',0]])),{nodeId:'a',networkM:0,arrivalM:0,totalM:0},'the origin can be its own target');
});

test('it agrees with costsWithin wherever both apply',()=>{
  const a=graph([['a','b',7],['b','c',11],['a','c',30],['c','d',4]]);
  const within=costsWithin(a,'a',1000);
  for(const target of ['b','c','d']){
    const got=nearestTargetCost(a,'a',new Map([[target,0]]));
    assert.equal(got.networkM,within.get(target),`${target} costs the same both ways`);
  }
});

// Experiment 123's numbers, reproduced from the repository's own data through this kernel.
test('the 1854 Soho network gives the recorded off-network legs and network distances',()=>{
  const net=JSON.parse(readFileSync(new URL('../examples/john-snow/network.json',import.meta.url),'utf8'));
  const pts=JSON.parse(readFileSync(new URL('../examples/john-snow/points.json',import.meta.url),'utf8'));
  const nodes=net.nodes.map(n=>[n.id,n.coordinates[0],n.coordinates[1]]);
  const lat0=nodes.reduce((s,n)=>s+n[2],0)/nodes.length;
  const k=Math.cos(lat0*Math.PI/180),M=111320;
  const metres=(ax,ay,bx,by)=>Math.hypot((ax-bx)*k*M,(ay-by)*M);
  const snap=(x,y)=>nodes.reduce((b,[id,nx,ny])=>{const m=metres(x,y,nx,ny);return !b||m<b.m?{id,m}:b;},null);
  const adjacency=new Map();
  for(const e of net.edges){for(const [f,t] of [[e.from,e.to],[e.to,e.from]]){const l=adjacency.get(f)||[];l.push({to:t,lengthM:e.lengthM});adjacency.set(f,l);}}

  const deaths=pts.deaths.filter(f=>f.geometry);
  const D1=deaths.map(f=>snap(...f.geometry.coordinates).m).sort((a,b)=>a-b);
  const pumpSnaps=pts.pumps.map(f=>({name:f.properties.name,...snap(...f.geometry.coordinates)}));
  const D3=pumpSnaps.map(p=>p.m).sort((a,b)=>a-b);
  const median=v=>v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;
  assert.ok(Math.abs(median(D1)-13.5)<0.5,`D1 median ${median(D1).toFixed(1)} m, recorded 13.5`);
  assert.ok(Math.abs(median(D3)-11.4)<0.5,`D3 median ${median(D3).toFixed(1)} m, recorded 11.4`);
  assert.equal(D1.filter(m=>m>150).length,0,'no house exceeds the 150 m snap default');

  // Every death location reaches a pump through the network, and the total exceeds the network leg
  // by both off-network legs.
  const targets=new Map(pumpSnaps.map(p=>[p.id,p.m]));
  let reached=0,worse=0;
  for(const f of deaths){
    const origin=snap(...f.geometry.coordinates);
    const got=nearestTargetCost(adjacency,origin.id,targets,Infinity,origin.m);
    if(!got)continue;
    reached++;
    assert.ok(got.totalM>=got.networkM,'the arrival leg never shortens the total');
    assert.ok(got.networkM>=origin.m,'the first leg is inside the network cost');
    const straight=Math.min(...pts.pumps.map(p=>metres(...f.geometry.coordinates,...p.geometry.coordinates)));
    if(got.totalM>straight)worse++;
  }
  assert.equal(reached,250,'all 250 death locations reach a pump through the Soho network');
  assert.equal(worse,250,'walking a street network is never shorter than the straight line');
});
