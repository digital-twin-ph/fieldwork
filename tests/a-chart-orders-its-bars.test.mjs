import test from 'node:test';
import assert from 'node:assert/strict';
import {orderBins,orderableBins,BAR_ORDERS,chartMarkup} from '../build/chart-output.js';

/** A BAR CHART THAT CAN ORDER ITS BARS.
 *
 *  The practitioner, 2026-10-31: *"there should be an option in the widget to display a bar chart
 *  where the bars are ordered from largest to smallest or reverse or category name-ordered
 *  (current display)."* The argument was already on the canvas — South London's chart node is
 *  labelled **"Deaths per 1,000 people, ranked"** and drew them alphabetically, so the label
 *  claimed a capability that did not exist. */

const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const bins=()=>[{key:'a',label:'Battersea',count:5.114},
  {key:'b',label:'Brixton',count:0.616},
  {key:'c',label:'Camberwell',count:5.411},
  {key:'d',label:'Dulwich',count:0}];
const chart=(over={})=>({field:'value',caption:'deaths per 1,000 people',total:1514,
  measure:'value',unit:'per 1,000 people',bins:bins(),...over});

test('the three orders, and category is what it has always done',()=>{
  assert.deepEqual([...BAR_ORDERS],['category','largest','smallest']);
  assert.deepEqual(orderBins(bins(),'category').map(b=>b.label),
    ['Battersea','Brixton','Camberwell','Dulwich']);
  assert.deepEqual(orderBins(bins(),'largest').map(b=>b.label),
    ['Camberwell','Battersea','Brixton','Dulwich']);
  assert.deepEqual(orderBins(bins(),'smallest').map(b=>b.label),
    ['Dulwich','Brixton','Battersea','Camberwell']);
  // An unset order is the order it arrived in, so every saved workflow draws what it drew.
  assert.deepEqual(orderBins(bins(),undefined).map(b=>b.label),
    bins().map(b=>b.label));
});

test('A SEQUENCE IS NEVER RE-ORDERED, whatever is asked for',()=>{
  // A bin carrying `order` means its place is the point: an epidemic curve's days, a travel-time
  // band's thresholds. Sorting those by size destroys the one thing the figure shows.
  const days=[{key:'1',label:'21 Nov',count:3,order:1},
    {key:'2',label:'22 Nov',count:17,order:2},
    {key:'3',label:'23 Nov',count:9,order:3}];
  assert.equal(orderableBins(days),false);
  for(const order of BAR_ORDERS)
    assert.deepEqual(orderBins(days,order).map(b=>b.label),['21 Nov','22 Nov','23 Nov'],
      `${order} re-ordered a sequence`);
  // And bins with no `order` are orderable, which is what lets the control be offered at all.
  assert.equal(orderableBins(bins()),true);
});

test('it never mutates the bins it was given',()=>{
  // `chart.bins` is carried on a run's value. A renderer that sorted in place would re-order the
  // chart every other surface draws from the same object.
  const original=bins();
  const copy=original.map(b=>({...b}));
  orderBins(original,'largest');
  assert.deepEqual(original,copy);
});

test('ties keep the order they arrived in, so two runs draw the same figure',()=>{
  const tied=[{key:'a',label:'First',count:2},{key:'b',label:'Second',count:2},
    {key:'c',label:'Third',count:9}];
  assert.deepEqual(orderBins(tied,'largest').map(b=>b.label),['Third','First','Second']);
  assert.deepEqual(orderBins(tied,'smallest').map(b=>b.label),['First','Second','Third']);
});

test('THE DRAWN ORDER IS THE STATED ORDER, which is what the figure is read from',()=>{
  // Experiment 156's first assertion, made here for the one chart that can be checked without it.
  const drawn=order=>[...chartMarkup(chart({barOrder:order}),esc).matchAll(/<span>([^<]+)<\/span>/g)]
    .map(m=>m[1]);
  assert.deepEqual(drawn('largest'),['Camberwell','Battersea','Brixton','Dulwich']);
  assert.deepEqual(drawn('smallest'),['Dulwich','Brixton','Battersea','Camberwell']);
  assert.deepEqual(drawn('category'),['Battersea','Brixton','Camberwell','Dulwich']);
});

test('ordering changes nothing about the numbers or the bar lengths',()=>{
  // The bug this feature could plausibly introduce: a bar re-ordered away from its value.
  const widths=markup=>[...markup.matchAll(/<span>([^<]+)<\/span><div class="bar-track"[^>]*><div style="width:([0-9.]+)%/g)]
    .map(m=>[m[1],Number(m[2]).toFixed(4)]);
  const byCategory=new Map(widths(chartMarkup(chart({barOrder:'category'}),esc)));
  const byLargest=new Map(widths(chartMarkup(chart({barOrder:'largest'}),esc)));
  assert.deepEqual([...byLargest.keys()].sort(),[...byCategory.keys()].sort());
  for(const [label,width] of byCategory)
    assert.equal(byLargest.get(label),width,`${label} changed width when the order changed`);
});

test('the vertical renderer orders too, so one orientation is not a different figure',()=>{
  const labels=[...chartMarkup(chart({barOrder:'largest'}),esc,'vertical')
    .matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]);
  assert.deepEqual(labels,['Camberwell','Battersea','Brixton','Dulwich']);
});
