import { useReducer, useCallback } from 'react';
import { getCharacter } from '../data/characters';
import {
  createEmptyBoard,
  placeUnitsOnRow,
  getMovableCells,
  getAttackableTargets,
} from '../game/board';
import { resolveCombat } from '../game/dice';

// ── helpers ──────────────────────────────────────────

function makeUnitId(charId, owner) {
  return `${charId}_${owner}`;
}

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
      row: 0,
      col: 0,
      hp: c.hp,
      maxHp: c.hp,
      hasActed: false,
    };
    playerUnitIds.push(id);
  });

  aiCharIds.forEach((charId) => {
    const id = makeUnitId(charId, 'a');
    const c = getCharacter(charId);
    units[id] = {
      charId,
      owner: 'ai',
      row: 0,
      col: 0,
      hp: c.hp,
      maxHp: c.hp,
      hasActed: false,
    };
    aiUnitIds.push(id);
  });

  let board = createEmptyBoard();
  board = placeUnitsOnRow(board, aiUnitIds, 0);
  board = placeUnitsOnRow(board, playerUnitIds, 5);

  aiUnitIds.forEach((id) => {
    const col = board[0].indexOf(id);
    if (col !== -1) units[id].col = col;
  });
  playerUnitIds.forEach((id) => {
    const col = board[5].indexOf(id);
    if (col !== -1) units[id].col = col;
  });

  const firstTurn = Math.random() < 0.5 ? 'player' : 'ai';

  return {
    phase: firstTurn === 'player' ? 'player_turn' : 'ai_turn',
    board,
    units,
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
    actionLog: [firstTurn === 'player' ? '你先手！点击棋子开始行动' : 'AI 先手！'],
    message: firstTurn === 'player' ? '你的回合 — 点击棋子开始行动' : 'AI 正在思考...',
    gameOver: false,
    aiProcessingIndex: 0,
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

      const charData = getCharacter(unit.charId);
      const movableCells = getMovableCells(state.board, unit.row, unit.col, charData);

      return { ...state, selectedUnitId: action.unitId, movableCells, attackTargets: [] };
    }

    case 'DESELECT_UNIT': {
      return { ...state, selectedUnitId: null, movableCells: [], attackTargets: [] };
    }

    case 'MOVE_UNIT': {
      const { unitId, toRow, toCol } = action;
      const unit = state.units[unitId];
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

      return {
        ...state,
        board: newBoard,
        units: newUnits,
        movableCells: [],
        attackTargets,
        actionLog: [...state.actionLog, `${charData.name} 移动到 (${toRow},${toCol})`],
      };
    }

    case 'INITIATE_COMBAT': {
      const { attackerId, defenderId } = action;
      const rounds = resolveCombat();
      return {
        ...state,
        phase: 'dice_roll',
        combatAttackerId: attackerId,
        combatDefenderId: defenderId,
        diceRounds: rounds,
        diceRoundIndex: 0,
        attackTargets: [],
        selectedUnitId: null,
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
        const newHp = Math.max(0, defender.hp - attackerChar.attack);
        newUnits = {
          ...newUnits,
          [state.combatDefenderId]: { ...defender, hp: newHp },
        };
        logMsg = `${attackerChar.name} ⚔️ ${defenderChar.name} → 命中！-${attackerChar.attack} HP`;
        if (newHp <= 0) logMsg += ` ${defenderChar.name} 被击败！`;
      } else {
        logMsg = `${attackerChar.name} ⚔️ ${defenderChar.name} → 未命中`;
      }

      // Mark attacker as acted
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
        actionLog: [...state.actionLog, logMsg],
      };

      // Check if all player units have acted
      const allActed = newState.playerUnitIds.every(
        (id) => newUnits[id].hasActed || newUnits[id].hp <= 0
      );

      if (allActed) {
        const gameOver = checkGameOver({ ...newState, units: newUnits });
        if (gameOver) return gameOver;

        // Start AI turn
        const resetUnits = {};
        Object.keys(newUnits).forEach((id) => {
          resetUnits[id] = { ...newUnits[id], hasActed: false };
        });
        return {
          ...newState,
          units: resetUnits,
          phase: 'ai_turn',
          turn: 'ai',
          message: 'AI 正在思考...',
          aiProcessingIndex: 0,
          selectedUnitId: null,
          movableCells: [],
          attackTargets: [],
          actionLog: [...newState.actionLog, '—— AI 回合 ——'],
        };
      }

      return {
        ...newState,
        selectedUnitId: null,
        movableCells: [],
        attackTargets: [],
      };
    }

    case 'END_PLAYER_UNIT': {
      const unit = state.units[action.unitId];
      const newUnits = {
        ...state.units,
        [action.unitId]: { ...unit, hasActed: true },
      };

      const allActed = state.playerUnitIds.every(
        (id) => newUnits[id].hasActed || newUnits[id].hp <= 0
      );

      if (allActed) {
        const gameOver = checkGameOver({ ...state, units: newUnits });
        if (gameOver) return gameOver;

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
          actionLog: [...state.actionLog, '—— AI 回合 ——'],
          selectedUnitId: null,
          movableCells: [],
          attackTargets: [],
        };
      }

      return {
        ...state,
        units: newUnits,
        selectedUnitId: null,
        movableCells: [],
        attackTargets: [],
      };
    }

    case 'AI_MOVE': {
      const { unitId, toRow, toCol } = action;
      const unit = state.units[unitId];
      if (!unit || unit.hp <= 0) return state;

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
        actionLog: [...state.actionLog, `AI ${charData.name} → (${toRow},${toCol})`],
      };
    }

    case 'AI_ATTACK': {
      const { attackerId, defenderId } = action;
      const rounds = resolveCombat();
      return {
        ...state,
        phase: 'dice_roll',
        combatAttackerId: attackerId,
        combatDefenderId: defenderId,
        diceRounds: rounds,
        diceRoundIndex: 0,
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
        const newHp = Math.max(0, defender.hp - attackerChar.attack);
        newUnits = {
          ...newUnits,
          [state.combatDefenderId]: { ...defender, hp: newHp },
        };
        logMsg = `AI ${attackerChar.name} ⚔️ ${defenderChar.name} → 命中！-${attackerChar.attack} HP`;
        if (newHp <= 0) logMsg += ` ${defenderChar.name} 被击败！`;
      } else {
        logMsg = `AI ${attackerChar.name} ⚔️ ${defenderChar.name} → 未命中`;
      }

      // Mark AI unit as acted
      newUnits = {
        ...newUnits,
        [state.combatAttackerId]: { ...newUnits[state.combatAttackerId], hasActed: true },
      };

      const nextIndex = state.aiProcessingIndex + 1;
      const livingAi = state.aiUnitIds.filter((id) => newUnits[id].hp > 0);

      const newState = {
        ...state,
        phase: 'ai_turn',
        units: newUnits,
        diceRounds: null,
        diceRoundIndex: 0,
        combatAttackerId: null,
        combatDefenderId: null,
        aiProcessingIndex: nextIndex,
        actionLog: [...state.actionLog, logMsg],
      };

      // Check if all AI acted or current index exceeded
      const allActed = state.aiUnitIds.every(
        (id) => newUnits[id].hasActed || newUnits[id].hp <= 0
      );

      if (allActed) {
        const gameOver = checkGameOver(newState);
        if (gameOver) return gameOver;

        const resetUnits = {};
        Object.keys(newUnits).forEach((id) => {
          resetUnits[id] = { ...newUnits[id], hasActed: false };
        });
        return {
          ...newState,
          units: resetUnits,
          phase: 'player_turn',
          turn: 'player',
          message: '你的回合 — 点击棋子开始行动',
          actionLog: [...newState.actionLog, '—— 你的回合 ——'],
          aiProcessingIndex: 0,
          selectedUnitId: null,
          movableCells: [],
          attackTargets: [],
        };
      }

      return newState;
    }

    case 'AI_SKIP_UNIT': {
      const newUnits = {
        ...state.units,
        [action.unitId]: { ...state.units[action.unitId], hasActed: true },
      };
      const nextIndex = state.aiProcessingIndex + 1;

      const newState = {
        ...state,
        units: newUnits,
        aiProcessingIndex: nextIndex,
      };

      const allActed = state.aiUnitIds.every(
        (id) => newUnits[id].hasActed || newUnits[id].hp <= 0
      );

      if (allActed) {
        const gameOver = checkGameOver(newState);
        if (gameOver) return gameOver;

        const resetUnits = {};
        Object.keys(newUnits).forEach((id) => {
          resetUnits[id] = { ...newUnits[id], hasActed: false };
        });
        return {
          ...newState,
          units: resetUnits,
          phase: 'player_turn',
          turn: 'player',
          message: '你的回合 — 点击棋子开始行动',
          actionLog: [...newState.actionLog, '—— 你的回合 ——'],
          aiProcessingIndex: 0,
          selectedUnitId: null,
          movableCells: [],
          attackTargets: [],
        };
      }

      return newState;
    }

    default:
      return state;
  }
}

