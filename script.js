// Giriş butonu
document.getElementById("loginBtn").addEventListener("click", async () => {
  const username = document
    .getElementById("usernameInput")
    .value.trim()
    .toLowerCase();
  const errorBox = document.getElementById("loginError");

  if (!username) {
    errorBox.textContent = "Lütfen kullanıcı adınızı girin.";
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(username).get();

    if (userDoc.exists) {
      // Mevcut kullanıcı - bilgilerini al
      const userData = userDoc.data();
      currentUser = username;
      currentUserTotalScore = userData.totalScore || 0; // Toplam skoru al

      // localStorage'a kaydet
      localStorage.setItem("currentUser", currentUser);

      // Giriş başarılıysa diğer ekranlara geç
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("startScreen").style.display = "block";

      errorBox.textContent = "";
      showNotification(
        `🎉 Tekrar hoş geldin, ${username}! Toplam skor: ${currentUserTotalScore}`
      );
    } else {
      // Yeni kullanıcı - kayıt et
      await registerUser(username); // ✅ doğru fonksiyon
      currentUser = username;
      currentUserTotalScore = 0;

      // localStorage'a kaydet
      localStorage.setItem("currentUser", currentUser);

      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("startScreen").style.display = "block";

      errorBox.textContent = "";
      showNotification(`🎊 Hoş geldin, ${username}! İlk kez oyun oynuyorsun.`);
    }
  } catch (err) {
    console.error("Hata oluştu:", err);
    errorBox.textContent = "Bir hata oluştu. Lütfen tekrar deneyin.";
  }
});
function showModernPopup(message, type = "info") {
  // Önceden varsa sil
  const existing = document.getElementById("modernPopup");
  if (existing) existing.remove();

  // Yeni popup oluştur
  const popup = document.createElement("div");
  popup.id = "modernPopup";
  popup.textContent = message;

  // Tipine göre renk ayarla
  let bg = "#2196f3"; // info
  if (type === "success") bg = "#4caf50";
  if (type === "error") bg = "#f44336";
  if (type === "warning") bg = "#ff9800";

  // Stilleri ekle
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = bg;
  popup.style.color = "#fff";
  popup.style.padding = "12px 24px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  popup.style.zIndex = "9999";
  popup.style.fontSize = "16px";
  popup.style.opacity = "0";
  popup.style.transition = "opacity 0.3s ease";

  // Ekrana ekle
  document.body.appendChild(popup);

  // Görünür yap
  requestAnimationFrame(() => {
    popup.style.opacity = "1";
  });

  // Otomatik kapat
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.remove();
    }, 300);
  }, 3000);
}

