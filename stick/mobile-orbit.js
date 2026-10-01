// Identify the spatial face nearest the camera, never the stickers' original faces.
function orbitFrontFace(engine,stickers,eye){
 const [face,spec]=Object.entries(engine.faces).reduce((best,item)=>{
  const score=eye[item[1].axis]*Math.sign(item[1].layer);
  return !best||score>best.score?{item,score}:best;
 },null).item;
 return {face,name:spec.name,points:stickers.filter(s=>s.n[spec.axis]===Math.sign(spec.layer)).map(engine.orbit)};
}
function orbitFaceOutline(points,padding=15){
 const all=points.flatMap(([x,y])=>[[x-padding,y],[x,y-padding],[x+padding,y],[x,y+padding]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=list=>{const h=[];for(const p of list){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p)}return h};
 return half(all).slice(0,-1).concat(half([...all].reverse()).slice(0,-1));
}
// On phones, give the orbit map and cube independent full-width drawing surfaces.
(()=>{
 const map=document.createElement('canvas');map.id='mobileOrbit';map.hidden=true;map.setAttribute('aria-label','2D属性配置図');canvas.before(map);
 const context=map.getContext('2d'),media=matchMedia('(max-width:850px)');
 const split=()=>orbitExpanded;
 function bounds(){const r=Math.max(...E.layers().map(E.radius))+12;return {x:234-r,y:132-r,w:132+2*r,h:115+2*r}}
 const normalViewport=boardViewport;
 boardViewport=()=>split()?(compactBoard?{w:320,h:320,x:198,y:400}:{w:352,h:352,x:182,y:354}):normalViewport();
 const normalResize=resize;
 resize=function(){normalResize();map.hidden=!split();if(!split())return;const v=bounds(),dpr=Math.min(devicePixelRatio||1,2);map.width=v.w*dpr;map.height=v.h*dpr;map.style.aspectRatio=v.w+'/'+v.h;context.setTransform(dpr,0,0,dpr,-v.x*dpr,-v.y*dpr)};
 const normalOrbits=drawOrbits;
 drawOrbits=function(angle){
  if(!split())return normalOrbits(angle);
  const v=bounds(),front=orbitFrontFace(E,state,camera),outline=orbitFaceOutline(front.points);
  context.clearRect(v.x,v.y,v.w,v.h);
  context.save();context.beginPath();outline.forEach((p,i)=>i?context.lineTo(...p):context.moveTo(...p));context.closePath();
  context.fillStyle='#edcb6930';context.fill();context.strokeStyle='#ffe3a0';context.lineWidth=3;context.stroke();context.restore();
  normalOrbits(angle,context);
  context.save();context.font='bold 32px sans-serif';context.textAlign='center';context.textBaseline='top';context.fillStyle='#ffe3a0';context.fillText('正面：'+front.name+'面',v.x+v.w/2,v.y+8);context.restore();
  map.setAttribute('aria-label','2D属性配置図。正面：'+front.name+'面。金色の枠が現在の正面');
 };
 globalThis.mobileOrbitSource=point=>{if(!split())return null;const rect=map.getBoundingClientRect(),v=bounds();return [rect.left+(point[0]-v.x)*rect.width/v.w,rect.top+(point[1]-v.y)*rect.height/v.h]};
 resize();
})();
