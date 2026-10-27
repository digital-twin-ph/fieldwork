/** WHICH BASEMAPS EACH MAP TYPE CAN DRAW, and the attribution that hung on getting it wrong.
 *
 *  The practitioner, 2026-10-27: *"On the Map output Inspector, if I change the map type to
 *  static, it should show only which basemaps are available for that type. Same for
 *  interactive."* It offered all six to both.
 *
 *  Underneath that was a worse thing. A static figure BAKES raster tiles -- `drawStaticBasemap`
 *  fetches them once and inlines them -- and `mapPresentation` reported the basemap as `none`
 *  for every static figure anyway. So the N3 asserted no basemap layer, the exported figure
 *  carried no credit, and the conformance rule reported `inapplicable` saying "This figure drew
 *  no basemap, so no tile provider has to be credited" over a figure full of OpenStreetMap.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {BASEMAP_CHOICES,VECTOR_BASEMAP_CHOICES,basemapsFor,basemapAvailable,
  isVectorBasemapChoice,basemapOptions,BASEMAP_LABELS} from '../build/basemaps.js';

test('a static figure is offered the raster basemaps and no vector style',()=>{
  // Natural Earth is here too when the breadth allows it; the vector styles never are.
  assert.deepEqual([...basemapsFor('plot',1000)],['none','osm','topo','natural-earth-110m']);
  assert.deepEqual([...basemapsFor('plot',1)],['none','osm','topo']);
  assert.ok(basemapAvailable('osm','plot'));
  assert.ok(basemapAvailable('none','plot'));
  for(const choice of VECTOR_BASEMAP_CHOICES)
    assert.ok(!basemapAvailable(choice,'plot'),`${choice} cannot be baked into an SVG`);
});

test('an interactive map is offered every live choice',()=>{
  // Every choice it can actually draw: all the tile basemaps, raster and vector. Natural Earth
  // is bundled FOR A STATIC FIGURE -- an interactive map reaches live tiles and has no use for a
  // 1:110m outline, so it is the one choice this list does not carry.
  assert.deepEqual([...basemapsFor('interactive')],
    BASEMAP_CHOICES.filter(c=>c!=='natural-earth-110m'));
  for(const choice of BASEMAP_CHOICES)
    assert.equal(basemapAvailable(choice,'interactive'),choice!=='natural-earth-110m');
});

// ONE LIST, which is the point. The Inspector once carried its own copy and drifted from the
// map's toolbar; a second copy of the FORMAT question would have been the same defect again. So
// the invariants are checked against the single vocabulary rather than between two copies of it.
test('every choice is classified, labelled and offered somewhere',()=>{
  for(const choice of BASEMAP_CHOICES){
    assert.equal(typeof isVectorBasemapChoice(choice),'boolean');
    assert.ok(BASEMAP_LABELS[choice]?.trim(),`${choice} has no label`);
    assert.ok(basemapAvailable(choice,'interactive')||basemapAvailable(choice,'plot',1000),
      `${choice} is offered to no map type at any breadth`);
  }
  // `none` is not a vector style, and is available everywhere: it is what works offline.
  assert.ok(!isVectorBasemapChoice('none'));
  assert.ok(basemapAvailable('none','plot')&&basemapAvailable('none','interactive'));
  // The vector list is a subset of the choices, so a typo there cannot silently exclude nothing.
  for(const choice of VECTOR_BASEMAP_CHOICES)
    assert.ok(BASEMAP_CHOICES.includes(choice),`${choice} is not a basemap choice`);
});

test('the options markup offers only what the presentation can draw',()=>{
  const plot=basemapOptions('none','plot');
  for(const choice of VECTOR_BASEMAP_CHOICES)
    assert.ok(!plot.includes(`value="${choice}"`),`${choice} is offered to a static figure`);
  assert.ok(plot.includes('value="osm"'));
  const live=basemapOptions('none','interactive');
  for(const choice of BASEMAP_CHOICES)
    assert.equal(live.includes(`value="${choice}"`),choice!=='natural-earth-110m');
  // Called without a presentation it still offers everything, which is what the map's own
  // toolbar wants: that control only exists on an interactive map.
  const all=basemapOptions('none');
  for(const choice of BASEMAP_CHOICES)assert.ok(all.includes(`value="${choice}"`));
});

test('the selected choice is marked, and an absent one falls back to none',()=>{
  assert.match(basemapOptions('topo','plot'),/value="topo" selected/);
  assert.match(basemapOptions(undefined,'plot'),/value="none" selected/);
});

// THE ATTRIBUTION THE COERCION WAS COSTING. `mapPresentation` reported `none` for every static
// figure, so the figure said it had no basemap while `drawStaticBasemap` baked OpenStreetMap
// tiles into it, and three things downstream believed the spec: the N3 asserted no basemap
// layer, the exported figure omitted the credit, and BasemapIsCredited reported `inapplicable`
// with the words "This figure drew no basemap, so no tile provider has to be credited".
import {mapPresentation} from '../build/map-communication.js';
import {mapOutput} from '../build/map-output.js';
import {clipExercise} from '../build/clip-points.js';

const figure=(params)=>{
  const workflow=clipExercise();workflow.nodes=workflow.nodes.slice(0,2);
  const node={id:'map',type:'map_output',x:0,y:0,
    params:{label:'Result tab',showLegend:true,...params}};
  workflow.nodes.push(node);
  workflow.edges=[{id:'a',from:'scope',to:'map',port:'area'},
    {id:'b',from:'observations',to:'map',port:'points'}];
  const boundary=workflow.nodes[0].params.geometry,points=workflow.nodes[1].params.data;
  const mapped=mapOutput(node,{area:{boundary,areaId:'urn:fieldwork:area:scope',
    geometryId:'urn:fieldwork:geometry:scope',label:'Old Naledi'},
    points:{sourceNodeId:'observations',label:'Records',features:points.features}},'run');
  return mapPresentation(node,{...mapped.value,nodeId:'map',label:'Result tab',view:'map'},workflow);
};

test('a static figure records the raster basemap it bakes, and credits it',()=>{
  const spec=figure({presentation:'plot',basemap:'osm'});
  assert.equal(spec.presentation,'plot');
  assert.equal(spec.basemap,'osm','a static figure bakes OSM tiles and must say so');
  assert.match(spec.attribution,/OpenStreetMap/);
  assert.match(spec.attribution,/ODbL/);
});

test('OpenTopoMap is credited for its style as well as its data',()=>{
  const spec=figure({presentation:'plot',basemap:'topo'});
  assert.equal(spec.basemap,'topo');
  assert.match(spec.attribution,/OpenTopoMap/);
  assert.match(spec.attribution,/OpenStreetMap/);
});

test('a vector style on a static figure stays none, because it genuinely is not drawn',()=>{
  for(const choice of VECTOR_BASEMAP_CHOICES){
    const spec=figure({presentation:'plot',basemap:choice});
    assert.equal(spec.basemap,'none',`${choice} cannot be baked, so the figure claims no basemap`);
    assert.ok(!/OpenFreeMap/.test(spec.attribution));
  }
});

test('an interactive map keeps whatever it was given',()=>{
  for(const choice of BASEMAP_CHOICES){
    const spec=figure({presentation:'interactive',basemap:choice});
    // `presentation` also depends on the output carrying polygons; what matters here is that the
    // basemap is never silently dropped for a map type that can draw it.
    if(spec.presentation==='interactive')assert.equal(spec.basemap,choice);
  }
});

// THE BREADTH OF THE STUDY AREA DECIDES WHICH BASEMAPS MAKE SENSE.
//
// The practitioner, 2026-10-27: "The breadth of the study area should dictate the type of
// basemap used", then precisely: "NE should not appear as an option below city or province
// level."
//
// The cut is measured, not picked. Natural Earth 1:110m is generalised to about two kilometres
// -- experiment 52 calls it "displaced by kilometres" -- and against a study area's own breadth
// that is 0.2% of southern Africa, 4% of Greater London and 200% of Soho. Fifty kilometres is
// where the displacement falls under about a twentieth of what is drawn.
import {NATURAL_EARTH_MIN_SPAN_KM,extentSpanKm} from '../build/basemaps.js';

test('Natural Earth is withheld below city scale and offered above it',()=>{
  // Soho, about a kilometre across: the outline would be wrong by twice the figure.
  assert.ok(!basemapAvailable('natural-earth-110m','plot',1));
  // The South London example, about twelve kilometres: still wrong, by a sixth.
  assert.ok(!basemapAvailable('natural-earth-110m','plot',12));
  // Greater London and anything broader.
  assert.ok(basemapAvailable('natural-earth-110m','plot',50));
  assert.ok(basemapAvailable('natural-earth-110m','plot',1000));
  assert.equal(NATURAL_EARTH_MIN_SPAN_KM,50);
});

test('the raster bake is offered at every breadth, because it rescales',()=>{
  for(const span of [1,12,50,1000,5000]){
    assert.ok(basemapAvailable('osm','plot',span),`osm withheld at ${span} km`);
    assert.ok(basemapAvailable('topo','plot',span));
    assert.ok(basemapAvailable('none','plot',span));
  }
});

test('an unmeasured breadth withholds nothing',()=>{
  // A canvas being built has no coordinates yet. Hiding a choice because nothing has been
  // measured is guessing in the other direction.
  assert.ok(basemapAvailable('natural-earth-110m','plot',undefined));
  assert.ok(basemapAvailable('natural-earth-110m','plot'));
});

test('Natural Earth is a static-figure basemap and is not offered to an interactive map',()=>{
  for(const span of [50,1000,undefined])
    assert.ok(!basemapAvailable('natural-earth-110m','interactive',span));
  // And the options markup agrees, at every breadth.
  assert.ok(!basemapOptions('none','interactive',1000).includes('natural-earth-110m'));
  assert.ok(basemapOptions('none','plot',1000).includes('natural-earth-110m'));
  assert.ok(!basemapOptions('none','plot',5).includes('natural-earth-110m'));
});

test('the label names the scale, because a generalisation is not a setting',()=>{
  assert.match(BASEMAP_LABELS['natural-earth-110m'],/1:110m/);
});

test('extent breadth is the longer side, and shrinks with latitude',()=>{
  // One degree of latitude, anywhere: about 110 km.
  assert.ok(Math.abs(extentSpanKm([0,0,0,1])-110.57)<1);
  // One degree of longitude at the equator is about 111 km, and about 79 km at 45 degrees.
  assert.ok(Math.abs(extentSpanKm([0,0,1,0])-111.32)<1);
  assert.ok(Math.abs(extentSpanKm([0,45,1,45])-78.7)<2);
  // The longer side wins.
  assert.ok(Math.abs(extentSpanKm([0,0,1,0.1])-111.32)<1);
});
