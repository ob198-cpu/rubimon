const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const variant=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
assert.equal(root.replace('<base href="./stick/">','').trim(),variant.trim(),'main URL loads the exact trigger version');
for(const [,asset] of root.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g))assert.ok(fs.existsSync(path.join(__dirname,asset.split('?')[0])),asset);
assert.ok(!fs.readFileSync(path.join(__dirname,'stick.js'),'utf8').includes('通常版へ'));
console.log('PASS: primary entry uses trigger version, assets exist, old version link removed');