async function registerUser(username) {
  await db.collection("users").doc(username).set({
    username: username,
    totalScore: 0,
    bestScore:  0,
    gamesPlayed: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}




async function updateScore(newScore) {
  if (!window.currentUser) return;

  const userRef = db.collection("users").doc(window.currentUser);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const existingScore = userSnap.data().score;
    if (newScore > existingScore) {
      await userRef.update({ score: newScore });
    }
  }
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Oyun durumu
let gameStarted = false;
let player = { x: 200, y: 550, radius: 12, dir: 1, trail: [] };
let speed = 1.5; // Başlangıç hızı azaltıldı
let score = 0;
let lastTime = performance.now(); // FPS farkı için zaman takip
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

let totalScore = parseInt(localStorage.getItem("totalScore") || "0");
let bestScore = parseInt(localStorage.getItem("bestScore") || "0");
let achievements = JSON.parse(localStorage.getItem("achievements") || "[]");
let dailyStreak = parseInt(localStorage.getItem("dailyStreak") || "0");
let lastPlayDate = localStorage.getItem("lastPlayDate") || "";

// UI elementleri
const scoreBoard = document.getElementById("scoreBoard");
const streakDisplay = document.getElementById("streak");
const levelDisplay = document.getElementById("level");
const comboDisplay = document.getElementById("combo");
const gameOverDiv = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const personalBest = document.getElementById("personalBest");
const sessionStats = document.getElementById("sessionStats");
const achievementsDiv = document.getElementById("achievements");
const notification = document.getElementById("notification");
const startScreen = document.getElementById("startScreen");
const hud = document.getElementById("hud");

// Sabitler - Daha kolay oyun için ayarlar
const gapSize = 130; // Gap boyutu artırıldı
const obstacleHeight = 20;
const minGapX = 60; // Minimum kenar boşluğu artırıldı
let maxGapX = canvas.width - gapSize - 60;
const minVerticalSpacing = 160; // Dikey boşluk artırıldı

function showWelcomePopup(message) {
  const popup = document.getElementById("welcomePopup");
  if (!popup) return;

  popup.textContent = message;
  popup.style.display = "block";

  // Kapatmak için bekle
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

function resizeCanvas() {
  const gameContainer = document.getElementById("game");
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
  startScreen.style.display = "none";
  hud.style.display = "block";
  gameOverDiv.style.display = "none";

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
    trail: [],
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

document
  .getElementById("showAchievementsBtn")
  .addEventListener("click", showScoreList);
// Kullanıcı bazlı skor sistemi için değişkenler (mevcut değişkenlerin yerine)
let currentUser = localStorage.getItem("currentUser") || "";
let currentUserTotalScore = 0; // Bu satırı ekleyin
let userScores = JSON.parse(localStorage.getItem("userScores") || "{}");

// Kullanıcı bazlı skor fonksiyonları
async function getUserTotalScore(username) {
  try {
    const userDoc = await db.collection("users").doc(username).get();
    if (userDoc.exists) {
      return userDoc.data().totalScore || 0;
    } else {
      console.warn(`Kullanıcı bulunamadı: ${username}`);
      return 0;
    }
  } catch (error) {
    console.error("Toplam skor alınırken hata oluştu:", error);
    return 0;
  }
}

function getUserBestScore(username) {
  return userScores[username]?.bestScore || 0;
}
async function updateUserScore(newScore) {
  if (!currentUser) return;

  try {
    // Firebase'i güncelle
    await db
      .collection("users")
      .doc(currentUser)
      .update({
        totalScore: firebase.firestore.FieldValue.increment(newScore),
      });

    // Local değişkeni de güncelle
    currentUserTotalScore += newScore;

    console.log(
      `Skor güncellendi: +${newScore}, Yeni toplam: ${currentUserTotalScore}`
    );
  } catch (error) {
    console.error("Skor güncellenirken hata:", error);
  }
}

function restartGame() {
  // Önceki animasyonu durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Canvas'ı yeniden boyutlandır
  resizeCanvas();

  // Oyun değişkenlerini sıfırla
  resetGameVariables();

  // Oyun durumlarını ayarla
  isGameOver = false;
  gameStarted = true; // Bu satır eksikti!

  // UI elementlerini düzenle
  gameOverDiv.style.display = "none";
  hud.style.display = "block";

  // Oyunu başlat
  draw();
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
    localStorage.setItem("dailyStreak", dailyStreak.toString());
    localStorage.setItem("lastPlayDate", today);

    if (dailyStreak > 1) {
      showNotification(`🔥 ${dailyStreak} günlük seri!`);
      addAchievement(`${dailyStreak} günlük seri!`);
    }
  }
}

function addAchievement(text) {
  if (!achievements.includes(text)) {
    achievements.push(text);
    localStorage.setItem("achievements", JSON.stringify(achievements));

    // Safe DOM manipulation with error handling
    try {
      if (achievementsDiv) {
        const el = document.createElement("div");
        el.className = "achievement";
        el.textContent = text;
        achievementsDiv.appendChild(el);

        setTimeout(() => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 4000);
      }
    } catch (error) {
      console.log("Achievement display error:", error);
    }
  }
}

const returnToMenuBtn = document.getElementById("returnToMenuBtn");
if (returnToMenuBtn) {
  returnToMenuBtn.addEventListener("click", () => {
    returnToMenu();
  });
}

function showNotification(text, type = "error") {
  const notification = document.getElementById("notification");
  if (!notification) {
    console.warn("❌ #notification elementi bulunamadı");
    return;
  }

  notification.textContent = text;
  notification.style.display = "block";
  
  // Mesaj türüne göre renk
  switch(type) {
    case "success":
      notification.style.backgroundColor = "#4CAF50"; // Yeşil
      break;
    case "warning":
      notification.style.backgroundColor = "#FF9800"; // Turuncu
      break;
    case "error":
    default:
      notification.style.backgroundColor = "#f44336"; // Kırmızı
      break;
  }
  
  notification.style.color = "white";

  // Fade animasyonu
  notification.classList.remove("fade-in");
  void notification.offsetWidth;
  notification.classList.add("fade-in");

  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 40,
      color,
    });
  }
}

function updateParticles() {
  particles = particles.filter((p) => {
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
      type: Math.random() < 0.5 ? "score" : "slow",
      collected: false,
    });
  }
}

