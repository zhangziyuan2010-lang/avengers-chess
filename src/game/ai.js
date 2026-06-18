import { getCharacter } from '../data/characters';
import { getMovableCells, manhattanDistance, isEnemyInRange } from './board';

/**
 * AI decision-making for one unit.
 * Returns { action: 'move_attack' | 'attack' | 'move', toRow?, toCol?, targetId? }
 */
export function decideAiAction(board, unitId, units, playerUnitIds, enemyUnitIds) {
  const unit = units[unitId];
  if (!unit || unit.hp <= 0) return { action: 'none' };

  const charData = getCharacter(unit.charId);
  if (!charData) return { action: 'none' };

  // Get living player units
  const livingEnemies = playerUnitIds.filter((id) => units[id] && units[id].hp > 0);
  if (livingEnemies.length === 0) return { action: 'none' };

  // Find closest enemy
  let closestEnemy = null;
  let closestDist = Infinity;
  for (const enemyId of livingEnemies) {
    const enemy = units[enemyId];
    const dist = manhattanDistance(unit.row, unit.col, enemy.row, enemy.col);
    if (dist < closestDist) {
      closestDist = dist;
      closestEnemy = enemy;
    }
  }

  if (!closestEnemy) return { action: 'none' };

  // Check if already in attack range
  if (isEnemyInRange(unit.row, unit.col, charData.range, closestEnemy.row, closestEnemy.col)) {
    // Attack the lowest HP enemy in range
    const target = pickBestTarget(board, unit, charData, livingEnemies, units);
    return { action: 'attack', targetId: target };
  }

  // Need to move: find best cell to approach enemy
  const movableCells = getMovableCells(board, unit.row, unit.col, charData);

  if (movableCells.length === 0) return { action: 'none' };

  // Find the cell that gets closest to the enemy
  let bestCell = movableCells[0];
  let bestDist = manhattanDistance(bestCell.row, bestCell.col, closestEnemy.row, closestEnemy.col);

  for (const cell of movableCells) {
    const dist = manhattanDistance(cell.row, cell.col, closestEnemy.row, closestEnemy.col);
    if (dist < bestDist) {
      bestDist = dist;
      bestCell = cell;
    }
  }

  // After moving, check if any enemy is in attack range
  const afterMoveEnemies = livingEnemies.filter((id) => {
    const enemy = units[id];
    return isEnemyInRange(bestCell.row, bestCell.col, charData.range, enemy.row, enemy.col);
  });

  if (afterMoveEnemies.length > 0) {
    const target = pickBestTargetAt(bestCell.row, bestCell.col, charData, afterMoveEnemies, units);
    return { action: 'move_attack', toRow: bestCell.row, toCol: bestCell.col, targetId: target };
  }

  return { action: 'move', toRow: bestCell.row, toCol: bestCell.col };
}

function pickBestTarget(board, unit, charData, enemyIds, units) {
  const inRange = enemyIds.filter((id) => {
    const enemy = units[id];
    return isEnemyInRange(unit.row, unit.col, charData.range, enemy.row, enemy.col);
  });

  return pickLowestHp(inRange, units);
}

function pickBestTargetAt(row, col, charData, enemyIds, units) {
  const inRange = enemyIds.filter((id) => {
    const enemy = units[id];
    return isEnemyInRange(row, col, charData.range, enemy.row, enemy.col);
  });

  return pickLowestHp(inRange, units);
}

function pickLowestHp(enemyIds, units) {
  let best = enemyIds[0];
  for (const id of enemyIds) {
    if (units[id].hp < units[best].hp) {
      best = id;
    }
  }
  return best;
}
