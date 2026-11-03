import{h as j}from"./chunk-NFLCAI7Q.js";var D={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},U="vancouver";function z(e){let t=D[e];if(t?.citation)return j({licence:"none-applies",published:t.published,citation:t.citation},U)}var P=e=>e.replace(/[\\{}$&#^_%~]/g,t=>t==="\\"?"\\backslash ":`\\${t}`),A=e=>`\\text{${P(e)}}`,r=(e,t=0)=>e.toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t}).replace(/,/g,"{,}"),c=(e,t)=>r(Number(e.toFixed(t)),t),h=e=>e.toLocaleString("en-US");function q(e){let t=[...new Set(e)].map(i=>z(i)?i:`${i} (no primary source read)`);return t.length?`

Method: ${t.join(", ")}. The works are in References.`:""}var T=(e,t)=>{let i=Math.abs(e.value??0)<.01?6:2;return`

$$${t}$$

$$= ${c(e.lower??0,i)} \\text{ to } ${c(e.upper??0,i)} \\quad (${e.level}\\%)$$`};function H(e,t){let{numeratorField:i,denominatorField:o,multiplier:a,denominatorUnit:s,rateKind:d}=e.options;if(e.overall===null)return null;let l=`per ${h(a)} ${s}`,f=`The ${d==="proportion"?"proportion":"rate"} is ${i} divided by ${o}, times ${a.toLocaleString()}:

$$\\text{rate} = \\frac{${A(i)}}{${A(o)}} \\times ${r(a)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${e.rows.length} of them \u2014 ${h(e.totalNumerator)} ${i} and ${h(e.totalDenominator)} ${o}:

$$\\frac{${r(e.totalNumerator)}}{${r(e.totalDenominator)}} \\times ${r(a)} = ${c(e.overall,3)}$$

That is ${c(e.overall,3)} ${l}, for the numerator over ${e.options.numeratorPeriod} against a denominator of ${e.options.denominatorVintage}. The unit is what makes this comparable or not: a ${d} per ${s} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:f,nodeId:t}}function K(e,t){let{compared:i,reference:o,ratio:a,lower:s,upper:d,level:l,method:f}=e,u=Math.abs(Math.log(d/a))/Math.sqrt(1/i.events+1/o.events),g=`The rate ratio is ${i.label}'s rate over ${o.label}'s. Both rates are per ${e.denominatorUnit}, so the multiplier cancels and the ratio is dimensionless:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$

with $a_1$ and $n_1$ the events and ${e.denominatorUnit} at risk in ${i.label}, and $a_0$ and $n_0$ the same in ${o.label}:

$$\\mathrm{RR} = \\frac{${r(i.events)} / ${r(i.unitsAtRisk)}}{${r(o.events)} / ${r(o.unitsAtRisk)}} = ${c(a,2)}$$

The ${l}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${c(a,4)} \\pm ${c(u,6)} \\sqrt{\\frac{1}{${r(i.events)}} + \\frac{1}{${r(o.events)}}}\\right) = ${c(s,2)} \\text{ to } ${c(d,2)}$$

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+q([f]);return{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:g,nodeId:t,cites:[f]}}var w={"risk ratio":"RR","odds ratio":"OR","risk difference":"RD","prevalence ratio":"PR","prevalence odds ratio":"POR","prevalence difference":"PD","ratio of row proportions":"ratio","cross-product ratio":"cross\\ product","difference of row proportions":"difference"},_=(e,t,i)=>`

**${e.reportedAs??e.name}**, ${e.method}:`+(e.unavailable?`

$$${t}$$

Not computed: ${e.unavailable}`:`

$$${t}$$

$$${i}$$`);function V(e,t,i=!1){let{exposed:o,unexposed:a,caseValue:s,nonCaseValue:d,exposureColumn:l}=e.request,{exposedCases:f,exposedNonCases:u,unexposedCases:g,unexposedNonCases:E}=e.cells,b=r(f),L=r(u),R=r(g),B=r(E),x=r(e.exposedTotal),y=r(e.unexposedTotal),v=n=>`${l} "${n}"`,C=e.reading?e.reading.rowProportion:"risk";if(i){let n=`Every exposure on this step is computed from its own four cells, with these formulas. Each exposure's cells and estimates are in the step's table.

- $a$ \u2014 exposed ("${o}"), ${s}
- $b$ \u2014 exposed ("${o}"), ${d}
- $c$ \u2014 unexposed ("${a}"), ${s}
- $d$ \u2014 unexposed ("${a}"), ${d}`,p=[],F={"risk ratio":["\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}","\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)"],"odds ratio":["\\mathrm{OR} = \\frac{ad}{bc}","\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)"],"risk difference":["\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}","\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"]};for(let m of e.estimates){let M=F[m.name];if(!M)continue;p.push(m.method);let k=`

**${m.reportedAs??m.name}**, ${m.method}:

$$${M[0]}$$

with a ${m.level}% interval

$$${M[1]}$$`;m.reportedAs&&(k=k.split(`\\mathrm{${w[m.name]}}`).join(`\\mathrm{${w[m.reportedAs]}}`)),n+=k}let S=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return S.length&&(n+=`

Not reported under this design: ${S.join(", ")}.`),e.reading?.design===null&&(n+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),n+=q(p),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:n,nodeId:t,cites:[...new Set(p)]}}let $=`The four cells, in the letters every formula below is written in:

- $a$ = ${h(f)} \u2014 ${v(o)}, ${s}
- $b$ = ${h(u)} \u2014 ${v(o)}, ${d}
- $c$ = ${h(g)} \u2014 ${v(a)}, ${s}
- $d$ = ${h(E)} \u2014 ${v(a)}, ${d}`+(C===null?"":`

The ${C}s are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${b}}{${x}} = ${c(e.riskExposed??0,5)} \\qquad \\frac{${R}}{${y}} = ${c(e.riskUnexposed??0,5)}$$`),N=[];for(let n of e.estimates){N.push(n.method);let p=$.length;n.name==="risk ratio"?$+=_(n,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${b}/${x}}{${R}/${y}} = ${c(n.value??0,2)}`)+(n.unavailable?"":T(n,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):n.name==="odds ratio"?$+=_(n,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${b} \\times ${B}}{${L} \\times ${R}} = ${c(n.value??0,2)}`)+(n.unavailable?"":T(n,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):n.name==="risk difference"&&($+=_(n,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${b}}{${x}} - \\frac{${R}}{${y}} = ${c(n.value??0,6)}`)+(n.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+T(n,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"))),n.reportedAs&&($=$.slice(0,p)+$.slice(p).split(`\\mathrm{${w[n.name]}}`).join(`\\mathrm{${w[n.reportedAs]}}`))}let O=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return O.length&&($+=`

Not reported under this design: ${O.join(", ")}.`),e.reading?.design===null&&($+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),e.strataLeftOut.length&&($+=`

This table also holds ${e.strataLeftOut.map(n=>`"${n}"`).join(", ")} in ${l}, which is in neither group, so the letters above total ${h(e.total)} and not the table.`),$+=q(N),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:$,nodeId:t,cites:[...new Set(N)]}}function J(e,t){let i=a=>JSON.stringify(a),o=a=>{let s=z(a),d=D[a]?.uncited,l=s?`fw:methodReference ${i(s)}`:`fw:methodUncited ${i(d||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${i(a)}; ${l} ]`};return t.map(a=>`${e} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${i(a.section)}; `+(a.fn?`fw:noteFunction ${i(a.fn)}; `:"")+[...new Set(a.cites||[])].map(s=>`${o(s)}; `).join("")+`fw:noteText ${i(a.text)} ].
`).join("")}export{D as a,U as b,z as c,H as d,K as e,V as f,J as g};
//# sourceMappingURL=chunk-SK5F3DS4.js.map
