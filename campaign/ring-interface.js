// Presentation layer: no board creation, permutation, scoring or history writes.
function ringSelectedMove(sticker,direction){const vector={up:[0,-30],down:[0,30],left:[-30,0],right:[30,0]}[direction];return sticker&&vector?stickMoveFor(sticker,...vector):null}
(()=>{
 const adapter=globalThis.ringControls;if(!adapter)return;
 const root=document.createElement('section');root.className='ring-layout';root.setAttribute('aria-label','行・列の回転操作');
 const defs='<defs><linearGradient id="ringMetal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#779399"/><stop offset=".12" stop-color="#182d32"/><stop offset=".46" stop-color="#07151c"/><stop offset=".72" stop-color="#254349"/><stop offset="1" stop-color="#030b10"/></linearGradient><linearGradient id="ringGold" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#fff0bc"/><stop offset=".23" stop-color="#b39759"/><stop offset=".48" stop-color="#584024"/><stop offset=".74" stop-color="#e4c782"/><stop offset="1" stop-color="#83613a"/></linearGradient></defs>';
 const marks=Array.from({length:48},(_,i)=>`<path transform="rotate(${i*7.5} 200 200)" d="M197 34 L200 29 L203 34 L200 39 Z M200 39 V43"/>`).join('');
 const art=`<svg viewBox="0 0 400 400" aria-hidden="true">${defs}<circle cx="200" cy="204" r="171" fill="none" stroke="#02070a" stroke-width="24"/><circle cx="200" cy="200" r="172" fill="none" stroke="url(#ringGold)" stroke-width="27"/><circle cx="200" cy="200" r="172" fill="none" stroke="url(#ringMetal)" stroke-width="22"/><circle cx="200" cy="200" r="181" fill="none" stroke="#fff0c0" stroke-opacity=".5"/><circle cx="200" cy="200" r="162" fill="none" stroke="#020d11" stroke-width="3"/><circle cx="200" cy="200" r="164" fill="none" stroke="#4be4dd" stroke-opacity=".6" stroke-width="2"/><circle cx="200" cy="200" r="176" fill="none" stroke="#498c91" stroke-opacity=".4"/><g fill="none" stroke="#65c9c6" stroke-opacity=".55" stroke-width="1">${marks}</g></svg>`;
 const arrow='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 18 L20 9 L29 18 M11 28 L20 19 L29 28"/></svg>';
 root.innerHTML=`<div id="ringStage" class="ring-stage"><div class="ring-back">${art}</div><div class="ring-front" aria-hidden="true"></div>${[['up','上'],['down','下'],['left','左'],['right','右']].map(([key,name])=>`<button type="button" class="ring-direction ring-${key}" data-direction="${key}" aria-label="選択した${key==='up'||key==='down'?'列':'行'}を${name}へ回転" disabled>${arrow}</button>`).join('')}</div><div class="ring-footer"><p class="ring-help">タイルを選び、リングで回転</p><p class="ring-selection" role="status">回転させるタイルを選択</p><div class="ring-clear-slot"></div></div>`;
 canvas.before(root);const stage=root.querySelector('#ringStage');stage.insertBefore(canvas,stage.querySelector('.ring-front'));canvas.style.removeProperty('width');
 // Reuse the same metal artwork in the foreground without duplicating SVG IDs.
 const front=stage.querySelector('.ring-front');front.innerHTML=art.replace(defs,'');
 const cancel=byId('stickCancel');root.querySelector('.ring-clear-slot').append(cancel);
 document.body.classList.add('ring-interface');globalThis.ringInterface=true;
 let lastKey='',turnGlow=null;
 const buttons=[...root.querySelectorAll('[data-direction]')],label=root.querySelector('.ring-selection');
 function sync(){
  root.classList.toggle('is-perspective',Math.max(...camera.map(Math.abs))<.9999);
  const picked=adapter.selection(),can=adapter.ready()&&(!globalThis.stickLesson||globalThis.stickLesson.canSelect());
  const moves=buttons.map(b=>ringSelectedMove(picked,b.dataset.direction));
  const key=[picked?.id,can,active?.face,phase,...moves.map(move=>move&&B.canRotate(state,move.face))].join('|');
  if(key!==lastKey){lastKey=key;
   buttons.forEach((b,i)=>{const move=moves[i];b.disabled=!(picked&&can&&move&&B.canRotate(state,move.face))});
   label.textContent=picked?'上下左右の方向を選んで回転':'回転させるタイルを選択';
   root.classList.toggle('has-selection',!!picked);root.classList.toggle('is-turning',!!active);cancel.hidden=!picked;
  }
  return {picked};
 }
 for(const b of buttons)b.onclick=()=>{const selection=sync();if(b.disabled)return;const move=ringSelectedMove(selection.picked,b.dataset.direction);if(adapter.move(b.dataset.direction))turnGlow={...selection,move,until:performance.now()+300};lastKey='';sync()};
 root.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))e.stopPropagation()});
 const normalGuide=drawGuide;
 drawGuide=function(part='cube',drawingContext=ctx){
  normalGuide(part,drawingContext);if(part!=='cube')return;
  let {picked,move}=sync();const pulse=active&&turnGlow&&performance.now()<turnGlow.until&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(pulse)({picked,move}=turnGlow);if(!picked||(active&&!pulse))return;
  if(!move){const panel=hitFaces.find(p=>p.sticker.id===picked.id);if(panel)drawSelectedPanel(drawingContext,panel,performance.now());return;}
  const slice=E.slices[move.face];
  for(const p of hitFaces){const s=p.sticker;if(s.p[slice.axis]!==slice.layer||!s.n.every((v,i)=>v===picked.n[i]))continue;
   drawingContext.save();drawingContext.beginPath();p.points.forEach((q,i)=>i?drawingContext.lineTo(...q):drawingContext.moveTo(...q));drawingContext.closePath();
   drawingContext.strokeStyle='#ffe2a0';drawingContext.lineWidth=2;drawingContext.shadowColor='#73e5d9';drawingContext.shadowBlur=pulse?8:4;drawingContext.stroke();drawingContext.restore();
  }
 };
 // Subtle surface light stays behind the original glyphs and never changes attribute identity.
 const normalCube=drawCube;
 drawCube=function(angle){normalCube(angle);if(active||!adapter.selection()||challengeMode)return;
  for(const p of hitFaces){const xs=p.points.map(q=>q[0]),ys=p.points.map(q=>q[1]),top=Math.min(...ys),bottom=Math.max(...ys);
   const glow=ctx.createLinearGradient(0,top,0,bottom);glow.addColorStop(0,'#ffffff20');glow.addColorStop(.4,'#ffffff00');glow.addColorStop(1,'#0000000d');
   ctx.save();ctx.beginPath();p.points.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();ctx.fillStyle=glow;ctx.fill();ctx.restore();
  }
 };
 // Measure only layout: game state and pointer coordinates remain unchanged.
 const shell=document.querySelector('.board-shell'),toolbar=document.querySelector('.orbit-toolbar'),actions=document.querySelector('.board-actions'),footer=root.querySelector('.ring-footer'),map=byId('mobileOrbit');
 function fitControls(){
  if(!matchMedia('(max-width:850px)').matches){root.style.removeProperty('--ring-size');return}
  const available=Math.max(0,shell.clientHeight-toolbar.getBoundingClientRect().height-actions.getBoundingClientRect().height-footer.getBoundingClientRect().height-30);
  const size=Math.max(1,Math.min(shell.clientWidth*(orbitExpanded?.49:.9),available));
  root.style.setProperty('--ring-size',size+'px');
  root.style.setProperty('--fit-row-height',available+'px');
  shell.style.setProperty('--fit-toolbar-height',toolbar.getBoundingClientRect().height+'px');
  if(map)map.style.setProperty('--fit-orbit-height',available+'px');
 }
 const fitObserver=new ResizeObserver(fitControls);for(const node of [shell,toolbar,actions,footer])fitObserver.observe(node);
 new MutationObserver(fitControls).observe(byId('orbitToggle'),{attributes:true,attributeFilter:['aria-expanded']});
 addEventListener('resize',fitControls);
 resize();sync();fitControls();
})();
