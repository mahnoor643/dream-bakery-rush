/* ============================================================
   DREAM BAKERY RUSH - Game Script
   A magical bakery arcade game built with vanilla JavaScript
   ============================================================ */

// ============================================================
// DATA
// ============================================================

// Maps ingredient IDs to their display info (name + emoji)
const INGREDIENTS = {
  base:  { name: "Cake Base",  emoji: "🎂" },
  choco: { name: "Chocolate",  emoji: "🍫" },
  berry: { name: "Strawberry", emoji: "🍓" },
  milk:  { name: "Milk",       emoji: "🥛" },
  sugar: { name: "Sugar",      emoji: "🍬" }
};

// Recipe database: each recipe has an id, display name, required ingredients,
// the level it unlocks at, and an emoji icon for the order card.
const RECIPES = [
  { id: 1,  name: "Vanilla Cupcake",      ingredients: ["base", "sugar"],               unlockLevel: 1, emoji: "🧁" },
  { id: 2,  name: "Choco Shot",           ingredients: ["choco", "milk"],               unlockLevel: 1, emoji: "🍫" },
  { id: 3,  name: "Berry Bowl",           ingredients: ["berry", "sugar"],              unlockLevel: 1, emoji: "🍓" },
  { id: 4,  name: "Chocolate Cake",       ingredients: ["base", "choco", "sugar"],      unlockLevel: 2, emoji: "🎂" },
  { id: 5,  name: "Strawberry Cake",      ingredients: ["base", "berry", "sugar"],      unlockLevel: 2, emoji: "🍰" },
  { id: 6,  name: "Choco Milk",           ingredients: ["milk", "choco", "sugar"],      unlockLevel: 2, emoji: "🥛" },
  { id: 7,  name: "Berry Milk",           ingredients: ["milk", "berry", "sugar"],      unlockLevel: 2, emoji: "🥤" },
  { id: 8,  name: "Berry Choco Cake",     ingredients: ["base", "choco", "berry", "sugar"], unlockLevel: 3, emoji: "🍫🍓" },
  { id: 9,  name: "Fruit Parfait",        ingredients: ["base", "berry", "milk", "sugar"],  unlockLevel: 3, emoji: "🍧" },
  { id: 10, name: "Choco Berry Shake",    ingredients: ["milk", "choco", "berry", "sugar"],  unlockLevel: 3, emoji: "🥤" },
  { id: 11, name: "Double Choco Cake",    ingredients: ["base", "choco", "milk", "sugar"],   unlockLevel: 4, emoji: "🎂" },
  { id: 12, name: "Dream Cake",           ingredients: ["base", "choco", "berry", "milk", "sugar"], unlockLevel: 5, emoji: "🌈🎂" }
];

// Cute customer characters that appear in the bakery
const CUSTOMERS = [
  { name: "Bunny",  emoji: "🐰" },
  { name: "Kitty",  emoji: "🐱" },
  { name: "Puppy",  emoji: "🐶" },
  { name: "Bear",   emoji: "🐻" },
  { name: "Fox",    emoji: "🦊" },
  { name: "Owl",    emoji: "🦉" },
  { name: "Panda",  emoji: "🐼" },
  { name: "Frog",   emoji: "🐸" },
  { name: "Rabbit", emoji: "🐇" },
  { name: "Cat",    emoji: "🐈" }
];

