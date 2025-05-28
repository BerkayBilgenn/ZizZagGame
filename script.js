const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Oyun durumu
let gameStarted = false;
let player = { x: 200, y: 550, radius: 12, dir: 1, trail: [] };
let speed = 2;
let score = 0;
let isGameOver = false;
let obstacles = [];
let powerups = [];
let particles = [];

// Bağımlılık mekanikleri
let streak = 0;
let level = 1;
let combo = 1;
let perfectHits = 0;
let sessionGames = 0;
let totalScore = parseInt(localStorage.getItem('totalScore') || '0');
let bestScore = parseInt(localStorage.getItem('bestScore') || '0');
let achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
let dailyStreak = parseInt(localStorage.getItem('dailyStreak') || '0');
let lastPlayDate = localStorage.getItem('lastPlayDate') || '';

// UI elementleri
const scoreBoard = document.getElementById('scoreBoard');
const streakDisplay = document.getElementById('streak');
const levelDisplay = document.getElementById('level');
const comboDisplay = document.getElementById('combo');
const gameOverDiv = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const personalBest = document.getElementById('personalBest');
const sessionStats = document.getElementById('sessionStats');
const achievementsDiv = document.getElementById('achievements');
const notification = document.getElementById('notification');
const startScreen = document.getElementById('startScreen');
const hud = document.getElementById('hud');

// Sabitler
const gapSize = 110;
const obstacleHeight = 20;
const minGapX = 50;
let maxGapX = canvas.width - gapSize - 50;
const minVerticalSpacing = 130;

function resizeCanvas() {
  const gameContainer = document.getElementById('game');
  const rect = gameContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  maxGapX = canvas.width - gapSize - 50;

  if (!gameStarted) {
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
  }
}

function startGame() {
  gameStarted = true;
  startScreen.style.display = 'none';
  hud.style.display = 'block';
  checkDailyStreak();
  draw();
}
document.getElementById('showAchievementsBtn').addEventListener('click', showScoreList);

function restartGame() {
  resizeCanvas();
  player = { x: canvas.width / 2, y: canvas.height - 50, radius: 12, dir: 1, trail: [] };
  speed = 2;
  score = 0;
  level = 1;
  combo = 1;
  perfectHits = 0;
  streak = 0;
  obstacles = [];
  powerups = [];
  particles = [];
  isGameOver = false;
  gameOverDiv.style.display = 'none';
  draw();
}

function gameOver() {
  // Skoru kaydet
let scores = JSON.parse(localStorage.getItem('scores') || '[]');
scores.push(Math.floor(score));
scores.sort((a, b) => b - a); // büyükten küçüğe sırala
localStorage.setItem('scores', JSON.stringify(scores));
  isGameOver = true;
  sessionGames++;
  totalScore += Math.floor(score);

  let isNewRecord = false;
  if (Math.floor(score) > bestScore) {
    bestScore = Math.floor(score);
    isNewRecord = true;
    localStorage.setItem('bestScore', bestScore.toString());
    addAchievement('🏆 Yeni Rekor!');
  }

  localStorage.setItem('totalScore', totalScore.toString());

  let message = isNewRecord ? '🏆 YENİ REKOR! 🏆<br>' : '🎮 Oyun Bitti!<br>';
  message += `Skorun: ${Math.floor(score)}`;

  finalScore.innerHTML = message;
  personalBest.innerHTML = `🥇 En İyi: ${bestScore}`;
  sessionStats.innerHTML = `📊 Bu Oturum: ${sessionGames} oyun<br>💯 Toplam Puan: ${totalScore}`;
  gameOverDiv.style.display = 'block';

  if (streak > 0) {
    combo = Math.max(1, combo - 1);
  }
}

function checkDailyStreak() {
  const today = new Date().toDateString();
  if (lastPlayDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastPlayDate === yesterday.toDateString()) {
      dailyStreak++;
    } else {
      dailyStreak = 1;
    }
    localStorage.setItem('dailyStreak', dailyStreak.toString());
    localStorage.setItem('lastPlayDate', today);

    if (dailyStreak > 1) {
      showNotification(`🔥 ${dailyStreak} günlük seri!`);
      addAchievement(`${dailyStreak} günlük seri!`);
    }
  }
}

function addAchievement(text) {
  if (!achievements.includes(text)) {
    achievements.push(text);
    localStorage.setItem('achievements', JSON.stringify(achievements));

    const el = document.createElement('div');
    el.className = 'achievement';
    el.textContent = text;
    achievementsDiv.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 4000);
  }
}
const returnToMenuBtn = document.getElementById('returnToMenuBtn');
if (returnToMenuBtn) {
  returnToMenuBtn.addEventListener('click', () => {
    returnToMenu();  // zaten tanımlı olan fonksiyonun adı bu
  });
}

