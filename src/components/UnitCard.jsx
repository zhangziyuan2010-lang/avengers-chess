import { getCharacter } from '../data/characters';
import Tooltip from './Tooltip';

export default function UnitCard({ unit, isSelected, isActed, onClick }) {
  if (!unit) return null;

  const charData = getCharacter(unit.charId);
  if (!charData) return null;

  const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const isDead = unit.hp <= 0;

  return (
    <Tooltip unit={unit}>
      <div
        className={`unit-card ${isSelected ? 'selected' : ''} ${isActed ? 'acted' : ''} ${isDead ? 'dead' : ''}`}
        style={{ '--char-color': charData.color }}
        onClick={onClick}
      >
        <div className="unit-emoji">{charData.emoji}</div>
        <div className="unit-name">{charData.name}</div>
        <div className="unit-hp-bar">
          <div
            className="unit-hp-fill"
            style={{ width: `${hpPercent}%`, backgroundColor: charData.color }}
          />
        </div>
        <div className="unit-hp-text">
          {unit.hp}/{unit.maxHp}
        </div>
        <div className="unit-stats-mini">
          <span>🦶{charData.move}</span>
          <span>⚔️{charData.attack}</span>
          <span>🎯{charData.range}</span>
        </div>
        {charData.skillName && (
          <div className="unit-skill" title={charData.skillShort}>
            {charData.skillName}
          </div>
        )}
        {unit.shocked && (
          <div className="unit-debuff">⚡ 移动-1</div>
        )}
        {isActed && !isDead && <div className="acted-overlay">已行动</div>}
      </div>
    </Tooltip>
  );
}
