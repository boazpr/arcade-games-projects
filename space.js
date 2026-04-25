const canvas = document.getElementById('sw-canvas');
const ctx    = canvas.getContext('2d');

function resize() {
  const wrap = canvas.parentElement;
  const w = Math.min(wrap.clientWidth || 480, 720);
  canvas.width  = w;
  canvas.height = Math.round(w * 0.62);
}

window.addEventListener('load', () => { resize(); drawIdle(); });
window.addEventListener('resize', () => { resize(); if (!running) drawIdle(); });

// ── State ─────────────────────────────────────────────
let running = false, paused = false, wavePending = false;
let score = 0, hiScore = 0, lives = 3, wave = 0, gameOver = false;
let shootCD = 0, animId = null;
const keys = { left: false, right: false, fire: false };

let stars=[], player={}, bullets=[], eBullets=[], enemies=[];
let particles=[], explosions=[], powerups=[];

function initStars() {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + .3,
    sp: Math.random() * .5 + .15,
    b: Math.random() * .6 + .4,
  }));
}

function drawIdle() {
  if (!stars.length) initStars();
  ctx.fillStyle = '#01010a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    ctx.globalAlpha = s.b;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function spawnWave() {
  wavePending = false;
  wave++;
  document.getElementById('sw-wave').textContent = wave;
  enemies = []; eBullets = [];
  const rows = Math.min(1 + Math.floor(wave / 3), 3);
  const cols = Math.min(4 + Math.floor(wave / 4), 8);
  const sp = canvas.width / (cols + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = ['A','B','C'][Math.min(r, 2)];
      const spd  = (0.5 + wave * 0.06) * (Math.random() > .5 ? 1 : -1);
      enemies.push({
        x: sp*(c+1), y: 38+r*46, w:28, h:20, type,
        hp: type==='C'?3:type==='B'?2:1,
        maxHp: type==='C'?3:type==='B'?2:1,
        dx: spd, shootT: Math.random()*180+120,
        zigzag: type==='C', ang: Math.random()*Math.PI*2,
        color: type==='A'?'#ff00aa':type==='B'?'#ffe600':'#00f5ff',
        pts:   type==='A'?10:type==='B'?20:50,
      });
    }
  }
  if (wave % 3 === 0) powerups.push({ x: Math.random()*(canvas.width-40)+20, y:-24, vy:1.3 });
}

function resetGame() {
  resize();
  score=0; lives=5; wave=0; gameOver=false; wavePending=false;
  bullets=[]; eBullets=[]; enemies=[]; particles=[]; explosions=[]; powerups=[];
  player = { x: canvas.width/2, y: canvas.height-52, w:36, h:24, spd:6, inv:0 };
  shootCD = 0;
  initStars();
  spawnWave();
  updateHUD();
}

function startGame() {
  document.getElementById('sw-overlay').classList.add('hidden');
  resetGame();
  running = true; paused = false;
  if (animId) cancelAnimationFrame(animId);
  loop();
}

function loop() {
  if (!running) { animId = null; return; }
  if (!paused) update();
  draw();
  animId = requestAnimationFrame(loop);
}

function shoot() {
  if (!running || paused || gameOver || shootCD > 0) return;
  bullets.push({ x:player.x, y:player.y-player.h/2, dy:-10, w:3, h:13 });
  shootCD = 7;
}

