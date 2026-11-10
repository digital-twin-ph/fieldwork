/** THE SPACE-TIME SCAN, off the page's thread: 999 shuffles over Hagelloch by day take about 3.5 s, which would freeze
 *  the page if run on it. One message in, one out. */
import {spaceTimeScan,spaceTimeReplay,type ScanSettings} from './space-time-scan.js';
import type {PointCollection} from './types.js';

self.postMessage({alive:true});
self.onmessage=({data}:MessageEvent<{points:PointCollection;settings:ScanSettings;replay?:boolean}>)=>{
  const progress=(done:number,of:number)=>self.postMessage({progress:[done,of]});
  try{self.postMessage({result:data.replay?spaceTimeReplay(data.points,data.settings,progress):spaceTimeScan(data.points,data.settings,progress)});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
