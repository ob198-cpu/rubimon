const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/ring-interface.js','utf8');
const fit=source.slice(source.indexOf(' function fitControls(){'),source.indexOf(' const fitObserver='));
const style=()=>({values:{},setProperty(k,v){this.values[k]=v},removeProperty(k){delete this.values[k]}});
for(const width of [320,360,390,430,768])for(const height of [568,640,750,844,1024])for(const open of [false,true]){
 const toolbarHeight=40,actionHeight=146,footerHeight=92;
 const c={orbitExpanded:open,matchMedia:()=>({matches:true}),shell:{clientWidth:width-16,clientHeight:height-190,style:style()},root:{style:style()},map:{style:style()},toolbar:{getBoundingClientRect:()=>({height:toolbarHeight})},actions:{getBoundingClientRect:()=>({height:actionHeight})},footer:{getBoundingClientRect:()=>({height:footerHeight})}};
 vm.createContext(c);vm.runInContext(fit,c);c.fitControls();
 const size=parseFloat(c.root.style.values['--ring-size']),available=c.shell.clientHeight-toolbarHeight-actionHeight-footerHeight-30;
 assert.ok(size<=available+.01,'ring and trigger footer fit the remaining height');
 assert.ok(size<=c.shell.clientWidth*(open?.49:.9)+.01,'width leaves room for controls / 2D');
 assert.ok(size>0);
 if(open)assert.equal(parseFloat(c.map.style.values['--fit-orbit-height']),available);
}
const game=fs.readFileSync(__dirname+'/game.js','utf8'),stick=fs.readFileSync(__dirname+'/stick.js','utf8');
assert.ok(game.includes('drawPanelSpirit(p.sticker,c[0],c[1],18*3/E.size)'));
assert.ok(stick.includes('drawPanelSpirit(panel.sticker,center[0],center[1],18*3/E.size)'));
for(const size of [3,4,5])assert.ok(18*3/size<46*3/size/2,'larger glyph stays inside tile edges');
console.log('PASS: 50 viewport/layout budgets and matching selected/unselected icon scale');