// ── hook ──────────────────────────────────────────────

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, null);

  const selectUnit = useCallback(
    (unitId) => dispatch({ type: 'SELECT_UNIT', unitId }),
    []
  );
  const deselectUnit = useCallback(() => dispatch({ type: 'DESELECT_UNIT' }), []);
  const moveUnit = useCallback(
    (unitId, toRow, toCol) => dispatch({ type: 'MOVE_UNIT', unitId, toRow, toCol }),
    []
  );
  const initiateCombat = useCallback(
    (attackerId, defenderId) =>
      dispatch({ type: 'INITIATE_COMBAT', attackerId, defenderId }),
    []
  );
  const nextDiceRound = useCallback(() => dispatch({ type: 'NEXT_DICE_ROUND' }), []);
  const resolveDicePlayer = useCallback(
    (unitId) => dispatch({ type: 'RESOLVE_DICE_PLAYER', unitId }),
    []
  );
  const endPlayerUnit = useCallback(
    (unitId) => dispatch({ type: 'END_PLAYER_UNIT', unitId }),
    []
  );
  const aiMoveUnit = useCallback(
    (unitId, toRow, toCol) => dispatch({ type: 'AI_MOVE', unitId, toRow, toCol }),
    []
  );
  const aiAttack = useCallback(
    (attackerId, defenderId) =>
      dispatch({ type: 'AI_ATTACK', attackerId, defenderId }),
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
