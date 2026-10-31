import{g as N}from"./chunk-K6IMXJIS.js";var M={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},E="vancouver";function C(t){let e=M[t];if(e?.citation)return N({licence:"none-applies",published:e.published,citation:e.citation},E)}var S=t=>t.replace(/[\\{}$&#^_%~]/g,e=>e==="\\"?"\\backslash ":`\\${e}`),T=t=>`\\text{${S(t)}}`,o=(t,e=0)=>t.toLocaleString("en-US",{minimumFractionDigits:e,maximumFractionDigits:e}).replace(/,/g,"{,}"),r=(t,e)=>o(Number(t.toFixed(e)),e),c=t=>t.toLocaleString("en-US");function _(t){let e=[...new Set(t)].map(n=>{let a=C(n);return`- **${n}**: `+(a||M[n]?.uncited||"No source has been read for this method.")});return e.length?`

Method:

${e.join(`
`)}`:""}var x=(t,e)=>{let n=Math.abs(t.value??0)<.01?6:2;return`

$$${e}$$

$$= ${r(t.lower??0,n)} \\text{ to } ${r(t.upper??0,n)} \\quad (${t.level}\\%)$$`};function D(t,e){let{numeratorField:n,denominatorField:a,multiplier:s,denominatorUnit:l,rateKind:$}=t.options;if(t.overall===null)return null;let d=`per ${c(s)} ${l}`,m=`The ${$==="proportion"?"proportion":"rate"} is ${n} divided by ${a}, times ${s.toLocaleString()}:

$$\\text{rate} = \\frac{${T(n)}}{${T(a)}} \\times ${o(s)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${t.rows.length} of them \u2014 ${c(t.totalNumerator)} ${n} and ${c(t.totalDenominator)} ${a}:

$$\\frac{${o(t.totalNumerator)}}{${o(t.totalDenominator)}} \\times ${o(s)} = ${r(t.overall,3)}$$

That is ${r(t.overall,3)} ${d}, for the numerator over ${t.options.numeratorPeriod} against a denominator of ${t.options.denominatorVintage}. The unit is what makes this comparable or not: a ${$} per ${l} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:m,nodeId:e}}function O(t,e){let{compared:n,reference:a,ratio:s,lower:l,upper:$,level:d,method:m}=t,p=Math.abs(Math.log($/s))/Math.sqrt(1/n.events+1/a.events),u=`The rate ratio is ${n.label}'s rate over ${a.label}'s. Both rates are per ${t.denominatorUnit}, so the multiplier cancels and the ratio is dimensionless:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$

with $a_1$ and $n_1$ the events and ${t.denominatorUnit} at risk in ${n.label}, and $a_0$ and $n_0$ the same in ${a.label}:

$$\\mathrm{RR} = \\frac{${o(n.events)} / ${o(n.unitsAtRisk)}}{${o(a.events)} / ${o(a.unitsAtRisk)}} = ${r(s,2)}$$

The ${d}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${r(s,4)} \\pm ${r(p,6)} \\sqrt{\\frac{1}{${o(n.events)}} + \\frac{1}{${o(a.events)}}}\\right) = ${r(l,2)} \\text{ to } ${r($,2)}$$

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+_([m]);return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:u,nodeId:e}}var w=(t,e,n)=>`

**${t.name}**, ${t.method}:`+(t.unavailable?`

$$${e}$$

Not computed: ${t.unavailable}`:`

$$${e}$$

$$${n}$$`);function z(t,e){let{exposed:n,unexposed:a,caseValue:s,nonCaseValue:l,exposureColumn:$}=t.request,{exposedCases:d,exposedNonCases:m,unexposedCases:p,unexposedNonCases:u}=t.cells,f=o(d),k=o(m),g=o(p),q=o(u),v=o(t.exposedTotal),R=o(t.unexposedTotal),b=i=>`${$} "${i}"`,h=`The four cells, in the letters every formula below is written in:

- $a$ = ${c(d)} \u2014 ${b(n)}, ${s}
- $b$ = ${c(m)} \u2014 ${b(n)}, ${l}
- $c$ = ${c(p)} \u2014 ${b(a)}, ${s}
- $d$ = ${c(u)} \u2014 ${b(a)}, ${l}

The risks are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${f}}{${v}} = ${r(t.riskExposed??0,5)} \\qquad \\frac{${g}}{${R}} = ${r(t.riskUnexposed??0,5)}$$`,y=[];for(let i of t.estimates)y.push(i.method),i.name==="risk ratio"?h+=w(i,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${f}/${v}}{${g}/${R}} = ${r(i.value??0,2)}`)+(i.unavailable?"":x(i,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):i.name==="odds ratio"?h+=w(i,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${f} \\times ${q}}{${k} \\times ${g}} = ${r(i.value??0,2)}`)+(i.unavailable?"":x(i,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):i.name==="risk difference"&&(h+=w(i,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${f}}{${v}} - \\frac{${g}}{${R}} = ${r(i.value??0,6)}`)+(i.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+x(i,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}")));return t.strataLeftOut.length&&(h+=`

This table also holds ${t.strataLeftOut.map(i=>`"${i}"`).join(", ")} in ${$}, which is in neither group, so the letters above total ${c(t.total)} and not the table.`),h+=_(y),{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:h,nodeId:e}}function A(t,e){let n=a=>JSON.stringify(a);return e.map(a=>`${t} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${n(a.section)}; fw:noteText ${n(a.text)} ].
`).join("")}export{M as a,E as b,C as c,D as d,O as e,z as f,A as g};
//# sourceMappingURL=chunk-ZHSFBODH.js.map
