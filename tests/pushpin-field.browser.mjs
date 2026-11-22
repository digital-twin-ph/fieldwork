import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {collectPageErrors} from './page-errors.mjs';
import {clipExercise} from './fixtures/workflows.mjs';
import {exifSegment,withExif} from './exif-fixture.mjs';

/** PINS IN THE FIELD (experiment 09's open items 1 to 6, 2026-11-22). A pin can be added where the device is, and says
 *  where its position came from and how accurate the device said it was; a field can be required, and a pin lacking it
 *  is named, not refused; a field can hold a date and a time; the pins are a table in the editor; markers are coloured by
 *  Category, with a legend. */
// The place search is answered here, not by Nominatim; a service worker would reach the real service in WebKit.
test.use({serviceWorkers:'block'});
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const source=w=>w.nodes.find(n=>n.id==='observations').params;
const open=async page=>{
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="observations"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('pins');await page.locator('#pins-basemap').selectOption('none');
};
test.beforeEach(async({page})=>{
  await page.goto('/?example=blank');const w=clipExercise();w.exampleId='blank';
  await page.locator('#workflow-file').setInputFiles({name:'pins.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
});

test('a pin added where the device is says so, with the accuracy the device stated; moved by eye, it says that',async({page,context})=>{
  const errors=collectPageErrors(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:-24.6544,longitude:25.9086,accuracy:12});
  await open(page);
  const before=(await page.locator('#pin-record option').count())-1;
  await page.locator('#pin-locate').click();
  await expect(page.locator('#pin-locate-status')).toContainText('Located to within 12 m');
  await expect(page.locator('#pin-position')).toContainText('from this device, to within 12 m');
  await expect(page.locator('#pin-longitude')).toHaveValue('25.9086');
  // In the table, as a row, with where its position came from.
  await expect(page.locator('#pin-table')).toContainText(`Pins (${before+1})`);
  await expect(page.locator('#pin-table tr[aria-selected="true"]')).toContainText('This device, ±12 m');
  await page.locator('#config-apply').click();
  let pin=source(await saved(page)).data.features.at(-1);
  assert.deepEqual(pin.geometry.coordinates,[25.9086,-24.6544]);
  assert.equal(pin.properties.positionSource,'device');assert.equal(pin.properties.positionAccuracyM,12);
  assert.match(pin.properties.positionFixedAt,/^\d{4}-\d{2}-\d{2}T/);
  // Its position typed again: the device's accuracy no longer describes it.
  await open(page);await page.locator('#pin-record').selectOption(pin.id);
  await page.locator('#pin-latitude').fill('-24.655');await page.locator('#pin-save').click();
  await expect(page.locator('#pin-position')).toContainText('typed as longitude and latitude');
  await page.locator('#config-apply').click();
  pin=source(await saved(page)).data.features.at(-1);
  assert.equal(pin.properties.positionSource,'typed');assert.equal(pin.properties.positionAccuracyM,undefined);
  expect(errors).toEqual([]);
});

test('location refused is said, and the pin can still be placed by eye',async({page,context})=>{
  await context.clearPermissions();
  await open(page);
  await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1,PERMISSION_DENIED:1,TIMEOUT:3,message:'denied'});});
  await page.locator('#pin-locate').click();
  await expect(page.locator('#pin-locate-status')).toContainText('Location was not allowed');
  const box=await page.locator('#pin-map').boundingBox();await page.mouse.click(box.x+box.width*.6,box.y+box.height*.5);
  await expect(page.locator('#pin-position')).toContainText('placed on the map by eye');
});

test('a required field and a date-and-time field: a pin lacking the required value is named, and saved',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page);
  await page.getByText('Add a form field',{exact:true}).click();
  await page.locator('#pin-field-key').fill('visited_at');await page.locator('#pin-field-label').fill('Visited at');
  await page.locator('#pin-field-type').selectOption('datetime');await page.locator('#pin-field-required').check();
  await page.locator('#pin-add-field').click();
  await page.locator('#pin-record').selectOption('inside');
  await expect(page.locator('#pin-form')).toContainText('Visited at (required)');
  await expect(page.locator('[data-pin-key="visited_at"]')).toHaveAttribute('type','datetime-local');
  await expect(page.locator('#input-summary')).toContainText('lack a required value');
  await expect(page.locator('#pin-table tr[aria-selected="true"]')).toContainText('Visited at');
  await page.locator('[data-pin-key="visited_at"]').fill('2026-11-22T09:30');await page.locator('#pin-save').click();
  await expect(page.locator('#pin-table tr[aria-selected="true"]')).not.toContainText('Visited at');
  // Saved although other pins lack it: a missing value is said, not a reason to lose the pins.
  await page.locator('#config-apply').click();
  const params=source(await saved(page));
  assert.deepEqual(params.fields.find(f=>f.key==='visited_at'),{key:'visited_at',label:'Visited at',type:'datetime',required:true});
  assert.equal(params.data.features.find(f=>f.id==='inside').properties.visited_at,'2026-11-22T09:30');
  expect(errors).toEqual([]);
});

