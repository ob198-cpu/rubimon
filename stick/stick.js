// Isolated analog-stick experiment. The original URL does not load this file.
function stickMoveFor(sticker,dx,dy){
 const length=Math.hypot(dx,dy);if(length<12)return null;
 let best=null,score=.35;
 for(const [face,spec] of Object.entries(E.slices)){
  if(sticker.n[spec.axis]!==0||sticker.p[spec.axis]!==spec.layer)continue;
  // Use the face's tangent directions, not a corner's curved rotation path.
  // Otherwise an upward gesture at a corner can incorrectly choose a horizontal row.
  const center=sticker.n.map(v=>v*(E.size/2));
  const angle=-Math.sign(spec.layer||1)*.01;
  const a=cubePoint(E.rotate(center,spec.axis,-angle)),b=cubePoint(E.rotate(center,spec.axis,angle));
  for(const dir of [1,-1]){
   const vx=(b[0]-a[0])*dir,vy=(b[1]-a[1])*dir,size=Math.hypot(vx,vy);if(size<.01)continue;
   const alignment=(vx*dx+vy*dy)/size/length;
   if(alignment>score){score=alignment;best={face,dir}}
  }
 }
 return best;
}
function drawSelectedPanel(ctx,panel,time=performance.now()){
 const points=panel.points,center=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
 ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
 // Outline only: the attribute tile's fill never changes.
 ctx.strokeStyle='#101b24';ctx.lineWidth=5;ctx.stroke();
 ctx.strokeStyle='#ffffff';ctx.lineWidth=2.2;ctx.stroke();ctx.restore();
 // Keep the attribute and status legible over the selected surface.
 drawPanelSpirit(panel.sticker,center[0],center[1],11);
 drawBlockStatus(panel.sticker,center,11);
}
function drawRotationRings(ctx,sticker,move,time=performance.now()){
 const targets=[];
 const faces=move?[move.face]:Object.keys(E.slices).filter(face=>{const s=E.slices[face];return sticker.n[s.axis]===0&&sticker.p[s.axis]===s.layer});
 for(const face of faces){
  const spec=E.slices[face],radius=E.size*.62,base=[0,0,0];base[spec.axis]=spec.layer;base[(spec.axis+1)%3]=radius;
  const point=t=>cubePoint(E.rotate(base,spec.axis,t));
  // Hide any segment over the cube, keeping every attribute icon unobstructed.
  const visible=p=>!hitFaces.some(h=>inside(p,h.points));
  ctx.save();ctx.strokeStyle=move?'#ffffff':'#b6c8d5';ctx.globalAlpha=move ? .95 : .8;ctx.lineWidth=move?2.3:1.8;ctx.beginPath();
  for(let i=0;i<96;i++){const a=point(i*Math.PI/48),b=point((i+1)*Math.PI/48);if(visible(a)&&visible(b)){ctx.moveTo(...a);ctx.lineTo(...b)}}ctx.stroke();
  if(move){const sign=-Math.sign(spec.layer||1)*move.dir;
   for(let i=0;i<4;i++){const t=sign*time/1100+i*Math.PI/2,p=point(t),q=point(t-sign*.04);if(!visible(p)||!visible(q))continue;const a=Math.atan2(p[1]-q[1],p[0]-q[0]);ctx.beginPath();ctx.moveTo(p[0]-7*Math.cos(a-.5),p[1]-7*Math.sin(a-.5));ctx.lineTo(...p);ctx.lineTo(p[0]-7*Math.cos(a+.5),p[1]-7*Math.sin(a+.5));ctx.stroke()}
  }ctx.restore();
  if(!move){
   const center=sticker.n.map(v=>v*E.size/2),angle=-Math.sign(spec.layer||1)*.01;
   const a=cubePoint(E.rotate(center,spec.axis,-angle)),b=cubePoint(E.rotate(center,spec.axis,angle));
   const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.01)continue;
   const tangent=[(b[0]-a[0])/length,(b[1]-a[1])/length];
   for(const dir of [-1,1]){
    let best=null,score=-Infinity;
    for(let i=0;i<96;i++){const p=point(i*Math.PI/48),s=dir*(p[0]*tangent[0]+p[1]*tangent[1]);if(visible(p)&&s>score){score=s;best=p}}
    if(!best)continue;
    const [x,y]=best,theta=Math.atan2(tangent[1]*dir,tangent[0]*dir);
    ctx.save();ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fillStyle='#102a32';ctx.fill();ctx.strokeStyle='#e4e9e9';ctx.lineWidth=1.5;ctx.stroke();
    ctx.translate(x,y);ctx.rotate(theta);ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.moveTo(2,-5);ctx.lineTo(7,0);ctx.lineTo(2,5);ctx.lineWidth=2;ctx.stroke();ctx.restore();
    targets.push({x,y,face,dir});
   }
  }
 }
 return targets;
}
function faceSelectedTile(sticker){
 const n=sticker.n;
 if(n[1]===0)viewYaw=Math.atan2(n[0],n[2]);
 viewPitch=Math.asin(n[1]);updateView();
}
(()=>{
 document.title='ルビモン｜スティック操作試作';document.body.classList.add('stick-version');
 // Snapshot files and a separate save namespace prevent changes to the original version.
 cubeTouch.remove();arrowButtonLayer.remove();dragHint.remove();
 drawSliceArrows=()=>{arrowHits=[]};syncArrowButtons=()=>{};placeCubeTouch=()=>{};showArrowHint=()=>{};
 arrowsUnlocked=true;arrowGuideActive=false;guidedArrowKey=null;
 boardViewport=()=>orbitExpanded?{w:600,h:740,x:0,y:-20}:compactBoard?{w:320,h:320,x:198,y:400}:{w:352,h:352,x:182,y:354};
 const originalResize=resize;resize=function(){document.body.classList.toggle('stick-orbit-open',orbitExpanded);originalResize()};
 const panel=document.createElement('section');panel.className='stick-controls';
 panel.innerHTML='<div class="stick-instructions"><p id="stickStatus" role="status"></p><button type="button" id="stickCancel" hidden>選択解除</button></div><div class="stick-pad" tabindex="0" role="group" aria-label="回転スティック。ドラッグして操作。矢印キーでも操作できます"><span class="stick-cross" aria-hidden="true">＋</span><span class="stick-knob" aria-hidden="true"></span><span class="stick-caption">TURN</span></div>';
 canvas.after(panel);
 const status=panel.querySelector('#stickStatus'),pad=panel.querySelector('.stick-pad'),knob=panel.querySelector('.stick-knob'),caption=panel.querySelector('.stick-caption'),cancel=panel.querySelector('#stickCancel');
 const hintConfirm=document.createElement('button');hintConfirm.type='button';hintConfirm.textContent='ヒントの列を回す';hintConfirm.hidden=true;panel.querySelector('.stick-instructions').append(hintConfirm);
 let mode='view',picked=null,press=null,preview=null,boardPress=null,ringTargets=[];
 const originalDrawGuide=drawGuide;
 drawGuide=function(part='cube',drawingContext=ctx){
  if(part==='cube')ringTargets=[];
  if(part==='cube'&&picked&&!active){
   const panel=hitFaces.find(h=>h.sticker.id===picked.id);
   if(panel){ringTargets=drawRotationRings(ctx,picked,preview)||[];drawSelectedPanel(ctx,panel)}
  }
  // Manual stick movement needs no cyan overlay. Keep explicit hint/demo guides.
  if(pendingMove||tutorial)originalDrawGuide(part,drawingContext);
 };
 const ready=()=>!active&&!queue.length&&!tutorial&&!panelPick&&phase==='ready'&&turnMoves<turnLimit;
 function clearGuide(){pendingMove=null;selectedLayer=null;hoverLayer=null;previewDir=0;preview=null;hintConfirm.hidden=true;updateGuide()}
 function setMode(next){mode=next;clearGuide();caption.textContent='TURN';pad.classList.toggle('turn-mode',mode==='turn');status.textContent=mode==='view'?'':picked?'スティックを上下・左右へ動かし、離すと回転':'キューブのパネルをタップしてください'}
 cancel.onclick=()=>{picked=null;cancel.hidden=true;setMode('view')};
 const originalHint=byId('hint').onclick;
 byId('hint').onclick=()=>{if(!ready())return;picked=null;cancel.hidden=true;originalHint();hintConfirm.hidden=!pendingMove;status.textContent=pendingMove?'水色の列を確認して「ヒントの列を回す」':'確実な手順は未確認です'};
 hintConfirm.onclick=()=>{if(!ready()||!pendingMove)return;const move=pendingMove;if(move.board!==JSON.stringify(state)){clearGuide();return}clearGuide();picked=null;cancel.hidden=true;userMove(move.face,move.dir)};
 // Capture replaces only this variant's legacy canvas input, including synthetic clicks.
 for(const eventName of ['touchstart','touchmove','click','pointerleave'])canvas.addEventListener(eventName,e=>{e.stopImmediatePropagation();if(e.cancelable)e.preventDefault()},{capture:true,passive:false});
 canvas.addEventListener('pointerdown',e=>{
  e.stopImmediatePropagation();if(e.button!==0||tutorial||press)return;e.preventDefault();
  const p=boardPointer(e);if(compactBoard)p[1]-=30;
  const ring=!panelPick&&picked&&ready()&&ringTargets.find(r=>Math.hypot(p[0]-r.x,p[1]-r.y)<=17);
  if(ring){boardPress={id:e.pointerId,x:e.clientX,y:e.clientY,ring,board:JSON.stringify(state),moved:false};canvas.setPointerCapture(e.pointerId);return}
  if(!hitFaces.some(h=>inside(p,h.points)))return;
  boardPress={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:viewYaw,pitch:viewPitch,moved:false};canvas.setPointerCapture(e.pointerId);
 },{capture:true});
 canvas.addEventListener('pointermove',e=>{
  e.stopImmediatePropagation();if(!boardPress||e.pointerId!==boardPress.id)return;
  const dx=e.clientX-boardPress.x,dy=e.clientY-boardPress.y;
  if(boardPress.ring){if(Math.hypot(dx,dy)>12)boardPress.moved=true;return}
  if(!boardPress.moved&&Math.hypot(dx,dy)<6)return;
  if(!boardPress.moved){picked=null;cancel.hidden=true;setMode('view')}
  boardPress.moved=true;
  viewYaw=boardPress.yaw-dx*.009;viewPitch=boardPress.pitch+dy*.009;updateView();
 },{capture:true});
 canvas.addEventListener('pointerup',e=>{
  e.stopImmediatePropagation();const start=boardPress;if(!start||start.id!==e.pointerId)return;boardPress=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(start.moved){globalThis.stickLesson?.viewed();return}if(Math.hypot(start.x-e.clientX,start.y-e.clientY)>16)return;
  if(globalThis.stickLesson&&!globalThis.stickLesson.canSelect())return;
  if(start.ring){
   const p=boardPointer(e);if(compactBoard)p[1]-=30;
   if(ready()&&start.board===JSON.stringify(state)&&Math.hypot(p[0]-start.ring.x,p[1]-start.ring.y)<=17&&B.canRotate(state,start.ring.face)){
    const move=start.ring;clearGuide();picked=null;ringTargets=[];cancel.hidden=true;userMove(move.face,move.dir);
   }return;
  }
  if(panelPick){suppressCubeClick=false;boardClick(e);return}
  if(!ready()){status.textContent='攻撃・補充が終わるまでお待ちください';return}
  const p=boardPointer(e);if(compactBoard)p[1]-=30;
  const hit=[...hitFaces].reverse().find(h=>inside(p,h.points));if(!hit)return;
  picked=hit.sticker;cancel.hidden=false;setMode('turn');faceSelectedTile(picked);
  globalThis.stickLesson?.selected();
  // Do not invent a horizontal choice before the player supplies a direction.
 },{capture:true});
 canvas.addEventListener('pointercancel',()=>{boardPress=null},{capture:true});
 canvas.addEventListener('lostpointercapture',()=>{boardPress=null},{capture:true});
 function movePad(e){
  if(!press||press.id!==e.pointerId)return;
  const rect=pad.getBoundingClientRect();let dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);
  const distance=Math.hypot(dx,dy),limit=rect.width*.3;if(distance>limit){dx*=limit/distance;dy*=limit/distance}
  press.dx=dx;press.dy=dy;knob.style.transform=`translate(${dx}px,${dy}px)`;
  if(mode==='turn'){
   preview=picked&&ready()?stickMoveFor(picked,dx,dy):null;
   selectedLayer=preview?.face||null;previewDir=preview?.dir||0;updateGuide();
   status.textContent=preview?(B.canRotate(state,preview.face)?'離すと回転':'固定中の列です · 別の方向を選んでください'):'中心に戻して離すとキャンセル';
  }
 }
 pad.addEventListener('pointerdown',e=>{
  if(e.button!==0||press)return;e.preventDefault();
  if(mode!=='turn'||!picked||!ready()){status.textContent=picked?'攻撃・補充が終わるまでお待ちください':'先にキューブのパネルをタップしてください';return}
  press={id:e.pointerId,dx:0,dy:0,board:JSON.stringify(state),mode};pad.setPointerCapture(e.pointerId);movePad(e);
 });
 pad.addEventListener('pointermove',movePad);
 function finish(e,commit){
  if(!press||e.pointerId!==press.id)return;
  // Use the actual release position even when the browser omits a move event.
  if(commit)movePad(e);
  const start=press,move=preview;press=null;knob.style.transform='';
  if(pad.hasPointerCapture(e.pointerId))pad.releasePointerCapture(e.pointerId);
  clearGuide();
  if(commit&&start.mode==='turn'&&move&&ready()&&start.board===JSON.stringify(state)&&B.canRotate(state,move.face)){
   userMove(move.face,move.dir);picked=null;cancel.hidden=true;status.textContent='1手回転 · パネルを選んで続けられます';
  }else if(mode==='turn')status.textContent=picked?'パネル選択中 · スティックで方向を指定':'キューブのパネルをタップしてください';
 }
 pad.addEventListener('pointerup',e=>finish(e,true));pad.addEventListener('pointercancel',e=>finish(e,false));pad.addEventListener('lostpointercapture',e=>finish(e,false));
 addEventListener('blur',()=>{boardPress=null;if(press)finish({pointerId:press.id},false)});
 pad.addEventListener('keydown',e=>{
  const direction={ArrowLeft:[-30,0],ArrowRight:[30,0],ArrowUp:[0,-30],ArrowDown:[0,30]}[e.key];if(!direction||e.repeat)return;e.preventDefault();e.stopPropagation();
  if(mode==='turn'&&picked&&ready()){const move=stickMoveFor(picked,...direction);if(move&&B.canRotate(state,move.face)){userMove(move.face,move.dir);picked=null;clearGuide();cancel.hidden=true;status.textContent='1手回転 · パネルを選んで続けられます'}}
 });
 // Keep selection honest when a skill, reset or challenge changes the board.
 let boardIdentity=JSON.stringify(state);const originalRefresh=refresh;
 refresh=function(){const next=JSON.stringify(state);if(next!==boardIdentity){boardIdentity=next;picked=null;cancel.hidden=true;clearGuide();if(mode==='turn')status.textContent='キューブのパネルをタップしてください'}originalRefresh()};
 canvas.setAttribute('aria-label','キューブのパネルをタップして列を選択。右のスティックで方向を指定して離すと回転。');
 setMode('view');resize();updateView();
})();
