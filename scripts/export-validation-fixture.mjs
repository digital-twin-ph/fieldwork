// Exports validation fixtures for the accompanying Validation Lab.
// Data crosses one way only: Fieldwork exports, the lab reads and recomputes from
// declaredParameters alone. See docs/experiments/41-validation-lab.md.
//
// Usage: node scripts/export-validation-fixture.mjs <fixtureId> <outputDir>
//        fixtureId: reproject-utm35s-001 | clip-all-touched-001 | measure-area-001 | mean-center-001
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {reprojectToCRS84} from '../build/reproject.js';
import {clipRaster,encodeRaster} from '../build/raster.js';
import {calculateArea,AREA_METHOD} from '../build/area-computation.js';
import {computeMeanCenter} from '../build/mean-center.js';

const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const registry=JSON.parse(await readFile(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const widgetOf=nodeType=>registry.widgets.find(w=>w.nodeType===nodeType);
const sha256=data=>createHash('sha256').update(data).digest('hex');
const base=(id,nodeType,label,implementation)=>({
  schema:'fieldwork/validation-fixture/1',fixtureId:id,exportedAt:new Date().toISOString(),
  application:{name:'Fieldwork',version},
  operation:{widget:widgetOf(nodeType).id,release:widgetOf(nodeType).currentVersion,label,implementation}
});

const builders={
  'mean-center-001'(){
    // A Gaborone-area cluster with one outlier, so an unweighted mean is visibly pulled:
    // the point of the check is the projection and the average, not a robust statistic.
    const zone=35,hemisphere='south';
    const coordinates=[[25.8700,-24.6600],[25.8900,-24.6700],[25.9100,-24.6400],[25.8800,-24.6300],
                       [25.9000,-24.6500],[26.1500,-24.4000]];
    const points={type:'FeatureCollection',features:coordinates.map(([lon,lat],i)=>({
      type:'Feature',id:`c${i+1}`,properties:{name:`Clinic ${i+1}`},geometry:{type:'Point',coordinates:[lon,lat]}}))};
    const result=computeMeanCenter(points,{label:'Mean center',zone,hemisphere});
    return {fixture:{
      ...base('mean-center-001','mean_center','Mean center','src/mean-center.ts#computeMeanCenter'),
      declaredParameters:{
        zone,hemisphere,computationCRS:result.crs,sourceCRS:'OGC:CRS84',
        method:result.method,
        semantics:'Every point is projected to the stated WGS84 UTM CRS, easting and northing are averaged without weights, and the mean is converted back to CRS84. No point is excluded and no outlier is down-weighted.'
      },
      selfReported:{count:result.count},
      input:{points:coordinates.map(([longitude,latitude],i)=>({id:`c${i+1}`,longitude,latitude}))},
      output:{coordinates:result.coordinates,projected:result.projected,crs:result.crs,count:result.count},
      note:'Project the input points to the declared CRS, average the coordinates without weights, and invert. Compare both the projected mean in metres and the returned CRS84 position as a ground separation.'
    },files:{}};
  },
  'measure-area-001'(){
    // Four boundaries chosen so the sphere-versus-ellipsoid gap can be seen to grow with
    // latitude and size: an equatorial box, a Gaborone-sized box at -24.6, a high-latitude
    // box, and a large mid-latitude box. The last case carries a hole, because a ring
    // subtraction is where a reimplementation is most likely to differ.
    const box=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
    const cases=[
      {id:'equatorial-1deg',unit:'km2',geometry:box(0,0,1,1)},
      {id:'gaborone-box',unit:'km2',geometry:box(25.7829,-24.7082,25.9821,-24.5438)},
      {id:'high-latitude-box',unit:'km2',geometry:box(10,60,11,61)},
      {id:'triangle-mid-latitude',unit:'ha',geometry:{type:'Polygon',coordinates:[[[25,-24],[26,-24],[25.5,-23],[25,-24]]]}},
      {id:'box-with-hole',unit:'km2',geometry:{type:'Polygon',coordinates:[
        [[25,-24],[26,-24],[26,-23],[25,-23],[25,-24]],
        [[25.4,-23.6],[25.6,-23.6],[25.6,-23.4],[25.4,-23.4],[25.4,-23.6]]]}},
    ].map(c=>{const measurement=calculateArea(c.geometry,c.unit);
      return {...c,output:{squareMetres:measurement.squareMetres,value:measurement.value,unit:measurement.unit}};});
    return {fixture:{
      ...base('measure-area-001','measure_area','Calculate area','src/area-computation.ts#calculateArea'),
      declaredParameters:{
        method:AREA_METHOD,
        earthRadiusM:6371008.8,
        model:'sphere',
        geometryCRS:'OGC:CRS84',
        axisOrder:'longitude-latitude',
        ringRule:'Exterior ring area minus the area of each interior ring.',
        semantics:'Area of a polygon on a sphere of the stated mean radius. No ellipsoidal correction is applied, and the widget reports the result as approximate.'
      },
      selfReported:{cases:cases.length},
      input:{cases:cases.map(({id,unit,geometry})=>({id,unit,geometry}))},
      output:cases.map(({id,output})=>({id,...output})),
      note:'Recompute each case from its geometry and the declared method. Two separate claims are available: that this implementation computes the stated spherical formula, and how far that formula sits from an ellipsoidal area, which is the approximation the widget declares.'
    },files:{}};
  },
  'reproject-utm35s-001'(){
    // A spread across zone 35 south: near and far from the central meridian, and from
    // near-equatorial to mid-latitude, all inside the widget's validity guard.
    const zone=35,hemisphere='south';
    const projected=[[200000,9000000],[500000,9000000],[800000,9000000],[260000,7280000],[500000,7280000],[740000,7280000],[300000,6000000],[500000,6000000],[700000,6000000]];
    const collection={type:'FeatureCollection',features:projected.map(([e,n],i)=>({type:'Feature',id:`p${i+1}`,properties:{name:`Point ${i+1}`},geometry:{type:'Point',coordinates:[e,n]}}))};
    const {collection:converted,provenance}=reprojectToCRS84(collection,zone,hemisphere);
    return {fixture:{
      ...base('reproject-utm35s-001','reproject','Reproject input','src/reproject.ts#reprojectToCRS84'),
      declaredParameters:{sourceCRS:provenance.sourceCRS,definition:provenance.definition,axisOrder:provenance.axisOrder,units:provenance.units,
        targetCRS:provenance.targetCRS,targetAxisOrder:provenance.targetAxisOrder,datumShift:provenance.datumShift,zone,hemisphere,
        operation:provenance.operation,library:provenance.library},
      selfReported:{transformed:provenance.transformed,withoutCoordinates:provenance.withoutCoordinates,maxRoundTripM:provenance.maxRoundTripM,coordinateDecimals:9},
      input:collection.features.map(f=>({id:f.id,easting:f.geometry.coordinates[0],northing:f.geometry.coordinates[1]})),
      output:converted.features.map(f=>({id:f.id,longitude:f.geometry.coordinates[0],latitude:f.geometry.coordinates[1]})),
      note:'Recompute the output from declaredParameters and the input only. Fieldwork’s own intermediate values are deliberately absent.'
    },files:{}};
  },
  'clip-all-touched-001'(){
    // A small north-up CRS84 grid with a deterministic ramp, so a value disagreement is
    // traceable to a cell rather than hidden in noise.
    const width=24,height=18,origin=[25,-24],resolution=[.01,-.01];
    const metadata={width,height,bands:1,origin,resolution,
      bounds:[origin[0],origin[1]+height*resolution[1],origin[0]+width*resolution[0],origin[1]],
      crs:'EPSG:4326',rasterType:'PixelIsArea',noData:'nan',bits:64,sampleFormat:3,compression:1,
      blockWidth:width,blockHeight:1,bytesPerPixel:8,geoKeys:{},gdal:null,band:null,description:'Synthetic validation grid'};
    const values=Array.from({length:width*height},(_,i)=>Math.floor(i/width)*100+(i%width));
    const source={metadata,values};
    const tif=encodeRaster(source);
    // Deliberately awkward: vertices exactly on pixel corners, diagonal edges and a
    // concave notch, because pixel-edge alignment is where rasterization conventions differ.
    const cutline={type:'Polygon',coordinates:[[[25.03,-24.03],[25.17,-24.03],[25.17,-24.09],[25.11,-24.09],[25.11,-24.14],[25.195,-24.155],[25.06,-24.16],[25.045,-24.105],[25.03,-24.03]]]};
    const cases=[{method:'all-touched',marginPixels:0},{method:'all-touched',marginPixels:1},{method:'cell-center',marginPixels:0}].map(options=>{
      const clipped=clipRaster({...source,asset:undefined},cutline,options);
      const m=clipped.metadata,rows=[];
      for(let row=0;row<m.height;row++)rows.push(clipped.values.slice(row*m.width,(row+1)*m.width).map(v=>v===null?'0':'1').join(''));
      return {options,window:{origin:m.origin,width:m.width,height:m.height,bounds:m.bounds},
        counts:{included:clipped.mask.inside,valid:clipped.mask.valid,excluded:clipped.mask.outside},
        includedRows:rows,includedValues:clipped.values.filter(v=>v!==null)};
    });
    return {fixture:{
      ...base('clip-all-touched-001','clip_raster','Clip raster','src/raster-mask.ts#rasterCellPredicate'),
      declaredParameters:{crs:'EPSG:4326',rasterType:'PixelIsArea',sourceRaster:'clip-all-touched-001.tif',
        sourceGrid:{width,height,origin,resolution,bounds:metadata.bounds,noData:'nan',dataType:'float64'},
        cutline,cases:cases.map(c=>c.options),
        semantics:'A cell is included when its centre is inside or on the cutline, or when the cutline comes within marginPixels of the cell rectangle (all-touched) or of its centre (cell-center). The margin is a distance in native pixels, not metres. The operation crops to the included window and writes NoData outside the cutline.'},
      selfReported:{cells:width*height,cases:cases.length},
      input:{raster:'clip-all-touched-001.tif',rasterSHA256:sha256(tif),cutline},
      output:cases,
      note:'Rebuild the clip from the GeoTIFF, the cutline and each case’s options. Row strings are one character per cell, 1 included and 0 excluded, within that case’s cropped window.'
    },files:{'clip-all-touched-001.tif':tif}};
  }
};

const [id,outputDir]=process.argv.slice(2);
if(!builders[id]||!outputDir)throw new Error(`Usage: node scripts/export-validation-fixture.mjs <${Object.keys(builders).join('|')}> <outputDir>`);
const {fixture,files}=builders[id]();
for(const [name,bytes] of Object.entries(files)){
  await writeFile(`${outputDir}/${name}`,bytes);
  await writeFile(`${outputDir}/${name}.sha256`,`${sha256(bytes)}  ${name}\n`);
}
const json=JSON.stringify(fixture,null,2)+'\n';
await writeFile(`${outputDir}/${id}.json`,json);
await writeFile(`${outputDir}/${id}.json.sha256`,`${sha256(json)}  ${id}.json\n`);
console.log(`Wrote ${id}.json${Object.keys(files).length?' and '+Object.keys(files).join(', '):''} with SHA-256 sidecars to ${outputDir}`);
