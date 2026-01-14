const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Data file path for persistent storage
const DATA_FILE = path.join(__dirname, 'data', 'players.json');

// Load environment variables
require('dotenv').config();

app.use(express.json());

// Add CORS and security headers for Discord Activities
app.use((req, res, next) => {
  // Allow Discord to embed the app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Required for Discord Activities iframe embedding
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'client'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    // Allow cross-origin resource sharing for assets
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Discord OAuth configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

// Fish dishes and their required ingredients (5 letters each)
const FISH_DISHES = [
  { dish: "Salmon en Croûte", ingredients: ["FLOUR", "CREAM", "DILLS", "LEMON", "HERBS"] },
  { dish: "Fish & Chips", ingredients: ["FLOUR", "LAGER", "SALTS", "SPUDS", "MINTS"] },
  { dish: "Bouillabaisse", ingredients: ["STOCK", "ONION", "CLAMS", "WINES", "HERBS"] },
  { dish: "Sushi Platter", ingredients: ["WASAB", "GINGE", "RICES", "SEAWW", "SAUCE"] },
  { dish: "Grilled Trout", ingredients: ["OLIVE", "LEMON", "THYME", "CAPAR", "SALTS"] },
  { dish: "Fish Pie", ingredients: ["CREAM", "LEEKS", "SPUDS", "CHEES", "HERBS"] },
  { dish: "Ceviche", ingredients: ["LIMES", "ONION", "CHILI", "CILAN", "SALTS"] },
  { dish: "Smoked Salmon Bagel", ingredients: ["CREAM", "DILLS", "CAPAR", "ONION", "LEMON"] },
  { dish: "Paella", ingredients: ["RICES", "STOCK", "PAPRI", "SAFRA", "ONION"] },
  { dish: "Clam Chowder", ingredients: ["CREAM", "BACON", "SPUDS", "THYME", "ONION"] },
  { dish: "Fisherman's Stew", ingredients: ["STOCK", "TOMTO", "WINES", "GARLI", "HERBS"] },
  { dish: "Baked Cod", ingredients: ["BREAD", "LEMON", "PARSL", "GARLI", "OLIVE"] },
  { dish: "Tuna Tartare", ingredients: ["SESAM", "AVOCA", "SAUCE", "LIMES", "CHIVE"] },
  { dish: "Lobster Bisque", ingredients: ["CREAM", "SHERY", "TOMTO", "STOCK", "BUTTE"] },
  { dish: "Kedgeree", ingredients: ["RICES", "CURRY", "PARSL", "CREAM", "ONION"] }
];

// Full ingredient word list for validation (5-letter cooking words)
const VALID_WORDS = [
  // Common ingredients
  "FLOUR", "CREAM", "DILLS", "LEMON", "HERBS", "LAGER", "SALTS", "SPUDS", "MINTS",
  "STOCK", "ONION", "CLAMS", "WINES", "WASAB", "GINGE", "RICES", "SEAWW", "SAUCE",
  "OLIVE", "THYME", "CAPAR", "LEEKS", "CHEES", "LIMES", "CHILI", "CILAN", "PAPRI",
  "SAFRA", "BACON", "TOMTO", "GARLI", "BREAD", "PARSL", "SESAM", "AVOCA", "CHIVE",
  "SHERY", "BUTTE", "CURRY", "SUGAR", "HONEY", "YEAST", "EGGGS", "MILKS", "WATER",
  "BROTH", "BASIL", "OREGN", "ROSMR", "NUTMG", "CINMN", "GINGR", "PEPPR", "CLOVE",
  "ANISE", "FENUL", "CUMIN", "CORDR", "CARWN", "MUSTA", "HORSE", "VINEG", "MAPLE",
  "AGAVE", "COCOA", "VANIL", "ALMND", "WALNT", "PECAN", "CASHU", "PISTA", "HAZNT",
  "DATES", "PRUNE", "RASIN", "APRIC", "APPLE", "PEACH", "MANGO", "PAPAY", "GUAVA",
  "BERRY", "GRAPE", "MELON", "CHERY", "PLUMS", "PEARS", "ORANG", "TANGY", "ZESTY",
  "SPICY", "SWEET", "SALTY", "SMOKY", "TANGS", "BLEND", "SAUTE", "ROAST", "GRILL",
  "STEAM", "POACH", "BRAIS", "BLANC", "SIMER", "FOODS", "TASTY", "FRESH", "CRISP",
  "CRUST", "FLAKY", "MOIST", "JUICE", "DRIPS", "SLICE", "CHUNK", "CUBES", "MINCE",
  "CHOPS", "WHISK", "STIRR", "FOLDS", "KNEAD", "SHAPE", "FORMS", "PLATE", "SERVE"
];

// Persistent player data (saved to disk)
let persistentData = {
  players: {} // { odiscordId: { name, totalScore, gamesWon, totalGames } }
};

// Load persistent data from file
function loadPersistentData() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      persistentData = JSON.parse(data);
      console.log(`✅ Loaded ${Object.keys(persistentData.players).length} players from storage`);
    } else {
      savePersistentData(); // Create initial file
      console.log('📁 Created new player data file');
    }
  } catch (error) {
    console.error('Error loading persistent data:', error);
  }
}

