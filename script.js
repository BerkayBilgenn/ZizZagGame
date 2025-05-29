const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Oyun durumu
let gameStarted = false;
let player = { x: 200, y: 550, radius: 12, dir: 1, trail: [] };
let speed = 1.5; // Başlangıç hızı azaltıldı
let score = 0;
let isGameOver = false;
let obstacles = [];
let powerups = [];
let particles = [];
let animationId = null; // Animation frame kontrolü için

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

// Sabitler - Daha kolay oyun için ayarlar
const gapSize = 130; // Gap boyutu artırıldı
const obstacleHeight = 20;
const minGapX = 60; // Minimum kenar boşluğu artırıldı
let maxGapX = canvas.width - gapSize - 60;
const minVerticalSpacing = 160; // Dikey boşluk artırıldı

function resizeCanvas() {
  const gameContainer = document.getElementById('game');
  const rect = gameContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  maxGapX = canvas.width - gapSize - 60;

  if (!gameStarted) {
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
  }
}

function startGame() {
  // Önceki oyunu temizle
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  gameStarted = true;
  isGameOver = false;
  startScreen.style.display = 'none';
  hud.style.display = 'block';
  gameOverDiv.style.display = 'none';
  
  // Oyun değişkenlerini sıfırla
  resetGameVariables();
  
  checkDailyStreak();
  draw();
}

function resetGameVariables() {
  player = { 
    x: canvas.width / 2, 
    y: canvas.height - 50, 
    radius: 12, 
    dir: 1, 
    trail: [] 
  };
  speed = 1.5; // Mobil için yavaş başlangıç
  score = 0;
  level = 1;
  combo = 1;
  perfectHits = 0;
  streak = 0;
  obstacles = [];
  powerups = [];
  particles = [];
}

document.getElementById('showAchievementsBtn').addEventListener('click', showScoreList);

function restartGame() {
  // Önceki animasyonu durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  resizeCanvas();
  resetGameVariables();
  isGameOver = false;
  gameOverDiv.style.display = 'none';
  draw();
}

function gameOver() {
  // Animation loop'u durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  // Oyun durumunu ayarla
  isGameOver = true;
  sessionGames++;
  
  // Skoru kaydet
  try {
    let scores = JSON.parse(localStorage.getItem('scores') || '[]');
    scores.push(Math.floor(score));
    scores.sort((a, b) => b - a);
    localStorage.setItem('scores', JSON.stringify(scores));
  } catch (error) {
    console.log('Score save error:', error);
  }
  
  totalScore += Math.floor(score);

  let isNewRecord = false;
  if (Math.floor(score) > bestScore) {
    bestScore = Math.floor(score);
    isNewRecord = true;
    try {
      localStorage.setItem('bestScore', bestScore.toString());
      addAchievement('🏆 Yeni Rekor!');
    } catch (error) {
      console.log('Best score save error:', error);
    }
  }

  try {
    localStorage.setItem('totalScore', totalScore.toString());
  } catch (error) {
    console.log('Total score save error:', error);
  }

  // UI'ı güncelle - her elementi kontrol et
  let message = isNewRecord ? '🏆 YENİ REKOR! 🏆<br>' : '🎮 Oyun Bitti!<br>';
  message += `Skorun: ${Math.floor(score)}`;

  if (finalScore) {
    finalScore.innerHTML = message;
  }
  
  if (personalBest) {
    personalBest.innerHTML = `🥇 En İyi: ${bestScore}`;
  }
  
  if (sessionStats) {
    sessionStats.innerHTML = `📊 Bu Oturum: ${sessionGames} oyun<br>💯 Toplam Puan: ${totalScore}`;
  }
  
  // Game over ekranını göster
  if (gameOverDiv) {
    gameOverDiv.style.display = 'block';
  }

  if (streak > 0) {
    combo = Math.max(1, combo - 1);
  }
  
  console.log('Game Over - Score:', Math.floor(score), 'UI Elements Check:', {
    finalScore: !!finalScore,
    personalBest: !!personalBest,
    sessionStats: !!sessionStats,
    gameOverDiv: !!gameOverDiv
  });
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

    // Safe DOM manipulation with error handling
    try {
      if (achievementsDiv) {
        const el = document.createElement('div');
        el.className = 'achievement';
        el.textContent = text;
        achievementsDiv.appendChild(el);

        setTimeout(() => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 4000);
      }
    } catch (error) {
      console.log('Achievement display error:', error);
    }
  }
}

const returnToMenuBtn = document.getElementById('returnToMenuBtn');
if (returnToMenuBtn) {
  returnToMenuBtn.addEventListener('click', () => {
    returnToMenu();
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
        speed = Math.max(1.2, speed - 0.3); // Minimum hız artırıldı
        showNotification('⏰ Yavaşlatma!');
      }
    }
  }

  powerups = powerups.filter(p => p.y < canvas.height + 50 && !p.collected);
}

