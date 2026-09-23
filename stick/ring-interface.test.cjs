const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./engine.js');
const src=fs.readFileSync(__dirname+'/ring-interface.js','utf8'),stick=fs.readFileSync(__dirname+'/stick.js','utf8');
const c={E,viewYaw:0,viewPitch:0,updateView(){},cubePoint:p=>{
 const sy=Math.sin(c.viewYaw),cy=Math.cos(c.viewYaw),sp=Math.sin(c.viewPitch),cp=Math.cos(c.viewPitch);
 return [E.dot(p,[cy,0,-sy])*50,-E.dot(p,[-sy*sp,cp,-cy*sp])*50];
}};vm.createContext(c);vm.runInContext(stick.slice(stick.indexOf('function stickMoveFor'),stick.indexOf('(()=>{')),c);vm.runInContext(src.slice(0,src.indexOf('(()=>{')),c);
let checks=0;
for(const size of [3,4,5]){E.configure(size);for(const tile of E.create()){
 c.faceSelectedTile(tile);
 for(const axis of ['row','column'])for(const [direction,vector] of Object.entries({up:[0,-30],down:[0,30],left:[-30,0],right:[30,0]})){
  const allowed=c.ringDirectionEnabled(axis,direction);assert.equal(allowed,axis==='row'?vector[0]!==0:vector[1]!==0);if(!allowed)continue;
  const move=c.stickMoveFor(tile,...vector),selected=c.ringSelectedMove(tile,axis);assert.equal(move.face,selected.face);
  const spec=E.slices[move.face],before=E.create(),after=structuredClone(before);E.move(after,move.face,move.dir);
  for(let i=0;i<before.length;i++)if(before[i].p[spec.axis]!==spec.layer)assert.deepEqual(after[i],before[i],'non-selected layer must stay stationary');
  const visible=before.filter(s=>s.n.every((v,i)=>v===tile.n[i])&&s.p[spec.axis]===spec.layer);assert.equal(visible.length,size,'one visible row/column only');
  const center=tile.n.map(v=>v*size/2),a=c.cubePoint(E.rotate(center,spec.axis,Math.sign(spec.layer||1)*move.dir*.01)),b=c.cubePoint(E.rotate(center,spec.axis,-Math.sign(spec.layer||1)*move.dir*.01));
  assert.ok((b[0]-a[0])*vector[0]+(b[1]-a[1])*vector[1]>0,'motion follows displayed direction');checks++;
 }
}}
for(const d of ['up','down','left','right'])assert.equal(c.ringDirectionEnabled(null,d),false);
assert.ok(src.includes('b.disabled=!(picked&&can&&ringDirectionEnabled'));
assert.ok(src.includes('adapter.move(b.dataset.direction)'));
assert.ok(!/E\.move\(|state\s*=|history\.(push|pop)/.test(src),'UI may not mutate board/history');
const css=fs.readFileSync(__dirname+'/ring-interface.css','utf8');assert.ok(css.includes('pointer-events:none'));assert.ok(css.includes('aspect-ratio:1'));assert.ok(css.includes('focus-visible'));assert.ok(css.includes('min-height:44px'));
for(const reduce of [false,true]){
 const a={picked:{id:1},press:null,queue:[],state:[],cancel:{click(){}},ready:()=>true,stickMoveFor:()=>({face:'F',dir:1}),B:{canRotate:()=>true},matchMedia:()=>({matches:reduce}),clearGuide(){}};
 a.userMove=(face,dir)=>{if(!a.queue.length)a.queue.push({face,dir,kind:'user'})};
 vm.createContext(a);vm.runInContext(stick.slice(stick.indexOf(' globalThis.ringControls='),stick.indexOf(" canvas.setAttribute('aria-label'")),a);
 assert.equal(a.ringControls.move('up'),true);assert.equal(a.queue.length,1);assert.equal(a.queue[0].duration,reduce?1:280);
 assert.equal(a.ringControls.move('up'),false,'no selection prevents a second input');assert.equal(a.queue.length,1);
 a.picked={id:1};a.ready=()=>false;assert.equal(a.ringControls.move('up'),false,'busy guard');
 a.ready=()=>true;a.B.canRotate=()=>false;assert.equal(a.ringControls.move('up'),false,'lock guard');
}
console.log('PASS: '+checks+' row/column directions across six faces and sizes 3/4/5; non-selected layers unchanged; UI gating and logic isolation');