function update() {
  if (keys.left)  player.x = Math.max(player.w/2, player.x - player.spd);
  if (keys.right) player.x = Math.min(canvas.width - player.w/2, player.x + player.spd);
  if (keys.fire)  shoot();
  if (shootCD > 0) shootCD--;
  if (player.inv > 0) player.inv--;

  for (const s of stars) { s.y += s.sp; if (s.y > canvas.height) { s.y=0; s.x=Math.random()*canvas.width; } }

  bullets  = bullets.filter(b  => { b.y += b.dy; return b.y > -20; });
  eBullets = eBullets.filter(b => { b.x+=b.dx||0; b.y+=b.dy; return b.y<canvas.height+20&&b.x>-20&&b.x<canvas.width+20; });

  let flip = false;
  for (const e of enemies) {
    e.x += e.dx;
    if (e.zigzag) { e.ang+=.055; e.y+=Math.sin(e.ang)*.7; }
    if (e.x > canvas.width-e.w/2 || e.x < e.w/2) flip = true;
    if (--e.shootT <= 0) {
      const spd = 0.9 + wave*0.04;
      const ang = Math.atan2(player.y-e.y, player.x-e.x);
      eBullets.push({ x:e.x, y:e.y+e.h/2, dx:Math.cos(ang)*spd, dy:Math.abs(Math.sin(ang)*spd)+1.2, w:4, h:4, color:e.color });
      e.shootT = Math.max(90, 220-wave*8) + Math.random()*60;
    }
  }
  if (flip) for (const e of enemies) { e.dx*=-1; e.y+=8; }

  powerups = powerups.filter(p => { p.y+=p.vy; return p.y<canvas.height+30; });

  outer:
  for (let bi=bullets.length-1; bi>=0; bi--) {
    const b = bullets[bi];
    for (let ei=enemies.length-1; ei>=0; ei--) {
      const e = enemies[ei];
      if (Math.abs(b.x-e.x)<e.w/2+b.w && Math.abs(b.y-e.y)<e.h/2+b.h) {
        bullets.splice(bi,1); e.hp--;
        spawnParticles(e.x,e.y,e.color,5);
        if (e.hp<=0) {
          score+=e.pts; boom(e.x,e.y,e.color); enemies.splice(ei,1);
          document.getElementById('sw-score').textContent=score;
          if(score>hiScore){hiScore=score;document.getElementById('sw-hi').textContent=hiScore;}
        }
        continue outer;
      }
    }
  }

  if (player.inv<=0) {
    for (let bi=eBullets.length-1; bi>=0; bi--) {
      const b=eBullets[bi];
      if (Math.abs(b.x-player.x)<player.w/2+3 && Math.abs(b.y-player.y)<player.h/2+3) {
        eBullets.splice(bi,1); boom(player.x,player.y,'#ff3355');
        lives--; player.inv=160; updateHUD();
        if (lives<=0) { endGame(); return; }
      }
    }
  }

  for (const e of enemies) if (e.y>canvas.height-55) { endGame(); return; }

  for (let i=powerups.length-1; i>=0; i--) {
    const p=powerups[i];
    if (Math.abs(p.x-player.x)<30 && Math.abs(p.y-player.y)<30) {
      powerups.splice(i,1); lives=Math.min(lives+1,5); updateHUD(); spawnParticles(p.x,p.y,'#00ff88',14);
    }
  }

  for (const p of particles) { p.x+=p.dx; p.y+=p.dy; p.life--; }
  particles  = particles.filter(p=>p.life>0);
  for (const ex of explosions) { ex.r+=2.8; ex.a-=.07; }
  explosions = explosions.filter(ex=>ex.a>0);

  if (enemies.length===0 && !gameOver && !wavePending) { wavePending=true; setTimeout(spawnWave, 900); }
}

function spawnParticles(x,y,color,n) {
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*3+1;particles.push({x,y,dx:Math.cos(a)*s,dy:Math.sin(a)*s,life:20+Math.random()*10,color,r:Math.random()*2+1});}
}
function boom(x,y,color){explosions.push({x,y,r:0,a:1,color});spawnParticles(x,y,color,14);}

function updateHUD() {
  document.getElementById('sw-score').textContent=score;
  document.getElementById('sw-lives').textContent='❤️'.repeat(Math.max(0,lives));
  document.getElementById('sw-wave').textContent=wave;
}

function endGame() {
  running=false; gameOver=true;
  if(animId){cancelAnimationFrame(animId);animId=null;}
  const ov=document.getElementById('sw-overlay'); ov.classList.remove('hidden');
  const t=document.getElementById('sw-ov-title');
  t.textContent='GAME OVER'; t.style.color='var(--red)'; t.style.textShadow='0 0 30px var(--red)';
  const fs=document.getElementById('sw-ov-score'); fs.style.display='block'; fs.textContent=`SCORE: ${score}`;
  document.getElementById('sw-ov-sub').textContent=`WAVE ${wave} REACHED`;
  document.getElementById('sw-start-btn').textContent='▶ PLAY AGAIN';
}

