import { DIR } from '../game/engine.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const hash = (x, y, seed = 0) => {
  let value = Math.imul(x + 37, 92821) ^ Math.imul(y + 11, 68917) ^ seed;
  value = (value ^ (value >>> 13)) * 1274126177;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

export class TempleRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1; this.width = 0; this.height = 0; this.layout = null; this.staticLayer = null;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (Math.round(rect.width * dpr) === this.canvas.width && Math.round(rect.height * dpr) === this.canvas.height) return;
    this.dpr = dpr; this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildStaticLayer();
  }
  computeLayout(cols, rows) {
    const edge = Math.max(10, Math.min(this.width, this.height) * .035);
    const cell = Math.max(6, Math.min((this.width - edge * 2) / cols, (this.height - edge * 2) / rows));
    const boardW = cell * cols, boardH = cell * rows;
    return { cols, rows, cell, boardW, boardH, x: (this.width - boardW) / 2, y: (this.height - boardH) / 2 };
  }
  buildStaticLayer(cols = 13, rows = 19) {
    if (!this.width || !this.height) return;
    this.layout = this.computeLayout(cols, rows);
    const layer = document.createElement('canvas'); layer.width = this.canvas.width; layer.height = this.canvas.height;
    const ctx = layer.getContext('2d'); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawTempleBase(ctx, this.layout);
    this.staticLayer = layer;
  }
  toPx(cell) { return { x: this.layout.x + (cell.x + .5) * this.layout.cell, y: this.layout.y + (cell.y + .5) * this.layout.cell }; }
  drawTempleBase(ctx, l) {
    const { x, y, boardW: w, boardH: h, cell } = l;
    const background = ctx.createLinearGradient(0, 0, 0, this.height); background.addColorStop(0, '#123947'); background.addColorStop(.6, '#092633'); background.addColorStop(1, '#061922'); ctx.fillStyle = background; ctx.fillRect(0, 0, this.width, this.height);
    // Water around the ruined floor
    const water = ctx.createLinearGradient(0, 0, 0, this.height); water.addColorStop(0, '#075b75'); water.addColorStop(.5, '#0a9ab3'); water.addColorStop(1, '#034a65'); ctx.fillStyle = water; ctx.fillRect(0, 0, this.width, this.height);
    for (let i = 0; i < 22; i += 1) { const rx = hash(i, 4) * this.width, ry = hash(i, 9) * this.height; ctx.strokeStyle = 'rgba(122,239,249,.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(rx, ry, 4 + hash(i, 8) * 12, .3, Math.PI * 1.8); ctx.stroke(); }
    // Raised slab base and floor
    ctx.save(); ctx.shadowColor = '#000b'; ctx.shadowBlur = cell * .55; ctx.shadowOffsetY = cell * .25; ctx.fillStyle = '#122b31'; ctx.roundRect(x - cell * .28, y - cell * .28, w + cell * .56, h + cell * .56, cell * .28); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, cell * .13); ctx.clip();
    const floor = ctx.createLinearGradient(x, y, x + w, y + h); floor.addColorStop(0, '#566763'); floor.addColorStop(.46, '#31454a'); floor.addColorStop(1, '#1d323b'); ctx.fillStyle = floor; ctx.fillRect(x, y, w, h);
    for (let row = 0; row < l.rows; row += 1) for (let col = 0; col < l.cols; col += 1) this.drawStoneTile(ctx, x + col * cell, y + row * cell, cell, col, row);
    ctx.restore();
    // Destroyed wall framing
    this.drawRuins(ctx, l);
    this.drawPlants(ctx, l);
  }
  drawStoneTile(ctx, x, y, size, col, row) {
    const noise = hash(col, row); const inset = Math.max(.65, size * .035);
    const tone = noise > .66 ? '#53625d' : noise > .33 ? '#43554f' : '#344a4b';
    ctx.fillStyle = tone; ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    ctx.strokeStyle = '#172d31aa'; ctx.lineWidth = Math.max(.5, size * .025); ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    if (noise > .48) { ctx.strokeStyle = '#1b3436aa'; ctx.lineWidth = Math.max(.45, size * .025); ctx.beginPath(); ctx.moveTo(x + size * .25, y + size * .2); ctx.lineTo(x + size * .55, y + size * .52); ctx.lineTo(x + size * .43, y + size * .77); ctx.stroke(); }
    if (hash(col, row, 55) > .77) { ctx.fillStyle = '#4d8854aa'; ctx.beginPath(); ctx.ellipse(x + size * .2, y + size * .8, size * .18, size * .07, -.5, 0, Math.PI * 2); ctx.fill(); }
    if (hash(col, row, 56) > .91) { ctx.strokeStyle = '#71907870'; ctx.lineWidth = Math.max(.45, size * .03); ctx.beginPath(); ctx.moveTo(x + size * .3, y + size * .3); ctx.lineTo(x + size * .65, y + size * .66); ctx.moveTo(x + size * .65, y + size * .3); ctx.lineTo(x + size * .3, y + size * .66); ctx.stroke(); }
  }
  drawRuins(ctx, l) {
    const { x, y, boardW: w, boardH: h, cell } = l; const brick = (bx, by, bw, bh) => { ctx.fillStyle = '#40524e'; ctx.strokeStyle = '#15292d'; ctx.lineWidth = Math.max(1, cell * .05); ctx.roundRect(bx, by, bw, bh, cell * .08); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#70807233'; ctx.fillRect(bx + cell * .09, by + cell * .07, bw - cell * .18, cell * .12); };
    ctx.save(); ctx.shadowColor = '#0009'; ctx.shadowBlur = cell * .2; ctx.shadowOffsetY = cell * .14;
    for (let i = 0; i < 6; i += 1) { brick(x - cell * .46 + i * cell * 2.25, y - cell * .24, cell * 1.8, cell * .33); brick(x - cell * .46 + i * cell * 2.15, y + h - cell * .1, cell * 1.7, cell * .33); }
    for (let i = 0; i < 6; i += 1) { brick(x - cell * .28, y + i * cell * 3.3, cell * .35, cell * 2.55); brick(x + w - cell * .07, y + i * cell * 3.3 + cell * .6, cell * .35, cell * 2.35); }
    ctx.restore();
    // Waterfall left of the temple
    const fallW = Math.max(cell * .55, x - 8); const fallX = Math.max(0, x - fallW + cell * .1); const top = y + cell * 1.2, bottom = Math.min(y + h * .39, this.height - 5);
    const waterfall = ctx.createLinearGradient(fallX, top, fallX + fallW, bottom); waterfall.addColorStop(0, '#b4faff'); waterfall.addColorStop(.28, '#3ed9ef'); waterfall.addColorStop(1, '#087ca2'); ctx.fillStyle = waterfall; ctx.globalAlpha = .86; ctx.beginPath(); ctx.roundRect(fallX, top, fallW, Math.max(12, bottom - top), cell * .22); ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i += 1) { ctx.strokeStyle = 'rgba(235,255,255,.5)'; ctx.lineWidth = Math.max(1, cell * .06); ctx.beginPath(); ctx.moveTo(fallX + fallW * ((i + 1) / 5), top); ctx.bezierCurveTo(fallX + fallW * (i / 4), top + (bottom - top) * .4, fallX + fallW * ((i + 1) / 4), top + (bottom - top) * .72, fallX + fallW * .46, bottom); ctx.stroke(); }
  }
  drawPlants(ctx, l) {
    const { x, y, boardW: w, boardH: h, cell } = l;
    const plant = (px, py, size, hue = 1) => { ctx.save(); ctx.translate(px, py); for (let i = 0; i < 7; i += 1) { const a = i * Math.PI * 2 / 7; ctx.save(); ctx.rotate(a); const g = ctx.createLinearGradient(0, 0, size, 0); g.addColorStop(0, hue ? '#1c733f' : '#2c8b59'); g.addColorStop(1, hue ? '#8ebd49' : '#47b76e'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(size * .35, 0, size * .55, size * .19, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } ctx.fillStyle = '#a1bd54'; ctx.beginPath(); ctx.arc(0, 0, size * .13, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
    const points = [[x - cell*.24,y+cell*.4,cell*.5],[x+w+cell*.18,y+cell*.8,cell*.65],[x-cell*.1,y+h-cell*.25,cell*.72],[x+w-cell*.1,y+h+cell*.1,cell*.8],[x+w*.17,y-cell*.1,cell*.5],[x+w*.8,y+h+cell*.22,cell*.6]];
    points.forEach((point, index) => plant(...point, index % 2));
    ctx.fillStyle = '#e797cc'; for (let i = 0; i < 4; i += 1) { const px = i % 2 ? x - cell * .12 : x + w + cell * .14; const py = y + h * (.21 + i * .19); ctx.beginPath(); ctx.arc(px, py, Math.max(2, cell * .11), 0, Math.PI * 2); ctx.fill(); }
  }
  drawAnimatedDecor(ctx, now) {
    const l = this.layout, { x, y, boardW: w, boardH: h, cell } = l; const t = now / 1000;
    // Lily pads where there is a wider water edge
    const pads = [[x - cell*.7, y + h*.48], [x - cell*.52, y + h*.63], [x + w*.18, y + h + cell*.42]];
    pads.forEach(([px, py], index) => { const r = cell * (.2 + index * .035); ctx.fillStyle = '#3c9e67'; ctx.beginPath(); ctx.arc(px, py, r, .18, Math.PI * 2 - .18); ctx.lineTo(px, py); ctx.fill(); ctx.strokeStyle = '#9bd66066'; ctx.lineWidth = 1; ctx.stroke(); });
    const torches = [[x + cell*.35,y + cell*.38],[x+w-cell*.35,y+cell*.55],[x+cell*.35,y+h-cell*.45],[x+w-cell*.4,y+h-cell*.4]];
    torches.forEach(([px, py], index) => this.drawTorch(ctx, px, py, cell, t + index));
    // Ferns softly swing in the edge
    ctx.save(); ctx.globalAlpha = .55 + Math.sin(t * 2) * .08; ctx.strokeStyle = '#82ba54'; ctx.lineWidth = Math.max(1, cell * .06); for (let i = 0; i < 6; i += 1) { const px = i % 2 ? x + w + cell * .12 : x - cell * .12, py = y + cell * (2 + i * 2.8); ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + (i % 2 ? cell : -cell) * .6, py - cell*.25, px + (i % 2 ? cell : -cell) * .82, py - cell*.72); ctx.stroke(); } ctx.restore();
  }
  drawTorch(ctx, x, y, cell, t) {
    ctx.save(); const glow = ctx.createRadialGradient(x,y,1,x,y,cell*.95); glow.addColorStop(0,'rgba(255,199,66,.34)'); glow.addColorStop(1,'rgba(255,150,0,0)'); ctx.fillStyle=glow; ctx.beginPath();ctx.arc(x,y,cell*.95,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3f3b31'; ctx.fillRect(x-cell*.12,y,cell*.24,cell*.4); ctx.fillStyle='#ffb637'; ctx.beginPath();ctx.ellipse(x,y-cell*(.16+Math.sin(t*7)*.025),cell*.16,cell*.3,0,0,Math.PI*2);ctx.fill(); ctx.fillStyle='#fff19b';ctx.beginPath();ctx.ellipse(x,y-cell*.15,cell*.07,cell*.16,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  drawFood(ctx, food, now) {
    if (!food) return; const { x, y } = this.toPx(food), r = this.layout.cell * .26, pulse = 1 + Math.sin(now / 160) * .07;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse); const glow = ctx.createRadialGradient(0,0,r*.2,0,0,r*1.75); glow.addColorStop(0,'#ffcd6555');glow.addColorStop(1,'#ff3d3d00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.fill();
    const apple = ctx.createRadialGradient(-r*.35,-r*.45,r*.08,0,0,r); apple.addColorStop(0,'#fff0a7');apple.addColorStop(.14,'#ff7061');apple.addColorStop(.67,'#ed2d39');apple.addColorStop(1,'#8f1522');ctx.fillStyle=apple;ctx.beginPath();ctx.arc(0,r*.12,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff9a62';ctx.lineWidth=Math.max(1,this.layout.cell*.035);ctx.stroke();ctx.strokeStyle='#5a3219';ctx.lineWidth=Math.max(1,this.layout.cell*.06);ctx.beginPath();ctx.moveTo(0,-r*.75);ctx.quadraticCurveTo(r*.05,-r*1.1,r*.32,-r*1.13);ctx.stroke();ctx.fillStyle='#8ad04f';ctx.beginPath();ctx.ellipse(r*.3,-r*.92,r*.3,r*.13,-.45,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  drawSnake(ctx, round, alpha, now) {
    const l = this.layout, positions = round.snake.map((segment, index) => { const previous = round.previousSnake[index] || segment; return { x: lerp(previous.x, segment.x, alpha), y: lerp(previous.y, segment.y, alpha) }; });
    const px = positions.map((cell) => this.toPx(cell)); if (!px.length) return; const width = l.cell * .68;
    // Ground shadow
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0, 15, 13, .5)'; ctx.lineWidth = width * 1.13; ctx.shadowColor = '#000c'; ctx.shadowBlur = l.cell*.26; ctx.shadowOffsetY = l.cell*.18; ctx.beginPath();ctx.moveTo(px.at(-1).x,px.at(-1).y);for(let i=px.length-2;i>=0;i-=1)ctx.lineTo(px[i].x,px[i].y);ctx.stroke();ctx.restore();
    // Body silhouette and filling
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#075c3d';ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(px.at(-1).x,px.at(-1).y);for(let i=px.length-2;i>=0;i-=1)ctx.lineTo(px[i].x,px[i].y);ctx.stroke();ctx.strokeStyle='#2dc95c';ctx.lineWidth=width*.82;ctx.beginPath();ctx.moveTo(px.at(-1).x,px.at(-1).y);for(let i=px.length-2;i>=0;i-=1)ctx.lineTo(px[i].x,px[i].y);ctx.stroke();ctx.strokeStyle='#b6f35a';ctx.lineWidth=width*.19;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(px.at(-1).x-width*.08,px.at(-1).y-width*.13);for(let i=px.length-2;i>=0;i-=1)ctx.lineTo(px[i].x-width*.08,px[i].y-width*.13);ctx.stroke();ctx.restore();
    // Lime bands and scale marks
    ctx.save();px.slice(1).forEach((point,index)=>{ if(index%2===0){ctx.strokeStyle='#c1ef58';ctx.lineWidth=Math.max(1,l.cell*.1);ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(point.x,point.y,width*.38,0,Math.PI*2);ctx.stroke();} });ctx.restore();
    this.drawHead(ctx, px[0], round.direction, l.cell, now);
  }
  drawHead(ctx, position, direction, cell, now) {
    const angle = DIR[direction].angle, pulse = 1 + Math.sin(now/120)*.012;
    ctx.save();ctx.translate(position.x,position.y);ctx.rotate(angle);ctx.scale(pulse,pulse);ctx.shadowColor='#001d18aa';ctx.shadowBlur=cell*.2;ctx.shadowOffsetY=cell*.12;
    const head = ctx.createRadialGradient(cell*.05,-cell*.23,cell*.06,0,0,cell*.66);head.addColorStop(0,'#dcff76');head.addColorStop(.26,'#5dda51');head.addColorStop(.7,'#16a44d');head.addColorStop(1,'#087543');ctx.fillStyle=head;ctx.beginPath();ctx.ellipse(cell*.1,0,cell*.62,cell*.5,0,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='#07573b';ctx.lineWidth=Math.max(1,cell*.055);ctx.stroke();
    // Cream cheeks and underside
    ctx.fillStyle='#f1df82';ctx.beginPath();ctx.ellipse(cell*.34,cell*.19,cell*.34,cell*.21,-.1,0,Math.PI*2);ctx.fill();
    // Eyes
    [-1,1].forEach(side=>{ctx.fillStyle='#faffdf';ctx.beginPath();ctx.ellipse(cell*.28,side*cell*.25,cell*.2,cell*.18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#734520';ctx.beginPath();ctx.ellipse(cell*.34,side*cell*.24,cell*.088,cell*.108,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#151412';ctx.beginPath();ctx.arc(cell*.355,side*cell*.24,cell*.052,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cell*.378,side*cell*.273,cell*.02,0,Math.PI*2);ctx.fill();});
    // Brows, smile, and tongue
    ctx.strokeStyle='#0a673b';ctx.lineWidth=Math.max(1,cell*.05);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cell*.12,-cell*.43);ctx.lineTo(cell*.38,-cell*.4);ctx.moveTo(cell*.12,cell*.43);ctx.lineTo(cell*.38,cell*.4);ctx.stroke();ctx.strokeStyle='#713525';ctx.lineWidth=Math.max(1,cell*.035);ctx.beginPath();ctx.arc(cell*.41,0,cell*.16,-.7,.7);ctx.stroke();
    if(Math.sin(now/430)>.62){ctx.strokeStyle='#f0584c';ctx.lineWidth=Math.max(1,cell*.045);ctx.beginPath();ctx.moveTo(cell*.6,0);ctx.lineTo(cell*.78,0);ctx.moveTo(cell*.78,0);ctx.lineTo(cell*.86,-cell*.07);ctx.moveTo(cell*.78,0);ctx.lineTo(cell*.86,cell*.07);ctx.stroke();}ctx.restore();
  }
  drawEffects(ctx, effects, now) { effects.forEach((effect) => { const age = (now - effect.createdAt) / 1000; if(age > .5) return; const point = this.toPx(effect), radius = this.layout.cell * (.13 + age*.6);ctx.save();ctx.globalAlpha=1-age*1.7;ctx.strokeStyle='#ffdf67';ctx.lineWidth=Math.max(1,this.layout.cell*.04);for(let i=0;i<7;i+=1){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(point.x+Math.cos(a)*radius*.4,point.y+Math.sin(a)*radius*.4);ctx.lineTo(point.x+Math.cos(a)*radius,point.y+Math.sin(a)*radius);ctx.stroke();}ctx.restore(); }); }
  render(round, alpha = 1, now = performance.now()) {
    if (!round) return; this.resize(); if (!this.layout || this.layout.cols !== round.cols || this.layout.rows !== round.rows) this.buildStaticLayer(round.cols, round.rows);
    const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.drawImage(this.staticLayer,0,0,this.width*this.dpr,this.height*this.dpr,0,0,this.width,this.height);this.drawAnimatedDecor(ctx,now);this.drawFood(ctx,round.food,now);this.drawSnake(ctx,round,alpha,now);this.drawEffects(ctx,round.effects,now);round.effects=round.effects.filter((effect)=>now-effect.createdAt<520);
  }
}
