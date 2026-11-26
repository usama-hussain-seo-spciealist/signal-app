(function(root){
 'use strict';
 function create({bridge,status,preview,result}){
  let serial=0,active=null;
  function stop(){active=null;serial++;preview(false);bridge.postMessage(JSON.stringify({action:'stop'}));}
  function start(){stop();active=String(++serial);status('Opening native iPhone camera. Allow camera access if prompted.');preview(true);bridge.postMessage(JSON.stringify({action:'scan',requestId:active}));}
  bridge.onmessage=event=>{let e;try{e=JSON.parse(event.data);}catch(_){stop();status('Native camera returned an invalid response. Retry or upload a QR image.');return;}if(!active||e.requestId!==active)return;active=null;preview(false);if(e.type==='result'&&typeof e.raw==='string'&&e.raw.length<=8192){status('QR data read. Checking the signed account.');result(e.raw,'Native iOS camera');}else status(e.type==='cancelled'?'Camera cancelled. You can retry or upload a QR image.':e.error||'Camera could not read a QR. Retry or upload an image.');};
  return {start,stop};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.SignalNativeScanner={create};
})(typeof window!=='undefined'?window:globalThis);