test('markers are coloured by Category, with a legend naming each and its count',async({page})=>{
  await open(page);
  await page.locator('#pin-record').selectOption('inside');
  await page.locator('[data-pin-key="category"]').fill('Clinic');await page.locator('#pin-save').click();
  await expect(page.locator('#pin-legend')).toContainText('Markers by Category');
  await expect(page.locator('#pin-legend')).toContainText('Clinic (1)');
  await expect(page.locator('#pin-legend')).toContainText('No category');
  const clinic=page.locator('.input-pin.selected > span');
  await expect(clinic).toHaveText('C');
  await expect(clinic).toHaveCSS('background-color','rgb(27, 94, 32)');
  // A row of the table chooses its pin.
  const other=await page.locator('#pin-table [data-pin-choose]').nth(1);
  const name=await other.textContent();await other.click();
  await expect(page.locator('#pin-name')).toHaveValue(name);
});

test('a position typed in degrees, minutes and seconds; a place found by name moves the map',async({page})=>{
  await page.route(/nominatim\.openstreetmap\.org\/search/,r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify([{display_name:'Gaborone, South-East District, Botswana',lat:'-24.6545',lon:'25.9086',boundingbox:['-24.75','-24.55','25.80','26.00']}])}));
  await open(page);
  await page.locator('#pin-record').selectOption('inside');
  await page.locator('#pin-longitude').fill('25° 54\' 31" E');await page.locator('#pin-latitude').fill('24° 39\' 16" S');
  await page.locator('#pin-save').click();
  await expect(page.locator('#pin-position')).toContainText('typed as longitude and latitude');
  await expect(page.locator('#pin-latitude')).toHaveValue(/^-24\.654/);
  await page.locator('#pin-place').fill('Gaborone');await page.locator('#pin-place-find').click();
  await expect(page.locator('#pin-place-status')).toContainText("1 place from OpenStreetMap's Nominatim (the words typed were sent there)");
  await page.locator('#pin-place-results button').first().click();
  await expect(page.locator('#pin-place-status')).toContainText('Showing Gaborone');
});

test('the editor is the standard dialog: its heading, Undo within the draft, what an import would replace, a basemap needing a key, and the privacy line',async({page})=>{
  await open(page);
  await expect(page.locator('#input-dialog-title')).toContainText('Point data');
  await expect(page.locator('#pin-privacy')).toContainText('Pins on homes can identify the people who live there');
  // Undo takes back a deleted pin, in the draft.
  const before=await page.locator('#pin-record option').count();
  await page.locator('#pin-record').selectOption('inside');await page.getByRole('button',{name:'Delete pin',exact:true}).click();
  await expect(page.locator('#pin-record option')).toHaveCount(before-1);
  await page.locator('#pin-undo').click();
  await expect(page.locator('#pin-record option')).toHaveCount(before);
  // A basemap on a key not unlocked says so rather than drawing nothing silently.
  await page.locator('#pins-basemap').selectOption('esri-imagery');
  await expect(page.locator('#pins-map-status')).toContainText('needs your Esri key');
  // Changing to an import says what it would replace.
  await page.locator('#input-mode').selectOption('csv');
  await expect(page.locator('#input-replace-note')).toContainText(/This draft holds \d+ records.*Importing replaces them; Cancel keeps them\./);
  // Cancel with changes asks first, in the standard words.
  await page.locator('#config-cancel').click();
  await expect(page.locator('#config-keep-editing')).toBeVisible();
  await page.locator('#config-discard').click();
  await expect(page.locator('#input-dialog')).toHaveCount(0);
});

test.describe('on a phone, by touch',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  test('a tap places a pin, and Apply is in reach',async({page})=>{
    await open(page);
    const count=await page.locator('#pin-record option').count();
    await page.locator('#pin-map').scrollIntoViewIfNeeded();
    const box=await page.locator('#pin-map').boundingBox();
    await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);
    await expect(page.locator('#pin-record option')).toHaveCount(count+1);
    await expect(page.locator('#pin-position')).toContainText('placed on the map by eye');
    await expect(page.locator('#config-apply')).toBeInViewport({ratio:1});
    await page.locator('#config-apply').tap();
    await expect(page.locator('#input-dialog')).toHaveCount(0);
  });
});

// A real JPEG, drawn in the page, with a phone's GPS position written into its EXIF in Node.
const photoWithPosition=async page=>{
  const base64=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=3000;c.height=1500;const g=c.getContext('2d');g.fillStyle='#2a7';g.fillRect(0,0,3000,1500);
    const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9));const a=new Uint8Array(await b.arrayBuffer());let s='';for(const x of a)s+=String.fromCharCode(x);return btoa(s);});
  return withExif(Buffer.from(base64,'base64'),exifSegment([[25,54,31],'E'],[[24,39,16],'S']));
};

