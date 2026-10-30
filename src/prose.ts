/** THE ONE MARKUP A NOTE IS WRITTEN IN, and the mathematics inside it.
 *
 *  The practitioner, 2026-10-30, on the Notes Board prototype's formatting toolbar and on
 *  experiment 141's equations: *"Let's do formatting and LaTeX."*
 *
 *  WHY MARKDOWN AND NOT A RICH-TEXT FIELD. A note's `text` is read in half a dozen places that
 *  have nothing to do with the screen -- the word and character counts, the contributions
 *  statement, the N3 receipt, whatever assembles a report -- and all of them expect plain text.
 *  Markdown IS plain text, so none of them changes: what is stored is what was typed, and the
 *  markup is a reading of it rather than a second format to keep in step. A rich-text field would
 *  have made the stored value HTML and quietly broken every one of those readers.
 *
 *  THE DIALECT IS THE MANUAL'S. `scripts/widget-manual.mjs` has compiled `docs/widgets/*.md` to
 *  HTML since 2026-10-14 with a small subset -- escape first, then code, bold and links -- and a
 *  second dialect in the same application would be a thing for a practitioner to learn twice.
 *  `tests/prose.test.mjs` asserts the two agree on every construct both support; where this one
 *  goes further it is because a note needs it and a manual page does not.
 *
 *  WHAT IT WILL NOT DO, each for a reason rather than for want of time:
 *
 *  - **No headings.** A note sits inside an IMRaD section. A heading inside one is a second
 *    structure arguing with the first, and the write-up's outline is not the note's to set.
 *  - **No tables.** A table in a write-up is an artifact this application already makes, with its
 *    own provenance and its own receipt. Retyping one as prose would produce a table with none.
 *  - **No raw HTML.** Escaping happens first and nothing is unescaped afterwards, so a note that
 *    is exported, imported and rendered on another machine cannot carry script with it.
 *
 *  MATHEMATICS IS LATEX, which experiment 141 settled: `$x$` inline, `$$x$$` on its own line. It
 *  is converted to MathML, which browsers typeset natively -- so there is nothing to fetch at
 *  render time and nothing to download at use time, which is what an offline-first application
 *  needs. See `typeset`. */

/** What a renderer may produce, so a note cannot grow a heading by being written in one. */
export interface ProseOptions {
  /** Headings, tables and links: the manual's constructs, off for a note. */
  headings?:boolean;
  tables?:boolean;
  links?:boolean;
}