function showNotification(text) {
  notification.textContent = text;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 2500);
}

function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 40,
      color
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    return --p.life > 0;
  });
}

function drawParticles() {
  for (let p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life / 40;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createPowerup() {
  if (Math.random() < 0.08) {
    powerups.push({
      x: Math.random() * (canvas.width - 40) + 20,
      y: -20,
      type: Math.random() < 0.5 ? 'score' : 'slow',
      collected: false
    });
  }
}

function drawPowerups() {
  for (let p of powerups) {
    p.y += speed;
    ctx.save();
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = p.type === 'score' ? '#FFD700' : '#00FF00';
    ctx.fillText(p.type === 'score' ? '💎' : '⏰', p.x, p.y);
    ctx.restore();

    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < player.radius + 15 && !p.collected) {
      p.collected = true;
      createParticles(p.x, p.y, p.type === 'score' ? '#FFD700' : '#00FF00');
      if (p.type === 'score') {
        const bonus = 50 * combo;
        score += bonus;
        showNotification(`💎 +${Math.floor(bonus)} bonus!`);
      } else {
        speed = Math.max(1.5, speed - 0.5);
        showNotification('⏰ Yavaşlatma!');
      }
    }
  }

  powerups = powerups.filter(p => p.y < canvas.height + 50 && !p.collected);
}

function createObstacle() {
  const last = obstacles.at(-1);
  let gapX;
  do {
    gapX = Math.random() * (maxGapX - minGapX) + minGapX;
  } while (last && Math.abs(gapX - last.gapX) < gapSize / 2);
  const y = last ? last.y - minVerticalSpacing : -obstacleHeight;
  obstacles.push({ y, gapX, passed: false });
}

function drawPlayer() {
  player.trail.push({ x: player.x, y: player.y });
  if (player.trail.length > 10) player.trail.shift();
  for (let i = 0; i < player.trail.length; i++) {
    ctx.save();
    ctx.globalAlpha = (i / player.trail.length) * 0.6;
    ctx.beginPath();
    ctx.arc(player.trail[i].x, player.trail[i].y, player.radius * (i / player.trail.length), 0, Math.PI * 2);
    ctx.fillStyle = combo > 5 ? '#FFD700' : '#fff';
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = combo > 5 ? '#FFD700' : '#fff';
  ctx.shadowColor = combo > 5 ? '#FFD700' : '#1D77C0';
  ctx.shadowBlur = 12 + (combo * 2);
  ctx.fill();
  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = '#13294B';
  ctx.shadowBlur = 8;

  for (let obs of obstacles) {
    ctx.fillRect(0, obs.y, obs.gapX, obstacleHeight);
    ctx.fillRect(obs.gapX + gapSize, obs.y, canvas.width - (obs.gapX + gapSize), obstacleHeight);
    obs.y += speed;

    if (!obs.passed && obs.y > player.y) {
      obs.passed = true;
      streak++;
      combo = Math.min(combo + 0.3, 10);
      perfectHits++;
      const centerX = obs.gapX + gapSize / 2;
      const distance = Math.abs(player.x - centerX);
      const bonus = Math.floor(10 * combo);
      score += bonus;

      if (distance < 25) {
        const perfectBonus = Math.floor(20 * combo);
        score += perfectBonus;
        createParticles(player.x, player.y, '#FFD700');
        showNotification(`⭐ Mükemmel! +${perfectBonus + bonus}`);
      } else {
        createParticles(player.x, player.y, '#ffffff');
      }

      checkAchievements();
    }
  }
  ctx.restore();
}

function drawBackgroundElements() {
  const t = Date.now() * 0.001;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.height; i += 50) {
    const offset = Math.sin(t + i * 0.01) * 10;
    ctx.beginPath();
    ctx.moveTo(0, i + offset);
    ctx.lineTo(canvas.width, i + offset);
    ctx.stroke();
  }
  ctx.restore();
}

function checkAchievements() {
  if (streak === 10) addAchievement('🎯 10 seri geçiş!');
  if (streak === 25) addAchievement('🔥 25 seri geçiş!');
  if (streak === 50) addAchievement('👑 50 seri geçiş!');
  if (perfectHits === 5) addAchievement('⭐ 5 mükemmel!');
  if (perfectHits === 15) addAchievement('💫 15 mükemmel!');
  if (score > 500) addAchievement('🎊 500 puan!');
  if (score > 1000) addAchievement('🏆 1000 puan!');
  if (level === 5) addAchievement('📈 Seviye 5!');
  if (level === 10) addAchievement('🚀 Seviye 10!');
  if (combo >= 5) addAchievement('⚡ 5x Kombo!');
  if (combo >= 8) addAchievement('💥 8x Kombo!');
}

function updateLevel() {
  const newLevel = Math.floor(score / 150) + 1;
  if (newLevel > level) {
    level = newLevel;
    speed += 0.25;
    showNotification(`🆙 Seviye ${level}!`);
    createParticles(player.x, player.y, '#00FF00');
  }
}

function checkCollision() {
  return obstacles.some(obs =>
    player.y + player.radius > obs.y &&
    player.y - player.radius < obs.y + obstacleHeight &&
    (player.x - player.radius < obs.gapX || player.x + player.radius > obs.gapX + gapSize)
  );
}

function updateUI() {
  scoreBoard.textContent = 'Skor: ' + Math.floor(score);
  streakDisplay.textContent = '🔥 Seri: ' + streak;
  levelDisplay.textContent = '📊 Seviye: ' + level;
  comboDisplay.textContent = '⚡ Kombo: x' + combo.toFixed(1);
}

function draw() {
  if (isGameOver || !gameStarted) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundElements();
  drawPlayer();
  drawObstacles();
  drawPowerups();
  drawParticles();
  updateParticles();

  player.x += player.dir * speed;

  if (player.x - player.radius <= 0 || player.x + player.radius >= canvas.width) {
    player.dir *= -1;
    createParticles(player.x, player.y, '#ffffff');
  }

  if (checkCollision()) {
    gameOver();
    return;
  }

  score += 0.15 * combo;
  updateLevel();
  updateUI();

  if (Math.random() < 0.006) createPowerup();

  if (obstacles.length === 0 || obstacles.at(-1).y > -minVerticalSpacing) {
    createObstacle();
  }

  obstacles = obstacles.filter(obs => obs.y < canvas.height + obstacleHeight);

  requestAnimationFrame(draw);
}

function shareScore() {
  const text = `🎯 IGÜ ZigZag Rota'da ${Math.floor(score)} puan aldım! 🔥 Seri: ${streak}, 📊 Seviye: ${level}`;
  if (navigator.share) {
    navigator.share({ title: 'IGÜ ZigZag Rota', text }).catch(() => {
      navigator.clipboard.writeText(text);
      showNotification('📋 Skor kopyalandı!');
    });
  } else {
    navigator.clipboard.writeText(text);
    showNotification('📋 Skor kopyalandı!');
  }
}

// Kontroller
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!isGameOver && gameStarted) {
    player.dir *= -1;
    speed += 0.02;
    createParticles(player.x, player.y, '#ffffff');
  }
}, { passive: false });

