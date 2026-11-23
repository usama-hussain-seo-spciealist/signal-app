const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const S=require('./scanner.js'), jsQR=require('./jsQR.js'), D=require('./core.js');
const {fixtures,readPNG}=require('./scripts/qr-fixtures.cjs');
for(const f of fixtures) test('actual PNG decodes exact payload: '+f.name,()=>{const p=readPNG(fs.readFileSync(__dirname+'/test-qrs/'+f.name+'.png'));assert.equal(jsQR(p.data,p.width,p.height).data,f.raw);});
test('Rs 100 QR contains a fictional receiver and bounded amount',()=>{assert.deepEqual(D.parsePaymentQR(fixtures[1].raw),{recipient:'chai',currency:'PKR',cents:10000}); for(const raw of ['signalpay-demo:v2:chai:PKR:0.00','signalpay-demo:v2:chai:USD:100.00','signalpay-demo:v2:bank:PKR:100.00',fixtures[1].raw+'\n'])assert.throws(()=>D.parsePaymentQR(raw));});
function harness(overrides={}) {
 const pixels=readPNG(fs.readFileSync(__dirname+'/test-qrs/simple.png')), listeners={}, queue=[], statuses=[], results=[];
 const track={stops:0,stop(){this.stops++},addEventListener:(name,fn)=>listeners[name]=fn};
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const video={readyState:2,videoWidth:pixels.width,videoHeight:pixels.height,setAttribute(){},async play(){}};
 const ctx={drawImage(){},getImageData:()=>pixels}; const canvas={width:pixels.width,height:pixels.height,getContext:()=>ctx};
 const camera=S.createCamera({video,canvas,media:{getUserMedia:async()=>stream},decoder:jsQR,status:s=>statuses.push(s),preview(){},result:(...args)=>results.push(args),later:f=>{queue.push(f);return f},cancel:f=>{const i=queue.indexOf(f);if(i>=0)queue.splice(i,1)},...overrides});
 return {camera,track,stream,video,ctx,listeners,queue,statuses,results};
}
test('camera decodes generic text, stops tracks and delivers result once',async()=>{const h=harness();await h.camera.start();assert.deepEqual(h.results,[['SIGNALPAY-TEST-123','Camera']]);assert.equal(h.track.stops,1);assert.equal(h.video.srcObject,null);assert.equal(h.queue.length,0);});
test('blank video waits for frames then decodes without restarting camera',async()=>{const h=harness();h.video.readyState=0;await h.camera.start();assert.equal(h.results.length,0);h.video.readyState=2;h.queue.shift()();assert.equal(h.results[0][0],fixtures[0].raw);});
test('transient frame errors retry; repeated errors report visibly and stop',async()=>{const h=harness();let failures=0;h.ctx.drawImage=()=>{if(++failures===1)throw Error('interrupted')};await h.camera.start();assert.equal(h.queue.length,1);h.queue.shift()();assert.equal(h.results.length,1);const bad=harness();bad.ctx.drawImage=()=>{throw Error('bad frame')};await bad.camera.start();for(let i=0;i<4;i++)bad.queue.shift()();assert.match(bad.statuses.at(-1),/could not be decoded/);assert.equal(bad.track.stops,1);});
test('permission error and ended camera have actionable messages',async()=>{const h=harness({media:{getUserMedia:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'})}}});await h.camera.start();assert.match(h.statuses.at(-1),/permission was denied/);const ended=harness();ended.video.readyState=0;await ended.camera.start();ended.listeners.ended();assert.match(ended.statuses.at(-1),/access ended/);assert.equal(ended.queue.length,0);});
test('stopping while permission is pending cancels late stream without result',async()=>{let resolve;const h=harness({media:{getUserMedia:()=>new Promise(r=>resolve=r)}});const work=h.camera.start();h.camera.stop();resolve(h.stream);await work;assert.equal(h.results.length,0);assert.equal(h.track.stops,1);assert.equal(h.video.srcObject,null);});
test('no-code guidance leaves scanning active',async()=>{const h=harness({decoder:()=>null});await h.camera.start();for(let i=0;i<59;i++)h.queue.shift()();assert.match(h.statuses.at(-1),/No readable QR yet/);assert.equal(h.track.stops,0);assert.equal(h.queue.length,1);h.camera.stop();});
