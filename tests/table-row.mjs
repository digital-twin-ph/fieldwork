/** THE FIRST ROW OF A RESULT TABLE, by column name: a polygon layer is a plain table since 0.123.0, so a test reads the
 *  cell it means rather than a position in the old points-style grid. */
export async function firstRow(page){
  return page.evaluate(()=>{const t=document.querySelector('#data-table-view table');if(!t)return {};
    const heads=[...t.querySelectorAll('thead th')].map(h=>(h.childNodes[0]?.textContent??'').trim());
    const cells=[...t.querySelector('tbody tr').children].map(c=>c.textContent.trim());
    return Object.fromEntries(heads.map((h,i)=>[h,cells[i]]));});
}
