/** A GEOTIFF'S HEADER, READ BY FIELDWORK (experiment 221). terrio decodes the cells; the checks Fieldwork makes before any
 *  cell is read (picture or values, EPSG:4326, north-up, registration, no data, blocks) need tags that terrio does not
 *  give: GeoKeys, photometric interpretation, ModelTransformation, block size, strip offsets. This reads the first
 *  image's directory of a classic TIFF or a BigTIFF, from a file on this device, bytes in memory, or a URL by range.
 *  Values are given as geotiff.js gave them, so what a project kept before still reads the same. */
export type ByteSource=Blob|string|ArrayBuffer;

/** Reads `length` bytes at `at`; fewer at the end of the file. */
export type ReadBytes=(at:number,length:number)=>Promise<Uint8Array>;
export function byteReader(source:ByteSource,fetcher:typeof fetch=fetch):ReadBytes{
  if(source instanceof ArrayBuffer)return async(at,length)=>new Uint8Array(source,Math.min(at,source.byteLength),Math.max(0,Math.min(length,source.byteLength-at)));
  if(typeof source!=='string')return async(at,length)=>new Uint8Array(await source.slice(at,at+length).arrayBuffer());
  return async(at,length)=>{
    const response=await fetcher(source,{headers:{Range:`bytes=${at}-${at+length-1}`}});
    if(!response.ok)throw new Error(`${new URL(source).host} answered ${response.status} for the file's header.`);
    const bytes=new Uint8Array(await response.arrayBuffer());
    // A server that ignores Range sends the whole file: take the part asked for.
    return response.status===206?bytes:bytes.subarray(at,at+length);
  };
}

const TYPE_SIZE:Record<number,number>={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8,16:8,17:8,18:8};
const TAGS:Record<string,number>={ImageWidth:256,ImageLength:257,BitsPerSample:258,Compression:259,PhotometricInterpretation:262,
  ImageDescription:270,StripOffsets:273,SamplesPerPixel:277,RowsPerStrip:278,StripByteCounts:279,PlanarConfiguration:284,
  ColorMap:320,TileWidth:322,TileLength:323,TileOffsets:324,TileByteCounts:325,SampleFormat:339,
  ModelPixelScale:33550,ModelTiepoint:33922,ModelTransformation:34264,GeoKeyDirectory:34735,GeoDoubleParams:34736,
  GeoAsciiParams:34737,GDAL_METADATA:42112,GDAL_NODATA:42113};
const GEOKEY_NAMES:Record<number,string>={1024:'GTModelTypeGeoKey',1025:'GTRasterTypeGeoKey',1026:'GTCitationGeoKey',
  2048:'GeographicTypeGeoKey',2049:'GeogCitationGeoKey',2050:'GeogGeodeticDatumGeoKey',2051:'GeogPrimeMeridianGeoKey',
  2052:'GeogLinearUnitsGeoKey',2053:'GeogLinearUnitSizeGeoKey',2054:'GeogAngularUnitsGeoKey',2055:'GeogAngularUnitSizeGeoKey',
  2056:'GeogEllipsoidGeoKey',2057:'GeogSemiMajorAxisGeoKey',2058:'GeogSemiMinorAxisGeoKey',2059:'GeogInvFlatteningGeoKey',
  2060:'GeogAzimuthUnitsGeoKey',2061:'GeogPrimeMeridianLongGeoKey',2062:'GeogTOWGS84GeoKey',3072:'ProjectedCSTypeGeoKey',
  3073:'PCSCitationGeoKey',3074:'ProjectionGeoKey',3075:'ProjCoordTransGeoKey',3076:'ProjLinearUnitsGeoKey',
  3077:'ProjLinearUnitSizeGeoKey',3078:'ProjStdParallel1GeoKey',3079:'ProjStdParallel2GeoKey',3080:'ProjNatOriginLongGeoKey',
  3081:'ProjNatOriginLatGeoKey',3082:'ProjFalseEastingGeoKey',3083:'ProjFalseNorthingGeoKey',3084:'ProjFalseOriginLongGeoKey',
  3085:'ProjFalseOriginLatGeoKey',3086:'ProjFalseOriginEastingGeoKey',3087:'ProjFalseOriginNorthingGeoKey',
  3088:'ProjCenterLongGeoKey',3089:'ProjCenterLatGeoKey',3090:'ProjCenterEastingGeoKey',3091:'ProjCenterNorthingGeoKey',
  3092:'ProjScaleAtNatOriginGeoKey',3093:'ProjScaleAtCenterGeoKey',3094:'ProjAzimuthAngleGeoKey',
  3095:'ProjStraightVertPoleLongGeoKey',3096:'ProjRectifiedGridAngleGeoKey',4096:'VerticalCSTypeGeoKey',
  4097:'VerticalCitationGeoKey',4098:'VerticalDatumGeoKey',4099:'VerticalUnitsGeoKey'};

