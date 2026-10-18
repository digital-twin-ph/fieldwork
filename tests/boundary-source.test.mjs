import test from 'node:test';
import assert from 'node:assert/strict';
import {readLevel,readUnits,isShareAlike,selectionSummary,levelUrl} from '../build/boundary-source.js';

// Everything asserted here is what the live API returned on 2026-10-17, recorded in
// docs/research/geoboundaries-probe-2026-10-17.md. The fixtures are real responses, trimmed.
const COD_ADM3={boundaryID:'COD-ADM3-77481523',boundaryISO:'COD',boundaryType:'ADM3',
  boundaryName:'Democratic Republic of the Congo',admUnitCount:'188',meanVertices:'917.0',
  maxVertices:'9001',boundaryYearRepresented:'2010.0',
  boundaryLicense:'Open Data Commons Open Database License 1.0',
  licenseSource:'https://data.humdata.org/',gjDownloadURL:'https://geoboundaries/COD-ADM3.geojson'};

test('a level is read with its size, so the cost is visible before any geometry is fetched',()=>{
  const level=readLevel('COD','ADM3',COD_ADM3);
  assert.equal(level.units,188);
  assert.equal(level.meanVertices,917);
  assert.equal(level.maxVertices,9001);
  assert.match(level.geoJsonUrl,/\.geojson$/);
});

test('a year arriving as a float is normalised',()=>{
  // COD/ADM3 really returns "2010.0". A vintage that reaches a receipt as "2010.0" fails a
  // string comparison against "2010" in silence, and vintage is what `rate` refuses on.
  assert.equal(readLevel('COD','ADM3',COD_ADM3).yearRepresented,'2010');
  assert.equal(readLevel('X','ADM1',{...COD_ADM3,boundaryYearRepresented:'1995 to 2021'}).yearRepresented,'1995 to 2021');
});

test('a level a country does not publish reads as null, not as a failure',()=>{
  // NGA/ADM3 and BRA/ADM3 return nothing. A picker cannot assume a hierarchy depth.
  assert.equal(readLevel('NGA','ADM3',null),null);
  assert.equal(readLevel('NGA','ADM3',{}),null);
  assert.equal(readLevel('NGA','ADM3',[]),null);
  assert.equal(readLevel('NGA','ADM3',{boundaryID:'x'}),null,'no download link is no level');
});

test('an array response is accepted, because the service returns one for some queries',()=>{
  assert.equal(readLevel('COD','ADM3',[COD_ADM3]).boundaryID,'COD-ADM3-77481523');
});

test('share-alike is detected, because the project’s own records said attribution-only',()=>{
  assert.equal(isShareAlike('Open Data Commons Open Database License 1.0'),true);
  assert.equal(isShareAlike('ODbL'),true);
  assert.equal(isShareAlike('Creative Commons Attribution 4.0 International'),false);
  assert.equal(isShareAlike('CC0 1.0 Universal (CC0 1.0)'),false);
  assert.equal(isShareAlike('Public Domain'),false);
});

test('the summary states the count, the vintage and what the terms oblige',()=>{
  const level=readLevel('COD','ADM3',COD_ADM3);
  const units=[{id:'a',name:'A',geometry:{}},{id:'b',name:'B',geometry:{}}];
  const summary=selectionSummary(level,units);
  assert.match(summary,/2 of 188 ADM3 units/);
  assert.match(summary,/represents 2010/);
  assert.match(summary,/SHARE-ALIKE/,'an ODbL boundary must say so before it is redistributed');
});

test('a permissive level does not shout about share-alike',()=>{
  const level=readLevel('UGA','ADM3',{...COD_ADM3,boundaryLicense:'CC0 1.0 Universal (CC0 1.0)',
    boundaryYearRepresented:'2020',admUnitCount:'137'});
  assert.doesNotMatch(selectionSummary(level,[]),/SHARE-ALIKE/);
  assert.match(selectionSummary(level,[]),/CC0/);
});

test('units are kept whole and named, never dissolved',()=>{
  // A54: "appending polygons into a MultiPolygon" loses which unit is which, and a joint
  // investigation across a border is exactly where that matters.
  const level=readLevel('COD','ADM3',COD_ADM3);
  const units=readUnits(level,{features:[
    {properties:{shapeID:'COD-1',shapeName:'Rutshuru'},geometry:{type:'Polygon',coordinates:[]}},
    {properties:{shapeName:'Nyiragongo'},geometry:{type:'Polygon',coordinates:[]}},
    {properties:{},geometry:null}]});
  assert.equal(units.length,2,'a feature with no geometry is not a unit');
  assert.deepEqual(units.map(u=>u.name),['Rutshuru','Nyiragongo']);
  assert.equal(units[0].id,'COD-1');
  assert.match(units[1].id,/COD-ADM3-77481523-1/,'a unit without an id stays addressable');
});