test('a photo on a pin: resized, its location offered to a pin without one and then not kept, a caption, saved by digest',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page);
  // The record with no location, so the photo's own position is offered.
  const missing=await page.evaluate(()=>[...document.querySelectorAll('#pin-record option')].map(o=>o.value).filter(Boolean));
  let target=null;for(const id of missing){await page.locator('#pin-record').selectOption(id);if((await page.locator('#pin-longitude').inputValue())===''){target=id;break;}}
  assert.ok(target,'the coverage exercise holds a record without a location');
  await page.locator('#pin-photo-input').setInputFiles({name:'clinic.jpg',mimeType:'image/jpeg',buffer:await photoWithPosition(page)});
  await expect(page.locator('#pin-photo-status')).toContainText('1 photo added, at most 2048 px, with no location or camera details kept in it.');
  await expect(page.locator('.pin-photos legend')).toHaveText('Photos (1 of 10)');
  await page.locator('#pin-photo-place').click();
  await expect(page.locator('#pin-position')).toContainText("where its photo was taken");
  await expect(page.locator('#pin-longitude')).toHaveValue(/^25\.9086/);
  await page.locator('[data-photo-caption="0"]').fill('Clinic entrance');
  await page.locator('#config-apply').click();
  await expect(page.locator('#input-dialog')).toHaveCount(0);
  const params=source(await saved(page));
  const [photo]=params.pinPhotos[target];
  assert.equal(photo.caption,'Clinic entrance');assert.equal(photo.mime,'image/jpeg');assert.equal(Math.max(photo.width,photo.height),2048);
  // The kept bytes are a JPEG with no EXIF segment, so no location travels with the picture.
  const kept=await page.evaluate(sha=>new Promise(resolve=>{const r=indexedDB.open('fieldwork');r.onsuccess=()=>{const g=r.result.transaction('payloads').objectStore('payloads').get(`note-image:${sha}`);g.onsuccess=()=>resolve(g.result?.data??null);};}),photo.sha256);
  const bytes=Buffer.from(kept.slice(kept.indexOf(',')+1),'base64');
  assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8');assert.ok(!bytes.includes(Buffer.from('Exif\0\0','latin1')),'no EXIF in the kept photo');
  expect(errors).toEqual([]);
});

test('waypoints from a GPS device: GPX and KMZ read as points, tracks counted and not imported',async({page})=>{
  const {zipSync,strToU8}=await import('fflate');
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="observations"]').click();await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('gpx');
  const gpx=`<?xml version="1.0"?><gpx version="1.1" creator="handheld" xmlns="http://www.topografix.com/GPX/1/1">
    <wpt lat="-24.6544" lon="25.9086"><ele>1010.5</ele><time>2026-11-20T08:14:00Z</time><name>HH-001</name><desc>Household visited</desc><sym>Flag</sym></wpt>
    <wpt lat="-24.6551" lon="25.9101"><name>HH-002</name></wpt>
    <trk><name>Walk</name><trkseg><trkpt lat="-24.65" lon="25.90"/><trkpt lat="-24.66" lon="25.91"/></trkseg></trk></gpx>`;
  await page.locator('#input-file').setInputFiles({name:'walk.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(gpx)});
  await expect(page.locator('#gps-file-note')).toHaveText('2 waypoints read from walk.gpx. 1 track is a line or an area and was not imported: Point data holds points.');
  await expect(page.locator('#input-summary')).toContainText('2 draft point records');
  await page.locator('#config-apply').click();
  let feature=source(await saved(page)).data.features[0];
  assert.equal(feature.properties.name,'HH-001');assert.equal(feature.properties.elevation_m,1010.5);assert.equal(feature.properties.time,'2026-11-20T08:14:00Z');
  assert.deepEqual(feature.geometry.coordinates,[25.9086,-24.6544]);
  // KMZ: a zip holding doc.kml; a point placemark with extended data, and a line counted.
  const kml=`<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>
    <Placemark><name>Water point</name><ExtendedData><Data name="functional"><value>yes</value></Data></ExtendedData><Point><coordinates>25.91,-24.66,1002</coordinates></Point></Placemark>
    <Placemark><name>Road</name><LineString><coordinates>25.90,-24.65 25.91,-24.66</coordinates></LineString></Placemark></Document></kml>`;
  await page.locator('.react-flow__node[data-id="observations"]').click();await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('kml');
  await expect(page.locator('#input-replace-note')).toContainText('This draft holds 2 records');
  await page.locator('#input-file').setInputFiles({name:'sites.kmz',mimeType:'application/vnd.google-earth.kmz',buffer:Buffer.from(zipSync({'doc.kml':strToU8(kml)}))});
  await expect(page.locator('#gps-file-note')).toHaveText('1 point read from sites.kmz. 1 track is a line or an area and was not imported: Point data holds points.');
  await page.locator('#config-apply').click();
  feature=source(await saved(page)).data.features[0];
  assert.equal(feature.properties.name,'Water point');assert.equal(feature.properties.functional,'yes');assert.equal(feature.properties.elevation_m,1002);
});
