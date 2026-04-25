const canvas = document.getElementById('sn-canvas');
const ctx    = canvas.getContext('2d');

// ── Grid config ───────────────────────────────────────
const COLS = 25, ROWS = 20;
let CELL;  // computed from canvas size

function resize() {
  const maxW = Math.min(canvas.parentElement.clientWidth, 680);
  CELL = Math.floor(maxW / COLS);
  canvas.width  = CELL * COLS;
  canvas.height = CELL * ROWS;
}
resize();
window.addEventListener('resize', () => { resize(); if (!running) draw(); });

// ── State ─────────────────────────────────────────────
const SPEEDS = { slow: 180, normal: 120, fast: 72 };
let speedKey = 'normal';
let snake=[], dir={x:1,y:0}, nextDir={x:1,y:0};
let food={}, special=null, specialTimer=0;
let score=0, hiScore=0, running=false, gameOver=false;
let frameInt=null, frameCount=0;
let particles=[];

// ── New game ──────────────────────────────────────────
function newGame() {
  clearInterval(frameInt);
  snake = [
    { x:12, y:10 }, { x:11, y:10 }, { x:10, y:10 },
  ];
  dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
  score=0; gameOver=false; running=true; particles=[];
  special=null; specialTimer=0;
  document.getElementById('sn-score').textContent = 0;
  placeFood();
  document.getElementById('sn-overlay').classList.add('hidden');
  frameInt = setInterval(step, SPEEDS[speedKey]);
}

function placeFood() {
  do {
    food = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
  } while (snake.some(s => s.x===food.x && s.y===food.y));
}

function placeSpecial() {
  do {
    special = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS), pts: 50 };
  } while (snake.some(s => s.x===special.x && s.y===special.y) || (food.x===special.x && food.y===special.y));
  specialTimer = 60; // disappears after 60 ticks
}

// ── Game step ─────────────────────────────────────────
function step() {
  if (!running || gameOver) return;
  frameCount++;

  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall wrap (toroidal)
  head.x = (head.x + COLS) % COLS;
  head.y = (head.y + ROWS) % ROWS;

  // Self collision
  if (snake.some(s => s.x===head.x && s.y===head.y)) {
    endGame(); return;
  }

  snake.unshift(head);

  // Food
  let grew = false;
  if (head.x===food.x && head.y===food.y) {
    score += 10;
    grew = true;
    spawnParticles(food.x, food.y, '#00ff88');
    placeFood();
    if (score % 50 === 0 && !special) placeSpecial();
    document.getElementById('sn-score').textContent = score;
    if (score > hiScore) { hiScore=score; document.getElementById('sn-hi').textContent=hiScore; }
  }

  // Special food
  if (special) {
    specialTimer--;
    if (head.x===special.x && head.y===special.y) {
      score += special.pts;
      grew = true;
      spawnParticles(special.x, special.y, '#ffe600');
      special = null;
      document.getElementById('sn-score').textContent = score;
      if (score > hiScore) { hiScore=score; document.getElementById('sn-hi').textContent=hiScore; }
    } else if (specialTimer <= 0) {
      special = null;
    }
  }

  if (!grew) snake.pop();

  // Speed up every 50 points
  const baseSpeed = SPEEDS[speedKey];
  const newSpeed  = Math.max(40, baseSpeed - Math.floor(score/50)*10);
  clearInterval(frameInt);
  frameInt = setInterval(step, newSpeed);

  // Particles
  for (const p of particles) { p.x+=p.dx; p.y+=p.dy; p.life--; }
  particles = particles.filter(p=>p.life>0);

  draw();
}

function spawnParticles(gx, gy, color) {
  const cx = gx*CELL + CELL/2, cy = gy*CELL + CELL/2;
  for (let i=0;i<10;i++) {
    const a=Math.random()*Math.PI*2, s=Math.random()*2.5+.5;
    particles.push({ x:cx, y:cy, dx:Math.cos(a)*s, dy:Math.sin(a)*s, life:18+Math.random()*10, color });
  }
}

function endGame() {
  running=false; gameOver=true;
  clearInterval(frameInt);
  const ov = document.getElementById('sn-overlay');
  ov.classList.remove('hidden');
  document.getElementById('sn-ov-title').textContent='GAME OVER';
  document.getElementById('sn-ov-title').style.color='var(--red)';
  document.getElementById('sn-ov-title').style.textShadow='var(--glow-red)';
  document.getElementById('sn-ov-score').style.display='block';
  document.getElementById('sn-ov-score').textContent=`SCORE: ${score}`;
  document.getElementById('sn-ov-sub').textContent=`LENGTH: ${snake.length}`;
  document.getElementById('sn-start-btn').textContent='▶ PLAY AGAIN';
}

