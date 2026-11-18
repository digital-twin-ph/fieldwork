/** A COORDINATE AS A TABLE WRITES IT, read as decimal degrees (the practitioner, 2026-11-18, of a USGS table of mining
 *  sites in DR Congo written as 05° 56' 00": "the more urgent thing is the degrees decimal conversion assuming the format
 *  is correct").
 *
 *  A decimal number is read as it is. Degrees, minutes and seconds (DMS), or degrees and decimal minutes, are converted:
 *  degrees + minutes/60 + seconds/3600, negative where the hemisphere is S or W or the text opens with a minus sign. The
 *  column is not rewritten: the converted value is the point's coordinate, and the column keeps the text as the file has
 *  it.
 *
 *  A DMS value with no hemisphere is converted as positive and said to be, because in DR Congo most latitudes are south
 *  and a missing S puts a site north of the equator. That is diagnosed, never refused. */

export interface ReadCoordinate {
  /** Decimal degrees, or null where the text is not a coordinate. */
  value:number|null;
  /** Converted from degrees, minutes and seconds, or degrees and decimal minutes. */
  dms:boolean;
  /** A hemisphere letter or a sign was written. Plain decimal numbers carry their sign, so they always state it. */
  hemisphereStated:boolean;
  /** Why it could not be read, where it could not. */
  reason?:string;
}

const DEGREE='[°º˚d]';
const MINUTE="['′’m]";
const SECOND='["″”s]|\'\'|′′';
/** Degrees, then optional minutes, then optional seconds, each marked, or the three separated by spaces or colons; a
 *  hemisphere letter before or after; a leading sign. */
const DMS=new RegExp(
  `^([NSEWnsew+\\-−])?\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*(?:${DEGREE}|\\s|:)\\s*`
  +`(?:(\\d{1,2}(?:\\.\\d+)?)\\s*(?:${MINUTE}|\\s|:)?\\s*)?`
  +`(?:(\\d{1,2}(?:\\.\\d+)?)\\s*(?:${SECOND})?\\s*)?`
  +`([NSEWnsew])?\\s*$`);

export function readCoordinate(text:string,axis:'x'|'y'):ReadCoordinate{
  const raw=text.trim();
  if(!raw)return {value:null,dms:false,hemisphereStated:false,reason:'empty'};
  // A plain decimal number, as most files write it.
  if(/^[+\-−]?\d+(\.\d+)?([eE][+\-]?\d+)?$/.test(raw)){
    const value=Number(raw.replace('−','-'));
    return {value,dms:false,hemisphereStated:true};
  }
  // A decimal number with a hemisphere letter: 5.9333 S, S 5.9333.
  const lettered=/^([NSEWnsew])?\s*(\d+(?:\.\d+)?)\s*°?\s*([NSEWnsew])?$/.exec(raw);
  if(lettered&&(lettered[1]||lettered[3])&&!(lettered[1]&&lettered[3])){
    return signed(Number(lettered[2]),(lettered[1]||lettered[3])!.toUpperCase(),axis,false);
  }
  const m=DMS.exec(raw);
  // DMS needs something that marks it as such: a degree, minute or second sign, a hemisphere, or more than one part.
  if(!m||!(/[°º˚'′’"″”]|[NSEWnsew]/.test(raw)||m[3]!==undefined))
    return {value:null,dms:false,hemisphereStated:false,reason:`"${raw}" is not a number or degrees, minutes and seconds`};
  const [,lead,d,mins,secs,trail]=m;
  if(lead&&/[NSEWnsew]/.test(lead)&&trail)return {value:null,dms:true,hemisphereStated:true,reason:`"${raw}" names two hemispheres`};
  const degrees=Number(d),minutes=mins===undefined?0:Number(mins),seconds=secs===undefined?0:Number(secs);
  if(minutes>=60||seconds>=60)return {value:null,dms:true,hemisphereStated:false,reason:`"${raw}" has minutes or seconds of 60 or more`};
  if((d!.includes('.')&&mins!==undefined)||(mins?.includes('.')&&secs!==undefined))
    return {value:null,dms:true,hemisphereStated:false,reason:`"${raw}" has a decimal part before its last part`};
  const magnitude=degrees+minutes/60+seconds/3600;
  const letter=(trail??(lead&&/[NSEWnsew]/.test(lead)?lead:undefined))?.toUpperCase();
  if(letter)return signed(magnitude,letter,axis,true);
  const negative=lead==='-'||lead==='−';
  return {value:negative?-magnitude:magnitude,dms:true,hemisphereStated:!!lead};
}

function signed(magnitude:number,letter:string,axis:'x'|'y',dms:boolean):ReadCoordinate{
  const ns=letter==='N'||letter==='S';
  if((axis==='x')===ns)return {value:null,dms,hemisphereStated:true,
    reason:`${letter} is a ${ns?'latitude':'longitude'} hemisphere, in the ${axis==='x'?'longitude':'latitude'} column`};
  return {value:letter==='S'||letter==='W'?-magnitude:magnitude,dms,hemisphereStated:true};
}

/** What a column's reading came to: how many values were converted from DMS, and how many of those stated no
 *  hemisphere. Said once, in the step's sentence, not per row. */
export interface CoordinateReport {dms:number; noHemisphere:number}
export function coordinateReport(values:readonly ReadCoordinate[]):CoordinateReport{
  return {dms:values.filter(v=>v.dms&&v.value!==null).length,
    noHemisphere:values.filter(v=>v.dms&&v.value!==null&&!v.hemisphereStated).length};
}
export function coordinateSentence(report:{x:CoordinateReport;y:CoordinateReport},xName:string,yName:string):string{
  const parts=[['x',report.x,xName],['y',report.y,yName]] as const;
  const read=parts.filter(([,r])=>r.dms).map(([,r,name])=>`${r.dms.toLocaleString('en-US')} values in "${name}"`);
  if(!read.length)return '';
  const unstated=parts.filter(([,r])=>r.noHemisphere).map(([axis,r,name])=>
    `${r.noHemisphere.toLocaleString('en-US')} in "${name}" state no hemisphere and are read as ${axis==='x'?'east':'north'}; `
    +`if they are ${axis==='x'?'west':'south'}, write ${axis==='x'?'W':'S'} or a minus sign in the file`);
  return ` Read as degrees, minutes and seconds and converted to decimal degrees: ${read.join(' and ')}.`
    +(unstated.length?` ${unstated.join('; ')}.`:'');
}
