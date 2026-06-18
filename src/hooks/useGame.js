import { useReducer, useCallback } from 'react';
import { getCharacter } from '../data/characters';
import {
  createEmptyBoard,
  createEmptyTerrain,
  placeUnitsOnRows,
  readPositionsFromBoard,
  generateTerrain,
  getMovableCells,
  getAttackableTargets,
  TERRAIN_TYPES,
} from '../game/board';
import { resolveCombat } from '../game/dice';

// ── helpers ──────────────────────────────────────────

function makeUnitId(charId, owner) {
  return `${charId}_${owner}`;
}

/**
 * Calculate combat bonuses from skills and terrain.
 */
function getCombatBonuses(attacker, defender, terrain) {
  let attackerBonus = 0;
  let defenderBonus = 0;
  let extraDamage = 0;

  // ── Attacker bonuses ──
  if (attacker.charId === 'thor') {
    // 雷神: 雷霆之怒 → 攻击骰子 +1
    attackerBonus += 1;
  }

  if (attacker.charId === 'hulk') {
    // 绿巨人: 狂暴 → HP < 50% 时攻击力 +1
    if (attacker.hp < attacker.maxHp * 0.5) {
      extraDamage += 1;
    }
  }

  // ── Defender bonuses ──
  if (defender.charId === 'captain') {
    // 美队: 振金盾牌 → 防御骰子 +1
    defenderBonus += 1;
  }

  // ── Terrain: Highland ──
  if (terrain && terrain[attacker.row] && terrain[attacker.row][attacker.col] === TERRAIN_TYPES.HIGHLAND) {
    extraDamage += 1;
  }
  if (terrain && terrain[defender.row] && terrain[defender.row][defender.col] === TERRAIN_TYPES.HIGHLAND) {
    defenderBonus += 1;
  }

  return { attackerBonus, defenderBonus, extraDamage };
}

/**
 * Apply terrain HP effects for a side at turn start.
 */
function applyTerrainHpEffects(units, unitIds, terrain) {
  const newUnits = { ...units };
  const logEntries = [];

  for (const id of unitIds) {
    const unit = newUnits[id];
    if (!unit || unit.hp <= 0) continue;

    const t = terrain[unit.row]?.[unit.col];

    if (t === TERRAIN_TYPES.SPRING) {
      // 泉水: +1 HP（不超过最大值）
      if (unit.hp < unit.maxHp) {
        newUnits[id] = { ...unit, hp: Math.min(unit.maxHp, unit.hp + 1) };
        const charData = getCharacter(unit.charId);
        logEntries.push(`💧 ${charData.name} 站在泉水中，回复 1 HP`);
      }
    }

    if (t === TERRAIN_TYPES.RIVER) {
      // 河流: -1 HP
      newUnits[id] = { ...unit, hp: unit.hp - 1 };
      const charData = getCharacter(unit.charId);
      logEntries.push(`🌊 ${charData.name} 站在河流中，受到 1 点伤害`);
    }
  }

  return { newUnits, logEntries };
}

/**
 * Consume shock debuffs at turn start (clear shocked flag).
 * Move reduction is handled during getMovableCells via shocked param.
 */
function consumeShocks(units, unitIds) {
  const newUnits = { ...units };
  for (const id of unitIds) {
    if (newUnits[id] && newUnits[id].shocked) {
      newUnits[id] = { ...newUnits[id], shocked: false };
    }
  }
  return newUnits;
}

// ── buildInitialState ────────────────────────────────

