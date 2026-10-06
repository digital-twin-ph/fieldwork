import type {Node,NodeProps,Edge,Connection} from '@xyflow/react';
import type {Workflow,WorkflowNode,NodeDefinition,NodeType} from './types.js';
export interface NodeDescription extends Record<string,unknown> {definition:NodeDefinition;type:NodeType;label:string;subtitle:string;detail:string;status?:string}
type OperationFlowNode=Node<NodeDescription,'operation'>;
export interface CanvasAPI {update:(graph:Workflow,selection:string|null|undefined,statuses?:Record<string,string>)=>void;fit:()=>void;zoomIn:()=>void;zoomOut:()=>void;setBusy:(busy:boolean)=>void}
export interface CanvasCallbacks {ready:(api:CanvasAPI)=>void;describe:(node:WorkflowNode,status?:string)=>NodeDescription;select:(id:string)=>void;clear:()=>void;move:(id:string,position:{x:number;y:number})=>void;connect:(connection:Connection)=>void;valid:(connection:Connection|Edge)=>boolean;remove:(ids:string[])=>void;removeEdges:(ids:string[])=>void;zoom:(zoom:number)=>void}
import React, {useState, useEffect, useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlow, ReactFlowProvider, Background, Handle, Position, useNodesState, useEdgesState, useReactFlow, useUpdateNodeInternals, useNodesInitialized} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../flow.css';
function OperationNode({id,data,selected}:NodeProps<OperationFlowNode>) {
  const t=data.definition;
  const role=t.group==='Sources'?'input':t.group==='Outputs'?'output':'processing';
  const spatialPorts=['map_output','table_output','chart_output','coverage_check','raster_input','clip_raster'].includes(data.type);
  const portLabel=(port:string)=>port==='raster'?(data.type==='map_output'&&t.inputs.length>1?'Or: Raster':'Raster'):port==='decisions'?'Reasoning result':port==='area'?'Study area':port==='coverage'?'Or: Coverage result':`Points ${port==='points'?'1':port.split('_')[1]}`;
  const updateInternals=useUpdateNodeInternals();
  useEffect(()=>{updateInternals(id);},[id,JSON.stringify(t.inputs),updateInternals]);
  return <div data-node-role={role} style={{minHeight:!spatialPorts&&t.inputs.length>3?48+(t.inputs.length-1)*26+24:undefined}} className={`node ${t.color} ${selected?'selected':''} ${data.status==='running'?'running':''}`}>
    <div className="node-heading"><span className="node-icon">{t.icon}</span><div><strong>{data.label}</strong><span className="node-id">{t.group}</span></div></div>
    <div className="node-subtitle">{data.subtitle}</div>
    {spatialPorts&&<div className="node-ports">
      {t.inputs.map(([port,type])=><div className={`node-port-row ${port==='coverage'?'alternative-input':''}`} key={port}>
        <Handle type="target" position={Position.Left} id={port} style={{top:'50%'}} title={`${portLabel(port)} (${type})`} aria-label={`${data.label}: ${portLabel(port)} input`}/>
        <span>{portLabel(port)}</span>
      </div>)}
      {t.output&&<div className="node-port-row node-output-row"><span>{t.output==='raster'?'Raster →':'Coverage result →'}</span><Handle type="source" position={Position.Right} id="out" style={{top:'50%'}} title={t.output==='raster'?'Raster output':'Coverage result: study area, points and review decisions'} aria-label={`${data.label}: output`}/></div>}
    </div>}
    <div className="node-bottom"><span>{data.detail}</span><span className="count">{data.status==='done'?'✓ Done':data.status==='running'?'Running…':data.type==='policy'?'N3 · WASM':'●'}</span></div>
    {!spatialPorts&&t.inputs.map(([port,type],i)=><Handle key={port} type="target" position={Position.Left} id={port} style={{top:48+i*26}} title={`${port} (${type})`} aria-label={`${data.label}: ${port} input`}><span className="handle-name">{port}</span></Handle>)}
    {!spatialPorts&&t.output&&<Handle type="source" position={Position.Right} id="out" style={{top:54}} title={`${t.output} output`} aria-label={`${data.label}: output`}/>}
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
        setEdges(graph.edges.map(e=>({id:e.id,source:e.from,sourceHandle:'out',target:e.to,targetHandle:e.port,type:'default',style:{stroke:'#9fb5a5',strokeWidth:1.7},interactionWidth:20})));
      };
      api.fit=()=>setFitRequested(true);api.zoomIn=()=>flow.zoomIn();api.zoomOut=()=>flow.zoomOut();api.setBusy=setBusy;
      callbacks.ready(api);
    },[]);
    return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onNodeClick={(_,n)=>callbacks.select(n.id)} onPaneClick={()=>callbacks.clear()}
      onNodeDragStop={(_,n)=>callbacks.move(n.id,n.position)} onConnect={c=>callbacks.connect(c)} isValidConnection={callbacks.valid}
      onNodesDelete={ns=>callbacks.remove(ns.map(n=>n.id))} onEdgesDelete={es=>callbacks.removeEdges(es.map(e=>e.id))}
      onEdgeClick={(_,e)=>callbacks.removeEdges([e.id])} onMove={(_,v)=>callbacks.zoom(v.zoom)}
      nodesDraggable={!busy} nodesConnectable={!busy} deleteKeyCode={busy?null:['Backspace','Delete']} minZoom={.3} maxZoom={1.8}
      connectionLineStyle={{stroke:'#176b59',strokeWidth:2}} fitViewOptions={{padding:.16}}>
      <Background color="#c8d3c1" gap={18} size={1}/>
    </ReactFlow>;
  }
  createRoot(container).render(<ReactFlowProvider><Flow/></ReactFlowProvider>);
  return api;
}
