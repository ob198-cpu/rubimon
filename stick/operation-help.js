// Interactive practice uses a temporary board; combat and the saved board stay intact.
(()=>{
 const hint=byId('hint'),stack=document.createElement('div');stack.className='hint-operation-stack';hint.before(stack);
 const button=document.createElement('button');button.id='operationHelpOpen';button.type='button';button.textContent='操作';stack.append(button,hint);
 const coach=document.createElement('section');coach.id='operationCoach';coach.hidden=true;coach.setAttribute('aria-live','polite');
 coach.innerHTML='<strong id="operationStep"></strong><p id="operationPrompt"></p><button type="button" id="operationNext" hidden>次へ</button> <button type="button" id="operationExit">終了する</button>';
 document.querySelector('.stick-instructions').prepend(coach);
 let lesson=null,token=0;
 const pad=document.querySelector('.stick-pad');
 function show(step){
  lesson.step=step;byId('operationStep').textContent=step+' / 7 · '+({1:'見回す',2:'パネルを選ぶ',3:'回転する',4:'そろえて攻撃',5:'チェイン',6:'バースト',7:'ボーナスを重ねよう'})[step];
  byId('operationPrompt').textContent=({1:'キューブをドラッグして見回してみよう',2:'回したいパネルをタップして選ぼう',3:'右のトリガーを上下・左右へ動かして離そう',4:'編成中の攻撃属性を、攻撃可能な面で縦・横に'+E.size+'個そろえると自動攻撃！',5:'手を続けて攻撃が成立するとチェイン！ 連続回数でダメージUP。0ダメージでも続きます。',6:'1手で複数の攻撃が同時に成立するとバースト！ 同時攻撃が多いほどダメージUP。',7:'回復や盤面リセットではチェイン継続。チェインとバーストは重ねられます。遊んで試そう！'})[step];
  byId('operationExit').textContent=step===7?'遊ぶ':'終了する';
  byId('operationNext').hidden=step<4||step===7;
  document.body.classList.toggle('lesson-rules',step>=4);
  canvas.classList.toggle('lesson-target',step<3);pad.classList.toggle('lesson-target',step===3);pad.inert=step!==3;
 }
 function end(){
  if(!lesson)return;token++;
  if(active?.kind==='operation-practice')active=null;
  queue=queue.filter(m=>m.kind!=='operation-practice');
  state=lesson.state;viewYaw=lesson.yaw;viewPitch=lesson.pitch;
  for(const [node,value] of lesson.inert)node.inert=value;
  lesson=null;globalThis.stickLesson=null;pad.inert=false;coach.hidden=true;
  document.body.classList.remove('operation-lesson','lesson-rules');canvas.classList.remove('lesson-target');pad.classList.remove('lesson-target');
  byId('stickCancel').click();byId('stickStatus').textContent='';updateView();refresh();
 }
 function start(){
  if(lesson){end();return}
  if(active||queue.length||tutorial||panelPick||phase!=='ready')return;
  byId('stickCancel').click();
  const nodes=[document.querySelector('.orbit-toolbar'),...document.querySelectorAll('.board-left-actions button:not(#operationHelpOpen)')];
  lesson={state,yaw:viewYaw,pitch:viewPitch,inert:nodes.map(n=>[n,n.inert]),step:1};
  state=structuredClone(state);for(const s of state)s.locked=0;
  for(const node of nodes)node.inert=true;
  globalThis.stickLesson={viewed:()=>{if(lesson?.step===1)show(2)},canSelect:()=>lesson?.step===2||lesson?.step===3,selected:()=>{if(lesson?.step===2)show(3)}};
  coach.hidden=false;document.body.classList.add('operation-lesson');show(1);refresh();
 }
 const normalMove=userMove;
 userMove=function(face,dir){
  if(!lesson)return normalMove(face,dir);
  if(lesson.step!==3||active||queue.length)return;
  queue.push({face,dir,kind:'operation-practice'});pad.inert=true;
  const current=++token;
  function completed(){if(!lesson||current!==token)return;if(active||queue.length){requestAnimationFrame(completed);return}show(4)}
  requestAnimationFrame(completed);
 };
 button.onclick=start;byId('operationExit').onclick=end;
 byId('operationNext').onclick=()=>{if(lesson&&lesson.step>=4&&lesson.step<7)show(lesson.step+1)};
 start();
})();