// Speech lines for various game events
const SPEECH = {
  greet: ["I'd like to order...", "Can I have...", "I'm craving...", "One please!"],
  correct: ["Yummy! Thank you!", "Delicious!", "Perfect!", "Amazing!", "So good!"],
  wrong: ["That's not what I wanted...", "Hmm, try again?", "Not quite...", "Oh dear..."],
  timeout: ["Too slow...", "I'm leaving!", "Maybe next time...", "*walks away*"]
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

// Timer state (kept separate for clean start/stop)
let timer = {
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
const $ = (id) => document.getElementById(id);

const dom = {
  startScreen: $('start-screen'),
  gameScreen: $('game-screen'),
  gameoverScreen: $('gameover-screen'),

  customerAvatar: $('customer-avatar'),
  customerName: $('customer-name'),
  customerSpeech: $('customer-speech'),
  orderEmoji: $('order-emoji'),
  orderName: $('order-name'),
  orderIngredients: $('order-ingredients'),
  orderCard: $('order-card'),
  workspaceSelected: $('workspace-selected'),
  timerBar: $('timer-bar'),
  timerText: $('timer-text'),

  score: $('score'),
  coins: $('coins'),
  lives: $('lives'),
  level: $('level'),
  combo: $('combo'),

  ingredientsRow: $('ingredients-row'),
  serveBtn: $('serve-btn'),
  playBtn: $('play-btn'),
  restartBtn: $('restart-btn'),

  finalScore: $('final-score'),
  finalCoins: $('final-coins'),
  finalLevel: $('final-level'),
  highScore: $('high-score'),

  gameContainer: document.querySelector('.game-container')
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Pick a random element from an array
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Check if two arrays contain the same items (order-independent)
function arraysMatch(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

// Get the time limit in seconds for a given level
function getTimeLimit(level) {
  return Math.max(8, 16 - level);
}

// Get recipes available at a given level
function getAvailableRecipes(level) {
  return RECIPES.filter(r => r.unlockLevel <= level);
}

// Calculate score for a correct order
function calculateScore(combo) {
  const multiplier = Math.min(3, 1 + combo * 0.2);
  return Math.floor(100 * multiplier);
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

// Show a screen by ID and hide all others
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

// ============================================================
// TIMER
// ============================================================

// Start the countdown timer for the current order
function startTimer() {
  // Stop any existing timer
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

// Stop the timer
function stopTimer() {
  timer.running = false;
  if (timer.rafId) {
    cancelAnimationFrame(timer.rafId);
    timer.rafId = null;
  }
}

// Animation frame tick for smooth timer bar updates
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
    handleTimeout();
    return;
  }

  timer.rafId = requestAnimationFrame(tickTimer);
}

// Update the timer bar and text based on remaining time
function updateTimerDisplay(remaining) {
  const pct = (remaining / timer.duration) * 100;
  dom.timerBar.style.width = pct + '%';

  const seconds = Math.ceil(remaining);
  dom.timerText.textContent = seconds + 's';

  // Color the bar based on urgency
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
// CUSTOMER & ORDER GENERATION
// ============================================================

// Generate a new customer and order
function nextCustomer() {
  state.isProcessing = false;
  state.selectedIngredients = [];
  timer.expired = false;

  // Clear previous selection
  updateIngredientButtons();
  updateWorkspace();
  dom.serveBtn.disabled = true;

  // Pick a random customer
  state.currentCustomer = randomPick(CUSTOMERS);
  dom.customerAvatar.textContent = state.currentCustomer.emoji;
  dom.customerName.textContent = state.currentCustomer.name;
  dom.customerAvatar.className = 'customer-avatar';
  dom.customerSpeech.textContent = randomPick(SPEECH.greet);

  // Pick a random recipe available at current level
  const available = getAvailableRecipes(state.level);
  state.currentRecipe = randomPick(available);
  dom.orderEmoji.textContent = state.currentRecipe.emoji;
  dom.orderName.textContent = state.currentRecipe.name;
  dom.orderCard.style.animation = 'none';
  // Force reflow to restart animation
  void dom.orderCard.offsetHeight;
  dom.orderCard.style.animation = 'orderAppear 0.5s ease-out';

  // Show required ingredients as tags on the order card
  dom.orderIngredients.innerHTML = '';
  state.currentRecipe.ingredients.forEach(id => {
    const ing = INGREDIENTS[id];
    const tag = document.createElement('span');
    tag.className = 'ingredient-tag';
    tag.textContent = ing.emoji + ' ' + ing.name;
    dom.orderIngredients.appendChild(tag);
  });

  // Start the timer
  startTimer();
}

// ============================================================
// INGREDIENT SELECTION
// ============================================================

// Toggle an ingredient on/off
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

// Update visual state of all ingredient buttons
function updateIngredientButtons() {
  document.querySelectorAll('.ingredient-btn').forEach(btn => {
    const id = btn.dataset.ingredient;
    btn.classList.toggle('selected', state.selectedIngredients.includes(id));
  });
}

// Update the workspace "selected ingredients" display
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

// Check the player's selected ingredients against the current order
function serveOrder() {
  if (state.isProcessing || timer.expired || state.selectedIngredients.length === 0) return;
  if (!state.currentRecipe) return;

  state.isProcessing = true;
  stopTimer();

  const selected = state.selectedIngredients;
  const required = state.currentRecipe.ingredients;

  if (arraysMatch(selected, required)) {
    handleCorrect();
  } else {
    handleWrong();
  }
}

// Handle a correct order
function handleCorrect() {
  state.combo++;
  state.correctCount++;

  // Calculate and apply score
  const points = calculateScore(state.combo - 1);
  state.score += points;
  state.coins += 10;

  // Happy customer
  dom.customerAvatar.className = 'customer-avatar happy';
  dom.customerSpeech.textContent = randomPick(SPEECH.correct);

  // Show floating score text
  showFloatingText('+ ' + points + ' ⭐', '#FF6B9D');

  // Confetti burst
  createConfetti();

  // Sparkle effect on coins
  animateStat(dom.coins);

  // Check for level up
  const prevLevel = state.level;
  state.level = Math.floor(state.correctCount / 5) + 1;

  updateUI();

  // Show level up celebration if leveled up
  if (state.level > prevLevel) {
    showLevelUp(state.level);
  }

  // Next customer after a brief delay
  setTimeout(() => {
    nextCustomer();
  }, 1200);
}

// Handle a wrong order
function handleWrong(message) {
  state.combo = 0;
  state.lives--;

  // Sad customer
  dom.customerAvatar.className = 'customer-avatar sad';
  dom.customerSpeech.textContent = message || randomPick(SPEECH.wrong);

  // Screen shake
  dom.gameContainer.classList.add('shake-active');
  setTimeout(() => dom.gameContainer.classList.remove('shake-active'), 500);

  // Red flash overlay
  const overlay = document.createElement('div');
  overlay.className = 'shake-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 500);

  updateUI();

  if (state.lives <= 0) {
    // Game over after a delay
    setTimeout(() => gameOver(), 1200);
  } else {
    // Next customer after a brief delay
    setTimeout(() => {
      nextCustomer();
    }, 1200);
  }
}

// Handle timer expiration
function handleTimeout() {
  handleWrong('⏰ ' + randomPick(SPEECH.timeout));
}

// ============================================================
// UI UPDATES
// ============================================================

// Update all stats display
function updateUI() {
  dom.score.textContent = state.score;
  dom.coins.textContent = state.coins;
  dom.lives.textContent = '❤️'.repeat(Math.max(0, state.lives));
  dom.level.textContent = state.level;
  dom.combo.textContent = state.combo > 0 ? 'x' + (state.combo + 1) : '0';
}

// Animate a stat card with a pop effect
function animateStat(element) {
  const card = element.closest('.stat-card');
  if (card) {
    card.classList.remove('stat-pop');
    void card.offsetHeight;
    card.classList.add('stat-pop');
  }
}

// Show floating score text that rises and fades
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

  // Add keyframes dynamically if not already added
  if (!document.getElementById('float-up-style')) {
    const style = document.createElement('style');
    style.id = 'float-up-style';
    style.textContent = `
      @keyframes floatUp {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
        30% { opacity: 1; transform: translate(-50%, -60%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => el.remove(), 1000);
}

// ============================================================
// LEVEL UP
// ============================================================

// Show level up celebration overlay
function showLevelUp(newLevel) {
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-emoji">🎉</div>
      <div class="level-up-title">Level ${newLevel}!</div>
      <div class="level-up-text">New recipes unlocked! 🧁</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Extra confetti for level up
  setTimeout(() => createConfetti(), 200);
  setTimeout(() => createConfetti(), 600);

  setTimeout(() => {
    overlay.remove();
  }, 2000);
}

// ============================================================
// CONFETTI EFFECT
// ============================================================

// Create a confetti burst using a canvas overlay
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

  // Generate confetti pieces
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

  function animateConfetti() {
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
      requestAnimationFrame(animateConfetti);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animateConfetti);
}

// ============================================================
// BACKGROUND SPARKLES (Start Screen)
// ============================================================

// Create floating sparkle elements on the start screen
function createBackgroundSparkles() {
  const container = document.querySelector('.sparkle-container');
  if (!container) return;

  const sparkleChars = ['✨', '⭐', '💫', '🌟'];
  for (let i = 0; i < 20; i++) {
    const sparkle = document.createElement('div');
    sparkle.textContent = randomPick(sparkleChars);
    sparkle.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 16 + 10}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      opacity: ${Math.random() * 0.4 + 0.1};
      animation: sparkleFloat ${Math.random() * 6 + 4}s ease-in-out ${Math.random() * 5}s infinite;
      pointer-events: none;
    `;
    container.appendChild(sparkle);
  }
}

// ============================================================
// GAME FLOW
// ============================================================

// Initialize and start the game
function startGame() {
  // Reset state
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

  // Load high score
  state.highScore = parseInt(localStorage.getItem('dreamBakeryHighScore')) || 0;

  // Show game screen
  showScreen('game-screen');

  // Reset UI
  updateUI();
  updateIngredientButtons();
  updateWorkspace();
  dom.serveBtn.disabled = true;

  // Start first customer
  nextCustomer();
}

// Game over
function gameOver() {
  stopTimer();
  state.isProcessing = true;

  // Update high score
  const isNewHigh = state.score > state.highScore;
  if (isNewHigh) {
    state.highScore = state.score;
    localStorage.setItem('dreamBakeryHighScore', state.highScore.toString());
  }

  // Show game over screen with stats
  dom.finalScore.textContent = state.score;
  dom.finalCoins.textContent = state.coins;
  dom.finalLevel.textContent = state.level;

  const hsDisplay = isNewHigh ? '🏆 ' + state.highScore + ' (NEW!)' : state.highScore;
  dom.highScore.textContent = hsDisplay;

  setTimeout(() => {
    showScreen('gameover-screen');
  }, 500);
}

// Restart the game from game over screen
function restartGame() {
  startGame();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Play button
dom.playBtn.addEventListener('click', (e) => {
  e.preventDefault();
  startGame();
});

// Restart button
dom.restartBtn.addEventListener('click', (e) => {
  e.preventDefault();
  restartGame();
});

// Ingredient buttons (event delegation)
dom.ingredientsRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.ingredient-btn');
  if (btn) {
    e.preventDefault();
    selectIngredient(btn.dataset.ingredient);
  }
});

// Serve button
dom.serveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  serveOrder();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && dom.startScreen.classList.contains('active')) {
    startGame();
  }
  if (e.key === 'Enter' && dom.gameoverScreen.classList.contains('active')) {
    restartGame();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if (dom.gameScreen.classList.contains('active') && !dom.serveBtn.disabled) {
      e.preventDefault();
      serveOrder();
    }
  }
  // Number keys 1-5 for ingredients
  const ingredientMap = { '1': 'base', '2': 'choco', '3': 'berry', '4': 'milk', '5': 'sugar' };
  if (e.key in ingredientMap && dom.gameScreen.classList.contains('active')) {
    selectIngredient(ingredientMap[e.key]);
  }
});

// ============================================================
// INITIALIZATION
// ============================================================

// Load high score on init
state.highScore = parseInt(localStorage.getItem('dreamBakeryHighScore')) || 0;

// Create background sparkles on start screen
createBackgroundSparkles();

// Show start screen initially
showScreen('start-screen');
