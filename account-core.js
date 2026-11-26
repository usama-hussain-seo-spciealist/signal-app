/* Demo optical transfer protocol. No bank, trusted balance ledger or verified identity. */
(function(root){
  'use strict';
  const subtle = () => globalThis.crypto.subtle;
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8', {fatal:true});
  const MAX_HISTORY=500, PREFIX='signalpay:2:';
  const fail = message => { throw new Error(message); };
  const b64 = bytes => { let s=''; for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
  function unb64(s){if(typeof s!=='string'||!s.length||!/^[A-Za-z0-9_-]+$/.test(s)||s.length%4===1)fail('Invalid QR encoding.');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
  const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  async function digest(text){return hex(await subtle().digest('SHA-256',enc.encode(text)));}
  function exact(obj,keys){if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).sort().join(',')!==keys.split(',').sort().join(','))fail('Unsupported or malformed SignalPay QR.');}
  function cents(c){if(!Number.isSafeInteger(c)||c<100||c>10000000)fail('Enter an amount from PKR 1 to PKR 100,000, with up to two decimals.');return c;}
  function amount(value){if(!/^\d+(?:\.\d{1,2})?$/.test(String(value)))fail('Enter a valid PKR amount with up to two decimals.');return cents(Math.round(Number(value)*100));}
  function name(value){if(typeof value!=='string'||value!==value.trim()||value.length<1||value.length>40||/[\u0000-\u001f\u007f]/.test(value))fail('Use an account name of 1–40 characters without control characters.');return value;}
  const id=()=> 'TX-'+hex(crypto.getRandomValues(new Uint8Array(16)));
  const accountId=key=>subtle().digest('SHA-256',unb64(key)).then(bytes=>'SP-'+hex(bytes).slice(0,32));
  async function identity(value){
    exact(value,'id,n,a,k');name(value.n);
    if(typeof value.k!=='string'||unb64(value.k).length!==65||value.id!==await accountId(value.k)||value.a!=='signalpay:'+value.id)fail('Account ID does not match its signing key.');
    return value;
  }
  function common(b){if(b.v!==2||!['account','offer','receipt'].includes(b.t))fail('Unsupported SignalPay QR version.');}
  function transferFields(b){if(typeof b.id!=='string'||!/^TX-[0-9a-f]{32}$/.test(b.id))fail('Invalid transaction ID.');cents(b.c);if(b.u!=='PKR'||!['online','offline'].includes(b.m)||typeof b.at!=='string'||b.at.length!==24||!Number.isFinite(Date.parse(b.at)))fail('Invalid transaction details.');}
  async function sign(body,key){const bytes=enc.encode(JSON.stringify(body)),sig=await subtle().sign({name:'ECDSA',hash:'SHA-256'},key,bytes);return PREFIX+b64(bytes)+'.'+b64(sig);}
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  async function verify(raw){
    if(typeof raw!=='string'||raw.length>2600||!raw.startsWith(PREFIX))fail('QR read, but this is not a current SignalPay account, transfer or receipt QR. No payment was made.');
    const parts=raw.slice(PREFIX.length).split('.');if(parts.length!==2)fail('Incomplete SignalPay QR.');
    let b,bytes,sig;
    try{bytes=unb64(parts[0]);sig=unb64(parts[1]);b=JSON.parse(dec.decode(bytes));}catch(_){fail('Damaged or invalid QR data.');}
    common(b);let signer;
    if(b.t==='account'){exact(b,'v,t,account');signer=await identity(b.account);}
    if(b.t==='offer'){exact(b,'v,t,id,from,to,c,u,m,at');transferFields(b);signer=await identity(b.from);if(!/^SP-[0-9a-f]{32}$/.test(b.to)||b.to===signer.id)fail('Invalid receiver account.');}
    if(b.t==='receipt'){exact(b,'v,t,id,from,to,c,u,m,at,h,decision,by');transferFields(b);signer=await identity(b.by);if(b.to!==signer.id||!/^SP-[0-9a-f]{32}$/.test(b.from)||!['accepted','rejected'].includes(b.decision)||!/^[0-9a-f]{64}$/.test(b.h))fail('Invalid receipt.');}
    try{const key=await subtle().importKey('raw',unb64(signer.k),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);if(sig.length!==64||!await subtle().verify({name:'ECDSA',hash:'SHA-256'},key,sig,bytes))fail('signature');}catch(_){fail('QR signature verification failed. Data may have been changed. No balance was updated.');}
    return freeze({body:b,raw,hash:await digest(raw)});
  }
  async function createWallet(displayName,exportForVault=false){
    const keys=await subtle().generateKey({name:'ECDSA',namedCurve:'P-256'},exportForVault,['sign','verify']);
    const k=b64(await subtle().exportKey('raw',keys.publicKey)),aid=await accountId(k);
    const account={id:aid,n:name(displayName||'SignalPay '+aid.slice(-4).toUpperCase()),a:'signalpay:'+aid,k};
    return {version:2,account,privateKey:keys.privateKey,accountQR:await sign({v:2,t:'account',account},keys.privateKey),balance:2500000,transactions:[],createdAt:new Date().toISOString()};
  }
  async function renameWallet(wallet,displayName){const account={...wallet.account,n:name(displayName)};return {...wallet,account,accountQR:await sign({v:2,t:'account',account},wallet.privateKey)};}
  function validWallet(w){
    if(!(w&&w.version===2&&w.account&&w.privateKey&&w.privateKey.type==='private'&&!w.privateKey.extractable&&typeof w.accountQR==='string'&&Number.isSafeInteger(w.balance)&&w.balance>=0&&Array.isArray(w.transactions)&&w.transactions.length<=MAX_HISTORY))return false;
    const ids=new Set();let balance=2500000;
    for(const t of w.transactions){if(!t||!/^TX-[0-9a-f]{32}$/.test(t.id)||ids.has(t.id)||!['in','out'].includes(t.direction)||!['Pending','Successful','Failed'].includes(t.status)||!Number.isSafeInteger(t.cents)||t.cents<100||t.cents>10000000||!t.peer||typeof t.peer.n!=='string'||!['online','offline'].includes(t.mode)||typeof t.offerRaw!=='string'||!/^[0-9a-f]{64}$/.test(t.offerHash)||typeof t.time!=='string'||!Number.isFinite(Date.parse(t.time)))return false;if(t.transport!==undefined&&(t.transport!=='ble'||t.direction!=='out'||typeof t.peerQR!=='string'||t.peerQR.length>2600))return false;ids.add(t.id);if(t.status==='Pending'&&(t.direction!=='out'||t.receiptRaw!==null))return false;if(t.status!=='Pending'&&typeof t.receiptRaw!=='string')return false;if(t.direction==='in'&&t.decision!==(t.status==='Successful'?'accepted':'rejected'))return false;if(t.status==='Successful')balance+=t.direction==='in'?t.cents:-t.cents;}
    return balance===w.balance&&available(w)>=0;
  }
  async function auditWallet(w){
    if(!validWallet(w))fail('Saved demo ledger is inconsistent. No account was replaced and no balance was changed.');
    const account=await verify(w.accountQR);if(JSON.stringify(account.body.account)!==JSON.stringify(w.account))fail('Account QR differs from the saved account.');
    await verify(await sign({v:2,t:'account',account:w.account},w.privateKey));
    for(const t of w.transactions){await identity(t.peer);if(t.transport==='ble'){const card=await verify(t.peerQR);if(card.body.t!=='account'||!sameAccount(card.body.account,t.peer))fail('Saved Bluetooth routing card differs from its signed receiver.');}const p=await verify(t.offerRaw),b=p.body;if(b.t!=='offer'||p.hash!==t.offerHash||b.id!==t.id||b.c!==t.cents||b.m!==t.mode||b.at!==t.time||(t.direction==='out'?(!sameAccount(b.from,w.account)||b.to!==t.peer.id):(!sameAccount(b.from,t.peer)||b.to!==w.account.id)))fail('Saved transfer does not match its signed QR.');if(t.status!=='Pending'){const r=(await verify(t.receiptRaw)).body,expected=t.direction==='out'?t.peer:w.account;if(r.t!=='receipt'||!sameAccount(r.by,expected)||r.from!==b.from.id||r.to!==b.to||r.h!==p.hash||r.id!==t.id||r.c!==t.cents||r.m!==t.mode||r.decision!==(t.status==='Successful'?'accepted':'rejected'))fail('Saved receipt failed its ledger audit.');}}
    return true;
  }
  function available(w){return w.balance-w.transactions.filter(t=>t.direction==='out'&&t.status==='Pending').reduce((n,t)=>n+t.cents,0);}
  function capacity(w){if(w.transactions.length>=MAX_HISTORY)fail('Demo history limit reached. Existing receipts are kept for replay protection; no new transfer can be created.');}
  async function prepareOffer(w,receiverQR,value,mode,txid=id()){
    const receiver=await verify(receiverQR);if(receiver.body.t!=='account')fail('Scan the receiver’s Account QR first.');
    if(receiver.body.account.id===w.account.id)fail('You cannot pay your own demo account.');
    cents(value);if(value>available(w))fail('Insufficient available demo balance. Pending transfers reserve their amount.');
    const body={v:2,t:'offer',id:txid,from:w.account,to:receiver.body.account.id,c:value,u:'PKR',m:mode,at:new Date().toISOString()};
    const raw=await sign(body,w.privateKey),offer=await verify(raw);
    return freeze({offer,peer:receiver.body.account});
  }
  function sameAccount(a,b){return a.id===b.id&&a.k===b.k;}
  function addOutgoing(w,prepared){
    const {offer,peer}=prepared,b=offer.body;
    if(!sameAccount(b.from,w.account)||b.to!==peer.id)fail('Account changed. Review the payment again.');
    const old=w.transactions.find(t=>t.id===b.id);
    if(old){if(old.direction==='out'&&old.offerHash===offer.hash)return w;fail('Duplicate transaction ID conflicts with an existing record.');}
    capacity(w);if(b.c>available(w))fail('Insufficient available demo balance. Another pending transfer reserved funds.');
    const record={id:b.id,direction:'out',peer,cents:b.c,mode:b.m,time:b.at,status:'Pending',offerRaw:offer.raw,offerHash:offer.hash,receiptRaw:null};
    return {...w,transactions:[record,...w.transactions]};
  }
  async function prepareIncoming(w,raw,decision){
    const offer=await verify(raw),b=offer.body;
    if(b.t!=='offer'||b.to!==w.account.id)fail('This transfer is addressed to a different account. No balance changed.');
    if(!['accepted','rejected'].includes(decision))fail('Choose Accept or Reject.');
    const old=w.transactions.find(t=>t.id===b.id);
    if(old){if(old.direction==='in'&&old.offerHash===offer.hash){if(old.decision!==decision)fail('This transfer already has a final decision. Show its saved receipt.');return freeze({offer,receipt:await verify(old.receiptRaw)});}fail('Duplicate transaction ID has different payment details.');}
    const body={v:2,t:'receipt',id:b.id,from:b.from.id,to:w.account.id,c:b.c,u:'PKR',m:b.m,at:new Date().toISOString(),h:offer.hash,decision,by:w.account};
    return freeze({offer,receipt:await verify(await sign(body,w.privateKey))});
  }
  function addIncoming(w,prepared,resolvedPeer=prepared.offer.body.from){
    const {offer,receipt}=prepared,b=offer.body,r=receipt.body;
    if(b.to!==w.account.id||!sameAccount(r.by,w.account)||r.h!==offer.hash||r.id!==b.id)fail('Receipt does not match this account and transfer.');
    const old=w.transactions.find(t=>t.id===b.id);
    if(old){if(old.direction==='in'&&old.offerHash===offer.hash&&old.decision===r.decision)return w;fail('Duplicate transfer conflicts with the saved decision.');}
    capacity(w);const accepted=r.decision==='accepted';
    const balance=w.balance+(accepted?b.c:0);if(!Number.isSafeInteger(balance))fail('Demo balance limit reached.');
    if(!sameAccount(resolvedPeer,b.from))fail('Trusted sender record does not match the signing key.');
    const record={id:b.id,direction:'in',peer:resolvedPeer,cents:b.c,mode:b.m,time:b.at,status:accepted?'Successful':'Failed',decision:r.decision,offerRaw:offer.raw,offerHash:offer.hash,receiptRaw:receipt.raw};
    return {...w,balance,transactions:[record,...w.transactions]};
  }
  async function prepareReceipt(w,raw){
    const receipt=await verify(raw),r=receipt.body;if(r.t!=='receipt')fail('Scan the receiver’s receipt QR to finish this payment.');
    const old=w.transactions.find(t=>t.id===r.id&&t.direction==='out');if(!old)fail('No matching outgoing transaction exists on this account.');
    if(r.from!==w.account.id||r.to!==old.peer.id||!sameAccount(r.by,old.peer)||r.c!==old.cents||r.m!==old.mode||r.h!==old.offerHash)fail('Receipt does not match the receiver, amount or transaction. No balance changed.');
    return receipt;
  }
  function finishOutgoing(w,receipt){
    const r=receipt.body,old=w.transactions.find(t=>t.id===r.id&&t.direction==='out');
    if(!old||r.from!==w.account.id||r.to!==old.peer.id||r.by.k!==old.peer.k||r.c!==old.cents||r.h!==old.offerHash||r.m!==old.mode)fail('Receipt mismatch.');
    const status=r.decision==='accepted'?'Successful':'Failed';
    if(old.status!=='Pending'){if(old.status===status&&old.receiptRaw===receipt.raw)return w;fail('This payment already has a final receipt.');}
    const balance=w.balance-(status==='Successful'?old.cents:0);if(balance<0)fail('Local ledger is inconsistent. No receipt was applied.');
    return {...w,balance,transactions:w.transactions.map(t=>t.id===old.id?{...t,status,receiptRaw:receipt.raw}:t)};
  }
  const api={createWallet,renameWallet,validWallet,auditWallet,verify,prepareOffer,addOutgoing,prepareIncoming,addIncoming,prepareReceipt,finishOutgoing,available,amount,id,digest,MAX_HISTORY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SignalAccounts=api;
})(typeof window!=='undefined'?window:globalThis);
