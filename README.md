# 🏥 Eczane Yardımcı Programı v2.0

Modern ve kullanıcı dostu bir eczane yardımcı programı. Barkod/QR kod tarama ve endikasyon bazlı çapraz satış önerileri sunar.

## ✨ Özellikler

### 🔍 Barkod/QR Kod Arama
- 13 haneli barkod numarası desteği
- QR kod verisi otomatik çözümleme
- Çoklu format desteği (01 + barkod + ek veri)
- Gerçek zamanlı arama sonuçları

### 💊 Endikasyon Bazlı Öneriler
- Endikasyon arama ve filtreleme
- Çapraz satış kategorileri
- Detaylı ürün bilgileri
- Uyarı ve kontrendikasyon bilgileri

### 📊 İstatistikler ve Takip
- Veri istatistikleri
- Son aramalar geçmişi
- Arama sonuçları takibi
- Performans metrikleri

### 🎨 Modern Arayüz
- Karanlık/Açık tema desteği
- Responsive tasarım
- Bootstrap 5 ile modern UI
- Font Awesome ikonları
- Smooth animasyonlar

### 🖥️ Cross-Platform
- Windows, macOS, Linux desteği
- Electron tabanlı desktop uygulaması
- Native performans
- Otomatik güncelleme desteği

## 🚀 Kurulum

### Gereksinimler
- Node.js 16+ 
- npm veya yarn

### Geliştirme Kurulumu
```bash
# Projeyi klonlayın
git clone https://github.com/example/eczane-yardimci.git
cd eczane-yardimci

# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda çalıştırın
npm run dev
```

### Production Build
```bash
# Uygulamayı paketleyin
npm run build

# Platform özel build
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

## 📁 Proje Yapısı

```
eczane-yardimci/
├── main.js              # Electron main process
├── index.html           # Ana HTML dosyası
├── styles.css           # CSS stilleri
├── script.js            # Frontend JavaScript
├── package.json         # Proje konfigürasyonu
├── barkod_listesi.json  # Barkod veritabanı
├── data.json           # Çapraz satış verileri
├── assets/             # İkonlar ve görseller
└── dist/               # Build çıktıları
```

## 🎯 Kullanım

### Barkod Arama
1. **Barkod/QR Kod Arama** sekmesine gidin
2. Barkod numarasını veya QR kod verisini girin
3. Enter tuşuna basın veya **Ara** butonuna tıklayın
4. Sonuçları ve çapraz satış önerilerini görün

### Endikasyon Arama
1. **Endikasyon Arama** sekmesine gidin
2. Endikasyon adını yazmaya başlayın
3. Listeden uygun endikasyonu seçin
4. Önerilen ürünleri ve detayları görün

### İstatistikler
1. **İstatistikler** sekmesine gidin
2. Veri sayılarını ve son aramaları görün
3. Performans metriklerini takip edin

## 🎨 Tema Değiştirme

Uygulama sağ üst köşedeki buton ile karanlık/açık tema arasında geçiş yapabilirsiniz:

- 🌙 **Karanlık Mod**: Göz yorgunluğunu azaltır
- ☀️ **Açık Mod**: Klasik görünüm

## 🔧 Geliştirme

### Kod Yapısı
- **main.js**: Electron main process, pencere yönetimi
- **script.js**: Frontend logic, veri işleme
- **styles.css**: Modern CSS, tema desteği
- **index.html**: Bootstrap tabanlı responsive UI

### Veri Formatları
- **barkod_listesi.json**: Barkod → ATC kodu eşleştirmesi
- **data.json**: Çapraz satış ve endikasyon verileri

### Özelleştirme
- CSS değişkenleri ile tema özelleştirme
- JSON dosyaları ile veri güncelleme
- Electron ayarları ile pencere konfigürasyonu

## 📦 Build ve Dağıtım

### Electron Builder
```bash
# Tüm platformlar için build
npm run build

# Platform özel build
npm run build:mac
npm run build:win  
npm run build:linux
```

### Build Çıktıları
- **macOS**: `.dmg` dosyası
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` dosyası

## 🐛 Sorun Giderme

### Yaygın Sorunlar

**Uygulama açılmıyor:**
```bash
# Node modüllerini yeniden yükleyin
rm -rf node_modules
npm install
```

**Veri yükleme hatası:**
- JSON dosyalarının doğru konumda olduğunu kontrol edin
- Dosya izinlerini kontrol edin

**Build hatası:**
```bash
# Electron builder'ı yeniden yükleyin
npm install electron-builder --save-dev
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- [Electron](https://electronjs.org/) - Cross-platform desktop framework
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Font Awesome](https://fontawesome.com/) - İkonlar
- [Node.js](https://nodejs.org/) - JavaScript runtime

## 📞 İletişim

- **Geliştirici**: AI Assistant
- **Versiyon**: 2.0.0
- **Son Güncelleme**: 2024

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! 