function buildInitialState(playerCharIds, aiCharIds) {
  const units = {};
  const playerUnitIds = [];
  const aiUnitIds = [];

  playerCharIds.forEach((charId) => {
    const id = makeUnitId(charId, 'p');
    const c = getCharacter(charId);
    units[id] = {
      charId,
      owner: 'player',
      row: -1,
      col: -1,
      hp: c.hp,
      maxHp: c.hp,
      hasActed: false,
      shocked: false,
    };
    playerUnitIds.push(id);
  });

  aiCharIds.forEach((charId) => {
    const id = makeUnitId(charId, 'a');
    const c = getCharacter(charId);
    units[id] = {
      charId,
      owner: 'ai',
      row: -1,
      col: -1,
      hp: c.hp,
      maxHp: c.hp,
      hasActed: false,
      shocked: false,
    };
    aiUnitIds.push(id);
  });

  let board = createEmptyBoard();
  board = placeUnitsOnRows(board, aiUnitIds, 0, 1);
  board = placeUnitsOnRows(board, playerUnitIds, 8, 9);

  const allIds = [...aiUnitIds, ...playerUnitIds];
  const positions = readPositionsFromBoard(board, allIds);
  for (const [id, pos] of Object.entries(positions)) {
    units[id].row = pos.row;
    units[id].col = pos.col;
  }

  // Generate terrain AFTER unit placement
  const terrain = generateTerrain(board);

  const firstTurn = Math.random() < 0.5 ? 'player' : 'ai';

  // Apply terrain HP effects for first-turn side
  const firstSideIds = firstTurn === 'player' ? playerUnitIds : aiUnitIds;
  const { newUnits, logEntries } = applyTerrainHpEffects(units, firstSideIds, terrain);

  return {
    phase: firstTurn === 'player' ? 'player_turn' : 'ai_turn',
    board,
    terrain,
    units: newUnits,
    playerUnitIds,
    aiUnitIds,
    selectedUnitId: null,
    movableCells: [],
    attackTargets: [],
    diceRounds: null,
    diceRoundIndex: 0,
    combatAttackerId: null,
    combatDefenderId: null,
    winner: null,
    turn: firstTurn,
    actionLog: [
      firstTurn === 'player' ? '你先手！点击棋子开始行动' : 'AI 先手！',
      ...logEntries,
    ],
    message: firstTurn === 'player' ? '你的回合 — 点击棋子开始行动' : 'AI 正在思考...',
    gameOver: false,
    aiProcessingIndex: 0,
    animatingUnit: null,
    showActionChoice: false,
  };
}

function checkGameOver(state) {
  const playerAllDead = state.playerUnitIds.every((id) => state.units[id].hp <= 0);
  const aiAllDead = state.aiUnitIds.every((id) => state.units[id].hp <= 0);

  if (playerAllDead) {
    return {
      ...state,
      phase: 'game_over',
      winner: 'ai',
      gameOver: true,
      message: '😞 AI 获胜！',
      actionLog: [...state.actionLog, '所有玩家单位被击败...'],
    };
  }
  if (aiAllDead) {
    return {
      ...state,
      phase: 'game_over',
      winner: 'player',
      gameOver: true,
      message: '🎉 你赢了！',
      actionLog: [...state.actionLog, '所有 AI 单位被击败！你赢了！'],
    };
  }
  return null;
}

// ── reducer ───────────────────────────────────────────

