import { useState, useEffect } from 'react';
import { getCharacter } from '../data/characters';

export default function DiceModal({ state, onNextRound, onResolve }) {
  const currentRound = state.diceRounds[state.diceRoundIndex];
  const isLastRound = state.diceRoundIndex === state.diceRounds.length - 1;
  const [animating, setAnimating] = useState(true);
  const [showRound, setShowRound] = useState(false);

  const attacker = state.units[state.combatAttackerId];
  const defender = state.units[state.combatDefenderId];
  const attackerChar = attacker ? getCharacter(attacker.charId) : null;
  const defenderChar = defender ? getCharacter(defender.charId) : null;

  useEffect(() => {
    setAnimating(true);
    setShowRound(false);

    const timer = setTimeout(() => {
      setAnimating(false);
      setShowRound(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state.diceRoundIndex, state.combatAttackerId]);

  if (!currentRound || !attackerChar || !defenderChar) return null;

  const handleContinue = () => {
    if (currentRound.result === 'reroll') {
      onNextRound();
    } else {
      onResolve();
    }
  };

  const getResultText = () => {
    if (currentRound.result === 'hit') return `${attackerChar.name} 命中！`;
    if (currentRound.result === 'miss') return `${defenderChar.name} 防御成功！`;
    return '平局，重新掷骰...';
  };

  const getResultEmoji = () => {
    if (currentRound.result === 'hit') return '💥';
    if (currentRound.result === 'miss') return '🛡️';
    return '🔄';
  };

  const attackerBonus = state.combatAttackerBonus || 0;
  const defenderBonus = state.combatDefenderBonus || 0;

  return (
    <div className="dice-modal-overlay">
      <div className="dice-modal">
        <h2>⚔️ 战斗判定</h2>

        <div className="dice-combatants">
          <div className="dice-side" style={{ '--char-color': attackerChar.color }}>
            <div className="dice-emoji">{attackerChar.emoji}</div>
            <div className="dice-name">{attackerChar.name}</div>
            <div className="dice-label">
              攻击方{attackerBonus > 0 ? ` +${attackerBonus}` : ''}
            </div>
          </div>
          <div className="dice-vs">VS</div>
          <div className="dice-side" style={{ '--char-color': defenderChar.color }}>
            <div className="dice-emoji">{defenderChar.emoji}</div>
            <div className="dice-name">{defenderChar.name}</div>
            <div className="dice-label">
              防守方{defenderBonus > 0 ? ` +${defenderBonus}` : ''}
            </div>
          </div>
        </div>

        <div className="dice-roll-area">
          <div className="dice-col">
            <div className={`dice-display ${animating ? 'rolling' : ''}`}>
              <span className="dice-number">
                {animating ? '?' : currentRound.attackerRoll}
              </span>
            </div>
            {!animating && attackerBonus > 0 && (
              <span className="dice-bonus">
                ({currentRound.attackerBase}+{attackerBonus})
              </span>
            )}
          </div>
          <div className="dice-col">
            <div className={`dice-display ${animating ? 'rolling' : ''}`}>
              <span className="dice-number">
                {animating ? '?' : currentRound.defenderRoll}
              </span>
            </div>
            {!animating && defenderBonus > 0 && (
              <span className="dice-bonus">
                ({currentRound.defenderBase}+{defenderBonus})
              </span>
            )}
          </div>
        </div>

        {showRound && (
          <div className={`dice-result result-${currentRound.result}`}>
            <span className="result-emoji">{getResultEmoji()}</span>
            <span className="result-text">{getResultText()}</span>
          </div>
        )}

        {showRound && (
          <button className="btn-primary" onClick={handleContinue}>
            {currentRound.result === 'reroll' ? '重新掷骰' : '继续'}
          </button>
        )}

        {currentRound.result === 'reroll' && !showRound && (
          <p className="dice-hint">平局将自动重掷...</p>
        )}
      </div>
    </div>
  );
}
