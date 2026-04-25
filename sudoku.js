// ── State ─────────────────────────────────────────────
let puzzle = [], solution = [], current = [], given = [];
let notes  = [], selected = -1, errors = 0, diff = 'easy';
let notesOn = true;
let timerSec = 0, timerInterval = null, timerStarted = false, gameOver = false;

// ── Sudoku generator ──────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(b, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === n || b[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++)
      if (b[br + dr][bc + dc] === n) return false;
  return true;
}

function fill(b) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        for (const n of shuffle([1,2,3,4,5,6,7,8,9])) {
          if (isValid(b, r, c, n)) {
            b[r][c] = n;
            if (fill(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generate(d) {
  const sol = Array.from({ length: 9 }, () => Array(9).fill(0));
  fill(sol);
  const remove = { easy: 35, medium: 46, hard: 55 }[d];
  const puz = sol.map(r => [...r]);
  let n = 0;
  while (n < remove) {
    const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
    if (puz[r][c] !== 0) { puz[r][c] = 0; n++; }
  }
  return { sol, puz };
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  if (timerStarted || gameOver) return;
  timerStarted = true;
  document.getElementById('sdk-timer').classList.add('running');
  timerInterval = setInterval(() => {
    if (!gameOver) { timerSec++; renderTimer(); }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById('sdk-timer').classList.remove('running');
}

function renderTimer() {
  const m = String(Math.floor(timerSec / 60)).padStart(2, '0');
  const s = String(timerSec % 60).padStart(2, '0');
  document.getElementById('sdk-timer').textContent = `${m}:${s}`;
}

// ── New game ──────────────────────────────────────────
function newGame() {
  stopTimer();
  timerSec = 0; timerStarted = false; gameOver = false;
  errors = 0; selected = -1;
  document.getElementById('sdk-errors').textContent = '0';
  document.getElementById('sdk-status').textContent  = '\u00a0';
  document.getElementById('sdk-timer').textContent   = '00:00';
  document.getElementById('sdk-timer').classList.remove('running', 'stopped');

  const { sol, puz } = generate(diff);
  solution = sol.flat();
  puzzle   = puz.flat();
  current  = [...puzzle];
  given    = puzzle.map(v => v !== 0);
  notes    = Array.from({ length: 81 }, () => new Set());

  renderGrid();
  updateRemaining();
}

// ── Grid render ───────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('sdk-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'sdk-cell';
    cell.dataset.i = i;

    if (given[i]) {
      cell.classList.add('given');
      cell.textContent = current[i];
    } else if (current[i] !== 0) {
      cell.textContent = current[i];
      if (current[i] !== solution[i]) cell.classList.add('error');
    } else if (notes[i].size > 0) {
      renderNotesCell(cell, i);
    }

    if (i === selected) cell.classList.add('selected');
    cell.addEventListener('click', () => selectCell(i));
    grid.appendChild(cell);
  }
  highlightRelated();
}

function renderNotesCell(cell, i) {
  cell.classList.add('notes-mode');
  cell.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const d = document.createElement('div');
    d.className = 'note-d';
    d.textContent = notes[i].has(n) ? n : '';
    cell.appendChild(d);
  }
}

function highlightRelated() {
  if (selected < 0) return;
  const sr = Math.floor(selected / 9), sc = selected % 9;
  document.querySelectorAll('.sdk-cell').forEach((cell, i) => {
    const r = Math.floor(i / 9), c = i % 9;
    const sameBox = Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3);
    if ((r === sr || c === sc || sameBox) && i !== selected)
      cell.classList.add('hl');
  });
}

// ── Interaction ───────────────────────────────────────
function selectCell(i) {
  if (gameOver) return;
  selected = i;
  startTimer(); // timer starts on first click
  renderGrid();
}

function inputNum(n) {
  if (selected < 0 || given[selected] || gameOver) return;
  startTimer();

  if (n === 0) {
    current[selected] = 0;
    notes[selected].clear();
    renderGrid(); updateRemaining(); return;
  }

  if (notesOn && current[selected] === 0) {
    if (notes[selected].has(n)) notes[selected].delete(n);
    else notes[selected].add(n);
    renderGrid(); return;
  }

  notes[selected].clear();
  current[selected] = n;
  renderGrid(); updateRemaining();

  if (n === solution[selected]) {
    // clear this number from related notes
    const sr = Math.floor(selected/9), sc = selected%9;
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i/9), c = i%9;
      if (r===sr || c===sc || (Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(c/3)===Math.floor(sc/3)))
        notes[i].delete(n);
    }
    const cell = document.querySelector(`[data-i="${selected}"]`);
    if (cell) { cell.classList.add('flash'); setTimeout(()=>cell.classList.remove('flash'),450); }
    checkWin();
  } else {
    errors++;
    document.getElementById('sdk-errors').textContent = errors;
    if (errors >= 3) {
      document.getElementById('sdk-status').textContent = '💀 GAME OVER — 3 ERRORS!';
      document.getElementById('sdk-status').style.color = 'var(--red)';
      document.getElementById('sdk-status').style.textShadow = 'var(--glow-red)';
      gameOver = true;
      stopTimer();
      document.getElementById('sdk-timer').classList.add('stopped');
    }
  }
}

