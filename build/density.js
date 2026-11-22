import{a as c}from"./chunks/chunk-VL5MMQBL.js";import"./chunks/chunk-BFP44XIQ.js";import"./chunks/chunk-KVMUXFPB.js";function U(t){let l=t.points.length/3;if(!c.density_prepare(l,t.width,t.height))throw new Error("There is not enough memory for this density surface.");if(new Float64Array(c.memory.buffer,c.density_ptr(0),l*3).set(t.points),c.density_run(t.bandwidth)>>>0===4294967295)throw new Error("The bandwidth must be above 0.");return new Float64Array(c.memory.buffer,c.density_ptr(1),t.width*t.height).slice()}var N=`
struct Params {width:u32, height:u32, binsX:u32, binsY:u32, bandwidth:f32, scale:f32, _a:u32, _b:u32}
@group(0) @binding(0) var<uniform> P:Params;
@group(0) @binding(1) var<storage,read> points:array<vec4<f32>>;  // x, y, weight, unused; sorted by bin
@group(0) @binding(2) var<storage,read> starts:array<u32>;        // bin b's points are starts[b] .. starts[b+1]
@group(0) @binding(3) var<storage,read_write> grid:array<f32>;
@compute @workgroup_size(16,16)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  if(id.x>=P.width||id.y>=P.height){return;}
  let cx=f32(id.x)+0.5; let cy=f32(id.y)+0.5;
  // The bins start one bandwidth before the grid, so points just outside it still reach its edge cells.
  let bx=i32(floor((cx+P.bandwidth)/P.bandwidth)); let by=i32(floor((cy+P.bandwidth)/P.bandwidth));
  let h2=P.bandwidth*P.bandwidth;
  // COMPENSATED (Kahan) SUMMATION: plain 32-bit adding put 1,000,000 points 1.01e-5 off the kernel's surface, past the
  // 1e-5 agreed before the spike ran; the compensation carries what each addition loses. It holds on SwiftShader; Apple's
  // Metal compiler, free to reassociate, removes it (measured 2026-11-22, experiment 225).
  var sum:f32=0.0; var lost:f32=0.0;
  for(var j=by-1;j<=by+1;j++){
    if(j<0||j>=i32(P.binsY)){continue;}
    for(var i=bx-1;i<=bx+1;i++){
      if(i<0||i>=i32(P.binsX)){continue;}
      let b=u32(j)*P.binsX+u32(i);
      for(var k=starts[b];k<starts[b+1u];k++){
        let p=points[k]; let dx=cx-p.x; let dy=cy-p.y; let d2=dx*dx+dy*dy;
        if(d2<h2){let u=1.0-d2/h2; let y=p.z*P.scale*u*u-lost; let t=sum+y; lost=(t-sum)-y; sum=t;}
      }
    }
  }
  grid[id.y*P.width+id.x]=sum;
}`,d={MAP_READ:1,COPY_SRC:4,COPY_DST:8,UNIFORM:64,STORAGE:128},Y=1;async function z(t){let l=navigator.gpu;if(!l)return null;let n=await l.requestAdapter({powerPreference:"high-performance"}).catch(()=>null);if(!n)return null;let r=await n.requestDevice().catch(()=>null);if(!r)return null;try{let{width:i,height:h,bandwidth:a}=t,A=t.points.length/3,f=Math.ceil(i/a)+2,b=Math.ceil(h/a)+2,p=new Int32Array(A),u=new Uint32Array(f*b+1);for(let e=0;e<A;e++){let s=t.points[e*3],o=t.points[e*3+1],I=t.points[e*3+2],v=Math.floor((s+a)/a),_=Math.floor((o+a)/a);if(!Number.isFinite(s)||!Number.isFinite(o)||!Number.isFinite(I)||v<0||_<0||v>=f||_>=b){p[e]=-1;continue}p[e]=_*f+v,u[p[e]+1]++}for(let e=1;e<u.length;e++)u[e]+=u[e-1];let F=u.slice(),R=u.slice(0,f*b),y=new Float32Array(Math.max(1,u[u.length-1])*4);for(let e=0;e<A;e++){let s=p[e];if(s<0)continue;let o=R[s]++;y[o*4]=t.points[e*3],y[o*4+1]=t.points[e*3+1],y[o*4+2]=t.points[e*3+2]}let P=(e,s)=>{let o=r.createBuffer({size:Math.max(16,Math.ceil(e.byteLength/4)*4),usage:s|d.COPY_DST});return r.queue.writeBuffer(o,0,e.buffer,e.byteOffset,e.byteLength),o},x=new ArrayBuffer(32),g=new Uint32Array(x),O=new Float32Array(x);g[0]=i,g[1]=h,g[2]=f,g[3]=b,O[4]=a,O[5]=3/(Math.PI*a*a);let G=P(new Uint8Array(x),d.UNIFORM),T=P(y,d.STORAGE),k=P(F,d.STORAGE),S=r.createBuffer({size:i*h*4,usage:d.STORAGE|d.COPY_SRC}),m=r.createBuffer({size:i*h*4,usage:d.MAP_READ|d.COPY_DST}),D=r.createComputePipeline({layout:"auto",compute:{module:r.createShaderModule({code:N}),entryPoint:"main"}}),B=r.createBindGroup({layout:D.getBindGroupLayout(0),entries:[G,T,k,S].map((e,s)=>({binding:s,resource:{buffer:e}}))}),M=r.createCommandEncoder(),w=M.beginComputePass();w.setPipeline(D),w.setBindGroup(0,B),w.dispatchWorkgroups(Math.ceil(i/16),Math.ceil(h/16)),w.end(),M.copyBufferToBuffer(S,0,m,0,i*h*4),r.queue.submit([M.finish()]),await m.mapAsync(Y);let C=new Float32Array(m.getMappedRange().slice(0));m.unmap();let E=n.info;return{grid:C,adapter:`${E?.vendor??"unknown"} ${E?.architecture??""}`.trim()}}catch{return null}finally{r.destroy()}}function q(t,l){let n=0,r=0;for(let i=0;i<t.length;i++)n=Math.max(n,Math.abs(t[i]));for(let i=0;i<t.length;i++)r=Math.max(r,Math.abs(t[i]-l[i]));return{maxRelative:n?r/n:r,peak:n}}export{q as densityAgreement,z as densityGpu,U as densityKernel};
//# sourceMappingURL=density.js.map
