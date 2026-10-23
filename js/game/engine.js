import { APPLE_SCORE, APPLE_XP, GRID, START_LENGTH, TIME_ATTACK_SECONDS } from '../config.js';

export const DIR = Object.freeze({ up: { x: 0, y: -1, angle: -Math.PI / 2 }, down: { x: 0, y: 1, angle: Math.PI / 2 }, left: { x: -1, y: 0, angle: Math.PI }, right: { x: 1, y: 0, angle: 0 } });
export const OPPOSITE = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });
const sameCell = (a, b) => a && b && a.x === b.x && a.y === b.y;
const cloneSnake = (snake) => snake.map(({ x, y }) => ({ x, y }));

export function getGrid(viewport = { width: 390, height: 844 }) {
  return viewport.width > viewport.height ? GRID.landscape : GRID.portrait;
}

export function randomFreeCell(cols, rows, snake, random = Math.random) {
  const occupied = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const free = [];
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  return free.length ? free[Math.floor(random() * free.length)] : null;
}

export function createRound({ mode = 'classic', difficulty = 'normal', grid = getGrid(), random = Math.random } = {}) {
  const { cols, rows } = grid;
  const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
  const snake = Array.from({ length: START_LENGTH }, (_, index) => ({ x: cx - index, y: cy }));
  return {
    id: `${Date.now()}-${Math.floor(random() * 1e6)}`,
    mode, difficulty, status: 'ready', cols, rows, snake, previousSnake: cloneSnake(snake),
    direction: 'right', directionQueue: [], food: randomFreeCell(cols, rows, snake, random),
    score: 0, fruits: 0, xpGained: 0, tick: 0, speedCellsPerSecond: 0,
    timeRemainingMs: mode === 'time' ? TIME_ATTACK_SECONDS * 1000 : null,
    elapsedMs: 0, effects: [], endReason: null
  };
}

export function enqueueDirection(round, nextDirection) {
  if (!DIR[nextDirection] || round.status === 'gameOver' || round.status === 'won') return false;
  const reference = round.directionQueue.at(-1) || round.direction;
  if (nextDirection === reference || OPPOSITE[reference] === nextDirection) return false;
  if (round.directionQueue.length >= 2) return false;
  round.directionQueue.push(nextDirection);
  return true;
}

export function beginRound(round) {
  if (round.status === 'ready') round.status = 'running';
  return round;
}

export function pauseRound(round) {
  if (round.status === 'running') round.status = 'paused';
  return round;
}

export function resumeRound(round) {
  if (round.status === 'paused') round.status = 'running';
  return round;
}

export function advanceRound(round, { random = Math.random } = {}) {
  if (round.status !== 'running') return { type: 'idle' };
  round.previousSnake = cloneSnake(round.snake);
  if (round.directionQueue.length) round.direction = round.directionQueue.shift();
  const vector = DIR[round.direction];
  const head = round.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const outOfBounds = nextHead.x < 0 || nextHead.x >= round.cols || nextHead.y < 0 || nextHead.y >= round.rows;
  const willEat = sameCell(nextHead, round.food);
  const occupied = willEat ? round.snake : round.snake.slice(0, -1);
  const hitSelf = occupied.some((segment) => sameCell(segment, nextHead));
  round.tick += 1;
  if (outOfBounds || hitSelf) {
    round.status = 'gameOver';
    round.endReason = outOfBounds ? 'wall' : 'self';
    return { type: 'gameOver', reason: round.endReason };
  }
  round.snake.unshift(nextHead);
  if (!willEat) { round.snake.pop(); return { type: 'move' , head: nextHead }; }
  round.score += APPLE_SCORE;
  round.fruits += 1;
  round.xpGained += APPLE_XP;
  round.effects.push({ type: 'eat', x: nextHead.x, y: nextHead.y, createdAt: performance.now() });
  round.food = randomFreeCell(round.cols, round.rows, round.snake, random);
  if (!round.food) {
    round.status = 'won'; round.endReason = 'board-full';
    return { type: 'won' };
  }
  return { type: 'eat', head: nextHead };
}

export function advanceTimer(round, elapsedMs) {
  if (round.status !== 'running') return false;
  round.elapsedMs += elapsedMs;
  if (round.mode !== 'time') return false;
  round.timeRemainingMs = Math.max(0, round.timeRemainingMs - elapsedMs);
  if (round.timeRemainingMs === 0) { round.status = 'gameOver'; round.endReason = 'time'; return true; }
  return false;
}

export function tickMs(round) {
  const bonus = Math.min(round.fruits * .11, 2.2);
  return 1000 / (round.speedCellsPerSecond + bonus);
}
