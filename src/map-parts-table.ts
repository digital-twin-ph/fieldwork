/** THE TABLE UNDER THE MAP. The practitioner, 2026-11-14, chose it over a popup with every attribute: a map shows a
 *  polygon's name, key and shaded value, and a district's other attributes, its zonal statistics among them, reached
 *  no surface a reader could see. One row per place, every attribute the polygons carry as the file or the join
 *  spells it, linked to the map: choosing a row marks its place, choosing a place marks its row.
 *
 *  ONE ROW PER PLACE, NOT PER PART, as the shading counts them: Bonthe's 83 islands are one district. */
export type Cell=string|number|boolean|null;
export interface PartsTable {columns:string[]; rows:{id:string;name:string;cells:Record<string,Cell>}[]}

/** The places and their attributes, or null where no polygon carries any attribute (a catchment, a drawn area). */
export function partsTable(features:readonly {id:string;name:string;properties?:Record<string,unknown>}[]):PartsTable|null{
  const seen=new Set<string>(),columns:string[]=[];
  const rows:PartsTable['rows']=[];
  for(const f of features){
    const id=String(f.id);if(seen.has(id))continue;seen.add(id);
    const properties=f.properties??{},cells:Record<string,Cell>={};
    for(const [key,value] of Object.entries(properties)){
      if(value!==null&&typeof value==='object')continue;
      if(!columns.includes(key))columns.push(key);
      cells[key]=value===undefined?null:value as Cell;
    }
    rows.push({id,name:String(f.name),cells});
  }
  if(!columns.length)return null;
  return {columns,rows};
}

const isNumber=(v:Cell)=>typeof v==='number'||(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v)));

/** Rows ordered by a column: numbers as numbers, the rest as text, an empty cell last either way. */
export function sortedRows(table:PartsTable,column:string,direction:'ascending'|'descending'):PartsTable['rows']{
  const sign=direction==='ascending'?1:-1;
  return [...table.rows].sort((a,b)=>{
    const x=a.cells[column]??null,y=b.cells[column]??null;
    if(x===null||x==='')return y===null||y===''?0:1;
    if(y===null||y==='')return -1;
    return sign*(isNumber(x)&&isNumber(y)?Number(x)-Number(y):String(x).localeCompare(String(y)));
  });
}

/** The table's markup. Each row names its place in `data-map-part`, which the map's polygons carry too. */
export function partsTableMarkup(table:PartsTable,esc:(s:string)=>string,
  options:{sort?:{column:string;direction:'ascending'|'descending'};chosen?:string|null;caption?:string}={}):string{
  const rows=options.sort?sortedRows(table,options.sort.column,options.sort.direction):table.rows;
  const numeric=new Set(table.columns.filter(c=>table.rows.some(r=>isNumber(r.cells[c]??null))
    &&table.rows.every(r=>{const v=r.cells[c]??null;return v===null||v===''||isNumber(v);})));
  const head=table.columns.map(c=>{
    const active=options.sort?.column===c?options.sort.direction:'none';
    const next=active==='ascending'?'descending':'ascending';
    return `<th scope="col" aria-sort="${active}"><button type="button" data-parts-sort="${esc(c)}" data-parts-direction="${next}">`
      +`${esc(c)}<span aria-hidden="true" class="sort-mark">${active==='ascending'?' ▲':active==='descending'?' ▼':''}</span></button></th>`;
  }).join('');
  const body=rows.map(r=>`<tr data-map-part="${esc(r.id)}" tabindex="0"${options.chosen===r.id?' aria-selected="true" class="chosen"':''}>`
    +table.columns.map(c=>{const v=r.cells[c]??null;
      return `<td${numeric.has(c)?' class="number"':''}>${v===null?'':esc(String(v))}</td>`;}).join('')+'</tr>').join('');
  return `<p class="map-parts-caption">${esc(options.caption??`Attributes of the ${table.rows.length.toLocaleString('en')} places`)}</p>`
    +`<div class="map-parts-scroll"><table class="map-parts-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
