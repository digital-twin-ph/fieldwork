/** The distributed user manual: one page per widget, browsable inside the application.
 *
 *  The practitioner's proposal of 2026-10-14 -- a set of markdowns, "browsed within FieldWork not
 *  a markdown in the repo". The pages are compiled to HTML at build time by
 *  scripts/widget-manual.mjs, so nothing is parsed or fetched at run time, and the ontology entry
 *  for each widget carries `fw:userManual` pointing at the same page: "where is the documentation
 *  for this?" is a question the graph answers rather than a convention a reader has to know. */
import pages from '../widgets/manual-pages.json';

export const MANUAL_PAGES=pages as Record<string,string>;
export const hasManual=(nodeType:string):boolean=>Object.hasOwn(MANUAL_PAGES,nodeType);
export const manualSource=(nodeType:string):string=>
  `https://github.com/digital-twin-ph/fieldwork/blob/main/docs/widgets/${nodeType}.md`;

/** The Inspector's entry point. Absent for a widget with no page, rather than opening an empty
 *  dialog: 50 of 53 widgets have none, and offering a link to nothing is worse than offering none. */
export function manualButton(nodeType:string,esc:(v:string)=>string):string{
  if(!hasManual(nodeType))return '';
  return `<button class="text-button" id="open-manual" data-manual="${esc(nodeType)}">Manual for this widget</button>`;
}

export function openManual(nodeType:string,title:string,esc:(v:string)=>string):void{
  const page=MANUAL_PAGES[nodeType];
  if(!page)return;
  const dialog=document.createElement('dialog');
  dialog.id='manual-dialog';
  dialog.setAttribute('aria-labelledby','manual-title');
  dialog.innerHTML=`<div class="manual-head"><h2 id="manual-title">${esc(title)}</h2>`
    +`<button class="button" id="manual-close">Close</button></div>`
    +`<article class="manual-body">${page}</article>`
    +`<p class="muted">This page is part of the manual carried in this build. Its source is `
    +`<a href="${manualSource(nodeType)}" target="_blank" rel="noopener noreferrer">docs/widgets/${esc(nodeType)}.md</a>, `
    +`and the widget's ontology entry points at it with <code>fw:userManual</code>.</p>`;
  document.body.append(dialog);
  const close=()=>{dialog.close();dialog.remove();};
  dialog.querySelector<HTMLButtonElement>('#manual-close')!.onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
