// Ochako's Kitchen - Ingredient Wordle Game
// Discord Activity Client

// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || window.innerWidth <= 600
  || ('ontouchstart' in window && window.innerWidth <= 768);

// Apply mobile class to body immediately
if (isMobile) {
  document.body.classList.add('is-mobile');
}

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

// Game state
let currentGuess = '';
let currentRow = 0;
let gameOver = false;
let playerId = null;
let playerName = 'Guest';
let letterStatuses = {}; // Track keyboard letter colors

// DOM Elements
let grid, keyboard, messageText, messageArea;
let totalScoreEl, gamesWonEl, winRateEl;
let leaderboardList, hintCard, hintText, hintsRemaining;
let dishNameEl, ingredientHintEl, roundNumberEl, guessesRemainingEl;
let modal, modalHeader, modalMessage, modalScore, modalWord;

// Initialize Discord SDK
async function initDiscord() {
  try {
    // Check if running in Discord
    const urlParams = new URLSearchParams(window.location.search);
    const frameId = urlParams.get('frame_id');
    const instanceId = urlParams.get('instance_id');

    if (!frameId && !instanceId) {
      console.log('Not running in Discord, using local mode');
      playerId = 'local_' + Math.random().toString(36).substr(2, 9);
      playerName = 'Local Chef';
      return true;
    }

    // Dynamic import for Discord SDK
    const { DiscordSDK } = await import('https://unpkg.com/@discord/embedded-app-sdk@1.4.0/dist/index.mjs');

    // Get client ID from server
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();

    if (config.clientId === 'local_mode') {
      console.log('Running in local mode (no Discord credentials)');
      playerId = 'local_' + Math.random().toString(36).substr(2, 9);
      playerName = 'Local Chef';
      return true;
    }

    const discordSdk = new DiscordSDK(config.clientId);
    await discordSdk.ready();

    // Authorize with Discord
    const { code } = await discordSdk.commands.authorize({
      client_id: config.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'guilds'],
    });

    // Exchange code for access token
    const tokenResponse = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const { access_token } = await tokenResponse.json();

    // Authenticate with Discord
    const auth = await discordSdk.commands.authenticate({ access_token });

    if (auth) {
      playerId = auth.user.id;
      playerName = auth.user.global_name || auth.user.username;
      console.log(`Authenticated as ${playerName} (${playerId})`);
    }

    return true;
  } catch (error) {
    console.error('Discord initialization error:', error);
    // Fallback to local mode
    playerId = 'local_' + Math.random().toString(36).substr(2, 9);
    playerName = 'Local Chef';
    return true;
  }
}

// Initialize DOM elements
function initElements() {
  grid = document.getElementById('wordle-grid');
  keyboard = document.getElementById('keyboard');
  messageText = document.getElementById('message-text');
  messageArea = document.getElementById('message-area');

  totalScoreEl = document.getElementById('total-score');
  gamesWonEl = document.getElementById('games-won');
  winRateEl = document.getElementById('win-rate');

  leaderboardList = document.getElementById('leaderboard-list');
  hintCard = document.getElementById('hint-card');
  hintText = document.getElementById('hint-text');
  hintsRemaining = document.getElementById('hints-remaining');

  dishNameEl = document.getElementById('dish-name');
  ingredientHintEl = document.getElementById('ingredient-hint');
  roundNumberEl = document.getElementById('round-number');
  guessesRemainingEl = document.getElementById('guesses-remaining');

  modal = document.getElementById('result-modal');
  modalHeader = document.getElementById('modal-header');
  modalMessage = document.getElementById('modal-message');
  modalScore = document.getElementById('modal-score');
  modalWord = document.getElementById('modal-word');

  // Button listeners
  document.getElementById('btn-hint').addEventListener('click', requestHint);
  document.getElementById('btn-submit').addEventListener('click', submitGuess);
  document.getElementById('btn-new-round').addEventListener('click', startNewRound);
}

// Create the wordle grid
function createGrid() {
  grid.innerHTML = '';

  for (let row = 0; row < MAX_GUESSES; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    rowDiv.id = `row-${row}`;

    for (let col = 0; col < WORD_LENGTH; col++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.id = `cell-${row}-${col}`;
      rowDiv.appendChild(cell);
    }

    grid.appendChild(rowDiv);
  }
}