function drawPowerups(deltaTime) {
  for (let p of powerups) {
    p.y += speed * deltaTime;
    ctx.save();
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = p.type === "score" ? "#FFD700" : "#00FF00";
    ctx.fillText(p.type === "score" ? "💎" : "⏰", p.x, p.y);
    ctx.restore();

    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < player.radius + 15 && !p.collected) {
      p.collected = true;
      createParticles(p.x, p.y, p.type === "score" ? "#FFD700" : "#00FF00");
      if (p.type === "score") {
        const bonus = 50 * combo;
        score += bonus;
        showNotification(`💎 +${Math.floor(bonus)} bonus!`);
      } else {
        speed = Math.max(1.2, speed - 0.3); // Minimum hız artırıldı
        showNotification("⏰ Yavaşlatma!");
      }
    }
  }

  powerups = powerups.filter((p) => p.y < canvas.height + 50 && !p.collected);
}
// Game over fonksiyonunda Firebase skor güncellemesi
async function gameOver() {
  const gameScore = Math.floor(score);
  console.log("🛑 gameOver başladı | Skor:", gameScore);
  
  // Debug - Değerleri kontrol et
  console.log("🔍 currentUser:", currentUser);
  console.log("🔍 gameScore:", gameScore);
  console.log("🔍 typeof currentUser:", typeof currentUser);
  console.log("🔍 currentUser boş mu:", !currentUser);
  console.log("🔍 gameScore <= 0 mu:", gameScore <= 0);

  if (!currentUser || gameScore <= 0) {
    console.warn("❌ currentUser boş veya skor 0 - Firebase çağrısı yapılmayacak");
    console.warn("❌ currentUser:", currentUser, "| gameScore:", gameScore);
    return;
  }

  console.log("✅ Kontroller geçildi, devam ediliyor...");

  // Animasyonu durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    console.log("✅ Animation durduruldu");
  }

  isGameOver = true;
  gameStarted = false;
  sessionGames++;

  console.log("✅ Oyun durumu ayarlandı");
  console.log("📊 isGameOver:", isGameOver);
  console.log("📊 gameStarted:", gameStarted);
  console.log("📊 sessionGames:", sessionGames);

  hud.style.display = "none";
  gameOverDiv.style.display = "block";
  
  console.log("✅ UI elementleri ayarlandı");

  try {
    console.log("🔄 Firebase çağrısı başlatılıyor...");
    console.log("📤 Gönderilecek veriler - User:", currentUser, "| Score:", gameScore);
    
    const result = await updateAllUserStatsFirebase(currentUser, gameScore);
    
    console.log("📈 Firebase sonucu alındı:", result);
    console.log("🏆 Yeni rekor mu:", result.isNewRecord);
    console.log("📊 En iyi skor:", result.bestScore);
    console.log("📊 Toplam skor:", result.totalScore);
    console.log("📊 Oynama sayısı:", result.gamesPlayed);

    // UI Güncellemeleri
    if (finalScore) {
      const message = result.isNewRecord
        ? "🏆 YENİ REKOR! 🏆<br>"
        : "🎮 Oyun Bitti!<br>";
      finalScore.innerHTML = message + `Skorun: ${gameScore}`;
      console.log("✅ Final score güncellendi:", finalScore.innerHTML);
    } else {
      console.warn("⚠️ finalScore elementi bulunamadı");
    }

    if (personalBest) {
      personalBest.innerHTML = `🥇 En İyi: ${result.bestScore}`;
      console.log("✅ Personal best güncellendi:", personalBest.innerHTML);
    } else {
      console.warn("⚠️ personalBest elementi bulunamadı");
    }

    if (sessionStats) {
      sessionStats.innerHTML = `📊 ${currentUser} toplam: ${result.totalScore} | Oynama: ${result.gamesPlayed}`;
      console.log("✅ Session stats güncellendi:", sessionStats.innerHTML);
    } else {
      console.warn("⚠️ sessionStats elementi bulunamadı");
    }

    console.log("✅ Tüm UI güncellemeleri tamamlandı");
    console.log("✅ Firebase verileri başarıyla kaydedildi");

  } catch (err) {
    console.error("🔥 Firebase güncelleme hatası:", err);
    console.error("🔥 Hata detayları:", err.message);
    console.error("🔥 Hata stack:", err.stack);
    
    // Hata durumunda UI'yi yine de güncelle (offline durumu için)
    if (finalScore) {
      finalScore.innerHTML = `🎮 Oyun Bitti!<br>Skorun: ${gameScore}`;
    }
    if (personalBest) {
      personalBest.innerHTML = `🥇 En İyi: --`;
    }
    if (sessionStats) {
      sessionStats.innerHTML = `📊 Bağlantı hatası - Veriler kaydedilemedi`;
    }
  }

  console.log("🏁 gameOver() fonksiyonu tamamlandı");
}


async function updateAllUserStatsFirebase(username, newScore) {
  try {
    console.log(`📤 ${username} için tüm veriler güncelleniyor...`);
    console.log(`🎯 Yeni skor: ${newScore}`);
    
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();
    
    let userData = {
      bestScore: 0,
      totalScore: 0,
      gamesPlayed: 0,
      username: username,
      createdAt: new Date()
    };
    
    // Mevcut verileri al
    if (userDoc.exists) {
      userData = { ...userData, ...userDoc.data() };
    }
    
    // Güncellemeleri yap
    const updatedData = {
      ...userData,
      totalScore: (userData.totalScore || 0) + newScore,
      gamesPlayed: (userData.gamesPlayed || 0) + 1,
      lastPlayed: new Date()
    };
    
    // Best score kontrolü
    let isNewRecord = false;
    if (newScore > (userData.bestScore || 0)) {
      updatedData.bestScore = newScore;
      isNewRecord = true;
    }
    
    console.log('📊 Güncellenecek veriler:', updatedData);
    
    // Firebase'e gönder
    await userRef.set(updatedData, { merge: true });
    
    console.log('✅ Firebase güncelleme başarılı');
    
    return {
      isNewRecord: isNewRecord,
      totalScore: updatedData.totalScore,
      gamesPlayed: updatedData.gamesPlayed,
      bestScore: updatedData.bestScore
    };
    
  } catch (error) {
    console.error('❌ Firebase güncelleme hatası:', error);
    return {
      isNewRecord: false,
      totalScore: currentUserTotalScore + newScore,
      gamesPlayed: 0,
      bestScore: 0
    };
  }
}
// Firebase'den skor listesini çekme
async function showFirebaseScoreList() {
  try {
    const list = document.getElementById("scoreItems");
    if (!list) return;

    list.innerHTML = "<li>Yükleniyor...</li>";

    // En yüksek skorları çek
    const snapshot = await db
      .collection("users")
      .orderBy("bestScore", "desc")
      .limit(10)
      .get();

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<li>Henüz hiç kullanıcı yok.</li>";
    } else {
      let rank = 1;
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const li = document.createElement("li");

        // Emoji ve renk sistemi
        let rankEmoji = "";
        if (rank === 1) rankEmoji = "🥇";
        else if (rank === 2) rankEmoji = "🥈";
        else if (rank === 3) rankEmoji = "🥉";
        else rankEmoji = `${rank}.`;

        li.innerHTML = `
                   <span class="rank">${rankEmoji}</span>
                   <span class="username">${userData.username}</span>
                   <span class="best-score">${userData.bestScore || 0}</span>
                   <span class="total-score">(Toplam: ${
                     userData.totalScore || 0
                   })</span>
               `;

        if (userData.username === currentUser) {
          li.classList.add("current-user");
        }

        list.appendChild(li);
        rank++;
      });
    }

    const scoreListEl = document.getElementById("scoreList");
    if (scoreListEl) scoreListEl.style.display = "block";
  } catch (error) {
    console.error("Skor listesi yükleme hatası:", error);
    const list = document.getElementById("scoreItems");
    if (list) {
      list.innerHTML = "<li>Skor listesi yüklenemedi.</li>";
    }
  }
}