type TagValue=number|string|number[];
interface Entry {type:number;count:number;inline?:Uint8Array;offset:number}

export class TiffHeader {
  private constructor(private readonly read:ReadBytes,private readonly little:boolean,private readonly entries:Map<number,Entry>,
    private readonly loaded:Map<number,TagValue>){}

  /** The first image's directory. Tag values up to 64 KB are read with it; larger ones (a large file's tile offsets) only
   *  when asked for. */
  static async open(source:ByteSource|ReadBytes,fetcher?:typeof fetch):Promise<TiffHeader>{
    const read=typeof source==='function'?source:byteReader(source,fetcher);
    let head=await read(0,65536);
    if(head.length<8)throw new Error('This file is too short to be a GeoTIFF.');
    const mark=String.fromCharCode(head[0]!,head[1]!);
    if(mark!=='II'&&mark!=='MM')throw new Error('This file is not a TIFF: it does not start as one.');
    const little=mark==='II',view=(b:Uint8Array)=>new DataView(b.buffer,b.byteOffset,b.byteLength);
    const version=view(head).getUint16(2,little),big=version===43;
    if(version!==42&&!big)throw new Error('This file is not a TIFF: it does not start as one.');
    const u64=(v:DataView,at:number)=>Number(v.getBigUint64(at,little));
    const ifd=big?u64(view(head),8):view(head).getUint32(4,little);
    const entrySize=big?20:12,countSize=big?8:2;
    let dir=ifd+countSize+entrySize*4096<=head.length?head.subarray(ifd):await read(ifd,countSize);
    const n=big?u64(view(dir),0):view(dir).getUint16(0,little);
    if(dir.length<countSize+n*entrySize)dir=await read(ifd,countSize+n*entrySize);
    const v=view(dir),entries=new Map<number,Entry>();
    for(let i=0;i<n;i++){
      const at=countSize+i*entrySize,tag=v.getUint16(at,little),type=v.getUint16(at+2,little);
      const count=big?u64(v,at+4):v.getUint32(at+4,little),size=(TYPE_SIZE[type]??1)*count,valueAt=at+(big?12:8);
      const room=big?8:4;
      entries.set(tag,size<=room?{type,count,inline:dir.slice(valueAt,valueAt+size),offset:0}
        :{type,count,offset:big?u64(v,valueAt):v.getUint32(valueAt,little)});
    }
    const header=new TiffHeader(read,little,entries,new Map());
    // The small values now, from the bytes already read where they lie there.
    for(const [tag,e] of entries){
      const size=(TYPE_SIZE[e.type]??1)*e.count;
      if(e.inline)header.loaded.set(tag,header.decode(e.type,e.count,e.inline));
      else if(size<=65536&&e.offset+size<=head.length)header.loaded.set(tag,header.decode(e.type,e.count,head.subarray(e.offset,e.offset+size)));
    }
    for(const [tag,e] of entries)if(!header.loaded.has(tag)&&(TYPE_SIZE[e.type]??1)*e.count<=65536)await header.value(tag);
    head=new Uint8Array(0);
    return header;
  }

