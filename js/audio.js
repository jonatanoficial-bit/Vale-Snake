export class AudioManager {
  constructor(profile) { this.profile = profile; this.context = null; }
  get enabled() { return Boolean(this.profile.settings.sound); }
  unlock() { if (!this.enabled) return; if (!this.context) this.context = new AudioContext(); if (this.context.state === 'suspended') this.context.resume(); }
  tone(frequency, duration, type = 'sine', volume = .05, delay = 0) {
    if (!this.enabled || !this.context) return;
    const osc = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain).connect(this.context.destination); osc.start(now); osc.stop(now + duration);
  }
  eat() { this.tone(530, .08, 'triangle', .065); this.tone(780, .12, 'sine', .04, .055); }
  fail() { this.tone(145, .22, 'sawtooth', .05); }
  pause() { this.tone(330, .06, 'sine', .035); }
  vibrate(pattern) { if (this.profile.settings.vibration && navigator.vibrate) navigator.vibrate(pattern); }
}
