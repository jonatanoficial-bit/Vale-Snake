import { SAVE_KEY } from './config.js';

const defaults = () => ({
  schemaVersion: 1, createdAt: Date.now(), lastPlayedAt: null, totalXp: 0, level: 1,
  totalGames: 0, totalFruits: 0, highScores: {}, leaderboardLocal: [],
  settings: { alias: 'Jogador', sound: true, vibration: true, dpadOpacity: 100, gameSpeed: 'slow' }
});
export function getLevel(totalXp) { return Math.max(1, Math.floor((1 + Math.sqrt(1 + (totalXp * 8 / 100))) / 2)); }
export function xpForLevel(level) { return 100 * (level - 1) * level / 2; }
export function xpToNext(level) { return 100 * level; }
export function sanitizeAlias(value) { const safe = String(value || '').replace(/[<>]/g, '').trim().slice(0, 16); return safe.length >= 2 ? safe : 'Jogador'; }
export function loadProfile() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaults();
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('invalid profile');
    const merged = { ...defaults(), ...value, highScores: { ...(value.highScores || {}) }, leaderboardLocal: Array.isArray(value.leaderboardLocal) ? value.leaderboardLocal : [], settings: { ...defaults().settings, ...(value.settings || {}) } };
    merged.settings.alias = sanitizeAlias(merged.settings.alias);
    if (!['slow', 'normal', 'fast'].includes(merged.settings.gameSpeed)) merged.settings.gameSpeed = 'slow';
    merged.level = getLevel(Number(merged.totalXp) || 0);
    return merged;
  } catch { return defaults(); }
}
export function saveProfile(profile) { profile.level = getLevel(profile.totalXp); localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); return profile; }
export function addResult(profile, round) {
  const key = `${round.mode}:${round.difficulty}`;
  const isHighScore = round.score > (profile.highScores[key] || 0);
  profile.highScores[key] = Math.max(profile.highScores[key] || 0, round.score);
  profile.totalXp += round.xpGained; profile.totalFruits += round.fruits; profile.totalGames += 1; profile.lastPlayedAt = Date.now();
  profile.leaderboardLocal.push({ id: round.id, alias: sanitizeAlias(profile.settings.alias), mode: round.mode, difficulty: round.difficulty, score: round.score, fruits: round.fruits, durationMs: Math.round(round.elapsedMs), finishedAt: Date.now() });
  profile.leaderboardLocal.sort((a, b) => b.score - a.score || b.fruits - a.fruits || a.durationMs - b.durationMs || b.finishedAt - a.finishedAt);
  profile.leaderboardLocal = profile.leaderboardLocal.slice(0, 10);
  saveProfile(profile);
  return { isHighScore, profile };
}
