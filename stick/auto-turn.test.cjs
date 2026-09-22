const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const resolver=source.slice(source.indexOf('async function resolveTurn(){'),source.indexOf('for(const [face,f] of Object.entries(E.faces))'));
async function run(steps,limit=3,damage=0,enemyHp=100,enabled=false,refill=true){
 const nodes={};
 const c={Q:{refill(){c.refilled=true},safeHinder(){c.hindered=true;return true}},activePool:()=>[],attackKeys:()=>['R'],attackPolicy:()=>({}),teamConversion:null,refillAssistance:refill,spentElements:new Set(),balanceMetrics:{refills:0,rejectedObstacles:0},enemyObstaclesEnabled:enabled,phase:'ready',active:null,queue:[],turnMoves:steps,turnLimit:limit,canAct:()=>true,history:[1],roundToken:0,combo:0,attackChain:0,bestChain:0,battleDamage:0,tutorial:null,enemyHp,hp:500,gravityUsed:false,state:refill?[]:[{id:1,face:'R'}],squad:[],tuning:{},teamImmune:false,manualImmune:false,teamShield:false,enemyTurns:0,obstacles:{},difficulty:'normal',dungeon:{obstacle:'lock',reward:1},clockUsed:false,openFaces:false,battleEffects:[],performance:{now:()=>0},refresh(){},pause:async()=>{},byId:id=>nodes[id]??={textContent:'',classList:{remove(){},add(){}}},maxHp:()=>500,currentEnemy:()=>({name:'enemy',reward:1}),endTeamTurn(){c.ended=(c.ended||0)+1},playBattleEffects(){},showComboBonus(){},showVictory(){c.victoryShown=true},applyTemporaryConversion(){},battleVibration(){},teamOutcome:()=>({damage,heal:0,usedGravity:false,details:[],attacks:[{value:damage,heal:false}]}),T:{incoming:()=>40,comboBonus:r=>({...r,comboBonus:{chain:1,burst:1,multiplier:1}})},B:{tick(){},hinder(){c.hindered=true},refill(){},pools:{normal:[]}}};
 c.enemyTechnique=()=>({name:'テスト爪'});
 let first=true;c.currentMatches=()=>damage&&first?(first=false,[{ids:[1],element:'R'}]):[];
 vm.createContext(c);await vm.runInContext(resolver+';resolveTurn()',c);return c;
}
(async()=>{
 for(const n of [1,2]){const c=await run(n,3,10);assert.equal(c.enemyHp,90);assert.equal(c.hp,500);assert.equal(c.turnMoves,n);assert.equal(c.enemyTurns,0);assert.equal(c.ended,undefined);assert.equal(c.history.length,0)}
 for(const damage of [0,10]){const c=await run(3,3,damage);assert.equal(c.hp,460);assert.equal(c.turnMoves,0);assert.equal(c.enemyTurns,1);assert.equal(c.ended,1)}
 assert.equal((await run(3,5)).hp,500);assert.equal((await run(4,5)).hp,500);assert.equal((await run(5,5)).hp,460);
 assert.equal((await run(3)).hindered,undefined);assert.equal((await run(3,3,0,100,true)).hindered,true);
 const won=await run(3,3,100);assert.equal(won.phase,'victory');assert.equal(won.hp,500);assert.equal(won.victoryShown,true);
 const noRefill=await run(1,3,10,100,false,false);assert.equal(noRefill.refilled,undefined);assert.equal(noRefill.state[0].face,'X');assert.equal(noRefill.state[0].spentOriginal,'R');
 console.log('PASS: per-move damage, third-move counter, extra moves, victory screen, no partial-turn expiry or undo.');
})().catch(e=>{console.error(e);process.exitCode=1});
