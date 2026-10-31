import{g as N}from"./chunk-FNKA5ZT3.js";var M={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},C="vancouver";function _(t){let e=M[t];if(e?.citation)return N({licence:"none-applies",published:e.published,citation:e.citation},C)}var S=t=>t.replace(/[\\{}$&#^_%~]/g,e=>e==="\\"?"\\backslash ":`\\${e}`),T=t=>`\\text{${S(t)}}`,o=(t,e=0)=>t.toLocaleString("en-US",{minimumFractionDigits:e,maximumFractionDigits:e}).replace(/,/g,"{,}"),s=(t,e)=>o(Number(t.toFixed(e)),e),l=t=>t.toLocaleString("en-US");function k(t){let e=[...new Set(t)].map(n=>_(n)?n:`${n} (no primary source read)`);return e.length?`

Method: ${e.join(", ")}. The works are in References.`:""}var x=(t,e)=>{let n=Math.abs(t.value??0)<.01?6:2;return`

$$${e}$$

$$= ${s(t.lower??0,n)} \\text{ to } ${s(t.upper??0,n)} \\quad (${t.level}\\%)$$`};function D(t,e){let{numeratorField:n,denominatorField:r,multiplier:i,denominatorUnit:c,rateKind:$}=t.options;if(t.overall===null)return null;let d=`per ${l(i)} ${c}`,m=`The ${$==="proportion"?"proportion":"rate"} is ${n} divided by ${r}, times ${i.toLocaleString()}:

$$\\text{rate} = \\frac{${T(n)}}{${T(r)}} \\times ${o(i)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${t.rows.length} of them \u2014 ${l(t.totalNumerator)} ${n} and ${l(t.totalDenominator)} ${r}:

$$\\frac{${o(t.totalNumerator)}}{${o(t.totalDenominator)}} \\times ${o(i)} = ${s(t.overall,3)}$$

That is ${s(t.overall,3)} ${d}, for the numerator over ${t.options.numeratorPeriod} against a denominator of ${t.options.denominatorVintage}. The unit is what makes this comparable or not: a ${$} per ${c} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:m,nodeId:e}}function O(t,e){let{compared:n,reference:r,ratio:i,lower:c,upper:$,level:d,method:m}=t,u=Math.abs(Math.log($/i))/Math.sqrt(1/n.events+1/r.events),p=`The rate ratio is ${n.label}'s rate over ${r.label}'s. Both rates are per ${t.denominatorUnit}, so the multiplier cancels and the ratio is dimensionless:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$

with $a_1$ and $n_1$ the events and ${t.denominatorUnit} at risk in ${n.label}, and $a_0$ and $n_0$ the same in ${r.label}:

$$\\mathrm{RR} = \\frac{${o(n.events)} / ${o(n.unitsAtRisk)}}{${o(r.events)} / ${o(r.unitsAtRisk)}} = ${s(i,2)}$$

The ${d}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${s(i,4)} \\pm ${s(u,6)} \\sqrt{\\frac{1}{${o(n.events)}} + \\frac{1}{${o(r.events)}}}\\right) = ${s(c,2)} \\text{ to } ${s($,2)}$$

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+k([m]);return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:p,nodeId:e,cites:[m]}}var y=(t,e,n)=>`

**${t.name}**, ${t.method}:`+(t.unavailable?`

$$${e}$$

Not computed: ${t.unavailable}`:`

$$${e}$$

$$${n}$$`);function z(t,e){let{exposed:n,unexposed:r,caseValue:i,nonCaseValue:c,exposureColumn:$}=t.request,{exposedCases:d,exposedNonCases:m,unexposedCases:u,unexposedNonCases:p}=t.cells,f=o(d),q=o(m),g=o(u),E=o(p),v=o(t.exposedTotal),w=o(t.unexposedTotal),b=a=>`${$} "${a}"`,h=`The four cells, in the letters every formula below is written in:

- $a$ = ${l(d)} \u2014 ${b(n)}, ${i}
- $b$ = ${l(m)} \u2014 ${b(n)}, ${c}
- $c$ = ${l(u)} \u2014 ${b(r)}, ${i}
- $d$ = ${l(p)} \u2014 ${b(r)}, ${c}

The risks are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${f}}{${v}} = ${s(t.riskExposed??0,5)} \\qquad \\frac{${g}}{${w}} = ${s(t.riskUnexposed??0,5)}$$`,R=[];for(let a of t.estimates)R.push(a.method),a.name==="risk ratio"?h+=y(a,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${f}/${v}}{${g}/${w}} = ${s(a.value??0,2)}`)+(a.unavailable?"":x(a,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):a.name==="odds ratio"?h+=y(a,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${f} \\times ${E}}{${q} \\times ${g}} = ${s(a.value??0,2)}`)+(a.unavailable?"":x(a,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):a.name==="risk difference"&&(h+=y(a,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${f}}{${v}} - \\frac{${g}}{${w}} = ${s(a.value??0,6)}`)+(a.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+x(a,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}")));return t.strataLeftOut.length&&(h+=`

This table also holds ${t.strataLeftOut.map(a=>`"${a}"`).join(", ")} in ${$}, which is in neither group, so the letters above total ${l(t.total)} and not the table.`),h+=k(R),{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:h,nodeId:e,cites:[...new Set(R)]}}function A(t,e){let n=i=>JSON.stringify(i),r=i=>{let c=_(i),$=M[i]?.uncited,d=c?`fw:methodReference ${n(c)}`:`fw:methodUncited ${n($||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${n(i)}; ${d} ]`};return e.map(i=>`${t} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${n(i.section)}; `+(i.fn?`fw:noteFunction ${n(i.fn)}; `:"")+[...new Set(i.cites||[])].map(c=>`${r(c)}; `).join("")+`fw:noteText ${n(i.text)} ].
`).join("")}export{M as a,C as b,_ as c,D as d,O as e,z as f,A as g};
//# sourceMappingURL=chunk-5G33UTXL.js.map