  private decode(type:number,count:number,bytes:Uint8Array):TagValue{
    if(type===2)return new TextDecoder('utf-8').decode(bytes);
    const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),l=this.little,out:number[]=new Array(count);
    for(let i=0;i<count;i++)out[i]=type===1||type===7?v.getUint8(i):type===6?v.getInt8(i):type===3?v.getUint16(i*2,l)
      :type===8?v.getInt16(i*2,l):type===4?v.getUint32(i*4,l):type===9?v.getInt32(i*4,l):type===11?v.getFloat32(i*4,l)
      :type===12?v.getFloat64(i*8,l):type===16||type===18?Number(v.getBigUint64(i*8,l)):type===17?Number(v.getBigInt64(i*8,l))
      :type===5?v.getUint32(i*8,l)/v.getUint32(i*8+4,l):type===10?v.getInt32(i*8,l)/v.getInt32(i*8+4,l):NaN;
    return count===1&&type!==5&&type!==10?out[0]!:out;
  }

  has(name:keyof typeof TAGS|number):boolean{return this.entries.has(typeof name==='number'?name:TAGS[name]!);}
  /** A tag's value, read now if it was too large to read with the directory. */
  async value(name:keyof typeof TAGS|number):Promise<TagValue|undefined>{
    const tag=typeof name==='number'?name:TAGS[name]!,e=this.entries.get(tag);
    if(!e)return undefined;
    if(!this.loaded.has(tag)){const size=(TYPE_SIZE[e.type]??1)*e.count;this.loaded.set(tag,this.decode(e.type,e.count,await this.read(e.offset,size)));}
    return this.loaded.get(tag);
  }
  /** A tag already read with the directory. */
  get(name:keyof typeof TAGS):TagValue|undefined{return this.loaded.get(TAGS[name]!);}
  private first(name:keyof typeof TAGS,otherwise:number):number{const v=this.get(name);return typeof v==='number'?v:Array.isArray(v)&&v.length?v[0]!:otherwise;}

  get width():number{return this.first('ImageWidth',0);}
  get height():number{return this.first('ImageLength',0);}
  get samplesPerPixel():number{return this.first('SamplesPerPixel',1);}
  get bitsPerSample():number{return this.first('BitsPerSample',1);}
  get sampleFormat():number{return this.first('SampleFormat',1);}
  get photometric():number|undefined{const v=this.get('PhotometricInterpretation');return typeof v==='number'?v:undefined;}
  get compression():number{return this.first('Compression',1);}
  get tiled():boolean{return this.has('TileWidth');}
  get blockWidth():number{return this.tiled?this.first('TileWidth',this.width):this.width;}
  get blockHeight():number{return this.tiled?this.first('TileLength',this.height):Math.min(this.first('RowsPerStrip',this.height),this.height);}
  get bytesPerPixel():number{
    const bits=this.get('BitsPerSample'),list=Array.isArray(bits)?bits:[typeof bits==='number'?bits:1];
    return list.reduce((a,b)=>a+Math.ceil(b/8),0);
  }
  /** The model's origin, as geotiff.js gave it: the tie point's x and y. */
  get origin():[number,number]{
    const tie=this.get('ModelTiepoint'),m=this.get('ModelTransformation');
    if(Array.isArray(tie)&&tie.length===6)return [tie[3]!,tie[4]!];
    if(Array.isArray(m))return [m[3]!,m[7]!];
    throw new Error('This GeoTIFF has no tie point: it is not placed on the ground.');
  }
  get resolution():[number,number]{
    const s=this.get('ModelPixelScale'),m=this.get('ModelTransformation');
    if(Array.isArray(s))return [s[0]!,-s[1]!];
    if(Array.isArray(m))return [m[0]!,m[5]!];
    throw new Error('This GeoTIFF has no pixel scale: its cell size is not stated.');
  }
  /** The GeoKeys by name, their values as numbers, a number list, or text. */
  get geoKeys():Record<string,unknown>{
    const dir=this.get('GeoKeyDirectory');if(!Array.isArray(dir))return {};
    const doubles=this.get('GeoDoubleParams'),ascii=this.get('GeoAsciiParams'),out:Record<string,unknown>={};
    for(let i=4;i<=dir[3]!*4;i+=4){
      const key=dir[i]!,location=dir[i+1]!,count=dir[i+2]!,offset=dir[i+3]!,name=GEOKEY_NAMES[key]??String(key);
      if(location===0)out[name]=offset;
      else if(location===TAGS.GeoDoubleParams){const list=Array.isArray(doubles)?doubles:[doubles as number];out[name]=count===1?list[offset]:list.slice(offset,offset+count);}
      else if(location===TAGS.GeoAsciiParams&&typeof ascii==='string')out[name]=ascii.substring(offset,offset+count-1);
    }
    return out;
  }
  /** GDAL's no-data value, as geotiff.js read it: the text less its last character, as a number. */
  get gdalNoData():number|null{const s=this.get('GDAL_NODATA');return typeof s==='string'&&s?Number(s.substring(0,s.length-1)):null;}
  /** GDAL's metadata items: the dataset's, or one band's (from 0). */
  gdalMetadata(sample:number|null=null):Record<string,string>|null{
    const s=this.get('GDAL_METADATA');if(typeof s!=='string')return null;
    const out:Record<string,string>={};
    for(const m of s.matchAll(/<Item\b([^>]*)>([\s\S]*?)<\/Item>/g)){
      const attr=(n:string)=>new RegExp(`\\b${n}="([^"]*)"`).exec(m[1]!)?.[1];
      const at=attr('sample');
      if(sample===null?at!==undefined:Number(at)!==sample)continue;
      out[attr('name')??'']=m[2]!;
    }
    return out;
  }
  get description():string{const v=this.get('ImageDescription');return typeof v==='string'?v:'';}
}
