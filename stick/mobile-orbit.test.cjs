const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const media={matches:true},context={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},fillText(){}},map={style:{},setAttribute(){},getContext:()=>context,getBoundingClientRect:()=>({left:10,top:20,width:442,height:425})};
let target;
const c={document:{createElement:()=>map},canvas:{before(){}},matchMedia:()=>media,orbitExpanded:false,compactBoard:true,devicePixelRatio:2,E:{layers:()=>[-1,0,1],radius:l=>115-l*28},boardViewport:()=>({w:600,h:740}),resize(){},drawOrbits:(a,ctx)=>{target=ctx}};
const E=require('./engine.js');E.setOrbitSpacing(28);c.E=E;c.state=E.create();c.camera=[0,0,1];
vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/mobile-orbit.js','utf8'),c);
for(const size of [3,4,5]){
 E.configure(size);const board=E.create();E.move(board,'R',1);E.move(board,'U',-1);
 for(const [face,f] of Object.entries(E.faces)){
  const eye=[0,0,0];eye[f.axis]=Math.sign(f.layer);
  const front=c.orbitFrontFace(E,board,eye);
  assert.equal(front.face,face);assert.equal(front.points.length,size*size);
  assert.ok(c.orbitFaceOutline(front.points).length>=4);
 }
}
E.configure(3);
assert.equal(map.hidden,true);assert.equal(c.boardViewport().w,600);assert.equal(c.mobileOrbitSource([0,0]),null);
c.orbitExpanded=true;c.resize();assert.equal(map.hidden,false);assert.equal(c.boardViewport().w,320);assert.equal(map.width,884);assert.equal(map.height,850);c.drawOrbits(0);assert.equal(target,context);
assert.deepEqual(Array.from(c.mobileOrbitSource([79,-23])),[10,20]);
media.matches=false;c.compactBoard=false;c.resize();assert.equal(map.hidden,false);assert.equal(c.boardViewport().w,352);c.drawOrbits(0);assert.equal(target,context);
c.orbitExpanded=false;c.resize();assert.equal(map.hidden,true);assert.equal(c.boardViewport().w,600);c.drawOrbits(0);assert.equal(target,undefined);
console.log('PASS: mobile split map bounds/context, closed and desktop fallback, attack source mapping');
