import test from 'node:test';
import assert from 'node:assert/strict';
import {polygonSvg,rampLayout,keyBand,KEY_BAND} from '../build/catchment-output.js';

/** THE CLASS RANGES NEVER TOUCH, AND NEVER RUN PAST THE MAP (the practitioner, 2026-11-21, on Nigeria's 774 LGAs in five
 *  quantiles: "The numbers are overlapping"; then "widening might make the quantile class become wider than the map
 *  itself?"). A class is as wide as its longest range, the ramp no wider than the 790 px the map is drawn in; where the
 *  ranges do not fit across, each is said on two lines and the band is one line taller. */
const square=i=>({type:'Polygon',coordinates:[[[i%30,Math.floor(i/30)],[i%30+1,Math.floor(i/30)],[i%30+1,Math.floor(i/30)+1],[i%30,Math.floor(i/30)+1],[i%30,Math.floor(i/30)]]]});
const layer=values=>({kind:'polygons',sites:[],valueName:'value, persons',features:values.map((value,i)=>({id:`p${i}`,name:`p${i}`,value,geometry:square(i)}))});
const ranges=svg=>[...svg.matchAll(/<text data-plot-key="range" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)</g)].map(m=>({x:+m[1],y:+m[2],text:m[3]}));

for(const [what,values,lines] of [
  ['short ranges, one line',Array.from({length:40},(_,i)=>i*3),1],
  ["Nigeria's LGAs, seven figures, two lines",Array.from({length:774},(_,i)=>31641+Math.round((i/773)**3*1287930)),2],
  ['ten-figure counts, two lines',Array.from({length:50},(_,i)=>1e9+i*37e6),2]]){
  test(`${what}: no two ranges touch, and the ramp stays within the map`,()=>{
    const p=layer(values),layout=rampLayout(p.features),svg=polygonSvg(p,String),said=ranges(svg);
    assert.equal(Math.max(...layout.lines.map(l=>l.length)),lines);
    assert.ok(layout.width*layout.lines.length<=790,`${layout.width} × ${layout.lines.length}`);
    for(const a of said){
      assert.ok(a.x-a.text.length*4>=0&&a.x+a.text.length*4<=850,`"${a.text}" runs past the frame`);
      for(const b of said)if(a!==b&&a.y===b.y)assert.ok(Math.abs(a.x-b.x)>=(a.text.length+b.text.length)*4,`"${a.text}" touches "${b.text}"`);}
    assert.equal(keyBand(p.features),KEY_BAND+(lines>1?16:0));
  });
}
