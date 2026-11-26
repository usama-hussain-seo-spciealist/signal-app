/* Experimental native BLE adapter. The existing optical transport remains the default. */
'use strict';
const nearby=(()=>{
 const bridge=window.SignalNearby,N=window.SignalNearbySession;let generation=0,state=null,queue=Promise.resolve(),wire=Promise.resolve(),waiter=null,timeout=null;
 const supported=()=>!!bridge;
 function status(text){$('nearbyStatus').textContent=text;}
 function post(value){if(!bridge)throw Error('Native Bluetooth is unavailable in Safari/PWA. A signed native iOS app is required; the existing QR fallback remains available.');bridge.postMessage(JSON.stringify(value));}
 function stop(reason){generation++;if(state&&state.channel)state.channel.close();state=null;wire=Promise.resolve();clearTimeout(timeout);if(waiter){waiter.reject(Error(reason||'Nearby session stopped. Pending transaction retained.'));waiter=null;}if(bridge)post({action:'stop'});if(reason)status(reason);}
 function active(token,check){check();if(token!==generation||!state)throw Error('Nearby session changed. Retry the same saved transaction.');}
 function sendEncrypted(text,current){const next=wire.then(async()=>{active(current.token,current.check);const box=await current.channel.seal(text);active(current.token,current.check);post({action:'send',text:box});});wire=next.catch(()=>{});return next;}
 function ready(){clearTimeout(timeout);if(waiter){waiter.resolve();waiter=null;}}
 async function listen(){
  if(!supported()){status('iPhone Safari/PWA cannot use this native BLE channel. Native iOS signing/install is not configured. Keep using the existing QR flow.');return;}
  if(!vault||!vault.isUnlocked())throw Error('Log in before starting Bluetooth receive.');stop();const check=vault.lease(),token=generation,w=await store.read();check();if(token!==generation)return;
  state={role:'receiver',check,token,wallet:w,channel:null,peer:null,handshake:null};post({action:'listen',accountId:w.account.id});status('Preparing foreground Bluetooth receive. Keep SignalPay open on both native apps.');
 }
 async function connect(row){
  if(!supported())throw Error('Native Bluetooth is unavailable. No BLE delivery was attempted.');if(!row.peerQR)throw Error('This older transaction has no saved receiver card. Use its existing QR receipt flow.');
  stop();const check=vault.lease(),token=generation,w=await store.read();check();if(token!==generation)throw Error('Session changed.');
  state={role:'sender',check,token,wallet:w,peerQR:row.peerQR,peer:row.peer,channel:null,id:row.id};
  const promise=new Promise((resolve,reject)=>{waiter={resolve,reject};timeout=setTimeout(()=>{if(token===generation)stop('Receiver unavailable or authentication timed out. Transaction remains Pending; retry the same transaction.');},35000);});
  post({action:'connect',accountId:row.peer.id});status('Discovering receiver · no internet needed. Payment is still Pending.');await promise;active(token,check);return {token,check};
 }
 async function sendPending(id){
  const row=(await store.read()).transactions.find(t=>t.id===id&&t.direction==='out'&&t.status==='Pending');if(!row)throw Error('No matching pending Bluetooth transaction.');const {token,check}=await connect(row);active(token,check);status('Sending encrypted payment · awaiting receiver acknowledgement.');await sendEncrypted(row.offerRaw,state);
 }
 async function receiptReady(id){
  const current=state;if(!current||!current.channel||current.role!=='receiver')return false;const check=current.check,token=current.token,row=(await store.read()).transactions.find(t=>t.id===id&&t.direction==='in');active(token,check);
  if(!row||!row.receiptRaw||row.peer.id!==current.peer.id)return false;await sendEncrypted(row.receiptRaw,current);status('Receiver decision saved. Encrypted receipt sent to the BLE transport; sender must verify it to finalize.');return true;
 }
 async function handle(event){
  if(['error','unavailable'].includes(event.type)){stop(event.detail+' Any unconfirmed payment remains Pending.');return;}
  if(['capability','permission','discovering','listening'].includes(event.type)){status(event.detail);return;}
  if(event.type==='stopped'||!state)return;const current=state,{token,check}=current;active(token,check);
  if(event.type==='connected'){
   // A receiver notification can arrive before the central's subscription callback.
   // Preserve an already-started/authenticated handshake when that callback arrives late.
   if(current.handshake||current.channel)return;
   status('BLE connected. Authenticating account keys; this is not a payment receipt.');
   if(current.role==='receiver'){current.handshake=await N.receiver(current.wallet);active(token,check);post({action:'send',text:current.handshake.hello});}
   return;
  }
  if(event.type!=='message')return;
  if(!current.channel){
   if(current.role==='sender'){const result=await N.sender(current.wallet,current.peerQR,event.text);active(token,check);current.channel=result.channel;current.peer=result.peer;post({action:'send',text:result.reply});status('Scanned receiver key authenticated. Preparing encrypted delivery.');ready();}
   else{if(!current.handshake)throw Error('Nearby handshake arrived before receiver preparation.');const result=await current.handshake.finish(event.text);active(token,check);current.channel=result.channel;current.peer=result.peer;status('Sender key authenticated. Awaiting an encrypted signed payment.');}
   return;
  }
  const raw=await current.channel.open(event.text);active(token,check);const packet=await A.verify(raw);active(token,check);
  if(current.role==='receiver'){
   if(packet.body.c>100000)throw Error('Experimental Bluetooth demo limit is PKR 1,000. No receiver balance was changed.');
   if(packet.body.t!=='offer'||packet.body.from.id!==current.peer.id||packet.body.to!==current.wallet.account.id)throw Error('Nearby payment does not match the authenticated session.');
   view('send');await showDecoded(raw,'Authenticated Bluetooth session');active(token,check);
   const old=(await store.read()).transactions.find(t=>t.id===packet.body.id&&t.direction==='in');active(token,check);
   if(old&&old.receiptRaw)await receiptReady(old.id);else status('Payment delivered over encrypted BLE. Receiver must review and accept/reject; no sender success yet.');
  }else{
   if(packet.body.t!=='receipt'||packet.body.to!==current.peer.id||packet.body.from!==current.wallet.account.id||packet.body.id!==current.id)throw Error('Nearby receipt does not match this pending transaction.');
   await showDecoded(raw,'Authenticated Bluetooth receipt');active(token,check);const finalized=(await store.read()).transactions.find(t=>t.id===current.id);active(token,check);if(!finalized||finalized.status==='Pending'||finalized.receiptRaw!==raw)throw Error('Receipt was not applied. Payment is not confirmed; inspect its saved state.');status('Matching receiver-signed acknowledgement verified. Demo transaction finalized; no banking settlement.');
  }
 }
 if(bridge)bridge.onmessage=event=>{let value;try{value=JSON.parse(event.data);}catch(_){stop('Malformed native Bluetooth response.');return;}const token=generation;queue=queue.then(()=>{if(token===generation)return handle(value);}).catch(error=>{if(token===generation)stop(error.message||'Bluetooth session failed. Pending state retained.');});};
 $('useNearby').checked=supported();$('useNearby').disabled=!supported();$('startNearbyReceive').disabled=!supported();$('nearbyCapability').textContent=supported()?'Experimental native foreground BLE. Hardware interoperability is unverified. Leave off to use the existing QR transport.':'Native Bluetooth unavailable in this Safari/PWA/browser installation. iPhone needs a signed native Core Bluetooth app; its setup is not configured.';
 $('startNearbyReceive').addEventListener('click',()=>listen().catch(e=>status(e.message)));$('stopNearby').addEventListener('click',()=>stop('Bluetooth session stopped. Saved payments and receipts were kept.'));
 ['receive','navReceive'].forEach(id=>$(id).addEventListener('click',()=>{if(supported()&&!state)listen().catch(e=>status(e.message));}));
 $('retryNearby').addEventListener('click',()=>sendPending(activeTransfer).catch(e=>status(e.message)));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Bluetooth stopped when the app left the foreground. Reopen and retry the same pending transaction.');});
 return {supported,listen,sendPending,receiptReady,stop,status};
})();
