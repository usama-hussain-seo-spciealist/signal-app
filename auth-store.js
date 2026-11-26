(function(root){
 'use strict';
 const M=typeof module!=='undefined'&&module.exports?require('./migration-core.js'):root.SignalMigration;
 function openVault(indexedDB,A,C){
  let session=null,generation=0;
  const ready=new Promise((resolve,reject)=>{const r=indexedDB.open('signalpay-login-v3',1);r.onupgradeneeded=()=>{const p=r.result.createObjectStore('profiles',{keyPath:'id'});p.createIndex('phoneHash','phoneHash',{unique:true});r.result.createObjectStore('directory',{keyPath:'id'});};r.onsuccess=()=>{r.result.onversionchange=()=>{lock();r.result.close();};resolve(r.result);};r.onerror=()=>reject(new Error('Persistent account storage is unavailable. No temporary account will be created.'));r.onblocked=()=>reject(new Error('Close other SignalPay tabs and reopen.'));});
  async function get(store,key,index){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),s=tx.objectStore(store),r=index?s.index(index).get(key):s.get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function count(){const db=await ready;return new Promise((resolve,reject)=>{const r=db.transaction('profiles','readonly').objectStore('profiles').count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  const markerKey=id=>'signalpay-lock-v3:'+id;
  function marker(id){try{return localStorage.getItem(markerKey(id))||'';}catch(_){return '';}}
  function current(s){return !!s&&marker(s.id)===s.marker;}
  function lock(revoke=false){if(revoke&&session)try{localStorage.setItem(markerKey(session.id),Date.now()+':'+crypto.getRandomValues(new Uint32Array(1))[0]);}catch(_){}generation++;session=null;trustedPackets.clear();}
  function active(){if(!session||!current(session))throw new Error('Please log in with your mobile number and PIN.');return session;}
  function lease(){const s=active(),token=generation;return ()=>{if(token!==generation||session!==s||!current(s))throw new Error('Session changed. Log in and review this action again.');};}
  async function create(fullName,mobile,pin,confirmation){
   const token=generation,n=C.validateName(fullName),p=C.phone(mobile);C.pin(pin);if(pin!==confirmation)throw new Error('PIN confirmation does not match.');const hash=await C.phoneHash(p);if(await get('profiles',hash,'phoneHash'))throw new Error('This mobile number already has an account on this installation. Log in instead.');
   const wallet=await A.createWallet(n,true),serialized=await C.serializeWallet(wallet),header={id:wallet.account.id,phoneHash:hash,salt:C.randomSalt(),revision:1,version:3,failedAttempts:0,lockedUntil:0};
   const key=await C.derive(pin,header.salt),payload={profile:{fullName:n,mobile:p,phoneVerified:false,createdAt:new Date().toISOString()},wallet:serialized,contacts:{},sync:{inbox:[],processed:[]}},record=await C.seal(payload,key,header);
   if(token!==generation)throw new Error('Registration was cancelled.');
   const db=await ready;await new Promise((resolve,reject)=>{const tx=db.transaction(['profiles','directory'],'readwrite');tx.objectStore('profiles').add(record);tx.objectStore('directory').add({id:wallet.account.id,qr:wallet.accountQR,source:'local-registration'});tx.oncomplete=resolve;tx.onabort=()=>reject(new Error('Account registration could not be saved, or this mobile number is already registered locally.'));tx.onerror=()=>{};});
   const restored=await C.restoreWallet(serialized);await A.auditWallet(restored);if(token!==generation)throw new Error('Registration was cancelled. Log in to your saved account.');session={id:record.id,key,privateKey:restored.privateKey,marker:marker(record.id)};return restored;
  }
  async function attempts(id,ok){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('profiles','readwrite'),s=tx.objectStore('profiles'),r=s.get(id);r.onsuccess=()=>{if(!r.result)return;const row=r.result;if(ok){row.failedAttempts=0;row.lockedUntil=0;}else{row.failedAttempts=(row.failedAttempts||0)+1;if(row.failedAttempts%5===0)row.lockedUntil=Date.now()+Math.min(900000,60000*Math.pow(2,Math.floor(row.failedAttempts/5)-1));}s.put(row);};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};});}
  async function unlock(mobile,pin){
   lock();const token=generation,hash=await C.phoneHash(mobile),record=await get('profiles',hash,'phoneHash');
   if(!record){await C.derive(String(pin),C.randomSalt());throw new Error('Mobile number or PIN is incorrect.');}
   if(record.lockedUntil>Date.now())throw new Error('Too many PIN attempts. Try again after '+Math.ceil((record.lockedUntil-Date.now())/1000)+' seconds.');
   const key=await C.derive(String(pin),record.salt);let payload;
   try{payload=await C.open(record,key);}catch(e){await attempts(record.id,false);throw e;}
   if(token!==generation)throw new Error('Login was cancelled.');const wallet=await C.restoreWallet(payload.wallet);await A.auditWallet(wallet);if(payload.profile.mobile!==C.phone(mobile)||wallet.account.id!==record.id)throw new Error('Account record does not match this login.');await attempts(record.id,true);if(token!==generation)throw new Error('Login was cancelled.');session={id:record.id,key,privateKey:wallet.privateKey,marker:marker(record.id)};return wallet;
  }
  async function data(){const s=active(),token=generation,row=await get('profiles',s.id);if(!row)throw new Error('Account storage is missing.');const payload=await C.open(row,s.key);if(token!==generation||session!==s||!current(s))throw new Error('Session locked. Please log in.');return {row,payload,s,token};}
  async function change(mutator){
   for(let retry=0;retry<5;retry++){
    const {row,payload,s,token}=await data(),wallet={...payload.wallet.data,privateKey:s.privateKey};if(!A.validWallet(wallet))throw new Error('Saved wallet is inconsistent. No payment was recorded.');
    const result=mutator(payload,wallet);if(result&&typeof result.then==='function')throw new Error('Vault updates must be synchronous.');
    const next=await C.seal(result,s.key,{...row,revision:row.revision+1});if(token!==generation||session!==s||!current(s))throw new Error('Session locked before saving.');
    const db=await ready;let matched=false;await new Promise((resolve,reject)=>{const tx=db.transaction(['profiles','directory'],'readwrite'),store=tx.objectStore('profiles'),r=store.get(row.id);r.onsuccess=()=>{const saved=r.result;if(token!==generation||session!==s||!current(s)){tx.abort();return;}if(saved&&saved.revision===row.revision){matched=true;store.put({...next,failedAttempts:saved.failedAttempts,lockedUntil:saved.lockedUntil});tx.objectStore('directory').put({id:row.id,qr:result.wallet.data.accountQR,source:'local-registration'});}};tx.oncomplete=resolve;tx.onabort=()=>reject(new Error('Session locked or account update failed. No unverified success was shown.'));tx.onerror=()=>{};});
    if(matched)return {...result.wallet.data,privateKey:s.privateKey};
   }throw new Error('Another session updated this wallet. Please retry.');
  }
  async function read(){const {payload,s}=await data();return {...payload.wallet.data,privateKey:s.privateKey};}
  async function update(fn){return change((payload,wallet)=>{const next=fn(wallet);if(!A.validWallet(next))throw new Error('Invalid wallet transition.');return C.replaceWallet(payload,next);});}
  async function profile(){return (await data()).payload.profile;}
  async function resolveAccount(account){
   const check=lease(),own=(await data()).payload,registered=await get('directory',account.id);check();let trusted;
   if(registered){const p=await A.verify(registered.qr);trusted={...p.body.account,source:'Registered on this installation'};}else trusted=own.contacts[account.id];
   if(!trusted)return null;if(trusted.k!==account.k||trusted.id!==account.id)throw new Error('Saved account record does not match this QR key.');return trusted;
  }
  async function trustAccount(account,confirmedName,confirmedId){
   const check=lease();if(confirmedId.trim()!==account.id)throw new Error('The independently checked account ID does not match.');const n=C.validateName(confirmedName);
   const proof=await A.verify(await identityPacket(account)),peer=proof.body.t==='account'?proof.body.account:proof.body.from;
   check();if(!peer||peer.id!==account.id||peer.k!==account.k)throw new Error('Scanned key does not match this recipient.');
   await change(payload=>({...payload,contacts:{...payload.contacts,[account.id]:{...peer,n,source:'Saved recipient record',checkedAt:new Date().toISOString()}}}));return resolveAccount(account);
  }
  // Caller supplies an already verified account packet; retaining it avoids re-signing another user's data.
  let trustedPackets=new Map();
  function remember(packet){const peer=packet.body.t==='account'?packet.body.account:packet.body.from;if(!peer)throw new Error('This packet has no account record to confirm.');trustedPackets.set(peer.id,packet.raw);}
  async function identityPacket(account){const raw=trustedPackets.get(account.id);if(!raw)throw new Error('Scan the account QR again before saving a recipient.');return raw;}
  async function queueReceipts(raws){
   const check=lease(),wallet=await read(),verified=[];check();if(raws.length>50)throw new Error('Import at most 50 receipts at once.');for(const raw of raws){const p=await A.prepareReceipt(wallet,raw);check();A.finishOutgoing(wallet,p);verified.push(p);}
   await change(payload=>{const inbox=[...payload.sync.inbox];for(const p of verified)if(!payload.sync.processed.includes(p.hash)&&!inbox.some(x=>x.hash===p.hash))inbox.push({raw:p.raw,hash:p.hash});if(inbox.length>50)throw new Error('Receipt inbox is full. Reconcile before importing more.');return {...payload,sync:{...payload.sync,inbox}};});return verified.length;
  }
  async function reconcile(){
   const check=lease();let applied=0;const {payload}=await data();check();for(const item of payload.sync.inbox){const receipt=await A.prepareReceipt(await read(),item.raw);check();let did=false;await change((p,w)=>{did=false;if(p.sync.processed.includes(item.hash))return p;const next=A.finishOutgoing(w,receipt);did=true;return {...C.replaceWallet(p,next),sync:{inbox:p.sync.inbox.filter(x=>x.hash!==item.hash),processed:[...p.sync.processed,item.hash]}};});check();if(did)applied++;}return applied;
  }
  async function syncInfo(){const {payload}=await data();return {queued:payload.sync.inbox.length,pending:payload.wallet.data.transactions.filter(t=>t.direction==='out'&&t.status==='Pending').length,cloudConfigured:false};}
  async function receipts(){return (await read()).transactions.filter(t=>t.direction==='in'&&t.receiptRaw).map(t=>t.receiptRaw);}
  async function exportBackup(){const check=lease(),{row}=await data();check();return M.pack(row);}
  async function restoreBackup(raw,mobile,pin){
   if(current(session))throw Error('Log out before restoring another installation’s encrypted backup.');
   lock();const token=generation,row=M.parse(raw),hash=await C.phoneHash(mobile);
   if(hash!==row.phoneHash)throw Error('This mobile number does not match the encrypted backup.');
   if(await get('profiles',row.id)||await get('profiles',hash,'phoneHash'))throw Error('This account or mobile already exists here. Log in to the existing profile. Restore never overwrites saved data.');
   const key=await C.derive(String(pin),row.salt),payload=await C.open(row,key),wallet=await M.validatePayload(payload,row,mobile);
   if(token!==generation||current(session))throw Error('Restore cancelled because the account session changed.');
   const db=await ready;await new Promise((resolve,reject)=>{const tx=db.transaction(['profiles','directory'],'readwrite');
    if(token!==generation||current(session)){tx.abort();return;}
    tx.objectStore('profiles').add(row);tx.objectStore('directory').add({id:row.id,qr:wallet.accountQR,source:'local-registration'});
    tx.oncomplete=resolve;tx.onabort=()=>reject(Error('Restore could not be saved, or this account/mobile already exists. No existing profile was overwritten.'));tx.onerror=()=>{};
   });
   if(token!==generation)throw Error('Backup saved. Log in to the restored account to continue.');
   session={id:row.id,key,privateKey:wallet.privateKey,marker:marker(row.id)};return wallet;
  }
  return {exportBackup,restoreBackup,create,unlock,lock,count,read,update,profile,resolveAccount,remember,trustAccount,queueReceipts,reconcile,syncInfo,receipts,isUnlocked:()=>current(session),activeId:()=>session&&session.id,lease,sessionStamp:()=>session?generation:null};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={openVault};else root.SignalAuthStore={openVault};
})(typeof window!=='undefined'?window:globalThis);
