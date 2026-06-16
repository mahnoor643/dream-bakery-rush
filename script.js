/* ============================================================
   DREAM BAKERY RUSH - Game Script
   A magical bakery arcade game built with vanilla JavaScript
   ============================================================ */

// Wait for DOM to be ready before accessing elements
document.addEventListener('DOMContentLoaded', init);

// ============================================================
// DATA
// ============================================================

// Maps ingredient IDs to display info
const INGREDIENTS = {
  base:  { name: 'Cake Base',  emoji: '🎂' },
  choco: { name: 'Chocolate',  emoji: '🍫' },
  berry: { name: 'Strawberry', emoji: '🍓' },
  milk:  { name: 'Milk',       emoji: '🥛' },
  sugar: { name: 'Sugar',      emoji: '🍬' }
};

// Recipe database: id, name, required ingredients, unlock level, emoji
const RECIPES = [
  { id: 1,  name: 'Vanilla Cupcake',      ingredients: ['base', 'sugar'],               unlockLevel: 1, emoji: '🧁' },
  { id: 2,  name: 'Choco Shot',           ingredients: ['choco', 'milk'],               unlockLevel: 1, emoji: '🍫' },
  { id: 3,  name: 'Berry Bowl',           ingredients: ['berry', 'sugar'],              unlockLevel: 1, emoji: '🍓' },
  { id: 4,  name: 'Chocolate Cake',       ingredients: ['base', 'choco', 'sugar'],      unlockLevel: 2, emoji: '🎂' },
  { id: 5,  name: 'Strawberry Cake',      ingredients: ['base', 'berry', 'sugar'],      unlockLevel: 2, emoji: '🍰' },
  { id: 6,  name: 'Choco Milk',           ingredients: ['milk', 'choco', 'sugar'],      unlockLevel: 2, emoji: '🥛' },
  { id: 7,  name: 'Berry Milk',           ingredients: ['milk', 'berry', 'sugar'],      unlockLevel: 2, emoji: '🥤' },
  { id: 8,  name: 'Berry Choco Cake',     ingredients: ['base', 'choco', 'berry', 'sugar'], unlockLevel: 3, emoji: '🍫🍓' },
  { id: 9,  name: 'Fruit Parfait',        ingredients: ['base', 'berry', 'milk', 'sugar'],  unlockLevel: 3, emoji: '🍧' },
  { id: 10, name: 'Choco Berry Shake',    ingredients: ['milk', 'choco', 'berry', 'sugar'],  unlockLevel: 3, emoji: '🥤' },
  { id: 11, name: 'Double Choco Cake',    ingredients: ['base', 'choco', 'milk', 'sugar'],   unlockLevel: 4, emoji: '🎂' },
  { id: 12, name: 'Dream Cake',           ingredients: ['base', 'choco', 'berry', 'milk', 'sugar'], unlockLevel: 5, emoji: '🌈🎂' }
];

// Customer characters
const CUSTOMERS = [
  { name: 'Bunny',  emoji: '🐰' },
  { name: 'Kitty',  emoji: '🐱' },
  { name: 'Puppy',  emoji: '🐶' },
  { name: 'Bear',   emoji: '🐻' },
  { name: 'Fox',    emoji: '🦊' },
  { name: 'Owl',    emoji: '🦉' },
  { name: 'Panda',  emoji: '🐼' },
  { name: 'Frog',   emoji: '🐸' },
  { name: 'Rabbit', emoji: '🐇' },
  { name: 'Cat',    emoji: '🐈' }
];

// Speech lines for game events
const SPEECH = {
  greet:   ["I'd like to order...", 'Can I have...', "I'm craving...", 'One please!'],
  correct: ['Yummy! Thank you!', 'Delicious!', 'Perfect!', 'Amazing!', 'So good!'],
  wrong:   ["That's not what I wanted...", 'Hmm, try again?', 'Not quite...', 'Oh dear...'],
  timeout: ['Too slow...', "I'm leaving!", 'Maybe next time...', '*walks away*']
};

// ============================================================
// GAME STATE
// ============================================================

const state = {
  score: 0,
  coins: 0,
  lives: 3,
  level: 1,
  combo: 0,
  selectedIngredients: [],
  currentRecipe: null,
  currentCustomer: null,
  correctCount: 0,
  isProcessing: false,
  highScore: 0
};

// Timer state
const timer = {
  running: false,
  rafId: null,
  startTime: 0,
  duration: 15,
  remaining: 15,
  expired: false
};

