/** A SCANNED MAP IN A GEOTIFF, READ AS A PICTURE (TODO 35, 2026-11-15; the practitioner: "I want this process to use as
 *  much of the built in infrastructure FW has already with some enhancements").
 *
 *  Georeferenced map image took a PNG or JPEG with a world file or matched points. Most published historical sheets come
 *  as GeoTIFFs in their own projection: USGS's 1943 sheets of Lycoming are polyconic on NAD27, centred on each sheet.
 *  This reads one: whether it is a picture at all, from its tags; its projection, from its tags, through proj4; and the
 *  part over the study area, redrawn north-up in longitude and latitude, which is what the map image is drawn as.
 *
 *  THE TAGS ARE A STARTING POINT, NOT A PROOF. Oswego East's tags place it 652 m off its own printed corners. What this
 *  returns is where the file says it is; the dialog shows it over today's map, with the file's graticule, to be checked
 *  and corrected by matched points. */
import proj4 from 'proj4';

/** The tags this needs, as geotiff.js reads them. */
export interface PictureTags {
  samplesPerPixel:number; bitsPerSample:number; photometric?:number; sampleFormat?:number;
  geoKeys:Record<string,unknown>;
  width:number; height:number; origin:[number,number]; resolution:[number,number];
  /** Present when the file carries a rotated or sheared transform, which this does not read. */
  modelTransformation?:boolean;
}

/** A PICTURE, OR VALUES: three 8-bit colour bands or a palette is a scan of something printed; one band of numbers is a
 *  measurement for Raster input. Decided from the tags alone, before any pixel is read. */
export function pictureOrValues(t:Pick<PictureTags,'samplesPerPixel'|'bitsPerSample'|'photometric'|'sampleFormat'>):{kind:'picture'|'values';said:string}{
  const colour=t.samplesPerPixel>=3&&t.bitsPerSample===8&&(t.photometric===undefined||t.photometric===2||t.photometric===6);
  const palette=t.samplesPerPixel===1&&t.photometric===3;
  if(colour)return {kind:'picture',said:`${t.samplesPerPixel} colour bands of 8 bits: a picture, such as a scanned map`};
  if(palette)return {kind:'picture',said:'one band with a colour palette: a picture, such as a scanned map'};
  return {kind:'values',said:`${t.samplesPerPixel} band${t.samplesPerPixel===1?'':'s'} of ${t.bitsPerSample}-bit ${t.sampleFormat===3?'decimal':'whole'} numbers: values to measure`};
}

const num=(keys:Record<string,unknown>,name:string)=>{const v=keys[name];return typeof v==='number'&&Number.isFinite(v)?v:undefined;};

/** THE DATUM, from the geographic type or the ellipsoid the file states. NAD27 is carried to WGS84 by its mean shift for
 *  the conterminous United States (NIMA TR8350.2), good to a few metres; the dialog's check against today's map is
 *  what says whether that is enough. */
function datumOf(keys:Record<string,unknown>):{proj:string;name:string}{
  const g=num(keys,'GeographicTypeGeoKey');
  if(g===4326)return {proj:'+datum=WGS84',name:'WGS 84'};
  if(g===4269)return {proj:'+ellps=GRS80 +towgs84=0,0,0',name:'NAD83'};
  if(g===4267)return {proj:'+ellps=clrk66 +towgs84=-8,160,176,0,0,0,0',name:'NAD27, by its mean shift to WGS 84'};
  const a=num(keys,'GeogSemiMajorAxisGeoKey'),f=num(keys,'GeogInvFlatteningGeoKey');
  if(a&&f)return {proj:`+a=${a} +rf=${f}`,name:`an ellipsoid of ${a} m, 1/${f}, with no shift to WGS 84`};
  throw new Error('The file does not say which datum its coordinates are on, so it cannot be placed.');
}

/** THE PROJECTION, as a proj4 definition, from the GeoTIFF keys: geographic; UTM by its EPSG code on WGS 84, NAD83 or
 *  NAD27; or a projection the file defines itself (code 32767) by one of the methods published sheets use. Anything else
 *  is named and refused, never guessed. */
