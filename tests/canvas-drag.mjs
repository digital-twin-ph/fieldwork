/** A CONNECTION DRAWN ON THE CANVAS, from one handle to another, by the mouse, as a person draws it.
 *
 *  WebKit now and then loses a drag: the pointer is released over the target handle, yet the canvas never sees a
 *  connection made (join-config's drop test failed so in CI at 0.159.0, 0.161.0 and 0.164.0, and passed at 0.159.1, with
 *  no change to the canvas between). The gesture is the thing being lost, not what the drop binds to, so the drag is drawn
 *  again where `landed` is still false after it, up to three times; what the drop bound is then asserted by the test as
 *  before. A drop that landed is never drawn twice, so no connection is doubled by the retry. */
export async function dragConnection(page,from,to,landed,{tries=3,wait=4000}={}){
  for(let attempt=1;attempt<=tries;attempt++){
    // A TOAST OVER A HANDLE takes the drag (0.165.0 and 0.166.0 CI, WebKit): dismissed before each attempt.
    await page.evaluate(()=>document.querySelector('#toast button')?.click());
    const a=await from.boundingBox(),b=await to.boundingBox();
    const ax=a.x+a.width/2,ay=a.y+a.height/2,bx=b.x+b.width/2,by=b.y+b.height/2;
    await page.mouse.move(ax,ay);await page.mouse.down();
    // A small first move, so the canvas starts the connection before the long one.
    await page.mouse.move(ax+4,ay+4,{steps:2});
    // A PRESS THAT MISSED THE HANDLE PICKS UP THE NODE (0.167.0 CI, WebKit): the long move then carried "Census 1984" onto
    // Join's inputs, and every later try began on a handle Join now covered. So a connection must have begun before the
    // long move; if none has, the press is let go where it was, nothing moved, and the drag is measured again.
    if(!await page.locator('.react-flow__connection, .react-flow__connectionline').count()){
      await page.mouse.move(ax,ay);await page.mouse.up();await page.waitForTimeout(200);continue;}
    await page.mouse.move(bx,by,{steps:20});
    // Settled over the target before release.
    await page.mouse.move(bx+1,by,{steps:2});await page.mouse.move(bx,by);
    await page.mouse.up();
    const deadline=Date.now()+wait;
    while(Date.now()<deadline){if(await landed())return attempt;await page.waitForTimeout(150);}
  }
  return tries+1;
}
