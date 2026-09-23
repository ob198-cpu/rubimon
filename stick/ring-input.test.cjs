const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine.js');
const src=fs.readFileSync(__dirname+'/stick.js','utf8');
const helpers=src.slice(src.indexOf('function stickMoveFor'),src.indexOf('(()=>{'));
for(const size of [3,4,5]){
 E.configure(size);
 const c={E,viewYaw:.7,viewPitch:.5,hitFaces:[],inside:()=>false,updateView(){},cubePoint:p=>{
  const sy=Math.sin(c.viewYaw),cy=Math.cos(c.viewYaw),sp=Math.sin(c.viewPitch),cp=Math.cos(c.viewPitch);
  return [358+E.dot(p,[cy,0,-sy])*46*3/size,530-E.dot(p,[-sy*sp,cp,-cy*sp])*46*3/size];
 }};
 vm.createContext(c);vm.runInContext(helpers,c);
 const ctx={save(){},restore(){},beginPath(){},closePath(){},createLinearGradient:()=>({addColorStop(){}}),moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},translate(){},rotate(){}};
 for(const sticker of E.create()){
  c.faceSelectedTile(sticker);
  const camera=[Math.sin(c.viewYaw)*Math.cos(c.viewPitch),Math.sin(c.viewPitch),Math.cos(c.viewYaw)*Math.cos(c.viewPitch)];
  assert.ok(E.dot(camera,sticker.n)>.99999,'selected face must face camera');
  const targets=c.drawRotationRings(ctx,sticker,null,0);assert.equal(targets.length,4);
  const origin=c.cubePoint(sticker.p);
  for(const t of targets){const m=c.stickMoveFor(sticker,(t.x-origin[0])*10,(t.y-origin[1])*10);assert.equal(m.face,t.face);assert.equal(m.dir,t.dir,'ring and trigger direction must agree')}
 }
}
for(const pointerType of ['mouse','touch']){
 for(const scenario of ['tap','cancel','drag','busy','locked','changed']){
  const handlers={},moves=[],ring={x:50,y:50,face:'F',dir:1};
  const c={canvas:{addEventListener:(n,f)=>handlers[n]=f,setPointerCapture(){},hasPointerCapture:()=>false},boardPress:null,tutorial:null,press:null,compactBoard:false,hitFaces:[],ringTargets:[ring],picked:{id:1},inside:()=>false,boardPointer:e=>[e.clientX,e.clientY],viewYaw:0,viewPitch:0,cancel:{},setMode(){},updateView(){},panelPick:null,ready:()=>true,state:[],B:{canRotate:()=>scenario!=='locked'},clearGuide(){},userMove:(...a)=>moves.push(a)};
  vm.createContext(c);vm.runInContext(src.slice(src.indexOf(" canvas.addEventListener('pointerdown'"),src.indexOf(' function movePad(')),c);
  const e=x=>({pointerType,button:0,pointerId:1,clientX:x,clientY:50,stopImmediatePropagation(){},preventDefault(){}});
  handlers.pointerdown(e(50));
  if(scenario==='cancel')handlers.pointercancel();
  if(scenario==='drag')handlers.pointermove(e(80));
  if(scenario==='busy')c.ready=()=>false;
  if(scenario==='changed')c.state=[1];
  handlers.pointerup(e(50));handlers.pointerup(e(50));
  assert.equal(moves.length,scenario==='tap'?1:0,pointerType+' '+scenario);
 }
}
console.log('PASS: all six faces align, ring/trigger directions agree at sizes 3/4/5; mouse/touch single turn, cancellation, busy/locked/stale guards');
