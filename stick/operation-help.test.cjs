const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{id,inert:false,hidden:false,classList:{toggle(){},add(){},remove(){}},append(){},prepend(){},before(){},setAttribute(){},click(){this.onclick?.()}});return nodes.get(id)}
const original=[{id:1,face:'R',locked:2,p:[1,1,1]}],saved=JSON.stringify(original),frames=[];let normalCalls=0;
const c={document:{createElement:()=>node('new'+nodes.size),querySelector:node,querySelectorAll:()=>[node('hint'),node('rescue')],body:node('body')},byId:node,canvas:node('canvas'),state:original,viewYaw:.7,viewPitch:.4,active:null,queue:[],tutorial:null,panelPick:null,phase:'ready',structuredClone,refresh(){},updateView(){},requestAnimationFrame:fn=>frames.push(fn),userMove:()=>normalCalls++};
vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/operation-help.js','utf8'),c);
assert.notEqual(c.state,original);assert.equal(JSON.stringify(original),saved);assert.equal(c.stickLesson.canSelect(),false);
c.userMove('F',1);assert.equal(c.queue.length,0,'cannot skip view/select steps');
c.stickLesson.viewed();assert.equal(c.stickLesson.canSelect(),true);c.stickLesson.selected();c.userMove('F',1);
assert.equal(c.queue[0].kind,'operation-practice','practice cannot trigger user damage or turn consumption');
c.state[0].face='B';c.queue=[];frames.shift()();assert.equal(node('operationStep').textContent,'操作完了！');
node('operationExit').click();assert.equal(c.state,original);assert.equal(JSON.stringify(c.state),saved);assert.equal(c.stickLesson,null);assert.equal(node('hint').inert,false);
c.userMove('F',1);assert.equal(normalCalls,1,'normal gameplay delegates unchanged after exit');
const replay=[...nodes.values()].find(n=>n.id==='operationHelpOpen');replay.click();c.stickLesson.viewed();c.stickLesson.selected();c.userMove('F',1);c.active=c.queue.shift();
node('operationExit').click();assert.equal(c.active,null);assert.equal(c.state,original);frames.shift()();assert.equal(c.stickLesson,null,'stale completion cannot reopen an ended lesson');
console.log('PASS: guided order, practice-only rotation, restore, repeat, mid-turn exit, unchanged normal moves');
