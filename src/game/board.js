import { getCharacter } from '../data/characters';

const BOARD_SIZE = 10;
const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const TERRAIN_TYPES = {
  HIGHLAND: 'highland',
  RIVER: 'river',
  SPRING: 'spring',
};

export function getBoardSize() {
  return BOARD_SIZE;
}

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function createEmptyTerrain() {
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

/**
 * Generate random terrain on empty cells.
 * Total: 4-10 tiles. Types: highland ~40%, river ~35%, spring ~25%.
 */
export function generateTerrain(board) {
  const terrain = createEmptyTerrain();

  // Find empty cells
  const emptyCells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length === 0) return terrain;

  // 4-10 terrain tiles
  const count = Math.min(10, emptyCells.length, Math.floor(Math.random() * 7) + 4);
  const shuffledCells = shuffle([...emptyCells]);

  // Distribute types
  const highlandCount = Math.max(1, Math.floor(count * 0.4));
  const riverCount = Math.max(1, Math.floor(count * 0.35));
  const springCount = count - highlandCount - riverCount;

  const types = [];
  for (let i = 0; i < highlandCount; i++) types.push(TERRAIN_TYPES.HIGHLAND);
  for (let i = 0; i < riverCount; i++) types.push(TERRAIN_TYPES.RIVER);
  for (let i = 0; i < springCount; i++) types.push(TERRAIN_TYPES.SPRING);

  const shuffledTypes = shuffle(types);

  for (let i = 0; i < count; i++) {
    const { row, col } = shuffledCells[i];
    terrain[row][col] = shuffledTypes[i];
  }

  return terrain;
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
 * - River cells: can enter but stop (no further movement from river)
 * - shocked: if true, maxSteps reduced by 1
 */
export function getMovableCells(board, terrain, unitRow, unitCol, charData, shocked = false) {
  let maxSteps = charData.move;
  if (shocked) maxSteps = Math.max(0, maxSteps - 1);
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

    // If we entered a river, stop (can't continue moving)
    if (steps > 0 && terrain[row][col] === TERRAIN_TYPES.RIVER) {
      continue;
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
