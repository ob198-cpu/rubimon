const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine.js');
const src=fs.readFileSync(__dirname+'/stick.js','utf8'),fn=src.slice(src.indexOf('function stickMoveFor'),src.indexOf('(()=>{'));
assert.ok(!src.includes('stickMoveFor(picked,30,0)'), 'panel selection must not invent a horizontal preview');
assert.ok(!src.includes("press.mode==='view'"),'stick must not control camera');
{
 const handlers={};
 const c={canvas:{addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}},boardPress:null,tutorial:null,press:null,compactBoard:false,hitFaces:[{points:[]}],inside:()=>true,boardPointer:()=>[0,0],viewYaw:0,viewPitch:0,picked:null,cancel:{hidden:true},setMode(){},updateView(){},panelPick:null,ready:()=>false};
 vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf(" canvas.addEventListener('pointerdown'"),src.indexOf(' function movePad(')),c);
 const e=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,stopImmediatePropagation(){},preventDefault(){}});
 for(const [dx,dy] of [[0,30],[30,0],[0,-30],[-30,0]]){
  const yaw=c.viewYaw,pitch=c.viewPitch;handlers.pointerdown(e(100,100));handlers.pointermove(e(100+dx,100+dy));handlers.pointerup(e(100+dx,100+dy));
  assert.equal(c.boardPress,null);assert.equal(c.viewYaw,yaw-dx*.009);assert.equal(c.viewPitch,pitch+dy*.009);assert.equal(c.picked,null,'drag must not select panel');
 }
 handlers.pointerdown(e(100,100));handlers.pointercancel();assert.equal(c.boardPress,null);
}
let cases=0;
// Up/down on either upright side must select a vertical column, including corners.
{
 const c={E,cubePoint:p=>[358+E.dot(p,[.762,0,-.648])*46,530-E.dot(p,[-.311,.879,-.366])*46]};
 vm.createContext(c);vm.runInContext(fn,c);
 for(const s of E.create().filter(s=>s.n[0]===1||s.n[2]===1)){
  for(const dy of [-30,30]){const m=c.stickMoveFor(s,0,dy);assert.notEqual(E.slices[m.face].axis,1,'up/down selected horizontal row at '+JSON.stringify(s.p));}
  for(const dx of [-30,30]){const m=c.stickMoveFor(s,dx,0);assert.equal(E.slices[m.face].axis,1,'left/right must select horizontal row');}
 }
}
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
