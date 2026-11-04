/** AN EXCEL WORKBOOK'S SHEETS AS TABLES, for reading a data dictionary. Experiment 172.
 *
 *  The practitioner, 2026-11-04: *"data dictionary could be CSV, Stata or Excel."* The Salmonella example's codebook is
 *  `Codebook_Luczynska_et_al_2022.xlsx`. A workbook is a zip of XML: each sheet's cells, and the strings they share.
 *  Values are read as text, as written; formulas give their cached value; formatting is ignored. Read here without a
 *  library and without a DOM, so it runs wherever the table dialog does. */
import {unzipSync,strFromU8} from 'fflate';

export interface Sheet {name:string; headers:string[]; rows:string[][]}

const decode=(text:string)=>text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&amp;/g,'&');
/** All the text runs in an element, joined: a rich-text string is several `<t>` runs. */
const textOf=(xml:string)=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decode(m[1]!)).join('');
/** Column letters to a zero-based index: A is 0, Z 25, AA 26. */
const columnIndex=(letters:string)=>[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;

export function readXlsx(bytes:Uint8Array):Sheet[]{
  let files:Record<string,Uint8Array>;
  try{files=unzipSync(bytes);}catch{throw new Error('This is not an Excel workbook (.xlsx). An older .xls file needs saving as .xlsx or CSV first.');}
  const read=(path:string)=>files[path]?strFromU8(files[path]!):undefined;
  const workbook=read('xl/workbook.xml');
  if(!workbook)throw new Error('This zip is not an Excel workbook: it has no xl/workbook.xml.');
  const shared=[...(read('xl/sharedStrings.xml')??'').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>textOf(m[1]!));
  // Sheet names in workbook order, and the file each one lives in.
  const rels=new Map([...(read('xl/_rels/workbook.xml.rels')??'').matchAll(/<Relationship\b[^>]*>/g)].map(m=>{
    const id=/Id="([^"]+)"/.exec(m[0])?.[1],target=/Target="([^"]+)"/.exec(m[0])?.[1];
    return [id,target?.replace(/^\/?(xl\/)?/,'xl/')];}));
  const sheets=[...workbook.matchAll(/<sheet\b[^>]*>/g)].map(m=>({name:decode(/name="([^"]*)"/.exec(m[0])?.[1]??''),
    path:rels.get(/r:id="([^"]+)"/.exec(m[0])?.[1])}));
  return sheets.filter(s=>s.path&&files[s.path]).map(({name,path})=>{
    const grid:string[][]=[];
    for(const row of read(path!)!.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
      const cells:string[]=[];
      for(const cell of row[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
        const attrs=cell[1]!,body=cell[2]??'';
        const at=columnIndex(/r="([A-Z]+)\d+"/.exec(attrs)?.[1]??'A');
        const type=/t="([^"]+)"/.exec(attrs)?.[1];
        const value=/<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        cells[at]=type==='s'?shared[Number(value)]??'':type==='inlineStr'?textOf(body):value===undefined?'':decode(value);
      }
      grid.push(Array.from(cells,c=>c??''));
    }
    const width=Math.max(0,...grid.map(r=>r.length));
    const filled=grid.map(r=>Array.from({length:width},(_,i)=>(r[i]??'').trim()));
    const [headers=[],...rows]=filled;
    return {name,headers,rows:rows.filter(r=>r.some(Boolean))};
  });
}
