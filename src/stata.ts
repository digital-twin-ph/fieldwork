import type {CSVTable} from './input-data.js';

/** A STATA FILE READ AS A TABLE, so a practitioner imports what Stata wrote rather than an export of it.
 *
 *  The practitioner, 2026-11-03: *"Can we add Stata input for table input?"*, while building the London example,
 *  whose data the authors published as `londondataset2002_2006.dta`. Formats 113 to 115 (Stata 8 to 12) and 117 to
 *  119 (Stata 13 onward) are read.
 *
 *  WHAT IS READ AS IT IS AND WHAT IS NOT:
 *  - Numbers are as stored. A single-precision number is written with nine significant figures, which keeps every
 *    stored value exactly; a double with as many digits as it needs.
 *  - Stata's missing values, `.` and `.a` to `.z`, become empty. Never zero.
 *  - A variable Stata formats as a date (`%td`, or `%d` in older files) is read as the date it is, because the file
 *    itself says so. A datetime (`%tc`) is read as a date and time. Other formats are left as numbers.
 *  - VALUE LABELS ARE NOT APPLIED. A labelled code stays the code, and `notes` says which variables carry labels.
 *    Replacing codes with labels would relabel the data on the reader's behalf. */
/** `labels` are the variable labels Stata keeps for each column, in column order; empty where there is none. They
 *  describe the column, which experiment 172 offers as a proposal for what it means. */
export interface StataTable extends CSVTable {format:number; notes:string[]; labels:string[]}

const MISSING={byte:100,int:32740,long:2147483620,float:1.701e38,double:8.988e307} as const;
const DAY=86_400_000,STATA_EPOCH=Date.UTC(1960,0,1);

type Kind={str:number}|'strL'|'byte'|'int'|'long'|'float'|'double';
const width=(k:Kind):number=>typeof k==='object'?k.str:k==='strL'?8:k==='byte'?1:k==='int'?2:k==='long'?4:k==='float'?4:8;

export function readStata(bytes:Uint8Array):StataTable{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const ascii=(from:number,length:number)=>{
    let end=from;while(end<from+length&&bytes[end]!==0)end++;
    return new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(from,end));
  };
  const modern=ascii(0,11)==='<stata_dta>';
  return modern?readModern(bytes,view,ascii):readOld(bytes,view,ascii);
}

function cellsOf(bytes:Uint8Array,view:DataView,little:boolean,kinds:Kind[],formats:string[],from:number,
  nobs:number,ascii:(f:number,l:number)=>string,strl:(at:number)=>string):string[][]{
  const rows:string[][]=[];let at=from;
  for(let r=0;r<nobs;r++){
    const row:string[]=[];
    kinds.forEach((kind,i)=>{
      const fmt=formats[i]??'';
      if(typeof kind==='object'){row.push(ascii(at,kind.str));at+=kind.str;return;}
      if(kind==='strL'){row.push(strl(at));at+=8;return;}
      let v:number;
      if(kind==='byte'){v=view.getInt8(at);if(v>MISSING.byte){row.push('');at+=1;return;}}
      else if(kind==='int'){v=view.getInt16(at,little);if(v>MISSING.int){row.push('');at+=2;return;}}
      else if(kind==='long'){v=view.getInt32(at,little);if(v>MISSING.long){row.push('');at+=4;return;}}
      else if(kind==='float'){v=view.getFloat32(at,little);if(v>MISSING.float||Number.isNaN(v)){row.push('');at+=4;return;}}
      else{v=view.getFloat64(at,little);if(v>MISSING.double||Number.isNaN(v)){row.push('');at+=8;return;}}
      at+=width(kind);
      if(/^%-?t?d/.test(fmt)){
        row.push(new Date(STATA_EPOCH+Math.round(v)*DAY).toISOString().slice(0,10));return;}
      if(/^%-?tc/i.test(fmt)){row.push(new Date(STATA_EPOCH+v).toISOString().replace('.000Z','Z'));return;}
      row.push(kind==='float'?String(Number(v.toPrecision(9))):String(v));
    });
    rows.push(row);
  }
  return rows;
}

