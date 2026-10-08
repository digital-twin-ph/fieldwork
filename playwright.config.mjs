import {defineConfig} from '@playwright/test';

const port=Number(process.env.FIELDWORK_TEST_PORT||4174);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('FIELDWORK_TEST_PORT must be a valid port number.');
const baseURL=`http://127.0.0.1:${port}`;
const supported=['chromium','webkit','firefox'];
const browsers=(process.env.FIELDWORK_BROWSERS||'chromium').split(',').map(name=>name.trim()).filter(Boolean);
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
  // The documented gate stays Chromium only. Set FIELDWORK_BROWSERS to a comma-separated
  // list (chromium, webkit, firefox) to exercise others; a result is only claimed for the
  // browsers actually run, so the default must not change silently.
  projects:browsers.map(name=>({name,use:{browserName:name}})),
  webServer:{
    command:'node server.mjs',
    url:baseURL,
    env:{PORT:String(port)},
    reuseExistingServer:false,
    timeout:30_000,
  },
});
