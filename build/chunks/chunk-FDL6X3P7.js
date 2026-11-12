var f=n=>n==null||n===""?null:String(n);function k(n,o){return[...new Set([...Object.keys(n.attributes),...Object.keys(o.attributes)])].sort().map(d=>{let u=f(n.attributes[d]),c=f(o.attributes[d]);return{key:d,left:u,right:c,agrees:u!==null&&c!==null&&u===c}})}function $(n,o){document.getElementById("dedup-review")?.remove();let t=document.createElement("dialog");t.id="dedup-review",t.setAttribute("aria-labelledby","dedup-review-title");let d=0,u=()=>{t.close(),t.remove()};function c(e){return`<div class="dedup-record"><h3>${o(e.sourceLabel)}</h3><p class="dedup-name">${o(e.name||"(no name)")}</p><p class="muted">${e.coordinates[1].toFixed(6)}, ${e.coordinates[0].toFixed(6)} \xB7 record ${o(e.id)}</p></div>`}function y(e){let r=n.decided.get(e.key),p=Object.keys(e.a.attributes),i=a=>a==null||a===""?'<span class="absent" aria-label="no value">\u2014</span>':o(String(a));t.innerHTML=`<h2 id="dedup-review-title">Are these the same record?</h2>
      <p class="muted">${d+1} of ${n.candidates.length} waiting \xB7 both rows share ${o(e.a.name||"")}, and
        ${e.differs?.length} compared ${e.differs?.length===1?"column differs":"columns differ"}.</p>
      <table class="dedup-fields"><thead><tr><th>Column</th><th>Row ${o(e.a.id)}</th><th>Row ${o(e.b.id)}</th></tr></thead>
        <tbody>${p.map(a=>`<tr class="${e.differs?.includes(a)?"":"agrees"}"><th scope="row">${o(a)}</th><td>${i(e.a.attributes[a])}</td><td>${i(e.b.attributes[a])}</td></tr>`).join("")}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${o(r?.reason||"")}"
        placeholder="What makes them one record, or two">
      
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${d?"":"disabled"}>Previous</button>
        <button id="dedup-next" class="button small" ${d<n.candidates.length-1?"":"disabled"}>Skip</button>
        <span class="spacer"></span>
        ${r?'<button id="dedup-undecide" class="text-button">Take the decision back</button>':""}
        <button id="dedup-different" class="button">Two records</button>
        <button id="dedup-keep-a" class="button primary">Same record, keep row ${o(e.a.id)}</button>
        <button id="dedup-keep-b" class="button primary">Same record, keep row ${o(e.b.id)}</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`,g(e),t.querySelector("#dedup-keep-a").onclick=()=>b(e,"match","a"),t.querySelector("#dedup-keep-b").onclick=()=>b(e,"match","b")}let b=(e,r,p)=>{let i=t.querySelector("#dedup-review-reason"),a=i.value.trim();if(!a){i.focus();return}n.onDecide(e.key,r,a,p),n.decided.set(e.key,{decision:r,reason:a}),d<n.candidates.length-1&&d++,l()};function g(e){t.querySelector("#dedup-different").onclick=()=>b(e,"non-match"),t.querySelector("#dedup-review-close").onclick=u,t.querySelector("#dedup-previous").onclick=()=>{d&&(d--,l())},t.querySelector("#dedup-next").onclick=()=>{d<n.candidates.length-1&&(d++,l())},t.querySelector("#dedup-undecide")?.addEventListener("click",()=>{n.onClear(e.key),n.decided.delete(e.key),l()})}function l(){let e=n.candidates[d];if(e?.differs){y(e);return}if(!e){t.innerHTML='<h2 id="dedup-review-title">Nothing left to review</h2><p>Every pair this run offered has been decided. Run the workflow again to act on them.</p><div class="dialog-actions"><button id="dedup-review-close" class="button primary">Close</button></div>',t.querySelector("#dedup-review-close").onclick=u;return}let r=n.decided.get(e.key),p=k(e.a,e.b),i=p.filter(s=>s.agrees).length;t.innerHTML=`<h2 id="dedup-review-title">Are these the same place?</h2>
      <p class="muted">${d+1} of ${n.candidates.length} waiting</p>
      <div class="dedup-pair">${c(e.a)}${c(e.b)}</div>
      <div class="dedup-measures">
        <span><b>${Math.round(e.metres)} m</b> apart</span>
        <span>names ${e.nameSimilarity===null?"<b>not comparable</b>":`<b>${e.nameSimilarity.toFixed(2)}</b>`}
          ${e.nameAgrees?"\xB7 agreed":"\xB7 did not agree"}</span>
        <span>${e.nearAgrees?"close enough to count as one place":"further apart than the distance you set"}</span>
        <span>${i} other ${i===1?"field agrees":"fields agree"}</span>
      </div>
      <table class="dedup-fields"><thead><tr><th>Attribute</th><th>${o(e.a.sourceLabel)}</th><th>${o(e.b.sourceLabel)}</th></tr></thead>
        <tbody>${p.map(s=>`<tr class="${s.agrees?"agrees":""}"><th scope="row">${o(s.key)}</th><td>${s.left===null?'<span class="absent" aria-label="no value">\u2014</span>':o(s.left)}</td><td>${s.right===null?'<span class="absent" aria-label="no value">\u2014</span>':o(s.right)}</td></tr>`).join("")}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${o(r?.reason||"")}"
        placeholder="What makes them the same, or different">
      
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${d?"":"disabled"}>Previous</button>
        <button id="dedup-next" class="button small" ${d<n.candidates.length-1?"":"disabled"}>Skip</button>
        <span class="spacer"></span>
        ${r?'<button id="dedup-undecide" class="text-button">Take the decision back</button>':""}
        <button id="dedup-different" class="button">Different places</button>
        <button id="dedup-same" class="button primary">The same place</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`;let a=()=>t.querySelector("#dedup-review-reason").value.trim(),h=s=>{let m=a();if(!m){t.querySelector("#dedup-review-reason").focus();return}n.onDecide(e.key,s,m),n.decided.set(e.key,{decision:s,reason:m}),d<n.candidates.length-1&&d++,l()};t.querySelector("#dedup-same").onclick=()=>h("match"),t.querySelector("#dedup-different").onclick=()=>h("non-match"),t.querySelector("#dedup-review-close").onclick=u,t.querySelector("#dedup-previous").onclick=()=>{d&&(d--,l())},t.querySelector("#dedup-next").onclick=()=>{d<n.candidates.length-1&&(d++,l())},t.querySelector("#dedup-undecide")?.addEventListener("click",()=>{n.onClear(e.key),n.decided.delete(e.key),l()})}l(),document.body.append(t),t.showModal(),t.addEventListener("close",()=>t.remove())}export{$ as a};
//# sourceMappingURL=chunk-FDL6X3P7.js.map