// Event listener'ı güncelle
document
  .getElementById("showAchievementsBtn")
  .addEventListener("click", showFirebaseScoreList);
// Kullanıcı adı kontrol fonksiyonu
async function checkUsernameAvailability(username) {
  try {
    const snapshot = await db.collection("users").doc(username).get();
    return !snapshot.exists; // True = kullanılabilir, False = alınmış
  } catch (error) {
    console.error("Kullanıcı adı kontrolü hatası:", error);
    return false;
  }
}

// Yeni kullanıcı kaydetme
async function registerUser(username) {
  try {
    // Önce kontrol et
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
      throw new Error("Bu kullanıcı adı zaten alınmış!");
    }

    // Kullanıcıyı kaydet
    await db.collection("users").doc(username).set({
      username: username,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      totalScore: 0,
      bestScore: 0,
      gamesPlayed: 0,
    });

    return true;
  } catch (error) {
    console.error("Kullanıcı kayıt hatası:", error);
    throw error;
  }
}

// Gerçek zamanlı kullanıcı adı kontrolü
function setupRealtimeUsernameCheck() {
  const usernameInput = document.getElementById("usernameInput");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  let checkTimeout;

  usernameInput.addEventListener("input", (e) => {
    const username = e.target.value.trim();

    // Önceki timeout'u temizle
    clearTimeout(checkTimeout);

    if (username.length < 2) {
      loginError.textContent = "Kullanıcı adı en az 2 karakter olmalıdır.";
      loginBtn.disabled = true;
      return;
    }

    if (username.length > 20) {
      loginError.textContent = "Kullanıcı adı en fazla 20 karakter olabilir.";
      loginBtn.disabled = true;
      return;
    }

    // Özel karakterleri kontrol et
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      loginError.textContent = "Sadece harf, rakam ve _ kullanabilirsiniz.";
      loginBtn.disabled = true;
      return;
    }

    // Loading göster
    loginError.textContent = "Kontrol ediliyor...";
    loginError.style.color = "#ffa500";
    loginBtn.disabled = true;

    // 500ms sonra kontrol et (spam önleme)
    checkTimeout = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) {
          loginError.textContent = "✅ Kullanıcı adı kullanılabilir!";
          loginError.style.color = "#4CAF50";
          loginBtn.disabled = false;
        } else {
          loginError.textContent = "❌ Bu kullanıcı adı zaten alınmış!";
          loginError.style.color = "#f44336";
          loginBtn.disabled = true;
        }
      } catch (error) {
        loginError.textContent = "Bağlantı hatası, tekrar deneyin.";
        loginError.style.color = "#f44336";
        loginBtn.disabled = true;
      }
    }, 500);
  });
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
    ctx.arc(
      player.trail[i].x,
      player.trail[i].y,
      player.radius * (i / player.trail.length),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = combo > 5 ? "#FFD700" : "#fff";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = combo > 5 ? "#FFD700" : "#fff";
  ctx.shadowColor = combo > 5 ? "#FFD700" : "#1D77C0";
  ctx.shadowBlur = 12 + combo * 2;
  ctx.fill();
  ctx.restore();
}

function drawObstacles(deltaTime) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.shadowColor = "#13294B";
  ctx.shadowBlur = 8;

  for (let obs of obstacles) {
    ctx.fillRect(0, obs.y, obs.gapX, obstacleHeight);
    ctx.fillRect(
      obs.gapX + gapSize,
      obs.y,
      canvas.width - (obs.gapX + gapSize),
      obstacleHeight
    );
    obs.y += speed * deltaTime;

    if (!obs.passed && obs.y > player.y) {
      obs.passed = true;
      streak++;
      combo = Math.min(combo + 0.2, 8); // Combo artışı azaltıldı
      perfectHits++;
      const centerX = obs.gapX + gapSize / 2;
      const distance = Math.abs(player.x - centerX);
      const bonus = Math.floor(10 * combo);
      score += bonus;

      if (distance < 30) {
        // Perfect hit aralığı genişletildi
        const perfectBonus = Math.floor(20 * combo);
        score += perfectBonus;
        createParticles(player.x, player.y, "#FFD700");
        showNotification(`⭐ Mükemmel! +${perfectBonus + bonus}`);
      } else {
        createParticles(player.x, player.y, "#ffffff");
      }

      checkAchievements();
    }
  }
  ctx.restore();
}

