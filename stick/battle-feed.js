// One live combat readout above the action buttons; no battle-state changes.
(()=>{
 const actions=document.querySelector('.board-actions'),frame=document.createElement('section');frame.id='battleFeed';frame.setAttribute('aria-label','戦闘状況');
 const intent=document.createElement('div');intent.className='battle-feed-intent';intent.append(byId('enemySkill'),byId('count'));
 frame.append(intent,byId('battleLog'));actions.prepend(frame);
 const shell=document.querySelector('.board-shell');new ResizeObserver(()=>shell.style.setProperty('--action-panel-height',actions.getBoundingClientRect().height+'px')).observe(actions);
 globalThis.battleActionText=result=>result.attacks.map(a=>{
  if(a.heal)return '味方：回復 '+a.value;
  const names=T.stats(squad,tuning).chars.filter(c=>c.element===a.element).map(c=>c.name).join('・');
  return names?names+'：'+(a.skill?'面攻撃':'攻撃')+' → '+currentEnemy().name+'に'+a.value+'ダメージ':'該当属性の仲間がいないため攻撃なし';
 }).join(' ／ ');
})();
