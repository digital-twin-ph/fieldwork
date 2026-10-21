var m=n=>n==null||n===""?null:String(n);function g(n,d){return[...new Set([...Object.keys(n.attributes),...Object.keys(d.attributes)])].sort().map(a=>{let i=m(n.attributes[a]),o=m(d.attributes[a]);return{key:a,left:i,right:o,agrees:i!==null&&o!==null&&i===o}})}function f(n,d){document.getElementById("dedup-review")?.remove();let t=document.createElement("dialog");t.id="dedup-review",t.setAttribute("aria-labelledby","dedup-review-title");let a=0,i=()=>{t.close(),t.remove()};function o(e){return`<div class="dedup-record"><h3>${d(e.sourceLabel)}</h3><p class="dedup-name">${d(e.name||"(no name)")}</p><p class="muted">${e.coordinates[1].toFixed(6)}, ${e.coordinates[0].toFixed(6)} \xB7 record ${d(e.id)}</p></div>`}function r(){let e=n.candidates[a];if(!e){t.innerHTML='<h2 id="dedup-review-title">Nothing left to review</h2><p>Every pair this run offered has been decided. Run the workflow again to act on them.</p><div class="dialog-actions"><button id="dedup-review-close" class="button primary">Close</button></div>',t.querySelector("#dedup-review-close").onclick=i;return}let c=n.decided.get(e.key),u=g(e.a,e.b),p=u.filter(s=>s.agrees).length;t.innerHTML=`<h2 id="dedup-review-title">Are these the same place?</h2>
      <p class="muted">${a+1} of ${n.candidates.length} waiting \xB7 a pair reaches you when the
        two tests disagree, so the answer is a judgement rather than a calculation.</p>
      <div class="dedup-pair">${o(e.a)}${o(e.b)}</div>
      <div class="dedup-measures">
        <span><b>${Math.round(e.metres)} m</b> apart</span>
        <span>names ${e.nameSimilarity===null?"<b>not comparable</b>":`<b>${e.nameSimilarity.toFixed(2)}</b>`}
          ${e.nameAgrees?"\xB7 agreed":"\xB7 did not agree"}</span>
        <span>${e.nearAgrees?"close enough to count as one place":"further apart than the distance you set"}</span>
        <span>${p} other ${p===1?"field agrees":"fields agree"}</span>
      </div>
      <table class="dedup-fields"><thead><tr><th>Attribute</th><th>${d(e.a.sourceLabel)}</th><th>${d(e.b.sourceLabel)}</th></tr></thead>
        <tbody>${u.map(s=>`<tr class="${s.agrees?"agrees":""}"><th scope="row">${d(s.key)}</th><td>${s.left===null?'<span class="absent" aria-label="no value">\u2014</span>':d(s.left)}</td><td>${s.right===null?'<span class="absent" aria-label="no value">\u2014</span>':d(s.right)}</td></tr>`).join("")}</tbody></table>
      <label class="field-label" for="dedup-review-reason">Why</label>
      <input id="dedup-review-reason" maxlength="200" value="${d(c?.reason||"")}"
        placeholder="What makes them the same, or different">
      <p class="muted">Kept with the decision, and pinned to these records as they are: edit either one and the judgement lapses.</p>
      <div class="dialog-actions">
        <button id="dedup-previous" class="button small" ${a?"":"disabled"}>Previous</button>
        <button id="dedup-next" class="button small" ${a<n.candidates.length-1?"":"disabled"}>Skip</button>
        <span class="spacer"></span>
        ${c?'<button id="dedup-undecide" class="text-button">Take the decision back</button>':""}
        <button id="dedup-different" class="button">Different places</button>
        <button id="dedup-same" class="button primary">The same place</button>
        <button id="dedup-review-close" class="button small">Close</button>
      </div>`;let b=()=>t.querySelector("#dedup-review-reason").value.trim(),h=s=>{let l=b();if(!l){t.querySelector("#dedup-review-reason").focus();return}n.onDecide(e.key,s,l),n.decided.set(e.key,{decision:s,reason:l}),a<n.candidates.length-1&&a++,r()};t.querySelector("#dedup-same").onclick=()=>h("match"),t.querySelector("#dedup-different").onclick=()=>h("non-match"),t.querySelector("#dedup-review-close").onclick=i,t.querySelector("#dedup-previous").onclick=()=>{a&&(a--,r())},t.querySelector("#dedup-next").onclick=()=>{a<n.candidates.length-1&&(a++,r())},t.querySelector("#dedup-undecide")?.addEventListener("click",()=>{n.onClear(e.key),n.decided.delete(e.key),r()})}r(),document.body.append(t),t.showModal(),t.addEventListener("close",()=>t.remove())}export{f as a};
//# sourceMappingURL=chunk-LHYCFWWT.js.map