// Create the keyboard
function createKeyboard() {
  keyboard.innerHTML = '';

  KEYBOARD_LAYOUT.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';

    row.forEach(key => {
      const keyBtn = document.createElement('button');
      keyBtn.className = 'key';
      keyBtn.dataset.key = key;

      if (key === 'ENTER' || key === 'BACK') {
        keyBtn.classList.add('wide');
        keyBtn.textContent = key === 'BACK' ? '⌫' : key;
      } else {
        keyBtn.textContent = key;
      }

      keyBtn.addEventListener('click', () => handleKeyPress(key));
      rowDiv.appendChild(keyBtn);
    });

    keyboard.appendChild(rowDiv);
  });
}

// Handle key press
function handleKeyPress(key) {
  if (gameOver) return;

  if (key === 'ENTER') {
    submitGuess();
  } else if (key === 'BACK') {
    deleteLetter();
  } else if (currentGuess.length < WORD_LENGTH) {
    addLetter(key);
  }
}

// Add letter to current guess
function addLetter(letter) {
  if (currentGuess.length < WORD_LENGTH) {
    currentGuess += letter;
    updateGrid();
  }
}

// Delete letter from current guess
function deleteLetter() {
  if (currentGuess.length > 0) {
    currentGuess = currentGuess.slice(0, -1);
    updateGrid();
  }
}

// Update the grid display
function updateGrid() {
  for (let col = 0; col < WORD_LENGTH; col++) {
    const cell = document.getElementById(`cell-${currentRow}-${col}`);
    if (col < currentGuess.length) {
      cell.textContent = currentGuess[col];
      cell.classList.add('filled');
    } else {
      cell.textContent = '';
      cell.classList.remove('filled');
    }
  }

  // Update active cell indicator
  document.querySelectorAll('.grid-cell').forEach(cell => {
    cell.classList.remove('active');
  });

  if (currentGuess.length < WORD_LENGTH && !gameOver) {
    const activeCell = document.getElementById(`cell-${currentRow}-${currentGuess.length}`);
    if (activeCell) activeCell.classList.add('active');
  }
}

// Submit guess to server
async function submitGuess() {
  if (currentGuess.length !== WORD_LENGTH) {
    showMessage('Please enter 5 letters!', 'error');
    shakeRow(currentRow);
    return;
  }

  try {
    const response = await fetch('/api/wordle/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        playerName,
        guess: currentGuess
      })
    });

    const data = await response.json();

    if (!data.success) {
      showMessage(data.message, 'error');
      if (data.gameOver) {
        gameOver = true;
        showModal(false, data.message, 0, data.targetWord);
      }
      return;
    }

    // Animate the result
    await animateResult(data.result);

    // Update keyboard colors
    updateKeyboardColors(data.result);

    if (data.correct) {
      gameOver = true;
      showMessage(data.message, 'success');
      await fetchGameState();
      fetchLeaderboard();
      setTimeout(() => {
        showModal(true, data.message, data.score, currentGuess);
      }, 1500);
    } else if (data.gameOver) {
      gameOver = true;
      showMessage(data.message, 'error');
      showModal(false, data.message, 0, data.targetWord);
    } else {
      currentRow++;
      currentGuess = '';
      showMessage(data.message);
      updateGuessesRemaining();
    }

  } catch (error) {
    console.error('Error submitting guess:', error);
    showMessage('Connection error! Try again.', 'error');
  }
}

