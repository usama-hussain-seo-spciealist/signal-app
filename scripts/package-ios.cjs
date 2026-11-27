'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Both native apps ship exactly the same existing wallet/protocol files.
require('./package-android.cjs');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'native-ios/www');fs.mkdirSync(destination,{recursive:true});fs.cpSync(path.join(root,'android/app/src/main/assets/www'),destination,{recursive:true});
const files=[];
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,entry.name);if(entry.isSymbolicLink())throw Error('Symlink in generated iOS assets');if(entry.isDirectory())walk(full);else{const relative=path.relative(destination,full).split(path.sep).join('/');if(relative==='bundle-manifest.json')continue;const data=fs.readFileSync(full);files.push({path:relative,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}}}
walk(destination);files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(path.join(destination,'bundle-manifest.json'),JSON.stringify({format:'signalpay-bundled-assets',v:1,files},null,2)+'\n');
console.log('Bundled shared offline wallet assets for native iOS. No remote wallet code.');