// Save persistent data to file
function savePersistentData() {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(persistentData, null, 2));
  } catch (error) {
    console.error('Error saving persistent data:', error);
  }
}

// Update persistent player data (call after score changes)
function updatePersistentPlayer(playerId, playerData) {
  persistentData.players[playerId] = {
    name: playerData.name,
    totalScore: playerData.totalScore,
    gamesWon: playerData.gamesWon,
    totalGames: playerData.totalGames,
    lastPlayed: Date.now()
  };
  savePersistentData();
}

// Load persistent data on startup
loadPersistentData();

// Game state for current session (round-specific data)
let gameState = {
  currentDish: null,
  currentIngredientIndex: 0,
  targetWord: null,
  gameStartTime: null,
  roundNumber: 1,
  players: {}, // Session data: { odiscordId: { name, currentGuesses, currentHintsUsed, roundComplete, roundScore, totalScore, gamesWon, totalGames } }
  roundHistory: [] // History of completed rounds
};

// Initialize a new round
function initNewRound() {
  const dishIndex = Math.floor(Math.random() * FISH_DISHES.length);
  const dish = FISH_DISHES[dishIndex];
  const ingredientIndex = Math.floor(Math.random() * dish.ingredients.length);

  gameState.currentDish = dish;
  gameState.currentIngredientIndex = ingredientIndex;
  gameState.targetWord = dish.ingredients[ingredientIndex];
  gameState.gameStartTime = Date.now();
  gameState.roundNumber++;

  // Reset player guesses for new round
  Object.keys(gameState.players).forEach(playerId => {
    gameState.players[playerId].currentGuesses = [];
    gameState.players[playerId].currentHintsUsed = 0;
    gameState.players[playerId].roundComplete = false;
    gameState.players[playerId].roundScore = 0;
  });

  console.log(`New round started! Dish: ${dish.dish}, Target: ${gameState.targetWord}`);
}

// Initialize first round
initNewRound();

// Calculate score for a player's round
function calculateScore(guessCount, hintsUsed, timeMs) {
  const baseScore = 1000;
  const guessDeduction = (guessCount - 1) * 100; // -100 per extra guess
  const hintDeduction = hintsUsed * 150; // -150 per hint
  const timeBonus = Math.max(0, 300 - Math.floor(timeMs / 1000)); // Bonus for speed (up to 300 points)

  return Math.max(0, baseScore - guessDeduction - hintDeduction + timeBonus);
}

// Evaluate a guess against target word (Wordle-style)
function evaluateGuess(guess, target) {
  const result = [];
  const targetChars = target.split('');
  const guessChars = guess.split('');
  const usedIndices = new Set();

  // First pass: mark correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = { letter: guessChars[i], status: 'correct' };
      usedIndices.add(i);
    }
  }

  // Second pass: mark present but wrong position (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue; // Already marked as correct

    let found = false;
    for (let j = 0; j < 5; j++) {
      if (!usedIndices.has(j) && guessChars[i] === targetChars[j]) {
        result[i] = { letter: guessChars[i], status: 'present' };
        usedIndices.add(j);
        found = true;
        break;
      }
    }

    if (!found) {
      result[i] = { letter: guessChars[i], status: 'absent' };
    }
  }

  return result;
}

