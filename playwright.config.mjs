import {defineConfig} from '@playwright/test';

const port=Number(process.env.FIELDWORK_TEST_PORT||4174);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('FIELDWORK_TEST_PORT must be a valid port number.');
const baseURL=`http://127.0.0.1:${port}`;

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
  projects:[{name:'chromium',use:{browserName:'chromium'}}],
  webServer:{
    command:'node server.mjs',
    url:baseURL,
    env:{PORT:String(port)},
    reuseExistingServer:false,
    timeout:30_000,
  },
});
