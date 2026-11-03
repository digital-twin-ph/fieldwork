var f=n=>n==null||n===""?null:String(n);function k(n,a){return[...new Set([...Object.keys(n.attributes),...Object.keys(a.attributes)])].sort().map(d=>{let u=f(n.attributes[d]),c=f(a.attributes[d]);return{key:d,left:u,right:c,agrees:u!==null&&c!==null&&u===c}})}function $(n,a){document.getElementById("dedup-review")?.remove();let t=document.createElement("dialog");t.id="dedup-review",t.setAttribute("aria-labelledby","dedup-review-title");let d=0,u=()=>{t.close(),t.remove()};function c(e){return`<div class="dedup-record"><h3>${a(e.sourceLabel)}</h3><p class="dedup-name">${a(e.name||"(no name)")}</p><p class="muted">${e.coordinates[1].toFixed(6)}, ${e.coordinates[0].toFixed(6)} \xB7 record ${a(e.id)}</p></div>`}function y(e){let l=n.decided.get(e.key),p=Object.keys(e.a.attributes),i=o=>o==null||o===""?'<span class="absent" aria-label="no value">\u2014</span>':a(String(o));t.innerHTML=`<h2 id="dedup-review-title">Are these the same record?</h2>
      <p class="muted">${d+1} of ${n.candidates.length} waiting \xB7 both rows share ${a(e.a.name||"")}, and
        ${e.differs?.length} compared ${e.differs?.length===1?"column differs":"columns differ"}.</p>
      <table class="dedup-fields"><thead><tr><th>Column</th><th>Row ${a(e.a.id)}</th><th>Row ${a(e.b.id)}</th></tr></thead>
        <tbody>${p.map(o=>`<tr class="${e.differs?.includes(o)?"":"agrees"}"><th scope="row">${a(o)}</th><td>${i(e.a.attributes[o])}</td><td>${i(e.b.attributes[o])}</td></tr>`).join("")}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${a(l?.reason||"")}"
        placeholder="What makes them one record, or two">
      <p class="muted">The row you do not keep is left out of this step's table and named in its receipt. The input table is not changed.</p>
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${d?"":"disabled"}>Previous</button>
        <button id="dedup-next" class="button small" ${d<n.candidates.length-1?"":"disabled"}>Skip</button>
        <span class="spacer"></span>
        ${l?'<button id="dedup-undecide" class="text-button">Take the decision back</button>':""}
        <button id="dedup-different" class="button">Two records</button>
        <button id="dedup-keep-a" class="button primary">Same record, keep row ${a(e.a.id)}</button>
        <button id="dedup-keep-b" class="button primary">Same record, keep row ${a(e.b.id)}</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`,g(e),t.querySelector("#dedup-keep-a").onclick=()=>b(e,"match","a"),t.querySelector("#dedup-keep-b").onclick=()=>b(e,"match","b")}let b=(e,l,p)=>{let i=t.querySelector("#dedup-review-reason"),o=i.value.trim();if(!o){i.focus();return}n.onDecide(e.key,l,o,p),n.decided.set(e.key,{decision:l,reason:o}),d<n.candidates.length-1&&d++,r()};function g(e){t.querySelector("#dedup-different").onclick=()=>b(e,"non-match"),t.querySelector("#dedup-review-close").onclick=u,t.querySelector("#dedup-previous").onclick=()=>{d&&(d--,r())},t.querySelector("#dedup-next").onclick=()=>{d<n.candidates.length-1&&(d++,r())},t.querySelector("#dedup-undecide")?.addEventListener("click",()=>{n.onClear(e.key),n.decided.delete(e.key),r()})}function r(){let e=n.candidates[d];if(e?.differs){y(e);return}if(!e){t.innerHTML='<h2 id="dedup-review-title">Nothing left to review</h2><p>Every pair this run offered has been decided. Run the workflow again to act on them.</p><div class="dialog-actions"><button id="dedup-review-close" class="button primary">Close</button></div>',t.querySelector("#dedup-review-close").onclick=u;return}let l=n.decided.get(e.key),p=k(e.a,e.b),i=p.filter(s=>s.agrees).length;t.innerHTML=`<h2 id="dedup-review-title">Are these the same place?</h2>
      <p class="muted">${d+1} of ${n.candidates.length} waiting \xB7 a pair reaches you when the
        two tests disagree, so the answer is a judgement rather than a calculation.</p>
      <div class="dedup-pair">${c(e.a)}${c(e.b)}</div>
      <div class="dedup-measures">
        <span><b>${Math.round(e.metres)} m</b> apart</span>
        <span>names ${e.nameSimilarity===null?"<b>not comparable</b>":`<b>${e.nameSimilarity.toFixed(2)}</b>`}
          ${e.nameAgrees?"\xB7 agreed":"\xB7 did not agree"}</span>
        <span>${e.nearAgrees?"close enough to count as one place":"further apart than the distance you set"}</span>
        <span>${i} other ${i===1?"field agrees":"fields agree"}</span>
      </div>
      <table class="dedup-fields"><thead><tr><th>Attribute</th><th>${a(e.a.sourceLabel)}</th><th>${a(e.b.sourceLabel)}</th></tr></thead>
        <tbody>${p.map(s=>`<tr class="${s.agrees?"agrees":""}"><th scope="row">${a(s.key)}</th><td>${s.left===null?'<span class="absent" aria-label="no value">\u2014</span>':a(s.left)}</td><td>${s.right===null?'<span class="absent" aria-label="no value">\u2014</span>':a(s.right)}</td></tr>`).join("")}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${a(l?.reason||"")}"
        placeholder="What makes them the same, or different">
      <p class="muted">Kept with the decision, and pinned to these records as they are: edit either one and the judgement lapses.</p>
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${d?"":"disabled"}>Previous</button>
        <button id="dedup-next" class="button small" ${d<n.candidates.length-1?"":"disabled"}>Skip</button>
        <span class="spacer"></span>
        ${l?'<button id="dedup-undecide" class="text-button">Take the decision back</button>':""}
        <button id="dedup-different" class="button">Different places</button>
        <button id="dedup-same" class="button primary">The same place</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`;let o=()=>t.querySelector("#dedup-review-reason").value.trim(),m=s=>{let h=o();if(!h){t.querySelector("#dedup-review-reason").focus();return}n.onDecide(e.key,s,h),n.decided.set(e.key,{decision:s,reason:h}),d<n.candidates.length-1&&d++,r()};t.querySelector("#dedup-same").onclick=()=>m("match"),t.querySelector("#dedup-different").onclick=()=>m("non-match"),t.querySelector("#dedup-review-close").onclick=u,t.querySelector("#dedup-previous").onclick=()=>{d&&(d--,r())},t.querySelector("#dedup-next").onclick=()=>{d<n.candidates.length-1&&(d++,r())},t.querySelector("#dedup-undecide")?.addEventListener("click",()=>{n.onClear(e.key),n.decided.delete(e.key),r()})}r(),document.body.append(t),t.showModal(),t.addEventListener("close",()=>t.remove())}export{$ as a};
//# sourceMappingURL=chunk-PYWIQJG4.js.map