function gameReducer(state, action) {
  if (!state && action.type !== '__INIT__') return state;

  switch (action.type) {
    case '__INIT__': {
      return buildInitialState(action.playerChars, action.aiChars);
    }

    case 'SELECT_UNIT': {
      const unit = state.units[action.unitId];
      if (!unit || unit.owner !== 'player' || unit.hasActed || unit.hp <= 0) return state;
      if (state.phase !== 'player_turn') return state;
      if (state.showActionChoice) return state;

      const charData = getCharacter(unit.charId);
      const movableCells = getMovableCells(
        state.board,
        state.terrain,
        unit.row,
        unit.col,
        charData,
        unit.shocked
      );

      return { ...state, selectedUnitId: action.unitId, movableCells, attackTargets: [] };
    }

    case 'DESELECT_UNIT': {
      if (state.showActionChoice) return state;
      return { ...state, selectedUnitId: null, movableCells: [], attackTargets: [] };
    }

    case 'MOVE_UNIT': {
      const { unitId, toRow, toCol } = action;
      const unit = state.units[unitId];
      const fromRow = unit.row;
      const fromCol = unit.col;

      const newBoard = state.board.map((r) => [...r]);
      newBoard[unit.row][unit.col] = null;
      newBoard[toRow][toCol] = unitId;

      const newUnits = {
        ...state.units,
        [unitId]: { ...unit, row: toRow, col: toCol },
      };

      const charData = getCharacter(unit.charId);
      const attackTargets = getAttackableTargets(
        newBoard,
        toRow,
        toCol,
        charData,
        state.aiUnitIds,
        newUnits
      );

      const showActionChoice = attackTargets.length > 0;

      return {
        ...state,
        board: newBoard,
        units: newUnits,
        movableCells: [],
        attackTargets: showActionChoice ? attackTargets : [],
        showActionChoice,
        animatingUnit: { unitId, fromRow, fromCol, toRow, toCol },
        actionLog: [...state.actionLog, `${charData.name} 移动到 (${toRow},${toCol})`],
      };
    }

    case 'CLEAR_ANIMATION': {
      return { ...state, animatingUnit: null };
    }

    case 'CHOOSE_ATTACK': {
      return { ...state, showActionChoice: false };
    }

    case 'CHOOSE_REST': {
      const unit = state.units[state.selectedUnitId];
      if (!unit) return state;
      const newUnits = {
        ...state.units,
        [state.selectedUnitId]: { ...unit, hasActed: true },
      };

      return endPlayerTurnCheck({ ...state, units: newUnits, showActionChoice: false, selectedUnitId: null, movableCells: [], attackTargets: [] });
    }

    case 'INITIATE_COMBAT': {
      const { attackerId, defenderId } = action;
      const attacker = state.units[attackerId];
      const defender = state.units[defenderId];

      const { attackerBonus, defenderBonus } = getCombatBonuses(attacker, defender, state.terrain);
      const rounds = resolveCombat(attackerBonus, defenderBonus);

      return {
        ...state,
        phase: 'dice_roll',
        combatAttackerId: attackerId,
        combatDefenderId: defenderId,
        diceRounds: rounds,
        diceRoundIndex: 0,
        combatAttackerBonus: attackerBonus,
        combatDefenderBonus: defenderBonus,
        attackTargets: [],
        selectedUnitId: null,
        showActionChoice: false,
      };
    }

    case 'NEXT_DICE_ROUND': {
      return { ...state, diceRoundIndex: state.diceRoundIndex + 1 };
    }

    case 'RESOLVE_DICE_PLAYER': {
      const lastRound = state.diceRounds[state.diceRounds.length - 1];
      const hit = lastRound.result === 'hit';
      const attacker = state.units[state.combatAttackerId];
      const defender = state.units[state.combatDefenderId];
      const attackerChar = getCharacter(attacker.charId);
      const defenderChar = getCharacter(defender.charId);

      let newUnits = { ...state.units };
      let logMsg = '';

      if (hit) {
        const { extraDamage } = getCombatBonuses(attacker, defender, state.terrain);
        const totalDamage = attackerChar.attack + extraDamage;
        const newHp = Math.max(0, defender.hp - totalDamage);
        newUnits = {
          ...newUnits,
          [state.combatDefenderId]: { ...defender, hp: newHp },
        };
        logMsg = `${attackerChar.name} ⚔️ ${defenderChar.name} → 命中！-${totalDamage} HP`;
        if (newHp <= 0) {
          logMsg += ` ${defenderChar.name} 被击败！`;
        } else if (attacker.charId === 'widow') {
          // 黑寡妇: 电击手环 → 目标下回合移动力 -1
          newUnits[state.combatDefenderId] = {
            ...newUnits[state.combatDefenderId],
            shocked: true,
          };
          logMsg += ` ⚡${defenderChar.name} 被电击，下回合移动力 -1`;
        }
      } else {
        logMsg = `${attackerChar.name} ⚔️ ${defenderChar.name} → 未命中`;
      }

      newUnits = {
        ...newUnits,
        [state.combatAttackerId]: { ...newUnits[state.combatAttackerId], hasActed: true },
      };

      const newState = {
        ...state,
        phase: 'player_turn',
        units: newUnits,
        diceRounds: null,
        diceRoundIndex: 0,
        combatAttackerId: null,
        combatDefenderId: null,
        combatAttackerBonus: 0,
        combatDefenderBonus: 0,
        actionLog: [...state.actionLog, logMsg],
      };

      return endPlayerTurnCheck(newState);
    }

    case 'END_PLAYER_UNIT': {
      const unit = state.units[action.unitId];
      const newUnits = {
        ...state.units,
        [action.unitId]: { ...unit, hasActed: true },
      };

      return endPlayerTurnCheck({
        ...state,
        units: newUnits,
        selectedUnitId: null,
        movableCells: [],
        attackTargets: [],
      });
    }

    case 'AI_MOVE': {
      const { unitId, toRow, toCol } = action;
      const unit = state.units[unitId];
      if (!unit || unit.hp <= 0) return state;

      const fromRow = unit.row;
      const fromCol = unit.col;

      const newBoard = state.board.map((r) => [...r]);
      newBoard[unit.row][unit.col] = null;
      newBoard[toRow][toCol] = unitId;

      const charData = getCharacter(unit.charId);
      const newUnits = {
        ...state.units,
        [unitId]: { ...unit, row: toRow, col: toCol },
      };

      return {
        ...state,
        board: newBoard,
        units: newUnits,
        animatingUnit: { unitId, fromRow, fromCol, toRow, toCol },
        actionLog: [...state.actionLog, `AI ${charData.name} → (${toRow},${toCol})`],
      };
    }

    case 'AI_ATTACK': {
      const { attackerId, defenderId } = action;
      const attacker = state.units[attackerId];
      const defender = state.units[defenderId];

      const { attackerBonus, defenderBonus } = getCombatBonuses(attacker, defender, state.terrain);
      const rounds = resolveCombat(attackerBonus, defenderBonus);

      return {
        ...state,
        phase: 'dice_roll',
        combatAttackerId: attackerId,
        combatDefenderId: defenderId,
        diceRounds: rounds,
        diceRoundIndex: 0,
        combatAttackerBonus: attackerBonus,
        combatDefenderBonus: defenderBonus,
      };
    }

    case 'AI_RESOLVE_DICE': {
      const lastRound = state.diceRounds[state.diceRounds.length - 1];
      const hit = lastRound.result === 'hit';
      const attacker = state.units[state.combatAttackerId];
      const defender = state.units[state.combatDefenderId];
      const attackerChar = getCharacter(attacker.charId);
      const defenderChar = getCharacter(defender.charId);

      let newUnits = { ...state.units };
      let logMsg = '';

      if (hit) {
        const { extraDamage } = getCombatBonuses(attacker, defender, state.terrain);
        const totalDamage = attackerChar.attack + extraDamage;
        const newHp = Math.max(0, defender.hp - totalDamage);
        newUnits = {
          ...newUnits,
          [state.combatDefenderId]: { ...defender, hp: newHp },
        };
        logMsg = `AI ${attackerChar.name} ⚔️ ${defenderChar.name} → 命中！-${totalDamage} HP`;
        if (newHp <= 0) logMsg += ` ${defenderChar.name} 被击败！`;
      } else {
        logMsg = `AI ${attackerChar.name} ⚔️ ${defenderChar.name} → 未命中`;
      }

      newUnits = {
        ...newUnits,
        [state.combatAttackerId]: { ...newUnits[state.combatAttackerId], hasActed: true },
      };

      const nextIndex = state.aiProcessingIndex + 1;

      const newState = {
        ...state,
        phase: 'ai_turn',
        units: newUnits,
        diceRounds: null,
        diceRoundIndex: 0,
        combatAttackerId: null,
        combatDefenderId: null,
        combatAttackerBonus: 0,
        combatDefenderBonus: 0,
        aiProcessingIndex: nextIndex,
        actionLog: [...state.actionLog, logMsg],
      };

      return endAiTurnCheck(newState);
    }

    case 'AI_SKIP_UNIT': {
      const newUnits = {
        ...state.units,
        [action.unitId]: { ...state.units[action.unitId], hasActed: true },
      };
      const nextIndex = state.aiProcessingIndex + 1;

      return endAiTurnCheck({
        ...state,
        units: newUnits,
        aiProcessingIndex: nextIndex,
      });
    }

    default:
      return state;
  }
}

