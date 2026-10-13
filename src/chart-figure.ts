import type {ChartSummary} from './results.js';
import type {WorkflowNode} from './types.js';
import {FIGURE_PALETTE,FIGURE_ROLE,FIGURE_TYPE,FIGURE_GRID} from './presentation.js';
import {chartOrientation,chartSourceNote} from './chart-vega.js';

type ChartParams=WorkflowNode<'chart_output'>['params'];

/** A chart as a standalone SVG figure, drawn from the bins rather than from the screen.
 *
 *  Added 2026-10-13. The map could be exported and the chart could not, so half of a figure pair
 *  could leave the application and half could not. The obvious implementation -- serialise whatever
 *  the renderer put in the DOM -- was rejected for two reasons: the classic bars are `<div>`s and
 *  have no SVG to take, and an export that reads the screen gives a different file depending on
 *  which renderer happened to be selected. Drawing from the data gives one figure either way, and
 *  one that can be tested without a browser.
 *
 *  Design follows the same two sources as the rest of the figure work. Tufte: no frame, no tick
 *  marks, no axis line, gridlines only on the measured axis and light enough to read past. Cairo:
 *  the baseline is zero and is not an option, the measure is named on its axis, and the source note
 *  travels with the picture.
 *
 *  Labels are direct rather than a legend. A single series needs no legend -- the title names it --
 *  and a value written at the end of each bar removes the axis round-trip entirely. That is also the
 *  relief the palette's contrast warning requires. A legend appears only when the bars carry
 *  different hues, which is the one case where identity is not already in the label beside the bar.
 */
export const FIGURE_WIDTH=860;

const escape=(value:string):string=>value.replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Wraps on whole words, so a long title breaks between words rather than inside one. */
function wrap(value:string,max:number):string[]{
  if(!value)return [];
  const lines:string[]=[];let line='';
  for(const word of value.split(/\s+/)){
    if(!line)line=word;
    else if((line+' '+word).length<=max)line+=' '+word;
    else{lines.push(line);line=word;}
  }
  if(line)lines.push(line);
  return lines;
}

/** A round axis maximum, so the gridlines land on numbers a reader can hold. */
export function axisMaximum(highest:number):number{
  if(!Number.isFinite(highest)||highest<=0)return 1;
  const power=10**Math.floor(Math.log10(highest));
  for(const step of [1,2,2.5,5,10])if(power*step>=highest)return power*step;
  return power*10;
}