function drawPlayer() {
  const{x,y,w,h,inv}=player;
  if(inv>0&&Math.floor(inv/5)%2===0)return;
  ctx.save();ctx.translate(x,y);
  ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w/2,h/2);ctx.lineTo(w/4,h/3);ctx.lineTo(-w/4,h/3);ctx.lineTo(-w/2,h/2);ctx.closePath();
  const g=ctx.createLinearGradient(0,-h/2,0,h/2);g.addColorStop(0,'#00f5ff');g.addColorStop(1,'#0044aa');
  ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#00f5ff';ctx.lineWidth=1.5;ctx.stroke();
  const tf=Math.random()*.4+.6;
  ctx.beginPath();ctx.moveTo(-5,h/3);ctx.lineTo(5,h/3);ctx.lineTo(0,h/2+11*tf);ctx.closePath();
  ctx.fillStyle=`rgba(255,170,0,${tf*.85})`;ctx.fill();ctx.restore();
}

function drawEnemy(e) {
  ctx.save();ctx.translate(e.x,e.y);
  if(e.type==='A'){
    ctx.beginPath();ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2);
    const g=ctx.createRadialGradient(0,0,2,0,0,e.w/2);g.addColorStop(0,'#ff66cc');g.addColorStop(1,'#990055');
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.arc(0,-3,5,0,Math.PI*2);ctx.fillStyle='#ffbbee';ctx.fill();
  }else if(e.type==='B'){
    ctx.beginPath();ctx.moveTo(0,-e.h/2);ctx.lineTo(e.w/2,e.h/2);ctx.lineTo(0,e.h/4);ctx.lineTo(-e.w/2,e.h/2);ctx.closePath();
    const g=ctx.createLinearGradient(0,-e.h/2,0,e.h/2);g.addColorStop(0,'#ffee00');g.addColorStop(1,'#886600');
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=1.5;ctx.stroke();
  }else{
    ctx.beginPath();ctx.moveTo(0,-e.h/2);ctx.lineTo(e.w/3,-e.h/4);ctx.lineTo(e.w/2,e.h/2);ctx.lineTo(-e.w/2,e.h/2);ctx.lineTo(-e.w/3,-e.h/4);ctx.closePath();
    const g=ctx.createLinearGradient(0,-e.h/2,0,e.h/2);g.addColorStop(0,'#88ffff');g.addColorStop(1,'#005566');
    ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#00000055';ctx.fillRect(-e.w/2,e.h/2+3,e.w,4);
    ctx.fillStyle=e.color;ctx.fillRect(-e.w/2,e.h/2+3,(e.hp/e.maxHp)*e.w,4);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#01010a';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const s of stars){ctx.globalAlpha=s.b;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}
  ctx.globalAlpha=1;
  for(const p of powerups){ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.fillStyle='rgba(0,255,136,.18)';ctx.fill();ctx.strokeStyle='#00ff88';ctx.lineWidth=2;ctx.stroke();ctx.font='15px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('❤️',p.x,p.y);}
  for(const e of enemies)drawEnemy(e);
  drawPlayer();
  for(const b of bullets){ctx.shadowColor='#00f5ff';ctx.shadowBlur=7;const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);g.addColorStop(0,'#fff');g.addColorStop(1,'#00f5ff');ctx.fillStyle=g;ctx.fillRect(b.x-b.w/2,b.y,b.w,b.h);ctx.shadowBlur=0;}
  for(const b of eBullets){ctx.shadowColor=b.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(b.x,b.y,b.w/2,0,Math.PI*2);ctx.fillStyle=b.color;ctx.fill();ctx.shadowBlur=0;}
  for(const p of particles){ctx.globalAlpha=p.life/30;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();}
  ctx.globalAlpha=1;
  for(const ex of explosions){ctx.globalAlpha=ex.a*.6;ctx.beginPath();ctx.arc(ex.x,ex.y,ex.r,0,Math.PI*2);ctx.strokeStyle=ex.color;ctx.lineWidth=2;ctx.stroke();}
  ctx.globalAlpha=1;
  if(enemies.length===0&&!gameOver){ctx.font="bold 16px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(0,245,255,.75)';ctx.fillText('WAVE CLEARED!',canvas.width/2,canvas.height/2);}
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;
  if(e.key==='ArrowRight'||e.key==='d')keys.right=true;
  if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();keys.fire=true;shoot();}
});
document.addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;
  if(e.key==='ArrowRight'||e.key==='d')keys.right=false;
  if(e.key===' '||e.key==='ArrowUp')keys.fire=false;
});

function mobHold(dir,on){keys[dir]=on;}
window.mobHold=mobHold;
window.shoot=shoot;
window.startGame=startGame;