// ── turn-end helpers ──────────────────────────────────

function endPlayerTurnCheck(state) {
  const allActed = state.playerUnitIds.every(
    (id) => state.units[id].hasActed || state.units[id].hp <= 0
  );

  if (!allActed) {
    return {
      ...state,
      selectedUnitId: null,
      movableCells: [],
      attackTargets: [],
    };
  }

  // Game over check
  const gameOver = checkGameOver(state);
  if (gameOver) return gameOver;

  // Consume AI shock debuffs
  let newUnits = consumeShocks(state.units, state.aiUnitIds);

  // Apply terrain HP effects for AI side
  const { newUnits: terrainUnits, logEntries } = applyTerrainHpEffects(newUnits, state.aiUnitIds, state.terrain);
  newUnits = terrainUnits;

  // Reset hasActed
  const resetUnits = {};
  Object.keys(newUnits).forEach((id) => {
    resetUnits[id] = { ...newUnits[id], hasActed: false };
  });

  return {
    ...state,
    units: resetUnits,
    phase: 'ai_turn',
    turn: 'ai',
    message: 'AI 正在思考...',
    aiProcessingIndex: 0,
    selectedUnitId: null,
    movableCells: [],
    attackTargets: [],
    showActionChoice: false,
    actionLog: [...state.actionLog, ...logEntries, '—— AI 回合 ——'],
  };
}

