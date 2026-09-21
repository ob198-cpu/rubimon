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
 const alpha=.21*(1+Math.cos(time*Math.PI*2/1200));
 ctx.fillStyle=`rgba(220, 40, 50, ${alpha})`;ctx.fill();ctx.restore();
 // Keep the attribute and status legible over the selected surface.
 drawPanelSpirit(panel.sticker,center[0],center[1],11);
 drawBlockStatus(panel.sticker,center,11);
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
 let mode='view',picked=null,press=null,preview=null,boardPress=null;
 const originalDrawGuide=drawGuide;
 drawGuide=function(part='cube'){
  if(part==='cube'&&picked&&!guideFace()&&!active){
   const panel=hitFaces.find(h=>h.sticker.id===picked.id);
   if(panel)drawSelectedPanel(ctx,panel);
  }
  originalDrawGuide(part);
 };
 const ready=()=>!active&&!queue.length&&!tutorial&&!panelPick&&phase==='ready'&&turnMoves<turnLimit;
 function clearGuide(){pendingMove=null;selectedLayer=null;hoverLayer=null;previewDir=0;preview=null;hintConfirm.hidden=true;updateGuide()}
 function setMode(next){mode=next;clearGuide();caption.textContent='TURN';pad.classList.toggle('turn-mode',mode==='turn');status.textContent=mode==='view'?'':picked?'スティックを上下・左右へ → 水色の列を確認して離す':'キューブのパネルをタップしてください'}
 cancel.onclick=()=>{picked=null;cancel.hidden=true;setMode('view')};
 const originalHint=byId('hint').onclick;
 byId('hint').onclick=()=>{if(!ready())return;picked=null;cancel.hidden=true;originalHint();hintConfirm.hidden=!pendingMove;status.textContent=pendingMove?'水色の列を確認して「ヒントの列を回す」':'確実な手順は未確認です'};
 hintConfirm.onclick=()=>{if(!ready()||!pendingMove)return;const move=pendingMove;if(move.board!==JSON.stringify(state)){clearGuide();return}clearGuide();picked=null;cancel.hidden=true;userMove(move.face,move.dir)};
 // Capture replaces only this variant's legacy canvas input, including synthetic clicks.
 for(const eventName of ['touchstart','touchmove','click','pointerleave'])canvas.addEventListener(eventName,e=>{e.stopImmediatePropagation();if(e.cancelable)e.preventDefault()},{capture:true,passive:false});
 canvas.addEventListener('pointerdown',e=>{
  e.stopImmediatePropagation();if(e.button!==0||tutorial||press)return;e.preventDefault();
  const p=boardPointer(e);if(compactBoard)p[1]-=30;
  if(!hitFaces.some(h=>inside(p,h.points)))return;
  boardPress={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:viewYaw,pitch:viewPitch,moved:false};canvas.setPointerCapture(e.pointerId);
 },{capture:true});
 canvas.addEventListener('pointermove',e=>{
  e.stopImmediatePropagation();if(!boardPress||e.pointerId!==boardPress.id)return;
  const dx=e.clientX-boardPress.x,dy=e.clientY-boardPress.y;
  if(!boardPress.moved&&Math.hypot(dx,dy)<6)return;
  if(!boardPress.moved){picked=null;cancel.hidden=true;setMode('view')}
  boardPress.moved=true;
  viewYaw=boardPress.yaw-dx*.009;viewPitch=Math.max(-1.35,Math.min(1.35,boardPress.pitch+dy*.009));updateView();
 },{capture:true});
 canvas.addEventListener('pointerup',e=>{
  e.stopImmediatePropagation();const start=boardPress;if(!start||start.id!==e.pointerId)return;boardPress=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(start.moved||Math.hypot(start.x-e.clientX,start.y-e.clientY)>16)return;
  if(panelPick){suppressCubeClick=false;boardClick(e);return}
  if(!ready()){status.textContent='攻撃・補充が終わるまでお待ちください';return}
  const p=boardPointer(e);if(compactBoard)p[1]-=30;
  const hit=[...hitFaces].reverse().find(h=>inside(p,h.points));if(!hit)return;
  picked=hit.sticker;cancel.hidden=false;setMode('turn');
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
   status.textContent=preview?(B.canRotate(state,preview.face)?'水色の列が動きます · 離すと回転':'固定中の列です · 別の方向を選んでください'):'中心に戻して離すとキャンセル';
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
 const link=document.createElement('a');link.href='../?v=0674147';link.textContent='通常版へ';link.className='original-link';orbitToolbar.append(link);
 canvas.setAttribute('aria-label','キューブのパネルをタップして列を選択。右のスティックで方向を指定して離すと回転。');
 setMode('view');resize();updateView();
})();
