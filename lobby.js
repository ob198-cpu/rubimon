/* Local-only collection prototype. No paid currency or server entitlement. */
(()=>{
const initial=T.roster.filter(c=>c.source==='初期').map(c=>c.id),key='rubimon.collection.v1';
let save={owned:initial,gems:3000,shards:0,team:[...squad]},storageOK=true;
try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw){save.owned=[...new Set([...initial,...(Array.isArray(raw.owned)?raw.owned:[])])].filter(id=>T.roster.some(c=>c.id===id));save.gems=Number.isSafeInteger(raw.gems)&&raw.gems>=0?raw.gems:3000;save.shards=Number.isSafeInteger(raw.shards)&&raw.shards>=0?raw.shards:0;if(Array.isArray(raw.team)&&raw.team.length===5&&new Set(raw.team).size===5&&raw.team.every(id=>save.owned.includes(id)))save.team=raw.team}}catch{storageOK=false}
function persist(){try{localStorage.setItem(key,JSON.stringify(save))}catch{storageOK=false}}
function sync(){for(let i=0;i<5;i++)for(const option of byId('slot'+i).options)option.disabled=!save.owned.includes(option.value)}
squad=[...save.team];for(let i=0;i<5;i++)byId('slot'+i).value=squad[i];sync();buildSquadSkills();reset();
const oldApply=byId('applySquad').onclick;byId('applySquad').onclick=()=>{if([...Array(5)].some((_,i)=>!save.owned.includes(byId('slot'+i).value))){byId('squadStats').textContent='未入手キャラは編成できません。';return}oldApply();save.team=[...squad];persist()};
const style=document.createElement('style');style.textContent=`
.lobby-nav{display:flex;gap:8px;grid-column:1/-1;order:0}.lobby-nav button{flex:1;min-height:44px;border-color:#af915b;color:#f0dcae}
.lobby{width:min(1040px,calc(100vw - 24px));max-height:92dvh;padding:0;border:1px solid #c2a36c;border-radius:18px;color:#ede4d0;background:radial-gradient(ellipse at top,#284347,#171d21 75%);box-shadow:0 25px 100px #000a}.lobby::backdrop{background:#050b10cc;backdrop-filter:blur(5px)}
.lobby-head{position:sticky;top:0;z-index:3;background:#172a2bf5;padding:18px 22px;border-bottom:1px solid #927642;display:flex;justify-content:space-between;align-items:center;gap:16px}.lobby-head h2{margin:0;font:700 22px 'Yu Mincho',serif;color:#ebd39c}.lobby-body{padding:22px}.lobby-note{font-size:12px;line-height:1.8;color:#b8c6bf}.hero-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px}.hero{min-width:0;border:1px solid #75664b;border-top:3px solid var(--element);border-radius:12px;background:linear-gradient(135deg,#334341,#192529);padding:16px}.hero.locked{opacity:.65}.hero h3{margin:7px 0;color:#f1dfb5;font-size:16px}.hero p{font-size:11px;line-height:1.8;margin:6px 0}.hero canvas{width:58px;height:58px;aspect-ratio:1;margin:auto}.hero .hero-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#dfcfae;font-size:11px}.hero button{width:100%;margin-top:10px;min-height:40px}.team-slots{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:14px 0}.team-slots button{min-height:75px;font-size:11px;padding:8px 3px;overflow-wrap:anywhere}.team-slots button[aria-pressed=true]{border-color:#ffe2a0;background:#496158;box-shadow:0 0 0 2px #b48c4b}.lobby-total{padding:12px;border:1px solid #736743;border-radius:9px;background:#0d2425;margin:12px 0;line-height:1.8;font-size:12px}.summon-stage{text-align:center;padding:24px 12px;border:1px solid #ae8b51;border-radius:14px;background:radial-gradient(ellipse,#705b3655,#172a33);margin-bottom:20px}.summon-stage h3{font:700 27px 'Yu Mincho',serif;margin:10px}.summon-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin:18px}.summon-actions button{min-height:48px;min-width:160px;background:linear-gradient(#696044,#3d382b);color:#fff0be}.lobby-message{line-height:1.8;color:#ffe2a0;font-size:13px}.lobby-result{animation:summonReveal .4s ease-out}@keyframes summonReveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media(max-width:520px){.lobby-body{padding:14px}.hero-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hero{padding:10px}.hero h3{font-size:13px}.hero-stats{grid-template-columns:1fr!important}.lobby-head{padding:14px}.team-slots{gap:4px}.team-slots button{font-size:10px}.summon-actions button{min-width:120px}}@media(prefers-reduced-motion:reduce){.lobby-result{animation:none}}
`;document.head.append(style);
const nav=document.createElement('nav');nav.className='lobby-nav';nav.setAttribute('aria-label','キャラと編成');
const navAnchor=document.querySelector('.mobile-battle-details')||document.querySelector('.rule-panel');navAnchor.before(nav);
const dialog=document.createElement('dialog');dialog.className='lobby';dialog.setAttribute('aria-labelledby','lobbyTitle');dialog.innerHTML='<div class="lobby-head"><h2 id="lobbyTitle"></h2><button id="lobbyClose">戦闘へ戻る</button></div><div class="lobby-body"></div>';document.body.append(dialog);
const content=dialog.querySelector('.lobby-body');dialog.querySelector('#lobbyClose').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>e.stopPropagation());
let page='characters',draft=[...squad],slot=0,results=[];
for(const [id,label] of [['characters','キャラ図鑑'],['formation','5体編成'],['gacha','精霊ガチャ']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(tutorial||active||queue.length||phase==='resolving'){byId('battleLog').textContent='回転・攻撃・デモの終了後に開けます。';return}page=id;draft=[...squad];results=[];render();dialog.showModal()};nav.append(b)}
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e}
function card(c,mode,badge=''){
 const owned=save.owned.includes(c.id),box=el('article',null,'hero'+(!owned?' locked':''));box.style.setProperty('--element',B.spirits[c.element].color);
 const icon=document.createElement('canvas');icon.width=116;icon.height=116;drawSpirit(icon.getContext('2d'),c.element,58,58,45);box.append(icon,el('p',badge||B.spirits[c.element].element+'属性 · '+(owned?'入手済み':'未入手')),el('h3',c.name));
 const stats=el('div',null,'hero-stats');for(const t of ['HP '+c.hp,'攻撃 '+c.atk,'防御 '+c.def,'回復 '+c.recovery])stats.append(el('span',t));box.append(stats,el('p','固有：'+c.passive),el('p','技：'+c.skill+' ／ '+c.cd+'ターン'));
 if(mode==='formation'){const b=el('button',owned?'この枠に配置':'未入手');b.disabled=!owned;b.onclick=()=>{const other=draft.indexOf(c.id);if(other>=0)[draft[other],draft[slot]]=[draft[slot],draft[other]];else draft[slot]=c.id;render()};box.append(b)}
 if(mode==='characters'&&!owned){const b=el('button','欠片5個で交換');b.disabled=save.shards<5;b.onclick=()=>{if(save.shards<5||save.owned.includes(c.id))return;save.shards-=5;save.owned.push(c.id);persist();sync();render()};box.append(b)}
 return box;
}
function roll(count){
 if(save.gems<count*300)return;save.gems-=count*300;results=[];
 for(let i=0;i<count;i++){const c=T.roster[Math.floor(Math.random()*T.roster.length)],fresh=!save.owned.includes(c.id);if(fresh)save.owned.push(c.id);else save.shards++;results.push({c,fresh})}
 persist();sync();render();
}
function render(){
 content.replaceChildren();dialog.querySelector('h2').textContent={characters:'精霊名鑑',formation:'出撃編成',gacha:'精霊召喚'}[page];
 content.append(el('p','試作版・実課金なし ／ 所持 '+save.owned.length+' / '+T.roster.length+'体 ／ 無料試作石 '+save.gems+' ／ 欠片 '+save.shards,'lobby-note'));
 if(!storageOK)content.append(el('p','保存機能を利用できません。この画面を閉じたり再読み込みするとデータを失う場合があります。','lobby-message'));
 if(page==='formation'){
  content.append(el('p','入れ替える枠を選び、下のキャラを選択。同じキャラを選ぶと位置を交換します。適用すると現在の戦闘を最初から開始します。','lobby-note'));
  const slots=el('div',null,'team-slots');draft.forEach((id,i)=>{const b=el('button',(i+1)+'枠\n'+T.roster.find(c=>c.id===id).name);b.setAttribute('aria-pressed',String(i===slot));b.onclick=()=>{slot=i;render()};slots.append(b)});content.append(slots);
  const stats=T.stats(draft,tuning);content.append(el('div','HP '+stats.hp+' ／ 防御 '+stats.def+' ／ 回復 '+stats.recovery+'\n属性：'+Object.entries(stats.counts).map(([k,v])=>B.spirits[k].element+'×'+v).join(' ・ ')+' ／ 同属性1体追加ごとに攻撃＋'+tuning.synergy+'%','lobby-total'));
  const unavailable=Object.keys(stats.counts).filter(k=>!B.pools[difficulty].includes(k));if(unavailable.length)content.append(el('p','現在の難易度では '+unavailable.map(k=>B.spirits[k].element).join('・')+' パネルは補充されません。闇・鋼はHardや変換技で活用してください。','lobby-note'));
  const apply=el('button','この5体で戦闘を開始');apply.onclick=()=>{if(active||queue.length||phase==='resolving'||tutorial)return;squad=[...draft];save.team=[...squad];for(let i=0;i<5;i++)byId('slot'+i).value=squad[i];persist();buildSquadSkills();reset();dialog.close()};content.append(apply);
 }
 if(page==='gacha'){
  const stage=el('section',null,'summon-stage');stage.append(el('p','ELEMENTAL SUMMON'),el('h3','精霊との契約'),el('p','全15体が同確率：各1/15（約6.67%）。10連の確定枠・天井なし。','lobby-note'),el('p','1回300石。重複は欠片1個、欠片5個で未入手キャラ1体と交換。','lobby-note'));
  const actions=el('div',null,'summon-actions');for(const n of [1,10]){const b=el('button',n+'回召喚 · '+n*300+'石');b.disabled=save.gems<n*300;b.onclick=()=>roll(n);actions.append(b)}stage.append(actions);
  const grant=el('button','テスト用：無料石＋3000');grant.onclick=()=>{save.gems=Math.min(999999,save.gems+3000);persist();render()};stage.append(grant,el('p','購入機能はありません。テスト石は何度でも補充できます。正式版の所持・価格・確率を保証しません。','lobby-note'));content.append(stage);
  const grid=el('div',null,'hero-grid lobby-result');grid.setAttribute('aria-live','polite');for(const r of results)grid.append(card(r.c,'result',r.fresh?'NEW · 新しい仲間':'重複 · 欠片＋1'));content.append(grid);
 }else{const grid=el('div',null,'hero-grid');for(const c of T.roster)grid.append(card(c,page));content.append(grid)}
 content.append(el('p','このブラウザーに保存されます。別端末との同期なし。サイトデータを削除すると所持データも消えます。','lobby-note'));
}
persist();
})();
