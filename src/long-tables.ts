/** LONG TABLES SCROLL (the practitioner, 2026-11-21, on Join's After of Nigeria's 774 LGAs: *"any before and after table
 *  view with anything longer than 20 rows should get a scrolling view of the table"*). A table of more than 20 rows in a
 *  configuration dialog shows 20 at a time and scrolls, its header held, so a dialog's Before and After show the whole
 *  table and not its first few rows. */

/** Rows a dialog's Before or After holds; a longer table turns pages of this many. Chosen, not measured. */
export const PREVIEW_ROWS=1000;
/** Rows a long table shows at once. */
export const ROWS_IN_VIEW=20;

/** Every table under `root` with more than ROWS_IN_VIEW rows is given a box that scrolls, as tall as its header and
 *  ROWS_IN_VIEW rows. Measured once the table is shown, and in a closed <details> when it opens; until then the stylesheet's height holds. */
export function scrollLongTables(root:ParentNode|null|undefined):void{
  if(!root)return;
  root.querySelectorAll<HTMLTableElement>('table').forEach(table=>{
    const rows=table.tBodies[0]?.rows;
    if(!rows||rows.length<=ROWS_IN_VIEW)return;
    let box=table.parentElement;
    if(!box||box.children.length!==1||!box.classList.contains('table-scroll')){
      const wrap=document.createElement('div');wrap.className='table-scroll';
      table.replaceWith(wrap);wrap.append(table);box=wrap;
    }
    box.classList.add('table-rows-scroll');
    // MEASURED ONCE SHOWN: a dialog draws before it opens, when nothing has a height yet, and a closed <details> has
    // none until it opens. The observer is told when the box first has one.
    const fit=()=>{const below=rows[ROWS_IN_VIEW]!.offsetTop-rows[0]!.offsetTop+(table.tHead?.offsetHeight??0);
      if(rows[0]!.offsetHeight>0){box!.style.maxHeight=`${below+1}px`;return true;}return false;};
    if(!fit()&&typeof ResizeObserver!=='undefined'){const watch=new ResizeObserver(()=>{if(fit())watch.disconnect();});watch.observe(box);}
  });
}
