/* PIN-encrypted demo-profile portability. Add-only restore; not a trusted financial backup. */
(function(root){
 'use strict';
 const A=typeof module!=='undefined'&&module.exports?require('./account-core.js'):root.SignalAccounts;
 const C=typeof module!=='undefined'&&module.exports?require('./auth-crypto.js'):root.SignalAuthCrypto;
 const MAX=5000000,fail=m=>{throw Error(m);};
 function parse(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX)fail('Choose an encrypted SignalPay backup smaller than 5 MB.');
  let b;try{b=JSON.parse(raw);}catch(_){fail('Backup is not valid JSON.');}
  if(!b||b.format!=='signalpay-encrypted-profile'||b.v!==1||!b.record)fail('This is not an encrypted SignalPay profile backup.');
  const r=b.record;
  if(r.version!==3||!/^SP-[a-f0-9]{32}$/.test(r.id)||!/^[a-f0-9]{64}$/.test(r.phoneHash)||!Number.isSafeInteger(r.revision)||r.revision<1)fail('Unsupported backup account header.');
  const sizes={salt:16,iv:12};
  for(const field of ['salt','iv','ciphertext']){const s=r[field];if(typeof s!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(s)||s.length%4)fail('Invalid encrypted backup encoding.');let n;try{n=atob(s).length;}catch(_){fail('Invalid encrypted backup encoding.');}if(field==='ciphertext'?(n<16||n>4000000):n!==sizes[field])fail('Invalid encrypted backup size.');}
  // Copy only the authenticated vault schema; never trust arbitrary imported properties/counters.
  return {id:r.id,phoneHash:r.phoneHash,salt:r.salt,revision:r.revision,version:3,iv:r.iv,ciphertext:r.ciphertext,failedAttempts:0,lockedUntil:0};
 }
 function pack(record){const raw=JSON.stringify({format:'signalpay-encrypted-profile',v:1,exportedAt:new Date().toISOString(),record});parse(raw);return raw;}
 async function validatePayload(payload,record,mobile){
  const w=await C.restoreWallet(payload.wallet);await A.auditWallet(w);
  if(w.account.id!==record.id||!payload.profile||payload.profile.mobile!==C.phone(mobile)||await C.phoneHash(payload.profile.mobile)!==record.phoneHash||payload.profile.phoneVerified!==false||payload.profile.fullName!==w.account.n)fail('Backup profile does not match its signed account/mobile. No data was imported.');
  if(!payload.contacts||typeof payload.contacts!=='object'||Array.isArray(payload.contacts)||Object.keys(payload.contacts).length>1000)fail('Invalid saved recipient records.');
  for(const [id,p] of Object.entries(payload.contacts)){
   if(!p||id!==p.id||p.a!=='signalpay:'+id||C.validateName(p.n)!==p.n||p.source!=='Saved recipient record'||typeof p.k!=='string')fail('Invalid saved recipient record.');
   const bytes=Uint8Array.from(atob(p.k.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   await crypto.subtle.importKey('raw',bytes,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(id!=='SP-'+hash.slice(0,32))fail('Backup contact key/ID mismatch.');
  }
  const sync=payload.sync;
  if(!sync||!Array.isArray(sync.inbox)||sync.inbox.length>50||!Array.isArray(sync.processed)||sync.processed.length>A.MAX_HISTORY||new Set(sync.processed).size!==sync.processed.length||sync.processed.some(h=>!/^[a-f0-9]{64}$/.test(h)))fail('Invalid receipt reconciliation state.');
  for(const item of sync.inbox){if(item.hash!==await A.digest(item.raw))fail('Backup receipt hash differs.');A.finishOutgoing(w,await A.prepareReceipt(w,item.raw));}
  return w;
 }
 const api={parse,pack,validatePayload,MAX};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SignalMigration=api;
})(typeof window!=='undefined'?window:globalThis);