canvas.addEventListener('click', () => {
  if (!isGameOver && gameStarted) {
    player.dir *= -1;
    speed += 0.02;
    createParticles(player.x, player.y, '#ffffff');
  }
});

document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !isGameOver && gameStarted) {
    e.preventDefault();
    player.dir *= -1;
    speed += 0.02;
    createParticles(player.x, player.y, '#ffffff');
  }
});
function returnToMenu() {
  gameStarted = false;
  isGameOver = false;
  resizeCanvas();          // canvas boyutunu güncelle
  startScreen.style.display = 'flex';  // veya 'block' değil, flex kullandığın için 'flex' yazmalısın
  hud.style.display = 'none';
  gameOverDiv.style.display = 'none';
}



function showScoreList() {
  let scores = JSON.parse(localStorage.getItem('scores') || '[]');
  const list = document.getElementById('scoreItems');
  list.innerHTML = '';

  // Skorları büyükten küçüğe sırala (eğer zaten sıralı değilse)
  scores.sort((a, b) => b - a);

  if (scores.length === 0) {
    list.innerHTML = '<li>Henüz hiç skor yok.</li>';
  } else {
    scores.forEach((s, i) => {
      const li = document.createElement('li');
      li.textContent = `Deneme ${i + 1}: ${s} puan`;
      list.appendChild(li);
    });
  }

  document.getElementById('scoreList').style.display = 'block';
}
document.getElementById('closeScoreList').addEventListener('click', () => {
  hideScoreList();
});

function hideScoreList() {
  document.getElementById('scoreList').style.display = 'none';
}


function hideScoreList() {
  document.getElementById('scoreList').style.display = 'none';
}

// Butonlar
console.log("script.js yüklendi");

const startMain = document.getElementById('startButtonMain');
const startRestart = document.getElementById('startButtonRestart');

if (startMain) {
  startMain.addEventListener('click', () => {
    startGame();
  });
}

if (startRestart) {
  startRestart.addEventListener('click', () => {
    restartGame();
  });
}

// Başlangıç
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
