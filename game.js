'use strict';
const E=CubeEngine,canvas=document.getElementById('scene'),ctx=canvas.getContext('2d');
const B=BattleRules;
let vibrationEnabled=true;
try{vibrationEnabled=localStorage.getItem('rubimon.vibration')!=='off'}catch{}
function battleVibration(kind,damage){
 if(!vibrationEnabled||damage<=0||document.hidden||typeof navigator.vibrate!=='function')return;
 try{navigator.vibrate(kind==='hit'?[65,40,85]:[35,25,45])}catch{}
}
let compactBoard=false;
let orbitExpanded=false;
let refillAssistance=true;
let customColorCount=null;
const colorOrder=['R','B','D','U','F','L','V','I','M','H','P'];
function activePool(){return customColorCount===null?B.pools[difficulty]:colorOrder.slice(0,customColorCount)}
function boardViewport(){return compactBoard?(orbitExpanded?{w:460,h:908,x:70,y:-20}:{w:460,h:448,x:70,y:394}):(orbitExpanded?{w:600,h:820,x:0,y:-20}:{w:600,h:436,x:0,y:364})}
function boardPointer(e){const r=canvas.getBoundingClientRect(),v=boardViewport();return [(e.clientX-r.left)*v.w/r.width+v.x,(e.clientY-r.top)*v.h/r.height+v.y]}
function orbitDisplayScale(){return compactBoard?.8:.86}
function orbitDisplayPoint([x,y]){const scale=orbitDisplayScale();return [300+(x-300)*scale,250+(y-250)*scale]}
const T=TeamRules, Q=BalanceRules;
let proofCache=null,shuffleCharges=2,balanceMetrics={repairs:0,refills:0,rejectedObstacles:0};
function attackKeys(){return [...new Set(squad.map(id=>T.roster.find(c=>c.id===id).element))].filter(k=>k!=='D'&&(activePool().includes(k)||teamConversion?.[1]===k))}
function boardProof(){const depth=difficulty==='easy'?1:Math.max(1,Math.min(3,turnLimit-turnMoves));const key=JSON.stringify([state,attackKeys(),attackPolicy(),depth]);if(proofCache?.key!==key)proofCache={key,...Q.plan(state,attackKeys(),attackPolicy(),depth)};return proofCache}
function rubikSixStart(){
 let fallback=null;
 for(let i=0;i<24;i++){
  const candidate=B.rubikBoard(E,Math.random,activePool(),28+i%7);if(B.matches(candidate,attackPolicy()).length)continue;
  fallback ||= candidate;const proof=Q.plan(candidate,attackKeys(),attackPolicy(),3,4200);if(proof.moves)return {state:candidate,...proof,status:'rubik-verified'};
 }
 return {state:fallback||B.rubikBoard(E,Math.random,activePool()),moves:null,status:'rubik-unverified'};
}
function initialBoard(){return activePool().length===6?rubikSixStart():Q.initial(activePool(),attackKeys(),attackPolicy(),customColorCount!==null?'easy':difficulty)}
function certifiedStart(){const result=initialBoard();if(!result.state){byId('battleLog').textContent='攻撃属性と出現色が合いません。編成または難易度を変更してください。';phase='setup';return false}state=result.state;proofCache=null;return true}
let squad=['sala','undine','raika','ferrum','libera'],dungeon=T.dungeons[0],tuning={...T.defaults},cooldowns={},teamSpent=new Set(),teamBuffs={},teamImmune=false,manualImmune=false,teamShield=false,teamConversion=null,gravityUsed=false,panelPick=null;
function maxHp(){return tutorial?1800:T.stats(squad,tuning).hp}
function currentEnemy(){return tutorial?B.enemies[wave]:{...dungeon,hp:dungeon.id==='grove'?800:Math.round(dungeon.hp*Q.settings[difficulty].hp),attack:Math.round(dungeon.attack*Q.settings[difficulty].attack),name:dungeon.bossName||dungeon.name,element:{grove:'火',armor:'鋼',abyss:'闇',storm:'風'}[dungeon.id]}}
function enemyTechnique(enemy){
 const turn=enemyTurns+1;
 if(tutorial)return {name:['灼熱爪','熔岩突進','宵闇砲'][wave]||'竜撃',damage:enemy.attack};
 if(enemy.id==='storm')return turn%3===0?{name:'天嵐崩界',damage:enemy.attack}:{name:'裂風刃',damage:Math.round(enemy.attack*.35)};
 return {name:{grove:'灼熱の鉤爪',armor:'鋼殻衝',abyss:'深淵滅光'}[enemy.id]||'竜撃',damage:enemy.attack};
}
function teamOutcome(groups,offset=0){return tutorial?B.outcome(groups,currentEnemy(),offset):T.outcome(squad,groups,currentEnemy(),enemyHp,gravityUsed,tuning,teamBuffs,offset)}
function applyTemporaryConversion(){if(!tutorial&&teamConversion)for(const s of state)if(s.face===teamConversion[0]&&s.tempOriginal===undefined){s.tempOriginal=s.face;s.face=teamConversion[1]}}
function refillWithoutAssistance(ids){
 let fallback=null;
 for(let i=0;i<48;i++){
  const candidate=structuredClone(state);B.refill(candidate,ids,Math.random,activePool());
  if(teamConversion)for(const s of candidate)if(s.face===teamConversion[0]&&s.tempOriginal===undefined){s.tempOriginal=s.face;s.face=teamConversion[1]}
  fallback ||= candidate;if(!B.matches(candidate,attackPolicy()).length){state.splice(0,state.length,...candidate);return}
 }
 state.splice(0,state.length,...fallback);
}
function endTeamTurn(){for(const s of state)if(s.tempOriginal!==undefined){s.face=s.tempOriginal;delete s.tempOriginal}teamConversion=null;teamBuffs={};teamImmune=false;teamShield=false;gravityUsed=false;for(const id in cooldowns)if(!teamSpent.has(id))cooldowns[id]=Math.max(0,cooldowns[id]-1);teamSpent.clear()}
let state=B.board(E),active=null,queue=[],history=[],moves=0,hitFaces=[],ringHits=[],spentElements=new Set();
let hp=1800,wave=0,enemyHp=B.enemies[0].hp,phase='ready',turnMoves=0,combo=0,fx=null,matched=new Set(),roundToken=0;
let tutorial=null,skillFlash=null;
let challengeMode=false;
let lineChallenge=0,lineChallengeSetup=null;
let pendingMove=null;
let selectedLayer=null,hoverLayer=null,previewDir=0,guideCache=null;
function guideFace(){return tutorial||active||phase!=='ready'?null:pendingMove?.face||hoverLayer||selectedLayer}
function updateGuide(){
 if(pendingMove&&pendingMove.board!==JSON.stringify(state))pendingMove=null;
 const confirm=byId('guideConfirm');if(confirm)confirm.disabled=!pendingMove||!!active||!!tutorial||phase!=='ready'||queue.length>0||turnMoves>=turnLimit||!B.canRotate(state,pendingMove.face);
 byId('moveGuide').hidden=!selectedLayer||!!tutorial;
 const f=guideFace(),blocked=f&&!B.canRotate(state,f),busy=!!tutorial||!!active||phase!=='ready'||turnMoves>=turnLimit||queue.length>0;
 byId('guideText').textContent=f?E.slices[f].name+'層 '+f+(blocked?' · 固定中：回転できません':busy?' · 残り手数や進行状態を確認':' · 水色のブロックが一緒に動きます'):'円の線・玉・キューブをタッチして回す層を選択';
 for(const id of ['guideCW','guideCCW'])byId(id).disabled=!selectedLayer||busy||!B.canRotate(state,selectedLayer);
 byId('guideCancel').disabled=!selectedLayer;
 document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===selectedLayer)));
}
function selectLayer(face,choices=[face]){pendingMove=null;selectedLayer=face;hoverLayer=null;previewDir=0;byId('layerChoices').replaceChildren();for(const f of choices){const b=document.createElement('button');b.dataset.layer=f;b.textContent=E.slices[f].name+'層 '+f;b.onclick=()=>{pendingMove=null;selectedLayer=f;hoverLayer=null;updateGuide()};byId('layerChoices').append(b)}updateGuide()}
function drawGuide(part='cube'){
 const face=guideFace();if(!face)return;const f=E.slices[face],color=B.canRotate(state,face)?'#83f5ff':'#ff8ca7';
 ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.5;
 if(part==='orbit'){
 const direction=pendingMove?.dir||previewDir;
 const center=E.centers[f.axis];ctx.beginPath();ctx.arc(...center,E.radius(f.layer),0,Math.PI*2);ctx.stroke();
 if(direction){
 const icons=state.map(E.orbit),markers=[],radius=E.radius(f.layer),sign=E.orbitDirection(face,direction);
 // Keep direction markers outside the icons' protected area.
 for(let t=0;t<Math.PI*2;t+=Math.PI/12){
 const p=[center[0]+radius*Math.cos(t),center[1]+radius*Math.sin(t)];
 if(icons.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<22)||markers.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<32))continue;
 const angle=t+sign*Math.PI/2;ctx.beginPath();ctx.moveTo(p[0]-10*Math.cos(angle-.5),p[1]-10*Math.sin(angle-.5));ctx.lineTo(...p);ctx.lineTo(p[0]-10*Math.cos(angle+.5),p[1]-10*Math.sin(angle+.5));ctx.stroke();markers.push(p);t+=Math.PI/4;
 }
 }
 ctx.restore();return;
 }
 for(const p of hitFaces.filter(p=>p.sticker.p[f.axis]===f.layer&&p.sticker.n[f.axis]===0)){ctx.beginPath();p.points.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.stroke()}
 ctx.restore();
}
let difficulty='normal',skillUses={convert:2,shuffle:2,clock:2,cleanse:2,open:2};
let turnLimit=3,clockUsed=false,openFaces=false,baseRule='all',enemyTurns=0,obstacles={seals:[],restrict:0};
let enemyObstaclesEnabled=false;
function attackPolicy(){return tutorial?{}:{faces:openFaces?Object.keys(E.faces):obstacles.restrict>0?['F']:baseRule==='front'?['F']:baseRule==='visible'?['U','F','R']:Object.keys(E.faces),seals:obstacles.seals}}
function currentMatches(board=state){return B.matches(board,attackPolicy())}
function obstructed(){return obstacles.seals.length||obstacles.restrict||state.some(s=>s.locked>0||s.face==='J')}
function canAct(){return Object.keys(E.slices).some(f=>B.canRotate(state,f))}
const effectCanvas=document.createElement('canvas');
effectCanvas.id='battleEffects';effectCanvas.setAttribute('aria-hidden','true');document.body.append(effectCanvas);
const effectContext=effectCanvas.getContext('2d');
let battleEffects=[];
let attackChain=0;
let bestChain=0,battleDamage=0;
const comboBanner=document.createElement('div');comboBanner.className='combo-celebration';comboBanner.setAttribute('role','status');document.body.append(comboBanner);
function showComboBonus(bonus){if(bonus.multiplier<=1)return;comboBanner.replaceChildren();const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=[bonus.chain>1?'CHAIN '+bonus.chain:'',bonus.burst>1?'BURST '+bonus.burst:''].filter(Boolean).join(' × ');detail.textContent='ダメージ ×'+bonus.multiplier.toFixed(2);comboBanner.append(title,detail);comboBanner.classList.remove('active');void comboBanner.offsetWidth;comboBanner.classList.add('active')}
const victoryScreen=document.createElement('section');victoryScreen.className='victory-screen';victoryScreen.hidden=true;victoryScreen.setAttribute('role','dialog');victoryScreen.setAttribute('aria-modal','true');victoryScreen.setAttribute('aria-labelledby','victoryTitle');victoryScreen.innerHTML='<div class="victory-rays" aria-hidden="true"></div><div class="victory-panel"><small>DUNGEON CLEAR</small><h2 id="victoryTitle">VICTORY</h2><p id="victoryEnemy"></p><div class="victory-stats"><span>総ダメージ<strong id="victoryDamage"></strong></span><span>最大チェイン<strong id="victoryChain"></strong></span><span>獲得素材<strong id="victoryReward"></strong></span></div><div class="victory-actions"><button id="victoryRetry">もう一度挑戦</button><button id="victoryClose">盤面を見る</button></div></div>';document.body.append(victoryScreen);
function showVictory(){byId('victoryEnemy').textContent=currentEnemy().name+' 撃破';byId('victoryDamage').textContent=battleDamage.toLocaleString();byId('victoryChain').textContent=bestChain;byId('victoryReward').textContent=dungeon.reward+' 個';victoryScreen.hidden=false;victoryScreen.classList.remove('reveal');void victoryScreen.offsetWidth;victoryScreen.classList.add('reveal');battleVibration('attack',1)}
document.getElementById('victoryRetry').onclick=()=>{victoryScreen.hidden=true;reset()};document.getElementById('victoryClose').onclick=()=>{victoryScreen.hidden=true};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const cubeOrigin=[300,510],cubeScale=46;
function visualCubeScale(){return cubeScale*3/E.size}
let arrowHits=[],guidedArrowKey=null,arrowGuideActive=false,arrowsUnlocked=false;
function sliceControl(axis,layer,dir){
 // Identify which visible side is on screen-left, then map its columns.
 const sx=camera[0]>=0?1:-1,sz=camera[2]>=0?1:-1;
 const leftNormal=camRight[0]*sx<camRight[2]*sz?0:2;
 const leftAxis=leftNormal===0?2:0;
 const normalAxis=axis===1?leftNormal:axis===0?2:0;
 const edge=(E.size-1)/2+.5,pivot=[0,0,0];pivot[axis]=layer;pivot[normalAxis]=(normalAxis===0?sx:sz)*edge;
 const a=cubePoint(pivot),b=cubePoint(E.rotate(pivot,axis,.001));
 const sign=-Math.sign(layer||1)*dir,component=axis===1?0:1;
 const towardStart=(b[component]-a[component])*sign<0;
 const column=camRight[axis]>=0?layer+(E.size-1)/2:(E.size-1)/2-layer;
 const edgePoint=[...pivot];if(axis!==1)edgePoint[1]=-edge;else{const other=normalAxis===0?2:0;edgePoint[other]=camRight[other]>=0?-edge:edge}
 return {
  anchor:cubePoint(edgePoint),
  p:axis===1?[towardStart?117:159,514-layer*42]:[(axis===leftAxis?204:350)+column*42,towardStart?632:674],
  angle:axis===1?(towardStart?Math.PI:0):(towardStart?-Math.PI/2:Math.PI/2)
 };
}
function drawSliceArrows(){
 arrowHits=[];if(tutorial||cubeDrag?.moved)return;
 const markerColors=['#ef8b74','#e8bd67','#89c98d','#67c9d0','#77aee8','#b491df','#dc82ae','#d99a64','#9caf72'];
 const columns=[];for(const axis of [0,2])for(const layer of E.layers())columns.push({axis,layer,x:sliceControl(axis,layer,1).anchor[0]});columns.sort((a,b)=>a.x-b.x||a.axis-b.axis);
 const gap=compactBoard?56:38,center=columns.reduce((sum,c)=>sum+c.x,0)/columns.length;
 const columnX=columns.map(c=>c.x);for(let i=1;i<columnX.length;i++)columnX[i]=Math.max(columnX[i],columnX[i-1]+gap);
 let shift=center-columnX.reduce((sum,x)=>sum+x,0)/columnX.length;if(compactBoard)shift=Math.max(75-columnX[0],Math.min(525-columnX[columnX.length-1],shift));for(let i=0;i<columnX.length;i++)columnX[i]+=shift;
 const layers=E.layers();for(let axis=0;axis<3;axis++)for(const layer of layers){
 const face=Object.keys(E.slices).find(k=>E.slices[k].axis===axis&&E.slices[k].layer===layer);
 for(const dir of [1,-1]){
 // Screen-space controls: horizontal rows on the left, vertical columns below.
 // Front columns (X) and right-face columns (Z) have opposite rotation signs.
 const control=sliceControl(axis,layer,dir),angle=control.angle;
 const rank=columns.findIndex(c=>c.axis===axis&&c.layer===layer);
 const p=compactBoard?(axis===1?[angle===0?174:116,564-layer*58]:[columnX[rank],angle<0?746:804]):[axis===1?(angle===0?179:141):columnX[rank],control.p[1]+(axis===1?20:76)];
 const layerIndex=layers.indexOf(layer),markerIndex=axis===1?layers.length-1-layerIndex:layers.length+rank,markerLabel=axis===1?String.fromCharCode(65+layers.length-1-layerIndex):String(rank+1),markerColor=markerColors[markerIndex%markerColors.length];
 const points=[p],end=[p[0]+13*Math.cos(angle),p[1]+13*Math.sin(angle)];
 const disabled=!arrowsUnlocked||!!active||phase!=='ready'||turnMoves>=turnLimit||!B.canRotate(state,face),lit=guideFace()===face&&(pendingMove?.dir||previewDir)===dir;
 if(dir===1){
  const anchor=axis===1?[control.anchor[0],control.anchor[1]+(compactBoard?30:0)]:[columnX[rank],compactBoard?690:650];
  ctx.save();ctx.beginPath();ctx.arc(...anchor,compactBoard?9:7,0,Math.PI*2);ctx.fillStyle='#13292d';ctx.fill();ctx.strokeStyle=markerColor;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=markerColor;ctx.font='800 '+(compactBoard?11:9)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(markerLabel,anchor[0],anchor[1]+.5);ctx.restore();
 }
 arrowHits.push({p,points,face,dir});ctx.save();if(compactBoard){ctx.translate(...p);ctx.scale(1.58,1.58);ctx.translate(-p[0],-p[1])}ctx.globalAlpha=disabled?.3:1;ctx.lineCap='round';ctx.lineJoin='round';
 const finish=ctx.createLinearGradient(p[0],p[1]-17,p[0],p[1]+17);finish.addColorStop(0,lit?'#416168':'#30494c');finish.addColorStop(1,lit?'#223e45':'#142b30');ctx.fillStyle=finish;
 ctx.shadowColor='#0005';ctx.shadowBlur=4;ctx.shadowOffsetY=2;ctx.beginPath();ctx.roundRect(p[0]-17,p[1]-17,34,34,7);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.strokeStyle=lit?'#ffe5a3':markerColor;ctx.lineWidth=lit?2:1.5;ctx.stroke();
 ctx.beginPath();ctx.moveTo(p[0]-10,p[1]-14);ctx.lineTo(p[0]+10,p[1]-14);ctx.strokeStyle='#ffffff18';ctx.stroke();
 ctx.strokeStyle=lit?'#ffe5a3':'#eee9db';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(p[0]-13*Math.cos(angle),p[1]-13*Math.sin(angle));ctx.lineTo(...end);ctx.stroke();
 ctx.beginPath();ctx.moveTo(end[0]-13*Math.cos(angle-.55),end[1]-13*Math.sin(angle-.55));ctx.lineTo(...end);ctx.lineTo(end[0]-13*Math.cos(angle+.55),end[1]-13*Math.sin(angle+.55));ctx.stroke();
 ctx.beginPath();ctx.arc(p[0]+11,p[1]-11,6,0,Math.PI*2);ctx.fillStyle='#13292d';ctx.fill();ctx.strokeStyle=markerColor;ctx.lineWidth=1.4;ctx.stroke();ctx.fillStyle=markerColor;ctx.font='800 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(markerLabel,p[0]+11,p[1]-10.5);ctx.restore();
 }}
}
function arrowAt(e){const p=boardPointer(e),half=compactBoard?27:17;return arrowHits.find(a=>Math.abs(p[0]-a.p[0])<=half&&Math.abs(p[1]-a.p[1])<=half)}
const camera=[.57,.48,.67],camRight=[.762,0,-.648],camUp=[-.311,.879,-.366];
const viewHome={yaw:Math.atan2(.57,.67),pitch:Math.asin(.48)};
let viewYaw=viewHome.yaw,viewPitch=viewHome.pitch,cubeDrag=null,suppressCubeClick=false,ignoreCanvasClickUntil=0,lastCanvasTouchAt=0,lastCanvasTouchPoint=null,queuedTouchMove=null;
function viewTurned(){return Math.abs(viewYaw-viewHome.yaw)+Math.abs(viewPitch-viewHome.pitch)>.015}
function updateView(){
 const sy=Math.sin(viewYaw),cy=Math.cos(viewYaw),sp=Math.sin(viewPitch),cp=Math.cos(viewPitch);
 camera.splice(0,3,sy*cp,sp,cy*cp);camRight.splice(0,3,cy,0,-sy);camUp.splice(0,3,-sy*sp,cp,-cy*sp);
 byId('viewReset').disabled=!viewTurned();
}
const byId=id=>document.getElementById(id);
const add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(v,k)=>v.map(x=>x*k);
// 1.28 is the largest rounded scale with padding for every camera angle:
// a projected cube fits inside a radius of 1.5 * sqrt(3) * scale.
function cubePoint(v){const size=visualCubeScale();return [cubeOrigin[0]+58+E.dot(v,camRight)*size*1.28,cubeOrigin[1]+20-E.dot(v,camUp)*size*1.28]}
function polygon(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function isMoving(p){return active&&p[E.slices[active.face].axis]===E.slices[active.face].layer}
function transform(v,p,angle){return isMoving(p)?E.rotate(v,E.slices[active.face].axis,angle):v}
function drawOrbits(angle){
  ringHits=[];
  for(let axis=0;axis<3;axis++)for(const layer of E.layers()){
    const center=E.centers[axis],r=E.radius(layer),points=[];
    for(let i=0;i<=256;i++){const t=i*Math.PI/128;points.push([center[0]+r*Math.cos(t),center[1]+r*Math.sin(t)])}
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));
    const lit=active&&E.slices[active.face].axis===axis&&E.slices[active.face].layer===layer;
    ctx.strokeStyle=lit?'#e7b66a':'#76848a';ctx.globalAlpha=lit?.95:.55;ctx.lineWidth=lit?1.8:1;ctx.stroke();ctx.globalAlpha=1;
    ringHits.push({points,face:Object.keys(E.slices).find(f=>E.slices[f].axis===axis&&E.slices[f].layer===layer)});
  }
  drawGuide('orbit');
  for(const s of state){
    const moving=isMoving(s.p);let p=E.orbit(s);
    if(moving){
      const f=E.slices[active.face],target=active.target[s.id],end=E.orbit(target),t=Math.abs(angle)/(Math.PI/2);
      const center=s.n[f.axis]===0?E.centers[f.axis]:E.orbit({p:s.n,n:s.n});
      const a=Math.atan2(p[1]-center[1],p[0]-center[0]),b=Math.atan2(end[1]-center[1],end[0]-center[0]);
      const delta=E.orbitSweep(a,b,E.orbitDirection(active.face,active.dir));
      const r0=Math.hypot(p[0]-center[0],p[1]-center[1]),r1=Math.hypot(end[0]-center[0],end[1]-center[1]),r=r0+(r1-r0)*t;
      p=[center[0]+r*Math.cos(a+delta*t),center[1]+r*Math.sin(a+delta*t)];
    }
    // An opaque backing keeps every orbit/selection line behind the symbol.
    ctx.save();ctx.beginPath();ctx.arc(...p,11,0,Math.PI*2);ctx.fillStyle='#152f34';ctx.fill();
    if(matched.has(s.id)&&!active){ctx.beginPath();ctx.arc(...p,10.7,0,Math.PI*2);ctx.strokeStyle='#ffe9a4';ctx.lineWidth=1.5;ctx.stroke()}
    drawPanelSpirit(s,p[0],p[1],compactBoard?11:10,false);
    drawBlockStatus(s,p,11);
    ctx.restore();
  }
}
function drawCube(angle){
  const polygons=[];hitFaces=[];
  // All 27 cubelets, including internal black faces exposed mid-turn.
  for(const x of E.layers())for(const y of E.layers())for(const z of E.layers()){
    const p=[x,y,z];
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const n=[0,0,0];n[axis]=sign;const rn=transform(n,p,angle);if(E.dot(rn,camera)<=0)continue;
      const a=(axis+1)%3,b=(axis+2)%3,center=p.slice();center[axis]+=sign*.495;
      const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const q=center.slice();q[a]+=u*.485;q[b]+=v*.485;return transform(q,p,angle)});
      const rc=transform(center,p,angle);
      polygons.push({points:corners.map(cubePoint),depth:E.dot(rc,camera),fill:'#182127',stroke:'#53636a'});
    }
  }
  for(const s of state){
    const n=transform(s.n,s.p,angle);if(E.dot(n,camera)<=0)continue;
    const axis=s.n.findIndex(v=>v!==0),a=(axis+1)%3,b=(axis+2)%3,center=add(s.p,scale(s.n,.502));
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const q=center.slice();q[a]+=u*.436;q[b]+=v*.436;return transform(q,s.p,angle)});
    polygons.push({points:corners.map(cubePoint),depth:E.dot(transform(center,s.p,angle),camera)+.003,fill:challengeMode?'#354448':B.spirits[s.face].color,stroke:panelPick?.ids.has(s.id)?'#72efff':matched.has(s.id)?'#fff6ba':'#c8d0c477',normal:s.n,spirit:s.face,sticker:s});
  }
  polygons.sort((a,b)=>a.depth-b.depth);
  for(const p of polygons){polygon(p.points,p.fill,p.stroke,.8);if(p.normal){hitFaces.push(p);const c=p.points.reduce((a,v)=>[a[0]+v[0]/4,a[1]+v[1]/4],[0,0]);drawPanelSpirit(p.sticker,c[0],c[1],11);drawBlockStatus(p.sticker,c,14)}}
}
function drawPanelSpirit(sticker,x,y,r,conceal=challengeMode){
 if(conceal){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f5f0df';ctx.font='800 '+Math.round(r*1.55)+'px system-ui';ctx.fillText('?',x,y+1);ctx.restore();return}
 if(sticker.face!=='X'||!sticker.spentOriginal){drawSpirit(ctx,sticker.face,x,y,r);return}
 ctx.save();ctx.filter='grayscale(1)';ctx.globalAlpha=.72;drawSpirit(ctx,sticker.spentOriginal,x,y,r);ctx.restore();
}
function drawBlockStatus(s,p,r){
 if(active)return;ctx.save();
 if(s.locked>0){ctx.strokeStyle='#ffd47a';ctx.lineWidth=2;ctx.strokeRect(p[0]-r,p[1]-r,r*2,r*2);ctx.fillStyle='#172033';ctx.fillRect(p[0]-4,p[1]-5,8,9);ctx.strokeStyle='#ffd47a';ctx.strokeRect(p[0]-4,p[1]-5,8,9);ctx.beginPath();ctx.arc(p[0],p[1]-5,3,Math.PI,0);ctx.stroke()}
 if(B.sealed(s,attackPolicy())){ctx.strokeStyle='#f87eb7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0]-r,p[1]+r);ctx.lineTo(p[0]+r,p[1]-r);ctx.stroke()}
 ctx.restore();
}
function refresh(){
  if(!tutorial&&!active&&!queue.length&&phase==='ready'){
   const proof=boardProof();byId('boardProof').textContent=proof.moves?'検証済み：'+proof.moves.length+'手以内で攻撃可能（ヒントで手順）':'残り手数内の確実な攻撃手順は未確認。救済か技を選べます。';
   byId('rescue').hidden=false;byId('rescue').disabled=shuffleCharges===0;
   byId('rescue').textContent='盤面をリセット（残り '+shuffleCharges+' / 2）';
   byId('passTurn').hidden=!!proof.moves;
  }else{byId('rescue').hidden=false;byId('rescue').disabled=true;byId('passTurn').hidden=true}
  updateGuide();
  const groups=currentMatches(),enemy=currentEnemy();
  matched=new Set(groups.flatMap(g=>g.ids));
  byId('count').textContent='敵の行動まで '+(turnLimit-turnMoves)+' 手';
  const technique=enemyTechnique(enemy),enemySkill=byId('enemySkill');enemySkill.replaceChildren();
  const techniqueName=document.createElement('strong'),techniqueEffect=document.createElement('span');techniqueName.textContent=technique.name;techniqueEffect.textContent='効果：'+enemy.element+'属性による'+technique.damage+'ダメージ';enemySkill.append(techniqueName,techniqueEffect);
  byId('status').textContent=phase==='victory'?'ダンジョンクリア！':phase==='lost'?'敗北 … 再挑戦しよう':phase==='resolving'?'精霊たちが攻撃中':active?'回転中':groups.length?groups.length+' 列がそろった！':'仲間の属性を縦・横に3個そろえよう';
  byId('attack').disabled=!!tutorial||phase!=='ready'||!!active||queue.length>0||(turnMoves===0&&canAct());
  byId('attack').textContent=groups.some(g=>g.skill)?'攻撃判定 · 必殺技発動！':groups.length?'攻撃判定 · '+groups.length+' COMBO':'攻撃判定 · そろいなし／敵が反撃';
  byId('undo').disabled=!!tutorial||!!active||!history.length||phase!=='ready';
  byId('hint').disabled=!!tutorial||!!active||phase!=='ready'||turnMoves>=turnLimit;
  if(byId('refillToggle'))byId('refillToggle').disabled=!!tutorial||!!active||phase==='resolving';
  if(byId('immuneToggle'))byId('immuneToggle').disabled=!!tutorial||!!active||phase==='resolving';
  byId('tutorialStart').disabled=!!active||phase!=='ready';
  const locked=!!tutorial||!!active||queue.length>0||phase!=='ready';
  byId('convertSkill').disabled=locked||skillUses.convert===0||!state.some(s=>s.face==='R');
  byId('shuffleSkill').disabled=locked||skillUses.shuffle===0;
  byId('convertSkill').textContent='ウンディーネ：赤 → 青（残り'+skillUses.convert+'）';
  byId('shuffleSkill').textContent='シルフ：シャッフル（残り'+skillUses.shuffle+'）';
  byId('clockSkill').disabled=locked||!skillUses.clock||clockUsed;
  byId('cleanseSkill').disabled=locked||!skillUses.cleanse||!obstructed();
  byId('openSkill').disabled=locked||!skillUses.open||openFaces;
  byId('clockSkill').textContent='クロノ：＋2手（残り'+skillUses.clock+'）';
  byId('cleanseSkill').textContent='リベラ：妨害解除（残り'+skillUses.cleanse+'）';
  byId('openSkill').textContent='アストラ：全6面解放（残り'+skillUses.open+'）';
  byId('difficulty').disabled=!!tutorial||!!active||phase==='resolving';
  byId('applyDifficulty').disabled=byId('difficulty').disabled;
  const colorSelect=byId('colorCount');if(colorSelect){colorSelect.disabled=!!tutorial||!!active||!!queue.length||phase==='resolving';colorSelect.value=String(activePool().length)}
  byId('attackRule').disabled=byId('difficulty').disabled;
  byId('enemyObstacles').disabled=locked;
  byId('difficultyInfo').textContent=tutorial?'デモは専用の6色盤面':difficulty.toUpperCase()+' · '+activePool().length+'色で対戦中';
  document.querySelectorAll('[data-face]').forEach(b=>{const blocked=!B.canRotate(state,b.dataset.face);b.disabled=locked||turnMoves>=turnLimit||blocked;b.title=blocked?'固定ブロックがあるため回転できません':''});
  document.querySelectorAll('[data-obstacle]').forEach(b=>b.disabled=locked);
  const policy=attackPolicy(),faceNames=(policy.faces||Object.keys(E.faces)).map(f=>E.slices[f].name).join('・');
  byId('ruleStatus').textContent='現在の攻撃面：'+faceNames+(openFaces?'（アストラ解放中）':'');
  const locks=state.filter(s=>s.locked>0),jams=state.filter(s=>s.face==='J');
  const notices=[];
  if(locks.length)notices.push('固定 '+locks.length+'個・残り'+Math.max(...locks.map(s=>s.locked))+'ターン');
  if(jams.length)notices.push('お邪魔 '+jams.length+'個・解除まで残る');
  if(obstacles.seals.length)notices.push('前面上段の封印・残り'+obstacles.seals[0].turns+'ターン');
  if(obstacles.restrict)notices.push('前面以外の攻撃禁止・残り'+obstacles.restrict+'ターン');
  byId('obstacleStatus').textContent=notices.length?notices.join(' ／ '):'妨害なし';
  byId('enemyIntent').textContent=tutorial?'デモでは敵の妨害は発生しません':'敵防御 '+enemy.def+' ／ 次の反撃 '+T.incoming(squad,enemy,enemyTurns+1,tuning,teamImmune||manualImmune,teamShield)+' ／ 割合耐性 '+Math.round((1-enemy.gravity)*100)+'%';
  byId('stage').textContent=tutorial?'DEMO':'DUNGEON · '+dungeon.name;
  byId('enemyName').textContent=enemy.name;byId('enemyElement').textContent=enemy.element+'属性';
  byId('enemyHp').textContent=enemyHp+' / '+enemy.hp;byId('enemyBar').style.width=100*enemyHp/enemy.hp+'%';
  byId('weakness').textContent='弱点：'+B.spirits[enemy.weak].element+(tutorial?' ×1.8':' ×1.5');
  byId('playerHp').textContent=hp+' / '+maxHp();byId('playerBar').style.width=100*hp/maxHp()+'%';
  refreshSquad();
  const palette=[['#92e2c4','#348c86','#173f59','#b6ffee'],['#ffc17c','#b54c43','#492943','#ffe492'],['#c9b2ff','#7151a3','#25294d','#d6c4ff']][wave];
  ['--dragon-light','--dragon-main','--dragon-dark','--dragon-gem'].forEach((key,i)=>byId('monster').style.setProperty(key,palette[i]));
  byId('monster').classList.toggle('defeated',enemyHp===0);
}
function startNext(now){
  if(active||!queue.length)return;
  const m=queue.shift(),target=state.map(s=>({...s,p:s.p.slice(),n:s.n.slice()}));E.move(target,m.face,m.dir);
  active={...m,target,start:now,duration:m.duration||Number(byId('speed').value)};refresh();
}
function frame(now){
  startNext(now);let angle=0;
  if(active){const t=Math.min(1,(now-active.start)/active.duration),ease=t*t*(3-2*t);angle=-Math.sign(E.slices[active.face].layer||1)*active.dir*Math.PI/2*ease;
    if(t===1){const m=active;E.move(state,m.face,m.dir);active=null;angle=0;
      if(m.kind==='user'){history.push({face:m.face,dir:m.dir});moves++;turnMoves++}
      if(m.kind==='undo'){history.pop();moves=Math.max(0,moves-1);turnMoves--}
      refresh();if(m.kind==='user'&&phase==='ready')resolveTurn().then(runQueuedTouchMove);
    }
  }
  ctx.clearRect(0,-20,600,940);if(orbitExpanded){ctx.save();ctx.translate(300,250);ctx.scale(orbitDisplayScale(),orbitDisplayScale());ctx.translate(-300,-250);drawOrbits(angle);ctx.restore()}ctx.save();if(compactBoard)ctx.translate(0,30);drawCube(angle);drawGuide();ctx.restore();drawSliceArrows();
  if(fx){const t=(now-fx.start)/1100;if(t<1){ctx.save();ctx.globalAlpha=1-t;for(const p of fx.points){const x=p[0]+(540-p[0])*t,y=p[1]+(35-p[1])*t-60*Math.sin(t*Math.PI);ctx.beginPath();ctx.arc(x,y,5*(1-t)+2,0,Math.PI*2);ctx.fillStyle=fx.color;ctx.shadowColor=fx.color;ctx.shadowBlur=16;ctx.fill()}ctx.restore()}else fx=null}
  if(skillFlash){const t=(now-skillFlash.start)/2200;if(t<1){ctx.save();ctx.fillStyle='#121727df';ctx.fillRect(20,320,560,78);ctx.strokeStyle=skillFlash.color;ctx.lineWidth=2;ctx.strokeRect(20,320,560,78);ctx.textAlign='center';ctx.fillStyle='#ffe8ae';ctx.font='bold 17px sans-serif';ctx.fillText('1面完成 · SKILL',300,345);ctx.font='bold 21px sans-serif';ctx.fillStyle=skillFlash.color;ctx.fillText(skillFlash.name,300,379);ctx.restore()}else skillFlash=null}
  drawBattleEffects(now);
  requestAnimationFrame(frame);
}
function userMove(face,dir){if(panelPick||tutorial||phase!=='ready'||active||queue.length||turnMoves>=turnLimit)return;if(!B.canRotate(state,face)){byId('battleLog').textContent='この層には固定ブロックがあります。別の面か、リベラの解除を使おう。';return}pendingMove=null;queue.push({face,dir,kind:'user'})}
function runQueuedTouchMove(){if(!queuedTouchMove||tutorial||active||queue.length||phase!=='ready'||turnMoves>=turnLimit)return;const move=queuedTouchMove;queuedTouchMove=null;userMove(move.face,move.dir)}
function reset(){attackChain=0;bestChain=0;battleDamage=0;spentElements.clear();victoryScreen.hidden=true;comboBanner.classList.remove('active');pendingMove=null;queuedTouchMove=null;panelPick=null;shuffleCharges=2;roundToken++;endTeamTurn();cooldowns={};selectedLayer=null;hoverLayer=null;previewDir=0;byId('layerChoices').replaceChildren();state=B.board(E,Math.random,activePool());skillUses={convert:2,shuffle:2,clock:2,cleanse:2,open:2};turnLimit=3;clockUsed=false;openFaces=false;obstacles={seals:[],restrict:0};enemyTurns=0;baseRule=byId('attackRule').value;active=null;queue=[];history=[];moves=0;hp=maxHp();wave=0;enemyHp=currentEnemy().hp;phase='ready';turnMoves=0;combo=0;fx=null;byId('battleLog').textContent='5体の編成で '+dungeon.name+' に挑戦。属性をそろえ、仲間の技で対策しよう。';byId('damageText').textContent='';balanceMetrics={repairs:0,refills:0,rejectedObstacles:0};certifiedStart();renderParty();refresh()}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function resolveTurn(){
 if(phase!=='ready'||active||queue.length||(turnMoves===0&&canAct()))return;
 history=[];phase='resolving';const token=roundToken,challengeGoal=0;combo=0;let total=0,healed=0,recoveryMatched=false,attackMatched=false,challengeShortfall=-1;refresh();
 for(let chain=0;chain<(tutorial?8:1);chain++){
  const foundGroups=currentMatches();if(!foundGroups.length)break;
  const completedLines=foundGroups.reduce((sum,g)=>sum+(g.skill?6:1),0);if(!tutorial&&challengeGoal&&completedLines<challengeGoal){challengeShortfall=completedLines;break}
  const groups=!tutorial&&!refillAssistance?foundGroups.filter((g,i)=>!spentElements.has(g.element)&&foundGroups.findIndex(x=>x.element===g.element)===i):foundGroups;
  recoveryMatched ||= groups.some(g=>g.element==='D');
  let result=teamOutcome(groups,combo);if(!tutorial){result=T.comboBonus(result,attackChain);attackMatched ||= result.comboBonus.burst>0;attackChain=result.comboBonus.chain;bestChain=Math.max(bestChain,attackChain);battleDamage+=result.damage;showComboBonus(result.comboBonus);gravityUsed=result.usedGravity}combo+=groups.length;total+=result.damage;healed+=result.heal;
  const skill=groups.find(g=>g.skill);
  if(skill)skillFlash={start:performance.now(),name:tutorial?B.skills[skill.element]:B.spirits[skill.element].element+'属性・面攻撃',color:B.spirits[skill.element].color};
  const ids=new Set(foundGroups.flatMap(g=>g.ids));
  playBattleEffects(groups,result);
  refresh();await pause(950);if(token!==roundToken)return;
  enemyHp=Math.max(0,enemyHp-result.damage);hp=Math.min(maxHp(),hp+result.heal);
  battleVibration('attack',result.damage);
  byId('damageText').textContent=groups.length?(skill?'技発動！ ':combo+' COMBO · ')+(result.damage?'-'+result.damage:'回復 +'+result.heal):'攻撃済み · 灰色化';
  if(result.damage){byId('monster').classList.remove('hit');void byId('monster').offsetWidth;byId('monster').classList.add('hit')}
  byId('battleLog').textContent=tutorial?groups.map(g=>g.skill?B.skills[g.element]:B.spirits[g.element].name).join(' × ')+'！':groups.length?(result.details.join(' ／ ')||(result.heal?'チーム回復':'該当属性の仲間がいないため攻撃なし')):'この属性は攻撃済みです。そろったパネルを灰色にしました。';
  if(tutorial){byId('tutorialText').textContent=skill?'9体がすべて火属性！ 「サラマンダー・インフェルノ」発動。列攻撃の5倍の威力です。':'3手目で火の精霊が1列そろいました。サラマンダーが攻撃！ 光る列と敵HPに注目してください。'}
  refresh();await pause(tutorial||skill?1800:1100);if(token!==roundToken)return;
  if(tutorial)B.refill(state,ids,Math.random,B.pools.normal);
  else if(!refillAssistance){for(const s of state)if(ids.has(s.id)){s.spentOriginal=s.face;delete s.tempOriginal;s.face='X'}for(const g of foundGroups)spentElements.add(g.element)}
  else if(refillAssistance){const budget=turnMoves>=turnLimit?3:Math.max(1,turnLimit-turnMoves);Q.refill(state,ids,activePool(),attackKeys(),attackPolicy(),difficulty==='easy'?1:Math.min(3,budget),Math.random,teamConversion,difficulty,attackChain);balanceMetrics.refills++}
  else refillWithoutAssistance(ids);
  applyTemporaryConversion();refresh();if(enemyHp===0)break;
 }
 if(!tutorial&&!attackMatched&&!recoveryMatched)attackChain=0;
 byId('battleLog').textContent=combo?combo+' COMBO / '+total+' ダメージ'+(!tutorial&&attackChain>1?' / CHAIN '+attackChain:'')+(healed?' / 回復 +'+healed:''):challengeShortfall>=0?challengeGoal+'列チャレンジ：'+challengeShortfall+'列成立。同時に'+challengeGoal+'列そろうと攻撃！':'そろわなかった！';
 if(enemyHp===0){
  await pause(550);if(token!==roundToken)return;
  if(!tutorial||wave===2){phase='victory';byId('battleLog').textContent='CLEAR！ '+currentEnemy().name+'を撃破。'+(!tutorial?'想定報酬 '+dungeon.reward+'素材（試算のみ・所持数への加算なし）':'');endTeamTurn();refresh();if(!tutorial)showVictory();return}
  wave++;enemyTurns=0;B.cleanse(state,obstacles,activePool());enemyHp=B.enemies[wave].hp;hp=Math.min(1800,hp+250);byId('battleLog').textContent='次の敵が現れた！ HP +250・妨害解除';
 }else{
  if(turnMoves<turnLimit){phase='ready';refresh();return}
  const incoming=tutorial?currentEnemy().attack:T.incoming(squad,currentEnemy(),enemyTurns+1,tuning,teamImmune||manualImmune,teamShield);
  battleEffects.push({start:performance.now()-950,token:roundToken,counter:true,value:incoming,key:'R',skill:false,points:[]});
  hp=Math.max(0,hp-incoming);
  battleVibration('hit',incoming);
  byId('battleLog').textContent+=' ／ 反撃 -'+incoming+((teamImmune||manualImmune)?'（無敵）':'');
  if(hp===0){phase='lost';refresh();return}
  if(!tutorial){B.tick(state,obstacles);enemyTurns++;endTeamTurn();openFaces=false;if(enemyObstaclesEnabled&&enemyTurns%3===1){if(Q.safeHinder(state,dungeon.obstacle,obstacles,attackKeys(),attackPolicy(),3)){byId('battleLog').textContent+=' ／ 敵が妨害を発動！'}else{balanceMetrics.rejectedObstacles++;byId('battleLog').textContent+=' ／ 逃げ道を保証できない妨害は見送り'}}}
 }
 history=[];turnMoves=0;turnLimit=3;clockUsed=false;openFaces=false;phase='ready';refresh();
}
for(const [face,f] of Object.entries(E.faces)){
  const group=document.createElement('div');group.className='face-control';
  const label=document.createElement('span');label.innerHTML='<i style="background:'+f.color+'"></i>'+f.name+' '+face;group.append(label);
  for(const dir of [1,-1]){const b=document.createElement('button');b.textContent=dir===1?'↻':'↺';b.dataset.face=face;b.setAttribute('aria-label',f.name+'面を'+(dir===1?'時計回り':'反時計回り'));b.onclick=()=>chooseMove(face,dir);group.append(b)}byId('controls').append(group);
}
byId('reset').onclick=()=>{if(tutorial)endTutorial();reset()};
byId('applyDifficulty').onclick=()=>{if(tutorial||active||phase==='resolving')return;difficulty=byId('difficulty').value;customColorCount=null;reset()};
function useBoardSkill(kind){
 if(tutorial||active||queue.length||phase!=='ready'||!skillUses[kind])return;
 let text;
 if(kind==='convert'){const count=B.convert(state,'R','B');if(!count)return;text='ウンディーネの色変換！ 赤'+count+'個を青に変えた。'}
 else if(kind==='shuffle'){B.shuffle(state);text='シルフの旋風！ 固定・お邪魔以外の属性をシャッフル。'}
 else if(kind==='clock'){if(clockUsed)return;turnLimit+=2;clockUsed=true;text='クロノの時渡り！ このターンは5手まで動かせます。'}
 else if(kind==='cleanse'){if(!obstructed())return;B.cleanse(state,obstacles,activePool());text='リベラの解呪！ 固定・お邪魔・列封印・敵の面制限を解除。'}
 else if(kind==='open'){if(openFaces)return;openFaces=true;text='アストラの領域展開！ このターンは全6面で攻撃可能。列封印は解除されません。'}
 skillUses[kind]--;history=[];byId('battleLog').textContent=text;refresh();
 canvas.classList.remove('board-change');void canvas.offsetWidth;canvas.classList.add('board-change');
}
byId('convertSkill').onclick=()=>useBoardSkill('convert');
byId('shuffleSkill').onclick=()=>useBoardSkill('shuffle');
byId('clockSkill').onclick=()=>useBoardSkill('clock');
byId('cleanseSkill').onclick=()=>useBoardSkill('cleanse');
byId('openSkill').onclick=()=>useBoardSkill('open');
document.querySelectorAll('[data-obstacle]').forEach(b=>b.onclick=()=>{if(tutorial||active||queue.length||phase!=='ready')return;B.hinder(state,b.dataset.obstacle,obstacles);history=[];byId('battleLog').textContent='試作ラボ：'+b.textContent+'を発生させました。';refresh()});
byId('enemyObstacles').onchange=()=>{
 if(tutorial||active||queue.length||phase!=='ready'){byId('enemyObstacles').value=enemyObstaclesEnabled?'on':'off';return}
 enemyObstaclesEnabled=byId('enemyObstacles').value==='on';
 if(!enemyObstaclesEnabled){B.cleanse(state,obstacles,activePool());applyTemporaryConversion();history=[]}
 byId('battleLog').textContent=enemyObstaclesEnabled?'敵の妨害：ON。敵ごとの妨害が発生します。':'敵の妨害：OFF。現在の妨害も解除しました。通常攻撃は継続します。';
 refresh();
};
byId('attack').hidden=true;
byId('attack').style.display='none';
byId('undo').hidden=true;
byId('undo').style.display='none';
byId('hint').onclick=()=>{
 const proof=boardProof();
 byId('battleLog').textContent=proof.moves?proof.moves.map((m,i)=>(i+1)+'. '+E.slices[m.face].name+'層 '+(m.dir===1?'↻':'↺')).join(' → ')+'（途中で消去が発生しない検証済み手順）':'確実な手順は未確認です。救済で盤面を再配置できます。';
 if(proof.moves?.length){
  const move=proof.moves[0];
  selectLayer(move.face);
  pendingMove={face:move.face,dir:move.dir,board:JSON.stringify(state)};
  previewDir=move.dir;updateGuide();
  if(arrowsUnlocked&&!dragHint.classList.contains('is-complete'))dragHint.innerHTML=tapHintIcon+(mousePrimary?'<span>光っている矢印を1クリックで回転</span>':'<span>光っている矢印をタップすると回転するよ</span>');
 }
};
byId('rescue').onclick=()=>{
 if(tutorial||active||queue.length||phase!=='ready'||shuffleCharges===0)return;
 // Explicit limited recovery: reset the board only, not HP, enemy turn, or cooldowns.
 const rescuePolicy={faces:openFaces?Object.keys(E.faces):baseRule==='front'?['F']:baseRule==='visible'?['U','F','R']:Object.keys(E.faces)};
 const result=activePool().length===6?rubikSixStart():Q.initial(activePool(),attackKeys(),rescuePolicy,'easy');
 if(!result.state){byId('battleLog').textContent='攻撃属性と出現色が合いません。編成・難易度を変更してください。';return}
 state=result.state;obstacles={seals:[],restrict:0};teamConversion=null;proofCache=null;history=[];balanceMetrics.repairs++;shuffleCharges--;
 byId('battleLog').textContent='再配置：色を再生成して妨害と一時変換を解除。HP・残り手数・技の待ち時間・チェインは維持。残り'+shuffleCharges+'回。';refresh();
};
byId('passTurn').onclick=()=>{if(tutorial||active||queue.length||phase!=='ready')return;turnMoves=turnLimit;resolveTurn()};
byId('undo').onclick=()=>{if(active||queue.length||!history.length||phase!=='ready')return;const m=history[history.length-1];queue.push({face:m.face,dir:-m.dir,kind:'undo'})};
addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;const f=e.key.toUpperCase();if(E.slices[f]){e.preventDefault();userMove(f,e.shiftKey?-1:1)}});
function inside(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function pickLayers(e){const p=boardPointer(e);let sticker;
 // The cube surface is for camera dragging only; arrows select rotation guides.
 if(p[1]>380)return [];
 const scale=orbitDisplayScale();p[0]=300+(p[0]-300)/scale;p[1]=250+(p[1]-250)/scale;
 let d=11;for(const s of state){const q=E.orbit(s),n=Math.hypot(p[0]-q[0],p[1]-q[1]);if(n<d){sticker=s;d=n}}
 if(sticker){const faces=Object.keys(E.faces).filter(f=>sticker.p[E.slices[f].axis]===E.slices[f].layer);faces.sort((a,b)=>(sticker.n[E.slices[b].axis]===E.slices[b].layer)-(sticker.n[E.slices[a].axis]===E.slices[a].layer));return faces}
 let near=null,distance=12;for(const ring of ringHits)for(const q of ring.points){const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<distance){near=ring.face;distance=d}}return near?[near]:[];
}
function confirmMove(){if(!pendingMove)return;const m=pendingMove;if(m.board!==JSON.stringify(state)){pendingMove=null;updateGuide();return}userMove(m.face,m.dir);updateGuide()}
function finishArrowOnboarding(){
 guidedArrowKey=null;arrowGuideActive=false;dragHint.classList.remove('arrow-step');dragHint.classList.add('is-complete');
}
function isMouseActivation(e){return e.pointerType==='mouse'||(!e.pointerType&&mousePrimary)}
function chooseMove(face,dir,instant=false,touch=false){
 if(panelPick||!arrowsUnlocked||tutorial||turnMoves>=turnLimit||!B.canRotate(state,face))return;
 if(active||queue.length||phase!=='ready'){
  if(touch){queuedTouchMove={face,dir};byId('battleLog').textContent='次の回転を予約しました。攻撃・補充の後に続けて回転します。'}
  return
 }
 if(instant){pendingMove=null;selectedLayer=null;hoverLayer=null;previewDir=0;finishArrowOnboarding();userMove(face,dir);updateGuide();return}
 if(pendingMove?.face===face&&pendingMove.dir===dir){guidedArrowKey=null;arrowGuideActive=false;dragHint.classList.remove('arrow-step');dragHint.classList.add('is-complete');confirmMove();return}
 arrowGuideActive=!dragHint.classList.contains('is-complete');guidedArrowKey=face+':'+dir;dragHint.innerHTML=secondTapHintMarkup;dragHint.classList.add('arrow-step');requestAnimationFrame(placeCubeTouch);
 selectLayer(face);pendingMove={face,dir,board:JSON.stringify(state)};previewDir=dir;updateGuide();
 byId('guideText').textContent=E.slices[face].name+'層：'+(dir===1?'↻':'↺')+' をプレビュー中。同じ矢印を再タップ、または決定。';
}
function boardClick(e){
 if(suppressCubeClick){suppressCubeClick=false;return}
 if(panelPick){
  const p=boardPointer(e);if(compactBoard)p[1]-=30;
  const hit=[...hitFaces].reverse().find(h=>inside(p,h.points));if(!hit)return;
  const id=hit.sticker.id;panelPick.ids.has(id)?panelPick.ids.delete(id):panelPick.ids.add(id);
  if(panelPick.ids.size<4){byId('battleLog').textContent=panelPick.char.name+'：水に変えるパネルを4個タップ（'+panelPick.ids.size+' / 4）';refresh();return}
  const picked=panelPick,c=picked.char;for(const s of state)if(picked.ids.has(s.id)){s.face='B';delete s.tempOriginal;delete s.spentOriginal}
  panelPick=null;cooldowns[c.id]=c.cd;teamSpent.add(c.id);history=[];byId('battleLog').textContent=c.name+'：'+c.skill+' ／ 4パネルを水に変換！';refresh();return;
 }
 if(!arrowsUnlocked||tutorial)return;const arrow=arrowAt(e);if(arrow){const touch=e.pointerType==='touch';chooseMove(arrow.face,arrow.dir,isMouseActivation(e)||touch,touch);return}if(active||phase!=='ready')return;const faces=pickLayers(e);if(faces.length)selectLayer(faces[0],faces)
}
function handleCanvasTouch(clientX,clientY){
 const now=performance.now(),point=[clientX,clientY];
 if(lastCanvasTouchPoint&&now-lastCanvasTouchAt<420&&Math.hypot(point[0]-lastCanvasTouchPoint[0],point[1]-lastCanvasTouchPoint[1])<24)return;
 lastCanvasTouchAt=now;lastCanvasTouchPoint=point;ignoreCanvasClickUntil=now+1800;
 boardClick({clientX,clientY,pointerType:'touch'});
}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;handleCanvasTouch(e.clientX,e.clientY)});
canvas.addEventListener('touchstart',e=>{const touch=e.changedTouches&&e.changedTouches[0];if(!touch||!arrowAt(touch))return;e.preventDefault();handleCanvasTouch(touch.clientX,touch.clientY)},{passive:false});
canvas.addEventListener('click',e=>{if(performance.now()<ignoreCanvasClickUntil)return;boardClick(e)});
canvas.addEventListener('pointermove',e=>{if(!arrowsUnlocked||e.pointerType==='touch')return;const arrow=arrowAt(e);if(arrow){hoverLayer=arrow.face;previewDir=arrow.dir;updateGuide();return}previewDir=0;hoverLayer=selectedLayer?null:pickLayers(e)[0]||null;updateGuide()});
canvas.addEventListener('pointerleave',()=>{hoverLayer=null;previewDir=0;updateGuide()});
for(const [id,dir] of [['guideCW',1],['guideCCW',-1]]){const b=byId(id);b.onclick=e=>{if(selectedLayer)chooseMove(selectedLayer,dir,isMouseActivation(e))};b.onpointerenter=b.onfocus=()=>{previewDir=dir};b.onpointerleave=b.onblur=()=>{previewDir=0}}
byId('guideCancel').onclick=()=>{pendingMove=null;selectedLayer=null;hoverLayer=null;previewDir=0;byId('layerChoices').replaceChildren();updateGuide()};
document.querySelectorAll('[data-face]').forEach(b=>{b.onclick=e=>chooseMove(b.dataset.face,b.textContent==='↻'?1:-1,isMouseActivation(e));b.onpointerenter=b.onfocus=()=>{hoverLayer=b.dataset.face;previewDir=b.textContent==='↻'?1:-1;updateGuide()};b.onpointerleave=b.onblur=()=>{hoverLayer=null;previewDir=0;updateGuide()}});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(panelPick){panelPick=null;byId('battleLog').textContent='パネル選択を解除しました。';refresh()}byId('guideCancel').click()}});
function startTutorial(){
 if(tutorial||active||phase!=='ready')return;
 const saved=structuredClone({state,history,moves,hp,wave,enemyHp,phase,turnMoves,combo,turnLimit,clockUsed,openFaces,obstacles,enemyTurns,skillUses});
 const log=byId('battleLog').textContent,damage=byId('damageText').textContent;
 tutorial={saved,log,damage,part:0,step:0,busy:false,done:false};
 byId('tutorial').hidden=false;byId('tutorialStart').hidden=true;
 document.body.classList.add('tutorial-mode');loadTutorialPart(false);
}
function loadTutorialPart(full){
 roundToken++;const data=B.tutorialBoard(E,full);
 turnLimit=3;clockUsed=false;openFaces=false;obstacles={seals:[],restrict:0};enemyTurns=0;
 state=data.state;active=null;queue=[];history=[];moves=0;hp=1800;wave=0;enemyHp=B.enemies[0].hp;phase='ready';turnMoves=0;fx=null;skillFlash=null;
 // A prepared final-move example avoids clearing a partial face before the skill demonstration.
 for(const m of data.steps.slice(0,2))E.move(state,m.face,m.dir);
 turnMoves=2;tutorial.part=full?1:0;tutorial.step=2;tutorial.steps=data.steps;tutorial.done=false;
 byId('tutorialTitle').textContent=full?'LESSON 2 / 2 · 1面で技発動':'LESSON 1 / 2 · 1列で攻撃';
 byId('tutorialText').textContent=full?'面攻撃を確認するための専用配置です。最後の1手を回し、9個がそろうと自動で技が発動します。':'毎手、自動で攻撃判定し、通常は3手ごとに敵が行動します。この専用配置で最後の1手を回して、列攻撃を確認しましょう。';
 byId('battleLog').textContent='デモ専用の配置です。終了すると元の対戦に戻ります。';byId('damageText').textContent='';
 renderParty();updateTutorial();refresh();
}
function updateTutorial(){
 byId('turnDots').textContent=[1,2,3].map(i=>(tutorial.step>=i?'●':'○')+' '+i+'手目').join('　');
 byId('tutorialNext').disabled=tutorial.busy;
 byId('tutorialNext').textContent=tutorial.busy?'回転・攻撃を再生中…':tutorial.done?(tutorial.part===0?'次は「1面の技」を見る':'デモを終えて遊ぶ'):(tutorial.step+1)+'手目を見る →';
}
async function nextTutorial(){
 if(!tutorial||tutorial.busy)return;
 if(tutorial.done){if(tutorial.part===0)loadTutorialPart(true);else endTutorial();return}
 const current=tutorial,token=roundToken,m=tutorial.steps[tutorial.step];
 tutorial.busy=true;tutorial.step++;
 byId('tutorialText').textContent=tutorial.step+'手目：'+E.slices[m.face].name+'面を'+(m.dir===1?'時計回り':'反時計回り')+'に回します。'+(tutorial.step<3?'まだ攻撃しません。残り'+(3-tutorial.step)+'手で配置を整えます。':'これが最後の1手。回転後、自動で攻撃判定します。');
 updateTutorial();queue.push({...m,kind:'user',duration:1200});
 while(tutorial===current&&token===roundToken&&(queue.length||active||phase==='resolving'))await pause(60);
 if(tutorial!==current||token!==roundToken)return;
 tutorial.busy=false;
 if(tutorial.step===3){
  tutorial.done=true;
  byId('tutorialText').textContent=tutorial.part===0?'1列がそろって攻撃できました！ 1手動かすたびに、どこかの面で縦か横の3体がそろえば自動で攻撃します。次は、1面すべてをそろえる技を見ましょう。':'1面9体がそろい、サラマンダー・インフェルノが発動しました！ 列攻撃は3体、技は1面9体。3手でどちらを狙うか考えてみましょう。';
 }
 updateTutorial();
}
function endTutorial(){
 if(!tutorial)return;
 roundToken++;const t=tutorial,s=t.saved;
 turnLimit=s.turnLimit;clockUsed=s.clockUsed;openFaces=s.openFaces;obstacles=s.obstacles;enemyTurns=s.enemyTurns;skillUses=s.skillUses;
 state=s.state;history=s.history;moves=s.moves;hp=s.hp;wave=s.wave;enemyHp=s.enemyHp;phase=s.phase;turnMoves=s.turnMoves;combo=s.combo;active=null;queue=[];fx=null;skillFlash=null;tutorial=null;
 byId('tutorial').hidden=true;byId('tutorialStart').hidden=false;document.body.classList.remove('tutorial-mode');
 byId('battleLog').textContent=t.log;byId('damageText').textContent=t.damage;renderParty();refresh();
}
byId('tutorialStart').onclick=startTutorial;
byId('tutorialNext').onclick=nextTutorial;
byId('tutorialExit').onclick=endTutorial;
function playBattleEffects(groups,result){
 const start=performance.now();
 groups.forEach((g,i)=>battleEffects.push({start,token:roundToken,key:g.element,skill:!!g.skill,value:result.attacks[i].value,heal:g.element==='D',index:i,bonus:result.comboBonus?.multiplier||1,points:state.filter(s=>g.ids.includes(s.id)).map(E.orbit)}));
}
function drawBattleEffects(now){
 const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),c=effectContext;
 if(effectCanvas.width!==Math.round(w*dpr)||effectCanvas.height!==Math.round(h*dpr)){effectCanvas.width=Math.round(w*dpr);effectCanvas.height=Math.round(h*dpr);c.setTransform(dpr,0,0,dpr,0,0)}
 c.clearRect(0,0,w,h);
 battleEffects=battleEffects.filter(e=>e.token===roundToken&&now-e.start<2600);
 if(!battleEffects.length)return;
 const board=canvas.getBoundingClientRect(),enemy=byId('monster').getBoundingClientRect(),player=byId('playerBar').getBoundingClientRect();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const e of battleEffects){
  const age=now-e.start,impact=(age-950)/1400,color=e.counter?'#ff6883':B.spirits[e.key].color;
  const rect=e.heal||e.counter?player:enemy;
  const target=[clamp(rect.left+rect.width/2,45,w-45),clamp(rect.top+rect.height/2,70,h-70)];
  const size=e.skill?1.85:1;
  c.save();c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.fillStyle=color;
  if(e.bonus>1&&e.index===0&&impact>0&&impact<1&&!reducedMotion.matches){c.save();c.strokeStyle='#ffe4a0';c.globalAlpha=(1-impact)*.7;for(let ring=0;ring<3;ring++){c.lineWidth=3-ring*.7;c.beginPath();c.arc(...target,18+impact*(100+ring*32),0,Math.PI*2);c.stroke()}for(let i=0;i<16;i++){const a=i*Math.PI/8,r=35+impact*160;c.beginPath();c.moveTo(target[0]+Math.cos(a)*r,target[1]+Math.sin(a)*r);c.lineTo(target[0]+Math.cos(a)*(r+12),target[1]+Math.sin(a)*(r+12));c.stroke()}c.restore()}
  if(age<950&&!e.counter){
   const t=clamp((age-300)/650,0,1);
   e.points.forEach((point,i)=>{
    const v=boardViewport(),shown=orbitDisplayPoint(point),source=[board.left+(shown[0]-v.x)*board.width/v.w,board.top+(shown[1]-v.y)*board.height/v.h];
    c.globalAlpha=(1-t)*.8;c.lineWidth=2;c.beginPath();c.arc(source[0],source[1],(10+age/35)*board.width/600,0,Math.PI*2);c.stroke();
    if(age<300||reducedMotion.matches)return;
    const bend=(i%2?1:-1)*(35+i*6),at=u=>[source[0]+(target[0]-source[0])*u+Math.sin(u*Math.PI)*bend,source[1]+(target[1]-source[1])*u-70*Math.sin(u*Math.PI)];
    const p=at(t);c.globalAlpha=.9;c.shadowColor=color;c.shadowBlur=15;
    c.beginPath();for(let k=0;k<10;k++){const q=at(Math.max(0,t-k*.016));k?c.lineTo(...q):c.moveTo(...q)}c.lineWidth=(e.skill?6:3)*(1-t*.4);c.stroke();
    c.beginPath();c.arc(...p,(e.skill?7:4),0,Math.PI*2);c.fill();c.shadowBlur=0;
   });
  }
  if(impact>=0){
   const fade=Math.max(0,1-impact),spread=Math.min(1,impact*2.2),x=target[0],y=target[1];
   c.globalAlpha=fade;
   if(!reducedMotion.matches){
    const glow=c.createRadialGradient(x,y,0,x,y,85*size);glow.addColorStop(0,color+'99');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(x-85*size,y-85*size,170*size,170*size);c.fillStyle=color;
    c.lineWidth=3*(1-spread)+1;c.beginPath();c.arc(x,y,12+spread*65*size,0,Math.PI*2);c.stroke();
    const particles=e.skill?30:16;
    for(let i=0;i<particles;i++){
     const a=i*2.39996,dist=(22+(i%5)*14)*spread*size,px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist+(e.key==='R'?-30*impact:15*impact),r=(3+i%4)*fade*size;
     c.save();c.translate(px,py);c.rotate(a+impact);
     if(e.key==='L'){c.fillRect(-r,-r,r*2,r*2)}
     else if(e.key==='U'){c.lineWidth=2;c.beginPath();c.moveTo(-r*2,0);c.lineTo(r*2,0);c.moveTo(0,-r*2);c.lineTo(0,r*2);c.stroke()}
     else if(e.key==='F'){c.beginPath();c.arc(0,0,r*2,0,Math.PI*1.3);c.stroke()}
     else if(e.key==='D'){c.font=(r*4+5)+'px sans-serif';c.fillText('♥',-r,r)}
     else if(e.key==='R'){c.beginPath();c.moveTo(0,-r*2.6);c.quadraticCurveTo(r*2,r,r*.4,r);c.quadraticCurveTo(-r*2,r,0,-r*2.6);c.fill()}
     else{c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke()}
     c.restore();
    }
   }
   const offset=(e.index||0)*24;
   c.globalAlpha=Math.min(1,fade*2);c.textAlign='center';c.font='900 '+(e.skill?34:26)+'px system-ui';c.strokeStyle='#111827';c.lineWidth=5;c.fillStyle=e.heal?'#b0ffd4':e.counter?'#ff829b':'#fff1bd';
   const text=(e.heal?'+':'−')+e.value,ty=y-32-impact*38-offset;
   c.strokeText(text,x,ty);c.fillText(text,x,ty);
   if(e.skill){c.font='bold 13px system-ui';c.fillStyle=color;c.fillText('必殺技！',x,ty-33)}
  }
  c.restore();
 }
}
function resize(){compactBoard=matchMedia('(max-width:600px)').matches;E.setOrbitSpacing(compactBoard?28:22);guideCache=null;const dpr=Math.min(devicePixelRatio||1,2),v=boardViewport();canvas.width=v.w*dpr;canvas.height=v.h*dpr;canvas.style.aspectRatio=v.w+'/'+v.h;ctx.setTransform(dpr,0,0,dpr,-v.x*dpr,-v.y*dpr)}
byId('monster').innerHTML='<img class="enemy-sprite" src="enemy-dragon.png" width="1254" height="1254" alt="赤い鱗と黄金の角・鎧を持つドラゴン" decoding="async" draggable="false">';
function renderParty(){byId('party').replaceChildren();const keys=tutorial?B.pools.normal:activePool();byId('party').style.gridTemplateColumns='repeat('+keys.length+',minmax(0,1fr))';for(const key of keys){const s=B.spirits[key],card=document.createElement('div'),portrait=document.createElement('canvas');portrait.width=80;portrait.height=80;portrait.style.width='40px';portrait.style.height='40px';portrait.setAttribute('aria-label',s.element+'属性');drawSpirit(portrait.getContext('2d'),key,40,40,31);card.append(portrait);const name=document.createElement('span');name.textContent=s.element;card.title=s.element+'属性 / '+s.name;card.append(name);byId('party').append(card)}}
const renderAttributeParty=renderParty;
renderParty=function(){if(tutorial){renderAttributeParty();return}byId('party').replaceChildren();byId('party').style.gridTemplateColumns='repeat(5,minmax(0,1fr))';for(const c of T.members(squad)){const card=document.createElement('div'),icon=document.createElement('canvas');icon.width=80;icon.height=80;icon.style.width='40px';drawSpirit(icon.getContext('2d'),c.element,40,40,31);const label=document.createElement('span');label.textContent=c.name;card.title=c.passive;card.append(icon,label);byId('party').append(card)}};
function refreshSquad(){
 const stats=T.stats(squad,tuning);byId('squadStats').textContent='適用中：HP '+stats.hp+' ／ 防御 '+stats.def+' ／ 回復 '+stats.recovery+' ／ 雷加算＋'+stats.thunder+' ／ 同属性1体追加につき＋'+tuning.synergy+'％';
 const absent=[...new Set(stats.chars.map(c=>c.element))].filter(e=>!activePool().includes(e));byId('dungeonTip').textContent=dungeon.tip+(absent.length?' ⚠ 現在の色数に '+absent.map(e=>B.spirits[e].element).join('・')+' がありません。技の変換またはHardを使ってください。':'');
 for(const b of byId('squadSkills').querySelectorAll('button')){const c=T.roster.find(c=>c.id===b.dataset.char),wait=cooldowns[c.id]||0;b.disabled=!!panelPick||!!tutorial||!!active||!!queue.length||phase!=='ready'||wait>0;b.style.setProperty('--element',B.spirits[c.element].color);b.title=c.passive+' ／ '+c.skill+' ／ 再使用'+c.cd+'ターン';b.innerHTML='<span class="skill-name">'+c.name+'<em>'+B.spirits[c.element].element+'</em></span><span class="skill-description">'+c.skill+'</span><span class="skill-ready">'+(wait?'あと '+wait+' ターン':'発動する')+'</span>'}
 byId('applySquad').disabled=!!tutorial||!!active||phase==='resolving';
}
function buildSquadSkills(){byId('squadSkills').replaceChildren();for(const c of T.members(squad)){const b=document.createElement('button');b.dataset.char=c.id;b.onclick=()=>useCharacterSkill(c);byId('squadSkills').append(b)}}
function useCharacterSkill(c){
 if(tutorial||active||queue.length||phase!=='ready'||cooldowns[c.id]>0)return;
 const conversions={fireWater:['R','B'],windFire:['F','R'],earthThunder:['L','U'],thunderDark:['U','V']};
 if(conversions[c.action]){if(teamConversion){byId('battleLog').textContent='属性変換は1ターン1種類まで。次のターンに使えます。';return}teamConversion=conversions[c.action];applyTemporaryConversion()}
 if(c.action==='waterFour'){panelPick={char:c,ids:new Set()};pendingMove=null;history=[];byId('battleLog').textContent='セレーネ：水に変えるパネルを4個タップ（0 / 4）';refresh();return}
 if(c.action==='clock')turnLimit+=2;
 if(c.action==='enemyDelay')turnLimit+=2;
 if(c.action==='shuffle'){if(teamConversion){byId('battleLog').textContent='一時変換中はシャッフルできません。次のターンに使用してください。';return}B.shuffle(state)}
 if(c.action==='open')openFaces=true;
 if(c.action==='immune')teamImmune=true;
 if(c.action==='shield')teamShield=true;
 if(c.action==='heal')hp=Math.min(maxHp(),hp+Math.round(maxHp()*.3));
 if(c.action==='cleanse')B.cleanse(state,obstacles,activePool());
 if(c.action==='fireBoost')teamBuffs.R=1.5;
 if(c.action==='thunderBoost')teamBuffs.U=1.5;
 if(c.action==='pierce'){enemyHp=Math.max(0,enemyHp-tuning.fixed);battleDamage+=tuning.fixed;battleVibration('attack',tuning.fixed);byId('damageText').textContent='固定 −'+tuning.fixed;if(enemyHp===0){phase='victory';showVictory()}}
 cooldowns[c.id]=c.cd;teamSpent.add(c.id);history=[];byId('battleLog').textContent=c.name+'：'+c.skill+(phase==='victory'?' ／ CLEAR！':'');refresh();
}
function previewSlot(select,detail){const c=T.roster.find(c=>c.id===select.value);detail.textContent='HP '+c.hp+' / 攻撃 '+c.atk+' / 防御 '+c.def+' / 回復 '+c.recovery+'｜固有：'+c.passive+'｜技：'+c.skill+'（'+c.cd+'T）｜想定入手：'+c.source}
for(let i=0;i<5;i++){const box=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select'),detail=document.createElement('small');label.textContent=(i+1)+'体目 ';select.id='slot'+i;for(const c of T.roster){const o=document.createElement('option');o.value=c.id;o.textContent=B.spirits[c.element].element+'：'+c.name;select.append(o)}select.value=squad[i];select.onchange=()=>previewSlot(select,detail);label.append(select);box.append(label,detail);byId('squadSlots').append(box);previewSlot(select,detail)}
for(const d of T.dungeons){const o=document.createElement('option');o.value=d.id;o.textContent=d.name+'（HP '+d.hp+'／防御 '+d.def+'）';byId('dungeonSelect').append(o)}
for(const [key,label,min,max] of [['synergy','同属性追加1体あたり攻撃％',0,30],['thunder','雷攻撃力加算',0,100],['fireDef','火3体の防御加算',0,100],['fixed','固定ダメージ',10,150],['gravity','現在HP割合％',10,50]]){const row=document.createElement('label'),input=document.createElement('input');row.textContent=label;input.type='number';input.min=min;input.max=max;input.step=1;input.value=tuning[key];input.id='tune-'+key;row.append(input);byId('balanceKnobs').append(row)}
function readSetup(){const ids=Array.from({length:5},(_,i)=>byId('slot'+i).value);T.members(ids);const knobs={};for(const key in T.defaults){const el=byId('tune-'+key),n=Number(el.value);if(!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max))throw Error('調整値を指定の範囲にしてください');knobs[key]=n}return {ids,knobs,d:T.dungeons.find(d=>d.id===byId('dungeonSelect').value)}}
byId('applySquad').onclick=()=>{try{const s=readSetup();squad=s.ids;tuning=s.knobs;dungeon=s.d;buildSquadSkills();reset();byId('balanceReport').textContent='編成と調整値を適用しました。'}catch(e){byId('balanceReport').textContent=e.message;byId('squadStats').textContent=e.message}};
byId('compareTeams').onclick=()=>{try{const s=readSetup(),teams=[['選択編成',s.ids],['火3体',['sala','ignis','ember','lumina','libera']],['雷＋固定',['raika','volt','ferrum','lumina','libera']],['割合＋耐久',['nox','aqua','chrono','lumina','libera']]];byId('balanceReport').replaceChildren();for(const [name,ids] of teams){const groups=[...new Set(T.members(ids).map(c=>c.element))].filter(e=>e!=='D').map(element=>({element}));const out=T.outcome(ids,groups,s.d,s.d.hp,false,s.knobs),st=T.stats(ids,s.knobs),row=document.createElement('p');row.textContent=name+'：想定1巡 '+out.damage+'ダメージ ／ HP '+st.hp+' ／ 通常反撃 '+T.incoming(ids,s.d,1,s.knobs)+' ／ 第3反撃 '+T.incoming(ids,s.d,3,s.knobs);byId('balanceReport').append(row)}const full=T.outcome(s.ids,[{element:'V',skill:true}],s.d,s.d.hp,false,s.knobs);const row=document.createElement('p');row.textContent='選択編成の闇1面：'+full.damage+'ダメージ（ノクス未編成なら割合効果なし）。';byId('balanceReport').append(row)}catch(e){byId('balanceReport').textContent=e.message}};
const probe=document.createElement('details');probe.className='squad-panel';probe.innerHTML='<summary>能力テスト：前面に列・面を作る</summary><p>テスト専用。現在の盤面の前面を書き換え、攻撃判定を押せる状態にします。妨害・攻撃面条件は維持します。</p><label>属性 <select id="probeElement"></select></label><button id="probeRow">前面に1列を準備</button> <button id="probeFace">前面に1面を準備</button>';
byId('squadSlots').parentElement.append(probe);for(const [key,s] of Object.entries(B.spirits)){if(key==='J')continue;const o=document.createElement('option');o.value=key;o.textContent=s.element;byId('probeElement').append(o)}
for(const [id,full] of [['probeRow',false],['probeFace',true]])byId(id).onclick=()=>{if(tutorial||active||queue.length||phase!=='ready')return;for(const s of state.filter(s=>s.n[2]===1&&(full||s.p[1]===1))){delete s.tempOriginal;s.face=byId('probeElement').value}applyTemporaryConversion();history=[];byId('battleLog').textContent='能力テスト用の配置を準備しました。1手回すと自動判定します。';refresh()};
byId('party').after(document.querySelector('.squad-skills'));
// Battle-first layout; editors stay available without covering the board.
const panel=document.querySelector('.panel'),boardShell=document.createElement('section');boardShell.className='board-shell';
canvas.before(boardShell);const boardTitle=document.createElement('div');boardTitle.className='board-heading';boardTitle.innerHTML='<span>THE ORBIT CHAMBER</span><strong>精霊の回転盤</strong>';boardShell.append(boardTitle,canvas,byId('moveGuide'));
const orbitToggle=document.createElement('button');orbitToggle.id='orbitToggle';orbitToggle.className='orbit-toggle';orbitToggle.textContent='2D表示 ▸ 開く';orbitToggle.setAttribute('aria-expanded','false');canvas.before(orbitToggle);
orbitToggle.onclick=()=>{if(challengeMode&&orbitExpanded){byId('battleLog').textContent='2Dチャレンジ中は2D盤面を使って解きます。';return}orbitExpanded=!orbitExpanded;orbitToggle.textContent=orbitExpanded?'2D表示 ▾ 閉じる':'2D表示 ▸ 開く';orbitToggle.setAttribute('aria-expanded',String(orbitExpanded));resize();placeCubeTouch()};
function setChallengeMode(on){challengeMode=!!on;if(challengeMode&&!orbitExpanded){orbitExpanded=true;orbitToggle.textContent='2D表示 ▾ 閉じる';orbitToggle.setAttribute('aria-expanded','true')}byId('battleLog').textContent=challengeMode?'2DチャレンジON：3Dパネルを隠しました。2D盤面を見てそろえよう。':'2DチャレンジOFF：3Dパネルを通常表示に戻しました。';resize();placeCubeTouch()}
function scrambledLargeCube(size){
 let fallback=null;
 for(let attempt=0;attempt<64;attempt++){
  const candidate=B.rubikBoard(E,Math.random,B.pools.normal,0),keys=Object.keys(E.slices);let previous='';
  for(let i=0;i<(size===4?36:48);i++){
   const choices=keys.filter(key=>key!==previous),face=choices[Math.floor(Math.random()*choices.length)];
   E.move(candidate,face,Math.random()<.5?-1:1);previous=face;
  }
  fallback ||= candidate;
  const faceDiversity=Object.values(E.faces).map(f=>new Set(candidate.filter(s=>s.n[f.axis]===Math.sign(f.layer)).map(s=>s.face)).size);
  if(!B.matches(candidate).length&&faceDiversity.every(count=>count>=4))return candidate;
 }
 return fallback;
}
function setLineChallenge(lines){
 const next=lineChallenge===lines?0:lines;
 if(!lineChallenge&&next)lineChallengeSetup={colorCount:customColorCount,rule:byId('attackRule').value};
 lineChallenge=next;attackChain=0;byId('damageText').textContent='';
 if(!lineChallenge){
  E.configure(3);
  if(lineChallengeSetup){customColorCount=lineChallengeSetup.colorCount;byId('attackRule').value=lineChallengeSetup.rule;lineChallengeSetup=null}
  reset();syncColorCountDisplay();byId('battleLog').textContent='列チャレンジOFF：通常の盤面に戻しました。';refresh();return
 }
 // Reset the regular battle while the engine is still 3×3; planning a 5×5
 // board as if it were a normal random battle is needlessly expensive.
 E.configure(3);
 customColorCount=6;const colorControl=byId('colorCount');if(colorControl){colorControl.value='6';syncColorCountDisplay()}
 byId('attackRule').value='front';reset();E.configure(lineChallenge);
 state=scrambledLargeCube(lineChallenge);
 canvas.dataset.cubeSize=String(lineChallenge);canvas.dataset.faceDiversity=Object.values(E.faces).map(f=>new Set(state.filter(s=>s.n[f.axis]===Math.sign(f.layer)).map(s=>s.face)).size).join(',');
 history=[];proofCache=null;turnMoves=0;phase='ready';
 byId('battleLog').textContent=lineChallenge+'列チャレンジ開始：縦・横とも'+lineChallenge+'枚。合法な回転だけで十分にシャッフルした'+lineChallenge+'×'+lineChallenge+'キューブです。';refresh()
}
const orbitToolbar=document.createElement('div');orbitToolbar.className='orbit-toolbar';orbitToggle.before(orbitToolbar);
const colorLabel=document.createElement('label');colorLabel.className='color-count-control';colorLabel.textContent='属性 ';
const colorSelect=document.createElement('select');colorSelect.id='colorCount';colorSelect.setAttribute('aria-label','属性の種類数');colorSelect.title='色数を変更すると戦闘を再開始します';
for(let n=3;n<=11;n++){const option=document.createElement('option');option.value=n;option.textContent=n===6?'6色（ルービックキューブ）':n+'色';colorSelect.append(option)}colorSelect.value=activePool().length;
const syncColorCountDisplay=()=>colorLabel.classList.toggle('is-rubik',colorSelect.value==='6');syncColorCountDisplay();
colorLabel.append(colorSelect);orbitToolbar.append(colorLabel,orbitToggle);
colorSelect.onchange=()=>{syncColorCountDisplay();if(tutorial||active||queue.length||phase==='resolving')return;const count=Number(colorSelect.value);if(!Number.isInteger(count)||count<3||count>11)return;customColorCount=count;reset()};
// Keep internal selection controls for existing handlers, but remove the guide panel from the UI.
byId('moveGuide').style.setProperty('display','none','important');
const dragHint=document.createElement('div');dragHint.className='cube-drag-hint';
const dragHintMarkup='<svg viewBox="0 0 64 48" aria-hidden="true"><path class="swipe-track" d="M8 12h48m-43-5-5 5 5 5m38-10 5 5-5 5"/><g class="swipe-finger"><path d="M26 39 18 29q-3-5 2-5l6 5V13q0-6 5-6t5 6v10q7-3 11 3l-1 12-5 7H30Z"/></g></svg><span>ドラッグで見回す<small>手数は減りません</small></span>';
const tapHintIcon='<svg viewBox="0 0 64 48" aria-hidden="true"><path class="tap-ring" d="M9 24h20m-7-7 7 7-7 7"/><g class="tap-finger"><path d="M36 42 27 32q-3-5 2-6l5 5V15q0-6 5-6t5 6v9q8-2 10 5l-2 10-6 6Z"/></g></svg>';
const mousePrimary=matchMedia('(hover:hover) and (pointer:fine)').matches;
const arrowHintMarkup=tapHintIcon+(mousePrimary?'<span>同じ色・記号の矢印を選ぶ<small>1クリックで回転</small></span>':'<span>同じ色・記号の矢印をタップ<small>1タップで回転</small></span>');
const secondTapHintMarkup=tapHintIcon+'<span>2回目のタップで回転するよ</span>';
dragHint.innerHTML=dragHintMarkup;boardShell.append(dragHint);
const viewReset=document.createElement('button');viewReset.id='viewReset';viewReset.textContent='視点を元に戻す';viewReset.disabled=true;viewReset.style.cssText='display:block;margin:8px auto;font-size:11px';boardShell.append(viewReset);
const boardActions=document.createElement('div');boardActions.className='board-actions';viewReset.before(boardActions);boardActions.append(byId('rescue'),viewReset);
boardActions.before(dragHint);
const boardLeftActions=document.createElement('div');boardLeftActions.className='board-left-actions';boardActions.prepend(boardLeftActions);boardLeftActions.append(byId('hint'),byId('rescue'));
const immuneToggle=document.createElement('button');immuneToggle.id='immuneToggle';immuneToggle.textContent='無敵OFF';immuneToggle.title='自分の無敵をONにする';immuneToggle.setAttribute('aria-pressed','false');boardLeftActions.append(immuneToggle);
immuneToggle.onclick=()=>{manualImmune=!manualImmune;immuneToggle.textContent=manualImmune?'無敵ON':'無敵OFF';immuneToggle.title=manualImmune?'自分の無敵をOFFにする':'自分の無敵をONにする';immuneToggle.setAttribute('aria-pressed',String(manualImmune));byId('battleLog').textContent=manualImmune?'無敵をONにしました。敵の攻撃ダメージは0になります。':'無敵をOFFにしました。敵の攻撃ダメージを受けます。';refresh()};
orbitToolbar.append(viewReset);
const refillToggle=document.createElement('button');refillToggle.id='refillToggle';refillToggle.textContent='補充ON';refillToggle.title='補充ON：コンボしやすい属性を補充します';refillToggle.setAttribute('aria-pressed','true');orbitToolbar.append(refillToggle);
refillToggle.onclick=()=>{
 refillAssistance=!refillAssistance;
 if(refillAssistance){const used=state.filter(s=>s.face==='X'),ids=new Set(used.map(s=>s.id));if(ids.size)Q.refill(state,ids,activePool(),attackKeys(),attackPolicy(),2,Math.random,teamConversion,difficulty,attackChain);for(const s of used)delete s.spentOriginal;spentElements.clear();applyTemporaryConversion();refresh()}
 refillToggle.textContent=refillAssistance?'補充ON':'補充OFF';refillToggle.title=refillAssistance?'補充ON：コンボしやすい属性を補充します':'補充OFF：そろえたパネルは灰色になります';refillToggle.setAttribute('aria-pressed',String(refillAssistance));
 byId('battleLog').textContent=refillAssistance?'補充をONにしました。灰色パネルを属性パネルへ戻しました。':'補充をOFFにしました。各属性は最初の成立時だけ攻撃し、そろえたパネルは灰色になります。';
};
viewReset.onclick=()=>{pendingMove=null;viewYaw=viewHome.yaw;viewPitch=viewHome.pitch;updateView()};
const cubeTouch=document.createElement('div');cubeTouch.setAttribute('aria-label','立方体の視点操作。ドラッグで見回す。矢印キーでも視点を変更。');cubeTouch.tabIndex=0;cubeTouch.style.cssText='position:absolute;touch-action:none;cursor:grab;user-select:none;z-index:2;border-radius:12px';boardShell.append(cubeTouch);
function placeCubeTouch(){
 if(getComputedStyle(boardShell).position==='static')boardShell.style.position='relative';
 const w=canvas.clientWidth,h=canvas.clientHeight;
 const v=boardViewport();Object.assign(cubeTouch.style,{left:(canvas.offsetLeft+w*(202-v.x)/v.w)+'px',top:(canvas.offsetTop+h*((compactBoard?404:374)-v.y)/v.h)+'px',width:(w*312/v.w)+'px',height:(h*(compactBoard?274:292)/v.h)+'px'});
 const arrowTarget=dragHint.classList.contains('arrow-step')&&arrowHits.find(a=>a.face+':'+a.dir===guidedArrowKey);
 const hintPoint=arrowTarget
  ?(arrowTarget.p[0]<220?[arrowTarget.p[0]+92,arrowTarget.p[1]]:[arrowTarget.p[0],arrowTarget.p[1]-58])
  :[358,compactBoard?560:530];
 Object.assign(dragHint.style,{left:(canvas.offsetLeft+w*(hintPoint[0]-v.x)/v.w)+'px',top:(canvas.offsetTop+h*(hintPoint[1]-v.y)/v.h)+'px'});
}
function showArrowHint(){if(dragHint.classList.contains('is-complete')||pendingMove)return;const target=arrowHits.find(a=>a.p[0]<220&&B.canRotate(state,a.face));if(!target)return;guidedArrowKey=target.face+':'+target.dir;arrowGuideActive=true;dragHint.innerHTML=arrowHintMarkup;dragHint.classList.add('arrow-step');canvas.before(dragHint);requestAnimationFrame(()=>{placeCubeTouch();arrowsUnlocked=true})}
new ResizeObserver(placeCubeTouch).observe(canvas);
cubeTouch.addEventListener('pointerdown',e=>{
 if(tutorial||e.button!==0)return;
 // Recover from an interrupted iOS pointer sequence instead of leaving dragging locked.
 if(cubeDrag&&cubeDrag.id!==e.pointerId)cubeDrag=null;
 if(cubeDrag)return;
 suppressCubeClick=false;pendingMove=null;selectedLayer=null;hoverLayer=null;previewDir=0;
 cubeDrag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:viewYaw,pitch:viewPitch,moved:false};
 try{cubeTouch.setPointerCapture(e.pointerId)}catch(_){/* Safari can finish a gesture before capture. */}
});
cubeTouch.addEventListener('pointermove',e=>{
 if(!cubeDrag||e.pointerId!==cubeDrag.id)return;
 const dx=e.clientX-cubeDrag.x,dy=e.clientY-cubeDrag.y;
 if(!cubeDrag.moved&&Math.hypot(dx,dy)<6)return;
 pendingMove=null;cubeDrag.moved=true;cubeTouch.style.cursor='grabbing';
 viewYaw=cubeDrag.yaw-dx*.009;viewPitch=Math.max(-1.35,Math.min(1.35,cubeDrag.pitch+dy*.009));
 hoverLayer=null;previewDir=0;updateView();
});
function endCubeDrag(e){
 if(!cubeDrag||e.pointerId!==cubeDrag.id)return;
 const moved=cubeDrag.moved;suppressCubeClick=moved;cubeDrag=null;cubeTouch.style.cursor='grab';
 try{if(cubeTouch.hasPointerCapture(e.pointerId))cubeTouch.releasePointerCapture(e.pointerId)}catch(_){}
 if(moved)requestAnimationFrame(()=>requestAnimationFrame(showArrowHint));
 setTimeout(()=>{suppressCubeClick=false},350)
}
cubeTouch.addEventListener('pointerup',endCubeDrag);cubeTouch.addEventListener('pointercancel',endCubeDrag);cubeTouch.addEventListener('lostpointercapture',endCubeDrag);
addEventListener('pointerup',endCubeDrag,true);
// Tapping the cube never selects a face or layer. This overlay is camera-only.
cubeTouch.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();suppressCubeClick=false});
cubeTouch.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||tutorial)return;e.preventDefault();viewYaw+=(e.key==='ArrowLeft'?.2:e.key==='ArrowRight'?-.2:0);viewPitch=Math.max(-1.35,Math.min(1.35,viewPitch+(e.key==='ArrowUp'?.15:e.key==='ArrowDown'?-.15:0)));updateView()});
const viewNote=document.createElement('small');viewNote.textContent='キューブ端と同じ色・記号の矢印で操作。左はA〜C、下は1〜6。';viewNote.style.cssText='display:block;text-align:center;font-size:10px;color:#a9bcb5;line-height:1.6';boardShell.append(viewNote);
// Keep detailed rules available without reserving space on the phone battle screen.
byId('moveGuide').querySelector('small').textContent='光る帯だけが移動対象。方向を選んで回転、選択解除で閉じます。';
const settingsDrawer=document.createElement('details');settingsDrawer.className='settings-drawer';settingsDrawer.innerHTML='<summary>設定・操作説明・試作ツール</summary>';
const vibrationLabel=document.createElement('label'),vibrationSelect=document.createElement('select');vibrationLabel.textContent='攻撃・被ダメージ時の振動 ';vibrationSelect.id='vibrationSetting';for(const [value,text] of [['on','ON（初期設定）'],['off','OFF']]){const option=document.createElement('option');option.value=value;option.textContent=text;vibrationSelect.append(option)}vibrationSelect.value=vibrationEnabled?'on':'off';vibrationLabel.append(vibrationSelect);settingsDrawer.append(vibrationLabel);
const vibrationNote=document.createElement('small');vibrationNote.textContent='対応端末・ブラウザのみ振動します。設定はこの端末に保存します。';settingsDrawer.append(vibrationNote);
vibrationSelect.onchange=()=>{vibrationEnabled=vibrationSelect.value==='on';try{localStorage.setItem('rubimon.vibration',vibrationEnabled?'on':'off')}catch{}if(!vibrationEnabled&&typeof navigator.vibrate==='function'){try{navigator.vibrate(0)}catch{}}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&typeof navigator.vibrate==='function'){try{navigator.vibrate(0)}catch{}}});
const rule=document.querySelector('.rule-panel'),ruleLabel=rule.querySelector('label'),ruleNote=rule.querySelector('small');settingsDrawer.append(document.querySelector('.difficulty-settings'),ruleLabel,ruleNote,document.querySelector('.settings'),byId('controls'),byId('tutorialStart'));
for(const d of [...panel.children].filter(el=>el.tagName==='DETAILS'&&!el.classList.contains('squad-panel')))settingsDrawer.append(d);
const squadPanel=byId('squadSlots').parentElement;squadPanel.open=false;
panel.append(document.querySelector('.enemy-card'),document.querySelector('.player-hp'),rule,document.querySelector('.readout'),byId('attack'),byId('battleLog'),document.querySelector('.squad-skills'),document.querySelector('.actions'),byId('boardProof'),squadPanel,settingsDrawer);
if(matchMedia('(max-width:600px)').matches){const detail=document.createElement('details');detail.className='mobile-battle-details';const summary=document.createElement('summary');summary.textContent='戦況・ルール';detail.append(summary);rule.before(detail);detail.append(rule,byId('boardProof'),byId('battleLog'));}
const guideConfirm=document.createElement('button');guideConfirm.id='guideConfirm';guideConfirm.textContent='決定 · 回転';guideConfirm.disabled=true;guideConfirm.style.cssText='border-color:#d7b56c;color:#ffe5a3';guideConfirm.onclick=confirmMove;byId('guideCancel').before(guideConfirm);
byId('moveGuide').querySelector('small').textContent='マウス：ホバーでガイド確認、1クリックで回転。タッチ：1回目で列選択、2回目で回転。';
// Keep turn information next to the board and move secondary tools into settings.
boardShell.prepend(document.querySelector('.readout'));
const enemyInfo=document.createElement('div'),enemyAttackInfo=document.createElement('div'),enemySkill=document.createElement('div');enemyInfo.className='enemy-weakness-info';enemyAttackInfo.className='enemy-attack-info';enemySkill.id='enemySkill';byId('enemyHp').before(enemyAttackInfo);enemyAttackInfo.append(byId('enemyHp'),enemySkill);byId('weakness').before(enemyInfo);enemyInfo.append(byId('weakness'),byId('count'));
const enemyTitleRow=document.createElement('div');enemyTitleRow.className='enemy-title-row';byId('enemyName').before(enemyTitleRow);enemyTitleRow.append(byId('enemyName'),byId('damageText'));
document.querySelector('.readout').style.display='none';
settingsDrawer.append(viewNote,document.querySelector('.actions'),squadPanel);
settingsDrawer.querySelector('summary').textContent='設定・遊び方';
boardTitle.innerHTML='<span>RUBIMON</span><strong>精霊の回転盤</strong>';
buildSquadSkills();addEventListener('resize',resize);resize();reset();requestAnimationFrame(frame);
