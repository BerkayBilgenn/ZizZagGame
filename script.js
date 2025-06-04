// Giriş butonu

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
  let knownUsers = JSON.parse(localStorage.getItem("knownUsers") || "{}");
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

async function registerUser(docId, originalName) {
  await db.collection("users").doc(docId).set({
    username: originalName, // kullanıcıya gösterilecek hali
    totalScore: 0,
    bestScore: 0,
    gamesPlayed: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}


async function updateScore(newScore) {
  if (!window.currentUser) return;

  const userRef = db.collection("users").doc(window.currentUser);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const existingBest = userSnap.data().bestScore || 0;
    if (newScore > existingBest) {
      await userRef.update({ bestScore: newScore });
    }
  }
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Oyun durumu
let lastTime = performance.now(); // FPS farkı için zaman takip
let lastPowerupTime = 0;
const POWERUP_INTERVAL = 5000;   // 5 saniyede bir şans dene
const POWERUP_CHANCE = 0.2;      // %20 ihtimal
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
const popup = document.querySelector('.welcome-popup');
popup.addEventListener('animationend', () => {
  popup.style.display = 'none';
});
document.body.classList.add("game-active");

function showWelcomeBackMessage(username, loginCount) {
  const lastLogin = localStorage.getItem("lastLoginTime");
  const lastLoginDate = lastLogin ? new Date(lastLogin) : null;

  let welcomeMessage = `🎉 Tekrar hoşgeldin, ${username}!`;

  if (loginCount > 1) {
    welcomeMessage += `\n🔄 Bu ${loginCount}. girişin.`;
  }

  if (lastLoginDate) {
    const timeDiff = new Date() - lastLoginDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      welcomeMessage += `\n⏰ Bugün tekrar oyuna döndün!`;
    } else if (daysDiff === 1) {
      welcomeMessage += `\n📅 Dün son kez oynamıştın.`;
    } else if (daysDiff > 1) {
      welcomeMessage += `\n📅 ${daysDiff} gün önce son kez oynamıştın.`;
    }
  }

  // Hoşgeldin mesajını göster (toast, modal veya alert olarak)
  showWelcomeToast(welcomeMessage);

  // Console'a da yazdır
  console.log("🎉 " + welcomeMessage.replace(/\n/g, " "));
}
function showFirstTimeWelcome(username) {
  const welcomeMessage = `👋 Hoşgeldin, ${username}!\n🎮 İlk kez oynuyorsun, eğlence başlasın!`;
  showWelcomeToast(welcomeMessage);
  console.log("👋 İlk kez hoşgeldin:", username);
}
function showWelcomeToast(message) {
  // Eğer sayfanızda toast sistemi varsa onu kullanın
  // Yoksa basit bir alert veya custom modal gösterebilirsiniz

  // Örnek: Custom toast div'i oluştur
  const toast = document.createElement("div");
  toast.className = "welcome-toast";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 1000;
    font-family: Arial, sans-serif;
    max-width: 300px;
    white-space: pre-line;
    animation: slideIn 0.5s ease-out;
  `;

  // CSS animasyon ekle
  if (!document.querySelector("style[data-toast]")) {
    const style = document.createElement("style");
    style.setAttribute("data-toast", "true");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // 5 saniye sonra kaldır
  setTimeout(() => {
    toast.style.animation = "slideOut 0.5s ease-in";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 500);
  }, 5000);

  // Tıklayınca kapat
  toast.addEventListener("click", () => {
    toast.style.animation = "slideOut 0.5s ease-in";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 500);
  });
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
  lastTime = performance.now(); // FPS normalizasyonu için

  console.log("✅ startGame çalıştı");
  console.log("gameStarted:", gameStarted, "isGameOver:", isGameOver);

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
  combo = 1;
  perfectHits = 0;
  streak = 0;
  obstacles = [];
  powerups = [];
  particles = [];
}

document.addEventListener("DOMContentLoaded", function () {
  const showAchievementsBtn = document.getElementById("showAchievementsBtn");
  if (showAchievementsBtn) {
    showAchievementsBtn.addEventListener("click", showScoreList);
  }
});

// Kullanıcı bazlı skor sistemi için değişkenler (mevcut değişkenlerin yerine)
window.currentUser = localStorage.getItem("currentUser") || "";
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

window.addEventListener("load", () => {
  setupRealtimeUserCount();
});


// Toplam kullanıcı sayısını hem başta hem de anlık olarak güncelleyen fonksiyon
function setupRealtimeUserCount() {
  const totalUserElement = document.getElementById("totalUserCount");
  if (!totalUserElement) {
    console.warn("❌ #totalUserCount elementi bulunamadı!");
    return;
  }

  // 1. Başlangıçta bir defa yükle
  db.collection("users").get().then(snapshot => {
    totalUserElement.textContent = `Toplam ${snapshot.size} oyuncu katıldı 🎮`;
  }).catch(error => {
    console.error("❌ İlk kullanıcı sayısı alınamadı:", error);
  });

  // 2. Gerçek zamanlı olarak Firestore'dan dinle
  db.collection("users").onSnapshot(snapshot => {
    totalUserElement.textContent = `Toplam ${snapshot.size} oyuncu katıldı 🎮`;
  });
}

async function getTotalUserCount() {
  try {
    const snapshot = await db.collection("users").get();
    const count = snapshot.size;

    const totalUserElement = document.getElementById("totalUserCount");
    if (totalUserElement) {
      totalUserElement.textContent = `Toplam ${count} oyuncu katıldı 🎮`;
    }
  } catch (error) {
    console.error("Kullanıcı sayısı alınamadı:", error);
  }
}

window.addEventListener("load", () => {
  resizeCanvas();         // ⬅️ İlk açılışta canvas'ı boyutlandır
  getTotalUserCount();    // Var olan işlev
});

// ⬇️ Pencere yeniden boyutlandığında canvas'ı güncelle
window.addEventListener("resize", resizeCanvas);



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

  // Power-up timer'ını sıfırla - ÖNEMLİ!
  lastPowerupTime = 0;

  // Oyun durumlarını ayarla
  isGameOver = false;
  gameStarted = true;

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
//HUD EKRANININ ALTINDA MÜKEMMEL VB VB YAZILARI

const notificationQueue = [];
let isNotificationShowing = false;
let currentNotificationTimeout = null;
let currentHideTimeout = null;
let gameActive = true;

function showNotification(text, type = "success") {
  if (!gameActive) return;

  notificationQueue.push({ text, type });
  processNotificationQueue();
}

function setGameActive(active) {
  gameActive = active;
  if (!active) {
    clearNotificationQueue();
  }
}

function clearNotificationQueue() {
  notificationQueue.length = 0;

  if (currentNotificationTimeout) {
    clearTimeout(currentNotificationTimeout);
    currentNotificationTimeout = null;
  }

  if (currentHideTimeout) {
    clearTimeout(currentHideTimeout);
    currentHideTimeout = null;
  }

  isNotificationShowing = false;

  const notification = document.getElementById("notification");
  if (notification) {
    // Anında gizle - transition'ı da sıfırla
    notification.style.transition = "none";
    notification.style.opacity = "0";
    notification.style.display = "none";
    notification.style.visibility = "hidden"; // Ekstra güvenlik
  }
}

function processNotificationQueue() {
  if (!gameActive || isNotificationShowing || notificationQueue.length === 0) return;

  const { text, type } = notificationQueue.shift();
  const hud = document.getElementById("hud");
  const notification = document.getElementById("notification");

  if (!notification) {
    console.warn("❌ #notification elementi bulunamadı");
    return;
  }

  isNotificationShowing = true;

  // İlk önce tamamen gizle ve hazırla
  notification.style.transition = "none";
  notification.style.opacity = "0";
  notification.style.display = "none";
  notification.style.visibility = "hidden";

  // Stil ayarları - Transform'u da sıfırla
  notification.textContent = text;
  notification.style.position = "fixed";
  notification.style.left = "50%";
  notification.style.transform = "translateX(-50%) translateY(0px)"; // Y ekseni de sabitli
  notification.style.zIndex = "9999";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "16px";
  notification.style.fontSize = "1rem";
  notification.style.fontWeight = "600";
  notification.style.textAlign = "center";
  notification.style.backdropFilter = "blur(12px)";
  notification.style.background = "rgba(255, 255, 255, 0.08)";
  notification.style.border = "1px solid rgba(255,255,255,0.2)";
  notification.style.color = "#FFD700";
  notification.style.boxShadow = "0 4px 16px rgba(255,255,255,0.1)";
  notification.style.willChange = "opacity"; // GPU acceleration hint

  // ÖNCE konum hesapla - DOM manipülasyonundan ÖNCE
  let finalTop;
  if (hud) {
    const hudRect = hud.getBoundingClientRect();
    finalTop = hudRect.bottom + 10;
    if (finalTop + 50 > window.innerHeight) {
      finalTop = window.innerHeight - 60;
    }
  } else {
    finalTop = 140;
  }

  // İlk önce tamamen gizle ve hazırla
  notification.style.transition = "none";
  notification.style.opacity = "0";
  notification.style.display = "block"; // Hemen block yap
  notification.style.visibility = "visible";

  // Stil ayarları - Pozisyonu HEMEN ayarla
  notification.textContent = text;
  notification.style.position = "fixed";
  notification.style.left = "50%";
  notification.style.top = `${finalTop}px`; // Final pozisyonda başla
  notification.style.transform = "translateX(-50%)"; // Sadece X ekseni
  notification.style.zIndex = "9999";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "16px";
  notification.style.fontSize = "1rem";
  notification.style.fontWeight = "600";
  notification.style.textAlign = "center";
  notification.style.backdropFilter = "blur(12px)";
  notification.style.background = "rgba(255, 255, 255, 0.08)";
  notification.style.border = "1px solid rgba(255,255,255,0.2)";
  notification.style.color = "#FFD700";
  notification.style.boxShadow = "0 4px 16px rgba(255,255,255,0.1)";
  notification.style.willChange = "opacity"; // Sadece opacity değişecek

  // Sadece opacity animasyonu - DİKEY HAREKET YOK
  requestAnimationFrame(() => {
    if (!gameActive) return;

    notification.style.transition = "opacity 0.3s ease";
    notification.style.opacity = "1";
  });

  // Gizleme işlemi
  currentNotificationTimeout = setTimeout(() => {
    if (!gameActive) return;

    // Gizleme animasyonu
    notification.style.opacity = "0";

    currentHideTimeout = setTimeout(() => {
      if (!gameActive) return;

      // Tamamen gizle
      notification.style.display = "none";
      notification.style.visibility = "hidden";
      notification.style.transition = "none"; // Transition'ı sıfırla

      isNotificationShowing = false;
      currentNotificationTimeout = null;
      currentHideTimeout = null;

      // Sıradakini işle
      processNotificationQueue();
    }, 300);
  }, 1200);
}

//HUD EKRANINA GELEN BİLDİRİMLERİN KODUN SONUNA GELDİİKKK



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



function maybeCreatePowerup(timestamp) {
  // Eğer first call ise lastPowerupTime 0; bu durumda ilk timestamp'ı atıyoruz
  if (!lastPowerupTime) lastPowerupTime = timestamp;

  // Aradaki süre 5000 ms geçtiyse yeni powerup doğma şansını kontrol et
  if (timestamp - lastPowerupTime > POWERUP_INTERVAL) {
    if (Math.random() < POWERUP_CHANCE) {
      powerups.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -20,
        type: Math.random() < 0.5 ? "score" : "slow",
        collected: false,
      });
    }
    lastPowerupTime = timestamp;
  }
}


const MAX_ACTIVE_POWERUPS = 50; // Fonksiyon dışında tanımla

function drawPowerups(deltaTime) {
  for (let p of powerups) {
    if (p.collected) continue; // Toplananları atla

    p.y += speed * deltaTime * 60; // FPS normalizasyonu için çarpıldı

    // Ekran dışına çıktıysa işaretle
    if (p.y > canvas.height + 50) {
      p.collected = true;
      continue;
    }

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
        const originalSpeed = speed;
        speed = Math.max(1.2, speed - 0.7); // Daha net etki

        setTimeout(() => {
          speed = originalSpeed; // 2.5 saniye sonra normale dön
        }, 2500);
        showNotification("⏰ Yavaşlatma!");
      }
    }
  }

  // Sadece gerektiğinde temizle
  if (powerups.length > MAX_ACTIVE_POWERUPS) {
    powerups = powerups.filter(p => !p.collected);
  }
}
// Game over fonksiyonunda Firebase skor güncellemesi
async function gameOver() {
  // 🐛 BUG FIX: Remove this line that's causing the error
  // const gameScore = Math.floor(score); // ← DELETE THIS LINE
  
  // Instead, calculate gameScore at the top, before using it
  const gameScore = Math.floor(score);
  
  console.log("🎯 Skor gönderiliyor - Kullanıcı:", currentUser, "| Skor:", gameScore);

  if (!currentUser) {
    console.error("❌ currentUser boş, skor kaydedilemez");
    return;
  }
  if (!navigator.onLine) {
    showNotification("📴 İnternet bağlantısı yok. Lütfen bağlanın!", "warning");
    return;
  }

  console.log("🛑 gameOver başladı | Skor:", gameScore);

  // Debug - Değerleri kontrol et
  console.log("🔍 currentUser:", currentUser);
  console.log("🔍 gameScore:", gameScore);
  console.log("🔍 typeof currentUser:", typeof currentUser);
  console.log("🔍 currentUser boş mu:", !currentUser);
  console.log("🔍 gameScore <= 0 mu:", gameScore <= 0);

  if (!currentUser || gameScore <= 0) {
    console.warn(
      "❌ currentUser boş veya skor 0 - Firebase çağrısı yapılmayacak"
    );
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
    console.log(
      "📤 Gönderilecek veriler - User:",
      currentUser,
      "| Score:",
      gameScore
    );

    const result = await updateAllUserStatsFirebase(currentUser, gameScore);
    console.log("🧪 Kullanıcı adı:", currentUser);
    console.log("🧪 Firebase doküman ID var mı?", (await db.collection("users").doc(currentUser).get()).exists);
    
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

// Mevcut updateAllUserStatsFirebase fonksiyonunuzu bu kodla değiştirin:

async function updateAllUserStatsFirebase(username, newScore) {
  try {
    // 🔒 GÜVENLİK KORUMASI BAŞLANGICI
    const deviceId = getDeviceFingerprint();
    const now = Date.now();
    
    // Rate limiting kontrolü
    const lastSubmitKey = `lastSubmit_${deviceId}`;
    const lastSubmit = localStorage.getItem(lastSubmitKey);
    
    if (lastSubmit && (now - parseInt(lastSubmit)) < 30000) {
      const remainingTime = Math.ceil((30000 - (now - parseInt(lastSubmit))) / 1000);
      throw new Error(`⏰ ${remainingTime} saniye daha bekleyin!`);
    }
    
    // Günlük limit kontrolü
    const todayKey = `dailyCount_${deviceId}_${new Date().toDateString()}`;
    const todayCount = parseInt(localStorage.getItem(todayKey) || '0');
    
    if (todayCount >= 50) {
      throw new Error('📊 Günlük skor gönderim limitine ulaştınız!');
    }
    
    // Basit skor kontrolü
    if (typeof newScore !== "number" || newScore < 0 || newScore > 999999) {
      throw new Error('❌ Geçersiz skor değeri!');
    }
    // 🔒 GÜVENLİK KORUMASI SONU
    
    console.log(`📤 ${username} için tüm veriler güncelleniyor...`);
    console.log(`🎯 Yeni skor: ${newScore}`);

    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();

    let userData = {
      bestScore: 0,
      totalScore: 0,
      gamesPlayed: 0,
      username: username,
      createdAt: new Date(),
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
      lastPlayed: new Date(),
      // 🔒 Güvenlik bilgileri ekle
      deviceId: deviceId,
      lastDeviceInfo: {
        userAgent: navigator.userAgent.slice(0, 100),
        screenSize: `${screen.width}x${screen.height}`,
        language: navigator.language,
        timestamp: now
      }
    };

    // Best score kontrolü
    let isNewRecord = false;
    if (newScore > (userData.bestScore || 0)) {
      updatedData.bestScore = newScore;
      isNewRecord = true;
    }

    console.log("📊 Güncellenecek veriler:", updatedData);

    // Firebase'e gönder
    await userRef.set(updatedData, { merge: true });

    // 🔒 Rate limiting bilgilerini güncelle
    localStorage.setItem(lastSubmitKey, now.toString());
    localStorage.setItem(todayKey, (todayCount + 1).toString());

    console.log("✅ Firebase güncelleme başarılı");

    return {
      isNewRecord: isNewRecord,
      totalScore: updatedData.totalScore,
      gamesPlayed: updatedData.gamesPlayed,
      bestScore: updatedData.bestScore,
    };
  } catch (error) {
    console.error("❌ Firebase güncelleme hatası:", error);
    // Güvenlik hatalarını kullanıcıya göster
    if (error.message.includes('saniye') || error.message.includes('limit') || error.message.includes('Geçersiz')) {
      alert(error.message);
    }
    return {
      isNewRecord: false,
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0,
    };
  }
}

// Bu helper fonksiyonu da kodunuzun herhangi bir yerine ekleyin:
function getDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);

  return btoa(
    navigator.userAgent +
    screen.width + 'x' + screen.height +
    navigator.language +
    canvas.toDataURL() + // ← burayı düzelt!
    new Date().getTimezoneOffset()
  ).slice(0, 16);
}


//Offline modda firabaseye kendi yönetme hakkı tanıyoz



// Firebase'den skor listesini çekme
async function showFirebaseScoreList() {
  try {
    const list = document.getElementById("scoreItems");
    if (!list) return;

    list.innerHTML = "<li>Yükleniyor...</li>";

    // En yüksek toplam skorları çek
    const snapshot = await db
      .collection("users")
      .orderBy("totalScore", "desc")
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

        // Madalya ve sıralama sistemi
        let rankDisplay = "";
        let rankClass = "";

        if (rank === 1) {
          rankDisplay = "🥇";
          rankClass = "gold-medal";
        } else if (rank === 2) {
          rankDisplay = "🥈";
          rankClass = "silver-medal";
        } else if (rank === 3) {
          rankDisplay = "🥉";
          rankClass = "bronze-medal";
        } else {
          rankDisplay = `${rank}.`;
          rankClass = "normal-rank";
        }

        // HTML içeriği - Sıra | Kullanıcı Adı | Toplam Skor
        li.innerHTML = `           
          <div class="score-item ${rankClass}">             
            <span class="rank-badge">${rankDisplay}</span>             
            <span class="username">${userData.username}</span>             
            <span class="total-score">${userData.totalScore || 0
          }</span>           
          </div>         
        `;

        // Mevcut kullanıcı vurgusu
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
  const scoreListEl = document.getElementById("scoreList");
  if (scoreListEl) {
    scoreListEl.style.display = "flex"; // modal görünür olsun
    scoreListEl.classList.add("score-modal"); // tasarım uygulanması için
    scoreListEl.style.zIndex = "9999"; // ekranın önünde olsun
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
  const normalizedUsername = username.toLowerCase(); // Küçük harfe çevir

  try {
    // Kullanıcı adı zaten var mı diye kontrol et
    const userDoc = await db.collection("users").doc(normalizedUsername).get();

    if (userDoc.exists) {
      throw new Error("Bu kullanıcı adı zaten alınmış!");
    }

    // Yeni kullanıcı kaydını yap
    await db.collection("users").doc(normalizedUsername).set({
      username: normalizedUsername,
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
    if (!/^[a-zA-Z0-9_]+$/.test(inputUsername)) {
      showModernPopup("❌ Sadece harf, rakam ve _ karakterine izin verilir.", "error");
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
  do {
    gapX = Math.random() * (maxGapX - minGapX) + minGapX;
    attempts++;
    if (attempts > 100) break;
  } while (last && Math.abs(gapX - last.gapX) < gapSize / 3);
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
    // Sol engel parçası
    ctx.fillRect(0, obs.y, obs.gapX, obstacleHeight);
    // Sağ engel parçası
    ctx.fillRect(
      obs.gapX + gapSize,
      obs.y,
      canvas.width - (obs.gapX + gapSize),
      obstacleHeight
    );

    obs.y += speed * deltaTime * 60;

    // AABB Çarpışma Kontrolü
    const playerRadius = 15; // Oyuncu yarıçapı
    const playerLeft = player.x - playerRadius;
    const playerRight = player.x + playerRadius;
    const playerTop = player.y - playerRadius;
    const playerBottom = player.y + playerRadius;

    // Sol engel parçası ile çarpışma
    const leftObstacleRight = obs.gapX;
    const leftObstacleLeft = 0;
    const leftObstacleTop = obs.y;
    const leftObstacleBottom = obs.y + obstacleHeight;

    // Sağ engel parçası ile çarpışma
    const rightObstacleLeft = obs.gapX + gapSize;
    const rightObstacleRight = canvas.width;
    const rightObstacleTop = obs.y;
    const rightObstacleBottom = obs.y + obstacleHeight;

    // Sol engel ile çarpışma kontrolü
    const hitLeftObstacle =
      playerRight > leftObstacleLeft &&
      playerLeft < leftObstacleRight &&
      playerBottom > leftObstacleTop &&
      playerTop < leftObstacleBottom;

    // Sağ engel ile çarpışma kontrolü
    const hitRightObstacle =
      playerRight > rightObstacleLeft &&
      playerLeft < rightObstacleRight &&
      playerBottom > rightObstacleTop &&
      playerTop < rightObstacleBottom;

    // Çarpışma varsa oyunu bitir
    if (hitLeftObstacle || hitRightObstacle) {
      gameOver();
      return;
    }

    // Puan verme kontrolü (sadece geçiş için)
    if (!obs.passed && obs.y > player.y) {
      obs.passed = true;
      streak++;
      combo = Math.min(combo + 0.2, 8);
      perfectHits++;
      const centerX = obs.gapX + gapSize / 2;
      const distance = Math.abs(player.x - centerX);
      const bonus = Math.floor(10 * combo);
      score += bonus;

      if (distance < 30) {
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
  if (combo >= 5) addAchievement("⚡ 5x Kombo!");
  if (combo >= 8) addAchievement("💥 8x Kombo!");
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
      // Oyuncunun merkezi boşluğun içinde değilse çarpışma say
      const insideGap = player.x > gapLeft && player.x < gapRight;
      if (!insideGap) return true;

    }
  }
  return false;
}

let prevScoreText = "";
function updateUI() {
  const newScoreText = "Skor: " + Math.floor(score);
  if (newScoreText !== prevScoreText) {
    scoreBoard.textContent = newScoreText;
    prevScoreText = newScoreText;
  }



  // ✅ Streak güncelle
  if (streakDisplay && streakDisplay.textContent !== `🔥 Seri: ${streak}`) {
    streakDisplay.textContent = `🔥 Seri: ${streak}`;
  }

  // ✅ Combo güncelle
  const roundedCombo = combo.toFixed(1);
  if (comboDisplay && comboDisplay.textContent !== `⚡ Kombo: ${roundedCombo}x`) {
    comboDisplay.textContent = `⚡ Kombo: ${roundedCombo}x`;
  }
}



function draw(timestamp) {
  if (isGameOver || !gameStarted) {
    return;
  }

  try {
    // 1) ZAMAN FARKINI HESAPLA
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000; // saniye cinsinden
    lastTime = now;

    // İlk karede çok küçük deltaTime olmasın diye güvenlik
    window.safeDeltaTime = deltaTime > 0.001 ? deltaTime : 1 / 60;

    // 2) Canvas'ı temizle ve temel çizimleri yap
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundElements();
    drawPlayer();
    drawObstacles(window.safeDeltaTime);
    drawPowerups(window.safeDeltaTime);
    drawParticles();
    updateParticles();

    // 3) Oyuncu hareketi - deltaTime ile normalize edildi
    const moveSpeed = speed * 1.2 * 60; // 60 FPS baz alınıyor
    player.x += player.dir * moveSpeed * window.safeDeltaTime;

    // 4) Kenarlarda zıplama mantığı
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

    // 5) Çarpışma kontrolü
    try {
      if (checkCollision()) {
        gameOver();
        return;
      }
    } catch (error) {
      console.log("Collision check error:", error);
    }

    // 6) Skor artışı - deltaTime ile normalize edildi
    score += 0.1 * combo * 60 * window.safeDeltaTime;

    updateUI();

    // 7) Power-up oluşturma — “zaman bazlı” kontrol
    maybeCreatePowerup(now);

    // 8) Yeni engel oluşturma
    if (
      obstacles.length === 0 ||
      obstacles.at(-1).y > -minVerticalSpacing * 0.8
    ) {
      createObstacle();
    }

    // 9) Ekranın dışına çıkan engelleri temizle
    obstacles = obstacles.filter(
      (obs) => obs.y < canvas.height + obstacleHeight
    );

    // 10) Döngüyü devam ettir
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
  )} puan aldım! 🔥 Seri: ${streak}, 📊 Seviye: ${level} ${currentUser ? `- ${currentUser}` : ""
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



// Paylaş butonuna event listener ekle
document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("achievementsOverlay");
  const toggle = document.getElementById("achievementsToggle");
  const shareBtn = document.getElementById("shareScoreBtn");

  // Toggle butonuna event listener ekle
  if (toggle) {
    toggle.addEventListener("click", toggleAchievements);
  }

  // Overlay'e tıklayınca kapat
  if (overlay) {
    overlay.addEventListener("click", toggleAchievements);
  }

  // ESC tuşu ile kapat
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const panel = document.getElementById("achievements");
      if (panel && panel.classList.contains("show")) {
        toggleAchievements();
      }
    }
  }); // Bu parantez ESC event listener'ını kapatıyor

  // Paylaş butonu event listener
  if (shareBtn) {
    shareBtn.addEventListener("click", shareScore);
    console.log("Paylaş butonu event listener'ı eklendi");
  } else {
    console.error("shareScoreBtn bulunamadı!");
  }
}); // Bu parantez ana DOMContentLoaded event listener'ını kapatıyor

// Başarılar listesini güncelle
async function updateAchievementsList() {
  try {
    const snapshot = await db
      .collection("users")
      .orderBy("totalScore", "desc")
      .limit(10)
      .get();

    const achievementsScroll = document.getElementById("achievementsScroll");
    achievementsScroll.innerHTML = "";

    if (snapshot.empty) {
      achievementsScroll.innerHTML = '<div class="no-achievements">Henüz başarı yok</div>';
      return;
    }

    // 🔍 DEBUG: Verileri kontrol edelim
    console.log("=== LİDERLİK TABLOSU DEBUG ===");

    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();

      // 🔍 Her kullanıcının verisini kontrol et
      console.log(`${rank}. ${data.username}`);
      console.log(`   Puan: ${data.totalScore}`);
      console.log(`   Puan Tipi: ${typeof data.totalScore}`);
      console.log(`   Raw Data:`, data);
      console.log("---");

      // Puanı number'a çevirmeyi dene
      const score = Number(data.totalScore);
      console.log(`   Number'a çevrildi: ${score}`);

      const achievementDiv = createAchievementElement(rank, data.username, score);
      achievementsScroll.appendChild(achievementDiv);
      rank++;
    });

    console.log("=== DEBUG BİTTİ ===");

  } catch (error) {
    console.error("Başarılar yüklenirken hata:", error);
    const achievementsScroll = document.getElementById("achievementsScroll");
    achievementsScroll.innerHTML = '<div class="error-message">Veriler yüklenemedi</div>';
  }
}