export function projectionOf(keys:Record<string,unknown>):{proj:string;said:string;geographic:string;datum:string}{
  const found=projectionOnly(keys),d=datumOrWgs(keys);
  // THE SHEET'S OWN LONGITUDE AND LATITUDE, on its datum: what its printed ticks and corners are numbered in.
  return {...found,geographic:`+proj=longlat ${d.proj} +no_defs`,datum:d.name};
}
const datumOrWgs=(keys:Record<string,unknown>)=>{try{return datumOf(keys);}catch{return {proj:'+datum=WGS84',name:'WGS 84'};}};
function projectionOnly(keys:Record<string,unknown>):{proj:string;said:string}{
  const model=num(keys,'GTModelTypeGeoKey');
  if(model===2){const d=datumOf(keys);return {proj:`+proj=longlat ${d.proj} +no_defs`,said:`longitude and latitude, ${d.name}`};}
  if(model!==1)throw new Error('The file says neither a projection nor longitude and latitude, so it cannot be placed.');
  const code=num(keys,'ProjectedCSTypeGeoKey');
  if(code!==undefined&&code!==32767){
    const utm=(base:number,datum:string,name:string)=>code>=base+1&&code<=base+60
      ?{proj:`+proj=utm +zone=${code-base} ${datum} +units=m +no_defs`,said:`UTM zone ${code-base} north, ${name}`}:undefined;
    const found=utm(32600,'+datum=WGS84','WGS 84')??utm(26900,'+ellps=GRS80 +towgs84=0,0,0','NAD83')
      ??utm(26700,'+ellps=clrk66 +towgs84=-8,160,176,0,0,0,0','NAD27')
      ??(code>=32701&&code<=32760?{proj:`+proj=utm +zone=${code-32700} +south +datum=WGS84 +units=m +no_defs`,said:`UTM zone ${code-32700} south, WGS 84`}:undefined);
    if(found)return found;
    throw new Error(`The file is in projection EPSG:${code}, which this does not read yet. Reproject it to longitude and latitude, or place it by matching points.`);
  }
  const d=datumOf(keys),method=num(keys,'ProjCoordTransGeoKey');
  const lon0=num(keys,'ProjNatOriginLongGeoKey')??num(keys,'ProjCenterLongGeoKey')??num(keys,'ProjFalseOriginLongGeoKey');
  const lat0=num(keys,'ProjNatOriginLatGeoKey')??num(keys,'ProjCenterLatGeoKey')??num(keys,'ProjFalseOriginLatGeoKey');
  const fe=num(keys,'ProjFalseEastingGeoKey')??num(keys,'ProjFalseOriginEastingGeoKey')??0;
  const fn=num(keys,'ProjFalseNorthingGeoKey')??num(keys,'ProjFalseOriginNorthingGeoKey')??0;
  const k=num(keys,'ProjScaleAtNatOriginGeoKey')??1;
  const units=num(keys,'ProjLinearUnitsGeoKey');
  const unit=units===undefined||units===9001?'+units=m':units===9003?'+units=us-ft':units===9002?'+units=ft':undefined;
  if(!unit)throw new Error('The file measures its projection in a unit this does not read.');
  if(lon0===undefined||lat0===undefined)throw new Error('The file defines its own projection but not its origin, so it cannot be placed.');
  const common=`+lat_0=${lat0} +lon_0=${lon0} +x_0=${fe} +y_0=${fn} ${d.proj} ${unit} +no_defs`;
  if(method===22)return {proj:`+proj=poly ${common}`,said:`polyconic, centred on ${lon0}°, ${d.name}`};
  if(method===1)return {proj:`+proj=tmerc +k_0=${k} ${common}`,said:`transverse Mercator, centred on ${lon0}°, ${d.name}`};
  if(method===8){const p1=num(keys,'ProjStdParallel1GeoKey'),p2=num(keys,'ProjStdParallel2GeoKey');
    if(p1===undefined||p2===undefined)throw new Error('The file defines a Lambert conformal projection without its standard parallels.');
    return {proj:`+proj=lcc +lat_1=${p1} +lat_2=${p2} ${common}`,said:`Lambert conformal conic, ${d.name}`};}
  if(method===11){const p1=num(keys,'ProjStdParallel1GeoKey'),p2=num(keys,'ProjStdParallel2GeoKey');
    if(p1===undefined||p2===undefined)throw new Error('The file defines an Albers projection without its standard parallels.');
    return {proj:`+proj=aea +lat_1=${p1} +lat_2=${p2} ${common}`,said:`Albers equal-area, ${d.name}`};}
  throw new Error(`The file defines its own projection by method ${method}, which this does not read yet. Place it by matching points.`);
}

