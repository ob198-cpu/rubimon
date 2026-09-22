// Presentation only: display the live attribute pool and battle turn.
(()=>{
 const strip=document.createElement('canvas');strip.id='arenaAttributes';strip.setAttribute('aria-label','使用中の属性');document.querySelector('.color-count-control').append(strip);
 const badge=document.createElement('div');badge.id='arenaTurn';badge.setAttribute('aria-live','polite');document.querySelector('.board-shell').append(badge);
 const originalRefresh=refresh;
 function paint(){
  const pool=activePool(),dpr=Math.min(devicePixelRatio||1,2),width=pool.length*34;
  strip.width=width*dpr;strip.height=36*dpr;strip.style.width=width+'px';strip.style.height='36px';strip.parentElement.style.setProperty('--attribute-strip-width',width+'px');
  const c=strip.getContext('2d');c.scale(dpr,dpr);pool.forEach((key,i)=>drawSpirit(c,key,17+i*34,18,13));
  badge.textContent='TURN '+(enemyTurns+1);
 }
 refresh=function(){originalRefresh();paint()};paint();
})();