// Tek bir başarı elementi oluştur
function createAchievementElement(rank, username, score) {
  const achievementDiv = document.createElement("div");
  achievementDiv.className = "achievement new";

  achievementDiv.innerHTML = `
      <div class="achievement-rank">${rank}</div>
      <div class="achievement-content">
          <div class="achievement-text">${username}</div>
          <div class="achievement-score">${score.toLocaleString()} puan</div>
      </div>
  `;

  // Animasyonu bitince 'new' sınıfını kaldır
  setTimeout(() => {
    achievementDiv.classList.remove("new");
  }, 800);

  return achievementDiv;
}

// Stil ekleme fonksiyonu (CSS'yi dinamik eklemek için)
function addAchievementsStyles() {
  const style = document.createElement("style");
  style.textContent = `
      .no-achievements {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          padding: 40px 20px;
          font-size: 0.9rem;
      }
      
      .error-message {
          text-align: center;
          color: #ff4757;
          padding: 20px;
          font-size: 0.9rem;
      }
  `;
  document.head.appendChild(style);
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener("DOMContentLoaded", function () {
  addAchievementsStyles();
});

// Mevcut oyun kodunuza entegre etmek için:
// Oyun bittiğinde bu fonksiyonu çağırın:
function onGameEnd() {
  // ... mevcut oyun bitme kodunuz

  // Başarılar listesini güncelle (eğer panel açıksa)
  const panel = document.getElementById("achievements");
  if (panel && panel.classList.contains("show")) {
    updateAchievementsList();
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
async function showScoreList() {
  try {
    const list = document.getElementById("scoreItems");
    if (!list) return;

    list.innerHTML = "<li>Yükleniyor...</li>";

    // Firebase'den toplam skorları çek
    const snapshot = await db
      .collection("users")
      .orderBy("totalScore", "desc")
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

        // Madalya ve sıralama sistemi
        let rankDisplay = "";
        let rankClass = "";

        if (rank === 1) {
          rankDisplay = "🥇";
          rankClass = "gold-medal";
        } else if (rank === 2) {
          rankDisplay = "🥈";
          rankClass = "silver-medal";
        } else if (rank === 3) {
          rankDisplay = "🥉";
          rankClass = "bronze-medal";
        } else {
          rankDisplay = `${rank}.`;
          rankClass = "normal-rank";
        }

        // Sadece toplam skoru göster
        li.innerHTML = `
          <div class="score-item ${rankClass}">
            <span class="rank-badge">${rankDisplay}</span>
            <span class="username">${userData.username}</span>
            <span class="total-score">Toplam: ${userData.totalScore || 0}</span>
          </div>
        `;

        // Mevcut kullanıcı vurgusu
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
function submitScore() {
  if (!navigator.onLine) {
    showNotification("📴 İnternet bağlantısı yok. Lütfen bağlanın!", "warning");
    return;
  }

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
function generateDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}
// ✅ Bu cihazdaki kayıtlı kullanıcıları logda gösterme fonksiyonu
async function showRegisteredUsersOnThisDevice() {
  const currentDeviceId = generateDeviceId();

  console.log("🔍 Bu cihazdaki kayıtlı kullanıcılar aranıyor...");
  console.log("📱 Mevcut cihaz ID:", currentDeviceId);

  try {
    const usersSnapshot = await db.collection("users").get();
    const registeredUsersOnThisDevice = [];
    let totalUsersChecked = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const username = doc.id;
      totalUsersChecked++;

      // Yeni sistem (deviceIds array)
      let deviceIds = userData.deviceIds || [];

      // Eski sistem uyumluluğu
      if (userData.deviceId && !deviceIds.includes(userData.deviceId)) {
        deviceIds.push(userData.deviceId);
      }

      // Bu cihazda kayıtlı mı kontrol et
      if (deviceIds.includes(currentDeviceId)) {
        registeredUsersOnThisDevice.push({
          username: username,
          displayName: userData.displayName || username,
          totalScore: userData.totalScore || 0,
          gamesPlayed: userData.gamesPlayed || 0,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          totalDevices: deviceIds.length
        });
      }
    });

    console.log("📊 CIHAZ KULLANICI RAPORU");
    console.log("========================");
    console.log(`📱 Cihaz ID: ${currentDeviceId}`);
    console.log(`👥 Toplam kontrol edilen kullanıcı: ${totalUsersChecked}`);
    console.log(`✅ Bu cihazda kayıtlı kullanıcı sayısı: ${registeredUsersOnThisDevice.length}`);
    console.log("========================");

    if (registeredUsersOnThisDevice.length === 0) {
      console.log("❌ Bu cihazda kayıtlı kullanıcı bulunamadı");
    } else {
      console.log("👤 BU CİHAZDAKİ KAYITLI KULLANICILAR:");

      registeredUsersOnThisDevice.forEach((user, index) => {
        console.log(`\n${index + 1}. 👤 ${user.displayName} (@${user.username})`);
        console.log(`   📊 Toplam Skor: ${user.totalScore}`);
        console.log(`   🎮 Oyun Sayısı: ${user.gamesPlayed}`);
        console.log(`   📱 Kayıtlı Cihaz Sayısı: ${user.totalDevices}`);

        if (user.createdAt) {
          const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          console.log(`   📅 Kayıt Tarihi: ${createdDate.toLocaleString('tr-TR')}`);
        }

        if (user.lastLoginAt) {
          const lastLoginDate = user.lastLoginAt.toDate ? user.lastLoginAt.toDate() : new Date(user.lastLoginAt);
          console.log(`   🕐 Son Giriş: ${lastLoginDate.toLocaleString('tr-TR')}`);
        }
      });
    }

    console.log("========================");

    // Ayrıca return ile veri döndür (isteğe bağlı)
    return {
      deviceId: currentDeviceId,
      totalUsersChecked,
      registeredUsersCount: registeredUsersOnThisDevice.length,
      users: registeredUsersOnThisDevice
    };

  } catch (error) {
    console.error("❌ Kullanıcıları kontrol ederken hata:", error);
  }
}

// ✅ Sayfa yüklendiğinde otomatik olarak çalıştırmak için
window.addEventListener('load', () => {
  // 2 saniye sonra çalıştır (Firebase bağlantısının kurulması için)
  setTimeout(() => {
    showRegisteredUsersOnThisDevice();
  }, 2000);
});

// ✅ Manuel olarak çalıştırmak için console'da kullanılabilecek kısayol
window.showDeviceUsers = showRegisteredUsersOnThisDevice;

// ✅ Mevcut handleAdvancedLogin fonksiyonuna da ekleyebilirsiniz
// Bu kısmı handleAdvancedLogin fonksiyonunun başına ekleyin:
/*
// Giriş yapmadan önce bu cihazdaki kullanıcıları göster
showRegisteredUsersOnThisDevice();
*/
// 🔄 Geliştirilmiş login fonksiyonu
async function handleAdvancedLogin() {
  if (!navigator.onLine) {
    showNotification("📴 İnternet bağlantısı yok. Lütfen bağlanın!", "warning");
    return;
  }

  const usernameInput = document.getElementById("usernameInput");
  const inputUsername = usernameInput.value.trim();
  const normalizedUsername = inputUsername.toLowerCase();

  const deviceId = generateDeviceId();

  usernameInput.classList.add("shake");

setTimeout(() => {
  usernameInput.classList.remove("shake");
}, 500);


  if (inputUsername.length < 3) {
    showModernPopup("🚫 Kullanıcı adı en az 3 karakter olmalıdır.", "warning");
    usernameInput.focus();
    usernameInput.select();
    return;
  }

  try {
    const userRef = db.collection("users").doc(normalizedUsername);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();

      // ✅ YENİ SİSTEM: Cihaz ID'leri array olarak saklanıyor
      let registeredDevices = userData.deviceIds || [];

      // Eski sistemden gelenler için uyumluluk
      if (userData.deviceId && !registeredDevices.includes(userData.deviceId)) {
        registeredDevices.push(userData.deviceId);
      }

      console.log("🔍 Kayıtlı cihazlar:", registeredDevices);
      console.log("🔍 Mevcut cihaz:", deviceId);

      // ✅ Bu cihaz kayıtlı mı kontrol et
      if (!registeredDevices.includes(deviceId)) {
        console.log("❌ Bu kullanıcı başka cihaz(lar)da kayıtlı");

        showModernPopup(
          `⚠️ "${inputUsername}" kullanıcı adı başka bir cihazda kullanılıyor! Bu cihazda kullanmak için farklı bir isim seçin.`,
          "warning"
        );

        usernameInput.focus();
        usernameInput.select();
        return;
      }

      console.log("✅ Bu cihazda kayıtlı kullanıcı - giriş yapılıyor");

      // Giriş işlemleri
      currentUser = normalizedUsername;
      currentUserTotalScore = userData.totalScore || 0;

      localStorage.setItem("currentUser", normalizedUsername);
      localStorage.setItem("userLoginCount", "1");
      localStorage.setItem("lastLoginTime", new Date().toISOString());

      await userRef.update({
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showWelcomeBackMessage(normalizedUsername, 1);
      showStartScreen();
      return;
    }

    // ✅ Yeni kullanıcı kaydı
    console.log("✨ Yeni kullanıcı oluşturuluyor:", normalizedUsername);

    const newUserData = {
      username: normalizedUsername,
      displayName: inputUsername,
      totalScore: 0,
      bestScore: 0,
      gamesPlayed: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      deviceIds: [deviceId], // ✅ Array olarak saklanıyor
    };

    await userRef.set(newUserData);

    currentUser = normalizedUsername;
    currentUserTotalScore = 0;

    localStorage.setItem("currentUser", normalizedUsername);
    localStorage.setItem("userLoginCount", "1");
    localStorage.setItem("lastLoginTime", new Date().toISOString());

    console.log("✅ Yeni kullanıcı başarıyla oluşturuldu:", normalizedUsername);

    showFirstTimeWelcome(inputUsername);
    showStartScreen();

  } catch (error) {
    console.error("❌ Firebase bağlantı hatası:", error);
    alert("🚨 İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
    usernameInput.focus();
  }
}
// ✅ Eski kullanıcıları yeni sisteme uyumlu hale getirme fonksiyonu
async function migrateOldUsersToNewSystem() {
  try {
    const usersSnapshot = await db.collection("users").get();

    usersSnapshot.forEach(async (doc) => {
      const userData = doc.data();

      // Eski sistem kullanıyorsa (deviceId var ama deviceIds yok)
      if (userData.deviceId && !userData.deviceIds) {
        console.log("🔄 Eski kullanıcı güncelleniyor:", doc.id);

        await doc.ref.update({
          deviceIds: [userData.deviceId], // Array'e çevir
          // deviceId alanını silmek istersen:
          // deviceId: firebase.firestore.FieldValue.delete()
        });
      }
    });

    console.log("✅ Tüm eski kullanıcılar yeni sisteme uyumlu hale getirildi");
  } catch (error) {
    console.error("❌ Migration hatası:", error);
  }
}

// Sayfa yüklendiğinde migration'ı çalıştır (bir kez)
// migrateOldUsersToNewSystem();
// Cihaz kimliği oluşturma fonksiyonu
function generateDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId =
      "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

// Kullanıcı değiştir fonksiyonu da güncellenmeli
function changeUser() {
  if (confirm("Kullanıcı değiştirmek istediğinizden emin misiniz?")) {
    // Sadece aktif kullanıcı bilgilerini temizle, cihaz geçmişini koru
    localStorage.removeItem("currentUser");
    localStorage.removeItem("lastLoginTime");
    localStorage.removeItem("userLoginCount");
    currentUser = "";
    currentUserTotalScore = 0;
    showLoginScreen();
  }
}

// 🗑️ Kullanıcı verilerini temizle
function clearUserData() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("lastLoginTime");
  localStorage.removeItem("userLoginCount");
  currentUser = "";
  currentUserTotalScore = 0;
}

// 🔄 Kullanıcı değiştir fonksiyonu
function changeUser() {
  if (confirm("Kullanıcı değiştirmek istediğinizden emin misiniz?")) {
    clearUserData();
    showLoginScreen();
  }
}

// 📊 Kullanıcı istatistikleri göster
function showUserStats() {
  const loginCount = localStorage.getItem("userLoginCount") || "0";
  const lastLogin = localStorage.getItem("lastLoginTime");
  const firstLogin = localStorage.getItem("firstLoginTime");

  let statsMessage = `📊 ${currentUser} İstatistikleri:\n`;
  statsMessage += `🔄 Toplam giriş: ${loginCount}\n`;
  statsMessage += `🏆 Toplam skor: ${currentUserTotalScore}\n`;

  if (lastLogin) {
    const lastDate = new Date(lastLogin).toLocaleDateString("tr-TR");
    statsMessage += `📅 Son giriş: ${lastDate}`;
  }

  alert(statsMessage);
}

// Modern popup fonksiyonu
function showModernPopup(message, type = "error") {
  // Overlay oluştur
  const overlay = document.createElement("div");
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
  const popup = document.createElement("div");
  const iconMap = { error: "❌", warning: "⚠️", success: "✅" };

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
    <div style="font-size: 40px; margin-bottom: 15px;">${iconMap[type] || "❌"
    }</div>
    <div style="font-size: 16px; color: #333; margin-bottom: 20px; line-height: 1.4;">${message}</div>
    <button onclick="this.closest('[data-popup]').remove()" 
            style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; 
                   padding: 10px 25px; border-radius: 20px; font-size: 14px; font-weight: 600; 
                   cursor: pointer; transition: transform 0.2s ease;"
            onmouseover="this.style.transform='translateY(-1px)'" 
            onmouseout="this.style.transform='translateY(0)'">Tamam</button>
  `;

  overlay.setAttribute("data-popup", "true");
  overlay.appendChild(popup);

  // CSS animasyonları ekle
  if (!document.querySelector("#popup-animations")) {
    const style = document.createElement("style");
    style.id = "popup-animations";
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
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", closeOnEsc);
    }
  };
  document.addEventListener("keydown", closeOnEsc);
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
  const lastLoginTime = localStorage.getItem("lastLoginTime");
  const userLoginCount = parseInt(
    localStorage.getItem("userLoginCount") || "0"
  );

  currentUser = "";
  currentUserTotalScore = 0;

  if (storedUser) {
    console.log("🔐 Kaydedilmiş kullanıcı bulundu:", storedUser);

    try {
      const userDoc = await db.collection("users").doc(storedUser).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        currentUser = storedUser;
        currentUserTotalScore = userData.totalScore || 0;

        // Login sayısını artır
        const newLoginCount = userLoginCount + 1;
        localStorage.setItem("userLoginCount", newLoginCount.toString());
        localStorage.setItem("lastLoginTime", new Date().toISOString());

        console.log("✅ Kullanıcının toplam skoru:", currentUserTotalScore);
        console.log("🔄 Giriş sayısı:", newLoginCount);

        // Hoşgeldin mesajını göster - artık her zaman tekrar hoşgeldin der
        // çünkü localStorage'da kayıtlı kullanıcı = daha önce giriş yapmış
        showWelcomeBackMessage(storedUser, newLoginCount);

        showStartScreen();
      } else {
        console.warn("⚠️ Kullanıcı Firebase'de bulunamadı");
        clearUserData();
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
  // Giriş butonuna tıklandığında bu fonksiyon çalışır
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleAdvancedLogin(); // Gelişmiş giriş (cihaz kontrolüyle)
    });
  }

  // Enter tuşuna basınca da giriş yapılabilir
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


}

function hideScoreList() {
  const scoreListEl = document.getElementById("scoreList");
  if (scoreListEl) scoreListEl.style.display = "none";
}
async function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");

  if (!leaderboardList) {
  //  console.warn("❌ 'leaderboardList' elementi DOM'da bulunamadı.");
    return;
  }

  leaderboardList.innerHTML = ""; // Temizle

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
    console.error("⚠️ Liderlik tablosu yüklenemedi:", error);
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
// Modern JavaScript Fonksiyonu
async function showFirebaseScoreList() {
  try {
    const list = document.getElementById("scoreItems");
    if (!list) return;

    // Modern loading state
    list.innerHTML = `
      <li class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-text">Skorlar yükleniyor...</span>
      </li>
    `;

    // En yüksek skorları çek
    const snapshot = await db
      .collection("users")
      .orderBy("totalScore", "desc")
      .limit(10)
      .get();

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">🏆</div>
          <div class="empty-text">Henüz hiç oyuncu yok</div>
          <div class="empty-subtext">İlk skor sahibi sen ol!</div>
        </li>
      `;
    } else {
      let rank = 1;
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const li = document.createElement("li");

        // Modern madalya ve sıralama sistemi
        let rankDisplay = "";
        let rankClass = "";
        let rankIcon = "";

        if (rank === 1) {
          rankDisplay = "1";
          rankClass = "rank-gold";
          rankIcon = "👑";
        } else if (rank === 2) {
          rankDisplay = "2";
          rankClass = "rank-silver";
          rankIcon = "🥈";
        } else if (rank === 3) {
          rankDisplay = "3";
          rankClass = "rank-bronze";
          rankIcon = "🥉";
        } else {
          rankDisplay = rank;
          rankClass = "rank-normal";
          rankIcon = "";
        }

        // Modern HTML içeriği
        li.innerHTML = `
  <div class="score-card ${rankClass} ${userData.username === currentUser ? "current-player" : ""
          }">
    <div class="rank-section">
      <div class="rank-number">${rankDisplay}${rankIcon}</div>
    </div>
    <div class="player-info">
      <div class="player-name">${userData.username}</div>
      <div class="player-score">Toplam: <strong>${userData.totalScore || 0
          }</strong></div>
    </div>
    <div class="score-trend">
      ${rank <= 3
            ? '<span class="trend-icon trending-up"></span>'
            : '<span class="trend-icon stable"></span>'
          }
    </div>
  </div>
`;

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
      list.innerHTML = `
        <li class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-text">Skorlar yüklenemedi</div>
          <button class="retry-btn" onclick="showFirebaseScoreList()">
            <span>🔄</span> Tekrar Dene
          </button>
        </li>
      `;
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