function endAiTurnCheck(state) {
  const allActed = state.aiUnitIds.every(
    (id) => state.units[id].hasActed || state.units[id].hp <= 0
  );

  if (!allActed) return state;

  // Game over check
  const gameOver = checkGameOver(state);
  if (gameOver) return gameOver;

  // Consume player shock debuffs
  let newUnits = consumeShocks(state.units, state.playerUnitIds);

  // Apply terrain HP effects for player side
  const { newUnits: terrainUnits, logEntries } = applyTerrainHpEffects(newUnits, state.playerUnitIds, state.terrain);
  newUnits = terrainUnits;

  // Check for deaths from terrain
  const gameOverAfterTerrain = checkGameOver({ ...state, units: newUnits });
  if (gameOverAfterTerrain) return gameOverAfterTerrain;

  // Reset hasActed
  const resetUnits = {};
  Object.keys(newUnits).forEach((id) => {
    resetUnits[id] = { ...newUnits[id], hasActed: false };
  });

  return {
    ...state,
    units: resetUnits,
    phase: 'player_turn',
    turn: 'player',
    message: '你的回合 — 点击棋子开始行动',
    actionLog: [...state.actionLog, ...logEntries, '—— 你的回合 ——'],
    aiProcessingIndex: 0,
    selectedUnitId: null,
    movableCells: [],
    attackTargets: [],
  };
}

// ── hook ──────────────────────────────────────────────

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, null);

  const selectUnit = useCallback((unitId) => dispatch({ type: 'SELECT_UNIT', unitId }), []);
  const deselectUnit = useCallback(() => dispatch({ type: 'DESELECT_UNIT' }), []);
  const moveUnit = useCallback(
    (unitId, toRow, toCol) => dispatch({ type: 'MOVE_UNIT', unitId, toRow, toCol }),
    []
  );
  const clearAnimation = useCallback(() => dispatch({ type: 'CLEAR_ANIMATION' }), []);
  const chooseAttack = useCallback(() => dispatch({ type: 'CHOOSE_ATTACK' }), []);
  const chooseRest = useCallback(() => dispatch({ type: 'CHOOSE_REST' }), []);
  const initiateCombat = useCallback(
    (attackerId, defenderId) => dispatch({ type: 'INITIATE_COMBAT', attackerId, defenderId }),
    []
  );
  const nextDiceRound = useCallback(() => dispatch({ type: 'NEXT_DICE_ROUND' }), []);
  const resolveDicePlayer = useCallback(() => dispatch({ type: 'RESOLVE_DICE_PLAYER' }), []);
  const endPlayerUnit = useCallback((unitId) => dispatch({ type: 'END_PLAYER_UNIT', unitId }), []);
  const aiMoveUnit = useCallback(
    (unitId, toRow, toCol) => dispatch({ type: 'AI_MOVE', unitId, toRow, toCol }),
    []
  );
  const aiAttack = useCallback(
    (attackerId, defenderId) => dispatch({ type: 'AI_ATTACK', attackerId, defenderId }),
    []
  );
  const aiResolveDice = useCallback(() => dispatch({ type: 'AI_RESOLVE_DICE' }), []);
  const aiSkipUnit = useCallback((unitId) => dispatch({ type: 'AI_SKIP_UNIT', unitId }), []);

  return {
    state,
    dispatch,
    selectUnit,
    deselectUnit,
    moveUnit,
    clearAnimation,
    chooseAttack,
    chooseRest,
    initiateCombat,
    nextDiceRound,
    resolveDicePlayer,
    endPlayerUnit,
    aiMoveUnit,
    aiAttack,
    aiResolveDice,
    aiSkipUnit,
  };
}
