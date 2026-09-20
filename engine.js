/* Integer cubie coordinates and outward sticker normals are the sole puzzle state. */
(function(root){
  const faces={
    U:{axis:1,layer:1,color:'#dfd331',name:'上'},
    D:{axis:1,layer:-1,color:'#e9eeee',name:'下'},
    L:{axis:0,layer:-1,color:'#dc7136',name:'左'},
    R:{axis:0,layer:1,color:'#d84142',name:'右'},
    F:{axis:2,layer:1,color:'#35d344',name:'前'},
    B:{axis:2,layer:-1,color:'#348ec5',name:'奥'}
  };
  const slices={...faces,X:{axis:0,layer:0,name:'縦中央',color:'#bbb'},Y:{axis:1,layer:0,name:'横中央',color:'#bbb'},Z:{axis:2,layer:0,name:'奥行中央',color:'#bbb'}};
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function rotate(v,axis,angle){
    const r=v.slice(),a=(axis+1)%3,b=(axis+2)%3,c=Math.cos(angle),s=Math.sin(angle);
    r[a]=c*v[a]-s*v[b];r[b]=s*v[a]+c*v[b];return r;
  }
  function create(){
    const result=[];
    for(const [face,f] of Object.entries(faces))for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      const p=[0,0,0],n=[0,0,0];p[f.axis]=f.layer;n[f.axis]=f.layer;p[(f.axis+1)%3]=a;p[(f.axis+2)%3]=b;
      result.push({id:result.length,face,p,n});
    }return result;
  }
  function move(state,face,dir=1){
    const f=slices[face],angle=-(f.layer||1)*dir*Math.PI/2;
    for(const s of state)if(s.p[f.axis]===f.layer){s.p=rotate(s.p,f.axis,angle).map(Math.round);s.n=rotate(s.n,f.axis,angle).map(Math.round)}
  }
  function solved(state){return Object.values(faces).every(f=>new Set(state.filter(s=>s.n[f.axis]===f.layer).map(s=>s.face)).size===1)}
  // Fixed component ±h gives exactly three latitude circles per rotation axis.
  function sphere(s){
    const h=.105,t=s.p.map((v,i)=>s.n[i]===0?v*h:0),k=Math.sqrt(1-dot(t,t));
    return t.map((v,i)=>v+s.n[i]*k);
  }
  const right=[1/Math.sqrt(2),0,-1/Math.sqrt(2)],up=[-1/Math.sqrt(6),2/Math.sqrt(6),-1/Math.sqrt(6)],pole=[-1/Math.sqrt(3),-1/Math.sqrt(3),-1/Math.sqrt(3)];
  function project(v){const d=1-dot(v,pole);return [dot(v,right)/d,-dot(v,up)/d]}
  // Each sticker is the intersection of the two slice circles through its cubie.
  // The two intersections are the positive and negative faces of the third axis.
  const centers=[[366,247],[300,132],[234,247]];
  const radius=layer=>115-layer*22;
  function orbit(s){
    const axis=s.n.findIndex(v=>v!==0),a=(axis+1)%3,b=(axis+2)%3,c=centers[a],d=centers[b];
    const r=radius(s.p[a]),t=radius(s.p[b]),dx=d[0]-c[0],dy=d[1]-c[1],dist=Math.hypot(dx,dy);
    const along=(r*r-t*t+dist*dist)/(2*dist),height=Math.sqrt(r*r-along*along);
    const mid=[c[0]+along*dx/dist,c[1]+along*dy/dist];
    const points=[[mid[0]-height*dy/dist,mid[1]+height*dx/dist],[mid[0]+height*dy/dist,mid[1]-height*dx/dist]];
    points.sort((p,q)=>Math.hypot(p[0]-300,p[1]-209)-Math.hypot(q[0]-300,q[1]-209));
    return points[s.n[axis]>0?0:1];
  }
  // Canvas angles increase clockwise. Use one direction for the whole slice,
  // including paths longer than half a circle; never choose per-sticker shortcuts.
  const orbitDirection=(face,dir)=> (slices[face].layer||1)*dir;
  function orbitSweep(start,end,direction){
    const tau=2*Math.PI,amount=((end-start)*direction%tau+tau)%tau;
    return direction*(amount<1e-10||tau-amount<1e-10?0:amount);
  }
  const api={faces,slices,create,rotate,move,solved,sphere,project,dot,orbit,centers,radius,orbitDirection,orbitSweep};
  root.CubeEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
