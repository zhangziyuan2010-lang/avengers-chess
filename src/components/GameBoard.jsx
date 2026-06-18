import { useEffect, useRef, useCallback } from 'react';
import Cell from './Cell';
import UnitCard from './UnitCard';
import DiceModal from './DiceModal';
import { decideAiAction } from '../game/ai';
import { getCharacter } from '../data/characters';

export default function GameBoard({ state, actions }) {
  const {
    board,
    units,
    playerUnitIds,
    aiUnitIds,
    phase,
    selectedUnitId,
    movableCells,
    attackTargets,
    actionLog,
    message,
    turn,
    aiProcessingIndex,
    animatingUnit,
    showActionChoice,
  } = state;

  const {
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
  } = actions;

  const aiRunningRef = useRef(false);
  const logRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [actionLog]);

  // ── Clear animation after 500ms ──────────────────

  useEffect(() => {
    if (animatingUnit) {
      const timer = setTimeout(() => clearAnimation(), 500);
      return () => clearTimeout(timer);
    }
  }, [animatingUnit, clearAnimation]);

  // ── Cell click handler ───────────────────────────

  const handleCellClick = useCallback(
    (row, col) => {
      if (phase === 'dice_roll' || phase === 'game_over' || phase === 'ai_turn') return;
      if (showActionChoice) return; // Block clicks during action choice

      if (phase === 'player_turn') {
        const cellUnitId = board[row][col];

        if (selectedUnitId) {
          // Click on a movable cell → move
          const isMovable = movableCells.some((c) => c.row === row && c.col === col);
          if (isMovable) {
            moveUnit(selectedUnitId, row, col);
            return;
          }

          // Click on attack target (when in target-selection mode)
          const isTarget = attackTargets.includes(cellUnitId);
          if (isTarget) {
            initiateCombat(selectedUnitId, cellUnitId);
            return;
          }

          // Click on another own unacted unit → switch
          if (
            cellUnitId &&
            units[cellUnitId]?.owner === 'player' &&
            !units[cellUnitId]?.hasActed &&
            units[cellUnitId]?.hp > 0
          ) {
            selectUnit(cellUnitId);
            return;
          }

          // Click elsewhere → deselect
          deselectUnit();
          return;
        }

        // No unit selected: click own unacted unit on board to select
        if (
          cellUnitId &&
          units[cellUnitId]?.owner === 'player' &&
          !units[cellUnitId]?.hasActed &&
          units[cellUnitId]?.hp > 0
        ) {
          selectUnit(cellUnitId);
        }
      }
    },
    [phase, board, units, selectedUnitId, movableCells, attackTargets, showActionChoice, selectUnit, deselectUnit, moveUnit, initiateCombat]
  );

  // ── After player move with no attack targets → auto-end ──

  useEffect(() => {
    if (
      phase === 'player_turn' &&
      selectedUnitId &&
      movableCells.length === 0 &&
      attackTargets.length === 0 &&
      !showActionChoice
    ) {
      const unit = units[selectedUnitId];
      if (unit && !unit.hasActed && unit.hp > 0) {
        endPlayerUnit(selectedUnitId);
      }
    }
  }, [phase, selectedUnitId, movableCells.length, attackTargets.length, showActionChoice, units, endPlayerUnit]);

  // ── Handle "Attack" choice with single target ────

  const handleChooseAttack = useCallback(() => {
    chooseAttack();
    // If only 1 target, auto-attack it
    if (attackTargets.length === 1 && selectedUnitId) {
      // Need to dispatch after state updates (next tick)
      setTimeout(() => initiateCombat(selectedUnitId, attackTargets[0]), 50);
    }
  }, [chooseAttack, attackTargets, selectedUnitId, initiateCombat]);

  // ── Skip remaining unacted units ──────────────────

  const handleEndTurn = useCallback(() => {
    if (phase !== 'player_turn') return;
    const unacted = playerUnitIds.filter(
      (id) => !units[id].hasActed && units[id].hp > 0
    );
    unacted.forEach((id) => endPlayerUnit(id));
  }, [phase, playerUnitIds, units, endPlayerUnit]);

  // ── AI Turn ──────────────────────────────────────

  useEffect(() => {
    if (phase !== 'ai_turn') {
      aiRunningRef.current = false;
      return;
    }
    if (aiRunningRef.current) return;

    aiRunningRef.current = true;

    const processAiUnit = () => {
      const s = stateRef.current;
      const livingAi = s.aiUnitIds.filter((id) => s.units[id].hp > 0);
      const orderedAi = [...livingAi].sort((a, b) => {
        const aActed = s.units[a].hasActed ? 1 : 0;
        const bActed = s.units[b].hasActed ? 1 : 0;
        return aActed - bActed;
      });

      if (orderedAi.length === 0) return;

      const nextUnit = orderedAi.find((id) => !s.units[id].hasActed);
      if (!nextUnit) return;

      const action = decideAiAction(
        s.board,
        nextUnit,
        s.units,
        s.playerUnitIds,
        s.aiUnitIds
      );

      setTimeout(() => {
        if (action.action === 'none' || (action.action === 'move' && !action.toRow)) {
          aiSkipUnit(nextUnit);
          aiRunningRef.current = false;
          return;
        }

        if (action.action === 'attack') {
          aiAttack(nextUnit, action.targetId);
          aiRunningRef.current = false;
          return;
        }

        if (action.action === 'move_attack') {
          aiMoveUnit(nextUnit, action.toRow, action.toCol);
          setTimeout(() => {
            aiAttack(nextUnit, action.targetId);
            aiRunningRef.current = false;
          }, 700); // Extended to account for animation
          return;
        }

        if (action.action === 'move') {
          aiMoveUnit(nextUnit, action.toRow, action.toCol);
          setTimeout(() => {
            aiSkipUnit(nextUnit);
            aiRunningRef.current = false;
          }, 600);
          return;
        }

        aiSkipUnit(nextUnit);
        aiRunningRef.current = false;
      }, 500);
    };

    processAiUnit();
  }, [phase, aiProcessingIndex]);

  // ── Cell helpers ─────────────────────────────────

  const isMovableCell = (row, col) =>
    !showActionChoice && movableCells.some((c) => c.row === row && c.col === col);

  const isAttackCell = (row, col) => {
    if (showActionChoice) return false;
    const unitId = board[row][col];
    return unitId && attackTargets.includes(unitId);
  };

  const isAnimatingFrom = (row, col) =>
    animatingUnit && animatingUnit.fromRow === row && animatingUnit.fromCol === col;

  const isAnimatingTo = (row, col) =>
    animatingUnit && animatingUnit.toRow === row && animatingUnit.toCol === col;

  const playerLiving = playerUnitIds.filter((id) => units[id].hp > 0).length;
  const aiLiving = aiUnitIds.filter((id) => units[id].hp > 0).length;

  const isAiDice =
    phase === 'dice_roll' &&
    state.combatAttackerId &&
    units[state.combatAttackerId]?.owner === 'ai';

  return (
    <div className="game-page">
      <div className="game-header">
        <span className="game-turn-indicator">
          {turn === 'player' ? '🔵 你的回合' : '🔴 AI 回合'}
        </span>
        <span className="game-score">
          🦸 {playerLiving} vs {aiLiving} 🤖
        </span>
        <span className="game-msg">{message}</span>
      </div>

      <div className="game-main">
        {/* Player units panel */}
        <div className="side-panel player-panel">
          <h3>你的战队</h3>
          {playerUnitIds.map((id) => (
            <UnitCard
              key={id}
              unit={units[id]}
              isSelected={selectedUnitId === id}
              isActed={units[id]?.hasActed}
              onClick={() => {
                if (
                  phase === 'player_turn' &&
                  !units[id]?.hasActed &&
                  units[id]?.hp > 0 &&
                  !showActionChoice
                ) {
                  selectUnit(id);
                }
              }}
            />
          ))}
        </div>

        {/* Board */}
        <div className="board-container">
          <div className="board-half-label top-label">—— AI 半场 ——</div>
          <div className="board-grid">
            {board.map((rowCells, row) =>
              rowCells.map((cellUnitId, col) => (
                <Cell
                  key={`${row}-${col}`}
                  row={row}
                  col={col}
                  unit={cellUnitId ? units[cellUnitId] : null}
                  isMovable={isMovableCell(row, col)}
                  isAttackTarget={isAttackCell(row, col)}
                  isSelected={
                    selectedUnitId
                      ? units[selectedUnitId]?.row === row &&
                        units[selectedUnitId]?.col === col
                      : false
                  }
                  isGhost={isAnimatingFrom(row, col)}
                  isAnimatingIn={isAnimatingTo(row, col)}
                  onClick={handleCellClick}
                />
              ))
            )}
          </div>
          <div className="board-half-label bottom-label">—— 你的半场 ——</div>
        </div>

        {/* AI units panel */}
        <div className="side-panel ai-panel">
          <h3>AI 战队</h3>
          {aiUnitIds.map((id) => (
            <UnitCard
              key={id}
              unit={units[id]}
              isSelected={false}
              isActed={units[id]?.hasActed}
            />
          ))}
        </div>
      </div>

      {/* Action Choice Panel */}
      {showActionChoice && selectedUnitId && (
        <div className="action-choice-overlay">
          <div className="action-choice-panel">
            <h3>选择行动</h3>
            <p className="action-choice-desc">
              {units[selectedUnitId]?.charId
                ? getCharacter(units[selectedUnitId].charId)?.name
                : ''}{' '}
              发现了 {attackTargets.length} 个敌方目标
            </p>
            <div className="action-choice-buttons">
              <button className="btn-primary btn-attack" onClick={handleChooseAttack}>
                ⚔️ 攻击
              </button>
              <button className="btn-secondary btn-rest" onClick={chooseRest}>
                🛡️ 休息
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="game-bottom">
        <div className="action-log" ref={logRef}>
          {actionLog.map((msg, i) => (
            <div key={i} className="log-entry">{msg}</div>
          ))}
        </div>
        {phase === 'player_turn' && !showActionChoice && (
          <button className="btn-secondary btn-sm" onClick={handleEndTurn}>
            跳过剩余行动 →
          </button>
        )}
      </div>

      {/* Dice modal */}
      {phase === 'dice_roll' && (
        <DiceModal
          state={state}
          onNextRound={nextDiceRound}
          onResolve={isAiDice ? aiResolveDice : () => resolveDicePlayer()}
        />
      )}
    </div>
  );
}