// Get hint for current word
function getHint(targetWord, hintsUsed) {
  const hints = [
    `The first letter is "${targetWord[0]}"`,
    `The word has ${new Set(targetWord.split('')).size} unique letters`,
    `The last letter is "${targetWord[targetWord.length - 1]}"`,
    `The middle letter is "${targetWord[2]}"`
  ];

  return hints[Math.min(hintsUsed, hints.length - 1)];
}

// Discord OAuth token exchange
app.post('/api/token', async (req, res) => {
  const { code } = req.body;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn('Discord credentials not configured. Running in local mode.');
    return res.json({ access_token: 'local_mode_token' });
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Get Discord configuration
app.get('/api/config', (req, res) => {
  res.json({
    clientId: DISCORD_CLIENT_ID || 'local_mode'
  });
});

// Get current game state for a player
app.get('/api/wordle/state', (req, res) => {
  const { playerId } = req.query;

  // Load persistent data for this player if it exists
  const persistentPlayer = persistentData.players[playerId];

  let player = gameState.players[playerId];
  if (!player) {
    player = {
      name: persistentPlayer?.name || 'Guest',
      currentGuesses: [],
      currentHintsUsed: 0,
      roundComplete: false,
      roundScore: 0,
      totalScore: persistentPlayer?.totalScore || 0,
      gamesWon: persistentPlayer?.gamesWon || 0,
      totalGames: persistentPlayer?.totalGames || 0
    };
    if (playerId) {
      gameState.players[playerId] = player;
    }
  }

  res.json({
    dish: gameState.currentDish.dish,
    ingredientHint: `Ingredient ${gameState.currentIngredientIndex + 1} of ${gameState.currentDish.ingredients.length}`,
    roundNumber: gameState.roundNumber,
    guesses: player.currentGuesses,
    hintsUsed: player.currentHintsUsed,
    roundComplete: player.roundComplete,
    roundScore: player.roundScore,
    totalScore: player.totalScore,
    gamesWon: player.gamesWon,
    maxGuesses: 6,
    wordLength: 5,
    targetWord: player.roundComplete ? gameState.targetWord : null
  });
});

// Submit a guess
app.post('/api/wordle/guess', (req, res) => {
  const { playerId, playerName, guess } = req.body;

  if (!playerId || !guess) {
    return res.status(400).json({ error: 'Missing playerId or guess' });
  }

  const normalizedGuess = guess.toUpperCase().trim();

  // Validate guess length
  if (normalizedGuess.length !== 5) {
    return res.json({
      success: false,
      message: 'Ingredient must be 5 letters!'
    });
  }

  // Validate guess is letters only
  if (!/^[A-Z]+$/.test(normalizedGuess)) {
    return res.json({
      success: false,
      message: 'Only letters allowed!'
    });
  }

  // Get or create player (load persistent data if available)
  const persistentPlayer = persistentData.players[playerId];
  if (!gameState.players[playerId]) {
    gameState.players[playerId] = {
      name: playerName || persistentPlayer?.name || 'Guest',
      currentGuesses: [],
      currentHintsUsed: 0,
      roundComplete: false,
      roundScore: 0,
      totalScore: persistentPlayer?.totalScore || 0,
      gamesWon: persistentPlayer?.gamesWon || 0,
      totalGames: persistentPlayer?.totalGames || 0
    };
  }

  const player = gameState.players[playerId];
  // Always update name if provided (Discord username)
  if (playerName && playerName !== 'Guest' && playerName !== 'Local Chef') {
    player.name = playerName;
  }

  // Check if player already completed this round
  if (player.roundComplete) {
    return res.json({
      success: false,
      message: 'You already completed this round! Wait for the next one.'
    });
  }

  // Check if player has guesses left
  if (player.currentGuesses.length >= 6) {
    player.roundComplete = true;
    player.totalGames++;
    return res.json({
      success: false,
      message: 'No more guesses! The ingredient was: ' + gameState.targetWord,
      gameOver: true,
      targetWord: gameState.targetWord
    });
  }

  // Evaluate the guess
  const result = evaluateGuess(normalizedGuess, gameState.targetWord);
  player.currentGuesses.push({
    word: normalizedGuess,
    result: result,
    timestamp: Date.now()
  });

  const isCorrect = normalizedGuess === gameState.targetWord;

  if (isCorrect) {
    const timeMs = Date.now() - gameState.gameStartTime;
    const score = calculateScore(player.currentGuesses.length, player.currentHintsUsed, timeMs);
    player.roundScore = score;
    player.totalScore += score;
    player.gamesWon++;
    player.totalGames++;
    player.roundComplete = true;

    // Save to persistent storage
    updatePersistentPlayer(playerId, player);

    return res.json({
      success: true,
      correct: true,
      result: result,
      message: getWinMessage(player.currentGuesses.length),
      score: score,
      totalScore: player.totalScore,
      guessCount: player.currentGuesses.length
    });
  }

  // Check if out of guesses
  if (player.currentGuesses.length >= 6) {
    player.roundComplete = true;
    player.totalGames++;

    // Save to persistent storage (loss)
    updatePersistentPlayer(playerId, player);

    return res.json({
      success: true,
      correct: false,
      result: result,
      message: `Oh no! The ingredient was: ${gameState.targetWord}`,
      gameOver: true,
      targetWord: gameState.targetWord,
      guessCount: player.currentGuesses.length
    });
  }

  return res.json({
    success: true,
    correct: false,
    result: result,
    message: getGuessMessage(6 - player.currentGuesses.length),
    guessesRemaining: 6 - player.currentGuesses.length
  });
});

// Request a hint
app.post('/api/wordle/hint', (req, res) => {
  const { playerId } = req.body;

  if (!playerId || !gameState.players[playerId]) {
    return res.status(400).json({ error: 'Player not found' });
  }

  const player = gameState.players[playerId];

  if (player.roundComplete) {
    return res.json({ success: false, message: 'Round already complete!' });
  }

  if (player.currentHintsUsed >= 4) {
    return res.json({ success: false, message: 'No more hints available!' });
  }

  const hint = getHint(gameState.targetWord, player.currentHintsUsed);
  player.currentHintsUsed++;

  return res.json({
    success: true,
    hint: hint,
    hintsRemaining: 4 - player.currentHintsUsed,
    scoreDeduction: player.currentHintsUsed * 150
  });
});

// Get leaderboard (from persistent storage)
app.get('/api/wordle/leaderboard', (req, res) => {
  const leaderboard = Object.entries(persistentData.players)
    .map(([id, player]) => ({
      id,
      name: player.name,
      totalScore: player.totalScore,
      gamesWon: player.gamesWon,
      totalGames: player.totalGames,
      winRate: player.totalGames > 0 ? Math.round((player.gamesWon / player.totalGames) * 100) : 0
    }))
    .filter(p => p.totalGames > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10);

  res.json({ leaderboard });
});

// Start new round (admin or automatic)
app.post('/api/wordle/new-round', (req, res) => {
  // Save round history
  gameState.roundHistory.push({
    roundNumber: gameState.roundNumber,
    dish: gameState.currentDish.dish,
    targetWord: gameState.targetWord,
    endTime: Date.now()
  });

  initNewRound();

  res.json({
    success: true,
    message: 'New round started!',
    dish: gameState.currentDish.dish
  });
});


function getWinMessage(guesses) {
  const messages = {
    1: "🌟 LEGENDARY! First try! Chef Ochako is amazed!",
    2: "✨ BRILLIANT! You're a true ingredient master!",
    3: "🎉 EXCELLENT! Chef Ochako approves!",
    4: "👏 GREAT JOB! The shopping list is complete!",
    5: "😊 GOOD WORK! You found it!",
    6: "😅 PHEW! Just in time!"
  };
  return messages[guesses] || "Well done!";
}

function getGuessMessage(remaining) {
  if (remaining === 1) return "Last chance! Think carefully...";
  if (remaining === 2) return "Getting close! 2 tries left.";
  return `${remaining} guesses remaining.`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍳 Ochako's Kitchen server running on port ${PORT}`);
  console.log(`Current dish: ${gameState.currentDish.dish}`);
  console.log(`Target ingredient: ${gameState.targetWord}`);
});
