import type {Node,NodeProps,Edge,Connection} from '@xyflow/react';
import type {Workflow,WorkflowNode,NodeDefinition,NodeType} from './types.js';
import {PORT_NAMES,PORT_GROUPS,shownPort} from './port-names.js';
export interface NodeDescription extends Record<string,unknown> {definition:NodeDefinition;
  /** Ports with something wired to them. A map declares every layer port it can draw, so listing
   *  them all on the canvas made a node three times taller than the layout it shipped in -- and
   *  most of the rows named a layer the map does not have. Unconnected ports stay droppable. */
  /** The node found something at the run. Separate from `alert`, which is the text on the badge:
   *  closing the badge takes the text away and must not take away the signal that there is
   *  something to look at. */
  flagged?:boolean;
  connectedPorts?:string[];
  /** Ports some node on this canvas could supply. */
  availablePorts?:string[];type:NodeType;label:string;subtitle:string;detail:string;status?:string;glow?:boolean;alert?:string}
type OperationFlowNode=Node<NodeDescription,'operation'>;
export interface CanvasAPI {update:(graph:Workflow,selection:string|null|undefined,statuses?:Record<string,string>)=>void;fit:()=>void;zoomIn:()=>void;zoomOut:()=>void;setBusy:(busy:boolean)=>void}
export interface CanvasCallbacks {selectEdge:(id:string)=>void;ready:(api:CanvasAPI)=>void;describe:(node:WorkflowNode,status?:string)=>NodeDescription;select:(id:string)=>void;clear:()=>void;move:(id:string,position:{x:number;y:number})=>void;connect:(connection:Connection)=>void;valid:(connection:Connection|Edge)=>boolean;remove:(ids:string[])=>void;removeEdges:(ids:string[])=>void;zoom:(zoom:number)=>void}
import {useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlow, ReactFlowProvider, Background, Handle, Position, useNodesState, useEdgesState, useReactFlow, useUpdateNodeInternals, useNodesInitialized} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../flow.css';
function OperationNode({id,data,selected}:NodeProps<OperationFlowNode>) {
  const t=data.definition;
  const role=t.group==='Sources'?'input':t.group==='Outputs'?'output':'processing';
  // NAMED PORT ROWS: each input a row with its name, and the output named. Sample a raster joined 2026-11-12 (the practitioner:
  // "Sample a raster has not standardized its ports yet"): five unnamed dots, of which one or two are used at a time.
  // WHICH NODES DRAW NAMED PORT ROWS rather than one bare handle per declared input. A node with a PORT_GROUPS entry
  // belongs here by construction: the grouped row is the only thing that draws it as one port, and without it the
  // node shows a dot per underlying port, unlabelled, where a drop on the wrong one is refused. Reported 2026-11-23,
  // the moment Area around a point grew lines and polygons: *"Area around a point won't accept a point (mines
  // pushpin)"* -- three dots had appeared and only the first took points.
  const spatialPorts=['map_output','table_output','chart_output','coverage_check','raster_input','clip_raster','sample_raster','join_table_to_area'].includes(data.type)
    ||!!PORT_GROUPS[data.type as NodeType];
  const portLabel=(port:string)=>PORT_NAMES[data.type as NodeType]?.[port]??(port==='context'?'Context points':port==='polygons'?(t.inputs.some(([p])=>p==='polygons_2')?'Areas 1':'Areas'):/^polygons_\d$/.test(port)?`Areas ${port.split('_')[1]}`:port==='network'?'Street network':port==='sites'?'Sites':port==='raster'?(data.type==='map_output'&&t.inputs.length>1?'Or: Raster':'Raster'):port==='decisions'?'Reasoning result':port==='area'?'Study area':port==='coverage'?'Or: Coverage result':port==='table'?'Tabular data':port==='ground'?'Map image (ground)'
    // NAMED, NEVER "Points undefined" (2026-11-10, a georeferenced map image on the ground port): a port this list does not
    // know is shown by its own name, and only a numbered point port is called Points.
    :port==='files'?'Satellite files'
    // Numbered only where the node has several point ports, as the map has.
    :/^points(_\d+)?$/.test(port)?(t.inputs.some(([p])=>p==='points_2')?`Points ${port==='points'?'1':port.split('_')[1]}`:'Points'):port.charAt(0).toUpperCase()+port.slice(1).replace(/[-_]/g,' '));
  // A map shows the layers it draws. Everything else keeps showing every port, because for those
  // widgets the ports ARE the thing: a coverage check with a hidden area port tells a practitioner
  // nothing about what it needs.
  const connected=new Set((data.connectedPorts as string[]|undefined)??[]);
  // Shown: what the map draws, plus what it COULD draw from something already on this canvas. A
  // port with no possible source is a row about a layer the practitioner has no way to supply,
  // and eight of those made the node three times taller than the layout it shipped in. Still a
  // drop target, just without a row -- and a port you could use keeps a full-width one, because
  // aiming at an 8px dot is not a connection gesture.
  const available=new Set((data.availablePorts as string[]|undefined)??[]);
  // A map shows the layers it draws and ONE port to add another, rather than a row for every
  // layer type it could ever take. The practitioner's direction, 2026-10-15: "Instead of
  // cluttering the side of the map widget with input ports, the Inspector UI should offer 1
  // configurable port but also enable addition of more input ports."
  //
  // The spare port is type-free on purpose: drop anything drawable on it and the connection is
  // bound to the real port by what the source emits. Eight declared ports remain underneath --
  // they are what the receipt and the contract are written in terms of -- and the canvas stops
  // being where a practitioner meets them.
  // Table too (2026-11-09): what it shows, and one port to connect more.
  // THE OUTPUT NAMED BY WHAT IT CARRIES: Sample a raster gives points at points and areas over areas.
  const outputLabel=({raster:'Raster',points:'Points',polygons:'Areas','coverage-check':'Coverage result',table:'Table',area:'Study area'} as Record<string,string>)[String(t.output)]
    ??String(t.output).charAt(0).toUpperCase()+String(t.output).slice(1).replace(/[-_]/g,' ');
  const layerNode=data.type==='map_output'||data.type==='table_output';
  // GROUPED PORTS, one row each, named for what is connected (see PORT_GROUPS).
  const groups=PORT_GROUPS[data.type as NodeType];
  const grouped:[string,string][]=groups?Object.entries(groups).map(([group,ports])=>{const on=ports.find(p=>connected.has(p));
    return [group,on?portLabel(on):portLabel(group)];}):[];
  const shownPorts=groups?[]:layerNode?t.inputs.filter(([port])=>connected.has(port)):t.inputs;
  const canAddLayer=layerNode&&[...available].some(port=>!connected.has(port));
  const hiddenPorts:[string,string][]=[];
  const updateInternals=useUpdateNodeInternals();
  useEffect(()=>{updateInternals(id);// Handle positions are cached by React Flow, so every input that can change WHICH handles are
  // rendered has to invalidate them -- availability as much as connection, or a freshly shown
  // port is a drop target the library does not know the position of and a drag onto it does
  // nothing. Found exactly that way: the aria-label was right and the connection never formed.
  },[id,JSON.stringify(t.inputs),JSON.stringify([...connected]),JSON.stringify([...available]),updateInternals]);
  // REACT FLOW'S CORNER LINK IS HIDDEN (`hideAttribution` on the canvas below): one Tab from a node reached it with a faint focus ring,
  // and Enter left Fieldwork for reactflow.dev (the practitioner, 2026-11-16). It is credited in Help instead; MIT asks
  // for no attribution on screen.
  // A PORT IS A POINTER'S DROP TARGET, hidden from assistive technology (aria-hidden on each Handle): connecting by
  // keyboard or screen reader is the Inspector's list for each input (the Section 508 audit, 2026-11-16).
  return <div data-node-role={role} style={{minHeight:!spatialPorts&&t.inputs.length>3?48+(t.inputs.length-1)*26+24:undefined}} className={`node ${t.color} ${selected?'selected':''} ${data.status==='running'?'running':''} ${data.status==='failed'?'failed':''} ${data.glow?'just-finished':''} ${data.flagged??data.alert?'alerting':''}`}>
    <div className="node-heading"><span className="node-icon">{t.icon}</span><div><strong>{data.label}</strong><span className="node-id">{t.group}</span></div></div>
    <div className="node-subtitle">{data.subtitle}</div>
    {spatialPorts&&<div className="node-ports">
      {grouped.map(([group,label])=><div className="node-port-row" key={group}>
        <Handle aria-hidden="true" type="target" position={Position.Left} id={group} style={{top:'50%'}} title={label}/>
        <span>{label}</span>
      </div>)}
      {shownPorts.map(([port,type])=><div className={`node-port-row ${port==='coverage'?'alternative-input':''}`} key={port}>
        <Handle aria-hidden="true" type="target" position={Position.Left} id={port} style={{top:'50%'}} title={`${portLabel(port)} (${type})`}/>
        <span>{portLabel(port)}</span>
      </div>)}
      {/* Every other port is still a drop target, stacked down the left edge without a row of
          its own. A practitioner drags onto the one they want; the node stays the size of what
          it draws. The title carries the name a row would have shown. */}
      {hiddenPorts.map(([port,type],i)=><Handle aria-hidden="true" key={port} type="target" position={Position.Left} id={port}
        className="node-spare-port" style={{top:`${56+i*14}px`}} title={`${portLabel(port)} (${type})`}
       />)}
      {canAddLayer&&<div className="node-port-row node-add-layer" key="layer">
        <Handle aria-hidden="true" type="target" position={Position.Left} id="layer" style={{top:'50%'}}
          title={data.type==='table_output'?'Add an input: drop any result to show here':'Add a layer: drop any drawable result here'}
         />
        <span>{data.type==='table_output'?'+ Add an input':'+ Add a layer'}</span>
      </div>}
      {t.output&&<div className="node-port-row node-output-row"><span>{outputLabel} →</span><Handle aria-hidden="true" type="source" position={Position.Right} id="out" style={{top:'50%'}} title={t.output==='coverage-check'?'Coverage result: study area, points and review decisions':`${outputLabel} output`}/></div>}
    </div>}
    {data.alert&&<div className="node-alert" role="alert">
      <span title={data.alert}>⚠ {data.alert}</span>
      {/* Dismissible, because a badge that cannot be closed covers the node it is about and the
          practitioner has already read it. It comes back on the next run: dismissing a FINDING
          permanently would make the canvas quieter and less true, and the detail stays in the
          Inspector either way. */}
      <button type="button" className="node-alert-close" data-dismiss-alert={id}
        aria-label={`Dismiss the alert on ${data.label}`} title="Dismiss until the next run"
        onPointerDown={event=>{event.stopPropagation();}}
        onClick={event=>{event.stopPropagation();}}>×</button>
    </div>}
    <div className="node-bottom"><span>{data.detail}</span><span className="count">{data.status==='done'?'✓ Done':data.status==='running'?'Running…':data.type==='policy'?'N3 · WASM':'●'}</span></div>
    {!spatialPorts&&t.inputs.map(([port,type],i)=><Handle key={port} type="target" position={Position.Left} id={port} style={{top:48+i*26}} title={`${port} (${type})`} aria-label={`${data.label}: ${port} input`}><span className="handle-name">{port}</span></Handle>)}
    {!spatialPorts&&t.output&&<Handle aria-hidden="true" type="source" position={Position.Right} id="out" style={{top:54}} title={`${t.output} output`}/>}
  </div>;
}
const nodeTypes={operation:OperationNode};
export function mountCanvas(container:HTMLElement,callbacks:CanvasCallbacks):CanvasAPI{
  const notReady=()=>{throw new Error('Canvas is not mounted yet');};
  const api:CanvasAPI={update:notReady,fit:notReady,zoomIn:notReady,zoomOut:notReady,setBusy:notReady};
  function Flow(){
    const [nodes,setNodes,onNodesChange]=useNodesState<OperationFlowNode>([]),[edges,setEdges,onEdgesChange]=useEdgesState<Edge>([]),[busy,setBusy]=useState(false);
    const flow=useReactFlow<OperationFlowNode,Edge>();
    const initialized=useNodesInitialized(),[fitRequested,setFitRequested]=useState(false);
    useEffect(()=>{
      if(!fitRequested||!initialized||!nodes.length||nodes.some(n=>!n.measured?.width||!n.measured?.height))return;
      // Imported nodes enter React state before React Flow measures them.
      // Fit the committed, measured graph rather than the previous empty canvas.
      const frame=requestAnimationFrame(()=>{void flow.fitView({padding:.16,duration:220});setFitRequested(false);});
      return ()=>cancelAnimationFrame(frame);
    },[fitRequested,initialized,nodes,flow]);
    useEffect(()=>{
      api.update=(graph,selection,statuses={})=>{
        // Keep React Flow's measured dimensions across status and selection updates.
        // Dropping them during a run can leave an unchanged node hidden until it resizes.
        setNodes(previous=>{const current=new Map(previous.map(n=>[n.id,n]));return graph.nodes.map(n=>({...current.get(n.id),id:n.id,type:'operation',position:{x:n.x,y:n.y},selected:n.id===selection,data:callbacks.describe(n,statuses[n.id])}));});
        // A CONNECTION IS SELECTED BY A CLICK, NOT REMOVED (2026-11-20): a click removed it at once, and on a dense canvas a
        // drag meant to pan took two of DR Congo's connections. Selected, it is drawn darker and thicker; Delete or the
        // Inspector's Remove connection removes it. Its band is 8 px, the line's own width, not 20.
        const chosenEdge=selection?.startsWith('edge:')?selection.slice(5):undefined;
        setEdges(graph.edges.map(e=>({id:e.id,source:e.from,sourceHandle:'out',target:e.to,targetHandle:shownPort((graph.nodes.find(n=>n.id===e.to)?.type??'') as NodeType,e.port),type:'default',
          selected:e.id===chosenEdge,style:e.id===chosenEdge?{stroke:'#0f4a3d',strokeWidth:4}:{stroke:'#9fb5a5',strokeWidth:1.7},interactionWidth:8})));
      };
      api.fit=()=>setFitRequested(true);api.zoomIn=()=>flow.zoomIn();api.zoomOut=()=>flow.zoomOut();api.setBusy=setBusy;
      callbacks.ready(api);
    },[]);
    return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onNodeClick={(_,n)=>callbacks.select(n.id)}
      onFocusCapture={e=>{
        // FOCUS SELECTS, BY KEYBOARD: a widget reached by Tab becomes the selected one, so the Inspector follows the
        // keyboard and the arrow keys move what has the focus (the Section 508 audit, 2026-11-16).
        const el=e.target as HTMLElement;const id=el.classList?.contains('react-flow__node')?el.getAttribute('data-id'):null;
        if(id&&el.matches(':focus-visible')&&!el.classList.contains('selected'))callbacks.select(id);}} onPaneClick={e=>{const id=edgeAt(e.clientX,e.clientY);if(id)callbacks.selectEdge(id);else callbacks.clear();}}
      onNodeDragStop={(_,n)=>callbacks.move(n.id,n.position)} onConnect={c=>callbacks.connect(c)} isValidConnection={callbacks.valid}
      onNodesDelete={ns=>callbacks.remove(ns.map(n=>n.id))} onEdgesDelete={es=>callbacks.removeEdges(es.map(e=>e.id))}
      onEdgeClick={(_,e)=>callbacks.selectEdge(e.id)} onMove={(_,v)=>callbacks.zoom(v.zoom)}
      proOptions={{hideAttribution:true}} nodesDraggable={!busy} nodesConnectable={!busy} deleteKeyCode={busy?null:['Backspace','Delete']} minZoom={.3} maxZoom={1.8}
      connectionLineStyle={{stroke:'#176b59',strokeWidth:2}} fitViewOptions={{padding:.16}}>
      <Background color="#c8d3c1" gap={18} size={1}/>
    </ReactFlow>;
  }
  /** THE CONNECTION UNDER A CLICK ON THE CANVAS (gate 230, 2026-11-20). xyflow marks every connection `nopan`, so a drag
   *  begun on one never panned: the canvas stood still under the pointer. Connections now take no pointer events, a drag
   *  anywhere pans, and a click asks the browser which connection, if any, is under it. */
  function edgeAt(x:number,y:number):string|undefined{
    // The browser's own hit test, with connections taking the pointer for this one question: the same in every engine.
    container.classList.add('edges-hit');
    try{const g=document.elementFromPoint(x,y)?.closest('.react-flow__edge');
      return g?.getAttribute('data-id')??g?.getAttribute('data-testid')?.replace('rf__edge-','')??undefined;}
    finally{container.classList.remove('edges-hit');}
  }
  createRoot(container).render(<ReactFlowProvider><Flow/></ReactFlowProvider>);
  return api;
}
