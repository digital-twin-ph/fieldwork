/** THE SPACE-TIME SCAN, off the page's thread: 999 shuffles over Hagelloch by day take about 3.5 s, which would freeze
 *  the page if run on it. One message in, one out. */
import {spaceTimeScan,type ScanSettings} from './space-time-scan.js';
import type {PointCollection} from './types.js';

self.postMessage({alive:true});
self.onmessage=({data}:MessageEvent<{points:PointCollection;settings:ScanSettings}>)=>{
  try{self.postMessage({result:spaceTimeScan(data.points,data.settings,(done,of)=>self.postMessage({progress:[done,of]}))});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
