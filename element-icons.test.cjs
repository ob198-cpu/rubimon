const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let image;class ImageMock{constructor(){image=this;this.complete=false;this.naturalWidth=0}}
const c={Image:ImageMock};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/portraits.js','utf8'),c);
const draws=[],clears=[];
const ctx=new Proxy({canvas:{id:'portrait'},drawImage:(...a)=>draws.push(a),clearRect:(...a)=>clears.push(a),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
c.drawSpirit(ctx,'B',40,40,31);assert.equal(draws.length,0);
image.complete=true;image.naturalWidth=image.naturalHeight=1254;image.onload();
assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(1),[418,0,418,418,9,9,62,62]);assert.equal(clears.length,1);
for(const [key,col,row] of [['R',0,0],['B',1,0],['F',2,0],['L',0,1],['U',1,1],['I',2,1],['H',0,2],['V',1,2],['P',2,2]]){
 c.drawSpirit(ctx,key,100,100,20);assert.deepEqual(draws.at(-1).slice(1),[col*418,row*418,418,418,80,80,40,40]);
}
const count=draws.length;for(const key of ['D','M','J','X'])c.drawSpirit(ctx,key,20,20,10);assert.equal(draws.length,count);
console.log('PASS: nine sprite mappings, unchanged icon bounds, asynchronous portrait refresh, four fallback glyphs');
