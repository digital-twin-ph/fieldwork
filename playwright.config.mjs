import {defineConfig} from '@playwright/test';

const port=Number(process.env.FIELDWORK_TEST_PORT||4174);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('FIELDWORK_TEST_PORT must be a valid port number.');
const baseURL=`http://127.0.0.1:${port}`;
const supported=['chromium','webkit','firefox'];
const browsers=(process.env.FIELDWORK_BROWSERS||'chromium,webkit').split(',').map(name=>name.trim()).filter(Boolean);
if(!browsers.length)throw new Error('FIELDWORK_BROWSERS must name at least one browser.');
for(const name of browsers)if(!supported.includes(name))throw new Error(`FIELDWORK_BROWSERS contains an unsupported browser: ${name}. Use ${supported.join(', ')}.`);

export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.browser.mjs',
  fullyParallel:false,
  workers:1,
  retries:0,
  forbidOnly:true,
  timeout:180_000,
  expect:{timeout:10_000},
  outputDir:'test-results/artifacts',
  reporter:[['list'],['junit',{outputFile:'test-results/browser-junit.xml'}],['html',{open:'never'}]],
  use:{
    baseURL,
    viewport:{width:1600,height:1100},
    actionTimeout:15_000,
    navigationTimeout:30_000,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    launchOptions:process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{},
  },
  // The gate is Chromium AND WebKit, from 2026-10-13. It was Chromium only, with the WebKit suite
  // run on a developer's machine by hand, which experiment 70 recorded as the thing that had to
  // change before any desktop packaging decision: Tauri on macOS runs WKWebView, and before that
  // experiment every attached PDF and every retained raster would have failed there while a
  // Chromium-only gate reported green.
  //
  // Added only once WebKit passed all 102 checks unmodified, so the gate starts from parity rather
  // than from a list of exemptions. Firefox is still opt-in. Set FIELDWORK_BROWSERS to a
  // comma-separated list to change what runs; a result is only claimed for the browsers actually
  // run, so the default must not change silently.
  projects:browsers.map(name=>({name,use:{browserName:name}})),
  webServer:{
    command:'node server.mjs',
    url:baseURL,
    env:{PORT:String(port)},
    reuseExistingServer:false,
    timeout:30_000,
  },
});
