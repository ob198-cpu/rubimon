const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const choose=source.slice(source.indexOf('function chooseMove('),source.indexOf('function boardClick('));
const sync=source.slice(source.indexOf('function syncArrowButtons('),source.indexOf('function placeCubeTouch('));
const elements=[];
const c={panelPick:null,arrowsUnlocked:true,tutorial:null,active:null,queue:[],phase:'ready',turnMoves:0,turnLimit:3,pendingMove:null,selectedLayer:null,hoverLayer:null,previewDir:0,state:[],suppressCubeClick:false,mousePrimary:false,compactBoard:true,arrowButtons:new Map(),arrowHits:[],canvas:{clientWidth:460,clientHeight:448,offsetLeft:8,offsetTop:40},boardViewport:()=>({w:460,h:448,x:70,y:394}),arrowButtonLayer:{append:b=>elements.push(b)},B:{canRotate:()=>true},E:{slices:{F:{name:'前'},R:{name:'右'}}},dragHint:{classList:{contains:()=>true,remove(){},add(){}},innerHTML:''},secondTapHintMarkup:'',requestAnimationFrame:()=>{},placeCubeTouch(){},byId:()=>({textContent:''}),updateGuide(){},finishArrowOnboarding(){},rotations:0};
c.selectLayer=face=>{c.pendingMove=null;c.selectedLayer=face};c.userMove=()=>{c.rotations++;c.pendingMove=null};c.confirmMove=()=>c.userMove();
c.document={createElement:()=>({style:{},dataset:{},hidden:false,disabled:false,setPointerCapture(){},setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]}})};
vm.createContext(c);vm.runInContext(choose+sync,c);
c.arrowHits=[{face:'F',dir:1,label:'1',angle:-Math.PI/2,p:[200,746]}];c.syncArrowButtons();
const b=elements[0],event=type=>({button:0,pointerType:type,pointerId:1,clientX:200,clientY:746,preventDefault(){},stopPropagation(){}});
function tap(type){b.onpointerdown(event(type));b.onpointerup(event(type));b.onclick(event(type))}
tap('touch');assert.equal(c.rotations,0);assert.equal(c.pendingMove.face,'F');assert.equal(c.previewDir,1);
tap('touch');assert.equal(c.rotations,1,'second tap rotates exactly once');
tap('touch');assert.equal(c.rotations,1);assert.equal(c.pendingMove.face,'F');
tap('touch');assert.equal(c.rotations,2,'repeated selection still works');
b.onpointerenter(event('mouse'));assert.equal(c.hoverLayer,'F');assert.equal(c.previewDir,1);
tap('mouse');assert.equal(c.rotations,3,'mouse rotates once on first click');
console.log('PASS: touch preview, second-tap rotation, repeated taps, mouse hover, no duplicate click rotation');
