import test from 'node:test';
import assert from 'node:assert/strict';
import {readStata} from '../build/stata.js';

/** STATA FILES READ AS STATA WROTE THEM. Both layouts are written here byte by byte, so the test depends on no
 *  one's data: format 115 (Stata 12) and format 118 (Stata 14 onward). */
const vars=[
  {name:'date',type:'float',fmt:'%td',values:[15341,15342,null]},
  {name:'ozone',type:'float',fmt:'%9.0g',values:[4.58622456,null,12.5]},
  {name:'deaths',type:'int',fmt:'%9.0g',values:[199,231,210]},
  {name:'site',type:{str:6},fmt:'%6s',values:['London','Kent','']},
  {name:'level',type:'double',fmt:'%10.0g',values:[0.1,null,1e10]},
];
const pad=(text,width)=>{const b=Buffer.alloc(width);b.write(text,'latin1');return b;};
const cell=(v,type)=>{
  if(typeof type==='object')return pad(v??'',type.str);
  const b=Buffer.alloc(type==='int'?2:type==='float'?4:8);
  if(type==='int')b.writeInt16LE(v===null?32741:v);
  else if(type==='float')b.writeFloatLE(v===null?1.7015e38*1.0001:v);
  else b.writeDoubleLE(v===null?8.99e307:v);
  return b;
};
const records=()=>Buffer.concat([0,1,2].flatMap(r=>vars.map(v=>cell(v.values[r],v.type))));

function format115(labelled=false){
  const head=Buffer.alloc(109);head[0]=115;head[1]=2;head[2]=1;head.writeUInt16LE(vars.length,4);head.writeUInt32LE(3,6);
  const types=Buffer.from(vars.map(v=>typeof v.type==='object'?v.type.str:v.type==='int'?252:v.type==='float'?254:255));
  return Buffer.concat([head,types,...vars.map(v=>pad(v.name,33)),Buffer.alloc(2*(vars.length+1)),
    ...vars.map(v=>pad(v.fmt,49)),...vars.map((v,i)=>pad(labelled&&i===2?'deathlbl':'',33)),Buffer.alloc(5),records()]);
}
function format118(){
  const tag=t=>Buffer.from(t,'latin1');
  const header=Buffer.concat([tag('<stata_dta><header><release>118</release><byteorder>LSF</byteorder><K>'),
    (()=>{const b=Buffer.alloc(2);b.writeUInt16LE(vars.length);return b;})(),tag('</K><N>'),
    (()=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(3n);return b;})(),tag('</N><label>'),Buffer.alloc(2),
    tag('</label><timestamp>'),Buffer.alloc(1),tag('</timestamp></header>')]);
  const sections=[];const offsets=new Array(14).fill(0);
  const types=Buffer.concat(vars.map(v=>{const b=Buffer.alloc(2);b.writeUInt16LE(typeof v.type==='object'?v.type.str:v.type==='int'?65529:v.type==='float'?65527:65526);return b;}));
  const parts=[['variable_types',types,2],['varnames',Buffer.concat(vars.map(v=>pad(v.name,129))),3],
    ['sortlist',Buffer.alloc(2*(vars.length+1)),4],['formats',Buffer.concat(vars.map(v=>pad(v.fmt,57))),5],
    ['value_label_names',Buffer.alloc(129*vars.length),6],['variable_labels',Buffer.alloc(321*vars.length),7],
    ['characteristics',Buffer.alloc(0),8],['data',records(),9],['strls',Buffer.alloc(0),10],['value_labels',Buffer.alloc(0),11]];
  const mapLength=tag('<map>').length+14*8+tag('</map>').length;
  let at=header.length+mapLength;
  for(const [name,body,index] of parts){offsets[index]=at;const s=Buffer.concat([tag(`<${name}>`),body,tag(`</${name}>`)]);sections.push(s);at+=s.length;}
  offsets[1]=header.length;offsets[12]=at;offsets[13]=at+tag('</stata_dta>').length;
  const map=Buffer.alloc(14*8);offsets.forEach((o,i)=>map.writeBigUInt64LE(BigInt(o),8*i));
  return Buffer.concat([header,tag('<map>'),map,tag('</map>'),...sections,tag('</stata_dta>')]);
}

for(const [name,make] of [['115',format115],['118',format118]])
  test(`format ${name}: dates, numbers, text and missing values read as Stata wrote them`,()=>{
    const t=readStata(new Uint8Array(make()));
    assert.equal(t.format,Number(name));
    assert.deepEqual(t.headers,['date','ozone','deaths','site','level']);
    assert.deepEqual(t.rows[0],['2002-01-01','4.58622456','199','London','0.1']);
    assert.deepEqual(t.rows[1],['2002-01-02','','231','Kent','']);
    assert.deepEqual(t.rows[2],['','12.5','210','','10000000000']);
    assert.deepEqual(t.notes,[]);
  });

test('value labels are not applied, and the import says which variables carry them',()=>{
  const t=readStata(new Uint8Array(format115(true)));
  assert.equal(t.rows[0][2],'199');
  assert.match(t.notes[0],/deaths keeps its codes as stored/);
});

test('a format this reader does not know is refused with what to do instead',()=>{
  const old=Buffer.alloc(200);old[0]=105;
  assert.throws(()=>readStata(new Uint8Array(old)),/format 105.*export it as CSV/s);
});
