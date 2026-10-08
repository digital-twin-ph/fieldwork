// Exports validation fixtures for the accompanying Validation Lab.
// Data crosses one way only: Fieldwork exports, the lab reads and recomputes from
// declaredParameters alone. See docs/experiments/41-validation-lab.md.
//
// Usage: node scripts/export-validation-fixture.mjs <fixtureId> <outputDir>
//        fixtureId: reproject-utm35s-001 | clip-all-touched-001
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {reprojectToCRS84} from '../build/reproject.js';
import {clipRaster,encodeRaster} from '../build/raster.js';

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