export function standaloneChartSvg(chart:ChartSummary,params:ChartParams,
  context:{sourceId?:string;runId?:string}={}):string{
  const t=FIGURE_TYPE,R=FIGURE_ROLE;
  const vertical=chartOrientation(params)==='vertical';
  const bins=chart.bins;
  if(!bins.length)throw new Error('This chart has no categories to draw.');
  const coloured=!!params.colorByCategory;
  if(coloured&&bins.length>FIGURE_PALETTE.length)
    throw new Error(`A coloured figure supports at most ${FIGURE_PALETTE.length} categories.`);
  const colour=(i:number)=>coloured?FIGURE_PALETTE[i%FIGURE_PALETTE.length]:R.primary;

  const title=params.chartTitle?.trim()||chart.caption;
  const subtitle=params.subtitle?.trim()||'';
  const note=chartSourceNote(params,context.sourceId,context.runId);
  const measureTitle=(vertical?params.yAxisTitle:params.xAxisTitle)?.trim()
    ||(chart.field==='total'?'Recorded total':'Recorded count');
  const categoryTitle=(vertical?params.xAxisTitle:params.yAxisTitle)?.trim()||'Category';

  const titleLines=wrap(title,62),subtitleLines=wrap(subtitle,104),noteLines=wrap(note,112);
  const header=26+titleLines.length*25+(subtitleLines.length?6+subtitleLines.length*16:0);
  const highest=Math.max(...bins.map(b=>b.count));
  const maximum=axisMaximum(highest);
  const ticks=[0,0.25,0.5,0.75,1].map(f=>Math.round(maximum*f));

  // Geometry. The category axis gets room for its labels; the measured axis gets the rest.
  const left=vertical?74:170,top=header+18;
  // Room on the right for the last category's label. A rotated label leans left, so it needs none;
  // a flat one is centred on its bar and overhangs by half its width. Found by rendering the Snow
  // curve and seeing the last date cut off at the edge.
  const slotWidth=(FIGURE_WIDTH-left-28)/bins.length;
  const turnLabels=vertical&&slotWidth<58;
  const longest=Math.max(...bins.map(b=>b.label.length));
  const right=vertical&&!turnLabels?Math.max(28,longest*3.4):28;
  const plot=vertical
    ? {width:FIGURE_WIDTH-left-right,height:300}
    : {width:FIGURE_WIDTH-left-right,height:Math.max(120,bins.length*30)};
  // A label turned 45 degrees stands as tall as its length allows, so the axis title below it has
  // to be pushed down by that much or the two collide -- which they did, at 43 dates.
  const axisRoom=vertical?(turnLabels?Math.min(190,38+Math.ceil(longest*6.2*0.71)):64):40;
  const legendRows=coloured?Math.ceil(bins.length/3):0;
  const footer=18+legendRows*20+noteLines.length*16+10;
  const total=top+plot.height+axisRoom+footer;

  // 2px of surface between neighbouring bars, per the mark spec; thin bars rather than fat ones.
  const slot=(vertical?plot.width:plot.height)/bins.length;
  // With many bars, a number over every one is noise rather than information: the eye reads the
  // shape and the few values that matter. Labelled selectively past a dozen bars -- the tallest, and
  // anything within a tenth of it -- and in full below that, where there is room for all of them.
  const notable=(count:number)=>bins.length<=12||count>=highest*0.9||count===highest;
  const thickness=Math.max(4,Math.min(vertical?46:22,slot-6));
  const scale=(count:number)=>(count/maximum)*(vertical?plot.height:plot.width);

  let body='';
  // Gridlines on the measured axis only, recessive, drawn before the bars so they sit behind.
  for(const tick of ticks){
    if(vertical){
      const y=top+plot.height-scale(tick);
      body+=`<line x1="${left}" y1="${y.toFixed(1)}" x2="${left+plot.width}" y2="${y.toFixed(1)}" `
        +`stroke="${tick===0?R.quietInk:FIGURE_GRID}" stroke-width="1"/>`
        +`<text x="${left-10}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="${t.tick}" `
        +`fill="${R.quietInk}">${tick.toLocaleString('en')}</text>`;
    }else{
      const x=left+scale(tick);
      body+=`<line x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${top+plot.height}" `
        +`stroke="${tick===0?R.quietInk:FIGURE_GRID}" stroke-width="1"/>`
        +`<text x="${x.toFixed(1)}" y="${top+plot.height+20}" text-anchor="middle" `
        +`font-size="${t.tick}" fill="${R.quietInk}">${tick.toLocaleString('en')}</text>`;
    }
  }

  bins.forEach((bin,i)=>{
    const length=scale(bin.count);
    const fill=colour(i);
    const centre=(vertical?left:top)+slot*i+slot/2;
    // A zero-count category keeps its label and its place: the gap is the finding.
    if(vertical){
      const x=centre-thickness/2,y=top+plot.height-length;
      if(length>0)body+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${thickness.toFixed(1)}" `
        +`height="${length.toFixed(1)}" rx="3" fill="${fill}"><title>${escape(bin.label)}: ${bin.count}</title></rect>`;
      if(notable(bin.count))body+=`<text x="${centre.toFixed(1)}" y="${(y-7).toFixed(1)}" text-anchor="middle" `
        +`font-size="${t.tick}" fill="${R.ink}">${bin.count.toLocaleString('en')}</text>`;
      body+=turnLabels
        ?`<text transform="translate(${centre.toFixed(1)},${top+plot.height+14}) rotate(-45)" `
          +`text-anchor="end" font-size="${t.tick}" fill="${R.quietInk}">${escape(bin.label)}</text>`
        :`<text x="${centre.toFixed(1)}" y="${top+plot.height+18}" text-anchor="middle" `
          +`font-size="${t.tick}" fill="${R.quietInk}">${escape(bin.label)}</text>`;
    }else{
      const y=centre-thickness/2;
      if(length>0)body+=`<rect x="${left}" y="${y.toFixed(1)}" width="${length.toFixed(1)}" `
        +`height="${thickness.toFixed(1)}" rx="3" fill="${fill}"><title>${escape(bin.label)}: ${bin.count}</title></rect>`;
      body+=`<text x="${(left+length+8).toFixed(1)}" y="${(centre+4).toFixed(1)}" `
        +`font-size="${t.tick}" fill="${R.ink}">${bin.count.toLocaleString('en')}</text>`
        +`<text x="${left-12}" y="${(centre+4).toFixed(1)}" text-anchor="end" `
        +`font-size="${t.tick}" fill="${R.quietInk}">${escape(bin.label)}</text>`;
    }
  });

  // Axis titles. The measured axis is named because a count and a total are not the same thing.
  body+=vertical
    ?`<text transform="translate(22,${top+plot.height/2}) rotate(-90)" text-anchor="middle" `
      +`font-size="${t.axisTitle}" fill="${R.ink}">${escape(measureTitle)}</text>`
      +`<text x="${left+plot.width/2}" y="${top+plot.height+axisRoom-6}" text-anchor="middle" `
      +`font-size="${t.axisTitle}" fill="${R.ink}">${escape(categoryTitle)}</text>`
    :`<text x="${left+plot.width/2}" y="${top+plot.height+axisRoom-2}" text-anchor="middle" `
      +`font-size="${t.axisTitle}" fill="${R.ink}">${escape(measureTitle)}</text>`;

  const legendTop=top+plot.height+axisRoom+6;
  const legend=coloured?bins.map((bin,i)=>{
    const x=28+(i%3)*270,y=legendTop+Math.floor(i/3)*20;
    return `<rect x="${x}" y="${y-9}" width="10" height="10" rx="2" fill="${colour(i)}"/>`
      +`<text x="${x+16}" y="${y}" font-size="${t.legend}" fill="${R.ink}">${escape(bin.label)}</text>`;
  }).join(''):'';
  const noteTop=legendTop+legendRows*20+(legendRows?8:0);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIGURE_WIDTH} ${total}" `
    +`width="${FIGURE_WIDTH}" height="${total}" role="img" aria-label="${escape(title)}">`
    +`<title>${escape(title)}</title><desc>${escape([subtitle,note].filter(Boolean).join(' '))}</desc>`
    +`<style>text{font-family:${t.family}}</style>`
    +`<rect width="${FIGURE_WIDTH}" height="${total}" fill="${R.background}"/>`
    +titleLines.map((line,i)=>`<text x="28" y="${30+i*25}" font-size="${t.title}" `
      +`font-weight="${t.titleWeight}" fill="${R.ink}">${escape(line)}</text>`).join('')
    +subtitleLines.map((line,i)=>`<text x="28" y="${36+titleLines.length*25+i*16}" `
      +`font-size="${t.subtitle}" fill="${R.quietInk}">${escape(line)}</text>`).join('')
    +body+legend
    +noteLines.map((line,i)=>`<text x="28" y="${noteTop+i*16}" font-size="${t.note}" `
      +`fill="${R.quietInk}">${escape(line)}</text>`).join('')
    +`</svg>`;
}