function drawBackgroundElements() {
  const t = Date.now() * 0.001;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
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
  if (streak === 10) addAchievement("🎯 10 seri geçiş!");
  if (streak === 25) addAchievement("🔥 25 seri geçiş!");
  if (streak === 50) addAchievement("👑 50 seri geçiş!");
  if (perfectHits === 5) addAchievement("⭐ 5 mükemmel!");
  if (perfectHits === 15) addAchievement("💫 15 mükemmel!");
  if (score > 500) addAchievement("🎊 500 puan!");
  if (score > 1000) addAchievement("🏆 1000 puan!");
  if (level === 5) addAchievement("📈 Seviye 5!");
  if (level === 10) addAchievement("🚀 Seviye 10!");
  if (combo >= 5) addAchievement("⚡ 5x Kombo!");
  if (combo >= 8) addAchievement("💥 8x Kombo!");
}

function updateLevel() {
  const newLevel = Math.floor(score / 200) + 1; // Level artışı yavaşlatıldı
  if (newLevel > level) {
    level = newLevel;
   speed += 9 * (1 / 60); // FPS ne olursa olsun yaklaşık 0.15 gibi artar

    showNotification(`🆙 Seviye ${level}!`);
    createParticles(player.x, player.y, "#00FF00");
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
  if (scoreBoard) scoreBoard.textContent = "Skor: " + Math.floor(score);
  if (streakDisplay) streakDisplay.textContent = "🔥 Seri: " + streak;
  if (levelDisplay) levelDisplay.textContent = "📊 Seviye: " + level;
  if (comboDisplay) comboDisplay.textContent = "⚡ Kombo: x" + combo.toFixed(1);
}

function draw() {
  if (isGameOver || !gameStarted) {
    return;
  }

  try {
    // ZAMAN FARKINI HESAPLA
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000; // saniye cinsinden
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundElements();
    drawPlayer();
    drawObstacles(deltaTime); // parametre ile gönderilecek
    drawPowerups(deltaTime); // parametre ile gönderilecek
    drawParticles();
    updateParticles();

    // Oyuncu hareketi
    const moveSpeed = speed * 1.2;
    player.x += player.dir * moveSpeed * deltaTime;

    // Kenarlarda zıplama
    if (
      player.x - player.radius <= 0 ||
      player.x + player.radius >= canvas.width
    ) {
      player.dir *= -1;
      player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x)
      );
      createParticles(player.x, player.y, "#ffffff");
    }

    // Çarpışma kontrolü
    try {
      if (checkCollision()) {
        gameOver();
        return;
      }
    } catch (error) {
      console.log("Collision check error:", error);
    }

    // Skor artışı
    score += 0.1 * combo * deltaTime;
    updateLevel();
    updateUI();

    // Power-up oluşturma
    if (Math.random() < 0.005) createPowerup();

    // Yeni engel oluşturma
    if (
      obstacles.length === 0 ||
      obstacles.at(-1).y > -minVerticalSpacing * 0.8
    ) {
      createObstacle();
    }

    // Eski engelleri temizle
    obstacles = obstacles.filter(
      (obs) => obs.y < canvas.height + obstacleHeight
    );

    // Devam et
    animationId = requestAnimationFrame(draw);
  } catch (error) {
    console.log("Draw function error:", error);
    gameOver();
  }
}


// Instagram Paylaşım Fonksiyonu
function shareScore() {
  const text = `🎯 IGÜ ZigZag Rota'da ${Math.floor(
    score
  )} puan aldım! 🔥 Seri: ${streak}, 📊 Seviye: ${level} ${
    currentUser ? `- ${currentUser}` : ""
  }`;
  const instagramUsername = "ogrenci.dekanligi";
  const instagramUrl = "https://www.instagram.com/ogrenci.dekanligi/";

  // Debug için konsola yazdır
  console.log("Share fonksiyonu çalıştırılıyor...");
  console.log("Paylaşılacak metin:", text);

  // Önce skoru panoya kopyala
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Metin panoya kopyalandı");
      })
      .catch((err) => {
        console.error("Panoya kopyalama hatası:", err);
        fallbackCopyTextToClipboard(text);
      });
  } else {
    fallbackCopyTextToClipboard(text);
  }

  // Mobil cihaz kontrolü
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    console.log("Mobil cihaz tespit edildi");

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      const instagramAppUrl = `instagram://user?username=${instagramUsername}`;

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = instagramAppUrl;
      document.body.appendChild(iframe);

      setTimeout(() => {
        document.body.removeChild(iframe);
        window.open(instagramUrl, "_blank");
      }, 1000);
    } else {
      try {
        const intentUrl = `intent://instagram.com/_u/${instagramUsername}/#Intent;package=com.instagram.android;scheme=https;end`;
        window.location.href = intentUrl;

        setTimeout(() => {
          window.open(instagramUrl, "_blank");
        }, 2000);
      } catch (error) {
        console.error("Instagram açma hatası:", error);
        window.open(instagramUrl, "_blank");
      }
    }
  } else {
    console.log("Masaüstü cihaz tespit edildi");
    const newWindow = window.open(instagramUrl, "_blank");

    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed == "undefined"
    ) {
      alert(
        "Pop-up engelleyici aktif! Lütfen bu site için pop-up'lara izin verin."
      );
      console.error("Pop-up engellendi");
    } else {
      console.log("Instagram sayfası açıldı");
    }
  }

  if (typeof showNotification === "function") {
    showNotification("📱 Instagram'a yönlendirildi! Skor panoya kopyalandı.");
  } else {
    console.log("📱 Instagram'a yönlendirildi! Skor panoya kopyalandı.");
  }
}