function createObstacle() {
  const last = obstacles.at(-1);
  let gapX;
  let attempts = 0;
  
  // Daha güvenli gap pozisyonu seçimi
  do {
    gapX = Math.random() * (maxGapX - minGapX) + minGapX;
    attempts++;
    if (attempts > 10) break; // Sonsuz döngüyü engelle
  } while (last && Math.abs(gapX - last.gapX) < gapSize / 3); // Daha az kısıtlama
  
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
      combo = Math.min(combo + 0.2, 8); // Combo artışı azaltıldı
      perfectHits++;
      const centerX = obs.gapX + gapSize / 2;
      const distance = Math.abs(player.x - centerX);
      const bonus = Math.floor(10 * combo);
      score += bonus;

      if (distance < 30) { // Perfect hit aralığı genişletildi
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
  const newLevel = Math.floor(score / 200) + 1; // Level artışı yavaşlatıldı
  if (newLevel > level) {
    level = newLevel;
    speed += 0.15; // Hız artışı azaltıldı
    showNotification(`🆙 Seviye ${level}!`);
    createParticles(player.x, player.y, '#00FF00');
  }
}

function checkCollision() {
  // Daha hassas çarpışma kontrolü - sadece yakın engelleri kontrol et
  const playerLeft = player.x - player.radius;
  const playerRight = player.x + player.radius;
  const playerTop = player.y - player.radius;
  const playerBottom = player.y + player.radius;
  
  for (let obs of obstacles) {
    // Sadece oyuncunun yakınındaki engelleri kontrol et
    if (Math.abs(obs.y - player.y) > 50) continue;
    
    const obsTop = obs.y;
    const obsBottom = obs.y + obstacleHeight;
    const gapLeft = obs.gapX;
    const gapRight = obs.gapX + gapSize;
    
    // Oyuncu engelle çakışıyor mu?
    if (playerBottom > obsTop && playerTop < obsBottom) {
      // Sol engelle çarpışma - daha toleranslı
      if (playerRight < gapLeft + 5) return true;
      // Sağ engelle çarpışma - daha toleranslı
      if (playerLeft > gapRight - 5) return true;
    }
  }
  return false;
}

function updateUI() {
  if (scoreBoard) scoreBoard.textContent = 'Skor: ' + Math.floor(score);
  if (streakDisplay) streakDisplay.textContent = '🔥 Seri: ' + streak;
  if (levelDisplay) levelDisplay.textContent = '📊 Seviye: ' + level;
  if (comboDisplay) comboDisplay.textContent = '⚡ Kombo: x' + combo.toFixed(1);
}

function draw() {
  if (isGameOver || !gameStarted) return;

  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundElements();
    drawPlayer();
    drawObstacles();
    drawPowerups();
    drawParticles();
    updateParticles();

    // Oyuncu hareketi
    const moveSpeed = speed * 1.2; // Hareket hızını artır
    player.x += player.dir * moveSpeed;

    // Kenarlarda zıplama
    if (player.x - player.radius <= 0 || player.x + player.radius >= canvas.width) {
      player.dir *= -1;
      player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
      createParticles(player.x, player.y, '#ffffff');
    }

    // Çarpışma kontrolü - daha güvenli
    try {
      if (checkCollision()) {
        console.log('Collision detected at:', player.x, player.y);
        gameOver();
        return;
      }
    } catch (error) {
      console.log('Collision check error:', error);
    }

    // Skor artışı
    score += 0.1 * combo; // Skor artışı azaltıldı
    updateLevel();
    updateUI();

    // Power-up oluşturma
    if (Math.random() < 0.005) createPowerup(); // Daha az power-up

    // Yeni engel oluşturma
    if (obstacles.length === 0 || obstacles.at(-1).y > -minVerticalSpacing * 0.8) {
      createObstacle();
    }

    // Eski engelleri temizle
    obstacles = obstacles.filter(obs => obs.y < canvas.height + obstacleHeight);

    // Animation frame kaydet
    animationId = requestAnimationFrame(draw);
    
  } catch (error) {
    console.log('Draw function error:', error);
    // Hata durumunda oyunu durdur
    gameOver();
  }
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
    speed += 0.01; // Hız artışı azaltıldı
    createParticles(player.x, player.y, '#ffffff');
  }
}, { passive: false });

canvas.addEventListener('click', () => {
  if (!isGameOver && gameStarted) {
    player.dir *= -1;
    speed += 0.01; // Hız artışı azaltıldı
    createParticles(player.x, player.y, '#ffffff');
  }
});

document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !isGameOver && gameStarted) {
    e.preventDefault();
    player.dir *= -1;
    speed += 0.01; // Hız artışı azaltıldı
    createParticles(player.x, player.y, '#ffffff');
  }
});

function returnToMenu() {
  // Animation loop'u durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  gameStarted = false;
  isGameOver = false;
  resizeCanvas();
  startScreen.style.display = 'flex';
  hud.style.display = 'none';
  gameOverDiv.style.display = 'none';
}

function showScoreList() {
  let scores = JSON.parse(localStorage.getItem('scores') || '[]');
  const list = document.getElementById('scoreItems');
  if (!list) return;
  
  list.innerHTML = '';

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

  const scoreListEl = document.getElementById('scoreList');
  if (scoreListEl) scoreListEl.style.display = 'block';
}

const closeScoreListBtn = document.getElementById('closeScoreList');
if (closeScoreListBtn) {
  closeScoreListBtn.addEventListener('click', () => {
    hideScoreList();
  });
}

function hideScoreList() {
  const scoreListEl = document.getElementById('scoreList');
  if (scoreListEl) scoreListEl.style.display = 'none';
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