export type Box=[west:number,south:number,east:number,north:number];

/** WHERE THE FILE SAYS IT IS, in longitude and latitude: the envelope of its four corners and its edges' midpoints. */
export function footprintOf(t:PictureTags,proj:string,into='EPSG:4326'):Box{
  const to=proj4(proj,into);
  const xs=[0,t.width/2,t.width],ys=[0,t.height/2,t.height];
  const pts=xs.flatMap(i=>ys.map(j=>to.forward([t.origin[0]+i*t.resolution[0],t.origin[1]+j*t.resolution[1]]) as [number,number]));
  return [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];
}

/** THE PLAN FOR A NORTH-UP IMAGE of the part of the file over `want`: its box in longitude and latitude, its size in
 *  pixels at about the file's own resolution and never more than `maxSide` on a side, and the window of the file that
 *  holds it, so only that part is decoded. Null where the file and the box do not overlap. */
export function northUpPlan(t:PictureTags,proj:string,want:Box,maxSide=2400):{box:Box;width:number;height:number;window:[number,number,number,number]}|null{
  const foot=footprintOf(t,proj);
  const box:Box=[Math.max(want[0],foot[0]),Math.max(want[1],foot[1]),Math.min(want[2],foot[2]),Math.min(want[3],foot[3])];
  if(!(box[2]>box[0]&&box[3]>box[1]))return null;
  const midLat=(box[1]+box[3])/2,mLat=111132,mLon=111320*Math.cos(midLat*Math.PI/180);
  const metres=Math.abs(t.resolution[0])*(/\+units=us-ft|\+units=ft/.test(proj)?0.3048:/\+proj=longlat/.test(proj)?mLat:1);
  let width=Math.max(1,Math.round((box[2]-box[0])*mLon/metres)),height=Math.max(1,Math.round((box[3]-box[1])*mLat/metres));
  const shrink=Math.max(1,Math.max(width,height)/maxSide);width=Math.round(width/shrink);height=Math.round(height/shrink);
  const from=proj4('EPSG:4326',proj);
  const corners=[[box[0],box[1]],[box[0],box[3]],[box[2],box[1]],[box[2],box[3]],[(box[0]+box[2])/2,box[1]],[(box[0]+box[2])/2,box[3]]]
    .map(c=>from.forward(c) as [number,number]).map(([x,y])=>[(x-t.origin[0])/t.resolution[0],(y-t.origin[1])/t.resolution[1]]);
  const clamp=(v:number,hi:number)=>Math.max(0,Math.min(hi,v));
  const window:[number,number,number,number]=[clamp(Math.floor(Math.min(...corners.map(c=>c[0])))-2,t.width),clamp(Math.floor(Math.min(...corners.map(c=>c[1])))-2,t.height),
    clamp(Math.ceil(Math.max(...corners.map(c=>c[0])))+2,t.width),clamp(Math.ceil(Math.max(...corners.map(c=>c[1])))+2,t.height)];
  return {box,width,height,window};
}

/** THE NORTH-UP PIXELS: for each output pixel, its longitude and latitude carried into the file's projection and read
 *  from the window's RGB, nearest neighbour, so a printed line is not smeared. White where the file has nothing. */
export function northUpPixels(t:PictureTags,proj:string,plan:NonNullable<ReturnType<typeof northUpPlan>>,
  windowRgb:Uint8Array|Uint8ClampedArray):Uint8ClampedArray{
  const from=proj4('EPSG:4326',proj),[wx0,wy0,wx1]=plan.window,ww=wx1-wx0,wh=plan.window[3]-wy0;
  const out=new Uint8ClampedArray(plan.width*plan.height*4).fill(255);
  for(let j=0;j<plan.height;j++)for(let i=0;i<plan.width;i++){
    const lon=plan.box[0]+(i+.5)/plan.width*(plan.box[2]-plan.box[0]),lat=plan.box[3]-(j+.5)/plan.height*(plan.box[3]-plan.box[1]);
    const [x,y]=from.forward([lon,lat]) as [number,number];
    const c=Math.floor((x-t.origin[0])/t.resolution[0])-wx0,r=Math.floor((y-t.origin[1])/t.resolution[1])-wy0;
    if(c<0||r<0||c>=ww||r>=wh)continue;
    const k=(r*ww+c)*3,o=(j*plan.width+i)*4;out[o]=windowRgb[k]!;out[o+1]=windowRgb[k+1]!;out[o+2]=windowRgb[k+2]!;
  }
  return out;
}

