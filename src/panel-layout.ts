/** Browser-local presentation preferences, deliberately separate from workflow data. */
export function mountPanelLayout():void{
  const studio=document.querySelector<HTMLElement>('.studio')!,work=document.querySelector<HTMLElement>('.work-area')!;
  const key='fieldwork.panel-layout.v1',desktop=matchMedia('(min-width:851px)');
  // `results` was here until 2026-10-21, when the results panel became a TAB: there is no
  // boundary between the canvas and the results to drag any more, and no height to remember.
  type Panel='library'|'inspector';
  let preferred:Partial<Record<Panel,number>>={};
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const panel of ['library','inspector'] as const)if(typeof saved?.[panel]==='number'&&Number.isFinite(saved[panel]))preferred[panel]=saved[panel];}catch{/* Defaults also work when storage is unavailable. */}
  const values={library:205,inspector:292},limits={library:[150,420],inspector:[230,600]};
  const handles=new Map<Panel,HTMLElement>();
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  function defaults(){return {library:innerWidth>=1600?230:innerWidth<=1150?175:205,inspector:innerWidth>=1600?320:innerWidth<=1150?253:292};}
  function apply(){
    if(!desktop.matches)return;
    const baseline=defaults(),width=studio.clientWidth;
    // Always leave a usable center, even after restoring a wider-screen layout.
    values.library=clamp(preferred.library??baseline.library,150,Math.min(420,width-230-360));
    values.inspector=clamp(preferred.inspector??baseline.inspector,230,Math.min(600,width-values.library-360));
    limits.library=[150,Math.min(420,width-values.inspector-360)];limits.inspector=[230,Math.min(600,width-values.library-360)];
    for(const panel of ['library','inspector'] as const){
      studio.style.setProperty(`--${panel}-size`,`${values[panel]}px`);
      const handle=handles.get(panel)!;handle.setAttribute('aria-valuenow',String(Math.round(values[panel])));
      handle.setAttribute('aria-valuemin',String(Math.round(limits[panel][0])));handle.setAttribute('aria-valuemax',String(Math.round(limits[panel][1])));
      handle.setAttribute('aria-valuetext',`${Math.round(values[panel])} pixels`);
    }
  }
  function persist(){try{localStorage.setItem(key,JSON.stringify(preferred));}catch{/* Resizing remains usable for this session. */}}
  for(const panel of ['library','inspector'] as const){
    const handle=document.createElement('div');handle.id=`resize-${panel}`;handle.className=`panel-divider ${panel}-divider`;handle.tabIndex=0;
    handle.setAttribute('role','separator');handle.setAttribute('aria-label',`Resize ${panel}`);
    handle.setAttribute('aria-orientation','vertical');handle.title='Drag or use arrow keys to resize. Double-click to reset.';
    const controlled=document.querySelector<HTMLElement>(`.${panel}`)!;controlled.id||=`layout-${panel}`;handle.setAttribute('aria-controls',controlled.id);
    handles.set(panel,handle);studio.append(handle);
    let drag:{id:number;start:number;size:number;previous:number|undefined}|undefined;
    const coordinate=(event:PointerEvent)=>event.clientX;
    const direction=panel==='library'?1:-1;
    handle.onpointerdown=event=>{if(event.button!==0||!desktop.matches)return;event.preventDefault();handle.focus();drag={id:event.pointerId,start:coordinate(event),size:values[panel],previous:preferred[panel]};handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing-panels');};
    handle.onpointermove=event=>{if(!drag||event.pointerId!==drag.id)return;preferred[panel]=clamp(drag.size+direction*(coordinate(event)-drag.start),...limits[panel] as [number,number]);apply();};
    const finish=(cancel:boolean)=>{if(!drag)return;if(cancel){if(drag.previous===undefined)delete preferred[panel];else preferred[panel]=drag.previous;apply();}else persist();drag=undefined;document.body.classList.remove('resizing-panels');};
    handle.onpointerup=()=>finish(false);handle.onpointercancel=()=>finish(true);handle.onlostpointercapture=()=>finish(false);
    handle.ondblclick=()=>{delete preferred[panel];apply();persist();};
    handle.onkeydown=event=>{
      if(event.key==='Escape'&&drag){finish(true);return;}
      const negative='ArrowLeft',positive='ArrowRight';
      if(![negative,positive,'Home','End'].includes(event.key))return;event.preventDefault();
      const [min,max]=limits[panel];preferred[panel]=event.key==='Home'?min:event.key==='End'?max:clamp(values[panel]+(event.key===positive?1:-1)*direction*(event.shiftKey?40:10),min,max);apply();persist();
    };
  }
  const reset=document.createElement('button');reset.id='reset-layout';reset.className='button small';reset.textContent='Reset layout';reset.title='Restore default panel sizes';
  reset.onclick=()=>{preferred={};apply();persist();};document.querySelector('.example-bar')!.append(reset);
  studio.classList.add('resizable-panels');new ResizeObserver(apply).observe(studio);desktop.addEventListener('change',apply);apply();
}
