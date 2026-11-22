/** A KERNEL DENSITY SURFACE, TWO WAYS (experiment 225's spike, 2026-11-22). The kernel's, in 64-bit, is the reference;
 *  the WebGPU path, in 32-bit, is held to it and used only where the device offers WebGPU and the two agree. Nothing
 *  depends on the GPU: without it, the kernel's surface is the answer, slower. Not yet used by any widget.
 *
 *  Coordinates are the grid's own (one unit a cell, y from the top); the bandwidth is in cells; the kernel is quartic,
 *  3 / (π h²) · (1 − (d/h)²)², as kernel/src/density.rs states. */
import {kernel} from './kernel.js';

export interface DensityInput {width:number; height:number; bandwidth:number;
  /** x, y and weight of each point, one after another. */
  points:Float64Array}

/** The reference: the Rust kernel, point by point. */
export function densityKernel(input:DensityInput):Float64Array{
  const n=input.points.length/3;
  if(!kernel.density_prepare(n,input.width,input.height))throw new Error('There is not enough memory for this density surface.');
  new Float64Array(kernel.memory.buffer,kernel.density_ptr(0),n*3).set(input.points);
  if((kernel.density_run(input.bandwidth)>>>0)===4294967295)throw new Error('The bandwidth must be above 0.');
  return new Float64Array(kernel.memory.buffer,kernel.density_ptr(1),input.width*input.height).slice();
}

/** THE WEBGPU PATH: the points binned on the CPU into squares one bandwidth wide, so each cell reads only the nine bins
 *  around it; then one GPU thread per cell sums its neighbours' contributions, in 32-bit. No atomics, so the sum is
 *  the same on every run. Null where WebGPU is not offered or the device is refused or lost. */
const SHADER=/* wgsl */`
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
}`;

export interface GpuDensity {grid:Float32Array; adapter:string}
/** WebGPU's flags, by their values in the standard, since the project carries no WebGPU types for one spike. */
const USAGE={MAP_READ:1,COPY_SRC:4,COPY_DST:8,UNIFORM:64,STORAGE:128},MAP_READ_MODE=1;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gpu=any;
export async function densityGpu(input:DensityInput):Promise<GpuDensity|null>{
  const gpu=(navigator as Navigator&{gpu?:Gpu}).gpu;if(!gpu)return null;
  const adapter=await gpu.requestAdapter({powerPreference:'high-performance'}).catch(()=>null);if(!adapter)return null;
  const device=await adapter.requestDevice().catch(()=>null);if(!device)return null;
  try{
    const {width,height,bandwidth}=input,n=input.points.length/3;
    // ONE BANDWIDTH OF BINS EACH SIDE OF THE GRID: a point just outside it still adds to its edge cells, as in the kernel
    // (found by this spike: dropped, they put the surface 6% off at 100,000 points).
    const binsX=Math.ceil(width/bandwidth)+2,binsY=Math.ceil(height/bandwidth)+2;
    // BINNED ON THE CPU, a counting sort by the bin each point falls in; points outside the grid's bins are dropped, as
    // they reach no cell's nine bins.
    const binOf=new Int32Array(n),counts=new Uint32Array(binsX*binsY+1);
    for(let i=0;i<n;i++){const x=input.points[i*3]!,y=input.points[i*3+1]!,w=input.points[i*3+2]!;
      const bx=Math.floor((x+bandwidth)/bandwidth),by=Math.floor((y+bandwidth)/bandwidth);
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||bx<0||by<0||bx>=binsX||by>=binsY){binOf[i]=-1;continue;}
      binOf[i]=by*binsX+bx;counts[binOf[i]!+1]!++;}
    for(let b=1;b<counts.length;b++)counts[b]!+=counts[b-1]!;
    const starts=counts.slice(),fill=counts.slice(0,binsX*binsY),sorted=new Float32Array(Math.max(1,counts[counts.length-1]!)*4);
    for(let i=0;i<n;i++){const b=binOf[i]!;if(b<0)continue;const at=fill[b]!++;
      sorted[at*4]=input.points[i*3]!;sorted[at*4+1]=input.points[i*3+1]!;sorted[at*4+2]=input.points[i*3+2]!;}
    const buffer=(data:ArrayBufferView,usage:number)=>{const b=device.createBuffer({size:Math.max(16,Math.ceil(data.byteLength/4)*4),usage:usage|USAGE.COPY_DST});
      device.queue.writeBuffer(b,0,data.buffer,data.byteOffset,data.byteLength);return b;};
    const params=new ArrayBuffer(32),u=new Uint32Array(params),f=new Float32Array(params);
    u[0]=width;u[1]=height;u[2]=binsX;u[3]=binsY;f[4]=bandwidth;f[5]=3/(Math.PI*bandwidth*bandwidth);
    const P=buffer(new Uint8Array(params),USAGE.UNIFORM),pts=buffer(sorted,USAGE.STORAGE),st=buffer(starts,USAGE.STORAGE);
    const out=device.createBuffer({size:width*height*4,usage:USAGE.STORAGE|USAGE.COPY_SRC});
    const read=device.createBuffer({size:width*height*4,usage:USAGE.MAP_READ|USAGE.COPY_DST});
    const pipeline=device.createComputePipeline({layout:'auto',compute:{module:device.createShaderModule({code:SHADER}),entryPoint:'main'}});
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[P,pts,st,out].map((b,i)=>({binding:i,resource:{buffer:b}}))});
    const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();
    pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(width/16),Math.ceil(height/16));pass.end();
    encoder.copyBufferToBuffer(out,0,read,0,width*height*4);device.queue.submit([encoder.finish()]);
    await read.mapAsync(MAP_READ_MODE);const grid=new Float32Array(read.getMappedRange().slice(0));read.unmap();
    const info=(adapter as {info?:{vendor?:string;architecture?:string}}).info;
    return {grid,adapter:`${info?.vendor??'unknown'} ${info?.architecture??''}`.trim()};
  }catch{return null;}
  finally{device.destroy();}
}

/** How far the WebGPU surface is from the kernel's: the largest cell difference, relative to the largest cell. */
export function densityAgreement(reference:Float64Array,gpu:Float32Array):{maxRelative:number;peak:number}{
  let peak=0,worst=0;for(let i=0;i<reference.length;i++)peak=Math.max(peak,Math.abs(reference[i]!));
  for(let i=0;i<reference.length;i++)worst=Math.max(worst,Math.abs(reference[i]!-gpu[i]!));
  return {maxRelative:peak?worst/peak:worst,peak};
}
