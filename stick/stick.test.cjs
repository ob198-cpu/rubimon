const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine.js');
const src=fs.readFileSync(__dirname+'/stick.js','utf8'),fn=src.slice(src.indexOf('function stickMoveFor'),src.indexOf('(()=>{'));
let cases=0;
for(const size of [3,4,5]){
 E.configure(size);
 for(const yaw of [.1,.7,1.6,3,4.7])for(const pitch of [-1.1,.2,1.1]){
  const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],camera=[sy*cp,sp,cy*cp];
  const cubePoint=p=>[358+E.dot(p,right)*46,530-E.dot(p,up)*46],c={E,cubePoint};vm.createContext(c);vm.runInContext(fn,c);
  for(const s of E.create().filter(s=>E.dot(s.n,camera)>.05))for(const [dx,dy] of [[30,0],[-30,0],[0,30],[0,-30]]){
   const move=c.stickMoveFor(s,dx,dy);if(!move)continue;
   const spec=E.slices[move.face];assert.equal(s.p[spec.axis],spec.layer);assert.equal(s.n[spec.axis],0);
   const opposite=c.stickMoveFor(s,-dx,-dy);assert.ok(opposite);assert.equal(opposite.face,move.face);assert.equal(opposite.dir,-move.dir);cases++;
  }
  assert.equal(c.stickMoveFor(E.create()[0],2,2),null,'dead zone must cancel');
 }
}
// No dependency on parent code/assets: normal URL can evolve independently.
const html=fs.readFileSync(__dirname+'/index.html','utf8');assert.ok(!/src="\.\.\//.test(html));
const lobby=fs.readFileSync(__dirname+'/lobby.js','utf8');assert.ok(lobby.includes('rubimon.stick.collection.v1'));
console.log('PASS: '+cases+' view-relative stick directions across 3/4/5 cubes; inverse, dead zone, isolated assets/save');
