/* Local demo PIN vault; no OTP, central identity or bank authentication provider. */
(function(root){
 'use strict';
 const iterations=600000,enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
 const subtle=()=>crypto.subtle;
 const b64=b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s);};
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const fail=s=>{throw new Error(s);};
 function phone(value){let s=String(value).replace(/[\s()-]/g,'');if(/^03\d{9}$/.test(s))s='+92'+s.slice(1);if(/^3\d{9}$/.test(s))s='+92'+s;if(!/^\+923\d{9}$/.test(s))fail('Enter a valid Pakistani mobile number, for example +92 3XX XXXXXXX.');return s;}
 function validateName(value){const s=String(value).trim();if(s.length<2||s.length>40||/[\u0000-\u001f\u007f]/.test(s))fail('Enter your full name using 2–40 characters.');return s;}
 function pin(value){if(typeof value!=='string'||!/^\d{8,12}$/.test(value)||/^(\d)\1+$/.test(value)||['12345678','87654321','01234567','123456789','1234567890'].includes(value))fail('Choose an 8–12 digit PIN. Avoid repeated or sequential digits.');return value;}
 async function phoneHash(value){const result=await subtle().digest('SHA-256',enc.encode(phone(value)));return Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');}
 async function derive(value,salt){const material=await subtle().importKey('raw',enc.encode(value),'PBKDF2',false,['deriveKey']);return subtle().deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 const aad=r=>enc.encode('signalpay-vault:3:'+r.id+':'+r.phoneHash+':'+r.revision);
 async function seal(payload,key,header){const iv=crypto.getRandomValues(new Uint8Array(12));return {...header,iv:b64(iv),ciphertext:b64(await subtle().encrypt({name:'AES-GCM',iv,additionalData:aad(header)},key,enc.encode(JSON.stringify(payload))))};}
 async function open(record,key){try{return JSON.parse(dec.decode(await subtle().decrypt({name:'AES-GCM',iv:bytes(record.iv),additionalData:aad(record)},key,bytes(record.ciphertext))));}catch(_){fail('Mobile number or PIN is incorrect, or this vault is damaged.');}}
 async function serializeWallet(wallet){const privateKey=b64(await subtle().exportKey('pkcs8',wallet.privateKey));const {privateKey:ignored,...data}=wallet;return {data,key:privateKey};}
 async function restoreWallet(serialized){const privateKey=await subtle().importKey('pkcs8',bytes(serialized.key),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);return {...serialized.data,privateKey};}
 function replaceWallet(payload,wallet){const {privateKey,...data}=wallet;return {...payload,profile:{...payload.profile,fullName:wallet.account.n},wallet:{data,key:payload.wallet.key}};}
 const api={iterations,phone,pin,validateName,phoneHash,derive,seal,open,serializeWallet,restoreWallet,replaceWallet,randomSalt:()=>b64(crypto.getRandomValues(new Uint8Array(16))),maskId:id=>id.slice(0,6)+'••••••'+id.slice(-6),maskPhone:value=>'+92 ••• ••• '+phone(value).slice(-4)};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SignalAuthCrypto=api;
})(typeof window!=='undefined'?window:globalThis);