// ── Draw ──────────────────────────────────────────────
function draw() {
  ctx.fillStyle='#01010a';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Grid dots
  ctx.fillStyle='rgba(255,255,255,.025)';
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    ctx.beginPath();
    ctx.arc(c*CELL+CELL/2, r*CELL+CELL/2, .8, 0, Math.PI*2);
    ctx.fill();
  }

  // Snake
  for (let i=0;i<snake.length;i++) {
    const { x, y } = snake[i];
    const t = i / snake.length;
    const isHead = i===0;
    const pad = isHead ? 1 : 2;

    // Body gradient: cyan head → green → dark tail
    const r1 = isHead ? 0 : Math.round(t * 0);
    const g1 = isHead ? 245 : Math.round(255 - t*100);
    const b1 = isHead ? 255 : Math.round((1-t)*88);
    ctx.fillStyle = `rgb(${r1},${g1},${b1})`;

    if (isHead) {
      ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 12;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.roundRect(x*CELL+pad, y*CELL+pad, CELL-pad*2, CELL-pad*2, isHead?4:3);
    ctx.fill();
    ctx.shadowBlur=0;

    // Eyes on head
    if (isHead) {
      ctx.fillStyle='#001a00';
      const ex1 = x*CELL + CELL/2 + dir.y*3  - dir.x*4;
      const ey1 = y*CELL + CELL/2 - dir.x*3  - dir.y*4;
      const ex2 = x*CELL + CELL/2 - dir.y*3  - dir.x*4;
      const ey2 = y*CELL + CELL/2 + dir.x*3  - dir.y*4;
      ctx.beginPath(); ctx.arc(ex1,ey1,1.8,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2,ey2,1.8,0,Math.PI*2); ctx.fill();
    }
  }

  // Food
  const fc = food.x*CELL+CELL/2, fr = food.y*CELL+CELL/2;
  const pulse = .7+.3*Math.sin(Date.now()/300);
  ctx.shadowColor='#00ff88'; ctx.shadowBlur=10*pulse;
  ctx.beginPath(); ctx.arc(fc,fr,CELL/2*.72*pulse,0,Math.PI*2);
  ctx.fillStyle='#00ff88'; ctx.fill();
  ctx.shadowBlur=0;

  // Special food
  if (special) {
    const sx=special.x*CELL+CELL/2, sy=special.y*CELL+CELL/2;
    const sp=.7+.3*Math.sin(Date.now()/180);
    ctx.shadowColor='#ffe600'; ctx.shadowBlur=14*sp;
    ctx.beginPath(); ctx.arc(sx,sy,CELL/2*.8*sp,0,Math.PI*2);
    ctx.fillStyle='#ffe600'; ctx.fill();
    ctx.font=`${CELL*.5}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⭐',sx,sy);
    ctx.shadowBlur=0;
    // timer ring
    ctx.beginPath();
    ctx.arc(sx,sy,CELL/2*.9,0,(specialTimer/60)*Math.PI*2);
    ctx.strokeStyle='rgba(255,230,0,.4)'; ctx.lineWidth=2; ctx.stroke();
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha=p.life/28;
    ctx.beginPath(); ctx.arc(p.x,p.y,2.5,0,Math.PI*2);
    ctx.fillStyle=p.color; ctx.fill();
  }
  ctx.globalAlpha=1;

  // Score overlay while playing
  if (running) {
    ctx.font=`8px 'Press Start 2P',monospace`;
    ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillStyle='rgba(0,255,136,.3)';
    ctx.fillText(`SCORE ${score}`, canvas.width-8, 8);
  }
}

// ── Controls ──────────────────────────────────────────
const dirMap = {
  ArrowUp:    {x:0,y:-1}, w:{x:0,y:-1},
  ArrowDown:  {x:0,y:1},  s:{x:0,y:1},
  ArrowLeft:  {x:-1,y:0}, a:{x:-1,y:0},
  ArrowRight: {x:1,y:0},  d:{x:1,y:0},
};

document.addEventListener('keydown', e => {
  const d = dirMap[e.key] || dirMap[e.key.toLowerCase()];
  if (d) {
    e.preventDefault();
    // Prevent reversing
    if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
  }
});

function dpad(dirStr) {
  const d = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} }[dirStr];
  if (d && (d.x !== -dir.x || d.y !== -dir.y)) nextDir = d;
}
window.dpad = dpad;

function setSpeed(key, btn) {
  speedKey = key;
  document.querySelectorAll('.sn-speed-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
window.setSpeed = setSpeed;
window.newGame  = newGame;

// Initial draw
draw();