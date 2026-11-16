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
import {notesOfPart,UNWRITTEN,type Note,type WriteUpPart} from './notes.js';
import {toHTML} from './prose.js';
import {workKey,type ReferenceEntry} from './references.js';
import type {Escape} from './types.js';

/** WHAT THE DRAFT IS LAID OUT AS (experiment 202, 2026-11-15): the same record, three kinds of document. */
export type ProductKind='publication'|'surveillance'|'sitrep';
export const PRODUCT_KINDS:readonly {kind:ProductKind;label:string;kicker:string}[]=[
  {kind:'publication',label:'Publication',kicker:''},
  {kind:'surveillance',label:'Surveillance report',kicker:'Surveillance report'},
  {kind:'sitrep',label:'Situation report',kicker:'Situation report'}];
export const isProductKind=(v:unknown):v is ProductKind=>PRODUCT_KINDS.some(k=>k.kind===v);
/** Where a kind keeps what is written: the publication's keys as they always were, the others under their kind's name. */
export const partKey=(kind:ProductKind,key:string)=>kind==='publication'||key==='kind'?key:`${kind}:${key}`;
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
}

const bodyOf=(note:Note)=>note.kind==='quoted'?note.quote:note.text;
const fnOf=(note:Note)=>('fn' in note&&note.fn)||'';
const isLimitation=(note:Note)=>fnOf(note)==='limitation';

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
  period:['Reporting period','one line','The dates this report covers, and the date of the data.'],
  keypoints:['Key points','three to five bullets','What a reader must know, each one sentence with its number.'],
  recommendations:['Recommendations','three to five bullets','What should be done, and by whom, following from the findings.'],
  header:['Report details','one line each','Report number, date issued, period covered, and who prepared it.'],
  highlights:['Highlights','three to five bullets','The numbers, and what changed since the last report, one sentence each.'],
  actions:['Response actions','bullets','What has been done since the last report.'],
  gaps:['Gaps and needs','bullets','What is missing, or needed, to respond.'],
  next:['Next steps','bullets','What will be done before the next report, and by whom.'],
} as const;
/** The prompt for a stored key, whichever kind it belongs to. */
export const promptFor=(stored:string)=>PROMPTS[(stored.includes(':')?stored.split(':').pop():stored) as keyof typeof PROMPTS];
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

