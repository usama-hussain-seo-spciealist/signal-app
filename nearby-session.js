/* Experimental foreground peer protocol. Key authentication is not verified human identity or funds. */
(function(root){
 'use strict';
 const A=typeof module!=='undefined'&&module.exports?require('./account-core.js'):root.SignalAccounts;
 const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true}),PREFIX='spn1:',LIFETIME=120000;
 const cryptoAPI=()=>globalThis.crypto;
 function b64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function bytes(s){if(typeof s!=='string'||!s.length||s.length%4===1||!/^[\w-]+$/.test(s))throw Error('Invalid nearby encoding.');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
 function exact(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join(',')!==keys.split(',').sort().join(','))throw Error('Malformed nearby message.');}
 const random=()=>b64(cryptoAPI().getRandomValues(new Uint8Array(16)));
 function serviceUUID(id){if(!/^SP-[a-f0-9]{32}$/.test(id))throw Error('Invalid nearby account ID.');const h=id.slice(3);return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
 async function ephemeral(){const pair=await cryptoAPI().subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);return {privateKey:pair.privateKey,publicKey:b64(await cryptoAPI().subtle.exportKey('raw',pair.publicKey))};}
 async function sign(body,w){const data=enc.encode(JSON.stringify(body)),sig=await cryptoAPI().subtle.sign({name:'ECDSA',hash:'SHA-256'},w.privateKey,data);return PREFIX+b64(data)+'.'+b64(sig);}
 async function verify(raw,role){
  if(typeof raw!=='string'||raw.length>8192||!raw.startsWith(PREFIX))throw Error('Invalid nearby handshake.');const parts=raw.slice(PREFIX.length).split('.');if(parts.length!==2)throw Error('Incomplete nearby handshake.');
  const data=bytes(parts[0]),sig=bytes(parts[1]),body=JSON.parse(dec.decode(data));exact(body,role==='receiver'?'v,t,sid,qr,ephemeral,nonce':'v,t,sid,helloHash,qr,ephemeral,nonce');
  if(body.v!==1||body.t!==role||bytes(body.sid).length!==16||bytes(body.nonce).length!==16||bytes(body.ephemeral).length!==65)throw Error('Unsupported nearby handshake.');
  const account=await A.verify(body.qr);if(account.body.t!=='account')throw Error('Nearby peer has no signed account card.');
  const key=await cryptoAPI().subtle.importKey('raw',bytes(account.body.account.k),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);if(sig.length!==64||!await cryptoAPI().subtle.verify({name:'ECDSA',hash:'SHA-256'},key,sig,data))throw Error('Nearby handshake signature failed.');
  return {body,account:account.body.account,raw};
 }
 async function channel(pair,remote,receiverRaw,senderRaw,role,sid){
  const remoteKey=await cryptoAPI().subtle.importKey('raw',bytes(remote),{name:'ECDH',namedCurve:'P-256'},false,[]),shared=await cryptoAPI().subtle.deriveBits({name:'ECDH',public:remoteKey},pair.privateKey,256);
  const base=await cryptoAPI().subtle.importKey('raw',shared,'HKDF',false,['deriveKey']),salt=await cryptoAPI().subtle.digest('SHA-256',enc.encode(receiverRaw+'|'+senderRaw));
  const key=direction=>cryptoAPI().subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,info:enc.encode('SignalPay Nearby v1|'+sid+'|'+direction)},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const out=role==='sender'?'s2r':'r2s',input=role==='sender'?'r2s':'s2r';let sendKey=await key(out),receiveKey=await key(input),sent=0,received=0,closed=false;const deadline=Date.now()+LIFETIME;
  const alive=()=>{if(closed||Date.now()>deadline)throw Error('Nearby session expired or disconnected. Reconnect and retry the same transaction.');};
  function iv(seq){const v=new Uint8Array(12);new DataView(v.buffer).setUint32(8,seq,false);return v;}
  const aad=(direction,seq)=>enc.encode('spn1|'+sid+'|'+direction+'|'+seq);
  return {
   async seal(message){alive();if(typeof message!=='string'||enc.encode(message).length>3000||sent>=1000000)throw Error('Nearby message limit reached.');const seq=++sent,ciphertext=await cryptoAPI().subtle.encrypt({name:'AES-GCM',iv:iv(seq),additionalData:aad(out,seq)},sendKey,enc.encode(message));alive();return JSON.stringify({v:1,t:'box',sid,seq,c:b64(ciphertext)});},
   async open(raw){alive();if(typeof raw!=='string'||raw.length>8192)throw Error('Nearby envelope too large.');const b=JSON.parse(raw);exact(b,'v,t,sid,seq,c');if(b.v!==1||b.t!=='box'||b.sid!==sid||!Number.isSafeInteger(b.seq)||b.seq!==received+1||b.seq>1000000)throw Error('Nearby replay, sequence gap or wrong session.');const plain=await cryptoAPI().subtle.decrypt({name:'AES-GCM',iv:iv(b.seq),additionalData:aad(input,b.seq)},receiveKey,bytes(b.c));alive();const text=dec.decode(plain);if(enc.encode(text).length>3000)throw Error('Nearby plaintext too large.');received=b.seq;return text;},
   close(){closed=true;sendKey=null;receiveKey=null;}
  };
 }
 async function receiver(wallet){
  const pair=await ephemeral(),sid=random(),hello=await sign({v:1,t:'receiver',sid,qr:wallet.accountQR,ephemeral:pair.publicKey,nonce:random()},wallet),deadline=Date.now()+LIFETIME;let used=false;
  return {hello,async finish(raw){if(used||Date.now()>deadline)throw Error('Nearby handshake expired or already used.');used=true;const p=await verify(raw,'sender');if(p.body.sid!==sid||p.body.helloHash!==await A.digest(hello)||p.account.id===wallet.account.id)throw Error('Nearby sender/session mismatch.');return {peer:p.account,channel:await channel(pair,p.body.ephemeral,hello,raw,'receiver',sid)};}};
 }
 async function sender(wallet,receiverQR,hello){
  const expected=await A.verify(receiverQR),p=await verify(hello,'receiver');if(expected.body.t!=='account'||expected.body.account.id!==p.account.id||expected.body.account.k!==p.account.k||p.account.id===wallet.account.id)throw Error('Nearby device does not match the scanned receiver.');
  const pair=await ephemeral(),reply=await sign({v:1,t:'sender',sid:p.body.sid,helloHash:await A.digest(hello),qr:wallet.accountQR,ephemeral:pair.publicKey,nonce:random()},wallet);
  return {reply,peer:p.account,channel:await channel(pair,p.body.ephemeral,hello,reply,'sender',p.body.sid)};
 }
 const api={receiver,sender,serviceUUID,verify,LIFETIME};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SignalNearbySession=api;
})(typeof window!=='undefined'?window:globalThis);
