import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceRound, advanceTimer, beginRound, createRound, enqueueDirection, randomFreeCell } from '../js/game/engine.js';

const grid = { cols: 7, rows: 7 };
const fixedRandom = () => 0;
const runningRound = () => { const round = createRound({ grid, random: fixedRandom }); beginRound(round); return round; };

test('starts with three segments, one valid apple, and moves right', () => {
  const round = runningRound();
  assert.equal(round.snake.length, 3);
  assert.equal(round.direction, 'right');
  assert.ok(round.food);
  assert.equal(round.snake.some((cell) => cell.x === round.food.x && cell.y === round.food.y), false);
  const head = { ...round.snake[0] }; advanceRound(round, { random: fixedRandom });
  assert.deepEqual(round.snake[0], { x: head.x + 1, y: head.y });
  assert.equal(round.snake.length, 3);
});

test('ignores an immediate 180 degree reversal and accepts a valid queued turn', () => {
  const round = runningRound();
  assert.equal(enqueueDirection(round, 'left'), false);
  assert.equal(enqueueDirection(round, 'up'), true);
  advanceRound(round, { random: fixedRandom });
  assert.equal(round.direction, 'up');
  assert.equal(enqueueDirection(round, 'down'), false);
});

test('apple raises score, XP and length by exactly one', () => {
  const round = runningRound();
  const head = round.snake[0]; round.food = { x: head.x + 1, y: head.y };
  const outcome = advanceRound(round, { random: fixedRandom });
  assert.equal(outcome.type, 'eat'); assert.equal(round.score, 10); assert.equal(round.xpGained, 10); assert.equal(round.fruits, 1); assert.equal(round.snake.length, 4);
  assert.equal(round.snake.some((cell) => cell.x === round.food.x && cell.y === round.food.y), false);
});

test('allows moving into the departing tail only when not eating', () => {
  const round = runningRound();
  round.snake = [{x:3,y:3},{x:3,y:4},{x:2,y:4},{x:2,y:3}]; round.previousSnake = structuredClone(round.snake); round.direction = 'left'; round.food = {x:0,y:0};
  const event = advanceRound(round, { random: fixedRandom });
  assert.equal(event.type, 'move'); assert.equal(round.status, 'running'); assert.equal(round.snake.length, 4);
});

test('ends classic run at wall and never produces food when board is full', () => {
  const round = runningRound(); round.snake[0] = { x: 6, y: 3 }; round.previousSnake = structuredClone(round.snake); round.direction = 'right';
  assert.equal(advanceRound(round).type, 'gameOver'); assert.equal(round.endReason, 'wall');
  const allCells = Array.from({ length: 49 }, (_, index) => ({ x: index % 7, y: Math.floor(index / 7) }));
  assert.equal(randomFreeCell(7, 7, allCells), null);
});

test('time attack ends precisely at zero', () => {
  const round = createRound({ mode: 'time', grid, random: fixedRandom }); beginRound(round); assert.equal(advanceTimer(round, 90000), true); assert.equal(round.timeRemainingMs, 0); assert.equal(round.endReason, 'time');
});
