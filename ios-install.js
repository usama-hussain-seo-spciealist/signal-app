(function(root){
 'use strict';
 function validate(release){
  if(!release||release.buildVerified!==true||release.signedForDevice!==false||release.signingRequired!==true||release.physicalDeviceTested!==false||!/^\d+\.\d+\.\d+$/.test(release.version)||!/^[a-f0-9]{64}$/.test(release.sha256)||!Number.isSafeInteger(release.bytes)||release.bytes<1000||release.bytes>100000000)throw Error('iOS signing package has not been verified.');
  const exact='https://github.com/usama-hussain-seo-spciealist/signal-app/releases/download/ios-v'+release.version+'/SignalPay-demo-ios-'+release.version+'-unsigned.ipa';if(release.url!==exact)throw Error('Unsupported iOS download URL.');return release;
 }
 function mount(win){const link=win.document.getElementById('downloadIOSPackage'),status=win.document.getElementById('iosPackageStatus');if(!link||!status)return;win.fetch('./ios-release.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{const r=validate(data);link.href=r.url;link.hidden=false;status.textContent='v'+r.version+' iPhoneOS build and simulator checks verified. Apple signing is still required before installation. Physical iPhone/Android Bluetooth testing is unverified.';}).catch(()=>{link.hidden=true;status.textContent='Verified iOS signing package is not available here yet. See signing requirements. Safari home-screen installation does not add native Bluetooth.';});}
 const api={validate,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.SignalIOSInstall=api;mount(root);}
})(typeof window!=='undefined'?window:globalThis);
