import { getCharacter } from '../data/characters';

const BOARD_SIZE = 6;
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// 8 surrounding cells (for attack range checks)
const SURROUNDING_8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function isInBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function manhattanDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function chebyshevDistance(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

/**
 * Place units randomly on the given row.
 * Returns updated board.
 */
export function placeUnitsOnRow(board, unitIds, row) {
  const newBoard = board.map((r) => [...r]);
  const cols = shuffle([0, 1, 2, 3, 4, 5]);
  unitIds.forEach((unitId, i) => {
    newBoard[row][cols[i]] = unitId;
  });
  return newBoard;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * BFS to find all cells a unit can move to.
 * - 4-directional movement
 * - Cannot end on occupied cell
 * - Non-fly units cannot pass through occupied cells
 * - Fly units (Skye) can pass through any unit
 */
export function getMovableCells(board, unitRow, unitCol, charData) {
  const maxSteps = charData.move;
  const canFly = charData.fly || false;
  const reachable = [];
  const visited = new Set();
  const queue = [{ row: unitRow, col: unitCol, steps: 0 }];
  visited.add(`${unitRow},${unitCol}`);

  while (queue.length > 0) {
    const { row, col, steps } = queue.shift();

    if (steps > 0) {
      // Can stop on empty cells only
      if (board[row][col] === null) {
        reachable.push({ row, col });
      }
    }

    if (steps >= maxSteps) continue;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      const key = `${nr},${nc}`;

      if (!isInBounds(nr, nc)) continue;
      if (visited.has(key)) continue;

      const occupied = board[nr][nc] !== null;

      if (occupied && !canFly) {
        // Non-fly: cannot enter occupied cells at all
        continue;
      }

      // Fly: can pass through, or cell is empty
      visited.add(key);
      queue.push({ row: nr, col: nc, steps: steps + 1 });
    }
  }

  return reachable;
}

/**
 * Find all enemy units within attack range of the given position.
 * Uses Chebyshev distance (accounts for diagonals).
 * No line-of-sight blocking.
 */
export function getAttackableTargets(
  board,
  unitRow,
  unitCol,
  charData,
  enemyUnitIds,
  units
) {
  const range = charData.range;
  const targets = [];

  for (const enemyId of enemyUnitIds) {
    const enemy = units[enemyId];
    if (!enemy || enemy.hp <= 0) continue;

    const dist = chebyshevDistance(unitRow, unitCol, enemy.row, enemy.col);
    if (dist <= range && dist > 0) {
      targets.push(enemyId);
    }
  }

  return targets;
}

/**
 * Get all positions within Chebyshev distance ≤ range from (row, col),
 * excluding the origin. Used for highlighting attack range.
 */
export function getCellsInRange(row, col, range) {
  const cells = [];
  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (isInBounds(nr, nc)) {
        cells.push({ row: nr, col: nc });
      }
    }
  }
  return cells;
}

/**
 * Check if a specific enemy unit is within attack range.
 */
export function isEnemyInRange(attackerRow, attackerCol, range, enemyRow, enemyCol) {
  return chebyshevDistance(attackerRow, attackerCol, enemyRow, enemyCol) <= range;
}
