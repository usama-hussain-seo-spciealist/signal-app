const {test,expect}=require('@playwright/test');
const path=require('node:path');
const simple='SIGNALPAY-TEST-123',payment='signalpay-demo:v2:chai:PKR:100.00';
async function decoded(page,raw){await expect(page.locator('#decodedData')).toHaveText(raw);await expect(page.locator('#decodedResult')).toBeVisible();}
test('online PNG decoding displays exact text; payment needs explicit confirmation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await page.locator('.qr-tests summary').click();await page.locator('[data-test-qr="simple"]').click();await decoded(page,simple);await expect(page.locator('#useScanned')).toBeHidden();await expect(page.locator('#balance')).toHaveText('PKR 25,000.00');
 await page.locator('[data-test-qr="payment-100"]').click();await decoded(page,payment);await expect(page.locator('#balance')).toHaveText('PKR 25,000.00');
 await page.locator('#useScanned').click();await expect(page.locator('#amount')).toHaveValue('100.00');await page.locator('#paymentForm button[type=submit]').click();await page.locator('#confirmPayment').click();await expect(page.locator('#balance')).toHaveText('PKR 24,900.00');await expect(page.locator('#sms')).toContainText('NOT SENT');await expect(page.locator('#soundStatus')).toContainText(/(?:Soundbox preview|Voice is unavailable)[\s\S]*PKR 100\.00/);await expect(page.locator('#activityRows')).toContainText('Simulated');
 await page.reload();await decoded(page,payment);expect(errors).toEqual([]);
});
test('uploaded PNG uses browser image decoder and failure preserves last result',async({page})=>{
 await page.goto('./');await page.locator('#qrFile').setInputFiles(path.resolve('test-qrs/simple.png'));await decoded(page,simple);
 await page.locator('#qrFile').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.locator('#scanStatus')).toContainText('Image could not open');await decoded(page,simple);
 await page.locator('#qrFile').setInputFiles(path.resolve('test-qrs/payment-100.png'));await decoded(page,payment);
});
test('synthetic camera frames run real decoder, stop camera, keep text result',async({page})=>{
 await page.goto('./');
 test.skip(!(await page.evaluate(()=>typeof document.createElement('canvas').captureStream==='function')),'This engine cannot provide a synthetic canvas camera; physical camera testing remains required.');
 await page.addInitScript(()=>{
  window.__fakeTracks=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const image=new Image();image.src='./test-qrs/simple.png';await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const stream=canvas.captureStream(8);window.__fakeTracks=stream.getTracks();window.__frameTimer=setInterval(()=>ctx.drawImage(image,0,0),100);return stream;
  }});
 });
 await page.goto('./');await page.locator('#startCamera').click();await decoded(page,simple);await expect(page.locator('#startCamera')).toBeEnabled();expect(await page.evaluate(()=>__fakeTracks.every(t=>t.readyState==='ended'))).toBe(true);await expect(page.locator('#balance')).toHaveText('PKR 25,000.00');await page.evaluate(()=>clearInterval(__frameTimer));
});
test('camera denied has useful error rather than silently resetting',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new DOMException('denied','NotAllowedError')}}));await page.goto('./');await page.locator('#startCamera').click();await expect(page.locator('#scanStatus')).toContainText('permission was denied');await expect(page.locator('#startCamera')).toBeEnabled();
});
test('soundbox requests the demo announcement and mute prevents further speech',async({page})=>{
 await page.addInitScript(()=>{window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(utterance){window.__spoken.push(utterance.text)}}});});
 await page.goto('./');await page.locator('#testSound').click();expect(await page.evaluate(()=>__spoken)).toEqual(['Demo payment received. 500 Pakistani rupees. This is a simulation.']);await page.locator('#soundEnabled').uncheck();await page.locator('#testSound').click();await expect(page.locator('#soundStatus')).toContainText('Sound muted');expect(await page.evaluate(()=>__spoken.length)).toBe(1);
});
test('offline cold page reopen decodes both cached PNGs without any server',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Playwright WebKit offline/SW emulation is not a physical Safari offline test. Chromium checks the real service worker.');
 await page.goto('./');await expect(page.locator('#offlineStatus')).toContainText('Offline ready');await page.locator('.qr-tests summary').click();await page.locator('[data-test-qr="simple"]').click();await decoded(page,simple);
 await context.setOffline(true);await page.close();const reopened=await context.newPage();await reopened.goto('./?source=homescreen');await decoded(reopened,simple);expect(await reopened.evaluate(()=>navigator.onLine)).toBe(false);
 await reopened.locator('.qr-tests summary').click();for(const [name,raw]of [['simple',simple],['payment-100',payment]]){await reopened.locator('[data-test-qr="'+name+'"]').click();await decoded(reopened,raw);}
 await reopened.locator('#useScanned').click();await reopened.locator('#paymentForm button[type=submit]').click();await reopened.locator('#confirmPayment').click();await expect(reopened.locator('#balance')).toHaveText('PKR 24,900.00');await reopened.reload();await decoded(reopened,payment);await expect(reopened.locator('#balance')).toHaveText('PKR 24,900.00');await context.setOffline(false);
});
test('separate receiver browser has no delivered transfer or sync',async({page,browser})=>{
 await page.goto('./');const receiver=await browser.newContext();const other=await receiver.newPage();await other.goto('http://127.0.0.1:4173/signal-app/');await page.locator('#amount').fill('100');await page.locator('#paymentForm button[type=submit]').click();await page.locator('#confirmPayment').click();await expect(page.locator('#balance')).toHaveText('PKR 24,900.00');await other.reload();await expect(other.locator('#balance')).toHaveText('PKR 25,000.00');await expect(other.locator('#paymentCount')).toHaveText('0');await receiver.close();
});
