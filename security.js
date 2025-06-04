// ==== GÜVENLİK KORUMASI - 1 HAFTALIK OYUN İÇİN ====
// Bu kodu security.js dosyasına kopyalayın

// 1. Basit Device Fingerprinting
const getDeviceId = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const fingerprint = btoa(
      navigator.userAgent + 
      screen.width + 'x' + screen.height + 
      navigator.language + 
      canvas.toDataURL() +
      new Date().getTimezoneOffset()
    ).slice(0, 16);
    
    return fingerprint;
  };
  
  // 2. Rate Limiting ve Spam Koruması
  const canSubmitScore = () => {
    const deviceId = getDeviceId();
    const now = Date.now();
    
    // Son gönderim zamanını kontrol et
    const lastSubmitKey = `lastSubmit_${deviceId}`;
    const lastSubmit = localStorage.getItem(lastSubmitKey);
    
    if (lastSubmit) {
      const timeDiff = now - parseInt(lastSubmit);
      const cooldownTime = 30000; // 30 saniye
      
      if (timeDiff < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - timeDiff) / 1000);
        throw new Error(`${remainingTime} saniye daha bekleyin!`);
      }
    }
    
    // Günlük limit kontrolü (abuse'i engeller)
    const todayKey = `dailyCount_${deviceId}_${new Date().toDateString()}`;
    const todayCount = parseInt(localStorage.getItem(todayKey) || '0');
    
    if (todayCount >= 50) {
      throw new Error('Günlük skor gönderim limitine ulaştınız!');
    }
    
    return true;
  };
  
  // 3. Skor kaydetme fonksiyonu (mevcut kodunuzun yerine koyun)
  const saveScore = async (score, playerName) => {
    try {
      // Güvenlik kontrolleri
      canSubmitScore();
      
      // Çok basit sağlamlık kontrolleri
      if (typeof score !== 'number' || score < 0) {
        throw new Error('Geçersiz skor!');
      }
      
      if (score > 999999) {
        throw new Error('Skor çok yüksek, oyunu yeniden oynayın!');
      }
      
      const deviceId = getDeviceId();
      const now = Date.now();
      
      // Firebase'e kaydet
      const docRef = await firestore.collection('leaderboard').add({
        playerName: playerName || 'Anonim',
        score: score,
        deviceId: deviceId,
        timestamp: now,
        userAgent: navigator.userAgent.slice(0, 100),
        screenSize: `${screen.width}x${screen.height}`,
        language: navigator.language
      });
      
      // Rate limiting bilgilerini güncelle
      localStorage.setItem(`lastSubmit_${deviceId}`, now.toString());
      
      const todayKey = `dailyCount_${deviceId}_${new Date().toDateString()}`;
      const todayCount = parseInt(localStorage.getItem(todayKey) || '0');
      localStorage.setItem(todayKey, (todayCount + 1).toString());
      
      console.log('Skor başarıyla kaydedildi:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('Skor kaydetme hatası:', error);
      alert(error.message);
      throw error;
    }
  };
  
  // 4. Kullanım örneği (oyun bittiğinde çağırın)
  /*
  // Oyun sonu
  try {
    await saveScore(finalScore, playerName);
    alert('Skorunuz kaydedildi!');
    // Leaderboard'ı yenile
    loadLeaderboard();
  } catch (error) {
    // Hata zaten alert ile gösterildi
  }
  */
  
  // 5. Temizlik fonksiyonu (opsiyonel - eski verileri temizler)
  const cleanupOldData = () => {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    keys.forEach(key => {
      if (key.startsWith('lastSubmit_') || key.startsWith('dailyCount_')) {
        const value = localStorage.getItem(key);
        if (value && parseInt(value) < oneWeekAgo) {
          localStorage.removeItem(key);
        }
      }
    });
  };
  
  // Sayfa yüklendiğinde temizlik yap
  window.addEventListener('load', cleanupOldData);