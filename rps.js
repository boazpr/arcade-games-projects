const rpsEmoji = { rock: '✊', paper: '🖐️', scissors: '✌️' };
const rpsChoices = ['rock', 'paper', 'scissors'];

const rpsState = {
  scores: { player: 0, cpu: 0, draw: 0 },
  winStreak: 0,
  history: [],
};

function updateStreakDisplay() {
  document.getElementById('streak-num').textContent = rpsState.winStreak;
  // flame milestone
  const flame = rpsState.winStreak >= 5 ? ' 🔥' : rpsState.winStreak >= 3 ? ' ⚡' : '';
  document.getElementById('streak-label').textContent = 'WIN STREAK' + flame;
}

function playRPS(choice) {
  const cpu = rpsChoices[Math.floor(Math.random() * 3)];

  const pEl = document.getElementById('player-display');
  const cEl = document.getElementById('cpu-display');
  pEl.classList.remove('shake'); cEl.classList.remove('shake');
  void pEl.offsetWidth;
  pEl.classList.add('shake'); cEl.classList.add('shake');

  setTimeout(() => {
    pEl.textContent = rpsEmoji[choice];
    cEl.textContent = rpsEmoji[cpu];

    let result, cls;

    const playerWins =
      (choice === 'rock'     && cpu === 'scissors') ||
      (choice === 'paper'    && cpu === 'rock')     ||
      (choice === 'scissors' && cpu === 'paper');

    if (choice === cpu) {
      result = 'DRAW!';
      cls = 'draw';
      rpsState.scores.draw++;
      rpsState.winStreak = 0;
    } else if (playerWins) {
      result = 'YOU WIN! 🎉';
      cls = 'win';
      rpsState.scores.player++;
      rpsState.winStreak++;
    } else {
      result = 'YOU LOSE 💀';
      cls = 'lose';
      rpsState.scores.cpu++;
      rpsState.winStreak = 0;
    }

    document.getElementById('rps-result').textContent = result;
    document.getElementById('rps-result').className   = 'rps-result ' + cls;

    document.getElementById('score-player').textContent = rpsState.scores.player;
    document.getElementById('score-cpu').textContent    = rpsState.scores.cpu;
    document.getElementById('score-draw').textContent   = rpsState.scores.draw;

    updateStreakDisplay();

    rpsState.history.unshift({ label: `${rpsEmoji[choice]}vs${rpsEmoji[cpu]}`, cls });
    if (rpsState.history.length > 10) rpsState.history.pop();
    renderHistory();
  }, 280);
}

function renderHistory() {
  const row = document.getElementById('history-row');
  row.innerHTML = rpsState.history.map(h =>
    `<span class="history-chip ${h.cls}">${h.label}</span>`
  ).join('');
}

function resetRPS() {
  rpsState.scores = { player: 0, cpu: 0, draw: 0 };
  rpsState.winStreak = 0;
  rpsState.history = [];

  document.getElementById('score-player').textContent  = 0;
  document.getElementById('score-cpu').textContent     = 0;
  document.getElementById('score-draw').textContent    = 0;
  document.getElementById('player-display').textContent = '❓';
  document.getElementById('cpu-display').textContent    = '❓';
  document.getElementById('rps-result').textContent     = '\u00a0';
  document.getElementById('rps-result').className       = 'rps-result';

  updateStreakDisplay();
  renderHistory();
}