// ============================================================
// DOM REFERENCES
// ============================================================

const $ = id => document.getElementById(id);
const dom = {};

function cacheDom() {
  dom.startScreen = $('start-screen');
  dom.gameScreen = $('game-screen');
  dom.gameoverScreen = $('gameover-screen');
  dom.customerAvatar = $('customer-avatar');
  dom.customerName = $('customer-name');
  dom.customerSpeech = $('customer-speech');
  dom.orderEmoji = $('order-emoji');
  dom.orderName = $('order-name');
  dom.orderIngredients = $('order-ingredients');
  dom.orderCard = $('order-card');
  dom.workspaceSelected = $('workspace-selected');
  dom.timerBar = $('timer-bar');
  dom.timerText = $('timer-text');
  dom.score = $('score');
  dom.coins = $('coins');
  dom.lives = $('lives');
  dom.level = $('level');
  dom.combo = $('combo');
  dom.ingredientsRow = $('ingredients-row');
  dom.serveBtn = $('serve-btn');
  dom.playBtn = $('play-btn');
  dom.restartBtn = $('restart-btn');
  dom.finalScore = $('final-score');
  dom.finalCoins = $('final-coins');
  dom.finalLevel = $('final-level');
  dom.highScore = $('high-score');
  dom.gameContainer = document.querySelector('.game-container');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function arraysMatch(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

function getTimeLimit(level) {
  return Math.max(8, 16 - level);
}

function getAvailableRecipes(level) {
  return RECIPES.filter(r => r.unlockLevel <= level);
}

function calculateScore(combo) {
  const multiplier = Math.min(3, 1 + combo * 0.2);
  return Math.floor(100 * multiplier);
}

// Safely read from localStorage
function loadHighScore() {
  try {
    return parseInt(localStorage.getItem('dreamBakeryHighScore')) || 0;
  } catch (e) {
    return 0;
  }
}

// Safely write to localStorage
function saveHighScore(score) {
  try {
    localStorage.setItem('dreamBakeryHighScore', score.toString());
  } catch (e) {
    // localStorage unavailable - silently ignore
  }
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

// ============================================================
// TIMER
// ============================================================

function startTimer() {
  stopTimer();

  const duration = getTimeLimit(state.level);
  timer.duration = duration;
  timer.remaining = duration;
  timer.startTime = 0;
  timer.running = true;
  timer.expired = false;

  updateTimerDisplay(duration);
  timer.rafId = requestAnimationFrame(tickTimer);
}

function stopTimer() {
  timer.running = false;
  if (timer.rafId) {
    cancelAnimationFrame(timer.rafId);
    timer.rafId = null;
  }
}

function tickTimer(timestamp) {
  if (!timer.running) return;

  if (timer.startTime === 0) timer.startTime = timestamp;
  const elapsed = (timestamp - timer.startTime) / 1000;
  const remaining = Math.max(0, timer.duration - elapsed);
  timer.remaining = remaining;

  updateTimerDisplay(remaining);

  if (remaining <= 0) {
    timer.running = false;
    timer.expired = true;
    if (!state.isProcessing) {
      handleTimeout();
    }
    return;
  }

  timer.rafId = requestAnimationFrame(tickTimer);
}

function updateTimerDisplay(remaining) {
  const pct = (remaining / timer.duration) * 100;
  dom.timerBar.style.width = pct + '%';

  const seconds = Math.ceil(remaining);
  dom.timerText.textContent = seconds + 's';

  dom.timerBar.classList.remove('warning', 'danger');
  dom.timerText.classList.remove('warning', 'danger');
  if (remaining <= 3) {
    dom.timerBar.classList.add('danger');
    dom.timerText.classList.add('danger');
  } else if (remaining <= 6) {
    dom.timerBar.classList.add('warning');
    dom.timerText.classList.add('warning');
  }
}

// ============================================================
// CUSTOMER & ORDER
// ============================================================

function nextCustomer() {
  state.isProcessing = false;
  state.selectedIngredients = [];
  timer.expired = false;

  updateIngredientButtons();
  updateWorkspace();
  dom.serveBtn.disabled = true;

  state.currentCustomer = randomPick(CUSTOMERS);
  dom.customerAvatar.textContent = state.currentCustomer.emoji;
  dom.customerName.textContent = state.currentCustomer.name;
  dom.customerAvatar.className = 'customer-avatar';
  dom.customerSpeech.textContent = randomPick(SPEECH.greet);

  const available = getAvailableRecipes(state.level);
  if (available.length === 0) return;
  state.currentRecipe = randomPick(available);
  dom.orderEmoji.textContent = state.currentRecipe.emoji;
  dom.orderName.textContent = state.currentRecipe.name;

  // Restart order card animation
  dom.orderCard.style.animation = 'none';
  void dom.orderCard.offsetHeight;
  dom.orderCard.style.animation = 'popIn 0.5s ease-out';

  dom.orderIngredients.innerHTML = '';
  state.currentRecipe.ingredients.forEach(id => {
    const ing = INGREDIENTS[id];
    const tag = document.createElement('span');
    tag.className = 'ingredient-tag';
    tag.textContent = ing.emoji + ' ' + ing.name;
    dom.orderIngredients.appendChild(tag);
  });

  startTimer();
}

// ============================================================
// INGREDIENT SELECTION
// ============================================================

function selectIngredient(id) {
  if (state.isProcessing || timer.expired) return;

  const idx = state.selectedIngredients.indexOf(id);
  if (idx === -1) {
    state.selectedIngredients.push(id);
  } else {
    state.selectedIngredients.splice(idx, 1);
  }

  updateIngredientButtons();
  updateWorkspace();
  dom.serveBtn.disabled = state.selectedIngredients.length === 0;
}

function updateIngredientButtons() {
  document.querySelectorAll('.ingredient-btn').forEach(btn => {
    const id = btn.dataset.ingredient;
    btn.classList.toggle('selected', state.selectedIngredients.includes(id));
  });
}

function updateWorkspace() {
  const container = dom.workspaceSelected;
  container.innerHTML = '';

  if (state.selectedIngredients.length === 0) {
    container.innerHTML = '<span class="workspace-placeholder">Select ingredients below...</span>';
    container.classList.remove('has-items');
    return;
  }

  container.classList.add('has-items');
  state.selectedIngredients.forEach(id => {
    const ing = INGREDIENTS[id];
    const chip = document.createElement('span');
    chip.className = 'selected-chip';
    chip.innerHTML = `<span class="chip-emoji">${ing.emoji}</span> ${ing.name}`;
    container.appendChild(chip);
  });
}

// ============================================================
// SERVE ORDER
// ============================================================

function serveOrder() {
  if (state.isProcessing || timer.expired || state.selectedIngredients.length === 0) return;
  if (!state.currentRecipe) return;

  state.isProcessing = true;
  stopTimer();

  if (arraysMatch(state.selectedIngredients, state.currentRecipe.ingredients)) {
    handleCorrect();
  } else {
    handleWrong();
  }
}

function handleCorrect() {
  state.combo++;
  state.correctCount++;

  const points = calculateScore(state.combo - 1);
  state.score += points;
  state.coins += 10;

  dom.customerAvatar.className = 'customer-avatar happy';
  dom.customerSpeech.textContent = randomPick(SPEECH.correct);

  showFloatingText('+' + points, '#FF6B9D');
  createConfetti();
  animateStat(dom.coins);

  const prevLevel = state.level;
  state.level = Math.floor(state.correctCount / 5) + 1;

  updateUI();

  if (state.level > prevLevel) {
    showLevelUp(state.level);
  }

  setTimeout(nextCustomer, 1200);
}

function handleWrong(message) {
  if (state.lives <= 0) return;

  state.combo = 0;
  state.lives--;

  dom.customerAvatar.className = 'customer-avatar sad';
  dom.customerSpeech.textContent = message || randomPick(SPEECH.wrong);

  dom.gameContainer.classList.add('shake-active');
  setTimeout(() => dom.gameContainer.classList.remove('shake-active'), 500);

  const overlay = document.createElement('div');
  overlay.className = 'shake-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 500);

  updateUI();

  if (state.lives <= 0) {
    setTimeout(gameOver, 1200);
  } else {
    setTimeout(nextCustomer, 1200);
  }
}

function handleTimeout() {
  handleWrong(randomPick(SPEECH.timeout));
}

// ============================================================
// UI UPDATES
// ============================================================

function updateUI() {
  dom.score.textContent = state.score;
  dom.coins.textContent = state.coins;
  dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
  dom.level.textContent = state.level;
  dom.combo.textContent = state.combo > 0 ? 'x' + (state.combo + 1) : '0';
}

function animateStat(element) {
  const card = element.closest('.stat-card');
  if (card) {
    card.classList.remove('stat-pop');
    void card.offsetHeight;
    card.classList.add('stat-pop');
  }
}

function showFloatingText(text, color) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Fredoka', sans-serif;
    font-size: 48px;
    font-weight: 700;
    color: ${color};
    pointer-events: none;
    z-index: 300;
    text-shadow: 0 4px 16px rgba(0,0,0,0.15);
    animation: floatUp 1s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ============================================================
// LEVEL UP
// ============================================================

function showLevelUp(newLevel) {
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-emoji">🎉</div>
      <div class="level-up-title">Level ${newLevel}!</div>
      <div class="level-up-text">New recipes unlocked!</div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => createConfetti(), 200);
  setTimeout(() => createConfetti(), 600);

  setTimeout(() => overlay.remove(), 2000);
}

// ============================================================
// CONFETTI
// ============================================================

function createConfetti() {
  const existing = document.getElementById('confetti-canvas');
  if (existing) existing.remove();

  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#FF6B9D', '#C084FC', '#FBBF24', '#FFB6C1', '#87CEEB', '#4ADE80', '#FFD700', '#FB923C'];
  const particles = [];

  for (let i = 0; i < 200; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1 - 20,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  let frameCount = 0;
  const maxFrames = 150;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frameCount++;
    let alive = false;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rotation += p.rotSpeed;

      if (frameCount > 60) {
        p.opacity = Math.max(0, p.opacity - 0.015);
      }

      if (p.opacity > 0 && p.y < canvas.height + 20) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (alive && frameCount < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

// ============================================================
// BACKGROUND SPARKLES (Start Screen)
// ============================================================

function createBackgroundSparkles() {
  const container = document.querySelector('.sparkle-container');
  if (!container) return;

  const chars = ['✨', '⭐', '💫', '🌟'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.textContent = randomPick(chars);
    el.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 16 + 10}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.4 + 0.1};
      animation: sparkleFloat ${Math.random() * 6 + 4}s ease-in-out ${Math.random() * 5}s infinite;
      pointer-events: none;
    `;
    container.appendChild(el);
  }
}

// ============================================================
// GAME FLOW
// ============================================================

function startGame() {
  state.score = 0;
  state.coins = 0;
  state.lives = 3;
  state.level = 1;
  state.combo = 0;
  state.correctCount = 0;
  state.selectedIngredients = [];
  state.currentRecipe = null;
  state.isProcessing = false;
  timer.expired = false;

  state.highScore = loadHighScore();
  showScreen('game-screen');

  updateUI();
  updateIngredientButtons();
  updateWorkspace();
  dom.serveBtn.disabled = true;

  nextCustomer();
}

function gameOver() {
  stopTimer();
  state.isProcessing = true;

  const isNewHigh = state.score > state.highScore;
  if (isNewHigh) {
    state.highScore = state.score;
    saveHighScore(state.highScore);
  }

  dom.finalScore.textContent = state.score;
  dom.finalCoins.textContent = state.coins;
  dom.finalLevel.textContent = state.level;

  const hsLabel = isNewHigh ? state.highScore + ' (NEW!)' : state.highScore;
  dom.highScore.textContent = hsLabel;

  setTimeout(() => showScreen('gameover-screen'), 500);
}

function restartGame() {
  startGame();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function bindEvents() {
  dom.playBtn.addEventListener('click', e => {
    e.preventDefault();
    startGame();
  });

  dom.restartBtn.addEventListener('click', e => {
    e.preventDefault();
    restartGame();
  });

  dom.ingredientsRow.addEventListener('click', e => {
    const btn = e.target.closest('.ingredient-btn');
    if (btn) {
      e.preventDefault();
      selectIngredient(btn.dataset.ingredient);
    }
  });

  dom.serveBtn.addEventListener('click', e => {
    e.preventDefault();
    serveOrder();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && dom.startScreen.classList.contains('active')) {
      startGame();
    } else if (e.key === 'Enter' && dom.gameoverScreen.classList.contains('active')) {
      restartGame();
    } else if ((e.key === ' ' || e.key === 'Enter') && dom.gameScreen.classList.contains('active')) {
      if (!dom.serveBtn.disabled) {
        e.preventDefault();
        serveOrder();
      }
    }

    const map = { '1': 'base', '2': 'choco', '3': 'berry', '4': 'milk', '5': 'sugar' };
    if (e.key in map && dom.gameScreen.classList.contains('active')) {
      selectIngredient(map[e.key]);
    }
  });
}

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
  cacheDom();
  state.highScore = loadHighScore();
  createBackgroundSparkles();
  showScreen('start-screen');
  bindEvents();
}