// Eski tarayıcılar için fallback kopyalama fonksiyonu
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Görünmez yap ama erişilebilir tut
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    const msg = successful ? "başarılı" : "başarısız";
    console.log("Fallback kopyalama " + msg);
  } catch (err) {
    console.error("Fallback kopyalama hatası", err);
  }

  document.body.removeChild(textArea);
}

// Paylaş butonuna event listener ekle
document.addEventListener("DOMContentLoaded", function () {
  const shareBtn = document.getElementById("shareScoreBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", shareScore);
    console.log("Paylaş butonu event listener'ı eklendi");
  } else {
    console.error("shareScoreBtn bulunamadı!");
  }
});

// Eski tarayıcılar için fallback kopyalama fonksiyonu
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Görünmez yap ama erişilebilir tut
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    const msg = successful ? "başarılı" : "başarısız";
    console.log("Fallback kopyalama " + msg);
  } catch (err) {
    console.error("Fallback kopyalama hatası", err);
  }

  document.body.removeChild(textArea);
}

// Kontroller
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (!isGameOver && gameStarted) {
      player.dir *= -1;
     speed += 0.5 * (1 / 60); // Sabit değer gibi davranır (ortalama 60 FPS'e göre)
      createParticles(player.x, player.y, "#ffffff");
    }
  },
  { passive: false }
);

canvas.addEventListener("click", () => {
  if (!isGameOver && gameStarted) {
    player.dir *= -1;
    speed += 0.5 * (1 / 60); // Sabit değer gibi davranır (ortalama 60 FPS'e göre)
    createParticles(player.x, player.y, "#ffffff");
  }
});

document.addEventListener("keydown", (e) => {
  if (
    (e.code === "Space" || e.code === "ArrowLeft" || e.code === "ArrowRight") &&
    !isGameOver &&
    gameStarted
  ) {
    e.preventDefault();
    player.dir *= -1;
    speed += 0.5 * (1 / 60); // ✅ Sabit hız artışı

    createParticles(player.x, player.y, "#ffffff");
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

  // Kullanıcı varsa başlangıç ekranına, yoksa login ekranına git
  if (currentUser) {
    showStartScreen();
  } else {
    showLoginScreen();
  }
  document.getElementById("hud").style.display = "none";
  document.getElementById("gameOver").style.display = "none";
}

// Skor listesini gösterme fonksiyonu
function showScoreList() {
  const list = document.getElementById("scoreItems");
  if (!list) return;

  list.innerHTML = "";

  // Kullanıcı skorlarını al ve sırala
  const sortedUsers = Object.entries(userScores)
    .map(([username, data]) => ({
      username: username,
      bestScore: data.bestScore,
    }))
    .sort((a, b) => b.bestScore - a.bestScore); // En yüksekten en düşüğe

  if (sortedUsers.length === 0) {
    list.innerHTML = "<li>Henüz hiç kullanıcı yok.</li>";
  } else {
    sortedUsers.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = `${user.username} = ${user.bestScore}`;
      list.appendChild(li);
    });
  }

  const scoreListEl = document.getElementById("scoreList");
  if (scoreListEl) scoreListEl.style.display = "block";
}
function submitScore() {
  const username = document.getElementById("username").value.trim();
  const score = parseInt(document.getElementById("finalScore").innerText || 0);

  if (!username) {
    alert("Kullanıcı adı boş olamaz.");
    return;
  }
}

// Login ekranı fonksiyonları

// Login ekranı fonksiyonları
function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("hud").style.display = "none";
  document.getElementById("gameOver").style.display = "none";
}

