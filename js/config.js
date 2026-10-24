export const VERSION = '1.0.2';
export const SAVE_KEY = 'vale-snake:v1:profile';
export const GRID = { portrait: { cols: 13, rows: 19 }, landscape: { cols: 22, rows: 13 } };
export const START_LENGTH = 3;
export const APPLE_SCORE = 10;
export const APPLE_XP = 10;
export const TIME_ATTACK_SECONDS = 90;
export const SWIPE_MIN_PX = 24;
// Intencionalmente cadenciado para permitir antecipar curvas em telas touch.
export const SPEEDS = { easy: 1.5, normal: 2, hard: 2.6, insane: 3.25 };
export const SPEED_PRESETS = {
  slow: { name: 'Lenta', hint: 'Mais tempo para reagir', multiplier: .7 },
  normal: { name: 'Normal', hint: 'Ritmo equilibrado', multiplier: 1 },
  fast: { name: 'Rápida', hint: 'Para quem quer desafio', multiplier: 1.35 }
};
export const DIFFICULTIES = {
  easy: { name: 'Fácil', hint: '1,5 células/s', speed: SPEEDS.easy },
  normal: { name: 'Normal', hint: '2 células/s', speed: SPEEDS.normal },
  hard: { name: 'Difícil', hint: '2,6 células/s', speed: SPEEDS.hard },
  insane: { name: 'Insano', hint: '3,25 células/s', speed: SPEEDS.insane }
};
export function effectiveSpeed(difficulty, preference = 'slow') {
  return SPEEDS[difficulty] * (SPEED_PRESETS[preference]?.multiplier ?? SPEED_PRESETS.slow.multiplier);
}
export const MODES = {
  classic: { name: 'Clássico', hint: 'Cresça e não encoste nas paredes.', icon: '🍎' },
  time: { name: 'Contra o relógio', hint: '90 segundos para alcançar seu melhor.', icon: '⏱' }
};
