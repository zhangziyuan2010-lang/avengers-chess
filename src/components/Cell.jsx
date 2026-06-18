import { getCharacter } from '../data/characters';

const TERRAIN_ICONS = {
  highland: '⛰️',
  river: '🌊',
  spring: '💧',
};

const TERRAIN_LABELS = {
  highland: '高地',
  river: '河流',
  spring: '泉水',
};

export default function Cell({
  row,
  col,
  unit,
  terrainType,
  isMovable,
  isAttackTarget,
  isSelected,
  isGhost,
  isAnimatingIn,
  onClick,
}) {
  const charData = unit ? getCharacter(unit.charId) : null;
  const isDead = unit && unit.hp <= 0;

  let cellClass = 'cell';
  if (terrainType) cellClass += ` terrain-${terrainType}`;
  if (isMovable) cellClass += ' movable';
  if (isAttackTarget) cellClass += ' attack-target';
  if (isSelected) cellClass += ' selected-cell';
  if (isAnimatingIn) cellClass += ' animating-in';

  // Ghost: render faded unit at previous position during animation
  if (isGhost && charData) {
    return (
      <div className={`cell ghost-cell${terrainType ? ' terrain-' + terrainType : ''}`} onClick={() => onClick(row, col)}>
        {terrainType && <span className="terrain-icon">{TERRAIN_ICONS[terrainType]}</span>}
        <div className="cell-unit ghost">
          <span className="cell-unit-emoji">{charData.emoji}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cellClass} onClick={() => onClick(row, col)} title={terrainType ? TERRAIN_LABELS[terrainType] : ''}>
      {/* Terrain icon in corner */}
      {terrainType && <span className="terrain-icon">{TERRAIN_ICONS[terrainType]}</span>}

      {unit && !isDead && (
        <div
          className={`cell-unit ${unit.owner} ${isAnimatingIn ? 'pop-in' : ''}`}
          style={{ '--char-color': charData?.color }}
        >
          <span className="cell-unit-emoji">{charData?.emoji}</span>
          <div className="cell-unit-hp">
            <div
              className="cell-unit-hp-fill"
              style={{
                width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
                backgroundColor: charData?.color,
              }}
            />
          </div>
        </div>
      )}

      {unit && isDead && (
        <div className="cell-unit dead">
          <span className="cell-unit-emoji">💀</span>
        </div>
      )}

      {isMovable && <div className="movable-dot" />}
      {isAttackTarget && <div className="attack-crosshair">🎯</div>}
    </div>
  );
}
