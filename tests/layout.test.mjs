import test from 'node:test';
import assert from 'node:assert/strict';
import {tidyLayout,depths,alreadyTidy,COLUMN_WIDTH,ROW_HEIGHT,ORIGIN} from '../build/layout.js';

const graph=(nodes,edges)=>({schema:'fieldwork/workflow/1',
  nodes:nodes.map(([id,x=0,y=0])=>({id,type:'observations',x,y,params:{label:id}})),
  edges:edges.map(([from,to],i)=>({id:`e${i}`,from,to,port:'points'}))});

test('a node never sits left of something that feeds it',()=>{
  // Longest path, not shortest: d is fed by c, so it must be right of c even though a
  // reaches it directly as well.
  const d=depths(graph([['a'],['b'],['c'],['dd']],[['a','b'],['b','c'],['c','dd'],['a','dd']]));
  assert.equal(d.get('a'),0);assert.equal(d.get('b'),1);
  assert.equal(d.get('c'),2);assert.equal(d.get('dd'),3,'not 1, which the short path would give');
});

test('columns are the order of work and rows keep the arrangement already made',()=>{
  const w=graph([['a',0,500],['b',0,100],['out',0,0]],[['a','out'],['b','out']]);
  const at=tidyLayout(w);
  assert.equal(at.get('b').x,ORIGIN.x,'both sources share the first column');
  assert.equal(at.get('a').x,ORIGIN.x);
  assert.equal(at.get('out').x,ORIGIN.x+COLUMN_WIDTH);
  assert.equal(at.get('b').y,ORIGIN.y,'b was above a and stays above it');
  assert.equal(at.get('a').y,ORIGIN.y+ROW_HEIGHT);
});

test('a tidy canvas reports that it is already tidy',()=>{
  const w=graph([['a'],['b']],[['a','b']]);
  assert.equal(alreadyTidy(w),false);
  for(const node of w.nodes)Object.assign(node,tidyLayout(w).get(node.id));
  assert.equal(alreadyTidy(w),true);
});

test('every node is placed, including ones nothing connects',()=>{
  const w=graph([['a'],['lonely'],['b']],[['a','b']]);
  const at=tidyLayout(w);
  assert.equal(at.size,3);
  assert.equal(at.get('lonely').x,ORIGIN.x,'an unconnected node is a source');
});

test('a malformed cyclic graph is laid out rather than looping forever',()=>{
  // validateWorkflow rejects cycles, so this cannot arrive from the application; the guard
  // exists so that a hand-edited file cannot hang the canvas.
  const w=graph([['a'],['b']],[['a','b'],['b','a']]);
  const at=tidyLayout(w);
  assert.equal(at.size,2);
});
