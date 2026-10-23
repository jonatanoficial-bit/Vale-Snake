export const VERSION = '1.0.0';
export const SAVE_KEY = 'vale-snake:v1:profile';
export const GRID = { portrait: { cols: 13, rows: 19 }, landscape: { cols: 22, rows: 13 } };
export const START_LENGTH = 3;
export const APPLE_SCORE = 10;
export const APPLE_XP = 10;
export const TIME_ATTACK_SECONDS = 90;
export const SWIPE_MIN_PX = 24;
export const SPEEDS = { easy: 4.5, normal: 6, hard: 8, insane: 10 };
export const DIFFICULTIES = {
  easy: { name: 'Fácil', hint: '4,5 células/s', speed: SPEEDS.easy },
  normal: { name: 'Normal', hint: '6 células/s', speed: SPEEDS.normal },
  hard: { name: 'Difícil', hint: '8 células/s', speed: SPEEDS.hard },
  insane: { name: 'Insano', hint: '10 células/s', speed: SPEEDS.insane }
};
export const MODES = {
  classic: { name: 'Clássico', hint: 'Cresça e não encoste nas paredes.', icon: '🍎' },
  time: { name: 'Contra o relógio', hint: '90 segundos para alcançar seu melhor.', icon: '⏱' }
};
