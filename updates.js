(function(root){
 'use strict';
 const CURRENT='3.2.1',BASE='https://usama-hussain-seo-spciealist.github.io/signal-app/';
 function version(value){if(typeof value!=='string'||!/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value))throw Error('Invalid update version.');return value.split('.').map(Number);}
 function compare(a,b){const x=version(a),y=version(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;}
 function validateRelease(release){
  if(!release||typeof release!=='object')throw Error('Update details are unavailable.');version(release.version);
  const url='https://github.com/usama-hussain-seo-spciealist/signal-app/releases/download/android-v'+release.version+'/SignalPay-demo-'+release.version+'.apk';
  if(release.verified!==true||release.url!==url||!/^[a-f0-9]{64}$/.test(release.sha256)||!Number.isSafeInteger(release.bytes)||release.bytes<1000||release.bytes>100000000)throw Error('Update release has not been verified.');
  return Object.freeze({version:release.version,url,sha256:release.sha256,bytes:release.bytes});
 }
 function mount(win){
  const doc=win.document,$=id=>doc.getElementById(id);if(!$('openUpdates'))return;
  const native=win.SignalUpdater,isAPK=win.location.hostname==='appassets.androidplatform.net'||!!native;
  let busy=false,sequence=0,pending=null;
  $('installedVersion').textContent=CURRENT;
  if(native)native.onmessage=event=>{try{const data=JSON.parse(event.data);if(pending&&data.requestId===pending.id){const p=pending;pending=null;win.clearTimeout(p.timer);data.ok?p.resolve(data):p.reject(Error('Update check unavailable. Connect to the internet and try again.'));}}catch(_){if(pending){const p=pending;pending=null;win.clearTimeout(p.timer);p.reject(Error('Invalid update response.'));}}};
  function nativeCheck(){return new Promise((resolve,reject)=>{if(!native){reject(Error('This Android version cannot check updates here. Use Installation instructions below.'));return;}const id=String(++sequence),timer=win.setTimeout(()=>{if(pending&&pending.id===id){pending=null;reject(Error('Update check timed out. Connect to the internet and try again.'));}},15000);pending={id,timer,resolve,reject};try{native.postMessage(JSON.stringify({action:'check',requestId:id}));}catch(error){pending=null;win.clearTimeout(timer);reject(error);}});}
  async function json(url){const controller=new win.AbortController(),timer=win.setTimeout(()=>controller.abort(),12000);try{const response=await win.fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw Error('Update service unavailable. Connect to the internet and try again.');return await response.json();}finally{win.clearTimeout(timer);}}
  async function check(){
   if(busy)return;busy=true;$('checkUpdates').disabled=true;$('updateAPK').hidden=true;$('updateAPK').removeAttribute('href');$('refreshApp').hidden=true;$('updateChecksum').textContent='';$('latestVersion').textContent='Checking…';$('updateStatus').textContent='Checking for an update. Internet is required.';
   try{
    if(isAPK){const data=await nativeCheck(),installed=String(data.currentVersion).replace(/-debug$/,'');version(installed);const release=validateRelease(data.release);$('installedVersion').textContent=installed;$('latestVersion').textContent=release.version;
     if(compare(release.version,installed)>0){$('updateAPK').href=release.url;$('updateAPK').hidden=false;$('updateChecksum').textContent='SHA-256: '+release.sha256;$('updateStatus').textContent='Update v'+release.version+' is available. Tap Update app to download it, then follow Android’s installation confirmation. Install over this app to keep your saved accounts and history.';}
     else $('updateStatus').textContent=compare(release.version,installed)===0?'You’re up to date. No newer Android APK is available.':'This installation is newer than the latest published APK. No downgrade is offered.';
    }else{const release=await json(new URL('app-version.json',win.location.href).href);version(release.version);$('latestVersion').textContent=release.version;
     if(compare(release.version,CURRENT)>0){if('serviceWorker'in win.navigator){const registration=await win.navigator.serviceWorker.getRegistration('./');if(registration)await registration.update();}$('refreshApp').hidden=false;$('updateStatus').textContent='A new web app version is available. Tap Update web app to reopen it online. Your saved accounts and history stay on this installation; unsaved forms will close.';}
     else $('updateStatus').textContent='Your web app is up to date. Android APK installation instructions are available below.';
    }
   }catch(error){$('latestVersion').textContent='Unavailable';$('updateStatus').textContent='Update check unavailable. Connect to the internet and try again. '+((error&&error.message)||'');}
   finally{busy=false;$('checkUpdates').disabled=false;}
  }
  $('openUpdates').addEventListener('click',()=>{$('updatesDialog').showModal();check();});$('closeUpdates').addEventListener('click',()=>$('updatesDialog').close());$('checkUpdates').addEventListener('click',check);$('refreshApp').addEventListener('click',()=>win.location.reload());
  $('updateInstallHelp').href=BASE+'install.html';
 }
 const api={CURRENT,version,compare,validateRelease,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.SignalUpdates=api;mount(root);}
})(typeof window!=='undefined'?window:globalThis);
