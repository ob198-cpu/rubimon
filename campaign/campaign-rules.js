(function(root, factory) {
  'use strict';
  const rules = factory(typeof module === 'object' && module.exports ? require('./team.js') : root.TeamRules);
  if (typeof module === 'object' && module.exports) module.exports = rules;
  root.CampaignRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(T) {
  'use strict';
  if (!T || !Array.isArray(T.roster)) throw Error('TeamRules is required before CampaignRules');

  const STORAGE_KEY = 'rubimon.stick.campaign.v1';
  const initialOwned = T.roster.filter(ally => ally.source === '初期').map(ally => ally.id);
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  // Only stage 2 has a prototype HP override. The normal dungeon, cooldowns and controls remain unchanged.
  const stages = freeze([
    {
      id: 'grove-intro', order: 1, title: '1. 狙った攻撃を作る', dungeonId: 'grove',
      goal: '敵の弱点と盤面を読み、水の攻撃を狙って作る。HPが減ったら回復と攻撃を選び直す。',
      tactics: [
        'ウンディーネを入れ、水の列を狙う。火→水の技は次の回転で揃う配置を見てから使う。変換だけでは攻撃は発生しない。',
        'ルミナの回復列や回復技で立て直してから攻撃する。この試作は敵の妨害がOFFなので、リベラの解除技は不要。'
      ],
      recommendedIds: ['undine', 'libera', 'lumina'], requires: [],
      reward: {type: 'character', allyId: 'selene', duplicateShards: 5,
        label: 'セレーネを確定入手（入手済みなら欠片5個）'}
    },
    {
      id: 'armor-choice', order: 2, title: '2. 高い防御への対処を選ぶ', dungeonId: 'armor',
      enemyOverrides: {hp: 100},
      goal: '防御の高い敵に、固定50の「貫通」を2回使うか、水の面成立を準備するかを比べる。',
      tactics: [
        'フェラムの「貫通」で固定50ダメージを与え、再使用までHPを見て回復する。通常6色には鋼パネルが出ないため、鋼列は狙わない。',
        'ウンディーネの火→水とセレーネの任意4パネル変換を組み合わせ、水の面成立を狙う。変換だけでは攻撃せず、次の回転で9枚を揃える。'
      ],
      recommendedIds: ['ferrum', 'undine', 'selene'], requires: ['grove-intro'],
      reward: {type: 'unlock', stageId: 'grove-apply', label: '3戦目「変換で攻撃を組み立てる」を解放'}
    },
    {
      id: 'grove-apply', order: 3, title: '3. 変換で攻撃を組み立てる', dungeonId: 'grove',
      goal: '最初と同じ相手に、セレーネの任意4パネル変換を使い、次の回転で1列を作るか、複数成立を狙うか試す。',
      tactics: [
        'セレーネであと少しの列を水に変え、次の回転で成立させる。変換だけでは攻撃しないので、回転後の位置を確かめて選ぶ。',
        '交わる列などを見て4パネルの変換先を決め、次の回転で複数成立を狙う。準備に手数が要る時は、敵の猶予を見て回復や1列の攻撃に切り替える。'
      ],
      recommendedIds: ['selene', 'undine', 'lumina'], requires: ['armor-choice'],
      reward: {type: 'completion', label: '連続3戦を完了。別の編成で再挑戦できる'}
    }
  ].map(stage => ({...stage, objective: stage.goal})));

  function createState() { return {version: 1, completed: []}; }
  function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function normalizeState(raw) {
    const state = createState();
    if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.completed)) return state;
    const completed = new Set(raw.completed.filter(id => typeof id === 'string'));
    // A later clear without every preceding clear cannot unlock or consume rewards.
    for (const stage of stages) {
      if (!completed.has(stage.id)) break;
      state.completed.push(stage.id);
    }
    return state;
  }
  function parseState(text) {
    if (typeof text !== 'string') return createState();
    try { return normalizeState(JSON.parse(text)); } catch { return createState(); }
  }
  function serializeState(state) { return JSON.stringify(normalizeState(state)); }
  function getStage(id) { return stages.find(stage => stage.id === id) || null; }
  function isUnlocked(state, id) {
    const stage = getStage(id), progress = normalizeState(state);
    return !!stage && stage.requires.every(required => progress.completed.includes(required));
  }
  function nextStage(state) {
    const progress = normalizeState(state);
    return stages.find(stage => !progress.completed.includes(stage.id)) || null;
  }

  function validCollection(save) {
    return isRecord(save) && Array.isArray(save.owned) && save.owned.every(id => typeof id === 'string' && id.length > 0)
      && Number.isSafeInteger(save.gems) && save.gems >= 0
      && Number.isSafeInteger(save.shards) && save.shards >= 0
      && Array.isArray(save.team) && save.team.length === 5 && new Set(save.team).size === 5
      && save.team.every(id => save.owned.includes(id));
  }
  function copyCollection(save) {
    // Preserve unknown future fields and existing allies; this model never migrates collection data.
    return {...save, owned: [...save.owned], team: [...save.team]};
  }
  function completeStage(rawState, id, collection) {
    const state = normalizeState(rawState), stage = getStage(id);
    const rejected = reason => ({ok: false, reason, state, collection, reward: null, firstClear: false});
    if (!stage) return rejected('unknown-stage');
    if (!isUnlocked(state, id)) return rejected('locked');
    if (!validCollection(collection)) return rejected('invalid-collection');
    if (state.completed.includes(id)) {
      return {ok: true, reason: 'replay', state, collection: copyCollection(collection), reward: null, firstClear: false};
    }

    const updated = copyCollection(collection);
    for (const allyId of initialOwned) if (!updated.owned.includes(allyId)) updated.owned.push(allyId);
    let reward;
    if (stage.reward.type === 'character') {
      const allyId = stage.reward.allyId;
      if (updated.owned.includes(allyId)) {
        const shards = stage.reward.duplicateShards;
        if (!Number.isSafeInteger(updated.shards + shards)) return rejected('shard-overflow');
        updated.shards += shards;
        reward = {type: 'shards', allyId: null, shards, label: 'セレーネは入手済み：欠片5個を獲得'};
      } else {
        updated.owned.push(allyId);
        reward = {type: 'character', allyId, shards: 0, label: 'セレーネを獲得'};
      }
    } else {
      reward = {...stage.reward, allyId: null, shards: 0};
    }
    return {
      ok: true, reason: 'cleared', state: {version: 1, completed: [...state.completed, id]},
      collection: updated, reward, firstClear: true
    };
  }

  return freeze({STORAGE_KEY, stages, initialOwned, createState, normalizeState, parseState,
    serializeState, getStage, isUnlocked, nextStage, completeStage});
});