// Gelişmiş login fonksiyonu
async function handleAdvancedLogin() {
  const usernameInput = document.getElementById("usernameInput");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  const username = usernameInput.value.trim().toLowerCase();
  const storedUser = localStorage.getItem("currentUser");
  let knownUsers = JSON.parse(localStorage.getItem("knownUsers") || "{}");

  if (!username) {
    showNotification("⚠️ Lütfen kullanıcı adınızı girin.", "warning");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-icon">⏳</span> Kontrol ediliyor...';

    const userSnapshot = await db.collection("users").doc(username).get();

    // Bu kullanıcı başka cihazda kayıtlıysa → izin verme
    if (userSnapshot.exists && !knownUsers[username]) {
      showModernPopup("Bu kullanıcı adı başka bir cihazda kayıtlı. Lütfen farklı bir kullanıcı adı seçin.", "error");
      showNotification("❌ Bu kullanıcı adı bu cihaza ait değil.", "error");
      loginError.textContent = "Bu kullanıcı adı bu cihaza ait değil.";
      loginError.style.color = "#f44336";
      return;
    }

    // Yeni kullanıcı mı?
    let isFirstTime = false;
    if (!userSnapshot.exists) {
      await registerUser(username);
      isFirstTime = true;
    }

    // Kullanıcıyı tanımla
    currentUser = username;
    currentUserTotalScore = userSnapshot.data()?.totalScore || 0;

    // Kullanıcıyı yerelde kaydet
    knownUsers[username] = true;
    localStorage.setItem("knownUsers", JSON.stringify(knownUsers));
    localStorage.setItem("currentUser", currentUser);

    // Giriş ekranını kapat, başlangıcı göster
    showStartScreen();

    // Karşılama mesajı
    const welcomeText = isFirstTime
      ? `🎊 Hoş geldin, ${username}! İlk kez oyun oynuyorsun.`
      : `🎉 Tekrar hoş geldin, ${username}!`;

    showNotification(welcomeText, "success");

    // Popup animasyonlu göster
    const uppercaseUsername = username.toLocaleUpperCase("tr-TR");

    showWelcomePopup(
      isFirstTime
        ? `🎊 Hoş geldin ${username.toUpperCase("tr-TR")}!`
        : `🎉 Tekrar hoş geldin ${username.toUpperCase("tr-TR")}!`
    );

    // Sayfada karşılama metni güncelle (isteğe bağlı)
    const welcomeMessage = document.getElementById("welcomeMessage");
    if (welcomeMessage) {
      welcomeMessage.textContent = welcomeText;
    }

  } catch (error) {
    console.error("Login hatası:", error);
    showNotification("🚨 Giriş hatası oluştu. Lütfen tekrar deneyin.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="btn-icon">💾</span> Kaydet ve Başla';
  }
}




// Modern popup fonksiyonu
function showModernPopup(message, type = 'error') {
  // Overlay oluştur
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;

  // Popup içeriği
  const popup = document.createElement('div');
  const iconMap = { error: '❌', warning: '⚠️', success: '✅' };
  
  popup.style.cssText = `
    background: white;
    border-radius: 15px;
    padding: 25px;
    max-width: 350px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
  `;

  popup.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 15px;">${iconMap[type] || '❌'}</div>
    <div style="font-size: 16px; color: #333; margin-bottom: 20px; line-height: 1.4;">${message}</div>
    <button onclick="this.closest('[data-popup]').remove()" 
            style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; 
                   padding: 10px 25px; border-radius: 20px; font-size: 14px; font-weight: 600; 
                   cursor: pointer; transition: transform 0.2s ease;"
            onmouseover="this.style.transform='translateY(-1px)'" 
            onmouseout="this.style.transform='translateY(0)'">Tamam</button>
  `;

  overlay.setAttribute('data-popup', 'true');
  overlay.appendChild(popup);
  
  // CSS animasyonları ekle
  if (!document.querySelector('#popup-animations')) {
    const style = document.createElement('style');
    style.id = 'popup-animations';
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideIn { from { transform: scale(0.8) translateY(-20px); opacity: 0; } 
                          to { transform: scale(1) translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
  
  // ESC ile kapatma
  const closeOnEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', closeOnEsc);
    }
  };
  document.addEventListener('keydown', closeOnEsc);
}
// Güncellenmiş showNotification fonksiyonu
function showNotification(text, type = "error") {
  const notification = document.getElementById("notification");
  if (!notification) {
    
    console.warn("❌ #notification elementi bulunamadı");
    return;
  }

  notification.textContent = text;
  notification.style.display = "block";
  
  // Mesaj türüne göre renk ayarlama
  switch(type) {
    case "success":
      notification.style.backgroundColor = "#4CAF50"; // Yeşil
      break;
    case "warning":
      notification.style.backgroundColor = "#FF9800"; // Turuncu
      break;
    case "error":
    default:
      notification.style.backgroundColor = "#f44336"; // Kırmızı
      break;
  }
  
  notification.style.color = "white";

  // Fade animasyonu
  notification.classList.remove("fade-in");
  void notification.offsetWidth; // Reflow zorlamak için
  notification.classList.add("fade-in");

  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}



function changeUser() {
  // Mevcut oyunu durdur
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  gameStarted = false;
  isGameOver = false;

  // Şu anki kullanıcıyı unut (cihaz geçmişi saklanacak)
  localStorage.removeItem("currentUser");

  // Login ekranına dön
  showLoginScreen();

  // Giriş alanını temizle
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.value = "";
  }
}


// DOMContentLoaded event listener'ı - TEK YER!
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🌐 DOM yüklendi");

  // 🧠 localStorage'dan kullanıcıyı al
  const storedUser = localStorage.getItem("currentUser");
  let currentUser = "";
  let currentUserTotalScore = 0;

  if (storedUser) {
    console.log("🔐 Kaydedilmiş kullanıcı bulundu:", storedUser);
    try {
      const userDoc = await db.collection("users").doc(storedUser).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        currentUser = storedUser;
        currentUserTotalScore = userData.totalScore || 0;
        console.log("✅ Kullanıcının toplam skoru:", currentUserTotalScore);
        showStartScreen();
      } else {
        console.warn("⚠️ Kullanıcı Firebase'de bulunamadı");
        localStorage.removeItem("currentUser");
        showLoginScreen();
      }
    } catch (error) {
      console.error("🚨 Firebase'den kullanıcı verisi alınamadı:", error);
      showLoginScreen();
    }
  } else {
    console.log("👤 Kayıtlı kullanıcı yok");
    showLoginScreen();
  }

  // ✅ Login butonu
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleAdvancedLogin();
    });
  }

  // ✅ Enter ile login
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdvancedLogin();
      }
    });
  }

  // ✅ Skoru gönder (submitScoreBtn varsa)
  const submitScoreBtn = document.getElementById("submitScoreBtn");
  if (submitScoreBtn) {
    submitScoreBtn.addEventListener("click", async () => {
      const username = currentUser || usernameInput.value.trim().toLowerCase();
      const scoreText = document.getElementById("finalScore")?.innerText || "0";
      const score = parseInt(scoreText.match(/\d+/)?.[0] || "0");

      if (!username || isNaN(score)) {
        alert("Geçerli kullanıcı adı veya skor bulunamadı.");
        return;
      }

      const userRef = db.collection("scores").doc(username);

      try {
        const doc = await userRef.get();

        if (doc.exists) {
          const currentScore = doc.data().score || 0;
          const newScore = currentScore + score;

          await userRef.update({
            score: newScore,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });

          alert(`Skor güncellendi! Yeni toplam: ${newScore}`);
        } else {
          await userRef.set({
            username,
            score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });

          alert("Skor başarıyla kaydedildi!");
        }
      } catch (error) {
        console.error("❌ Skor gönderme hatası:", error);
        alert("Skor gönderilemedi.");
      }
    });
  }

  // ✅ Paylaş butonu
  const shareBtn = document.getElementById("shareScoreBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", shareScore);
  }

  // ✅ Başlat / yeniden başlat butonları
  const startMain = document.getElementById("startButtonMain");
  const startRestart = document.getElementById("startButtonRestart");

  if (startMain) startMain.addEventListener("click", startGame);
  if (startRestart) startRestart.addEventListener("click", restartGame);

  // ✅ Kullanıcı değiştir
  const changeUserBtn = document.getElementById("changeUserBtn");
  if (changeUserBtn) changeUserBtn.addEventListener("click", changeUser);

  // ✅ Skor listesi
  const showAchievementsBtn = document.getElementById("showAchievementsBtn");
  if (showAchievementsBtn)
    showAchievementsBtn.addEventListener("click", showScoreList);

  const closeScoreListBtn = document.getElementById("closeScoreList");
  if (closeScoreListBtn)
    closeScoreListBtn.addEventListener("click", hideScoreList);
});

function showStartScreen() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("startScreen").style.display = "block";

  // Giriş yapan kullanıcıyı al
  const welcomeUser = currentUser || localStorage.getItem("currentUser") || "Oyuncu";

  // Mesajı güncelle
  const welcomeMessage = document.getElementById("welcomeMessage");
  if (welcomeMessage) {
    welcomeMessage.textContent = `🎉 Hoş geldin, ${welcomeUser}!`;
  }
}

function hideScoreList() {
  const scoreListEl = document.getElementById("scoreList");
  if (scoreListEl) scoreListEl.style.display = "none";
}
async function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML = ""; // Önce temizle

  try {
    const snapshot = await db
      .collection("scores")
      .orderBy("score", "desc")
      .limit(3)
      .get();

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${data.username} - ${data.score} puan`;
      leaderboardList.appendChild(li);
    });
  } catch (error) {
    console.error("Liderlik tablosu yüklenemedi:", error);
  }
}

