const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/stick.js','utf8');
function setup(){
 const handlers={},moves=[];
 const c={press:null,preview:null,picked:{id:1},mode:'turn',state:[],knob:{style:{}},status:{},cancel:{},selectedLayer:null,previewDir:0,
 pad:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture(){},hasPointerCapture:()=>false},
 ready:()=>true,stickMoveFor:(s,x,y)=>Math.hypot(x,y)>=12?{face:'F',dir:y<0?-1:1}:null,updateGuide(){},B:{canRotate:()=>true},clearGuide:()=>{c.preview=null},userMove:(...args)=>moves.push(args)};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf(' function movePad('),src.indexOf(" addEventListener('blur'")),c);
 return {handlers,moves,c};
}
const event=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}});
for(const type of ['mouse','touch']){
 const {handlers,moves}=setup();handlers.pointerdown({...event(50,50),pointerType:type});handlers.pointerup({...event(50,20),pointerType:type});
 assert.equal(moves.length,1,type+': final release direction must work even if pointermove was omitted');
}
{
 const {handlers,moves}=setup();handlers.pointerdown(event(50,50));handlers.pointermove(event(50,20));handlers.pointerup(event(50,50));assert.equal(moves.length,0,'release at center cancels');
}
{
 const {handlers,moves}=setup();handlers.pointerdown(event(50,50));handlers.pointermove(event(50,20));handlers.pointercancel(event(50,20));assert.equal(moves.length,0,'interrupted gesture must never turn');
}
console.log('PASS: mouse/touch final release, center cancel and pointer cancellation');
