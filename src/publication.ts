/** THE PUBLICATION, the first render of the record (experiment 202; the practitioner, 2026-11-14: "Let's begin to think
 *  about the different renders ..., beginning with publication", and "Agree with 1 and 2": formulas in an Appendix, a
 *  print layout first).
 *
 *  Laid out from the same notes, figures and references the Notes tab shows, never copied from them, and as clean text:
 *  no badges, counts or controls. People write the narrative; where a part is theirs and unwritten, it says what the part
 *  is for and how long it runs, and drafts none of it. A widget's note is formatted, not rewritten. What the simulation
 *  on Hagelloch found, and this handles:
 *
 *  1. The same note from two workflows is printed once.
 *  2. A source table is not printed in the body: its sentence stays in Methods, and Data availability names it.
 *  3. A figure's note is its caption.
 *  4. Nothing of the Notes tab's furniture.
 *  Limitations are gathered under Discussion; display formulas go to a numbered Appendix, a pointer left in their place. */
import {notesOfPart,noteKey,objectivesOf,UNWRITTEN,type Note,type WriteUpPart} from './notes.js';
import {toHTML} from './prose.js';
import {workKey,type ReferenceEntry} from './references.js';
import type {Escape} from './types.js';

import reportFormats from '../widgets/report-formats.json';

/** WHAT THE DRAFT IS LAID OUT AS (experiment 202, 2026-11-15): the publication, laid out below, or a format declared in
 *  widgets/report-formats.json as a mapping of its own headings onto roles. */
export type ProductKind=string;
export interface RoleDeclaration {source:'written'|'notes'|'limitations'|'references'; part?:WriteUpPart; label:string}
export interface FormatSection {heading:string; roles:string[]; box?:boolean; prompt?:[string,string,string];
  /** A prompt per role, where a section holds several the person writes, as MMWR's Summary box does. */
  prompts?:Record<string,[string,string,string]>}
export interface ReportFormat {id:string; label:string; kicker:string; follows:string;
  /** Equations and source tables go to an annex file beside the draft, not into its pages (2026-11-19). */
  annexFile?:boolean;
  masthead:{role:string;prompt:[string,string,string]}[]; sections:FormatSection[]}
export const ROLES=reportFormats.roles as unknown as Record<string,RoleDeclaration>;
export const FORMATS=reportFormats.formats as unknown as ReportFormat[];
export const PRODUCT_KINDS:readonly {kind:ProductKind;label:string}[]=[{kind:'publication',label:'Publication'},
  ...FORMATS.map(f=>({kind:f.id,label:f.label}))];
export const isProductKind=(v:unknown):v is ProductKind=>PRODUCT_KINDS.some(k=>k.kind===v);
/** WHAT IS WRITTEN IS KEPT BY ROLE, so it follows the person from one format to another. */
export const roleKey=(role:string)=>`role:${role}`;
/** A FIGURE'S PLACE IN ONE PRODUCT, kept by its note and the product, never in the note. */
export type FigureWidth='full'|'half'|'third';
export type FigurePlace='line'|'beside'|'left'|'right'|'out';
export const layoutKey=(kind:ProductKind,noteId:string)=>`layout:${kind}:${noteId}`;
export function readLayout(value:string|undefined):{width:FigureWidth;place:FigurePlace}{
  const [w,p]=(value||'').split('|');
  return {width:w==='half'||w==='third'?w:'full',place:p==='beside'||p==='left'||p==='right'||p==='out'?p:'line'};
}

