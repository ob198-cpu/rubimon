/* Campaign shell: the existing reset, skill, rotation and victory functions remain authoritative. */
(()=>{
 'use strict';
 if(!globalThis.rubimonCampaignPrototype)return;
 document.title='ルビモン｜3戦進行・検証版';
 const C=CampaignRules,collection=globalThis.RubimonCollection;
 if(!collection)throw Error('Campaign collection adapter is unavailable');
 const metricsKey='rubimon.stick.campaign.metrics.v1';
 let progress=C.createState(),storageNotice='',running=null,attempts=[],awaitingFormation=false,practicePending=!!globalThis.stickLesson;
 // Observational trace only: no RNG replacement after reset and no replay claim for refills.
 const traceKey='rubimon.stick.campaign.trace.v1',traceRevision='campaign-trace-v1';
 const implementationVersion='campaign-20261002.3',combatBaseline='baseline-2026-10-02-ae36e3e';
 const traceNotice='開始盤面と確定操作の記録。補充まで完全再現未保証';
 const traceLimits={runs:6,eventsPerRun:2000},traceConditionsByRun=new WeakMap();
 let traceRuns=[],traceStorageOK=true,traceError='',traceSkillDepth=0;
 const traceCopy=value=>JSON.parse(JSON.stringify(value));
 try{const saved=JSON.parse(localStorage.getItem(traceKey)||'null');if(saved?.version===1&&Array.isArray(saved.runs))traceRuns=saved.runs.filter(r=>r&&Number.isSafeInteger(r.id)&&r.initial&&Array.isArray(r.events)).slice(-traceLimits.runs).map(r=>({...r,events:r.events.slice(0,traceLimits.eventsPerRun)}))}catch{traceStorageOK=false;traceError='操作記録を読み込めません。'}
 function traceSnapshot(){return traceCopy({version:1,revision:traceRevision,implementationVersion,combatBaseline,notice:traceNotice,refillReplayGuaranteed:false,limits:traceLimits,storageOK:traceStorageOK,error:traceError,runs:traceRuns})}
 // Explicit, local export only. Never enumerate storage or include collection/currency.
 function trialReport(){
  const feedback={version:2,storageOK:true,error:'',responses:[]},warnings=[];
  try{
   const saved=JSON.parse(localStorage.getItem('rubimon.stick.campaign.feedback.v2')||'[]');
   if(!Array.isArray(saved)||saved.some(r=>!r||r.version!==2||!C.getStage(r.stageId)))throw Error('Invalid feedback');
   const fields=['version','implementationVersion','recordedAt','stageId','traceId','device','changed','completed','reason','nextPlan','independent','continuation'];
   feedback.responses=saved.slice(-60).map(r=>Object.fromEntries(fields.filter(key=>Object.hasOwn(r,key)).map(key=>[key,traceCopy(r[key])])));
  }catch{feedback.storageOK=false;feedback.error='保存済み回答を読み出せません。回答部分は未取得です。';warnings.push(feedback.error)}
  const trace=traceSnapshot();
  if(!trace.storageOK)warnings.push(trace.error||'操作記録の保存状態を確認できません。');
  const missing=feedback.responses.filter(r=>!trace.runs.some(run=>run.id===r.traceId&&run.stageId===r.stageId)).length;
  if(missing)warnings.push(missing+'件の回答に対応する操作記録は保持されていません。');
  if(trace.runs.some(run=>run.truncated))warnings.push('上限を超えて一部省略された操作記録があります。');
  return traceCopy({schema:'campaign-playtest-export-v1',implementationVersion,combatBaseline,exportedAt:new Date().toISOString(),
   notice:'この端末の保持中の記録のみ。未保存の回答・保持上限を超えた古い記録は含みません。人の試遊・実機合格を自動認定しません。',
   trace,attempts:attempts.slice(-60),feedback,warnings});
 }
 function persistTrace(){try{localStorage.setItem(traceKey,JSON.stringify({version:1,runs:traceRuns}));traceStorageOK=true;traceError=''}catch{traceStorageOK=false;traceError='操作記録を保存できません。現在の記録はこの画面内だけに残ります。'}}
 // A diagnostic must never stop a rotation, skill, reset or reward commit.
 function observeTrace(action){try{return action()}catch{traceStorageOK=false;traceError='操作記録の取得に失敗しました。対戦と報酬保存は継続します。'}}
 function traceConditions(){return traceCopy({team:squad,dungeon,enemy:currentEnemy(),settings:{cubeSize:E.size,difficulty,customColorCount,colorPool:activePool(),baseRule,tuning,refillAssistance,manualImmune,enemyObstaclesEnabled,challengeMode,lineChallenge}})}
 function tracePoint(){return {moves,turnMoves,turnLimit,enemyTurns,hp,enemyHp}}
 function traceCurrent(){return running?.trace&&running.token===roundToken&&!tutorial&&!globalThis.stickLesson?running.trace:null}
 function traceEvent(record,type,data={},point=tracePoint(),save=true){
  if(!record)return;
  if(record.events.length>=traceLimits.eventsPerRun){record.truncated=true;record.omittedEvents=(record.omittedEvents||0)+1;if(save)persistTrace();return}
  const event={sequence:record.events.length,type,at:point,...data},conditions=traceConditions(),signature=JSON.stringify(conditions);
  if(signature!==traceConditionsByRun.get(record)){event.conditions=conditions;traceConditionsByRun.set(record,signature)}
  record.events.push(traceCopy(event));if(save)persistTrace();
 }
 function beginTrace(reason){observeTrace(()=>{
  const conditions=traceConditions(),record={id:Math.max(0,...traceRuns.map(r=>r.id))+1,revision:traceRevision,implementationVersion,combatBaseline,notice:traceNotice,refillReplayGuaranteed:false,stageId:running.id,seed:running.seed,roundToken,reason,startedAt:new Date().toISOString(),outcome:null,truncated:false,
   initial:{...conditions,board:traceCopy(state),battle:traceCopy({hp,enemyHp,moves,turnMoves,turnLimit,enemyTurns,phase,cooldowns,teamSpent:[...teamSpent],teamBuffs,teamImmune,teamShield,teamConversion,gravityUsed,obstacles,skillUses,shuffleCharges,clockUsed,openFaces,attackChain,bestChain,battleDamage,spentElements:[...spentElements]})},events:[]};
  traceRuns.push(record);traceRuns=traceRuns.slice(-traceLimits.runs);running.trace=record;traceConditionsByRun.set(record,JSON.stringify(conditions));traceEvent(record,'battle-start',{reason});
 })}
 function finishTrace(outcome){
  if(!running?.trace||running.trace.outcome)return;
  if(traceSkillDepth){running.tracePendingOutcome=outcome;return}
  observeTrace(()=>{running.trace.outcome=outcome;traceEvent(running.trace,'outcome',{outcome})});
 }
 try{progress=C.parseState(localStorage.getItem(C.STORAGE_KEY));const saved=JSON.parse(localStorage.getItem(metricsKey)||'[]');if(Array.isArray(saved))attempts=saved.filter(a=>a&&C.getStage(a.stageId)).slice(-60)}catch{storageNotice='進行の保存を読み込めません。ブラウザーの保存設定を確認してください。'}
 // The award ledger is committed with collection in one write. It repairs an interrupted progress write.
 function reconcile(){
  const ledger=collection.snapshot().campaignReceipts||{};
  progress=C.normalizeState({version:1,completed:C.stages.filter(s=>ledger['campaign:'+s.id]).map(s=>s.id)});
 }
 reconcile();
 function persistProgress(){try{localStorage.setItem(C.STORAGE_KEY,C.serializeState(progress));return true}catch{storageNotice='報酬は保存しましたが、進行の表示用保存に失敗しました。次回は報酬台帳から復元します。';return false}}
 function remember(outcome){
  if(!running||running.recorded||running.token===null)return;
  finishTrace(outcome);
  running.recorded=true;
  attempts.push({stageId:running.id,seed:running.seed,outcome,team:[...squad],moves,enemyTurns,damage:battleDamage,bestChain,
   skills:[...running.skills],resets:balanceMetrics.repairs,assisted:manualImmune||!refillAssistance,
   difficulty,colors:activePool().length,cubeSize:E.size,elapsedSeconds:Math.round((Date.now()-running.started)/1000)});
  attempts=attempts.slice(-60);try{localStorage.setItem(metricsKey,JSON.stringify(attempts))}catch{storageNotice='対戦記録を保存できません。勝敗・操作は継続できます。'}
 }
 const dialog=document.createElement('dialog');dialog.className='campaign-dialog';dialog.id='campaignDialog';dialog.setAttribute('aria-labelledby','campaignTitle');
 dialog.innerHTML='<div class="campaign-head"><h2 id="campaignTitle">3戦の冒険 · 検証版</h2><button type="button" id="campaignClose">盤面へ</button></div><div class="campaign-body"></div>';
 document.body.append(dialog);const body=dialog.querySelector('.campaign-body');
 dialog.querySelector('#campaignClose').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>e.stopPropagation());
 function element(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node}
 function busy(){return !!tutorial||!!active||queue.length>0||phase==='resolving'||!!panelPick||!!globalThis.stickLesson}
 function open(){if(active||queue.length||phase==='resolving'||panelPick||tutorial)return;render();if(!dialog.open)dialog.showModal()}
 function formation(){
  if(busy())return;dialog.close();victoryScreen.hidden=true;awaitingFormation=collection.openFormation()!==false;
 }
 document.querySelector('.lobby').addEventListener('close',()=>{if(awaitingFormation){awaitingFormation=false;open()}});
 function render(){
  reconcile();body.replaceChildren();
  body.append(element('p','盤面を読む → 防御への対処を選ぶ → 獲得した仲間で攻撃を組み立てる。','campaign-note'));
  body.append(element('p','本番の所持・石・編成を初回だけコピーし、この検証版の進行と所持は別に保存します。本番データは変更しません。','campaign-note'));
  body.append(element('p','出発時は3×3・通常6色・全6面で攻撃・補充ON・無敵OFF・妨害OFF。2戦目だけ短期検証用に敵HPを調整。防御・技の待ち時間は既存ルールです。','campaign-note'));
  body.append(element('p','これは判断の変化を調べる試作です。特に3戦目の戦法の使い分けは未検証で、製品版の進行設計が完成した状態ではありません。','campaign-note'));
  if(storageNotice)body.append(element('p',storageNotice,'campaign-error'));
  if(globalThis.stickLesson){
   body.append(element('p','操作練習を終えるか「終了する」で閉じてから出発できます。','campaign-note'));
   const practice=element('button','操作練習へ');practice.type='button';practice.onclick=()=>dialog.close();body.append(practice);
  }
  const steps=element('div',null,'campaign-progress'),next=C.nextStage(progress);
  for(const stage of C.stages)steps.append(element('span',String(stage.order)+' '+(progress.completed.includes(stage.id)?'CLEAR':C.isUnlocked(progress,stage.id)?'挑戦可':'未解放'),progress.completed.includes(stage.id)?'is-cleared':stage===next?'is-current':''));body.append(steps);
  for(const stage of C.stages){
   const cleared=progress.completed.includes(stage.id),unlocked=C.isUnlocked(progress,stage.id),enemy={...T.dungeons.find(d=>d.id===stage.dungeonId),...stage.enemyOverrides},card=element('section',null,'campaign-card'+(stage===next?' is-next':''));
   card.append(element('h3',stage.title),element('p',stage.goal),element('p',enemy.name+' · HP '+(enemy.id==='grove'?800:Math.round(enemy.hp*Q.settings.normal.hp))+' / 防御 '+enemy.def+' / 水弱点 ×1.5','campaign-enemy'));
   card.append(element('p',cleared?'初回報酬は受取済み。再戦で重複獲得はありません。':'初回報酬：'+stage.reward.label,'campaign-reward'));
   const details=element('details');details.append(element('summary','攻略の選択肢'));const list=element('ul');for(const tactic of stage.tactics)list.append(element('li',tactic));details.append(list);card.append(details);
   const actions=element('div',null,'campaign-actions'),go=element('button',cleared?'この戦いを再挑戦':'この戦いに出発');go.type='button';go.disabled=!unlocked||busy();go.onclick=()=>start(stage.id);actions.append(go);
   if(unlocked){const team=element('button','5体編成を確認');team.type='button';team.disabled=busy();team.onclick=formation;actions.append(team)}card.append(actions);body.append(card);
  }
  if(!next)body.append(element('p','3戦の試作区間をクリア。ここで終了できます。別の編成・狙い方での再挑戦は任意です。','campaign-reward'));
  const records=element('details');records.append(element('summary','検証記録 · '+attempts.length+'戦'));for(const a of attempts.slice(-6).reverse())records.append(element('p',C.getStage(a.stageId).title+' / '+({victory:'勝利',lost:'敗北',aborted:'中断'}[a.outcome]||a.outcome)+' / '+a.moves+'手 / CHAIN '+a.bestChain+' / 技 '+a.skills.join('・'),'campaign-note'));body.append(records);
  const traceDetails=element('details');traceDetails.id='campaignTrace';traceDetails.append(element('summary','開始条件・操作記録を確認'));
  const latestTrace=traceRuns.at(-1);
  traceDetails.append(element('p',traceNotice+'。直近6戦まで。外部へは送信しません。','campaign-note'));
  if(traceError)traceDetails.append(element('p',traceError,'campaign-error'));
  if(latestTrace){
   traceDetails.append(element('p',(C.getStage(latestTrace.stageId)?.title||latestTrace.stageId)+' / seed '+latestTrace.seed+' / 記録 '+latestTrace.events.length+'件 / '+(latestTrace.outcome||'対戦中')+(latestTrace.truncated?' / 上限超過・一部省略':''),'campaign-note'));
   const reveal=element('button','最新1戦のJSONを表示');reveal.type='button';reveal.id='campaignTraceReveal';
   const output=element('pre',null,'campaign-trace');output.hidden=true;output.id='campaignTraceJson';output.setAttribute('aria-label','最新1戦の開始条件と確定操作');
   reveal.onclick=()=>{output.textContent=JSON.stringify(traceCopy(latestTrace),null,2);output.hidden=false;reveal.hidden=true};traceDetails.append(reveal,output);
  }else traceDetails.append(element('p','出発すると、開始盤面と確定した回転・技を記録します。','campaign-note'));
  body.append(traceDetails);
  const feedback=element('details');feedback.append(element('summary','試遊で判断が変わったか記録'));const form=document.createElement('form');form.id='campaignFeedback';
  form.innerHTML='<p class="campaign-note">任意回答。名前などの個人情報は不要です。実際に遊んだ内容だけを記録してください。</p><label>対象の戦い <select name="stage"></select></label><label>使用環境 <select name="device"><option value="unknown">未記入</option><option value="pc-mouse">PC・マウス</option><option value="android-line">Android・LINE内ブラウザー</option><option value="android-chrome">Android・Chrome</option><option value="iphone-safari">iPhone・Safari</option><option value="iphone-line">iPhone・LINE内ブラウザー</option><option value="other">その他（下欄に記入）</option></select></label><label>戦い方は変わった？ <select name="changed"><option value="unknown">未判断</option><option value="yes">変わった</option><option value="no">同じことの繰り返し</option></select></label><label>何を見て、何を選び変えたか<textarea name="reason" maxlength="800" placeholder="見た情報、選んだ手、選ばなかった手"></textarea></label><label>仲間獲得・編成変更で次にできそうなこと<textarea name="nextPlan" maxlength="800"></textarea></label><label>説明なしで自分でできるようになったこと<textarea name="independent" maxlength="800"></textarea></label><label>続きを遊ぶ理由／やめたい理由・操作で困った点<textarea name="continuation" maxlength="800"></textarea></label><button type="submit">この端末に記録</button><p class="campaign-note" role="status"></p>';
  const stageChoice=form.querySelector('select[name="stage"]');for(const stage of C.stages){const option=element('option',stage.title);option.value=stage.id;stageChoice.append(option)}stageChoice.value=running?.id||next?.id||C.stages[0].id;
  form.onsubmit=e=>{e.preventDefault();try{
   const key='rubimon.stick.campaign.feedback.v2',saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))throw Error('Invalid feedback');
   const stageId=form.elements.stage.value;if(!C.getStage(stageId))throw Error('Invalid stage');
   const matchingTrace=[...traceRuns].reverse().find(record=>record.stageId===stageId);
   const response={version:2,implementationVersion,recordedAt:new Date().toISOString(),stageId,traceId:matchingTrace?.id||null,device:form.elements.device.value,changed:form.elements.changed.value,completed:[...progress.completed]};
   for(const key of ['reason','nextPlan','independent','continuation'])response[key]=String(form.elements[key].value).slice(0,800);
   localStorage.setItem(key,JSON.stringify([...saved,response].slice(-60)));form.querySelector('[role="status"]').textContent='記録しました。過去の回答は残し、外部へは送信していません。';
  }catch{form.querySelector('[role="status"]').textContent='保存できません。過去の回答は変更していません。'}};feedback.append(form);body.append(feedback);
  const transfer=element('details');transfer.id='campaignTrialExport';transfer.append(element('summary','試遊記録を取り出す'));
  transfer.append(element('p','保存済み回答（最大60件）・操作記録（直近6戦）・戦闘集計を、この端末から取り出します。未保存の回答は含みません。参加者ごとに保存し、共有前に本人の同意と内容を確認してください。回答には名前・連絡先を記入しないでください。所持・石は取得せず、外部へ自動送信しません。','campaign-note'));
  const exportActions=element('div',null,'campaign-actions'),reveal=element('button','記録JSONを表示'),download=element('button','表示したJSONを保存');
  reveal.type=download.type='button';reveal.id='campaignTrialReveal';download.id='campaignTrialDownload';download.disabled=true;
  const output=element('textarea',null,'campaign-trace');output.id='campaignTrialJson';output.hidden=true;output.readOnly=true;output.setAttribute('readonly','');output.setAttribute('wrap','off');output.setAttribute('aria-label','保持中の試遊記録JSON');
  const status=element('p',null,'campaign-note');status.id='campaignTrialStatus';status.setAttribute('role','status');let displayed=null;
  reveal.onclick=()=>{try{
   const report=trialReport();displayed={text:JSON.stringify(report,null,2),filename:'rubimon-playtest-'+report.exportedAt.replace(/[:.]/g,'-')+'.json'};
   output.value=output.textContent=displayed.text;output.hidden=false;download.disabled=false;
   status.textContent='操作 '+report.trace.runs.length+'戦 / 回答 '+report.feedback.responses.length+'件 / 集計 '+report.attempts.length+'戦。'+report.warnings.join(' ');
  }catch{displayed=null;output.hidden=true;download.disabled=true;status.textContent='記録を表示できません。保存済みデータは変更していません。'}};
  download.onclick=()=>{
   if(!displayed)return;let url=null,link=null;
   try{
    url=URL.createObjectURL(new Blob([displayed.text],{type:'application/json;charset=utf-8'}));link=document.createElement('a');link.href=url;link.download=displayed.filename;link.hidden=true;document.body.append(link);link.click();
    status.textContent='ファイル保存を要求しました。保存されないブラウザーでは、表示したJSONを選択してコピーしてください。外部への送信はありません。';
   }catch{status.textContent='ファイル保存を開始できません。表示したJSONを選択してコピーしてください。保存済みデータは変更していません。'}
   finally{if(link)link.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url),1000)}
  };
  exportActions.append(reveal,download);transfer.append(exportActions,status,output);body.append(transfer);
 }
 const navButton=element('button','3戦の冒険 · 検証');navButton.type='button';navButton.id='campaignOpen';navButton.onclick=()=>{byId('battleMenu').close();open()};document.querySelector('.lobby-nav').prepend(navButton);
 // A fixed initial seed makes starting layouts comparable without replacing board generation.
 function seededRandom(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
 function withSeed(seed,action){const original=Math.random;Math.random=seededRandom(seed);try{return action()}finally{Math.random=original}}
 const normalReset=reset;
 function sameStageEnemy(){
  if(!running)return false;
  const stage=C.getStage(running.id),expected={...T.dungeons.find(d=>d.id===stage.dungeonId),...stage.enemyOverrides};
  return ['id','hp','attack','def','weak'].every(key=>dungeon[key]===expected[key]);
 }
 reset=function(){
  const restarting=!!running&&running.token!==null;
  if(restarting)observeTrace(()=>traceEvent(running.trace,'reset',{reason:sameStageEnemy()?'restart':'different-enemy'}));
  if(running&&!sameStageEnemy()){remember('aborted');running=null}
  if(running){remember('aborted');running={...running,started:Date.now(),skills:new Set(),recorded:false,trace:null,tracePendingOutcome:null};withSeed(running.seed,normalReset);running.token=roundToken;beginTrace(restarting?'reset':'stage-start')}
  else normalReset();
 };
 function start(id){
  reconcile();if(busy()||!C.isUnlocked(progress,id))return false;
  const stage=C.getStage(id);remember('aborted');running=null;
  // Entry setup only. No per-turn or engine rule changes: the normal battle path is reused.
  if(lineChallenge)setLineChallenge(lineChallenge);if(challengeMode)setChallengeMode(false);
  dungeon={...T.dungeons.find(d=>d.id===stage.dungeonId),...stage.enemyOverrides};byId('dungeonSelect').value=dungeon.id;
  difficulty='normal';customColorCount=null;byId('difficulty').value='normal';byId('attackRule').value='all';
  tuning={...T.defaults};for(const key in tuning)byId('tune-'+key).value=String(tuning[key]);
  refillAssistance=true;manualImmune=false;enemyObstaclesEnabled=false;byId('enemyObstacles').value='off';
  byId('refillToggle').textContent='補充ON';byId('refillToggle').title='補充ON：コンボしやすい属性を補充します';byId('refillToggle').setAttribute('aria-pressed','true');
  byId('immuneToggle').textContent='無敵OFF';byId('immuneToggle').title='自分の無敵をONにする';byId('immuneToggle').setAttribute('aria-pressed','false');
  running={id,seed:61002+stage.order*97,started:Date.now(),skills:new Set(),recorded:false,token:null};
  reset();byId('battleLog').textContent=stage.goal;dialog.close();victoryScreen.hidden=true;return true;
 }
 const normalSkill=useCharacterSkill;
 useCharacterSkill=function(c){
  const record=traceCurrent(),wait=cooldowns[c.id]||0,point=tracePoint();traceSkillDepth++;
  const conversion=['fireWater','windFire','earthThunder','thunderDark'].includes(c.action);
  const accepted=running&&!panelPick&&!tutorial&&!active&&!queue.length&&phase==='ready'&&!(cooldowns[c.id]||0)&&!(teamConversion&&(conversion||c.action==='shuffle'));
  if(accepted)running.skills.add(c.id);
  try{return normalSkill.apply(this,arguments)}finally{
   observeTrace(()=>{if(record&&wait===0&&cooldowns[c.id]===c.cd&&teamSpent.has(c.id))traceEvent(record,'character-skill',{allyId:c.id,action:c.action},point)});
   traceSkillDepth--;if(!traceSkillDepth&&running?.tracePendingOutcome){const outcome=running.tracePendingOutcome;running.tracePendingOutcome=null;finishTrace(outcome)}
  }
 };
 // E.move is also used by solvers and animation previews. Only the live active
 // board commit is a player operation; canceled/blocked queues never reach it.
 const normalMove=E.move;
 E.move=function(board,face,dir=1){
  const record=board===state&&active&&['user','undo'].includes(active.kind)&&active.face===face&&active.dir===dir?traceCurrent():null;
  const move=record?{face,dir,axis:E.slices[face].axis,layer:E.slices[face].layer,kind:active.kind}:null,point=record?tracePoint():null;
  const result=normalMove.apply(this,arguments);if(record)observeTrace(()=>traceEvent(record,'rotation',{move},point));return result;
 };
 if(typeof boardClick==='function'){
  const normalBoardClick=boardClick;
  boardClick=function(){
   const record=traceCurrent(),picked=panelPick,wait=picked?(cooldowns[picked.char.id]||0):0,point=tracePoint();
   const result=normalBoardClick.apply(this,arguments);
   observeTrace(()=>{if(record&&picked&&picked.ids.size===4&&!panelPick&&wait===0&&cooldowns[picked.char.id]===picked.char.cd&&teamSpent.has(picked.char.id))traceEvent(record,'character-skill',{allyId:picked.char.id,action:picked.char.action,targetIds:[...picked.ids]},point)});return result;
  };
 }
 if(typeof useBoardSkill==='function'){
  const normalBoardSkill=useBoardSkill;
  useBoardSkill=function(kind){
   const record=traceCurrent(),uses=skillUses[kind],point=tracePoint(),result=normalBoardSkill.apply(this,arguments);
   if(record&&skillUses[kind]===uses-1)observeTrace(()=>traceEvent(record,'board-skill',{skill:kind},point));return result;
  };
 }
 // Observe the existing limited board rescue and pass controls; their handlers
 // remain authoritative for effects, costs, guards and counterattack timing.
 const rescueButton=byId('rescue'),normalRescue=rescueButton.onclick;
 if(typeof normalRescue==='function')rescueButton.onclick=function(){
  const record=traceCurrent(),charges=shuffleCharges,point=tracePoint(),result=normalRescue.apply(this,arguments);
  if(record&&shuffleCharges===charges-1)observeTrace(()=>traceEvent(record,'rescue',{chargesBefore:charges,chargesAfter:shuffleCharges,board:state},point));return result;
 };
 const passButton=byId('passTurn'),normalPass=passButton.onclick;
 if(typeof normalPass==='function')passButton.onclick=function(){
  const record=traceCurrent(),accepted=record&&!tutorial&&!active&&!queue.length&&phase==='ready',point=tracePoint();
  // A pass with no matches can lose synchronously inside resolveTurn. Defer
  // only the trace outcome so the accepted pass precedes that defeat record.
  if(accepted)traceSkillDepth++;
  try{
   const result=normalPass.apply(this,arguments);if(accepted)observeTrace(()=>traceEvent(record,'pass',{},point));return result;
  }finally{
   if(accepted){traceSkillDepth--;if(!traceSkillDepth&&running?.tracePendingOutcome){const outcome=running.tracePendingOutcome;running.tracePendingOutcome=null;finishTrace(outcome)}}
  }
 };
 const normalRefresh=refresh;
 refresh=function(){normalRefresh();if(running&&phase==='lost')remember('lost');if(practicePending&&!globalThis.stickLesson){practicePending=false;open()}};
 const resultText=element('p',null,'campaign-result');resultText.id='campaignOutcome';document.querySelector('.victory-panel').append(resultText);
 const nextButton=element('button','次の戦いを選ぶ');nextButton.type='button';nextButton.id='campaignNext';nextButton.onclick=()=>{victoryScreen.hidden=true;open()};
 const formationButton=element('button','獲得した仲間を編成');formationButton.type='button';formationButton.id='campaignFormation';formationButton.onclick=formation;
 document.querySelector('.victory-actions').append(formationButton,nextButton);
 function recordVictory(){
  if(!running||phase!=='victory'||enemyHp!==0||running.token!==roundToken||tutorial)return null;
  if(!sameStageEnemy()||E.size!==3||difficulty!=='normal'||customColorCount!==null||baseRule!=='all'||Object.keys(T.defaults).some(key=>tuning[key]!==T.defaults[key])){
   resultText.textContent='検証条件を変更した対戦です。報酬は受け取らず、冒険の出発画面から再挑戦してください。';return null;
  }
  remember('victory');reconcile();const completed=C.completeStage(progress,running.id,collection.snapshot());
  if(!completed.ok){resultText.textContent='進行を確定できません：'+completed.reason;return null}
  try{
   let receipt=null;if(completed.firstClear)receipt=collection.awardOnce('campaign:'+running.id,completed.reward);
   progress=completed.state;reconcile();persistProgress();
   resultText.textContent=(receipt?.reward?.label||'クリア済みの再戦です。報酬の重複なし。')+(storageNotice?' ／ '+storageNotice:'');
   byId('victoryReward').textContent=receipt?.reward?.type==='character'?'仲間 1体':receipt?.reward?.shards?receipt.reward.shards+' 欠片':'受取済み';
   byId('battleLog').textContent='CLEAR！ '+resultText.textContent;nextButton.textContent=C.nextStage(progress)?'次の戦いを選ぶ':'3戦クリア · 結果を見る';nextButton.disabled=false;return completed;
  }catch(error){resultText.textContent='報酬を保存できません。保存設定・空き容量を確認し、「報酬の保存を再試行」を押してください。';nextButton.textContent='報酬の保存を再試行';nextButton.onclick=()=>{if(recordVictory()){nextButton.onclick=()=>{victoryScreen.hidden=true;open()}}};return null}
 }
 const normalVictory=showVictory;
 showVictory=function(){normalVictory();resultText.textContent='';formationButton.hidden=nextButton.hidden=!running;nextButton.onclick=()=>{victoryScreen.hidden=true;open()};recordVictory();if(phase==='victory'&&enemyHp===0&&traceCurrent())finishTrace('victory')};
 globalThis.RubimonCampaign={open,start,progress:()=>C.normalizeState(progress),recordVictory,trace:traceSnapshot,trialReport};
 render();dialog.showModal();
})();