export function publicationMarkup(input:PublicationInput,esc:Escape):string{
  const written=input.written??{};
  const kind:ProductKind=input.kind??'publication';
  const control=(key:string,verb:string)=>input.writable
    ?`<button class="button small pub-write" data-pub-write="${key}">${verb}</button>`:'';
  // WRITTEN, SHOWN AS WRITTEN; UNWRITTEN, A PROMPT. Fieldwork drafts none of it.
  const prompt=(key:keyof typeof PROMPTS,lead=false)=>{const [label,length,ask]=PROMPTS[key];
    const stored=partKey(kind,key),text=written[stored]?.trim();
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
    return `<p class="pub-eqref">(Equation A${equations.length}, in the Appendix.)</p>`;
  });
  const prose=(note:Note)=>{
    const text=bodyOf(note);
    if(note.kind==='quoted')return `<blockquote>${esc(text)}</blockquote>`;
    if(note.kind==='derived')return `<p>${esc(text)}</p>`;
    let html=toHTML(text);
    const numbers=note.kind==='authored'?[...new Set((note.works??[]).map(w=>numberOf.get(workKey(w))).filter(Boolean))]:[];
    if(numbers.length){const at=html.lastIndexOf('</p>'),mark=` [${numbers.join(', ')}]`;
      html=at<0?html+mark:html.slice(0,at)+mark+html.slice(at);}
    return html;
  };
  const sources:string[]=[];
  const rendered=(kept:{note:Note;from:string[]}[])=>inRows(kept.map(({note,from})=>{
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
      if(kind==='table'||kind==='two-by-two'){tables++;
        return placed(note,`<p class="pub-caption"><strong>Table ${tables}.</strong> ${caption}</p>${figure}`,'div','pub-table');}
      figures++;
      return placed(note,`${figure}<figcaption class="pub-caption"><strong>Figure ${figures}.</strong> ${caption}</figcaption>`,'figure','pub-figure');
    }
    return `<div class="pub-note">${lifted(prose(note),label)}</div>`;
  }));
  const part=(section:WriteUpPart,keep:(note:Note)=>boolean=note=>!isLimitation(note))=>
    merged(notesOfPart(input.notes,section).filter(keep));
  const limitations=merged(input.notes.filter(isLimitation));
  const introduction=part('Introduction'),methods=part('Methods'),results=part('Results'),discussion=part('Discussion');

  if(kind!=='publication'){
    const titleKey=partKey(kind,'title'),kicker=PRODUCT_KINDS.find(k=>k.kind===kind)!.kicker;
    const head=`<p class="pub-kicker">${esc(kicker)}</p><h1 data-pub-part="${titleKey}">${esc(written[titleKey]?.trim()||input.title)}</h1>`
      +control(titleKey,'Edit title')
      +(input.authors.length?`<p class="pub-authors">${input.authors.map(esc).join(', ')}</p>`:'')
      +`<p class="pub-date">${esc(input.date)}</p>`;
    // THE SAME NOTES, IN THIS KIND'S ORDER: what was found leads, and the methods follow, short.
    const section=(title:string,body:string)=>body?`<h2>${esc(title)}</h2>${body}`:'';
    const found=rendered(results),background=introduction.length?rendered(introduction):'';
    const assessment=(discussion.length?rendered(discussion):'')+(limitations.length?`<h3>Limitations</h3>`+rendered(limitations):'');
    const how=rendered(methods);
    const sourcesList=sources.length?`<ul class="pub-sources">${sources.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
    const refsList=cited.length?`<ol class="pub-references">${cited.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol>`:'';
    const tail=(sourcesList||refsList?`<h2>Data sources and references</h2>${sourcesList}${refsList}`:'')
      +(equations.length?`<h2>Annex: equations</h2>`+equations.map((e,at)=>
        `<div class="pub-equation"><p><strong>Equation A${at+1}.</strong>${e.from?` ${esc(e.from)}`:''}</p>`
        +`<p class="prose-display"><span class="prose-math is-display" data-tex="${e.tex}">$$${e.tex}$$</span></p></div>`).join(''):'');
    const body=kind==='surveillance'
      ?head+prompt('period')+section('Key points',prompt('keypoints'))+section('The situation',found)
        +section('Background',background)+section('Interpretation',assessment)+section('Data and methods',how)
        +section('Recommendations',prompt('recommendations'))+tail
      :head+prompt('header')+section('Highlights',prompt('highlights'))+section('The situation in numbers',found)
        +section('Background',background)+section('Assessment',assessment)+section('Response actions',prompt('actions'))
        +section('Gaps and needs',prompt('gaps'))+section('Next steps',prompt('next'))+section('Methods and data',how)+tail;
    return numbered(`<article class="publication-page pub-kind-${kind}" lang="en">${body}</article>`);
  }
  const front=`<h1 data-pub-part="title">${esc(written.title?.trim()||input.title)}</h1>`+control('title','Edit title')
    +(input.authors.length?`<p class="pub-authors">${input.authors.map(esc).join(', ')}</p>`:'')
    +`<p class="pub-date">${esc(input.date)}</p>`+prompt('affiliations');
  const abstract=`<h2>Abstract</h2>`+prompt('background',true)+prompt('methods',true)+prompt('results',true)+prompt('conclusions',true);
  const intro=`<h2>1. Introduction</h2>`+(introduction.length?rendered(introduction):prompt('Introduction'));
  const method=`<h2>2. Methods</h2>`+rendered(methods);
  const result=`<h2>3. Results</h2>`+rendered(results);
  const discuss=`<h2>4. Discussion</h2>`+(discussion.length?rendered(discussion):prompt('Discussion'))
    +(limitations.length?`<h3>Limitations</h3>`+rendered(limitations):'')
    +`<h3>Conclusions</h3>`+prompt('closing');
  const data=`<h2>Data availability</h2>`+prompt('data')
    +(sources.length?`<ul class="pub-sources">${sources.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'');
  const refs=`<h2>References</h2>`+(cited.length?`<ol class="pub-references">${cited.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ol>`
    :'<p>No works are cited yet.</p>');
  const appendix=equations.length?`<h2>Appendix: equations</h2>`+equations.map((e,at)=>
    `<div class="pub-equation"><p><strong>Equation A${at+1}.</strong>${e.from?` ${esc(e.from)}`:''}</p>`
    +`<p class="prose-display"><span class="prose-math is-display" data-tex="${e.tex}">$$${e.tex}$$</span></p></div>`).join(''):'';
  // Each part laid out in reading order; the counters above run in that order too.
  return numbered(`<article class="publication-page" lang="en">${front}${abstract}${intro}${method}${result}${discuss}${data}${refs}${appendix}</article>`);
}
