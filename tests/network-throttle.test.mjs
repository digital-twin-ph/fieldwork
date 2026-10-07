import test from 'node:test';
import assert from 'node:assert/strict';
import {pacedNetworkDownload,networkDownloadStatus,deferNetworkDownload} from '../build/network-throttle.js';
test('public-service pacing rejects overlap, pauses after success/failure and honors Retry-After without retrying',async()=>{
  const original=Date.now;let now=Date.UTC(2026,9,7),calls=0,finish;Date.now=()=>now;
  try{
    const pending=pacedNetworkDownload(()=>{calls++;return new Promise(resolve=>finish=resolve);});
    await assert.rejects(pacedNetworkDownload(async()=>{calls++;}),/already running/);assert.equal(calls,1);finish('saved');assert.equal(await pending,'saved');assert.equal(networkDownloadStatus().waitSeconds,60);
    await assert.rejects(pacedNetworkDownload(async()=>{calls++;}),/wait 60/);now+=61000;assert.equal(await pacedNetworkDownload(async()=>{calls++;return 'next';}),'next');assert.equal(calls,2);
    now+=61000;await assert.rejects(pacedNetworkDownload(async()=>{calls++;deferNetworkDownload('120');throw new Error('server busy');}),/server busy/);assert.equal(calls,3);assert.equal(networkDownloadStatus().waitSeconds,120);
    now+=119000;await assert.rejects(pacedNetworkDownload(async()=>{calls++;}),/wait 1/);assert.equal(calls,3);now+=2000;deferNetworkDownload(new Date(now+180000).toUTCString());assert.equal(networkDownloadStatus().waitSeconds,180);
  }finally{Date.now=original;}
});