/** THE FILE'S GRATICULE over the box: the meridians and parallels at a round step, in longitude and latitude. Drawn over
 *  the placed sheet, they should run along the sheet's own printed ticks and neat line; where they do not, the tags are
 *  wrong, as Oswego East's are by 652 m. */
export function graticuleOf(box:Box,stepDeg=2.5/60):{meridians:number[];parallels:number[]}{
  const at=(lo:number,hi:number)=>{const out:number[]=[];for(let v=Math.ceil(lo/stepDeg-1e-9)*stepDeg;v<=hi+1e-9;v+=stepDeg)out.push(Math.round(v*1e6)/1e6);return out;};
  return {meridians:at(box[0],box[2]),parallels:at(box[1],box[3])};
}

/** THE PRINTED SHEET, a default: the file's footprint rounded inward to the smallest of 7½′, 15′ or 30′ that leaves a
 *  sheet, since published quadrangles are bounded on those meridians and parallels. The tags cover the scanned page with
 *  its margins; clipping to this keeps one sheet's margin off its neighbour. A default the practitioner can change. */
export function printedSheetOf(footprint:Box):{box:Box;stepMinutes:number}|null{
  for(const minutes of [7.5,15,30]){
    const s=minutes/60,inward=(v:number,up:boolean)=>(up?Math.ceil(v/s-1e-9):Math.floor(v/s+1e-9))*s;
    const box:Box=[inward(footprint[0],true),inward(footprint[1],true),inward(footprint[2],false),inward(footprint[3],false)];
    const cols=Math.round((box[2]-box[0])/s),rows=Math.round((box[3]-box[1])/s);
    if(cols===1&&rows===1)return {box:box.map(v=>Math.round(v*1e6)/1e6) as Box,stepMinutes:minutes};
  }
  return null;
}

/** Degrees as a sheet prints them: 76° 22′ 30″. */
export function dms(value:number,hemispheres:[string,string]):string{
  const a=Math.abs(value),d=Math.floor(a+1e-9),mFull=(a-d)*60,m=Math.floor(mFull+1e-9),s=Math.round((mFull-m)*60);
  return `${d}° ${m}′${s?` ${s}″`:''} ${value<0?hemispheres[1]:hemispheres[0]}`;
}

/** A BOX ON THE SHEET'S DATUM, as today's map draws it: the envelope of its corners carried to WGS 84. */
export function boxToWgs84(box:Box,geographic:string):Box{
  const to=proj4(geographic,'EPSG:4326');
  const c=[[box[0],box[1]],[box[0],box[3]],[box[2],box[1]],[box[2],box[3]]].map(p=>to.forward(p) as [number,number]);
  return [Math.min(...c.map(p=>p[0])),Math.min(...c.map(p=>p[1])),Math.max(...c.map(p=>p[0])),Math.max(...c.map(p=>p[1]))];
}

/** THE SHEET'S GRATICULE AS TODAY'S MAP DRAWS IT: each meridian and parallel at a round value on the sheet's own datum,
 *  as a line of WGS 84 points, so a printed tick is compared with the line it was printed for. On NAD27 near Lycoming the
 *  difference is about 30 m, enough to read a correct sheet as wrong. */
export function graticuleLines(wgsBox:Box,geographic:string,stepDeg=2.5/60):{value:number;along:'meridian'|'parallel';points:[number,number][]}[]{
  const from=proj4('EPSG:4326',geographic),to=proj4(geographic,'EPSG:4326');
  const corners=[[wgsBox[0],wgsBox[1]],[wgsBox[0],wgsBox[3]],[wgsBox[2],wgsBox[1]],[wgsBox[2],wgsBox[3]]].map(p=>from.forward(p) as [number,number]);
  const box:Box=[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))];
  const g=graticuleOf(box,stepDeg),steps=8,out:{value:number;along:'meridian'|'parallel';points:[number,number][]}[]=[];
  for(const lon of g.meridians)out.push({value:lon,along:'meridian',points:Array.from({length:steps+1},(_,i)=>to.forward([lon,box[1]+(box[3]-box[1])*i/steps]) as [number,number])});
  for(const lat of g.parallels)out.push({value:lat,along:'parallel',points:Array.from({length:steps+1},(_,i)=>to.forward([box[0]+(box[2]-box[0])*i/steps,lat]) as [number,number])});
  return out;
}