function updateRemaining() {
  const filled = current.filter((v, i) => v !== 0 && !given[i]).length;
  const total  = given.filter(v => !v).length;
  document.getElementById('sdk-remaining').textContent = total - filled;
}

function checkWin() {
  if (current.every((v, i) => v === solution[i])) {
    gameOver = true;
    stopTimer();
    const m = String(Math.floor(timerSec/60)).padStart(2,'0');
    const s = String(timerSec%60).padStart(2,'0');
    document.getElementById('sdk-status').textContent = `🎉 SOLVED IN ${m}:${s}!`;
    document.getElementById('sdk-status').style.color = 'var(--green)';
    document.getElementById('sdk-status').style.textShadow = 'var(--glow-green)';
  }
}

function checkBoard() {
  let has = false;
  document.querySelectorAll('.sdk-cell').forEach((cell, i) => {
    if (!given[i] && current[i]!==0 && current[i]!==solution[i]) {
      cell.style.background = '#1a0010'; has = true;
    }
  });
  const st = document.getElementById('sdk-status');
  st.textContent = has ? '⚠ ERRORS HIGHLIGHTED' : '✓ LOOKING GOOD!';
  st.style.color = has ? 'var(--red)' : 'var(--green)';
  st.style.textShadow = has ? 'var(--glow-red)' : 'var(--glow-green)';
  setTimeout(() => { st.textContent = '\u00a0'; }, 2500);
}

function getHint() {
  if (gameOver) return;
  startTimer();
  const empties = [];
  for (let i = 0; i < 81; i++) if (!given[i] && current[i]===0) empties.push(i);
  if (!empties.length) return;
  const idx = empties[Math.floor(Math.random() * empties.length)];
  selected = idx;
  current[idx] = solution[idx];
  notes[idx].clear();
  renderGrid(); updateRemaining(); checkWin();
}

function toggleNotes() {
  notesOn = !notesOn;
  const box = document.getElementById('notes-box');
  box.classList.toggle('on', notesOn);
  box.textContent = notesOn ? '✓' : '';
}

function setDiff(d, btn) {
  diff = d;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') inputNum(parseInt(e.key));
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputNum(0);
  else if (e.key === 'ArrowRight' && selected >= 0) selectCell(Math.min(80, selected + 1));
  else if (e.key === 'ArrowLeft'  && selected >= 0) selectCell(Math.max(0, selected - 1));
  else if (e.key === 'ArrowDown'  && selected >= 0) selectCell(Math.min(80, selected + 9));
  else if (e.key === 'ArrowUp'    && selected >= 0) selectCell(Math.max(0, selected - 9));
  else if (e.key.toLowerCase() === 'n') toggleNotes();
});

// Init
newGame();