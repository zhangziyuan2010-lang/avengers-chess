import { getCharacter } from '../data/characters';

export default function Tooltip({ unit, children }) {
  if (!unit) return children;

  const charData = getCharacter(unit.charId);
  if (!charData) return children;

  const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);

  return (
    <div className="tooltip-wrapper">
      {children}
      <div className="tooltip-popup">
        <div className="tooltip-header" style={{ '--char-color': charData.color }}>
          <span className="tooltip-emoji">{charData.emoji}</span>
          <div>
            <div className="tooltip-name">{charData.name}</div>
            <div className="tooltip-en">{charData.enName}</div>
          </div>
        </div>
        <div className="tooltip-hp-bar">
          <div className="tooltip-hp-fill" style={{ width: `${hpPercent}%`, backgroundColor: charData.color }} />
        </div>
        <div className="tooltip-hp-text">
          ❤️ {unit.hp} / {unit.maxHp} {unit.shocked ? '⚡ 移动-1' : ''}
        </div>
        <div className="tooltip-stats">
          <div className="tooltip-stat">🦶 移动力 <strong>{charData.move}{(unit.shocked ? ' → ' + Math.max(0, charData.move - 1) : '')}</strong></div>
          <div className="tooltip-stat">⚔️ 攻击力 <strong>{charData.attack}</strong></div>
          <div className="tooltip-stat">🎯 射程 <strong>{charData.range} 格</strong></div>
          {charData.fly && <div className="tooltip-stat">✈️ <strong>可穿越单位</strong></div>}
        </div>
        <div className="tooltip-skill">
          <div className="tooltip-skill-name">⭐ {charData.skillName}</div>
          <div className="tooltip-skill-desc">{charData.skillShort}</div>
        </div>
      </div>
    </div>
  );
}
