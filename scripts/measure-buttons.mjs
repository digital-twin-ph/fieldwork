/** BUTTONS BY ROLE, measured (the buttons-and-ports audit, 2026-11-27; the four roles adopted by the practitioner the same
 *  day). Every <button> written in index.html, src/*.ts and src/*.tsx, with its class and its label as written; a label
 *  built at run time is counted once, as written. Buttons drawn by a library are not seen.
 *
 *  Four roles, one style each, size set by where a button sits and never by role:
 *    Primary   `button primary`  the one action a surface is for, which commits
 *    Secondary `button`          every other action
 *    Danger    `button danger`   removes or discards
 *    Link      `text-button`     leads somewhere and changes nothing
 *  Controls that are not buttons in this sense (tabs, chips that filter, icon buttons, column sorts, the canvas's own) are
 *  counted apart and not judged.
 *
 *  Two counts: labels drawn in more than one role, and Primary buttons whose label does not commit (COMMITS below).
 *  Usage: node scripts/measure-buttons.mjs [--list] [--json] */
import {readFileSync,readdirSync} from 'node:fs';

const root=new URL('..',import.meta.url).pathname;
const files=['index.html',...readdirSync(`${root}src`).filter(f=>/\.tsx?$/.test(f)).map(f=>`src/${f}`)];
/** What a Primary button may say: each one commits, read against the code on 2026-11-27. Beyond the verbs:
 *  - Configure… and Review…, the step's one main action on the standard Inspector (the audit's finding 5), which opens
 *    the dialog where its settings are committed;
 *  - Open, in the identity and sealed-file dialogs, where opening the file with its passphrase is what the dialog does;
 *  - Print or save as PDF, and the encrypted download, which produce a file;
 *  - Same record and The same place, Deduplicate's decisions, each recorded as it is pressed. */
export const COMMITS=/^(Apply|Save|Run|Create|Add|Download|Export|Import|Publish|Unlock|Use|Place|Read|Write|Pin|Fetch|Find|Search|Prepare|Generate|Calculate|Compute|Commit|Seal|Make|Start|Load|Connect|Set|Record|Copy to|Replace|Restore|Accept|Confirm|Submit|Send|Upload|Open project|Open shared|Back up|Build|Configure|Review|Open$|Print|This project|Same record|The same place)/i;
const ROLE_OF=cls=>{
  const c=` ${cls} `;
  if(/ (tab|icon-button|column-sort|storage-pill|library-toggle|app-version|identity-button|node-alert-close|config-close|zoom|result-switch|avatar-option|chip) /.test(c)&&!/ button /.test(c))return 'control';
  if(/ danger /.test(c))return 'Danger';
  if(/ primary /.test(c))return 'Primary';
  if(/ (text-button|learn-link) /.test(c))return 'Link';
  if(/ button /.test(c))return 'Secondary';
  return 'unstyled';
};
const label=raw=>raw.replace(/<[^>]*>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\$\{[^}]*\}/g,'…').replace(/\{[^}]*\}/g,'…')
  .replace(/\s+/g,' ').trim();

export function measureButtons(){
  const seen=[];
  for(const file of files){
    const text=readFileSync(`${root}${file}`,'utf8');
    for(const m of text.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
      const attrs=m[1],cls=(attrs.match(/class(?:Name)?=["'{`]+([^"'`}]*)/)||[])[1]??'';
      const said=label(m[2])||(attrs.match(/aria-label=["`]([^"`]*)/)||[])[1]||'';
      if(!said||/^…$/.test(said))continue;
      seen.push({file,role:ROLE_OF(cls),label:said,cls});
    }
  }
  const byLabel=new Map();
  for(const b of seen.filter(b=>['Primary','Secondary','Danger','Link'].includes(b.role))){
    const key=b.label.replace(/[…:]+$/,'').trim().toLowerCase();
    if(!byLabel.has(key))byLabel.set(key,new Set());byLabel.get(key).add(b.role);}
  const mixed=[...byLabel].filter(([,roles])=>roles.size>1).map(([l,roles])=>({label:l,roles:[...roles]}));
  const primaryNotCommitting=seen.filter(b=>b.role==='Primary'&&!COMMITS.test(b.label.replace(/^[^A-Za-z]+/,'')));
  const counts={};for(const b of seen)counts[b.role]=(counts[b.role]??0)+1;
  return {buttons:seen.length,counts,mixed,primaryNotCommitting};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const r=measureButtons(),list=process.argv.includes('--list');
  if(process.argv.includes('--json')){console.log(JSON.stringify(r,null,1));process.exit(0);}
  console.log(`Buttons: ${r.buttons} (${Object.entries(r.counts).map(([k,v])=>`${k} ${v}`).join(', ')}).`);
  console.log(`  Labels drawn in more than one role: ${r.mixed.length}`);
  if(list)for(const m of r.mixed)console.log(`    ${m.label}: ${m.roles.join(', ')}`);
  console.log(`  Primary buttons that do not commit: ${r.primaryNotCommitting.length}`);
  if(list)for(const b of r.primaryNotCommitting)console.log(`    ${b.label} (${b.file})`);
}
