/** A DHIS2 SERVER, READ AS A TABLE (2026-11-20). The practitioner: *"it is a source of tabular data where countries have
 *  DHIS2 based surveillance"*. Its Web API, with a personal access token held in Credentials and sent as `ApiToken`:
 *  the server's version; data elements and indicators found by name; its organisation unit levels; and analytics for
 *  the items chosen, by period and unit, written as a CSV the Tabular data dialog reads as it reads any file. A page can
 *  call a server only where the server lists the page's address in its CORS allowlist, which its administrator sets. */
export interface Dhis2Connection {base:string;token:string}
export interface Dhis2Item {id:string;name:string;type:string}
export interface Dhis2Level {level:number;name:string}
export const DHIS2_PERIODS:readonly {id:string;label:string}[]=[
  {id:'LAST_12_MONTHS',label:'The last 12 months, by month'},{id:'LAST_4_QUARTERS',label:'The last 4 quarters'},
  {id:'LAST_52_WEEKS',label:'The last 52 weeks, by week'},{id:'THIS_YEAR',label:'This year'},{id:'LAST_YEAR',label:'Last year'},
  {id:'LAST_5_YEARS',label:'The last 5 years, by year'}];

/** The server's address as typed, without a trailing slash or /api: "https://dhis2.example.org/dhis". */
export function serverBase(typed:string):string{
  // SAID, NOT "Invalid URL" (2026-11-20): an empty box, or an address without its https://, is named.
  const said=typed.trim();
  if(!said)throw new Error('Type the server’s address, for example https://dhis2.example.org, or http://127.0.0.1:8080 for a server on this computer.');
  let url:URL;
  try{url=new URL(said);}catch{throw new Error(`“${said}” is not a whole address: start it with https://, or http:// for a server on this computer.`);}
  if(!/^https?:$/.test(url.protocol))throw new Error('Give the server’s address, starting https://.');
  return url.href.replace(/\/+$/,'').replace(/\/api$/,'');
}
async function get(c:Dhis2Connection,path:string):Promise<unknown>{
  let response:Response;
  try{response=await fetch(c.base+path,{headers:{Authorization:`ApiToken ${c.token}`,Accept:'application/json'}});}
  catch{throw new Error(`${new URL(c.base).host} could not be reached from this page. A DHIS2 server answers a page only if its `
    +'administrator lists the page’s address in the CORS allowlist (System Settings, Access); otherwise export a table from '
    +'DHIS2 and read it under Your file.');}
  if(response.status===401||response.status===403)throw new Error(`${new URL(c.base).host} refused the token (${response.status}). Check it in Credentials, or make a new one in DHIS2 (your profile, Personal access tokens).`);
  const body=await response.json().catch(()=>({})) as {message?:string};
  if(!response.ok)throw new Error(`${new URL(c.base).host} answered ${response.status}${body.message?`: ${body.message}`:''}.`);
  return body;
}
export async function systemVersion(c:Dhis2Connection):Promise<string>{
  return ((await get(c,'/api/system/info?fields=version')) as {version?:string}).version??'unknown';
}
/** Data elements and indicators whose name holds `query`, at most 25. */
export async function searchItems(c:Dhis2Connection,query:string):Promise<Dhis2Item[]>{
  const q=encodeURIComponent(query.trim());
  const [elements,indicators]=await Promise.all([
    get(c,`/api/dataElements?fields=id,displayName&filter=displayName:ilike:${q}&pageSize=25`),
    get(c,`/api/indicators?fields=id,displayName&filter=displayName:ilike:${q}&pageSize=25`)]);
  const list=(body:unknown,key:string,type:string)=>((body as Record<string,{id:string;displayName:string}[]>)[key]??[]).map(x=>({id:x.id,name:x.displayName,type}));
  return [...list(elements,'dataElements','data element'),...list(indicators,'indicators','indicator')].slice(0,25);
}
export async function orgUnitLevels(c:Dhis2Connection):Promise<Dhis2Level[]>{
  const body=await get(c,'/api/organisationUnitLevels?fields=level,displayName&order=level:asc&paging=false') as {organisationUnitLevels?:{level:number;displayName:string}[]};
  return (body.organisationUnitLevels??[]).map(l=>({level:l.level,name:l.displayName}));
}
const cell=(v:string)=>/[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;
/** Analytics for the items, period and level, under the token's own organisation units: one row per item, period and
 *  unit, with names and IDs, as CSV. */
export async function analyticsTable(c:Dhis2Connection,items:readonly string[],period:string,level:number):Promise<{csv:string;rows:number;request:string}>{
  if(!items.length)throw new Error('Choose at least one data element or indicator.');
  const request=`/api/analytics?dimension=dx:${items.join(';')}&dimension=pe:${encodeURIComponent(period)}`
    +`&dimension=ou:USER_ORGUNIT;LEVEL-${level}&displayProperty=NAME`;
  const body=await get(c,request) as {headers?:{name:string}[];rows?:string[][];metaData?:{items?:Record<string,{name?:string}>}};
  const at=(name:string)=>(body.headers??[]).findIndex(h=>h.name===name);
  const [dx,pe,ou,value]=['dx','pe','ou','value'].map(at);
  if([dx,pe,ou,value].some(i=>i===undefined||i<0))throw new Error('The server’s analytics answer had no data, period, unit and value columns.');
  const name=(id:string)=>body.metaData?.items?.[id]?.name??id;
  const lines=['data,data_id,period,period_id,org_unit,org_unit_id,value',
    ...(body.rows??[]).map(r=>[name(r[dx!]!),r[dx!]!,name(r[pe!]!),r[pe!]!,name(r[ou!]!),r[ou!]!,r[value!]??''].map(v=>cell(String(v))).join(','))];
  return {csv:lines.join('\n')+'\n',rows:(body.rows??[]).length,request};
}
