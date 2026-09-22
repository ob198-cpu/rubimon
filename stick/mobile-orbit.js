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
 drawOrbits=function(angle){if(!split())return normalOrbits(angle);const v=bounds();context.clearRect(v.x,v.y,v.w,v.h);normalOrbits(angle,context)};
 globalThis.mobileOrbitSource=point=>{if(!split())return null;const rect=map.getBoundingClientRect(),v=bounds();return [rect.left+(point[0]-v.x)*rect.width/v.w,rect.top+(point[1]-v.y)*rect.height/v.h]};
 resize();
})();