const ESCAPES:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
export const escapeProse=(value:string):string=>value.replace(/[&<>"]/g,c=>ESCAPES[c]);

/** THE MATHEMATICS, LIFTED OUT BEFORE ANYTHING IS ESCAPED.
 *
 *  LaTeX is full of characters this would otherwise escape -- `<`, `>` and `&` are all ordinary
 *  mathematics -- so the spans come out first and go back in as placeholders. Escaping a formula
 *  and then handing the result to a TeX parser produces `\lt` where the author wrote `<`, which
 *  is the kind of defect nobody sees until it is in a publication. */
const MATH=/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

interface Lifted {text:string; math:{tex:string; display:boolean}[]}

const liftMath=(source:string):Lifted=>{
  const math:{tex:string; display:boolean}[]=[];
  const text=source.replace(MATH,(_whole,block:string|undefined,inline:string|undefined)=>{
    const tex=(block??inline??'').trim();
    if(!tex)return _whole;
    math.push({tex,display:block!==undefined});
    return `\u0000MATH${math.length-1}\u0000`;
  });
  return {text,math};
};

/** A formula, as the element `typeset` later fills in.
 *
 *  THE SOURCE IS KEPT ON THE ELEMENT, not only rendered from it. Until the converter has loaded,
 *  and on any machine where it fails to, the LaTeX is what is shown -- which is a true account of
 *  what the note says rather than a blank where a formula should be. */
const mathHTML=(tex:string,display:boolean):string=>
  `<span class="prose-math${display?' is-display':''}" data-tex="${escapeProse(tex)}">`
  +`${escapeProse(display?`$$${tex}$$`:`$${tex}$`)}</span>`;

const restoreMath=(html:string,math:Lifted['math']):string=>
  html.replace(/\u0000MATH(\d+)\u0000/g,(_whole,index:string)=>{
    const found=math[Number(index)];
    return found?mathHTML(found.tex,found.display):'';
  });

/** The inline pass. Escaped first, so every pattern below matches text and never markup. */
function inline(source:string,options:ProseOptions):string{
  let html=escapeProse(source)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    // ITALIC AFTER BOLD, and never inside a word: `**a**` must not be read as an empty italic
    // wrapping a bold, and a GitHub login or a file name with underscores is not emphasis.
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=$|[\s).,;:!?])/g,'$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*?)_(?=$|[\s).,;:!?])/g,'$1<em>$2</em>');
  if(options.links)html=html.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

/** Markdown to HTML, for a note or for a manual page.
 *
 *  Block structure is read a line at a time, which is what the manual's compiler does and is
 *  enough for prose: paragraphs, the two kinds of list, a quotation, and a formula on its own
 *  line. Nothing here nests, because a nested list inside a note has never been asked for and a
 *  parser that half-supports one is worse than a parser that does not. */
export function toHTML(markdown:string,options:ProseOptions={}):string{
  const lifted=liftMath(markdown);
  const out:string[]=[];
  let list:'ul'|'ol'|null=null,quote=false;
  let para:string[]=[];
  const closeList=()=>{if(list){out.push(`</${list}>`);list=null;}};
  const closeQuote=()=>{if(quote){out.push('</blockquote>');quote=false;}};
  const closePara=()=>{if(para.length){out.push(`<p>${inline(para.join(' '),options)}</p>`);para=[];}};
  const closeAll=()=>{closePara();closeList();closeQuote();};
  for(const raw of lifted.text.split('\n')){
    const line=raw.trim();
    if(!line){closeAll();continue;}
    // A DISPLAY FORMULA STANDS ALONE, as it does in a paper: on its own line, outside the
    // paragraph, because an equation wrapped in running text is not a display equation.
    const alone=/^\u0000MATH(\d+)\u0000$/.exec(line);
    if(alone&&lifted.math[Number(alone[1])]?.display){
      closeAll();
      out.push(`<p class="prose-display">\u0000MATH${alone[1]}\u0000</p>`);
      continue;
    }
    if(options.headings){
      const heading=/^(#{1,4})\s+(.*)$/.exec(line);
      if(heading){closeAll();const level=heading[1].length+1;
        out.push(`<h${level}>${inline(heading[2],options)}</h${level}>`);continue;}
    }
    const quoted=/^>\s?(.*)$/.exec(line);
    if(quoted){
      closePara();closeList();
      if(!quote){out.push('<blockquote>');quote=true;}
      out.push(`<p>${inline(quoted[1],options)}</p>`);
      continue;
    }
    const ordered=/^(\d+)[.)]\s+(.*)$/.exec(line);
    const bulleted=/^[-*]\s+(.*)$/.exec(line);
    if(ordered||bulleted){
      closePara();closeQuote();
      const want=ordered?'ol':'ul';
      if(list&&list!==want)closeList();
      if(!list){out.push(`<${want}>`);list=want;}
      out.push(`<li>${inline((ordered?ordered[2]:bulleted![1]),options)}</li>`);
      continue;
    }
    closeList();closeQuote();
    para.push(line);
  }
  closeAll();
  return restoreMath(out.join(''),lifted.math);
}

/** Whether anything in this text asks to be read as markup rather than shown as typed. */
export const hasMarkup=(text:string):boolean=>
  /\$[^$\n]+\$|\$\$[\s\S]+\$\$|\*\*[^*]+\*\*|`[^`]+`|^\s*[-*]\s+|^\s*\d+[.)]\s+|^\s*>\s/m.test(text);

/** Every formula this text carries, in the order it carries them. For a receipt, and for a test
 *  that wants to know what was written rather than what it looked like. */
export function equationsIn(text:string):{tex:string; display:boolean}[]{
  return liftMath(text).math;
}

let converter:Promise<{renderToString:(tex:string,options?:object)=>string}>|null=null;
/** THE CONVERTER, FETCHED ONCE AND ONLY WHERE THERE IS MATHEMATICS.
 *
 *  Temml is 168KB minified against an `app.js` of about 330KB, and most notes carry no formula
 *  at all, so it is a dynamic import: a chunk of its own, which the build precaches like every
 *  other generated output because mathematics is as useful offline as anything else here. That is
 *  the opposite call from the MapLibre renderer, which is excluded from the precache precisely
 *  because it is useless without the network. */
const load=()=>converter??=import('temml').then(m=>(m.default??m) as never);

/** Typeset every formula inside `root`, replacing the LaTeX source with MathML.
 *
 *  Called after the HTML is in the document, and safe to call again: an element that has already
 *  been typeset is skipped. A formula Temml refuses keeps its source and says so on the element,
 *  because a formula that silently renders as nothing is worse than one that renders as the TeX
 *  somebody typed. */
export async function typeset(root:ParentNode):Promise<number>{
  const pending=[...root.querySelectorAll('.prose-math:not([data-typeset])')];
  if(!pending.length)return 0;
  let temml;
  try{temml=await load();}
  catch{
    // The chunk could not be loaded. The LaTeX is already on screen, so there is nothing to
    // repair -- and saying so on every formula would be noise about the renderer, not the note.
    return 0;
  }
  let done=0;
  for(const element of pending){
    const tex=element.getAttribute('data-tex')||'';
    const display=element.classList.contains('is-display');
    try{
      element.innerHTML=temml.renderToString(tex,{displayMode:display,throwOnError:true});
      element.setAttribute('data-typeset','');
      done++;
    }catch(error){
      element.setAttribute('data-typeset','failed');
      element.setAttribute('title',
        `This formula could not be read as LaTeX: ${(error as Error)?.message||'unknown'}`);
    }
  }
  return done;
}
