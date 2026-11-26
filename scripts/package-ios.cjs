'use strict';
const fs=require('node:fs'),path=require('node:path');
// Both native apps ship exactly the same existing wallet/protocol files.
require('./package-android.cjs');
const root=path.resolve(__dirname,'..'),destination=path.join(root,'native-ios/www');fs.mkdirSync(destination,{recursive:true});fs.cpSync(path.join(root,'android/app/src/main/assets/www'),destination,{recursive:true});
console.log('Bundled shared offline wallet assets for native iOS. No remote wallet code.');
