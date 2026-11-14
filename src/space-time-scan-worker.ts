/** THE SPACE-TIME SCAN, off the page's thread: 999 shuffles over Hagelloch by day take seconds, which would freeze the
 *  page if run on it. A scan, or some of a replay's days, one message in and one out; a replay is spread over several. */
import {spaceTimeScan,replayDay,type ScanSettings} from './space-time-scan.js';
import type {PointCollection} from './types.js';

self.postMessage({alive:true});
self.onmessage=({data}:MessageEvent<{points:PointCollection;settings:ScanSettings;first?:string;days?:string[]}>)=>{
  try{
    if(data.days){
      // Some of a replay's days: each reported as done, so the page counts days across every worker.
      self.postMessage({result:data.days.map(day=>{const d=replayDay(data.points,data.settings,data.first!,day);self.postMessage({progress:[1,1]});return d;})});
    }else self.postMessage({result:spaceTimeScan(data.points,data.settings,(done,of)=>self.postMessage({progress:[done,of]}))});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