test('the request names the open release explicitly',()=>{
  const url=levelUrl('cod','ADM3');
  assert.match(url,/gbOpen\/COD\/ADM3/,'the ISO is upper-cased and the release is named');
  assert.ok(!url.includes('gbAuthoritative'),'UN SALB is not for commercial use and is not used');
});

import {browserFetchableUrl} from '../build/boundary-source.js';

// The documented download URL cannot be fetched from a browser. github.com/<o>/<r>/raw/<ref>/<p>
// answers a 302 with an EMPTY access-control-allow-origin, so the request is blocked before the
// redirect is followed. The files are Git LFS: the raw host serves a 131-byte pointer, and the
// real 550 KB comes from media.githubusercontent.com, which sends ACAO: *. Measured 2026-10-17.
test('a github raw link is rewritten to the LFS media host',()=>{
  assert.equal(
    browserFetchableUrl('https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/UGA/ADM3/x.geojson'),
    'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UGA/ADM3/x.geojson');
});

test('anything else is left alone, so a change of hosting is not corrupted',()=>{
  for(const url of ['https://geoboundaries.org/data/x.geojson','https://example.org/a/raw/b',''])
    assert.equal(browserFetchableUrl(url),url);
});

test('the rewrite is applied when a level is read',()=>{
  const level=readLevel('UGA','ADM3',{boundaryID:'UGA-ADM3-1',boundaryISO:'UGA',boundaryType:'ADM3',
    admUnitCount:'137',boundaryLicense:'CC0',boundaryYearRepresented:'2020',
    gjDownloadURL:'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/x.geojson'});
  assert.match(level.geoJsonUrl,/^https:\/\/media\.githubusercontent\.com\/media\//);
});

import {resolveCountry,COUNTRIES,alsoMatching,countryName} from '../build/boundary-source.js';

// "Considering low friction, why do we not use a country dropdown or a predictive entry
// selector?" -- the practitioner, 2026-10-18. Choosing which country to study is a judgment;
// remembering that the DRC is COD is a lookup, and a lookup is friction with nothing behind it.
test('the bundled list covers what the source publishes, and nothing it does not',()=>{
  assert.equal(COUNTRIES.length,230);
  assert.ok(COUNTRIES.every(c=>/^[A-Z]{3}$/.test(c.iso)&&c.name.length>1));
  assert.equal(COUNTRIES.find(c=>c.iso==='COD').name,'Democratic Republic of the Congo');
});

test('a name resolves to its code, however it is typed',()=>{
  assert.equal(resolveCountry('Democratic Republic of the Congo'),'COD');
  assert.equal(resolveCountry('  democratic republic of the congo  '),'COD');
  assert.equal(resolveCountry('Uganda'),'UGA');
});

test('a code still works, because somebody who knows it should not have to scroll',()=>{
  assert.equal(resolveCountry('COD'),'COD');
  assert.equal(resolveCountry('uga'),'UGA');
});

test('an unambiguous prefix resolves; an ambiguous one refuses',()=>{
  assert.equal(resolveCountry('Ugan'),'UGA');
  assert.equal(resolveCountry('Democratic Rep'),'COD');
  assert.equal(resolveCountry('United'),null,'several countries begin United');
});

test('an exact name wins even when it is inside another name, and the near miss is named',()=>{
  // "Congo" IS the Republic of the Congo. Resolving it is correct; the Democratic Republic of
  // the Congo is a different country a thousand kilometres away, and experiment 47 already
  // warned that a name-keyed match "matches the wrong polygon silently". So it resolves AND the
  // other match is reported, for the dialog to show.
  assert.equal(resolveCountry('Congo'),'COG');
  assert.deepEqual(alsoMatching('Congo','COG'),['Democratic Republic of the Congo']);
  assert.deepEqual(alsoMatching('Uganda','UGA'),[],'an unmistakable choice reports nothing');
});

test('nothing typed, and nothing matching, both resolve to nothing',()=>{
  assert.equal(resolveCountry(''),null);
  assert.equal(resolveCountry('   '),null);
  assert.equal(resolveCountry('Wakanda'),null);
  assert.equal(resolveCountry('ZZZ'),null);
});

import {publishedRings,publishedNote} from '../build/boundary-source.js';
import {validateDrawnGeometry,GEOMETRY_BYTE_BUDGET,geometryBytes} from '../build/study-area.js';

// "Selecting Bunia gave me a square not the jurisdictional polygon." It did. A bounding box
// includes ground that is in no jurisdiction at all, which for an outbreak investigation is the
// difference between a district and the land around it.
const ring=(n,cx=29,cy=-1,r=0.2)=>{
  const pts=Array.from({length:n},(_,i)=>{
    const a=2*Math.PI*i/n;
    // A wobble, so the outline carries detail that a thinning step would have had to drop.
    const rad=r*(1+0.08*Math.sin(a*7));
    return [cx+rad*Math.cos(a),cy+rad*Math.sin(a)];
  });
  return [...pts,pts[0]];
};

test('a boundary is carried as published, whatever its vertex count',()=>{
  const b=publishedRings({type:'Polygon',coordinates:[ring(50)]});
  assert.equal(b.vertices,50);
  assert.equal(b.holes,0);
  assert.match(publishedNote('Bunia',b),/the boundary as published, 50 vertices/);
});

test('a real-sized boundary is admitted whole rather than thinned to a vertex count',()=>{
  // geoBoundaries gives COD ADM2 a mean of 774 vertices and a maximum of 4,395, all of which the
  // 3-200 drawing contract of decision A03 rejected. The practitioner, 2026-10-18: "we want to
  // admit polygons as long as they do not overrun memory."
  const b=publishedRings({type:'Polygon',coordinates:[ring(4395)]});
  assert.equal(b.vertices,4395,'nothing is dropped to meet a count');
  const geometry=validateDrawnGeometry({type:'Polygon',coordinates:b.rings});
  assert.equal(geometry.coordinates[0].length-1,4395,'the validator admits it too');
  assert.match(publishedNote('Shabunda',b),/4395 vertices, \d+ KB/);
});

test('an interior ring is kept, because real jurisdictions have enclaves',()=>{
  // 22 of 189 DRC ADM2 units carry one, and no vertex budget reaches those: the old contract
  // refused holes outright.
  const outer=ring(60,29,-1,0.4),hole=ring(20,29,-1,0.1);
  const b=publishedRings({type:'Polygon',coordinates:[outer,hole]});
  assert.equal(b.holes,1);
  assert.equal(b.rings.length,2);
  const geometry=validateDrawnGeometry({type:'Polygon',coordinates:b.rings});
  assert.equal(geometry.coordinates.length,2,'the enclave survives into the study area');
  assert.match(publishedNote('Bunia',b),/1 interior ring kept/);
});

test('an interior ring outside the boundary is refused rather than silently kept',()=>{
  const outer=ring(40,29,-1,0.2),away=ring(20,40,-1,0.05);
  assert.throws(()=>validateDrawnGeometry({type:'Polygon',coordinates:[outer,away]}),
    /interior ring must lie inside/);
});

test('a boundary too large to store is refused, and the refusal names the size',()=>{
  // The budget is bytes because bytes are what runs out: localStorage accepts 5,226,496 bytes,
  // a save writes the workflow twice, and an area keeps every extent it has had.
  const huge={type:'Polygon',coordinates:[ring(40000)]};
  assert.ok(geometryBytes(huge)>GEOMETRY_BYTE_BUDGET,'the fixture has to exceed the budget');
  assert.throws(()=>validateDrawnGeometry(huge),/budget for one extent is \d+ KB/);
});

test('admitting a large boundary does not take the time a quadratic scan would',()=>{
  // The O(n^2) pair scan this replaced cost 12.2 s at 32,000 vertices, so time, not memory, was
  // the real ceiling. A budget that admits large polygons is only honest if they also validate.
  const big={type:'Polygon',coordinates:[ring(20000)]};
  const started=Date.now();
  validateDrawnGeometry(big);
  const elapsed=Date.now()-started;
  assert.ok(elapsed<3000,`validating 20,000 vertices took ${elapsed} ms`);
});

test('a self-crossing boundary is still caught at scale',()=>{
  // The grid is an optimisation, not a relaxation: a fault anywhere must still be found.
  const pts=ring(2000).slice(0,-1);
  [pts[10],pts[1000]]=[pts[1000],pts[10]];
  assert.throws(()=>validateDrawnGeometry({type:'Polygon',coordinates:[[...pts,pts[0]]]}),
    /must not cross or touch|collinear/);
});

test('a MultiPolygon keeps its largest part and reports what was not carried',()=>{
  // Islands and exclaves. One outline is what a study area holds, and losing a part silently
  // would be worse than losing it loudly. Measured, no DRC ADM2 unit is multi-part at all.
  const b=publishedRings({type:'MultiPolygon',coordinates:[
    [ring(12,29,-1,0.1)],[ring(60,31,-2,0.3)],[ring(8,33,-3,0.05)]]});
  assert.equal(b.vertices,60,'the largest part stands for the whole');
  assert.equal(b.partsDropped,2);
  assert.match(publishedNote('Bunia',b),/2 separate parts not carried/);
});

test('geometry that is not a polygon yields nothing rather than a guess',()=>{
  assert.equal(publishedRings(null),null);
  assert.equal(publishedRings({type:'Point',coordinates:[1,2]}),null);
  assert.equal(publishedRings({type:'Polygon',coordinates:[[[0,0],[1,1]]]}),null,'too few points is no ring');
});

