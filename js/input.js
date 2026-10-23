import { SWIPE_MIN_PX } from './config.js';

export function bindGameInput(target, onDirection, onStart) {
  let start = null;
  const chooseDirection = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  const down = (event) => { start = { x: event.clientX, y: event.clientY }; target.setPointerCapture?.(event.pointerId); onStart?.(); };
  const up = (event) => {
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y; start = null;
    if (Math.hypot(dx, dy) >= SWIPE_MIN_PX) onDirection(chooseDirection(dx, dy));
  };
  const cancel = () => { start = null; };
  const keydown = (event) => {
    const map = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (map[event.key]) { event.preventDefault(); onStart?.(); onDirection(map[event.key]); }
  };
  target.addEventListener('pointerdown', down); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', cancel); window.addEventListener('keydown', keydown);
  return () => { target.removeEventListener('pointerdown', down); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', keydown); };
}
