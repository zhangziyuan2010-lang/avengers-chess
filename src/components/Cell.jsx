import { getCharacter } from '../data/characters';

export default function Cell({
  row,
  col,
  unit,
  isMovable,
  isAttackTarget,
  isSelected,
  onClick,
}) {
  const charData = unit ? getCharacter(unit.charId) : null;
  const isDead = unit && unit.hp <= 0;

  let cellClass = 'cell';
  if (isMovable) cellClass += ' movable';
  if (isAttackTarget) cellClass += ' attack-target';
  if (isSelected) cellClass += ' selected-cell';

  return (
    <div className={cellClass} onClick={() => onClick(row, col)}>
      {/* Grid label for row 0 and col 0 */}
      {row === 5 && <span className="cell-label col-label">{col}</span>}
      {col === 0 && <span className="cell-label row-label">{row}</span>}

      {unit && !isDead && (
        <div
          className={`cell-unit ${unit.owner}`}
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
