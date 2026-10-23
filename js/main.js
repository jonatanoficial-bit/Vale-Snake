import { DIFFICULTIES, MODES, VERSION } from './config.js';
import { advanceRound, advanceTimer, beginRound, createRound, enqueueDirection, getGrid, pauseRound, resumeRound, tickMs } from './game/engine.js';
import { bindGameInput } from './input.js';
import { addResult, getLevel, loadProfile, sanitizeAlias, saveProfile, xpForLevel, xpToNext } from './storage.js';
import { AudioManager } from './audio.js';
import { TempleRenderer } from './render/canvas.js';

const app = document.querySelector('#app');
let profile = loadProfile();
let audio = new AudioManager(profile);
let selectedMode = 'classic', selectedDifficulty = 'normal';
let round = null, renderer = null, rafId = 0, inputCleanup = null, lastFrame = 0, accumulator = 0, deferredInstallPrompt = null;
let toastTimer = 0;

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const button = (label, action, extra = '') => `<button class="button ${extra}" type="button" data-action="${action}">${label}</button>`;
function showToast(message) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
  el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2700);
}
function clearGame() {
  cancelAnimationFrame(rafId); rafId = 0; inputCleanup?.(); inputCleanup = null; renderer = null; lastFrame = 0; accumulator = 0;
}
function setScreen(markup, setup) { clearGame(); app.innerHTML = markup; setup?.(); window.scrollTo(0, 0); }
function profileXp() { const level = getLevel(profile.totalXp); const floor = xpForLevel(level); return { level, percent: Math.min(100, ((profile.totalXp - floor) / xpToNext(level)) * 100) || 0 }; }
function bindActions(map) { app.querySelectorAll('[data-action]').forEach((element) => element.addEventListener('click', () => map[element.dataset.action]?.(element))); }

