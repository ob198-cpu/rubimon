const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('./engine.js');
const B=require('./battle.js');
const Q=require('./balance.js');
const T=require('./team.js');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const effects=source.slice(source.indexOf('function playBattleEffects(groups,result){'),source.indexOf('function resize(){'));
const frame=source.slice(source.indexOf('function frame(now){'),source.indexOf('function userMove(face,dir){'));
const resolver=source.slice(source.indexOf('async function resolveTurn(){'),source.indexOf('for(const [face,f] of Object.entries(E.faces))'));

function drawingContext(){
 const radii=[];
 // CanvasRenderingContext2D.arc throws IndexSizeError for a negative radius.
 // Rendering no-ops alone would miss the exception which stops the RAF loop.
 const ctx=new Proxy({radii,arc(x,y,r){
  if(r<0){const error=new Error('Negative Canvas arc radius: '+r);error.name='IndexSizeError';throw error}
  radii.push(r);
 },createRadialGradient:()=>({addColorStop(){}})}, {get:(target,key)=>key in target?target[key]:(()=>{})});
 return ctx;
}
function environment(){
 const ctx=drawingContext(),nodes={};
 const c={E,B,Q,T,console,Math,Set,innerWidth:390,innerHeight:844,devicePixelRatio:1,
  effectCanvas:{width:390,height:844},effectContext:ctx,ctx,
  canvas:{getBoundingClientRect:()=>({left:0,top:0,width:390,height:390})},
  byId:id=>nodes[id]??={textContent:'',getBoundingClientRect:()=>({left:0,top:0,width:390,height:100}),classList:{add(){},remove(){}}},
  reducedMotion:{matches:false},boardViewport:()=>({x:0,y:0,w:600,h:600}),orbitDisplayPoint:p=>p,
  roundToken:1,battleEffects:[],performance:{now:()=>1000}};
 vm.createContext(c);vm.runInContext(effects,c);return c;
}

const failures=[];
function check(name,test){try{test();console.log('PASS: '+name)}catch(error){failures.push(name);console.error('FAIL: '+name+'\n  '+error.name+': '+error.message)}}
for(const ahead of [0,349,351,500,1500])check('new effect created '+ahead+'ms after the RAF timestamp',()=>{
 const c=environment();c.battleEffects=[{token:1,start:1000+ahead,key:'R',points:[[300,300]],index:0,value:50}];
 c.drawBattleEffects(1000);
 assert.equal(c.battleEffects.length,1,'future-start effect is retained');
 assert.ok(c.ctx.radii.every(r=>r>=0));
});
for(const cost of [350,500])check('real rotation/attack frame schedules the next RAF despite '+cost+'ms refresh cost',()=>{
 E.configure(3);const c=environment();let wall=281,scheduled=0;
 Object.assign(c,{state:E.create(),active:{face:'F',dir:1,kind:'user',start:0,duration:280},queue:[],history:[],moves:0,
  phase:'ready',turnMoves:0,turnLimit:3,tutorial:null,combo:0,attackChain:0,bestChain:0,battleDamage:0,
  // Only the ready-state refresh runs the expensive board certificate search.
  gravityUsed:false,refillAssistance:true,spentElements:new Set(),startNext(){},refresh(){if(c.phase==='ready')wall+=cost},
  performance:{now:()=>wall},canAct:()=>true,currentMatches:()=>[{element:'R',ids:[0]}],
  teamOutcome:()=>({damage:20,heal:0,attacks:[{element:'R',value:20,heal:false}],details:[]}),
  showComboBonus(){},pause:()=>new Promise(()=>{}),orbitExpanded:false,compactBoard:false,
  drawCube(){},drawGuide(){},drawSliceArrows(){},syncArrowButtons(){},fx:null,skillFlash:null,
  runQueuedTouchMove(){},requestAnimationFrame(){scheduled++}});
 vm.runInContext(resolver+'\n'+frame,c);c.frame(280);
 assert.equal(c.moves,1,'the requested turn completed exactly once');
 assert.equal(c.history.length,0,'normal attack resolution clears history');
 assert.equal(c.phase,'resolving','existing battle animation state is preserved');
 assert.equal(c.battleEffects.length,1,'actual attack resolution created the effect');
 assert.equal(scheduled,1,'render loop must continue after same-frame effect creation');
});

for(const size of [3,4,5])check(size+'x'+size+' enemy lock has a valid target without moving existing odd-size targets',()=>{
 E.configure(size);const state=E.create(),obstacles={seals:[],restrict:0};
 B.hinder(state,'lock',obstacles);
 const locked=state.filter(s=>s.locked>0),edge=(size-1)/2;
 assert.equal(locked.length,1,'one tile remains the existing lock rule');
 assert.deepEqual(locked[0].n,[0,0,1]);
 const target=size===4?edge:1;
 assert.deepEqual(locked[0].p,[target,target,edge]);
 assert.equal(locked[0].locked,2,'existing lock duration is unchanged');
});
E.configure(3);
(async()=>{
 const name='4x4 enemy counter with enabled lock returns from resolving to ready';
 try{
  E.configure(4);const c=environment();
  Object.assign(c,{state:E.create(),active:null,queue:[],history:[],phase:'ready',turnMoves:3,turnLimit:3,
   tutorial:null,combo:0,attackChain:0,bestChain:0,battleDamage:0,gravityUsed:false,refillAssistance:true,
   spentElements:new Set(),squad:['sala','undine','raika','ferrum','libera'],tuning:T.defaults,
   enemyHp:800,hp:2130,dungeon:T.dungeons[0],enemyTurns:0,obstacles:{seals:[],restrict:0},
   enemyObstaclesEnabled:true,teamImmune:false,manualImmune:false,teamShield:false,clockUsed:false,openFaces:false,
   balanceMetrics:{refills:0,rejectedObstacles:0},canAct:()=>true,currentMatches:()=>[],refresh(){},
   currentEnemy:()=>({...T.dungeons[0],element:'火'}),enemyTechnique:()=>({name:'灼熱の鉤爪'}),
   attackKeys:()=>['R','B','U','L'],attackPolicy:()=>({}),endTeamTurn(){},battleVibration(){}});
  vm.runInContext(resolver,c);await c.resolveTurn();
  assert.equal(c.phase,'ready');assert.equal(c.turnMoves,0);assert.equal(c.enemyTurns,1);
  assert.equal(c.state.filter(s=>s.locked===2).length,1,'the existing obstacle applies successfully');
  assert.ok(c.hp<2130,'the existing counter damage still occurs');
  console.log('PASS: '+name);
 }catch(error){failures.push(name);console.error('FAIL: '+name+'\n  '+error.name+': '+error.message)}
 finally{E.configure(3)}
 if(failures.length)process.exitCode=1;
})();