/** Formats 113 to 115: a fixed header, then descriptors, expansion fields, the records and any value labels. */
function readOld(bytes:Uint8Array,view:DataView,ascii:(f:number,l:number)=>string):StataTable{
  const format=bytes[0]!;
  if(format<113||format>115)throw new Error(`This is Stata format ${format}, which is not read here. Formats 113 to 115 and 117 to 119 are, `
    +'which covers Stata 8 onward. Save it from Stata again, or export it as CSV.');
  const little=bytes[1]===2;
  const nvar=view.getUint16(4,little),nobs=view.getUint32(6,little);
  let p=109;
  const code=[...bytes.subarray(p,p+nvar)];p+=nvar;
  const kinds:Kind[]=code.map(c=>c<=244?{str:c}:c===251?'byte':c===252?'int':c===253?'long':c===254?'float':'double');
  const headers=Array.from({length:nvar},(_,i)=>ascii(p+33*i,33));p+=33*nvar;
  p+=2*(nvar+1);
  const fmtWidth=format===113?12:49;
  const formats=Array.from({length:nvar},(_,i)=>ascii(p+fmtWidth*i,fmtWidth));p+=fmtWidth*nvar;
  const labelled=Array.from({length:nvar},(_,i)=>ascii(p+33*i,33));p+=33*nvar;
  const labels=Array.from({length:nvar},(_,i)=>ascii(p+81*i,81));p+=81*nvar;
  // THE RECORDS. Expansion fields are walked; where a writer has laid them out otherwise, the records are the
  // last nobs x record bytes, which holds only when nothing follows them, so that is checked.
  const record=kinds.reduce((sum,k)=>sum+width(k),0);
  let start=p,walked=true;
  while(true){
    if(start+5>bytes.length){walked=false;break;}
    const type=bytes[start]!,length=view.getUint32(start+1,little);
    if(type===0&&length===0){start+=5;break;}
    if(type===0||start+5+length>bytes.length){walked=false;break;}
    start+=5+length;
  }
  const hasLabels=labelled.some(Boolean);
  if(!walked||start+nobs*record>bytes.length){
    if(hasLabels)throw new Error('This Stata file\'s layout could not be read. Export it from Stata as CSV.');
    start=bytes.length-nobs*record;
  }
  const rows=cellsOf(bytes,view,little,kinds,formats,start,nobs,ascii,()=>'');
  return {headers,rows,format,notes:labelNotes(headers,labelled),labels};
}

/** Formats 117 to 119: tagged sections, located through the map. */
function readModern(bytes:Uint8Array,view:DataView,ascii:(f:number,l:number)=>string):StataTable{
  const text=(from:number,to:number)=>new TextDecoder().decode(bytes.subarray(from,to));
  const find=(tag:string,from=0)=>{const t=new TextEncoder().encode(tag);
    outer:for(let i=from;i<=bytes.length-t.length;i++){for(let j=0;j<t.length;j++)if(bytes[i+j]!==t[j])continue outer;return i;}
    return -1;};
  const release=Number(text(find('<release>')+9,find('</release>')));
  if(![117,118,119].includes(release))throw new Error(`This is Stata format ${release}, which is not read here.`);
  const little=text(find('<byteorder>')+11,find('</byteorder>'))==='LSF';
  const kAt=find('<K>')+3,nAt=find('<N>')+3;
  const nvar=release===119?view.getUint32(kAt,little):view.getUint16(kAt,little);
  const nobs=release===117?view.getUint32(nAt,little):Number(view.getBigUint64(nAt,little));
  const map=find('<map>')+5;
  const offset=(i:number)=>Number(view.getBigUint64(map+8*i,little));
  const nameWidth=release===117?33:129,fmtWidth=release===117?49:57;
  let p=offset(2)+'<variable_types>'.length;
  const kinds:Kind[]=Array.from({length:nvar},(_,i)=>{const c=view.getUint16(p+2*i,little);
    return c<=2045?{str:c}:c===32768?'strL':c===65526?'double':c===65527?'float':c===65528?'long':c===65529?'int':'byte';});
  p=offset(3)+'<varnames>'.length;
  const headers=Array.from({length:nvar},(_,i)=>ascii(p+nameWidth*i,nameWidth));
  p=offset(5)+'<formats>'.length;
  const formats=Array.from({length:nvar},(_,i)=>ascii(p+fmtWidth*i,fmtWidth));
  p=offset(6)+'<value_label_names>'.length;
  const labelled=Array.from({length:nvar},(_,i)=>ascii(p+nameWidth*i,nameWidth));
  const labelWidth=release===117?81:321;
  p=offset(7)+'<variable_labels>'.length;
  const labels=Array.from({length:nvar},(_,i)=>ascii(p+labelWidth*i,labelWidth));
  // LONG STRINGS live in their own section, each keyed by variable and observation.
  const strls=new Map<string,string>();
  let s=offset(10)+'<strls>'.length;
  const oWidth=release===117?4:8;
  while(ascii(s,3)==='GSO'){
    const v=view.getUint32(s+3,little);
    const o=oWidth===4?view.getUint32(s+7,little):Number(view.getBigUint64(s+7,little));
    const type=bytes[s+7+oWidth]!,length=view.getUint32(s+8+oWidth,little);
    const body=bytes.subarray(s+12+oWidth,s+12+oWidth+length);
    strls.set(`${v}:${o}`,new TextDecoder().decode(type===130&&body.at(-1)===0?body.subarray(0,-1):body));
    s+=12+oWidth+length;
  }
  const strl=(at:number)=>{
    const v=release===117?view.getUint32(at,little):view.getUint16(at,little);
    const o=release===117?view.getUint32(at+4,little):Number(view.getBigUint64(at,little)>>16n);
    return v===0&&o===0?'':strls.get(`${v}:${o}`)??'';
  };
  const rows=cellsOf(bytes,view,little,kinds,formats,offset(9)+'<data>'.length,nobs,ascii,strl);
  return {headers,rows,format:release,notes:labelNotes(headers,labelled),labels};
}

const labelNotes=(headers:string[],labelled:string[])=>{
  const named=headers.filter((_,i)=>labelled[i]);
  return named.length?[`Value labels are not applied: ${named.join(', ')} ${named.length===1?'keeps its':'keep their'} `
    +'codes as stored.']:[];
};