function showHome() {
  const { level } = profileXp();
  setScreen(`<section class="screen home" aria-label="Página inicial"><div class="home-card"><div class="brand-badge" aria-hidden="true">🐍</div><h1 class="brand-title">VALE<span>SNAKE</span></h1><p class="tagline">Ruínas tropicais. Uma cobra carismática. Seu próximo recorde.</p><div class="button-stack">${button('Jogar agora', 'play', 'primary')}${button('Modos e dificuldade', 'modes')}${button('Recordes locais', 'records')}${button('Como jogar', 'help')}${button('Configurações', 'settings')}${button('Instalar o jogo', 'install', 'ghost')}</div><p class="home-footer">Nível ${level} · Vale Games · v${VERSION}</p></div></section>`, () => bindActions({ play: () => startGame(), modes: showModes, records: showRecords, help: showHelp, settings: showSettings, install: showInstall }));
}
function showModes() {
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">Escolha o modo</h1><p class="screen-lead">Cada modo usa regras claras e seus próprios recordes.</p><div class="mode-grid">${Object.entries(MODES).map(([key, mode]) => `<button class="choice" type="button" aria-pressed="${key === selectedMode}" data-mode="${key}"><strong>${mode.icon} ${mode.name}</strong><small>${mode.hint}</small></button>`).join('')}</div><div class="inline-actions">${button('Voltar', 'home', 'ghost')}${button('Continuar', 'continue', 'primary')}</div></div></section>`, () => { app.querySelectorAll('[data-mode]').forEach((choice) => choice.addEventListener('click', () => { selectedMode = choice.dataset.mode; app.querySelectorAll('[data-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === choice))); })); bindActions({ home: showHome, continue: showDifficulty }); });
}
function showDifficulty() {
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">${MODES[selectedMode].name}</h1><p class="screen-lead">A velocidade aumenta um pouco a cada fruta. Escolha seu ritmo.</p><div class="difficulty-grid">${Object.entries(DIFFICULTIES).map(([key, difficulty]) => `<button class="choice" type="button" aria-pressed="${key === selectedDifficulty}" data-difficulty="${key}"><strong>${difficulty.name}</strong><small>${difficulty.hint}</small></button>`).join('')}</div><div class="inline-actions">${button('Voltar', 'modes', 'ghost')}${button('Entrar no templo', 'start', 'primary')}</div></div></section>`, () => { app.querySelectorAll('[data-difficulty]').forEach((choice) => choice.addEventListener('click', () => { selectedDifficulty = choice.dataset.difficulty; app.querySelectorAll('[data-difficulty]').forEach((item) => item.setAttribute('aria-pressed', String(item === choice))); })); bindActions({ modes: showModes, start: () => startGame() }); });
}
function showRecords() {
  const entries = profile.leaderboardLocal;
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">Recordes locais</h1><p class="screen-lead">Salvos apenas neste navegador e dispositivo.</p><ol class="list">${entries.length ? entries.map((entry, index) => `<li><strong>#${index + 1}</strong><span>${escape(entry.alias)}<small> · ${MODES[entry.mode]?.name || entry.mode} / ${DIFFICULTIES[entry.difficulty]?.name || entry.difficulty} · ${entry.fruits} maçãs</small></span><strong>${entry.score}</strong></li>`).join('') : '<li><span>Seu primeiro recorde aparecerá aqui depois de uma partida.</span></li>'}</ol><div class="inline-actions">${button('Voltar', 'home', 'primary')}</div></div></section>`, () => bindActions({ home: showHome }));
}
function showHelp() {
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">Como jogar</h1><p class="screen-lead">A cobra avança sozinha. Faça curvas no momento certo e cresça bastante.</p><ul class="help-list"><li><span class="help-icon">👆</span><span><strong>Deslize</strong> no tabuleiro para cima, baixo, esquerda ou direita.</span></li><li><span class="help-icon">⌨️</span><span><strong>No computador:</strong> setas ou WASD. Espaço/Esc pausa a partida.</span></li><li><span class="help-icon">🍎</span><span><strong>Maçãs:</strong> +10 pontos, +10 XP e mais um segmento.</span></li><li><span class="help-icon">🧱</span><span><strong>Clássico:</strong> paredes e o próprio corpo encerram a rodada.</span></li><li><span class="help-icon">⏱️</span><span><strong>Contra o relógio:</strong> marque o máximo em 90 segundos.</span></li></ul><div class="inline-actions">${button('Voltar', 'home', 'primary')}</div></div></section>`, () => bindActions({ home: showHome }));
}
function showSettings() {
  const settings = profile.settings;
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">Configurações</h1><p class="screen-lead">Preferências salvas neste dispositivo.</p><div class="setting"><span><label for="alias">Apelido</label><small>De 2 a 16 caracteres no ranking local.</small></span><input id="alias" maxlength="16" value="${escape(settings.alias)}" autocomplete="nickname"></div><div class="setting"><span><label for="sound">Som</label><small>Toques e efeitos gerados no aparelho.</small></span><input id="sound" type="checkbox" ${settings.sound ? 'checked' : ''}></div><div class="setting"><span><label for="vibration">Vibração</label><small>Resposta curta ao comer ou colidir, se houver suporte.</small></span><input id="vibration" type="checkbox" ${settings.vibration ? 'checked' : ''}></div><div class="setting"><span><label for="dpad">Opacidade do direcional</label><small>Controle visível durante a partida.</small></span><select id="dpad"><option value="100" ${settings.dpadOpacity === 100 ? 'selected' : ''}>100%</option><option value="80" ${settings.dpadOpacity === 80 ? 'selected' : ''}>80%</option><option value="60" ${settings.dpadOpacity === 60 ? 'selected' : ''}>60%</option></select></div><p class="version">Vale Snake v${VERSION} · dados locais versionados</p><div class="inline-actions">${button('Voltar', 'home', 'primary')}</div></div></section>`, () => { const persist = () => { profile.settings.alias = sanitizeAlias(app.querySelector('#alias').value); profile.settings.sound = app.querySelector('#sound').checked; profile.settings.vibration = app.querySelector('#vibration').checked; profile.settings.dpadOpacity = Number(app.querySelector('#dpad').value); saveProfile(profile); audio = new AudioManager(profile); }; app.querySelectorAll('#alias,#sound,#vibration,#dpad').forEach((field) => field.addEventListener('change', persist)); bindActions({ home: () => { persist(); showHome(); } }); });
}
function showInstall() {
  const enabled = Boolean(deferredInstallPrompt);
  setScreen(`<section class="screen menu-screen"><div class="panel"><h1 class="screen-heading">Instalar Vale Snake</h1><p class="screen-lead">${enabled ? 'Este navegador já liberou a instalação.' : 'O jogo funciona no navegador e fica disponível offline após o primeiro carregamento.'}</p><ul class="help-list"><li><span class="help-icon">🤖</span><span><strong>Android:</strong> use o botão abaixo quando ele estiver disponível ou o menu do navegador → “Instalar app”.</span></li><li><span class="help-icon">🍏</span><span><strong>iPhone/iPad:</strong> no Safari, toque em Compartilhar → “Adicionar à Tela de Início”.</span></li><li><span class="help-icon">📡</span><span><strong>Offline:</strong> abra uma vez com conexão para o cache local ser criado.</span></li></ul><div class="inline-actions">${enabled ? button('Instalar agora', 'installNow', 'primary') : ''}${button('Voltar', 'home', enabled ? 'ghost' : 'primary')}</div></div></section>`, () => bindActions({ home: showHome, installNow: async () => { deferredInstallPrompt.prompt(); const result = await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; showToast(result.outcome === 'accepted' ? 'Instalação iniciada.' : 'Instalação cancelada.'); showInstall(); } }));
}
function gameTemplate() {
  const xp = profileXp(); const key = `${selectedMode}:${selectedDifficulty}`; const high = profile.highScores[key] || 0;
  return `<section class="screen game-screen" aria-label="Partida de Vale Snake"><header class="hud"><div class="hud-card"><span class="hud-label">PONTUAÇÃO</span><strong class="hud-value" id="hud-score">0</strong><div class="xp-wrap"><span>NÍVEL ${xp.level}</span><span class="xp-track"><span class="xp-fill" id="xp-fill" style="width:${xp.percent}%"></span></span></div></div><div class="hud-card right"><span class="hud-label">${selectedMode === 'time' ? 'TEMPO' : 'RECORDE'}</span><strong class="hud-value" id="hud-meta">${selectedMode === 'time' ? '1:30' : high}</strong><small class="hud-label">${selectedMode === 'time' ? 'CONTRA O RELÓGIO' : DIFFICULTIES[selectedDifficulty].name.toUpperCase()}</small></div><button class="pause-button" type="button" data-action="pause" aria-label="Pausar partida">Ⅱ</button></header><div class="board-wrap" id="board-wrap"><canvas id="game-canvas" aria-label="Arena jogável do Templo Esquecido"></canvas><p class="ready-hint" id="ready-hint">Deslize, toque no direcional ou pressione uma seta para iniciar</p><div id="game-modal" class="game-modal" hidden></div></div><footer class="controls"><div class="dpad" id="dpad" style="opacity:${profile.settings.dpadOpacity / 100}"><button type="button" data-dir="up" aria-label="Ir para cima">▲</button><button type="button" data-dir="left" aria-label="Ir para a esquerda">◀</button><button type="button" data-dir="down" aria-label="Ir para baixo">▼</button><button type="button" data-dir="right" aria-label="Ir para a direita">▶</button></div><p class="control-copy">${MODES[selectedMode].name}<br>${DIFFICULTIES[selectedDifficulty].name} · swipe, D-pad ou teclado</p></footer></section>`;
}
function modal(markup) { const el = app.querySelector('#game-modal'); el.innerHTML = `<div class="modal-card">${markup}</div>`; el.hidden = false; return el; }
function hideModal() { const el = app.querySelector('#game-modal'); if (el) { el.hidden = true; el.innerHTML = ''; } }
function updateHud() {
  if (!round) return; const score = app.querySelector('#hud-score'), meta = app.querySelector('#hud-meta'); if (score) score.textContent = round.score.toLocaleString('pt-BR');
  if (meta) meta.textContent = round.mode === 'time' ? `${Math.floor(round.timeRemainingMs / 60000)}:${String(Math.ceil((round.timeRemainingMs % 60000) / 1000)).padStart(2, '0')}` : String(profile.highScores[`${round.mode}:${round.difficulty}`] || 0);
}
function startGame() {
  setScreen(gameTemplate());
  round = createRound({ mode: selectedMode, difficulty: selectedDifficulty, grid: getGrid({ width: window.innerWidth, height: window.innerHeight }) }); round.speedCellsPerSecond = DIFFICULTIES[selectedDifficulty].speed;
  renderer = new TempleRenderer(app.querySelector('#game-canvas')); renderer.resize();
  const board = app.querySelector('#board-wrap');
  const start = () => { if (!round || round.status !== 'ready') return; beginRound(round); app.querySelector('#ready-hint').style.opacity = '0'; audio.unlock(); hideModal(); };
  const direction = (value) => { start(); if (enqueueDirection(round, value)) audio.unlock(); };
  inputCleanup = bindGameInput(board, direction, start);
  app.querySelectorAll('[data-dir]').forEach((control) => control.addEventListener('click', () => direction(control.dataset.dir)));
  bindActions({ pause: () => togglePause() });
  lastFrame = performance.now(); rafId = requestAnimationFrame(gameLoop);
}
function togglePause() {
  if (!round || !['running', 'paused', 'ready'].includes(round.status)) return;
  if (round.status === 'running') {
    pauseRound(round); audio.pause(); modal(`<h2>Pausa</h2><p>A cobra está descansando sob as ruínas.</p><div class="button-stack">${button('Retomar', 'resume', 'primary')}${button('Reiniciar', 'restart')}${button('Configurações', 'settings')}${button('Sair para o menu', 'home', 'ghost')}</div>`); bindActions({ resume: () => { resumeRound(round); hideModal(); }, restart: () => startGame(), settings: showSettings, home: showHome });
  } else if (round.status === 'paused') { resumeRound(round); hideModal(); }
}
function completeRound() {
  if (!round || round.saved) return; round.saved = true; const saved = addResult(profile, round); audio.fail(); audio.vibrate([70, 40, 90]);
  const title = round.status === 'won' ? 'Templo conquistado!' : round.endReason === 'time' ? 'Tempo esgotado!' : 'Fim de jogo';
  const extra = saved.isHighScore && round.score > 0 ? '<p><strong>🏆 Novo recorde local!</strong></p>' : '';
  modal(`<h2>${title}</h2>${extra}<p>${round.endReason === 'wall' ? 'A parede antiga foi mais rápida.' : round.endReason === 'self' ? 'A trilha ficou apertada demais.' : 'Sua expedição foi registrada.'}</p><div class="result-grid"><div><span>Pontos</span><strong>${round.score}</strong></div><div><span>Maçãs</span><strong>${round.fruits}</strong></div><div><span>XP</span><strong>+${round.xpGained}</strong></div></div><div class="button-stack">${button('Jogar novamente', 'restart', 'primary')}${button('Recordes locais', 'records')}${button('Menu principal', 'home', 'ghost')}</div>`); bindActions({ restart: () => startGame(), records: showRecords, home: showHome });
}
function gameLoop(now) {
  if (!round || !renderer) return;
  const delta = Math.min(80, now - lastFrame); lastFrame = now;
  if (round.status === 'running') {
    if (advanceTimer(round, delta)) completeRound();
    accumulator += delta; let safety = 0;
    while (round.status === 'running' && accumulator >= tickMs(round) && safety < 4) {
      accumulator -= tickMs(round); safety += 1; const event = advanceRound(round);
      if (event.type === 'eat') { audio.eat(); audio.vibrate(20); }
      if (event.type === 'gameOver' || event.type === 'won') completeRound();
    }
    if (safety === 4) accumulator = 0;
  }
  renderer.render(round, round.status === 'running' ? accumulator / tickMs(round) : 1, now); updateHud(); rafId = requestAnimationFrame(gameLoop);
}

window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; showToast('Vale Snake foi instalado. Boa aventura!'); });
window.addEventListener('blur', () => { if (round?.status === 'running') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && round?.status === 'running') togglePause(); });
window.addEventListener('keydown', (event) => { if ((event.code === 'Space' || event.key === 'Escape') && round && !event.repeat) { event.preventDefault(); togglePause(); } });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

setTimeout(showHome, 800);
