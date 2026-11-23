const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('verified APK metadata refreshes online and falls back to cached copy offline',async()=>{
 const scope='https://example.github.io/signal-app/',url=scope+'android-release.json',handlers={},store=new Map([[url,new Response('{"version":"1.2.0"}')]]);let online=true;
 const caches={open:async()=>({match:async request=>store.get(request.url),put:async(request,response)=>store.set(request.url,response)})};
 vm.runInNewContext(fs.readFileSync(__dirname+'/sw.js','utf8'),{self:{location:{href:scope+'sw.js'},addEventListener:(name,fn)=>handlers[name]=fn},caches,URL,fetch:async()=>{if(!online)throw Error('offline');return new Response('{"version":"1.3.0"}');}});
 let response;const event={request:{url,method:'GET'},respondWith:p=>response=p};handlers.fetch(event);assert.equal((await(await response).json()).version,'1.3.0');online=false;handlers.fetch(event);assert.equal((await(await response).json()).version,'1.3.0');
});
