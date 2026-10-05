import React, {useState, useEffect, useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {ReactFlow, ReactFlowProvider, Background, Handle, Position, useNodesState, useEdgesState, useReactFlow} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow.css';
function OperationNode({data,selected}) {
  const t=data.definition;
  return <div className={`node ${t.color} ${selected?'selected':''} ${data.status==='running'?'running':''}`}>
    <div className="node-heading"><span className="node-icon">{t.icon}</span><div><strong>{data.label}</strong><span className="node-id">{t.group}</span></div></div>
    <div className="node-subtitle">{data.subtitle}</div>
    <div className="node-bottom"><span>{data.detail}</span><span className="count">{data.status==='done'?'✓ Done':data.status==='running'?'Running…':data.type==='policy'?'N3 · WASM':'●'}</span></div>
    {t.inputs.map(([port,type],i)=><Handle key={port} type="target" position={Position.Left} id={port} style={{top:48+i*26}} title={`${port} (${type})`} aria-label={`${data.label}: ${port} input`}><span className="handle-name">{port}</span></Handle>)}
    {t.output&&<Handle type="source" position={Position.Right} id="out" style={{top:54}} title={`${t.output} output`} aria-label={`${data.label}: output`}/>}
  </div>;
}
const nodeTypes={operation:OperationNode};
export function mountCanvas(container,callbacks){
  const api={};
  function Flow(){
    const [nodes,setNodes,onNodesChange]=useNodesState([]),[edges,setEdges,onEdgesChange]=useEdgesState([]),[busy,setBusy]=useState(false);
    const flow=useReactFlow();
    useEffect(()=>{
      api.update=(graph,selection,statuses={})=>{
        setNodes(graph.nodes.map(n=>({id:n.id,type:'operation',position:{x:n.x,y:n.y},selected:n.id===selection,data:callbacks.describe(n,statuses[n.id])})));
        setEdges(graph.edges.map(e=>({id:e.id,source:e.from,sourceHandle:'out',target:e.to,targetHandle:e.port,type:'default',style:{stroke:'#9fb5a5',strokeWidth:1.7},interactionWidth:20})));
      };
      api.fit=()=>flow.fitView({padding:.16,duration:220});api.zoomIn=()=>flow.zoomIn();api.zoomOut=()=>flow.zoomOut();api.setBusy=setBusy;
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
