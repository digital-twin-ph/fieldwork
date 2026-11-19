import test from 'node:test';
import assert from 'node:assert/strict';
const {staticMapFrame}=await import('../build/static-map.js');

/** A COUNTRY'S OUTLINE IS MEASURED IN A LOOP (2026-11-19). The practitioner's DR Congo at the first level, 26 provinces and
 *  194,009 vertices, drew a blank map: the frame spread every vertex into Math.min, which throws past about 100,000. */
test('the frame of an outline of 200,000 vertices is measured, not refused',()=>{
  const ring=(n,x,y)=>{const p=Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n;return [x+Math.cos(a),y+Math.sin(a)];});return [...p,p[0]];};
  const coordinates=Array.from({length:25},(_,i)=>[ring(8000,15+(i%5)*3,-10+Math.floor(i/5)*3)]);
  const frame=staticMapFrame({boundary:{type:'MultiPolygon',coordinates},rows:[]});
  assert.equal(frame.polygons.length,25);
  assert.ok(Math.abs(frame.xmin-14)<1e-9&&Math.abs(frame.xmax-28)<1e-9,`${frame.xmin} to ${frame.xmax}`);
  assert.ok(Math.abs(frame.ymin+11)<1e-9&&Math.abs(frame.ymax-3)<1e-9,`${frame.ymin} to ${frame.ymax}`);
});
