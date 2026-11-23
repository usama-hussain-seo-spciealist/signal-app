'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const qrcode = require('../qrcode.js');
const fixtures = [{ name: 'simple', raw: 'SIGNALPAY-TEST-123' }, { name: 'payment-100', raw: 'signalpay-demo:v2:chai:PKR:100.00' }];
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
function png(raw) {
  const qr = qrcode(0, 'M'); qr.addData(raw); qr.make(); const n = qr.getModuleCount(), scale = 12, size = (n + 8) * scale;
  const rows = Buffer.alloc((size * 4 + 1) * size, 255);
  for (let y = 0; y < size; y++) { rows[y * (size * 4 + 1)] = 0; for (let x = 0; x < size; x++) { const r = Math.floor(y / scale) - 4, c = Math.floor(x / scale) - 4; if (r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r,c)) { const offset = y * (size * 4 + 1) + 1 + x * 4; rows[offset] = rows[offset+1] = rows[offset+2] = 0; } } }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
// Strict reader for the RGBA8/no-filter fixtures above; no browser or external codec is mocked.
function readPNG(bytes) {
  if (bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Not PNG');
  let offset=8, width, height; const parts=[];
  while(offset<bytes.length) { const length=bytes.readUInt32BE(offset), type=bytes.subarray(offset+4,offset+8).toString(), data=bytes.subarray(offset+8,offset+8+length); if(crc32(Buffer.concat([Buffer.from(type),data]))!==bytes.readUInt32BE(offset+8+length)) throw new Error('PNG CRC mismatch'); if(type==='IHDR') {width=data.readUInt32BE(0);height=data.readUInt32BE(4); if(data[8]!==8||data[9]!==6)throw new Error('Unsupported PNG');} if(type==='IDAT')parts.push(data); offset+=length+12; }
  const rows=zlib.inflateSync(Buffer.concat(parts)), pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++){const start=y*(width*4+1);if(rows[start]!==0)throw new Error('Unexpected PNG filter');pixels.set(rows.subarray(start+1,start+1+width*4),y*width*4);}
  return { data:pixels,width,height };
}
if (require.main === module) { const target=path.join(__dirname,'../test-qrs'); fs.mkdirSync(target,{recursive:true}); for(const f of fixtures) fs.writeFileSync(path.join(target,f.name+'.png'),png(f.raw)); fs.writeFileSync(path.join(target,'payloads.json'),JSON.stringify(fixtures,null,2)+'\n'); console.log('Generated two test PNGs.'); }
module.exports={fixtures,readPNG,png};
