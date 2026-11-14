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

export interface PublicationInput {
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
}

const bodyOf=(note:Note)=>note.kind==='quoted'?note.quote:note.text;
const fnOf=(note:Note)=>('fn' in note&&note.fn)||'';
const isLimitation=(note:Note)=>fnOf(note)==='limitation';

/** The parts the person writes, each with what it is for and its length. Shown only where nothing has been written. */
const PROMPTS={
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

export function publicationMarkup(input:PublicationInput,esc:Escape):string{
  const prompt=(key:keyof typeof PROMPTS)=>{const [label,length,ask]=PROMPTS[key];
    return `<div class="pub-prompt"><p class="pub-prompt-label">${esc(label)} <span>· ${esc(length)}</span></p><p>${esc(ask)}</p></div>`;};
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
  const rendered=(kept:{note:Note;from:string[]}[])=>kept.map(({note,from})=>{
    const label=from.join('; ');
    const figure=input.figureOf(note);
    // A SOURCE'S TABLE IS NOT THE BODY'S: the sentence stays, and Data availability names it.
    if(note.kind==='derived'&&fnOf(note)==='source'){
      if(!sources.includes(note.text))sources.push(note.text);
      return `<div class="pub-note">${prose(note)}</div>`;
    }
    if(figure){
      const kind=/data-figure="([a-z-]+)"/.exec(figure)?.[1];
      const caption=lifted(prose(note),label).replace(/^<p>/,'').replace(/<\/p>$/,'');
      if(kind==='table'||kind==='two-by-two'){tables++;
        return `<div class="pub-table"><p class="pub-caption"><strong>Table ${tables}.</strong> ${caption}</p>${figure}</div>`;}
      figures++;
      return `<figure class="pub-figure">${figure}<figcaption class="pub-caption"><strong>Figure ${figures}.</strong> ${caption}</figcaption></figure>`;
    }
    return `<div class="pub-note">${lifted(prose(note),label)}</div>`;
  }).join('');
  const part=(section:WriteUpPart,keep:(note:Note)=>boolean=note=>!isLimitation(note))=>
    merged(notesOfPart(input.notes,section).filter(keep));
  const limitations=merged(input.notes.filter(isLimitation));
  const introduction=part('Introduction'),methods=part('Methods'),results=part('Results'),discussion=part('Discussion');

  const front=`<h1>${esc(input.title)}</h1>`
    +(input.authors.length?`<p class="pub-authors">${input.authors.map(esc).join(', ')}</p>`:'')
    +`<p class="pub-date">${esc(input.date)}</p>`+prompt('affiliations');
  const abstract=`<h2>Abstract</h2>`+prompt('background')+prompt('methods')+prompt('results')+prompt('conclusions');
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
  return `<article class="publication-page" lang="en">${front}${abstract}${intro}${method}${result}${discuss}${data}${refs}${appendix}</article>`;
}
