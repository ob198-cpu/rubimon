(function(root){
'use strict';
const roster=[
 {id:'sala',name:'サラマンダー',element:'R',hp:430,atk:120,def:8,recovery:10,passive:'火3体でチーム防御＋50（重複なし）',ability:'fireGuard',skill:'火の鼓舞：このターン火の攻撃力1.5倍',action:'fireBoost',cd:3,source:'初期'},
 {id:'ignis',name:'イグニス',element:'R',hp:360,atk:155,def:4,recovery:5,passive:'自分の火列攻撃に固定50を追加',ability:'fixed',skill:'烈火変換：このターン風→火',action:'windFire',cd:4,source:'火山報酬'},
 {id:'ember',name:'エンバー',element:'R',hp:520,atk:80,def:15,recovery:10,passive:'チームHP＋200',ability:'hp',skill:'炎壁：このターン被ダメージ半減',action:'shield',cd:3,source:'通常探索'},
 {id:'undine',name:'ウンディーネ',element:'B',hp:390,atk:115,def:7,recovery:30,passive:'水3体で回復力＋50（重複なし）',ability:'waterHeal',skill:'潮変換：このターン火→水',action:'fireWater',cd:3,source:'初期'},
 {id:'aqua',name:'アクア',element:'B',hp:470,atk:90,def:12,recovery:30,passive:'自分の水列成立でHPを40回復',ability:'leech',skill:'水鏡：このターン無敵',action:'immune',cd:6,source:'海底報酬'},
 {id:'marina',name:'マリナ',element:'B',hp:350,atk:80,def:6,recovery:65,passive:'チーム回復力＋30',ability:'heal',skill:'潮の祝福：最大HPの30％回復',action:'heal',cd:4,source:'通常探索'},
 {id:'raika',name:'ライカ',element:'U',hp:340,atk:140,def:4,recovery:5,passive:'雷キャラ全員の攻撃力＋50（重複なし）',ability:'thunder',skill:'雷鳴：このターン雷の攻撃力1.5倍',action:'thunderBoost',cd:3,source:'初期'},
 {id:'volt',name:'ヴォルト',element:'U',hp:370,atk:125,def:6,recovery:10,passive:'自分の雷列攻撃に固定50を追加',ability:'fixed',skill:'雷光変換：このターン土→雷',action:'earthThunder',cd:4,source:'雷塔報酬'},
 {id:'nox',name:'ノクス',element:'V',hp:330,atk:100,def:5,recovery:10,passive:'闇1面成立で敵の現在HPの50％（1ターン1回）',ability:'gravity',skill:'月蝕変換：このターン雷→闇',action:'thunderDark',cd:5,source:'深淵報酬'},
 {id:'ferrum',name:'フェラム',element:'M',hp:510,atk:75,def:20,recovery:5,passive:'自分の鋼列攻撃に固定50を追加',ability:'fixed',skill:'貫通：固定50ダメージ（防御無視）',action:'pierce',cd:3,source:'初期'},
 {id:'lumina',name:'ルミナ',element:'D',hp:350,atk:40,def:5,recovery:90,passive:'チーム回復力＋30',ability:'heal',skill:'祝福：最大HPの30％回復',action:'heal',cd:4,source:'初期'},
 {id:'chrono',name:'クロノ',element:'F',hp:340,atk:100,def:6,recovery:15,passive:'異なる属性が5種ならチームHP＋250',ability:'diverse',skill:'時渡り：このターン＋2手',action:'clock',cd:4,source:'通常探索'},
 {id:'libera',name:'リベラ',element:'L',hp:460,atk:85,def:14,recovery:20,passive:'チーム防御＋15',ability:'guard',skill:'解呪：全妨害を解除',action:'cleanse',cd:3,source:'初期'},
 {id:'sylph',name:'シルフ',element:'F',hp:350,atk:115,def:5,recovery:20,passive:'異なる属性が5種ならチームHP＋250',ability:'diverse',skill:'旋風：固定・お邪魔以外をシャッフル',action:'shuffle',cd:3,source:'通常探索'},
 {id:'astra',name:'アストラ',element:'U',hp:360,atk:110,def:6,recovery:15,passive:'チーム回復力＋30',ability:'heal',skill:'領域展開：このターン全6面で攻撃可能',action:'open',cd:4,source:'雷塔報酬'}
];
const dungeons=[
 {id:'grove',name:'翠緑の試練',bossName:'炎竜 ヴェルディス',hp:2200,attack:230,def:20,weak:'B',obstacle:'lock',gravity:1,reward:30,tip:'炎竜 ヴェルディスは水が弱点。固定を解くリベラ、水編成が有利。'},
 {id:'armor',name:'鋼殻の回廊',hp:420,attack:240,def:420,weak:'B',obstacle:'jam',gravity:0,reward:40,tip:'各キャラの攻撃ごとに防御420。固定ダメージが有効。割合ダメージ無効。'},
 {id:'abyss',name:'深淵の巨竜',hp:10000,attack:370,def:60,weak:'U',obstacle:'seal',gravity:1,reward:50,tip:'闇1面の割合攻撃や、雷編成が有効。'},
 {id:'storm',name:'暴風の祭壇',hp:3300,attack:800,def:35,weak:'R',obstacle:'restrict',gravity:.2,reward:50,tip:'3ターンごとに大攻撃。それ以外は攻撃力35％。無敵を温存。割合効果80％軽減。'}
];
const defaults={synergy:15,thunder:50,fireDef:50,fixed:50,gravity:50};
function members(ids){if(ids.length!==5||new Set(ids).size!==5||ids.some(id=>!roster.some(c=>c.id===id)))throw Error('異なるキャラを5体選んでください');return ids.map(id=>roster.find(c=>c.id===id))}
function stats(ids,tuning=defaults){const chars=members(ids),counts={};chars.forEach(c=>counts[c.element]=(counts[c.element]||0)+1);const has=a=>chars.some(c=>c.ability===a);
 return {chars,counts,hp:chars.reduce((s,c)=>s+c.hp,0)+(has('hp')?200:0)+(has('diverse')&&Object.keys(counts).length===5?250:0),def:chars.reduce((s,c)=>s+c.def,0)+(has('fireGuard')&&counts.R>=3?tuning.fireDef:0)+(has('guard')?15:0),recovery:chars.reduce((s,c)=>s+c.recovery,0)+(has('heal')?30:0)+(has('waterHeal')&&counts.B>=3?50:0),thunder:has('thunder')?tuning.thunder:0};
}
function outcome(ids,groups,enemy,currentHp,usedGravity=false,tuning=defaults,buffs={},offset=0){const s=stats(ids,tuning);let damage=0,heal=0;const attacks=[],details=[];
 for(const [i,g] of groups.entries()){let value=0;const combo=1+.15*(offset+i);
 if(g.element==='D'){heal+=Math.round(s.recovery*combo*(g.skill?3:1));attacks.push({element:g.element,value:Math.round(s.recovery*combo*(g.skill?3:1)),heal:true,skill:!!g.skill});continue}
 for(const c of s.chars.filter(c=>c.element===g.element)){
 const synergy=1+Math.max(0,s.counts[c.element]-1)*tuning.synergy/100;
 const raw=Math.round((c.atk+(c.element==='U'?s.thunder:0))*synergy*combo*(g.skill?3:1)*(enemy.weak===g.element?1.5:1)*(buffs[c.element]||1));
 const normal=Math.max(1,raw-enemy.def),fixed=c.ability==='fixed'?tuning.fixed:0;value+=normal+fixed;
 details.push(c.name+'：'+normal+(fixed?'＋固定'+fixed:''));
 if(c.ability==='leech')heal+=40;
 if(c.ability==='gravity'&&g.skill&&!usedGravity){const gravity=Math.floor(Math.max(0,currentHp-damage)*tuning.gravity/100*(enemy.gravity??1));value+=gravity;usedGravity=true;details.push('割合：'+gravity+'（現在HP基準・耐性適用）')}
 }damage+=value;attacks.push({element:g.element,value,heal:false,skill:!!g.skill,eligible:s.chars.some(c=>c.element===g.element)});
 }return {damage,heal,attacks,details,usedGravity};}
function incoming(ids,enemy,turn,tuning=defaults,immune=false,shield=false){const raw=enemy.id==='storm'&&turn%3!==0?Math.round(enemy.attack*.35):enemy.attack;return immune?0:Math.max(1,Math.round(Math.max(1,raw-stats(ids,tuning).def)*(shield?.5:1)))}
function comboBonus(result,previous){
 // A valid attack keeps the chain even when enemy defense reduces its damage to zero.
 const count=result.attacks.filter(a=>!a.heal&&a.eligible!==false).length;
 const chain=count?previous+1:result.attacks.some(a=>a.heal)?previous:0,chainRate=1+Math.min(5,Math.max(0,chain-1))*.1,burstRate=1+Math.min(4,Math.max(0,count-1))*.2;
 const multiplier=count?Math.min(2.5,chainRate*burstRate):1;
 const attacks=result.attacks.map(a=>a.heal?{...a}:{...a,value:Math.round(a.value*multiplier)});
 return {...result,attacks,damage:attacks.filter(a=>!a.heal).reduce((sum,a)=>sum+a.value,0),comboBonus:{chain,burst:count,multiplier,baseDamage:result.damage}};
}
const api={roster,dungeons,defaults,members,stats,outcome,incoming,comboBonus};root.TeamRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
