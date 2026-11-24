(function(root){
  'use strict';
  function openStore(indexedDB){
    const ready=new Promise((resolve,reject)=>{const request=indexedDB.open('signalpay-accounts-v2',1);request.onupgradeneeded=()=>request.result.createObjectStore('wallet');request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};request.onerror=()=>reject(new Error('Persistent account storage is unavailable. Enable site storage; no temporary account will be used.'));request.onblocked=()=>reject(new Error('Close other SignalPay tabs and reopen to finish the storage update.'));});
    async function read(){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('wallet','readonly'),r=tx.objectStore('wallet').get('primary');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async function update(change){const db=await ready;return new Promise((resolve,reject)=>{
      const tx=db.transaction('wallet','readwrite'),store=tx.objectStore('wallet'),r=store.get('primary');let next,error;
      r.onsuccess=()=>{try{next=change(r.result);if(next&&typeof next.then==='function')throw Error('Storage updates must be synchronous.');store.put(next,'primary');}catch(e){error=e;tx.abort();}};
      tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error||tx.error||new Error('Account could not be saved. No completed payment has been shown.'));tx.onerror=()=>{};
    });}
    return {read,update};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={openStore};else root.SignalAccountStore={openStore};
})(typeof window!=='undefined'?window:globalThis);
