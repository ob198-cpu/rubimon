(function(root){
const spirits={
 R:{name:'サラマンダー',element:'火',color:'#ff624c',power:170},
 B:{name:'ウンディーネ',element:'水',color:'#58c6ff',power:155},
 F:{name:'シルフ',element:'風',color:'#75e392',power:155},
 L:{name:'ノーム',element:'土',color:'#eeb273',power:185},
 U:{name:'ライカ',element:'雷',color:'#ffe887',power:160},
 D:{name:'ルミナ',element:'回復',color:'#f7bddd',power:180},
 V:{name:'ノクス',element:'闇',color:'#b99aef',power:190},
 I:{name:'フロスト',element:'氷',color:'#91eee9',power:175},
 M:{name:'フェラム',element:'鋼',color:'#aebacb',power:195},
 H:{name:'ソル',element:'光',color:'#fff4d1',power:175},
 P:{name:'ヴェノム',element:'毒',color:'#bdde45',power:175},
 J:{name:'お邪魔石',element:'邪魔',color:'#57606e',power:0}
};
const enemies=[
 {name:'炎竜 ヴェルディス',element:'火',weak:'B',hp:1200,attack:120},
 {name:'熔角竜 イグナロス',element:'火',weak:'B',hp:1800,attack:160},
 {name:'宵翼竜 ノクティラ',element:'闇',weak:'U',hp:2600,attack:210}
];
const pools={easy:['R','B','U','D'],normal:['R','B','F','L','U','D'],hard:['R','B','F','L','U','D','V','I','M']};
const skills={R:'サラマンダー・インフェルノ',B:'ウンディーネ・大海嘯',F:'シルフ・テンペスト',L:'ノーム・大地崩撃',U:'ウィスプ・聖光裁断',D:'ルミナ・生命の祝福',V:'ノクス・月蝕',I:'フロスト・絶氷',M:'フェラム・鋼鉄流星'};
const faceSpecs={U:[1,1],D:[1,-1],L:[0,-1],R:[0,1],F:[2,1],B:[2,-1]};
function sealed(s,policy={}){return (policy.seals||[]).some(row=>{const [axis,sign]=faceSpecs[row.face];return s.n[axis]===sign&&s.p[row.axis]===row.value})}
function canRotate(state,face){const [axis,sign]=faceSpecs[face]||{X:[0,0],Y:[1,0],Z:[2,0]}[face];return !state.some(s=>s.locked>0&&s.p[axis]===sign)}
function matches(state,policy={}){
 const groups=[];
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const faceKey=Object.keys(faceSpecs).find(f=>faceSpecs[f][0]===axis&&faceSpecs[f][1]===sign);
  if(policy.faces&&!policy.faces.includes(faceKey))continue;
  const face=state.filter(s=>s.n[axis]===sign),a=(axis+1)%3,b=(axis+2)%3;
  if(face.length===9&&face[0].face!=='J'&&face.every(s=>s.face===face[0].face&&!sealed(s,policy))){
   groups.push({element:face[0].face,ids:face.map(s=>s.id),skill:true,face:faceKey});continue;
  }
  for(const direction of [a,b])for(let v=-1;v<=1;v++){
   const line=face.filter(s=>s.p[direction]===v);
   if(line.length===3&&line[0].face!=='J'&&line.every(s=>s.face===line[0].face&&!sealed(s,policy)))groups.push({element:line[0].face,ids:line.map(s=>s.id),face:faceKey});
  }
 }return groups;
}
function refill(state,ids,random=Math.random,keys=pools.normal){for(const s of state)if(ids.has(s.id)){delete s.tempOriginal;s.face=keys[Math.floor(random()*keys.length)]}}
function board(E,random=Math.random,keys=pools.normal){
 const state=E.create();refill(state,new Set(state.map(s=>s.id)),random,keys);
 // Remove accidental opening matches without altering cube geometry.
 for(let i=0;i<100;i++){const found=matches(state);if(!found.length)break;refill(state,new Set(found.flatMap(g=>g.ids)),random,keys)}
 return state;
}
function winningMove(E,state,keys,policy={}){
 for(const face of Object.keys(E.slices))if(canRotate(state,face))for(const dir of [1,-1]){
  const next=structuredClone(state);E.move(next,face,dir);
  if(matches(next,policy).some(g=>keys.includes(g.element)))return {face,dir};
 }
 return null;
}
function ensureWinningMove(E,state,keys,policy={}){
 const existing=winningMove(E,state,keys,policy);if(existing)return {move:existing,changed:false};
 // Construct a legal matching destination and map its three stickers back.
 // Never remove locks, seals, jammers, or change physical cubie positions.
 for(const face of Object.keys(E.slices))if(canRotate(state,face))for(const dir of [1,-1]){
  const next=structuredClone(state);E.move(next,face,dir);
  for(const [targetFace,f] of Object.entries(E.faces)){
   if(policy.faces&&!policy.faces.includes(targetFace))continue;
   for(const axis of [0,1,2].filter(a=>a!==f.axis))for(const value of [-1,0,1]){
    const line=next.filter(s=>s.n[f.axis]===f.layer&&s.p[axis]===value);
    if(line.length!==3||line.some(s=>s.locked||s.face==='J'||sealed(s,policy)))continue;
    for(const key of keys){
     const candidate=structuredClone(state);
     for(const s of candidate)if(line.some(t=>t.id===s.id))s.face=key;
     // Do not create an already-matched board or overwrite temporary conversions.
     if(matches(candidate,policy).length||candidate.some((s,i)=>s.face!==state[i].face&&s.tempOriginal!==undefined))continue;
     const check=structuredClone(candidate);E.move(check,face,dir);
     if(!matches(check,policy).some(g=>keys.includes(g.element)))continue;
     candidate.forEach((s,i)=>state[i].face=s.face);
     return {move:{face,dir},changed:true};
    }
   }
  }
 }
 return {move:null,changed:false};
}
function outcome(groups,enemy,comboOffset=0){
 let damage=0,heal=0;const attacks=[];
 groups.forEach((g,i)=>{
  const s=spirits[g.element],mult=1+.25*(comboOffset+i),weak=enemy.weak===g.element?1.8:1;
  const value=Math.round(s.power*mult*weak*(g.skill?5:1));
  if(g.element==='D')heal+=value;else damage+=value;
  attacks.push({element:g.element,value,heal:g.element==='D',weak:weak>1,skill:!!g.skill});
 });return {damage,heal,attacks};
}
function tutorialBoard(E,full){
 let seed=full?919:214;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const steps=[{face:'F',dir:1},{face:'U',dir:1},{face:'R',dir:-1}];
 for(let tries=0;tries<200;tries++){
  const target=board(E,random);target.filter(s=>s.n[2]===1&&(full||s.p[1]===1)).forEach(s=>s.face='R');
  const groups=matches(target);
  if(full?!groups.some(g=>g.skill&&g.element==='R'):groups.length!==1||groups[0].skill)continue;
  const start=target.map(s=>({...s,p:s.p.slice(),n:s.n.slice()}));
  for(const m of [...steps].reverse())E.move(start,m.face,-m.dir);
  if(full?!matches(start).some(g=>g.skill):matches(start).length===0)return {state:start,steps};
 }
 throw Error('Tutorial board generation failed');
}
function convert(state,from,to){let count=0;for(const s of state)if(s.face===from){s.face=to;count++}return count}
function shuffle(state,random=Math.random){const movable=state.filter(s=>!s.locked&&s.face!=='J'),colors=movable.map(s=>s.face);for(let i=colors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]]}movable.forEach((s,i)=>s.face=colors[i])}
function hinder(state,kind,obstacles){
 if(kind==='lock'){const s=state.find(s=>s.n[2]===1&&s.p[0]===1&&s.p[1]===1);s.locked=2}
 if(kind==='jam'){const targets=state.filter(s=>s.n[2]===1&&s.face!=='J').slice(0,3);for(const s of targets)s.face='J'}
 if(kind==='seal')obstacles.seals=[{face:'F',axis:1,value:1,turns:2}];
 if(kind==='restrict')obstacles.restrict=2;
}
function tick(state,obstacles){for(const s of state)s.locked=Math.max(0,(s.locked||0)-1);obstacles.seals=(obstacles.seals||[]).map(s=>({...s,turns:s.turns-1})).filter(s=>s.turns>0);obstacles.restrict=Math.max(0,(obstacles.restrict||0)-1)}
function cleanse(state,obstacles,pool,random=Math.random){for(const s of state){s.locked=0;if(s.face==='J')s.face=pool[Math.floor(random()*pool.length)]}obstacles.seals=[];obstacles.restrict=0}
const api={spirits,enemies,skills,pools,faceSpecs,matches,refill,board,outcome,tutorialBoard,convert,shuffle,sealed,canRotate,hinder,tick,cleanse,winningMove,ensureWinningMove};
root.BattleRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