// Skor güncelleme fonksiyonu (Firebase ile)
async function updateUserScoreFirebase(username, gameScore) {
  try {
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const newTotalScore = (userData.totalScore || 0) + Math.floor(gameScore);
      const currentBestScore = userData.bestScore || 0;
      const newBestScore = Math.max(currentBestScore, Math.floor(gameScore));
      const gamesPlayed = (userData.gamesPlayed || 0) + 1;

      // Kullanıcı verilerini güncelle
      await userRef.update({
        totalScore: newTotalScore,
        bestScore: newBestScore,
        gamesPlayed: gamesPlayed,
        lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Oyun skorunu kaydet
      await db.collection("scores").add({
        username: username,
        score: Math.floor(gameScore),
        level: level,
        streak: streak,
        combo: combo,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return newBestScore === Math.floor(gameScore); // Yeni rekor mu?
    }

    return false;
  } catch (error) {
    console.error("Skor güncelleme hatası:", error);
    return false;
  }
}

// Skor tablosunu Firebase'den çekme
async function showFirebaseScoreList() {
  try {
    const list = document.getElementById("scoreItems");
    if (!list) return;

    list.innerHTML = "<li>Yükleniyor...</li>";

    // En yüksek skorları çek
    const snapshot = await db
      .collection("users")
      .orderBy("bestScore", "desc")
      .limit(10)
      .get();

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<li>Henüz hiç kullanıcı yok.</li>";
    } else {
      let rank = 1;
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const li = document.createElement("li");

        // Emoji ve renk sistemi
        let rankEmoji = "";
        if (rank === 1) rankEmoji = "🥇";
        else if (rank === 2) rankEmoji = "🥈";
        else if (rank === 3) rankEmoji = "🥉";
        else rankEmoji = `${rank}.`;

        li.innerHTML = `
                    <span class="rank">${rankEmoji}</span>
                    <span class="username">${userData.username}</span>
                    <span class="score">${userData.bestScore}</span>
                `;

        if (userData.username === currentUser) {
          li.classList.add("current-user");
        }

        list.appendChild(li);
        rank++;
      });
    }

    const scoreListEl = document.getElementById("scoreList");
    if (scoreListEl) scoreListEl.style.display = "block";
  } catch (error) {
    console.error("Skor listesi yükleme hatası:", error);
    const list = document.getElementById("scoreItems");
    if (list) {
      list.innerHTML = "<li>Skor listesi yüklenemedi.</li>";
    }
  }
}
window.addEventListener("DOMContentLoaded", loadLeaderboard);
// Butonlar
console.log("script.js yüklendi");

const startMain = document.getElementById("startButtonMain");
const startRestart = document.getElementById("startButtonRestart");

if (startMain) {
  startMain.addEventListener("click", () => {
    startGame();
  });
}

if (startRestart) {
  startRestart.addEventListener("click", () => {
    restartGame();
  });
}

// Başlangıç
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