export interface PublicationInput {
  /** Publication when absent. */
  kind?:ProductKind;
  /** The project's targets, which the draft offers first. */
  targets?:readonly string[];
  title:string;
  authors:readonly string[];
  /** The date it was laid out, as a reader sees it. */
  date:string;
  notes:readonly Note[];
  /** Which workflow a note came from, by name. */
  sourceOf:(note:Note)=>string|undefined;
  /** The figure a note speaks for, as markup, as the Notes tab draws it. */
  figureOf:(note:Note)=>string|undefined;
  references:readonly ReferenceEntry[];
  /** What the person has written for each part, by key, kept with the project. */
  written?:Readonly<Record<string,string>>;
  /** Whether this project can keep what is written: false for a worked example that ships with Fieldwork. */
  writable?:boolean;
  /** The rows behind a table's note, where the caller has them: how many, whether the step reads its input as a source,
   *  the rows as CSV, and where they were fetched from when the project does not carry them. */
  tableOf?:(note:Note)=>AttachableTable|undefined;
}
export interface AttachableTable {rows:number; source?:boolean; csv:()=>string; fetchedFrom?:string}
/** A TABLE TOO LONG TO PRINT WHOLE is attached instead: the rows a figure draws, as `write-up-figures.ts` caps them. */
export const ATTACH_OVER=50;
/** What goes beside the draft: a table's rows as CSV, or the line saying why they are not handed on. */
export interface Attachment {file:string; label:string; rows:number; csv?:()=>string; fetchedFrom?:string}
export interface PublicationParts {html:string; attachments:Attachment[];
  /** The annex file's body, as markup still to be typeset, where the format sends its equations there. */
  annex?:string}
/** A STEP'S FINDING ABOUT ITS DATA, not the study's limitation (2026-11-19): stated once under the data notes. */
const isDataQuality=(note:Note)=>/:(meaning|quality)$/.test(note.id||'');

const bodyOf=(note:Note)=>note.kind==='quoted'?note.quote:note.text;
const fnOf=(note:Note)=>('fn' in note&&note.fn)||'';
const isLimitation=(note:Note)=>fnOf(note)==='limitation'&&!isDataQuality(note);

/** The parts the person writes, each with what it is for and its length. Shown only where nothing has been written. */
export const PROMPTS={
  title:['Title','up to 20 words','What was studied, where and when.'],
  affiliations:['Affiliations and keywords','one line each','Each author’s organisation; three to six keywords.'],
  background:['Background','up to 60 words','Why this question, and why it matters.'],
  methods:['Methods','up to 80 words','The data and the methods named under Methods below.'],
  results:['Results','up to 100 words','The main numbers from Results below.'],
  conclusions:['Conclusions','up to 50 words','What the results mean, and what they do not establish.'],
  Introduction:['Introduction','200 to 400 words','Background, what is already known, and the question this answers. Write it as notes in Introduction on the Notes tab.'],
  Discussion:['Discussion','300 to 600 words','What the results show and how they compare with what is known. Write it as notes in Discussion on the Notes tab.'],
  closing:['Conclusions','up to 100 words','What follows from the evidence, and nothing beyond it.'],
  data:['Data availability','one or two sentences','Where a reader can obtain the data named here, and under what terms.'],
} as const;
/** The prompt for a stored key: a publication part's own, or the prompt the format gives the role. */
export function promptFor(stored:string,kind:ProductKind='publication'):readonly [string,string,string]|undefined{
  if(!stored.startsWith('role:'))return PROMPTS[stored as keyof typeof PROMPTS];
  const role=stored.slice(5),format=FORMATS.find(f=>f.id===kind);
  if(role==='title')return ['Title','up to 20 words','What happened, where and when.'];
  const section=format?.sections.find(x=>x.roles.includes(role));
  return format?.masthead.find(m=>m.role===role)?.prompt??section?.prompts?.[role]??section?.prompt
    ??(ROLES[role]?[ROLES[role]!.label,'',''] as const:undefined);
}
const WIDTHS:readonly [FigureWidth,string][]=[['full','Full width'],['half','Half'],['third','A third']];
const PLACES:readonly [FigurePlace,string][]=[['line','On its own line'],['beside','Side by side with the next figure'],
  ['left','Text runs round it, figure left'],['right','Text runs round it, figure right'],['out','Left out of this product']];

/** A MAP WITHOUT ITS OWN TITLE, which its caption carries: the heading's lines dropped and the band they stood in cropped. */
export function withoutHeading(figure:string):string{
  const svg=/<svg data-heading="(\d+)" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) (\d+)" width="\d+" height="\d+"/.exec(figure);
  if(!svg)return figure;
  const [whole,cut,width,height]=svg as unknown as [string,string,string,string];
  const kept=Number(height)-Number(cut);
  return figure.replace(whole,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${cut} ${width} ${kept}" width="${width}" height="${kept}"`)
    .replace(/<text data-figure-heading[^>]*>[\s\S]*?<\/text>/g,'');
}

