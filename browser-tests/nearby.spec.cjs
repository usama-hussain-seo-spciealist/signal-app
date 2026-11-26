// This routes native bridge events in memory. It is NOT a Bluetooth/radio test.
const {test,expect}=require('@playwright/test');
const ADIL={name:'Adil',mobile:'+923001110001',pin:'63728495'},USAMA={name:'Usama',mobile:'+923001110002',pin:'58472916'};
async function register(page,user){await page.goto('/signal-app/');await expect(page.locator('#authScreen')).toBeVisible();if(!await page.locator('#registerForm').isVisible())await page.locator('#toggleAuth').click();for(const [id,value]of Object.entries({registerName:user.name,registerMobile:user.mobile,registerPin:user.pin,confirmPin:user.pin}))await page.locator('#'+id).fill(value);await page.locator('#registerSubmit').click();await expect(page.locator('#appContent')).toBeVisible({timeout:20000});await page.waitForFunction(()=>document.getElementById('offlineStatus').textContent.includes('Offline ready'));}
async function wallet(page){return page.evaluate(async()=>{const w=await store.read();return {id:w.account.id,name:w.account.n,balance:w.balance,rows:w.transactions.map(t=>({id:t.id,status:t.status,cents:t.cents,direction:t.direction}))};});}
async function trust(page){if(await page.locator('#recipientChecked').isVisible())await page.locator('#recipientChecked').check();}
async function simulatedBridge(contexts){
 const listeners=new Map(),peers=new Map(),commands=[];
 async function emit(page,event){if(!page.isClosed())await page.evaluate(e=>window.SignalNearby.onmessage({data:JSON.stringify(e)}),event);}
 for(const context of contexts){
  await context.exposeBinding('mockNearby',async({page},raw)=>{
   const c=JSON.parse(raw);commands.push(c.action);
   if(c.action==='stop'){for(const [id,p]of listeners)if(p===page)listeners.delete(id);const peer=peers.get(page);peers.delete(page);if(peer){peers.delete(peer);await emit(peer,{type:'error',detail:'SIMULATED disconnect'});}return;}
   if(c.action==='listen'){listeners.set(c.accountId,page);await emit(page,{type:'listening',detail:'SIMULATED transport listening'});}
   if(c.action==='connect'){const receiver=listeners.get(c.accountId);if(!receiver){await emit(page,{type:'error',detail:'SIMULATED receiver unavailable'});return;}peers.set(page,receiver);peers.set(receiver,page);await emit(receiver,{type:'connected'});await emit(page,{type:'connected'});}
   if(c.action==='send'){const peer=peers.get(page);if(!peer)throw Error('Mock transport missing peer');await emit(peer,{type:'message',text:c.text});}
  });
  await context.addInitScript(()=>{window.SignalNearby={onmessage:null,postMessage:raw=>{window.mockNearby(raw).catch(e=>{window.mockError=e.message;});}};window.fileImports=0;document.addEventListener('change',e=>{if(e.target.id==='qrFile')window.fileImports++;});});
 }
 return commands;
}
for(const reverse of [false,true])for(const offline of [false,true])test(`SIMULATED native bridge: ${reverse?'Android Adil → iPhone Usama':'iPhone Usama → Android Adil'} ${offline?'offline':'online'}, one account scan and automatic signed ACK`,async({browser})=>{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844}}),browser.newContext({viewport:{width:390,height:844}})]);
 try{
  const commands=await simulatedBridge(contexts),[sender,receiver]=await Promise.all(contexts.map(c=>c.newPage()));
  await register(sender,reverse?ADIL:USAMA);await register(receiver,reverse?USAMA:ADIL);const owner=await wallet(receiver);
  if(offline)await Promise.all(contexts.map(c=>c.setOffline(true)));
  await receiver.locator('#receive').click();await receiver.locator('#startNearbyReceive').click();await expect(receiver.locator('#nearbyStatus')).toContainText('SIMULATED transport listening');
  const png=await receiver.locator('#accountQR img').screenshot();await sender.locator('#navScan').click();await sender.locator('#modeOffline').click();await sender.locator('#useNearby').check();await sender.locator('#qrFile').setInputFiles({name:'receiver.png',mimeType:'image/png',buffer:png});
  await expect(sender.locator('#amountDialog')).toBeVisible();await expect(sender.locator('#receiverName')).toHaveText(owner.name);await expect(sender.locator('#receiverId')).toHaveText(owner.id);await trust(sender);await sender.locator('#amount').fill('100');await sender.locator('#paymentForm button[type=submit]').click();await sender.locator('#confirmPayment').click();
  await expect(sender.locator('#transferStatus')).toHaveText('Pending');await expect(receiver.locator('#trustDialog')).toBeVisible();await receiver.locator('#trustChecked').check();await receiver.locator('#trustForm button[type=submit]').click();await expect(receiver.locator('#incomingReview')).toBeVisible();await receiver.locator('#acceptIncoming').click();
  await expect(sender.locator('#transferStatus')).toHaveText('Successful',{timeout:15000});const s=await wallet(sender),r=await wallet(receiver);expect(s.balance).toBe(2490000);expect(r.balance).toBe(2510000);expect(s.rows).toHaveLength(1);expect(r.rows).toHaveLength(1);expect(s.rows[0].id).toBe(r.rows[0].id);expect(s.rows[0].status).toBe('Successful');expect(r.rows[0].status).toBe('Successful');expect(await sender.evaluate(()=>window.fileImports)).toBe(1);expect(await receiver.evaluate(()=>window.fileImports)).toBe(0);expect(commands.filter(c=>c==='send').length).toBe(4);expect(await sender.evaluate(()=>window.mockError||'')).toBe('');expect(await receiver.evaluate(()=>window.mockError||'')).toBe('');
  await test.info().attach('SIMULATION-not-radio.json',{body:JSON.stringify({kind:'In-memory native bridge simulation, no Bluetooth radio or physical phones',offline,sender:s,receiver:r,accountQRImports:{sender:1,receiver:0}},null,2),contentType:'application/json'});
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
test('Safari/PWA without a native bridge cannot claim Bluetooth delivery',async({page})=>{await register(page,USAMA);await page.locator('#navScan').click();await expect(page.locator('#useNearby')).toBeDisabled();await expect(page.locator('#nearbyCapability')).toContainText('Native Bluetooth unavailable');expect((await wallet(page)).rows).toHaveLength(0);});