// Animate the result with flip effect
async function animateResult(result) {
  for (let i = 0; i < result.length; i++) {
    const cell = document.getElementById(`cell-${currentRow}-${i}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    cell.classList.add(result[i].status);
  }

  await new Promise(resolve => setTimeout(resolve, 300));
}

// Update keyboard key colors
function updateKeyboardColors(result) {
  result.forEach(({ letter, status }) => {
    // Only upgrade status, never downgrade
    const currentStatus = letterStatuses[letter];
    if (currentStatus === 'correct') return;
    if (currentStatus === 'present' && status !== 'correct') return;

    letterStatuses[letter] = status;

    const keyBtn = document.querySelector(`[data-key="${letter}"]`);
    if (keyBtn) {
      keyBtn.classList.remove('correct', 'present', 'absent');
      keyBtn.classList.add(status);
    }
  });
}

// Shake row animation for invalid input
function shakeRow(row) {
  const rowEl = document.getElementById(`row-${row}`);
  rowEl.style.animation = 'shake 0.3s ease';
  setTimeout(() => {
    rowEl.style.animation = '';
  }, 300);
}

// Show message
function showMessage(text, type = '') {
  messageText.textContent = text;
  messageText.className = 'message-text';
  if (type) messageText.classList.add(type);
}

// Request hint
async function requestHint() {
  if (gameOver) return;

  try {
    const response = await fetch('/api/wordle/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });

    const data = await response.json();

    if (data.success) {
      hintCard.style.display = 'block';
      hintText.textContent = data.hint;
      hintsRemaining.textContent = `${data.hintsRemaining} hints left (-${data.scoreDeduction} pts total)`;
      showMessage(`Hint: ${data.hint}`);
    } else {
      showMessage(data.message, 'error');
    }

  } catch (error) {
    console.error('Error requesting hint:', error);
    showMessage('Could not get hint!', 'error');
  }
}

// Fetch game state from server
async function fetchGameState() {
  try {
    const response = await fetch(`/api/wordle/state?playerId=${playerId}`);
    const data = await response.json();

    // Update UI
    dishNameEl.textContent = data.dish;
    ingredientHintEl.textContent = data.ingredientHint;
    roundNumberEl.textContent = data.roundNumber;
    totalScoreEl.textContent = data.totalScore;
    gamesWonEl.textContent = data.gamesWon;

    // Calculate win rate
    const totalGames = data.gamesWon + (data.roundComplete && !data.targetWord ? 1 : 0);
    const winRate = totalGames > 0 ? Math.round((data.gamesWon / totalGames) * 100) : 0;
    winRateEl.textContent = `${winRate}%`;

    // Restore previous guesses if rejoining
    if (data.guesses && data.guesses.length > 0) {
      currentRow = data.guesses.length;
      currentGuess = '';

      data.guesses.forEach((guess, rowIndex) => {
        for (let col = 0; col < WORD_LENGTH; col++) {
          const cell = document.getElementById(`cell-${rowIndex}-${col}`);
          cell.textContent = guess.result[col].letter;
          cell.classList.add('filled', guess.result[col].status);
        }
        updateKeyboardColors(guess.result);
      });

      if (data.roundComplete) {
        gameOver = true;
        if (data.targetWord) {
          showMessage(`Round complete! The word was: ${data.targetWord}`);
        }
      }
    }

    updateGuessesRemaining();

  } catch (error) {
    console.error('Error fetching game state:', error);
  }
}

// Fetch leaderboard
async function fetchLeaderboard() {
  try {
    const response = await fetch('/api/wordle/leaderboard');
    const data = await response.json();

    if (data.leaderboard.length === 0) {
      leaderboardList.innerHTML = '<li class="leaderboard-empty">No scores yet!</li>';
      return;
    }

    leaderboardList.innerHTML = data.leaderboard.map((player, index) => `
      <li class="leaderboard-item">
        <span class="leaderboard-rank">${index + 1}</span>
        <span class="leaderboard-name">${escapeHtml(player.name)}</span>
        <span class="leaderboard-score">${player.totalScore}</span>
      </li>
    `).join('');

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  }
}

// Update guesses remaining display
function updateGuessesRemaining() {
  guessesRemainingEl.textContent = MAX_GUESSES - currentRow;
}

// Show result modal
function showModal(won, message, score, word) {
  modalHeader.textContent = won ? 'Splendid!' : 'Oh Dear!';
  modalHeader.className = 'modal-header' + (won ? ' win' : '');
  modalMessage.textContent = message;
  modalScore.textContent = score;
  modalWord.textContent = word;
  modal.classList.add('active');
}

// Start new round
async function startNewRound() {
  try {
    await fetch('/api/wordle/new-round', { method: 'POST' });

    // Reset local state
    currentGuess = '';
    currentRow = 0;
    gameOver = false;
    letterStatuses = {};
    hintCard.style.display = 'none';

    // Reset grid
    createGrid();

    // Reset keyboard colors
    document.querySelectorAll('.key').forEach(key => {
      key.classList.remove('correct', 'present', 'absent');
    });

    // Close modal
    modal.classList.remove('active');

    // Fetch new game state
    await fetchGameState();
    fetchLeaderboard();

    showMessage('Help Chef Ochako find her ingredients!');

  } catch (error) {
    console.error('Error starting new round:', error);
    showMessage('Could not start new round!', 'error');
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle physical keyboard input
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    handleKeyPress('ENTER');
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    handleKeyPress('BACK');
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    handleKeyPress(e.key.toUpperCase());
  }
});

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// Initialize the game
async function init() {
  initElements();
  createGrid();
  createKeyboard();

  showMessage('Connecting to kitchen...');

  await initDiscord();

  showMessage(`Welcome, Chef ${playerName}!`);

  await fetchGameState();
  fetchLeaderboard();

  // Refresh leaderboard periodically
  setInterval(fetchLeaderboard, 30000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
