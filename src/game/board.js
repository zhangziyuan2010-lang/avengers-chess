import { getCharacter } from '../data/characters';

const BOARD_SIZE = 10;
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function getBoardSize() {
  return BOARD_SIZE;
}

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
 * Place units randomly within a row range [startRow, endRow] (inclusive).
 * Returns updated board.
 */
export function placeUnitsOnRows(board, unitIds, startRow, endRow) {
  const newBoard = board.map((r) => [...r]);
  const positions = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      positions.push({ row: r, col: c });
    }
  }
  const shuffled = shuffle(positions);
  unitIds.forEach((unitId, i) => {
    const { row, col } = shuffled[i];
    newBoard[row][col] = unitId;
  });
  return newBoard;
}

/**
 * Read unit positions back from the board after placement.
 */
export function readPositionsFromBoard(board, unitIds) {
  const positions = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const uid = board[r][c];
      if (uid && unitIds.includes(uid)) {
        positions[uid] = { row: r, col: c };
      }
    }
  }
  return positions;
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
 * - Fly units (e.g. Hawkeye) can pass through any unit
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
        continue;
      }

      visited.add(key);
      queue.push({ row: nr, col: nc, steps: steps + 1 });
    }
  }

  return reachable;
}

/**
 * Find all enemy units within attack range (Chebyshev distance).
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

export function isEnemyInRange(attackerRow, attackerCol, range, enemyRow, enemyCol) {
  return chebyshevDistance(attackerRow, attackerCol, enemyRow, enemyCol) <= range;
}
