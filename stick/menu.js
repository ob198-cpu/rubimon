// Move existing controls, retaining their handlers, values and battle state.
(()=>{
 const menu=document.createElement('dialog');menu.id='battleMenu';menu.setAttribute('aria-labelledby','battleMenuTitle');
 menu.innerHTML='<div class="battle-menu-head"><h2 id="battleMenuTitle">メニュー</h2><button type="button" id="battleMenuClose">戦闘へ戻る</button></div><div class="battle-menu-body"></div>';
 document.body.append(menu);
 const body=menu.querySelector('.battle-menu-body');
 for(const selector of ['.lobby-nav','.squad-skills','.mobile-battle-details','.rule-panel','#boardProof','#battleLog','.settings-drawer','.original-link']){
  const node=document.querySelector(selector);if(node&&!body.contains(node))body.append(node);
 }
 const open=document.createElement('button');open.id='battleMenuOpen';open.type='button';open.textContent='メニュー';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls',menu.id);
 document.querySelector('.board-left-actions').append(open);
 open.onclick=()=>menu.showModal();
 menu.querySelector('#battleMenuClose').onclick=()=>menu.close();
 document.querySelector('.lobby').addEventListener('close',()=>{if(menu.open)menu.close()});
 menu.addEventListener('keydown',e=>e.stopPropagation());
 menu.addEventListener('click',e=>{
  const button=e.target.closest('button');
  // Panel-picking skills and demonstrations need the board immediately accessible.
  if(button&&!button.disabled&&(button.dataset.char||['tutorialStart','applySquad','applyDifficulty','reset'].includes(button.id)))queueMicrotask(()=>menu.close());
 },true);
 // Fit the existing canvas to the remaining viewport; never distort its aspect ratio.
 const shell=document.querySelector('.board-shell');
 function fit(){
  if(!matchMedia('(max-width:850px)').matches){canvas.style.removeProperty('width');return}
  const others=[...shell.children].filter(n=>n!==canvas&&getComputedStyle(n).display!=='none');
  const reserved=others.reduce((sum,n)=>{const css=getComputedStyle(n);return sum+n.getBoundingClientRect().height+parseFloat(css.marginTop||0)+parseFloat(css.marginBottom||0)},0);
  const height=Math.max(40,shell.clientHeight-reserved-20),v=boardViewport();
  canvas.style.setProperty('width',Math.max(40,Math.min(shell.clientWidth-16,height*v.w/v.h))+'px','important');
 }
 const observer=new ResizeObserver(()=>{fit();resize()});observer.observe(shell);
 new MutationObserver(()=>{fit();resize()}).observe(byId('orbitToggle'),{attributes:true,attributeFilter:['aria-expanded']});
 addEventListener('resize',fit);fit();resize();
})();
