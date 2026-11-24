/** EVERY ROW OF A RESULT TABLE, by column name. `table-row.mjs` reads the first row; a test that asks about a place
 *  the walk did not reach has to find that place's row rather than whichever one sorts first. */
export async function allRows(page){
  return page.evaluate(()=>{const t=document.querySelector('#table-panel table');if(!t)return [];
    const heads=[...t.querySelectorAll('thead th')].map(h=>(h.childNodes[0]?.textContent??'').trim());
    return [...t.querySelectorAll('tbody tr')].map(tr=>{
      const cells=[...tr.children].map(c=>c.textContent.trim());
      return Object.fromEntries(heads.map((h,i)=>[h,cells[i]]));});});
}
