/* Bounded, conservative certificates: never assume unknown refill results. */
(function(root){
const E=typeof module!=='undefined'?require('./engine.js'):root.CubeEngine;
const B=typeof module!=='undefined'?require('./battle.js'):root.BattleRules;
const settings={easy:{depth:1,hp:.8,attack:.75},normal:{depth:3,hp:.9,attack:.9},hard:{depth:3,hp:.8,attack:.75}};
const clone=s=>s.map(x=>({...x,p:x.p.slice(),n:x.n.slice()}));
function plan(state,keys,policy={},depth=3,budget=6500){
 let nodes=0,exhausted=false;
 function visit(board,left,previous){
  for(const face of Object.keys(E.slices)){
   if(!B.canRotate(board,face))continue;
   for(const dir of [1,-1]){
    if(previous&&previous.face===face&&previous.dir===-dir)continue;
    if(++nodes>budget){exhausted=true;return null}
    const next=clone(board);E.move(next,face,dir);const groups=B.matches(next,policy),move={face,dir};
    if(groups.some(g=>keys.includes(g.element)))return [move];
    // Any intermediate clear changes the board. Do not claim that path is proven.
    if(left>1&&!groups.length){const rest=visit(next,left-1,move);if(rest)return [move,...rest];if(exhausted)return null}
   }
  }
  return null;
 }
 for(let d=1;d<=depth;d++){const moves=visit(state,d,null);if(moves)return {moves,nodes,status:'verified'};if(exhausted)break}
 return {moves:null,nodes,status:exhausted?'budget':'unverified'};
}
function initial(pool,keys,policy={},difficulty='normal',random=Math.random){
 if(!keys.length)return {state:null,moves:null,status:'no-attribute'};
 for(let i=0;i<24;i++){
  const state=B.board(E,random,pool);if(B.matches(state,policy).length)continue;
  const result=plan(state,keys,policy,settings[difficulty].depth);
  if(result.moves)return {state,...result};
 }
 const state=B.board(E,random,pool),repair=B.ensureWinningMove(E,state,keys,policy);
 return repair.move&&!B.matches(state,policy).length?{state,moves:[repair.move],status:'verified'}:{state:null,moves:null,status:'unverified'};
}
function refill(state,ids,pool,keys,policy={},depth=3,random=Math.random,conversion=null){
 let fallback=null;
 for(let i=0;i<48;i++){
  const candidate=clone(state);B.refill(candidate,ids,random,pool);
  if(conversion)for(const s of candidate)if(s.face===conversion[0]&&s.tempOriginal===undefined){s.tempOriginal=s.face;s.face=conversion[1]}
  // Suppress accidental refill chains. Match creation must come from a move/skill.
  if(B.matches(candidate,policy).length)continue;
  fallback ||= candidate;
  const proof=plan(candidate,keys,policy,depth,1800);
  if(proof.moves){state.splice(0,state.length,...candidate);return {...proof,status:'verified'}}
 }
 if(fallback){state.splice(0,state.length,...fallback);return {moves:null,status:'unverified'}}
 // Preserve non-cleared cells even when existing matches make chain-free refill impossible.
 B.refill(state,ids,random,pool);
 if(conversion)for(const s of state)if(s.face===conversion[0]&&s.tempOriginal===undefined){s.tempOriginal=s.face;s.face=conversion[1]}
 return {moves:null,status:'deferred'};
}
function safeHinder(state,kind,obstacles,keys,policy={},depth=3){
 const candidate=clone(state),next=structuredClone(obstacles);B.hinder(candidate,kind,next);
 const effective={...policy,faces:next.restrict>0?['F']:policy.faces,seals:next.seals};
 if(candidate.filter(s=>s.face==='J').length>13)return false;
 if(!plan(candidate,keys,effective,depth).moves)return false;
 state.splice(0,state.length,...candidate);Object.assign(obstacles,next);return true;
}
const api={settings,plan,initial,refill,safeHinder};root.BalanceRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
