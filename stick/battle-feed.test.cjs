const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const node=()=>({append(){},prepend(){},setAttribute(){},style:{setProperty(){}},getBoundingClientRect:()=>({height:140})});
const c={document:{querySelector:node,createElement:node},byId:node,ResizeObserver:class{observe(){}},squad:[],tuning:{},T:{stats:()=>({chars:[{name:'サラマンダー',element:'R'},{name:'イグニス',element:'R'}]})},currentEnemy:()=>({name:'炎竜'})};
vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/battle-feed.js','utf8'),c);
assert.equal(c.battleActionText({attacks:[{element:'R',value:270}]}),'サラマンダー・イグニス：攻撃 → 炎竜に270ダメージ');
assert.ok(c.battleActionText({attacks:[{element:'R',value:0,skill:true}]}).includes('面攻撃 → 炎竜に0ダメージ'));
assert.equal(c.battleActionText({attacks:[{heal:true,value:50}]}),'味方：回復 50');
console.log('PASS: actor names, resolved bonus damage, zero damage, face attack and healing text');
