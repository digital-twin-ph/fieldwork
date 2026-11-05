import{h as D}from"./chunk-NFLCAI7Q.js";var z={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},U="vancouver";function L(e){let t=z[e];if(t?.citation)return D({licence:"none-applies",published:t.published,citation:t.citation},U)}var P=e=>e.replace(/[\\{}$&#^_%~]/g,t=>t==="\\"?"\\backslash ":`\\${t}`),B=e=>`\\text{${P(e)}}`,a=(e,t=0)=>e.toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t}).replace(/,/g,"{,}"),d=(e,t)=>a(Number(e.toFixed(t)),t),l=e=>e.toLocaleString("en-US");function S(e){let t=[...new Set(e)].map(i=>L(i)?i:`${i} (no primary source read)`);return t.length?`

Method: ${t.join(", ")}. The works are in References.`:""}var q=(e,t)=>{let i=Math.abs(e.value??0)<.01?6:2;return`

$$${t}$$

$$= ${d(e.lower??0,i)} \\text{ to } ${d(e.upper??0,i)} \\quad (${e.level}\\%)$$`};function W(e,t){let{numeratorField:i,denominatorField:s,multiplier:o,denominatorUnit:r,rateKind:m}=e.options;if(e.overall===null)return null;let h=`per ${l(o)} ${r}`,u=`The ${m==="proportion"?"proportion":"rate"} is ${i} divided by ${s}, times ${o.toLocaleString()}:

$$\\text{rate} = \\frac{${B(i)}}{${B(s)}} \\times ${a(o)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${e.rows.length} of them \u2014 ${l(e.totalNumerator)} ${i} and ${l(e.totalDenominator)} ${s}:

$$\\frac{${a(e.totalNumerator)}}{${a(e.totalDenominator)}} \\times ${a(o)} = ${d(e.overall,3)}$$

That is ${d(e.overall,3)} ${h}, for the numerator over ${e.options.numeratorPeriod} against a denominator of ${e.options.denominatorVintage}. The unit is what makes this comparable or not: a ${m} per ${r} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:u,nodeId:t}}function H(e,t){let{exposed:i,unexposed:s,caseValue:o,unitsAtRiskValue:r,exposureColumn:m}=e.request,{exposedEvents:h,exposedUnitsAtRisk:u,unexposedEvents:g,unexposedUnitsAtRisk:T}=e.cells,b=c=>`${m} "${c}"`,p=`The rate ratio is ${i}'s rate over ${s}'s. Both rates are per ${r}, so the ratio is dimensionless. The cells, in the letters the formulas are written in:

- $a_1$ = ${l(h)} \u2014 ${b(i)}, ${o}
- $n_1$ = ${l(u)} \u2014 ${b(i)}, ${r}
- $a_0$ = ${l(g)} \u2014 ${b(s)}, ${o}
- $n_0$ = ${l(T)} \u2014 ${b(s)}, ${r}`,N=[];for(let c of e.estimates){N.push(c.method),p+=`

**${c.reportedAs??c.name}**, ${c.method}:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$`;let{value:v,lower:R,upper:w}=c;if(v===null||R===null||w===null){p+=`

Not computed: ${c.unavailable??""}`;continue}let x=Math.abs(Math.log(w/v))/Math.sqrt(1/h+1/g);p+=`

$$\\mathrm{RR} = \\frac{${a(h)} / ${a(u)}}{${a(g)} / ${a(T)}} = ${d(v,2)}$$

The ${c.level}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${d(v,4)} \\pm ${d(x,6)} \\sqrt{\\frac{1}{${a(h)}} + \\frac{1}{${a(g)}}}\\right) = ${d(R,2)} \\text{ to } ${d(w,2)}$$`}return e.reading?.design===null&&(p+=`

No study design was connected. The rate ratio keeps its name: events over units at risk is a rate under any design, and a design decides only whether one may be reported.`),p+=`

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+S(N),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:p,nodeId:t,cites:[...new Set(N)]}}var k={"risk ratio":"RR","odds ratio":"OR","risk difference":"RD","prevalence ratio":"PR","prevalence odds ratio":"POR","prevalence difference":"PD","ratio of row proportions":"ratio","cross-product ratio":"cross\\ product","difference of row proportions":"difference"},C=(e,t,i)=>`

**${e.reportedAs??e.name}**, ${e.method}:`+(e.unavailable?`

$$${t}$$

Not computed: ${e.unavailable}`:`

$$${t}$$

$$${i}$$`);function K(e,t,i=!1){let{exposed:s,unexposed:o,caseValue:r,nonCaseValue:m,exposureColumn:h}=e.request,{exposedCases:u,exposedNonCases:g,unexposedCases:T,unexposedNonCases:b}=e.cells,p=a(u),N=a(g),c=a(T),v=a(b),R=a(e.exposedTotal),w=a(e.unexposedTotal),x=n=>`${h} "${n}"`,A=e.reading?e.reading.rowProportion:"risk";if(i){let n=`Every exposure on this step is computed from its own four cells, with these formulas. Each exposure's cells and estimates are in the step's table.

- $a$ \u2014 exposed ("${s}"), ${r}
- $b$ \u2014 exposed ("${s}"), ${m}
- $c$ \u2014 unexposed ("${o}"), ${r}
- $d$ \u2014 unexposed ("${o}"), ${m}`,y=[],F={"risk ratio":["\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}","\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)"],"odds ratio":["\\mathrm{OR} = \\frac{ad}{bc}","\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)"],"risk difference":["\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}","\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"]};for(let f of e.estimates){let E=F[f.name];if(!E)continue;y.push(f.method);let _=`

**${f.reportedAs??f.name}**, ${f.method}:

$$${E[0]}$$

with a ${f.level}% interval

$$${E[1]}$$`;f.reportedAs&&(_=_.split(`\\mathrm{${k[f.name]}}`).join(`\\mathrm{${k[f.reportedAs]}}`)),n+=_}let j=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return j.length&&(n+=`

Not reported under this design: ${j.join(", ")}.`),e.reading?.design===null&&(n+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),n+=S(y),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:n,nodeId:t,cites:[...new Set(y)]}}let $=`The four cells, in the letters every formula below is written in:

- $a$ = ${l(u)} \u2014 ${x(s)}, ${r}
- $b$ = ${l(g)} \u2014 ${x(s)}, ${m}
- $c$ = ${l(T)} \u2014 ${x(o)}, ${r}
- $d$ = ${l(b)} \u2014 ${x(o)}, ${m}`+(A===null?"":`

The ${A}s are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${p}}{${R}} = ${d(e.riskExposed??0,5)} \\qquad \\frac{${c}}{${w}} = ${d(e.riskUnexposed??0,5)}$$`),M=[];for(let n of e.estimates){M.push(n.method);let y=$.length;n.name==="risk ratio"?$+=C(n,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${p}/${R}}{${c}/${w}} = ${d(n.value??0,2)}`)+(n.unavailable?"":q(n,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):n.name==="odds ratio"?$+=C(n,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${p} \\times ${v}}{${N} \\times ${c}} = ${d(n.value??0,2)}`)+(n.unavailable?"":q(n,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):n.name==="risk difference"&&($+=C(n,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${p}}{${R}} - \\frac{${c}}{${w}} = ${d(n.value??0,6)}`)+(n.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+q(n,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"))),n.reportedAs&&($=$.slice(0,y)+$.slice(y).split(`\\mathrm{${k[n.name]}}`).join(`\\mathrm{${k[n.reportedAs]}}`))}let O=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return O.length&&($+=`

Not reported under this design: ${O.join(", ")}.`),e.reading?.design===null&&($+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),e.strataLeftOut.length&&($+=`

This table also holds ${e.strataLeftOut.map(n=>`"${n}"`).join(", ")} in ${h}, which is in neither group, so the letters above total ${l(e.total)} and not the table.`),$+=S(M),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:$,nodeId:t,cites:[...new Set(M)]}}function J(e,t){let i=o=>JSON.stringify(o),s=o=>{let r=L(o),m=z[o]?.uncited,h=r?`fw:methodReference ${i(r)}`:`fw:methodUncited ${i(m||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${i(o)}; ${h} ]`};return t.map(o=>`${e} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${i(o.section)}; `+(o.fn?`fw:noteFunction ${i(o.fn)}; `:"")+[...new Set(o.cites||[])].map(r=>`${s(r)}; `).join("")+`fw:noteText ${i(o.text)} ].
`).join("")}export{z as a,U as b,L as c,W as d,H as e,K as f,J as g};
//# sourceMappingURL=chunk-BJ45IYAC.js.map
