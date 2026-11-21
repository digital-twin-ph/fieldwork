/** THE DHIS2 TAB OF TABULAR DATA (2026-11-20): a server's address, a token from Credentials, then what to read, in four
 *  short steps, each said as it is done. The table it reads goes through the dialog's own reading, as any file does, and
 *  the step records the server and the request it came from. The token is chosen by name and resolved only to make a
 *  request; it is never written into the dialog, the table or the project. */
import {serverBase,systemVersion,searchItems,orgUnitLevels,analyticsTable,DHIS2_PERIODS,type Dhis2Connection,type Dhis2Item} from './dhis2-source.js';

export interface Dhis2Kit {
  esc:(s:string)=>string;
  /** The DHIS2 tokens in Credentials, by name: never the secrets. Empty while Credentials are locked. */
  tokens:()=>{ref:string;label:string;origin:string}[];
  /** One token's secret for a server's origin, to make a request; throws where none is held for it. */
  resolve:(ref:string,origin:string)=>string;
  /** The table read, handed to the dialog's own reading, with where it came from. */
  read:(csv:string,filename:string,provenance:import('./input-provenance.js').InputProvenance)=>Promise<void>;
}
export function dhis2Markup(esc:(s:string)=>string):string{
  return '<p class="muted">A DHIS2 server’s analytics, read with a personal access token held in Credentials (provider <code>dhis2</code>, '
    +'origin the server’s address). The server must list this page’s address in its CORS allowlist; if it does not, export a '
    +'table from DHIS2 and read it under Your file.</p>'
    +'<div class="field"><label class="field-label" for="dhis2-address">Server address</label>'
    +'<input id="dhis2-address" type="url" placeholder="https://dhis2.example.org"></div>'
    +'<div class="field"><label class="field-label" for="dhis2-token">Token, from Credentials</label><select id="dhis2-token"></select></div>'
    +'<p><button type="button" class="button" id="dhis2-connect">Connect</button></p>'
    +'<div id="dhis2-choose" hidden>'
    +'<div class="field"><label class="field-label" for="dhis2-search">Find data elements and indicators by name</label>'
    +'<input id="dhis2-search" placeholder="measles"> <button type="button" class="button" id="dhis2-find">Find</button></div>'
    +'<fieldset id="dhis2-items"><legend>Data to read</legend></fieldset>'
    +'<div class="field"><label class="field-label" for="dhis2-level">For each unit at</label><select id="dhis2-level"></select></div>'
    +'<div class="field"><label class="field-label" for="dhis2-period">Periods</label><select id="dhis2-period">'
    +DHIS2_PERIODS.map(p=>`<option value="${p.id}">${esc(p.label)}</option>`).join('')+'</select></div>'
    +'<p><button type="button" class="button primary" id="dhis2-read">Read the table</button></p></div>'
    +'<p id="dhis2-says" class="muted" role="status"></p>';
}
export function wireDhis2(root:ParentNode,kit:Dhis2Kit,fail:(e:unknown)=>void):void{
  const q=<T extends Element>(s:string)=>root.querySelector<T>(s)!;
  const says=q<HTMLElement>('#dhis2-says'),token=q<HTMLSelectElement>('#dhis2-token'),address=q<HTMLInputElement>('#dhis2-address');
  const chosen=new Map<string,Dhis2Item>();let connection:Dhis2Connection|undefined;
  const fillTokens=()=>{const held=kit.tokens();
    token.innerHTML=held.length?held.map(t=>`<option value="${kit.esc(t.ref)}">${kit.esc(`${t.label} · ${t.origin}`)}</option>`).join('')
      :'<option value="">No DHIS2 token in Credentials, or they are locked</option>';};
  fillTokens();token.onfocus=fillTokens;
  const showItems=(found:Dhis2Item[])=>{
    const box=q<HTMLFieldSetElement>('#dhis2-items');
    const all=[...chosen.values(),...found.filter(f=>!chosen.has(f.id))];
    box.innerHTML='<legend>Data to read</legend>'+(all.length?all.map(i=>`<label class="check"><input type="checkbox" value="${kit.esc(i.id)}"${chosen.has(i.id)?' checked':''}> `
      +`${kit.esc(i.name)} <span class="muted">(${kit.esc(i.type)})</span></label>`).join(''):'<p class="muted">Nothing found by that name.</p>');
    box.querySelectorAll<HTMLInputElement>('input').forEach(b=>b.onchange=()=>{const item=all.find(i=>i.id===b.value)!;
      if(b.checked)chosen.set(item.id,item);else chosen.delete(item.id);});
  };
  q<HTMLButtonElement>('#dhis2-connect').onclick=async()=>{
    try{
      const base=serverBase(address.value);
      // THE TOKENS AS THEY ARE NOW (2026-11-20): one added or unlocked with this dialog open was not listed until the list
      // was clicked, and Connect said there was none.
      const was=token.value;fillTokens();if(was&&[...token.options].some(o=>o.value===was))token.value=was;
      if(!token.value)throw new Error('No DHIS2 token to use. Open Credentials: unlock them, or add the token with provider dhis2 and, as its origin, '
        +`${new URL(base).origin}.`);
      // THE TOKEN IS FOR ONE ADDRESS: said plainly where it is for another, which Credentials only call "unavailable".
      const held=kit.tokens().find(t=>t.ref===token.value),origin=new URL(base).origin;
      if(held&&held.origin!==origin)throw new Error(`The token “${held.label}” is for ${held.origin}, not ${origin}. `
        +`Type that address, or add the token in Credentials with ${origin} as its origin.`);
      const c={base,token:kit.resolve(token.value,origin)};
      says.textContent=`Connecting to ${new URL(base).host}…`;
      const [version,levels]=await Promise.all([systemVersion(c),orgUnitLevels(c)]);
      connection=c;
      q<HTMLSelectElement>('#dhis2-level').innerHTML=levels.map(l=>`<option value="${l.level}"${l.level===Math.min(2,levels.length)?' selected':''}>${kit.esc(l.name)} (level ${l.level})</option>`).join('');
      q<HTMLElement>('#dhis2-choose').hidden=false;
      says.textContent=`Connected: DHIS2 ${version} at ${new URL(base).host}, ${levels.length} levels of organisation units.`;
    }catch(e){connection=undefined;q<HTMLElement>('#dhis2-choose').hidden=true;says.textContent='';fail(e);}
  };
  q<HTMLButtonElement>('#dhis2-find').onclick=async()=>{
    if(!connection)return;
    try{says.textContent='Finding…';const found=await searchItems(connection,q<HTMLInputElement>('#dhis2-search').value);
      showItems(found);says.textContent=`${found.length} found.`;}catch(e){fail(e);}
  };
  q<HTMLButtonElement>('#dhis2-read').onclick=async()=>{
    if(!connection)return;
    try{
      const period=q<HTMLSelectElement>('#dhis2-period').value,level=Number(q<HTMLSelectElement>('#dhis2-level').value);
      says.textContent='Reading the table…';
      const got=await analyticsTable(connection,[...chosen.keys()],period,level);
      if(!got.rows)throw new Error('The server has no values for these data, periods and units.');
      const host=new URL(connection.base).host,at=new Date().toISOString();
      const provenance={what:`DHIS2 analytics: ${[...chosen.values()].map(i=>i.name).join('; ')}, by ${q<HTMLSelectElement>('#dhis2-level').selectedOptions[0]?.textContent??'unit'}, ${period}`,
        source:`DHIS2 at ${connection.base}`,url:connection.base+got.request,retrieved:at,
        // The server's answer states no terms: the country's own data policy governs them, and is the person's to state.
        licence:'not stated by the server'};
      await kit.read(got.csv,`dhis2-${host}-${at.slice(0,10)}.csv`,provenance);
      says.textContent=`${got.rows.toLocaleString('en')} rows read from ${host}: one per data, period and unit. Choose how to read them below.`;
    }catch(e){fail(e);}
  };
}
