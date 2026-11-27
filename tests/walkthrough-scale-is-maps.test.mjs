import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePointsWalkthrough,h3Walkthrough} from '../build/spatial-walkthroughs.js';
import {polygonSvg} from '../build/catchment-output.js';
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

/** SHOW ME HOW ENDS ON THE PICTURE MAP DRAWS (PR 6's review, 2026-11-26). The walkthrough's last step said its scale was
 *  Map's while Map shaded Summarize's polygons by name and every H3 cell one blue. Both now read the step's own output:
 *  here the walkthrough's scale and fills are compared with Map's static figure of the same polygons, its key's
 *  classes and ranges and the fill of each polygon. */
const mapFigure=made=>{
  const svg=polygonSvg(made,escapeHtml);
  const swatches=[...svg.matchAll(/<rect x="[^"]+" y="[^"]+" width="[^"]+" height="10" fill="([^"]+)"/g)].map(m=>m[1]);
  const ranges=[...svg.matchAll(/data-plot-key="range"[^>]*>([^<]+)</g)].map(m=>m[1]);
  const fills=[...svg.matchAll(/<path data-(?:catchment|hex-cell)="[^"]*"[^>]*? fill="([^"]+)"/g)].map(m=>m[1]).sort();
  return {swatches,ranges,fills};
};
const walkFigure=walk=>{
  const figure=walk.steps.at(-1).figure;
  return {title:figure.scale.title,swatches:figure.scale.entries.map(e=>e.color),ranges:figure.scale.entries.map(e=>e.label),
    fills:[...figure.svg.matchAll(/style="fill:([^;]+);/g)].map(m=>m[1]).sort()};
};
for(const [name,walk,title] of [
  ['Summarize, a field named as a file spells it',summarizePointsWalkthrough('include','Confirmed case count'),'Total Confirmed case count'],
  ['Summarize, the default field',summarizePointsWalkthrough('exclude',''),'Total deaths'],
  ['H3 cells',h3Walkthrough(9,2),'Points in the cell']])
  test(`${name}: the walkthrough's scale is Map's, for the same polygons`,()=>{
    const map=mapFigure(walk.made),own=walkFigure(walk);
    assert.ok(map.swatches.length>1,'Map shades by class');
    assert.equal(own.title,title);
    assert.equal(own.title,walk.made.valueName,'titled as Map names the shade');
    assert.deepEqual(own.swatches,map.swatches,'the same classes, in the same colours');
    assert.deepEqual(own.ranges,map.ranges,'each class keyed by the same range');
    assert.deepEqual(own.fills,map.fills,'each polygon filled as Map fills it');
  });