export function publicationMarkup(input:PublicationInput,esc:Escape):string{return publicationParts(input,esc).html;}
/** A file name from a caption's title: lower case, words joined by hyphens, short. */
const slug=(text:string)=>text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40).replace(/-+$/,'')||'table';
/** A part that holds only prompts: its heading does not print, since the prompt does not. */
const onlyPrompts=(html:string)=>!html.replace(/<div class="pub-prompt[^"]*"[^>]*>(?:(?!<div)[\s\S])*?<\/div>/g,'').trim();
export function publicationParts(input:PublicationInput,esc:Escape):PublicationParts{
  const written=input.written??{};
  const kind:ProductKind=input.kind??'publication';
  const format=kind==='publication'?undefined:FORMATS.find(f=>f.id===kind)??FORMATS[0]!;
  const toAnnex=!!format?.annexFile;
  const attachments:Attachment[]=[];
  const control=(key:string,verb:string)=>input.writable
    ?`<button class="button small pub-write" data-pub-write="${key}">${verb}</button>`:'';
  // WRITTEN, SHOWN AS WRITTEN; UNWRITTEN, A PROMPT. Fieldwork drafts none of it.
  const prompt=(key:keyof typeof PROMPTS,lead=false)=>{const [label,length,ask]=PROMPTS[key];
    const stored=key,text=written[stored]?.trim();
    if(text)return `<div class="pub-written" data-pub-part="${stored}">`
      +(lead?toHTML(`**${label}.** ${text}`):toHTML(text))+control(stored,'Edit')+`</div>`;
    return `<div class="pub-prompt" data-pub-part="${stored}"><p class="pub-prompt-label">${esc(label)} <span>· ${esc(length)}</span></p>`
      +`<p>${esc(ask)}</p>${control(stored,'Write')}</div>`;};
  // SIDE BY SIDE PULLS THE NEXT FIGURE UP (2026-11-15): a figure set side by side and the next figure or table in its part
  // are drawn in one row, as two pictures placed together in Word, whatever text the record has between them. The
  // figures are numbered again in the order they are drawn, so Figure 2 is never above Figure 1.
  const inRows=(parts:string[])=>{
    const isFigure=(html:string)=>/^<(figure|div) class="pub-(figure|table) /.test(html);
    const out:string[]=[];const used=new Set<number>();
    parts.forEach((html,i)=>{
      if(used.has(i))return;
      if(isFigure(html)&&html.includes(' pub-p-beside')){
        const j=parts.findIndex((other,k)=>k>i&&!used.has(k)&&isFigure(other));
        if(j>0){used.add(j);out.push(`<div class="pub-row">${html}${parts[j]}</div>`);return;}
      }
      out.push(html);
    });
    return out.join('');
  };
  const numbered=(html:string)=>{let f=0,t=0;
    return html.replace(/<strong>(Figure|Table) \d+\.<\/strong>/g,(_,what:string)=>`<strong>${what} ${what==='Figure'?++f:++t}.</strong>`);};
  // THE FIGURE'S PLACE IN THIS PRODUCT, and, where it can be kept, the controls that set it. They do not print.
  const placed=(note:Note,inner:string,tag:'figure'|'div',extra:string)=>{
    const id=note.id;
    const {width,place}=readLayout(id?written[layoutKey(kind,id)]:undefined);
    const tools=input.writable&&id?`<div class="pub-layout" data-pub-layout="${esc(id)}">`
      +`<label>Width <select data-pub-width>${WIDTHS.map(([v,l])=>`<option value="${v}"${v===width?' selected':''}>${l}</option>`).join('')}</select></label>`
      +`<label>Place <select data-pub-place>${PLACES.map(([v,l])=>`<option value="${v}"${v===place?' selected':''}>${l}</option>`).join('')}</select></label></div>`:'';
    // LEFT OUT OF THIS PRODUCT: nothing where it cannot be kept or printed; a slim line with its controls where it can, to bring it back.
    if(place==='out')return tools?`<div class="pub-left-out" data-pub-note="${esc(id!)}">${tools}<p>${esc(/<strong>([^<]*)<\/strong>\s*<strong>([^<]*)<\/strong>/.exec(inner)?.[2]?.replace(/\.$/,"")||'A figure')} is left out of this product.</p></div>`:'';
    return `<${tag} class="${extra} pub-w-${width} pub-p-${place}"${id?` data-pub-note="${esc(id)}"`:''}>${tools}${inner}</${tag}>`;};
  let figures=0,tables=0;
  const equations:{tex:string;from:string}[]=[];
  const numberOf=new Map<string,number>();
  const cited=input.references.filter(entry=>!entry.uncited);
  cited.forEach((entry,at)=>{if(entry.workKey)numberOf.set(entry.workKey,at+1);});

  // ONCE, WHEREVER IT CAME FROM: the same sentence of the same kind in the same part is one note, naming each workflow.
  const merged=(notes:readonly Note[])=>{
    const kept:{note:Note;from:string[]}[]=[];
    for(const note of notes){
      const text=bodyOf(note);if(!text||text===UNWRITTEN)continue;
      const from=input.sourceOf(note);
      const same=kept.find(k=>k.note.kind===note.kind&&k.note.section===note.section&&bodyOf(k.note)===text);
      if(same){if(from&&!same.from.includes(from))same.from.push(from);}
      else kept.push({note,from:from?[from]:[]});
    }
    return kept;
  };
  // A DISPLAY FORMULA TO THE APPENDIX, numbered, its pointer where it stood.
  const lifted=(html:string,from:string)=>html.replace(/<p class="prose-display">([\s\S]*?)<\/p>/g,(_,math:string)=>{
    const tex=/data-tex="([^"]*)"/.exec(math)?.[1];
    if(tex===undefined)return _;
    equations.push({tex,from});
    return `<p class="pub-eqref">(Equation A${equations.length}, in the ${toAnnex?'annex file':format?'Annex':'Appendix'}.)</p>`;
  });
  const prose=(note:Note)=>{
    const text=bodyOf(note);
    if(note.kind==='quoted')return `<blockquote>${esc(text)}</blockquote>`;
    if(note.kind==='derived')return `<p>${esc(text)}</p>`;
    let html=toHTML(text);
    // An enumerating note's items, numbered as a paper numbers its objectives.
    if(note.kind==='authored'&&note.items?.length)html+=`<ol class="pub-items">${note.items.map(i=>`<li>${esc(i.text)}</li>`).join('')}</ol>`;
    const numbers=note.kind==='authored'?[...new Set((note.works??[]).map(w=>numberOf.get(workKey(w))).filter(Boolean))]:[];
    if(numbers.length){const at=html.lastIndexOf('</p>'),mark=` [${numbers.join(', ')}]`;
      html=at<0?html+mark:html.slice(0,at)+mark+html.slice(at);}
    return html;
  };
  const sources:string[]=[];
  // A COMPONENT GOES WITH THE NOTE IT SUPPORTS (Stage B): a table, chart or map a written note names is drawn after that
  // note, in whatever section it sits, and not in its own place. The first note to name it keeps it.
  const byKey=new Map(input.notes.map(n=>[noteKey(n),n] as const));
  const claimed=new Map<string,Note>();
  for(const note of input.notes)if(note.kind==='authored'&&note.text!==UNWRITTEN)
    for(const key of note.components??[])if(byKey.has(key)&&!claimed.has(key)&&key!==noteKey(note))claimed.set(key,note);
  const isClaimed=(note:Note)=>claimed.has(noteKey(note));
  const withComponents=(kept:{note:Note;from:string[]}[])=>kept.flatMap(k=>[k,
    ...(k.note.kind==='authored'?(k.note.components??[]):[]).filter(key=>claimed.get(key)===k.note)
      .map(key=>({note:byKey.get(key)!,from:[input.sourceOf(byKey.get(key)!)].filter((x):x is string=>!!x)}))]);
  const rendered=(kept:{note:Note;from:string[]}[])=>inRows(withComponents(kept).map(({note,from})=>{
    const label=from.join('; ');
    let figure=input.figureOf(note);
    // A SOURCE'S TABLE IS NOT THE BODY'S: the sentence stays, and Data availability names it.
    if(note.kind==='derived'&&fnOf(note)==='source'){
      if(!sources.includes(note.text))sources.push(note.text);
      return `<div class="pub-note">${prose(note)}</div>`;
    }
    if(figure){
      const kind=/data-figure="([a-z-]+)"/.exec(figure)?.[1];
      if(kind==='map')figure=withoutHeading(figure);
      const caption=lifted(prose(note),label).replace(/^<p>/,'').replace(/<\/p>$/,'');
      // TOO LONG TO PRINT, OR A SOURCE IN A FORMAT WITH AN ANNEX FILE: attached, and a line in its place.
      const rows=kind==='table'?input.tableOf?.(note):undefined;
      if(rows&&(rows.rows>ATTACH_OVER||(toAnnex&&rows.source))){
        const n=attachments.length+1,title=/<strong>([^<]*)<\/strong>/.exec(caption)?.[1]?.replace(/\.$/,'')||'Table';
        const file=`S${n}-${slug(title)}.csv`,count=`${rows.rows.toLocaleString('en-US')} row${rows.rows===1?'':'s'}`;
        attachments.push({file,label:title,rows:rows.rows,...rows.fetchedFrom?{fetchedFrom:rows.fetchedFrom}:{csv:rows.csv}});
        return `<p class="pub-attached"><strong>Table S${n}.</strong> ${esc(title)}, ${count}: `
          +(rows.fetchedFrom?`not attached. Its rows were fetched from ${esc(rows.fetchedFrom)} and are not handed on with this draft.`
            :`attached as ${esc(file)}.`)+`</p>`;
      }
      if(kind==='table'||kind==='two-by-two'){tables++;
        return placed(note,`<p class="pub-caption"><strong>Table ${tables}.</strong> ${caption}</p>${figure}`,'div','pub-table');}
      figures++;
      return placed(note,`${figure}<figcaption class="pub-caption"><strong>Figure ${figures}.</strong> ${caption}</figcaption>`,'figure','pub-figure');
    }
    return `<div class="pub-note">${lifted(prose(note),label)}</div>`;
  }));
  const part=(section:WriteUpPart,keep:(note:Note)=>boolean=note=>!isLimitation(note))=>
    merged(notesOfPart(input.notes,section).filter(note=>keep(note)&&!isClaimed(note)));
  const limitations=merged(input.notes.filter(note=>isLimitation(note)&&!isClaimed(note)));
  const quality=[...new Set(input.notes.filter(isDataQuality).map(bodyOf).filter(t=>t&&t!==UNWRITTEN))];
  const qualityHtml=quality.length?`<div class="pub-note pub-data-quality"><p><strong>Data quality.</strong> ${quality.map(esc).join(' ')}</p></div>`:'';
  const introduction=part('Introduction'),methods=part('Methods',note=>!isLimitation(note)&&!isDataQuality(note)),
    results=part('Results'),discussion=part('Discussion');
  const date=`<p class="pub-date">Drafted ${esc(input.date)}</p>`;
  // A HEADING OVER A PART THAT HOLDS ONLY PROMPTS is marked, so it prints no more than its prompt does.
  const heading=(tag:'h2'|'h3',text:string,inner:string)=>
    `<${tag}${onlyPrompts(inner)?' class="pub-unwritten"':''}>${text}</${tag}>`;

  if(format){
    // A WRITTEN ROLE: its text where written, the format's prompt for it where not.
    const writtenRole=(role:string,ask:readonly [string,string,string]|undefined,cls='')=>{
      const key=roleKey(role),text=written[key]?.trim(),[label,length,what]=ask??[ROLES[role]?.label??role,'',''];
      if(text)return `<div class="pub-written${cls}" data-pub-part="${key}">${cls.includes('pub-qa')?`<p class="pub-question">${esc(label)}</p>`:''}${toHTML(text)}${control(key,'Edit')}</div>`;
      return `<div class="pub-prompt${cls}" data-pub-part="${key}"><p class="pub-prompt-label">${esc(label)}${length?` <span>· ${esc(length)}</span>`:''}</p>`
        +`<p>${esc(what)}</p>${control(key,'Write')}</div>`;};
    // FROM THE RECORD: each role's notes rendered once, Methods first so its sources are known by the time references are.
    const methodsHtml=rendered(methods)+qualityHtml;
    const fromRecord:Record<string,()=>string>={
      background:()=>rendered(introduction),situation:()=>rendered(results),methods:()=>methodsHtml,
      interpretation:()=>rendered(discussion),limitations:()=>rendered(limitations),
      // THE SOURCES ONCE: a format that prints its data notes has said them there.
      references:()=>(sources.length&&!format.sections.some(x=>x.roles.includes('methods'))?`<ul class="pub-sources">${sources.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'')
        +(cited.length?`<ol class="pub-references">${cited.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol>`:'')};
    const hasRecord:Record<string,boolean>={background:introduction.length>0,situation:results.length>0,methods:methods.length+quality.length>0,
      interpretation:discussion.length>0,limitations:limitations.length>0,references:sources.length+cited.length>0};
    const roleBody=(role:string,section?:FormatSection)=>ROLES[role]?.source==='written'
      ?writtenRole(role,section?.prompts?.[role]??section?.prompt,section?.prompts?.[role]?' pub-qa':''):(fromRecord[role]?.()??'');
    const head=`<p class="pub-kicker">${esc(format.kicker)}</p>`
      +`<h1 data-pub-part="${roleKey('title')}">${esc(written[roleKey('title')]?.trim()||input.title)}</h1>`+control(roleKey('title'),'Edit title')
      +(input.authors.length?`<p class="pub-authors">${input.authors.map(esc).join(', ')}</p>`:'')
      +date
      +format.masthead.map(m=>writtenRole(m.role,m.prompt,' pub-masthead')).join('');
    const body=format.sections.map(section=>{
      const inner=section.roles.map(role=>roleBody(role,section)).join('');
      if(!inner)return '';
      return heading('h2',esc(section.heading),inner)+(section.box?`<div class="pub-keyfigures${onlyPrompts(inner)?' pub-unwritten':''}">${inner}</div>`:inner);
    }).join('');
    // WHAT THIS FORMAT DOES NOT CARRY, named rather than lost: a role holding text or notes that no heading here maps.
    const used=new Set(['title',...format.masthead.map(m=>m.role),...format.sections.flatMap(x=>x.roles)]);
    const left=Object.entries(ROLES).filter(([role,decl])=>!used.has(role)
      &&(decl.source==='written'?!!written[roleKey(role)]?.trim():!!hasRecord[role])).map(([,decl])=>decl.label);
    const leftover=left.length?`<aside class="pub-leftover"><p>Not in this format, kept for the others: ${left.map(esc).join('; ')}.</p></aside>`:'';
    const equationList=equations.map((e,at)=>
      `<div class="pub-equation"><p><strong>Equation A${at+1}.</strong>${e.from?` ${esc(e.from)}`:''}</p>`
      +`<p class="prose-display"><span class="prose-math is-display" data-tex="${e.tex}">$$${e.tex}$$</span></p></div>`).join('');
    // THE ANNEX FILE (2026-11-19): what it holds is said in one line here; its equations are there, not in these pages.
    const inAnnex=[equations.length?`equation${equations.length===1?' A1':`s A1 to A${equations.length}`}`:'',
      attachments.length?`table${attachments.length===1?' S1':`s S1 to S${attachments.length}`}`:''].filter(Boolean);
    const annex=toAnnex?(inAnnex.length?`<p class="pub-annex-note">In the annex file, annex.html, with this draft’s attached files: ${inAnnex.join(' and ')}.</p>`:'')
      :equations.length?`<h2>Annex: equations</h2>`+equationList:'';
    const follows=`<p class="pub-follows">Laid out as ${esc(format.label)}, after ${esc(format.follows)}.</p>`;
    const annexFile=toAnnex&&inAnnex.length?`<article class="publication-page pub-annex" lang="en"><p class="pub-kicker">Annex</p>`
      +`<h1>${esc(written[roleKey('title')]?.trim()||input.title)}</h1>${date}`
      +(equations.length?`<h2>Equations</h2>${equationList}`:'')
      +(attachments.length?`<h2>Attached tables</h2><ul class="pub-sources">${attachments.map((a,at)=>`<li><strong>Table S${at+1}.</strong> ${esc(a.label)}, `
        +`${a.rows.toLocaleString('en-US')} rows: ${a.fetchedFrom?`not attached; fetched from ${esc(a.fetchedFrom)}`:esc(a.file)}.</li>`).join('')}</ul>`:'')
      +`</article>`:undefined;
    return {html:numbered(`<article class="publication-page pub-kind-${esc(kind)}" lang="en">${head}${body}${annex}${follows}${leftover}</article>`),
      attachments,...annexFile?{annex:annexFile}:{}};
  }
  const front=`<h1 data-pub-part="title">${esc(written.title?.trim()||input.title)}</h1>`+control('title','Edit title')
    +(input.authors.length?`<p class="pub-authors">${input.authors.map(esc).join(', ')}</p>`:'')
    +date+prompt('affiliations');
  const abstractBody=prompt('background',true)+prompt('methods',true)+prompt('results',true)+prompt('conclusions',true);
  const abstract=heading('h2','Abstract',abstractBody)+abstractBody;
  const introBody=introduction.length?rendered(introduction):prompt('Introduction');
  const intro=heading('h2','1. Introduction',introBody)+introBody;
  const method=`<h2>2. Methods</h2>`+rendered(methods)+qualityHtml;
  // RESULTS IN THE OBJECTIVES' ORDER (Stage B): under each objective, the notes that answer it, then the Results of the
  // workflow that answers it; what answers none comes first. With no objectives, Results as the record has it.
  const objectives=objectivesOf(input.notes);
  const workflowOf=(note:Note)=>'workflowKey' in note?note.workflowKey:undefined;
  const objectiveOf=(r:{note:Note})=>{const n=r.note;
    return objectives.find(o=>n.kind==='authored'&&n.answers===o.id)
      ??objectives.find(o=>!!o.question&&workflowOf(n)===o.question);};
  const capital=(text:string)=>text.charAt(0).toUpperCase()+text.slice(1);
  const result=`<h2>3. Results</h2>`+(objectives.length
    ?rendered(results.filter(r=>!objectiveOf(r)))+objectives.map(o=>{
      const mine=results.filter(r=>objectiveOf(r)===o);
      const answered=mine.filter(r=>r.note.kind==='authored'),rest=mine.filter(r=>r.note.kind!=='authored');
      return `<h3 data-pub-objective="${esc(o.id)}">3.${o.n} ${esc(capital(o.text))} (objective ${o.n})</h3>`
        +(mine.length?rendered([...answered,...rest]):`<div class="pub-prompt"><p class="pub-prompt-label">Result for objective ${o.n} <span>· one paragraph and its table or figure</span></p>`
          +`<p>What the analysis found for this objective. Write it as a note in Results that answers objective ${o.n}.</p></div>`);
    }).join('')
    :rendered(results));
  const discussBody=discussion.length?rendered(discussion):prompt('Discussion');
  const limitationsHtml=limitations.length?`<h3>Limitations</h3>`+rendered(limitations):'',closing=prompt('closing');
  const discuss=heading('h2','4. Discussion',discussBody+limitationsHtml+closing)+discussBody+limitationsHtml
    +heading('h3','Conclusions',closing)+closing;
  const dataBody=prompt('data')+(sources.length?`<ul class="pub-sources">${sources.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'');
  const data=heading('h2','Data availability',dataBody)+dataBody;
  const refs=`<h2>References</h2>`+(cited.length?`<ol class="pub-references">${cited.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol>`
    :'<p>No works are cited yet.</p>');
  const appendix=equations.length?`<h2>Appendix: equations</h2>`+equations.map((e,at)=>
    `<div class="pub-equation"><p><strong>Equation A${at+1}.</strong>${e.from?` ${esc(e.from)}`:''}</p>`
    +`<p class="prose-display"><span class="prose-math is-display" data-tex="${e.tex}">$$${e.tex}$$</span></p></div>`).join(''):'';
  // Each part laid out in reading order; the counters above run in that order too.
  return {html:numbered(`<article class="publication-page" lang="en">${front}${abstract}${intro}${method}${result}${discuss}${data}${refs}${appendix}</article>`),attachments};
}
