import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDrawnBars,LENGTH_TOLERANCE} from '../build/figure-check.js';

/** EXPERIMENT 156, built after the ordering option and the 1849/1854 figure because those two
 *  produced the first figures worth validating.
 *
 *  Every defect in the chart thread was found by LOOKING. These are the same observations written
 *  down so a machine can make them. The cases below are the real figures, with the real numbers. */

const southLondon=()=>({field:'value',measure:'value',unit:'',total:3,barOrder:'smallest',
  bins:[{key:'sv',label:'Southwark and Vauxhall Company',count:1.0871},
        {key:'both',label:'Lambeth Company and Southwark and Vauxhall',count:0.6522},
        {key:'lam',label:'Lambeth Company only',count:0.2284}]});
// Drawn smallest-first and in proportion: 0.2284, 0.6522, 1.0871, computed from Table XII.
const drawnWell=()=>[{label:'Lambeth Company only',length:0.2284/1.0871*300},
  {label:'Lambeth Company and Southwark and Vauxhall',length:0.6522/1.0871*300},
  {label:'Southwark and Vauxhall Company',length:300}];

test('a figure that agrees with itself reports nothing',()=>{
  assert.deepEqual(checkDrawnBars(southLondon(),drawnWell()),[]);
});

test('THE DEFECT OF 2026-10-31: asked for smallest, drew largest-first',()=>{
  // The real one, found by looking at the Results tab. `orderBins` ran in `chartMarkup` and the
  // Vega renderer never called it, so this figure drew its bars in arrival order. Every unit and
  // browser test passed. This check names the fault and prints both orders.
  const faults=checkDrawnBars(southLondon(),[...drawnWell()].reverse());
  assert.equal(faults.length,1);
  assert.equal(faults[0].check,'order');
  assert.match(faults[0].detail,/asks for smallest/);
  assert.match(faults[0].detail,/Drawn: Southwark and Vauxhall Company/);
});

test('a bar that is not its value is reported, with the bar named and the gap measured',()=>{
  const drawn=drawnWell();
  drawn[0].length*=1.6;                                   // Lambeth drawn far too long
  const faults=checkDrawnBars(southLondon(),drawn);
  assert.equal(faults.length,1);
  assert.equal(faults[0].check,'length');
  assert.match(faults[0].detail,/^Lambeth Company only holds 0\.2284/);
});

test('rounding is not a defect, and the tolerance is stated rather than guessed',()=>{
  const drawn=drawnWell();
  drawn[1].length*=1+LENGTH_TOLERANCE*0.9;
  assert.deepEqual(checkDrawnBars(southLondon(),drawn),[]);
  drawn[1].length*=1+LENGTH_TOLERANCE*1.5;
  assert.equal(checkDrawnBars(southLondon(),drawn).length,1);
});

test('A CATEGORY WITH A VALUE AND NO BAR, which is how a reader reads a smaller world',()=>{
  const faults=checkDrawnBars(southLondon(),drawnWell().slice(1));
  assert.equal(faults.length,1);
  assert.equal(faults[0].check,'coverage');
  assert.match(faults[0].detail,/1 of 3 categories have a value and no bar: Lambeth Company only/);
  // And the order check stays QUIET while coverage is wrong, because an order over the wrong set
  // is a second complaint about one fault and buries the one that matters.
  assert.ok(!faults.some(f=>f.check==='order'));
});

test('a bar from nowhere is reported as its own kind of fault',()=>{
  const faults=checkDrawnBars(southLondon(),[...drawnWell(),{label:'Dulwich',length:40}]);
  assert.equal(faults.length,1);
  assert.match(faults[0].detail,/does not hold: Dulwich/);
});

test('a diverging figure is measured from its own baseline, not from zero length',()=>{
  // Negative bars arrived the same week. Measuring against the longest bar alone would call every
  // negative one wrong, so the range runs from the low point -- which is what the renderer does.
  const chart={field:'v',measure:'v',unit:'',total:3,barOrder:'category',
    bins:[{key:'a',label:'Fell',count:-12},{key:'b',label:'Flat',count:0},
          {key:'c',label:'Rose',count:36}]};
  const span=36-(-12),scale=200;
  assert.deepEqual(checkDrawnBars(chart,[
    {label:'Fell',length:0},{label:'Flat',length:12/span*scale},{label:'Rose',length:scale}]),[]);
});

test('every bin equal: a flat figure is not an occasion to report anything',()=>{
  const chart={field:'v',measure:'v',unit:'',total:2,
    bins:[{key:'a',label:'A',count:7},{key:'b',label:'B',count:7}]};
  assert.deepEqual(checkDrawnBars(chart,[{label:'A',length:120},{label:'B',length:120}]),[]);
});

test('A TRUNCATED AXIS LABEL IS STILL ITS CATEGORY, or the check fails loudest where it matters',()=>{
  // Vega writes "Southwark and Vauxhall Comp…" when the column is narrower than the name. Read
  // literally, every long label would be reported as a category the figure does not hold -- so
  // the check would be noisiest on exactly the figures it was built to watch.
  const drawn=drawnWell().map(bar=>({...bar,label:bar.label.slice(0,26)+'…'}));
  assert.deepEqual(checkDrawnBars(southLondon(),drawn),[]);
  // An ellipsis is still read as text when it ends a name that is genuinely absent.
  const faults=checkDrawnBars(southLondon(),[...drawn,{label:'Kennington wat…',length:10}]);
  assert.equal(faults[0].check,'coverage');
});

test('a truncation that could be two categories is reported, not guessed',()=>{
  // "Lambeth Company…" matches both of South London's Lambeth rows. Picking one would make the
  // checker assert something a reader of the figure cannot: which company this bar is.
  const chart=southLondon();
  const drawn=[{label:'Lambeth Company…',length:60},
    {label:'Lambeth Company and Southwark and Vauxhall',length:178},
    {label:'Southwark and Vauxhall Company',length:300}];
  const faults=checkDrawnBars(chart,drawn);
  assert.ok(faults.some(f=>f.check==='coverage'&&/Lambeth Company…/.test(f.detail)),
    `an ambiguous truncation was resolved silently: ${JSON.stringify(faults)}`);
});
