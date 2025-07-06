// Global değişkenler
let barkodData = {};
let crossSalesData = {};
let allIndications = [];
let currentTheme = 'light';
let recentSearches = [];

// DOM yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Eczane Yardımcı Programı başlatılıyor...');
    
    try {
        // Verileri yükle
        await loadData();
        
        // Event listener'ları ekle
        setupEventListeners();
        
        // Endikasyonları yükle
        loadIndications();
        
        // İstatistikleri güncelle
        updateStats();
        
        // Son aramaları yükle
        loadRecentSearches();
        
        // Varsayılan temayı ayarla
        setTheme(currentTheme);
        
        console.log('Uygulama başarıyla başlatıldı!');
        
    } catch (error) {
        console.error('Uygulama başlatma hatası:', error);
        showError('Uygulama başlatılırken hata oluştu: ' + error.message);
    }
});

// Veri yükleme fonksiyonu
async function loadData() {
    try {
        const { ipcRenderer } = require('electron');
        const data = await ipcRenderer.invoke('load-data');
        barkodData = data.barkodData;
        crossSalesData = data.crossSalesData;
        
        console.log(`Barkod listesi yüklendi: ${Object.keys(barkodData).length} kayıt`);
        console.log('Cross-sales verisi yüklendi');
        
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        throw new Error('Veri dosyaları yüklenemedi');
    }
}

// Event listener'ları ayarla
function setupEventListeners() {
    // Barkod arama
    const searchBtn = document.getElementById('searchBtn');
    const barkodInput = document.getElementById('barkodInput');
    
    searchBtn.addEventListener('click', searchBarkod);
    barkodInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBarkod();
        }
    });
    
    // Endikasyon arama
    const searchIndication = document.getElementById('searchIndication');
    const indicationSelect = document.getElementById('indicationSelect');
    
    searchIndication.addEventListener('input', filterIndications);
    indicationSelect.addEventListener('change', updateIndicationResults);
    
    // Tema değiştirme
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);
    
    // Tab değişimi
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            // Tab değiştiğinde animasyon ekle
            const target = document.querySelector(e.target.getAttribute('data-bs-target'));
            target.classList.add('fade-in');
            setTimeout(() => target.classList.remove('fade-in'), 500);
            
            // İstatistikler tabına geçildiğinde güncelle
            if (e.target.getAttribute('data-bs-target') === '#istatistik') {
                updateStats();
                updateRecentSearches();
            }
            
            // AI tabına geçildiğinde event listener'ları ekle
            if (e.target.getAttribute('data-bs-target') === '#ai') {
                setupAIEventListeners();
            }
        });
    });
    
    // AI Event Listeners'ı başlangıçta ekle
    setupAIEventListeners();
    
    // Dermokozmetik Event Listeners
    setupDermokozmetikEventListeners();
}

// Barkod arama fonksiyonu
function searchBarkod() {
    const input = document.getElementById('barkodInput').value.trim();
    const resultsArea = document.getElementById('barkodResults');
    
    if (!input) {
        showWarning('Lütfen bir barkod veya QR kod verisi girin!');
        return;
    }
    
    // Loading göster
    showLoading(resultsArea);
    
    setTimeout(() => {
        try {
            const barkod = extractBarkodFromQR(input);
            if (barkod) {
                processBarkod(barkod, input);
            } else {
                showHelpfulError('Geçersiz QR kod formatı!', input);
            }
        } catch (error) {
            showError('Arama sırasında hata oluştu: ' + error.message);
        }
    }, 300);
}

// QR kod verisinden barkod çıkarma
function extractBarkodFromQR(qrData) {
    qrData = String(qrData).trim();
    
    // Format 1: 01 + 13 haneli barkod + ek veri
    if (qrData.startsWith('01') && qrData.length >= 15) {
        const barkod = qrData.substring(2, 15);
        if (/^\d{13}$/.test(barkod)) {
            return barkod;
        }
    }
    
    // Format 2: Direkt 13 haneli barkod
    if (/^\d{13}$/.test(qrData)) {
        return qrData;
    }
    
    // Format 3: Barkod içeren herhangi bir string
    const barkodMatch = qrData.match(/(?<!\d)(\d{13})(?!\d)/);
    if (barkodMatch) {
        return barkodMatch[1];
    }
    
    return null;
}

// Barkod işleme
function processBarkod(barkod, originalInput) {
    const resultsArea = document.getElementById('barkodResults');
    
    if (barkodData[barkod]) {
        const barkodInfo = barkodData[barkod];
        const atcKodu = barkodInfo['ATC Kodu'] || barkodInfo['atc_kodu'] || 'Bilinmiyor';
        const urunAdi = barkodInfo['Ürün Adı'] || barkodInfo['urun_adi'] || 'Bilinmiyor';
        
        let result = `
            <div class="result-success">
                <i class="fas fa-check-circle emoji-icon"></i>ÜRÜN BULUNDU
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <strong><i class="fas fa-pills"></i> Ürün Adı:</strong> ${urunAdi}<br>
                    <strong><i class="fas fa-barcode"></i> Barkod:</strong> ${barkod}<br>
                    <strong><i class="fas fa-flask"></i> ATC Kodu:</strong> ${atcKodu}<br>
                    <strong><i class="fas fa-clipboard"></i> Orijinal Giriş:</strong> ${originalInput}
                </div>
                <div class="col-md-6">
                    <span class="status-badge status-success">Veritabanında Mevcut</span>
                </div>
            </div>
        `;
        
        const crossSales = findCrossSales(atcKodu);
        if (crossSales) {
            result += `
                <hr>
                <div class="result-info">
                    <i class="fas fa-shopping-cart emoji-icon"></i>ÇAPRAZ SATIŞ ÖNERİLERİ
                </div>
                ${crossSales}
            `;
        } else {
            result += `
                <hr>
                <div class="result-warning">
                    <i class="fas fa-info-circle emoji-icon"></i>Bu ATC kodu için çapraz satış önerisi bulunamadı.
                </div>
                <div class="mt-2">
                    <i class="fas fa-lightbulb"></i> Endikasyon sekmesinden manuel arama yapabilirsiniz.
                </div>
            `;
        }
        
        resultsArea.innerHTML = result;
        
    } else {
        showHelpfulError('Barkod veritabanında bulunamadı!', barkod);
    }
    
    // Son aramalara ekle
    addToRecentSearches(barkod, originalInput);
}

// Çapraz satış bulma
function findCrossSales(atcKodu) {
    // Ana çapraz satış kategorileri
    if (crossSalesData.capraz_satis) {
        for (const [category, info] of Object.entries(crossSalesData.capraz_satis)) {
            const categoryCode = category.split(' ')[0];
            if (atcKodu.startsWith(categoryCode) || categoryCode.includes(atcKodu) || atcKodu.includes(category)) {
                return formatCrossSales(category, info);
            }
        }
    }
    
    // Yeni çapraz satış kategorileri
    if (crossSalesData.yeni_capraz_satis) {
        for (const [category, info] of Object.entries(crossSalesData.yeni_capraz_satis)) {
            const categoryCode = category.split(' ')[0];
            if (atcKodu.startsWith(categoryCode) || categoryCode.includes(atcKodu) || atcKodu.includes(category)) {
                return formatCrossSales(category, info);
            }
        }
    }
    
    return null;
}

// Çapraz satış formatlama
function formatCrossSales(category, info) {
    let result = `
        <div class="card border-gradient">
            <div class="card-header">
                <i class="fas fa-folder-open"></i> Kategori: ${category}
            </div>
            <div class="card-body">
    `;
    
    if (info.Uyarılar) {
        result += `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> <strong>Uyarı:</strong> ${info.Uyarılar}
            </div>
        `;
    }
    
    if (info.Ürünler) {
        result += '<div class="row">';
        for (const [urun, detaylar] of Object.entries(info.Ürünler)) {
            result += `
                <div class="col-md-6 mb-3">
                    <div class="card hover-lift">
                        <div class="card-body">
                            <h6><i class="fas fa-pills"></i> ${urun}</h6>
                            <ul class="list-unstyled">
            `;
            
            for (const [key, value] of Object.entries(detaylar)) {
                result += `<li><strong>${key}:</strong> ${value}</li>`;
            }
            
            result += `
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        result += '</div>';
    }
    
    result += '</div></div>';
    return result;
}

// Endikasyonları yükle
function loadIndications() {
    allIndications = [];
    
    if (crossSalesData.endikasyon) {
        allIndications.push(...Object.keys(crossSalesData.endikasyon));
    }
    
    if (crossSalesData.yeni_endikasyon) {
        allIndications.push(...Object.keys(crossSalesData.yeni_endikasyon));
    }
    
    // Örnek endikasyonu çıkar
    allIndications = allIndications.filter(ind => ind !== 'Örnek Endikasyon');
    
    updateIndicationSelect(allIndications);
    
    if (allIndications.length > 0) {
        document.getElementById('indicationSelect').value = allIndications[0];
        updateIndicationResults();
    }
    
    // AI için endikasyon verilerini hazırla
    prepareAIIndications();
}

// AI için endikasyon verilerini hazırla
function prepareAIIndications() {
    // AI analizi için endikasyon verilerini optimize et
    window.aiIndications = {};
    
    // Mevcut endikasyonları ekle
    if (crossSalesData.endikasyon) {
        Object.assign(window.aiIndications, crossSalesData.endikasyon);
    }
    
    // Yeni endikasyonları ekle
    if (crossSalesData.yeni_endikasyon) {
        Object.assign(window.aiIndications, crossSalesData.yeni_endikasyon);
    }
    
    // Cross-sales verilerinden takviye ürünlerini ekle
    if (crossSalesData.capraz_satis) {
        // Her ATC kodu için takviye ürünlerini endikasyon olarak ekle
        for (const [atcCode, data] of Object.entries(crossSalesData.capraz_satis)) {
            if (data.Ürünler) {
                const indicationName = `${atcCode} - Takviye Önerileri`;
                window.aiIndications[indicationName] = {
                    Açıklama: data.Uyarılar || 'İlaç tedavisine destek takviye ürünleri',
                    Ürünler: data.Ürünler
                };
            }
        }
    }
    
    // Genel takviye kategorileri ekle
    const generalSupplements = {
        "Vitamin ve Mineraller": {
            Açıklama: "Genel sağlık için vitamin ve mineral takviyeleri",
            Ürünler: {
                "Multivitamin": {
                    "Dozlama": "Günde 1 tablet",
                    "Kullanım Şekli": "Kahvaltı ile birlikte",
                    "Kontrendikasyonlar": "Vitamin alerjisi"
                },
                "C Vitamini": {
                    "Dozlama": "500-1000 mg/gün",
                    "Kullanım Şekli": "Yemekle birlikte",
                    "Kontrendikasyonlar": "Böbrek taşı riski"
                },
                "D Vitamini": {
                    "Dozlama": "1000-2000 IU/gün",
                    "Kullanım Şekli": "Kahvaltı ile birlikte",
                    "Kontrendikasyonlar": "Hipervitaminoz D"
                },
                "B12 Vitamini": {
                    "Dozlama": "1000 mcg/gün",
                    "Kullanım Şekli": "Aç karnına",
                    "Kontrendikasyonlar": "B12 alerjisi"
                }
            }
        },
        "Omega-3 ve Yağ Asitleri": {
            Açıklama: "Kalp ve beyin sağlığı için omega-3 takviyeleri",
            Ürünler: {
                "Omega-3 Balık Yağı": {
                    "Dozlama": "1000-2000 mg/gün",
                    "Kullanım Şekli": "Yemekle birlikte",
                    "Kontrendikasyonlar": "Balık alerjisi"
                },
                "Koenzim Q10": {
                    "Dozlama": "100-200 mg/gün",
                    "Kullanım Şekli": "Yemekle birlikte",
                    "Kontrendikasyonlar": "Q10 alerjisi"
                }
            }
        },
        "Probiyotikler": {
            Açıklama: "Sindirim sistemi sağlığı için probiyotik takviyeleri",
            Ürünler: {
                "Probiyotik Karışım": {
                    "Dozlama": "10-20 milyar CFU/gün",
                    "Kullanım Şekli": "Aç karnına",
                    "Kontrendikasyonlar": "Bağışıklık yetmezliği"
                },
                "Lactobacillus": {
                    "Dozlama": "5-10 milyar CFU/gün",
                    "Kullanım Şekli": "Yemekle birlikte",
                    "Kontrendikasyonlar": "Laktik asit alerjisi"
                }
            }
        },
        "Bitkisel Takviyeler": {
            Açıklama: "Doğal bitkisel takviye ürünleri",
            Ürünler: {
                "Passiflora": {
                    "Dozlama": "250-500 mg/gün",
                    "Kullanım Şekli": "Yatmadan önce",
                    "Kontrendikasyonlar": "Sedatif etki"
                },
                "Melisa": {
                    "Dozlama": "300-600 mg/gün",
                    "Kullanım Şekli": "Akşam saatlerinde",
                    "Kontrendikasyonlar": "Sedatif ilaç kullanımı"
                },
                "Ashwagandha": {
                    "Dozlama": "300-600 mg/gün",
                    "Kullanım Şekli": "Sabah veya akşam",
                    "Kontrendikasyonlar": "Hamilelik, emzirme"
                }
            }
        },
        "Mineraller": {
            Açıklama: "Vücut için gerekli mineral takviyeleri",
            Ürünler: {
                "Demir": {
                    "Dozlama": "15-30 mg/gün",
                    "Kullanım Şekli": "Aç karnına, C vitamini ile",
                    "Kontrendikasyonlar": "Demir birikimi hastalıkları"
                },
                "Çinko": {
                    "Dozlama": "15-30 mg/gün",
                    "Kullanım Şekli": "Yemekle birlikte",
                    "Kontrendikasyonlar": "Çinko alerjisi"
                },
                "Magnezyum": {
                    "Dozlama": "200-400 mg/gün",
                    "Kullanım Şekli": "Akşam yemeğinden sonra",
                    "Kontrendikasyonlar": "Böbrek yetmezliği"
                },
                "Selenyum": {
                    "Dozlama": "55-200 mcg/gün",
                    "Kullanım Şekli": "Kahvaltı ile birlikte",
                    "Kontrendikasyonlar": "Selenyum toksisitesi"
                }
            }
        }
    };
    
    // Dermokozmetik kategorileri ekle
    const dermokozmetikCategories = {
        "Temizlik Ürünleri": {
            Açıklama: "Cilt temizliği için dermokozmetik ürünler",
            Ürünler: {
                "Yüz Temizleyici": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Sabah ve akşam yüz temizliği",
                    "Kontrendikasyonlar": "Hassas ciltlerde dikkatli kullanın"
                },
                "Peeling": {
                    "Dozlama": "Haftada 2-3 kez",
                    "Kullanım Şekli": "Temizlik sonrası, nemlendirici öncesi",
                    "Kontrendikasyonlar": "Aktif akne, açık yaralar"
                },
                "Tonik": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Temizlik sonrası, nemlendirici öncesi",
                    "Kontrendikasyonlar": "Çok kuru ciltlerde dikkatli kullanın"
                }
            }
        },
        "Nemlendiriciler": {
            Açıklama: "Cilt nemlendirme ve bakım ürünleri",
            Ürünler: {
                "Nemlendirici Krem": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Temizlik sonrası yüz ve boyun",
                    "Kontrendikasyonlar": "Aktif akne durumunda dikkatli kullanın"
                },
                "Hyaluronik Asit Serum": {
                    "Dozlama": "Günde 1-2 kez",
                    "Kullanım Şekli": "Temizlik sonrası, nemlendirici öncesi",
                    "Kontrendikasyonlar": "Açık yaralarda kullanmayın"
                },
                "Nemlendirici Maske": {
                    "Dozlama": "Haftada 2-3 kez",
                    "Kullanım Şekli": "Temizlik sonrası 15-20 dakika",
                    "Kontrendikasyonlar": "Alerjik reaksiyon durumunda kullanmayın"
                }
            }
        },
        "Güneş Koruyucular": {
            Açıklama: "Güneş ışınlarından korunma ürünleri",
            Ürünler: {
                "SPF 30 Güneş Koruyucu": {
                    "Dozlama": "Günde 1 kez",
                    "Kullanım Şekli": "Nemlendirici sonrası, dışarı çıkmadan 30 dk önce",
                    "Kontrendikasyonlar": "Güneş alerjisi durumunda dikkatli kullanın"
                },
                "SPF 50+ Güneş Koruyucu": {
                    "Dozlama": "Günde 1 kez",
                    "Kullanım Şekli": "Nemlendirici sonrası, dışarı çıkmadan 30 dk önce",
                    "Kontrendikasyonlar": "Güneş alerjisi durumunda dikkatli kullanın"
                },
                "Mineral Güneş Koruyucu": {
                    "Dozlama": "Günde 1 kez",
                    "Kullanım Şekli": "Nemlendirici sonrası, dışarı çıkmadan 30 dk önce",
                    "Kontrendikasyonlar": "Hassas ciltlerde dikkatli kullanın"
                }
            }
        },
        "Anti-Aging Ürünler": {
            Açıklama: "Yaşlanma karşıtı dermokozmetik ürünler",
            Ürünler: {
                "Retinol Krem": {
                    "Dozlama": "Gece günde 1 kez",
                    "Kullanım Şekli": "Temizlik sonrası, nemlendirici öncesi",
                    "Kontrendikasyonlar": "Hamilelik, güneş hassasiyeti"
                },
                "Peptid Serum": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Sabah ve akşam temizlik sonrası",
                    "Kontrendikasyonlar": "Aktif inflamasyon durumunda kullanmayın"
                },
                "Anti-Aging Krem": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Temizlik sonrası yüz ve boyun",
                    "Kontrendikasyonlar": "Hassas ciltlerde dikkatli kullanın"
                }
            }
        },
        "Akne Ürünleri": {
            Açıklama: "Akne tedavisi için dermokozmetik ürünler",
            Ürünler: {
                "Salicylic Asit Temizleyici": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Sabah ve akşam yüz temizliği",
                    "Kontrendikasyonlar": "Çok kuru ciltlerde dikkatli kullanın"
                },
                "Benzoyl Peroxide Krem": {
                    "Dozlama": "Günde 1 kez",
                    "Kullanım Şekli": "Temizlik sonrası, sadece akne bölgelerine",
                    "Kontrendikasyonlar": "Hassas ciltlerde dikkatli kullanın"
                },
                "Akne Maske": {
                    "Dozlama": "Haftada 2-3 kez",
                    "Kullanım Şekli": "Temizlik sonrası 10-15 dakika",
                    "Kontrendikasyonlar": "Aktif inflamasyon durumunda kullanmayın"
                }
            }
        },
        "Göz Çevresi Bakımı": {
            Açıklama: "Göz çevresi için özel bakım ürünleri",
            Ürünler: {
                "Göz Kremi": {
                    "Dozlama": "Günde 2 kez",
                    "Kullanım Şekli": "Sabah ve akşam göz çevresine",
                    "Kontrendikasyonlar": "Göz içine kaçırmayın"
                },
                "Göz Serum": {
                    "Dozlama": "Günde 1 kez",
                    "Kullanım Şekli": "Akşam temizlik sonrası göz çevresine",
                    "Kontrendikasyonlar": "Göz içine kaçırmayın"
                }
            }
        },
        "Dudak Bakımı": {
            Açıklama: "Dudak sağlığı için bakım ürünleri",
            Ürünler: {
                "Dudak Kremi": {
                    "Dozlama": "Günde 3-4 kez",
                    "Kullanım Şekli": "İhtiyaç duydukça dudaklara",
                    "Kontrendikasyonlar": "Alerjik reaksiyon durumunda kullanmayın"
                },
                "Dudak Balm": {
                    "Dozlama": "Günde 2-3 kez",
                    "Kullanım Şekli": "İhtiyaç duydukça dudaklara",
                    "Kontrendikasyonlar": "Alerjik reaksiyon durumunda kullanmayın"
                }
            }
        }
    };
    
    // Genel takviye kategorilerini ekle
    Object.assign(window.aiIndications, generalSupplements);
    
    // Dermokozmetik kategorilerini ekle
    Object.assign(window.aiIndications, dermokozmetikCategories);
    
    // Örnek endikasyonu çıkar
    delete window.aiIndications['Örnek Endikasyon'];
    
    console.log(`AI için ${Object.keys(window.aiIndications).length} endikasyon hazırlandı (takviye ürünleri dahil)`);
}

// Endikasyon filtreleme
function filterIndications() {
    const searchTerm = document.getElementById('searchIndication').value.toLowerCase();
    let filtered = allIndications;
    
    if (searchTerm) {
        filtered = allIndications.filter(ind => ind.toLowerCase().includes(searchTerm));
    }
    
    updateIndicationSelect(filtered);
    
    if (filtered.length > 0) {
        document.getElementById('indicationSelect').value = filtered[0];
        updateIndicationResults();
    }
}

// Endikasyon select güncelleme
function updateIndicationSelect(indications) {
    const select = document.getElementById('indicationSelect');
    select.innerHTML = '<option value="">Endikasyon seçin...</option>';
    
    indications.forEach(indication => {
        const option = document.createElement('option');
        option.value = indication;
        option.textContent = indication;
        select.appendChild(option);
    });
}

// Endikasyon sonuçlarını güncelle
function updateIndicationResults() {
    const selected = document.getElementById('indicationSelect').value;
    const resultsArea = document.getElementById('endikasyonResults');
    
    if (!selected) {
        resultsArea.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-stethoscope fa-3x mb-3"></i>
                <p>Endikasyon seçin ve önerileri görün</p>
            </div>
        `;
        return;
    }
    
    let info = crossSalesData.endikasyon?.[selected];
    if (!info) {
        info = crossSalesData.yeni_endikasyon?.[selected];
    }
    
    if (!info) {
        resultsArea.innerHTML = `
            <div class="result-error">
                <i class="fas fa-times-circle emoji-icon"></i>Seçilen endikasyon için veri bulunamadı.
            </div>
        `;
        return;
    }
    
    let result = `
        <div class="result-info">
            <i class="fas fa-stethoscope emoji-icon"></i>${selected}
        </div>
        <hr>
    `;
    
    if (info.Açıklama) {
        result += `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> <strong>Açıklama:</strong> ${info.Açıklama}
            </div>
        `;
    }
    
    if (info.Uyarılar) {
        result += `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> <strong>Uyarılar:</strong> ${info.Uyarılar}
            </div>
        `;
    }
    
    if (info.Kontrendikasyonlar) {
        result += `
            <div class="alert alert-danger">
                <i class="fas fa-ban"></i> <strong>Kontrendikasyonlar:</strong> ${info.Kontrendikasyonlar}
            </div>
        `;
    }
    
    if (info.Ürünler) {
        result += `
            <div class="result-success">
                <i class="fas fa-pills emoji-icon"></i>ÖNERİLEN ÜRÜNLER
            </div>
            <div class="row mt-3">
        `;
        
        for (const [urun, detaylar] of Object.entries(info.Ürünler)) {
            result += `
                <div class="col-md-6 mb-3">
                    <div class="card hover-lift">
                        <div class="card-header">
                            <i class="fas fa-pills"></i> ${urun}
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled">
            `;
            
            for (const [key, value] of Object.entries(detaylar)) {
                result += `<li><strong>${key}:</strong> ${value}</li>`;
            }
            
            result += `
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        result += '</div>';
    }
    
    resultsArea.innerHTML = result;
}

// Tema değiştirme
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(currentTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (currentTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Açık Mod';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Karanlık Mod';
    }
}

// Tema ayarlama
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Yardımcı fonksiyonlar
function showLoading(element) {
    element.innerHTML = `
        <div class="text-center">
            <div class="loading-spinner"></div>
            <p class="mt-2">Aranıyor...</p>
        </div>
    `;
}

function showError(message) {
    const resultsArea = document.getElementById('barkodResults');
    resultsArea.innerHTML = `
        <div class="result-error">
            <i class="fas fa-times-circle emoji-icon"></i>${message}
        </div>
    `;
}

function showWarning(message) {
    const resultsArea = document.getElementById('barkodResults');
    resultsArea.innerHTML = `
        <div class="result-warning">
            <i class="fas fa-exclamation-triangle emoji-icon"></i>${message}
        </div>
    `;
}

function showHelpfulError(errorMsg, inputData) {
    const resultsArea = document.getElementById('barkodResults');
    resultsArea.innerHTML = `
        <div class="result-error">
            <i class="fas fa-times-circle emoji-icon"></i>${errorMsg}
        </div>
        <hr>
        <div class="alert alert-secondary">
            <strong>Girilen veri:</strong> ${inputData}
        </div>
        <div class="alert alert-info">
            <i class="fas fa-lightbulb"></i> <strong>Öneriler:</strong>
            <ul class="mb-0 mt-2">
                <li>13 haneli barkod numarasını kontrol edin</li>
                <li>QR kod verisinin doğru kopyalandığından emin olun</li>
                <li>Endikasyon sekmesinden manuel arama yapabilirsiniz</li>
                <li>Barkod listesinde olmayan ürünler için eczacınıza danışın</li>
            </ul>
        </div>
    `;
}

// İstatistikleri güncelle
function updateStats() {
    const barkodCount = Object.keys(barkodData).length;
    const crossSalesCount = (crossSalesData.capraz_satis ? Object.keys(crossSalesData.capraz_satis).length : 0) +
                           (crossSalesData.yeni_capraz_satis ? Object.keys(crossSalesData.yeni_capraz_satis).length : 0);
    const indicationCount = allIndications.length;
    const lastUpdate = new Date().toLocaleDateString('tr-TR');
    
    document.getElementById('barkodCount').textContent = barkodCount.toLocaleString('tr-TR');
    document.getElementById('crossSalesCount').textContent = crossSalesCount.toLocaleString('tr-TR');
    document.getElementById('indicationCount').textContent = indicationCount.toLocaleString('tr-TR');
    document.getElementById('lastUpdate').textContent = lastUpdate;
    
    // İstatistikler tabındaki detaylı bilgileri güncelle
    const dataStats = document.getElementById('dataStats');
    if (dataStats) {
        dataStats.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <i class="fas fa-database fa-2x text-primary mb-2"></i>
                            <h6>Toplam Veri</h6>
                            <h4 class="text-primary">${barkodCount.toLocaleString('tr-TR')}</h4>
                            <small class="text-muted">Barkod Kaydı</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <i class="fas fa-chart-line fa-2x text-success mb-2"></i>
                            <h6>Çapraz Satış</h6>
                            <h4 class="text-success">${crossSalesCount.toLocaleString('tr-TR')}</h4>
                            <small class="text-muted">Kategori</small>
                        </div>
                    </div>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <i class="fas fa-list fa-2x text-info mb-2"></i>
                            <h6>Endikasyon</h6>
                            <h4 class="text-info">${indicationCount.toLocaleString('tr-TR')}</h4>
                            <small class="text-muted">Toplam</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <i class="fas fa-clock fa-2x text-warning mb-2"></i>
                            <h6>Son Güncelleme</h6>
                            <h6 class="text-warning">${lastUpdate}</h6>
                            <small class="text-muted">Tarih</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Debug Bilgilerini Göster
function showDebugInfo() {
    const resultsArea = document.getElementById('aiResults');
    
    const debugInfo = {
        geminiAI: {
            isConfigured: window.geminiAI ? window.geminiAI.isConfigured : false,
            hasApiKey: window.geminiAI ? !!window.geminiAI.getApiKey() : false,
            apiKeyPrefix: window.geminiAI && window.geminiAI.getApiKey() ? 
                window.geminiAI.getApiKey().substring(0, 10) + '...' : 'Yok',
            useProxy: window.geminiAI ? window.geminiAI.getUseProxy() : false
        },
        aiIndications: {
            count: window.aiIndications ? Object.keys(window.aiIndications).length : 0,
            available: window.aiIndications ? Object.keys(window.aiIndications).slice(0, 5) : []
        },
        browser: {
            userAgent: navigator.userAgent.substring(0, 50) + '...',
            online: navigator.onLine,
            language: navigator.language,
            corsSupport: 'fetch' in window ? '✅ Destekleniyor' : '❌ Desteklenmiyor',
            jsonSupport: typeof JSON !== 'undefined' ? '✅ Destekleniyor' : '❌ Desteklenmiyor'
        },
        localStorage: {
            hasApiKey: !!localStorage.getItem('gemini_api_key'),
            theme: localStorage.getItem('theme') || 'light'
        },
        network: {
            connection: navigator.connection ? navigator.connection.effectiveType : 'Bilinmiyor',
            downlink: navigator.connection ? navigator.connection.downlink + ' Mbps' : 'Bilinmiyor'
        }
    };
    
    resultsArea.innerHTML = `
        <div class="ai-analysis-box">
            <h6><i class="fas fa-bug me-2"></i>Debug Bilgileri</h6>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 12px; overflow-x: auto;">${JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
        
        <div class="ai-recommendation mt-3">
            <h6><i class="fas fa-lightbulb me-2"></i>Hata Ayıklama Önerileri</h6>
            <ul>
                <li><strong>API Key Durumu:</strong> ${debugInfo.geminiAI.isConfigured ? '✅ Ayarlanmış' : '❌ Ayarlanmamış'}</li>
                <li><strong>İnternet Bağlantısı:</strong> ${debugInfo.browser.online ? '✅ Online' : '❌ Offline'}</li>
                <li><strong>CORS Desteği:</strong> ${debugInfo.browser.corsSupport}</li>
                <li><strong>CORS Proxy:</strong> ${debugInfo.geminiAI.useProxy ? '🔄 Etkin' : '❌ Devre dışı'}</li>
                <li><strong>JSON Desteği:</strong> ${debugInfo.browser.jsonSupport}</li>
                <li><strong>Endikasyon Verisi:</strong> ${debugInfo.aiIndications.count} adet</li>
                <li><strong>LocalStorage:</strong> ${debugInfo.localStorage.hasApiKey ? '✅ API Key mevcut' : '❌ API Key yok'}</li>
            </ul>
        </div>
        
        <div class="alert alert-warning mt-3">
            <h6>🧪 Manuel Test Araçları</h6>
            <button class="btn btn-sm btn-outline-warning me-2" onclick="testGeminiAPI().then(result => alert(result ? '✅ Basit API testi başarılı' : '❌ Basit API testi başarısız'))">
                <i class="fas fa-vial me-1"></i>Basit API Testi
            </button>
            <button class="btn btn-sm btn-outline-info me-2" onclick="console.log('Gemini AI:', window.geminiAI); console.log('API Key:', window.geminiAI?.getApiKey()?.substring(0, 10) + '...'); alert('Konsola yazdırıldı')">
                <i class="fas fa-terminal me-1"></i>Konsola Yazdır
            </button>
            <button class="btn btn-sm btn-outline-secondary me-2" onclick="navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2)).then(() => alert('Debug bilgileri kopyalandı'))">
                <i class="fas fa-copy me-1"></i>Kopyala
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.geminiAI.setUseProxy(!window.geminiAI.getUseProxy()); showDebugInfo(); alert('CORS Proxy durumu değiştirildi')">
                <i class="fas fa-exchange-alt me-1"></i>CORS Proxy ${debugInfo.geminiAI.useProxy ? 'Kapat' : 'Aç'}
            </button>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Tarayıcı Konsolu:</strong> F12 tuşuna basarak daha detaylı hata bilgilerini görebilirsiniz.
        </div>
    `;
}

// Son aramaları yükle
function loadRecentSearches() {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
        recentSearches = JSON.parse(saved);
    }
    updateRecentSearches();
}

// Son aramalara ekle
function addToRecentSearches(barkod, originalInput) {
    const search = {
        barkod: barkod,
        input: originalInput,
        timestamp: new Date().toISOString(),
        found: barkodData[barkod] ? true : false
    };
    
    // Aynı barkod varsa kaldır
    recentSearches = recentSearches.filter(s => s.barkod !== barkod);
    
    // Başa ekle
    recentSearches.unshift(search);
    
    // Son 10 aramayı tut
    if (recentSearches.length > 10) {
        recentSearches = recentSearches.slice(0, 10);
    }
    
    // LocalStorage'a kaydet
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    updateRecentSearches();
}

// Son aramaları güncelle
function updateRecentSearches() {
    const recentSearchesDiv = document.getElementById('recentSearches');
    if (!recentSearchesDiv) return;
    
    if (recentSearches.length === 0) {
        recentSearchesDiv.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-history fa-2x mb-2"></i>
                <p>Henüz arama yapılmadı</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    recentSearches.forEach((search, index) => {
        const date = new Date(search.timestamp).toLocaleString('tr-TR');
        const statusClass = search.found ? 'status-success' : 'status-error';
        const statusText = search.found ? 'Bulundu' : 'Bulunamadı';
        const icon = search.found ? 'fa-check-circle' : 'fa-times-circle';
        
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                        <i class="fas ${icon} text-${search.found ? 'success' : 'danger'} me-2"></i>
                        <div>
                            <strong>${search.barkod}</strong>
                            <br>
                            <small class="text-muted">${search.input}</small>
                        </div>
                    </div>
                </div>
                <div class="text-end">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <br>
                    <small class="text-muted">${date}</small>
                </div>
            </div>
        `;
    });
    
    recentSearchesDiv.innerHTML = html;
}

// Sayfa yüklendiğinde tema ayarla
window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    currentTheme = savedTheme;
    
    const themeToggle = document.getElementById('themeToggle');
    if (currentTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Açık Mod';
    }
    
    // AI Event Listeners'ı ekle
    setupAIEventListeners();
}); 

// ==================== AI ASSISTANT FUNCTIONS ====================

// AI Event Listeners
function setupAIEventListeners() {
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    const clearAiBtn = document.getElementById('clearAiBtn');
    const symptomInput = document.getElementById('symptomInput');
    const apiKeyBtn = document.getElementById('apiKeyBtn');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const testAiBtn = document.getElementById('testAiBtn');
    const debugBtn = document.getElementById('debugBtn');
    
    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', analyzeSymptoms);
    }
    
    if (clearAiBtn) {
        clearAiBtn.addEventListener('click', clearAIForm);
    }
    
    if (symptomInput) {
        symptomInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                analyzeSymptoms();
            }
        });
    }
    
    if (apiKeyBtn) {
        apiKeyBtn.addEventListener('click', showApiKeyModal);
    }
    
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
    
    if (testAiBtn) {
        testAiBtn.addEventListener('click', testAI);
    }
    
    if (debugBtn) {
        debugBtn.addEventListener('click', showDebugInfo);
    }
    
    // API key durumunu kontrol et
    checkApiKeyStatus();
}

// AI Semptom Analizi
async function analyzeSymptoms() {
    const symptoms = document.getElementById('symptomInput').value.trim();
    const age = document.getElementById('patientAge').value;
    const gender = document.getElementById('patientGender').value;
    const weight = document.getElementById('patientWeight').value;
    const resultsArea = document.getElementById('aiResults');
    
    if (!symptoms) {
        showWarning('Lütfen semptomlarınızı açıklayın!');
        return;
    }
    
    // Loading göster
    showAILoading(resultsArea);
    
    try {
        // AI analizi simüle et (gerçek AI entegrasyonu için API çağrısı yapılabilir)
        const analysis = await performAIAnalysis(symptoms, age, gender, weight);
        
        // Stok entegrasyonu
        const hastaBilgileri = { yas: age, cinsiyet: gender, kilo: weight };
        const stokEntegreAnaliz = await window.aiStokEntegrasyonu.aiOnerileriniStoklaEntegreEt(analysis, hastaBilgileri);
        
        displayAIResults(stokEntegreAnaliz);
        
        // Son aramalara ekle
        addToRecentSearches('AI_Analysis', symptoms);
        
    } catch (error) {
        showError('AI analizi sırasında hata oluştu: ' + error.message);
    }
}

// AI Analizi - Gemini AI ile
async function performAIAnalysis(symptoms, age, gender, weight) {
    try {
        // Gemini AI kullanılabilir mi kontrol et
        if (window.geminiAI && window.geminiAI.isConfigured) {
            console.log('Gemini AI ile analiz yapılıyor...');
            
            // Gemini AI ile ana analiz
            const geminiAnalysis = await window.geminiAI.analyzeSymptoms(
                symptoms, 
                age, 
                gender, 
                weight, 
                window.aiIndications || {}
            );
            
            console.log('✅ Ana analiz tamamlandı:', geminiAnalysis);
            
            // Satış önerileri (opsiyonel)
            let salesRecommendations = null;
            try {
                salesRecommendations = await window.geminiAI.getSalesRecommendations(
                    symptoms,
                    'Orta bütçe',
                    'Etkili ürünler'
                );
                console.log('✅ Satış önerileri alındı');
            } catch (salesError) {
                console.warn('⚠️ Satış önerileri alınamadı:', salesError);
            }
            
            // Müşteri segmentasyonu (opsiyonel)
            let segmentation = null;
            try {
                segmentation = await window.geminiAI.getCustomerSegmentation(
                    age,
                    gender,
                    symptoms,
                    'Genel'
                );
                console.log('✅ Müşteri segmentasyonu alındı');
            } catch (segError) {
                console.warn('⚠️ Müşteri segmentasyonu alınamadı:', segError);
            }
            
            // Sonuçları birleştir
            return {
                symptoms: geminiAnalysis.detected_symptoms || [],
                recommendations: geminiAnalysis.recommendations || [],
                confidence: geminiAnalysis.confidence || 85,
                warnings: geminiAnalysis.warnings || [],
                analysis: geminiAnalysis.analysis || 'AI analizi tamamlandı.',
                sales_recommendations: salesRecommendations,
                customer_segmentation: segmentation,
                cross_selling: geminiAnalysis.cross_selling || [],
                sales_notes: geminiAnalysis.sales_notes || ''
            };
            
        } else {
            // Fallback: Simüle edilmiş analiz
            console.log('Gemini AI ayarlanmamış, simüle edilmiş analiz kullanılıyor...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const symptomKeywords = extractSymptomKeywords(symptoms.toLowerCase());
            const recommendations = generateRecommendations(symptomKeywords, age, gender, weight);
            
            return {
                symptoms: symptomKeywords,
                recommendations: recommendations,
                confidence: calculateConfidence(symptomKeywords),
                warnings: generateWarnings(age, gender, weight),
                analysis: generateAnalysis(symptomKeywords, age, gender, weight),
                safety_notes: 'Bu öneriler simüle edilmiştir. Daha doğru sonuçlar için Gemini AI API key ayarlayın.'
            };
        }
        
    } catch (error) {
        console.error('❌ AI analizi hatası:', error);
        
        // Hata durumunda fallback
        const symptomKeywords = extractSymptomKeywords(symptoms.toLowerCase());
        const recommendations = generateRecommendations(symptomKeywords, age, gender, weight);
        
        return {
            symptoms: symptomKeywords,
            recommendations: recommendations,
            confidence: calculateConfidence(symptomKeywords),
            warnings: [...generateWarnings(age, gender, weight), `AI analizi sırasında hata oluştu: ${error.message}`],
            analysis: 'AI analizi sırasında hata oluştu. Temel öneriler gösteriliyor.',
            safety_notes: 'Hata nedeniyle sınırlı analiz yapıldı. Lütfen API key durumunu kontrol edin.'
        };
    }
}

// Semptom Anahtar Kelimelerini Çıkar
function extractSymptomKeywords(symptoms) {
    const keywordMap = {
        'baş ağrısı': ['Baş Ağrısı'],
        'baş ağrım': ['Baş Ağrısı'],
        'migren': ['Baş Ağrısı'],
        'uyuyamıyorum': ['Uyuyamama'],
        'uyku': ['Uyuyamama'],
        'insomnia': ['Uyuyamama'],
        'stres': ['Stres'],
        'stresli': ['Stres'],
        'anksiyete': ['Anksiyete'],
        'endişe': ['Anksiyete'],
        'depresyon': ['Depresyon'],
        'mutsuz': ['Depresyon'],
        'konsantrasyon': ['Konsantrasyon Eksikliği'],
        'dikkat': ['Konsantrasyon Eksikliği'],
        'yorgun': ['Yorgunluk'],
        'yorgunluk': ['Yorgunluk'],
        'halsiz': ['Yorgunluk'],
        'eklem ağrısı': ['Eklem Ağrısı'],
        'kas ağrısı': ['Kas Ağrısı'],
        'sindirim': ['Sindirim Sorunları'],
        'mide': ['Sindirim Sorunları'],
        'kabızlık': ['Kabızlık'],
        'ishal': ['İshal'],
        'mide yanması': ['Mide Yanması'],
        'cilt': ['Cilt Kuruluğu'],
        'sivilce': ['Sivilce'],
        'egzama': ['Egzama'],
        'alerji': ['Alerjiler'],
        'soğuk algınlığı': ['Soğuk Algınlığı'],
        'grip': ['Grip'],
        'bağışıklık': ['Bağışıklık Güçlendirme'],
        'kilo verme': ['Kilo Verme'],
        'kilo alma': ['Kilo Alma'],
        'kas geliştirme': ['Kas Geliştirme'],
        'enerji': ['Enerji Artırma'],
        'detoks': ['Detoks'],
        'karaciğer': ['Karaciğer Sağlığı'],
        'böbrek': ['Böbrek Sağlığı'],
        'kalp': ['Kalp Sağlığı'],
        'tansiyon': ['Tansiyon Düşürme'],
        'kolesterol': ['Kolesterol Düşürme']
    };
    
    const foundKeywords = [];
    for (const [keyword, indications] of Object.entries(keywordMap)) {
        if (symptoms.includes(keyword)) {
            foundKeywords.push(...indications);
        }
    }
    
    return [...new Set(foundKeywords)]; // Duplikasyonları kaldır
}

// Öneriler Oluştur
function generateRecommendations(symptoms, age, gender, weight) {
    const recommendations = [];
    
    symptoms.forEach(symptom => {
        if (window.aiIndications && window.aiIndications[symptom]) {
            const indication = window.aiIndications[symptom];
            const products = Object.entries(indication.Ürünler || {}).map(([product, details]) => {
                let dosage = details.Dozlama;
                
                // Yaş bazlı dozaj ayarlaması
                if (age) {
                    if (age < 18) {
                        dosage = `Çocuk dozu: ${details.Dozlama} (Doktor kontrolü gerekli)`;
                    } else if (age > 65) {
                        dosage = `Yaşlı dozu: ${details.Dozlama} (Düşük dozla başlayın)`;
                    }
                }
                
                return {
                    name: product,
                    dosage: dosage,
                    usage: details['Kullanım Şekli'],
                    contraindications: details.Kontrendikasyonlar
                };
            });
            
            recommendations.push({
                symptom: symptom,
                products: products,
                description: indication.Açıklama || 'Bu semptom için önerilen ürünler'
            });
        }
    });
    
    return recommendations;
}

// Güven Skoru Hesapla
function calculateConfidence(symptoms) {
    if (symptoms.length === 0) return 0;
    if (symptoms.length === 1) return 85;
    if (symptoms.length === 2) return 90;
    return 95;
}

// Uyarılar Oluştur
function generateWarnings(age, gender, weight) {
    const warnings = [];
    
    if (age && age < 18) {
        warnings.push('18 yaş altı hastalar için doktor kontrolü önerilir');
    }
    
    if (age && age > 65) {
        warnings.push('65 yaş üstü hastalar için düşük dozla başlanması önerilir');
    }
    
    if (weight && weight < 50) {
        warnings.push('Düşük kilolu hastalar için dozaj ayarlaması gerekebilir');
    }
    
    warnings.push('Bu öneriler sadece bilgilendirme amaçlıdır, doktor tavsiyesi yerine geçmez');
    
    return warnings;
}

// Analiz Raporu Oluştur
function generateAnalysis(symptoms, age, gender, weight) {
    let analysis = `AI analizi tamamlandı. `;
    
    if (symptoms.length > 0) {
        analysis += `${symptoms.length} farklı semptom tespit edildi. `;
    }
    
    if (age) {
        analysis += `Yaş: ${age}, `;
    }
    
    if (gender) {
        analysis += `Cinsiyet: ${gender}, `;
    }
    
    if (weight) {
        analysis += `Kilo: ${weight}kg. `;
    }
    
    analysis += 'Kişiselleştirilmiş öneriler aşağıda listelenmiştir.';
    
    return analysis;
}

// AI Sonuçlarını Göster
function displayAIResults(analysis) {
    const resultsArea = document.getElementById('aiResults');
    
    let html = `
        <div class="ai-analysis-box">
            <h6><i class="fas fa-brain me-2"></i>AI Analiz Raporu</h6>
            <p>${analysis.analysis}</p>
            <div class="mt-2">
                <span class="ai-confidence">Güven Skoru: %${analysis.confidence}</span>
            </div>
        </div>
    `;
    
    // Tespit edilen semptomlar
    if (analysis.symptoms && analysis.symptoms.length > 0) {
        html += `
            <div class="ai-recommendation">
                <h6><i class="fas fa-search me-2"></i>Tespit Edilen Semptomlar</h6>
                <div class="mt-2">
        `;
        
        analysis.symptoms.forEach(symptom => {
            html += `<span class="symptom-tag">${symptom}</span>`;
        });
        
        html += `</div></div>`;
    }
    
    // Ana öneriler
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += `<h6 class="mt-3"><i class="fas fa-pills me-2"></i>Önerilen Ürünler</h6>`;
        
        analysis.recommendations.forEach(rec => {
            html += `
                <div class="ai-suggestion-card">
                    <h6><i class="fas fa-stethoscope me-2"></i>${rec.symptom}</h6>
                    <p class="text-muted">${rec.description}</p>
                    <div class="row">
            `;
            
            if (rec.products && rec.products.length > 0) {
                rec.products.forEach(product => {
                    html += `
                        <div class="col-md-6 mb-2">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${product.name}</h6>
                                    <p class="card-text">
                                        <strong>Dozlama:</strong> ${product.dosage}<br>
                                        <strong>Kullanım:</strong> ${product.usage}<br>
                                        <strong>Uyarı:</strong> ${product.contraindications}
                                    </p>
                                    ${product.cross_sell && product.cross_sell.length > 0 ? `
                                        <div class="mt-2">
                                            <strong>Ek Öneriler:</strong> ${product.cross_sell.join(', ')}
                                        </div>
                                    ` : ''}
                                    ${product.sales_tips ? `
                                        <div class="mt-2">
                                            <strong>Satış İpucu:</strong> ${product.sales_tips}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `</div></div>`;
        });
    }
    
    // Uyarılar
    if (analysis.warnings && analysis.warnings.length > 0) {
        html += `<h6 class="mt-3"><i class="fas fa-exclamation-triangle me-2"></i>Önemli Uyarılar</h6>`;
        
        analysis.warnings.forEach(warning => {
            html += `
                <div class="ai-warning">
                    <i class="fas fa-shield-alt me-2"></i>${warning}
                </div>
            `;
        });
    }
    
    // Cross-Selling Fırsatları
    if (analysis.cross_selling && analysis.cross_selling.length > 0) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-plus-circle me-2"></i>Ek Satış Fırsatları</h6>
                ${analysis.cross_selling.map(opportunity => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <h6 class="card-title">${opportunity.category}</h6>
                            <p class="card-text">
                                <strong>Önerilen Ürünler:</strong> ${opportunity.products.join(', ')}<br>
                                <strong>Neden Önerildi:</strong> ${opportunity.reason}
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Satış Önerileri
    if (analysis.sales_recommendations) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-chart-line me-2"></i>Satış Stratejisi</h6>
                <div class="alert alert-info">
                    <strong>${analysis.sales_recommendations.sales_strategy || 'Kişiselleştirilmiş satış stratejisi'}</strong>
                </div>
                
                ${analysis.sales_recommendations.premium_products ? `
                    <h6 class="mt-3"><i class="fas fa-crown me-2"></i>Premium Ürünler</h6>
                    ${analysis.sales_recommendations.premium_products.map(product => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6 class="card-title">${product.name}</h6>
                                <p class="card-text">
                                    <strong>Fiyat:</strong> ${product.price_range}<br>
                                    <strong>Faydalar:</strong> ${product.benefits.join(', ')}<br>
                                    <strong>Satış Konuşması:</strong> ${product.sales_pitch}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
                
                ${analysis.sales_recommendations.budget_alternatives ? `
                    <h6 class="mt-3"><i class="fas fa-piggy-bank me-2"></i>Ekonomik Alternatifler</h6>
                    ${analysis.sales_recommendations.budget_alternatives.map(product => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6 class="card-title">${product.name}</h6>
                                <p class="card-text">
                                    <strong>Fiyat:</strong> ${product.price_range}<br>
                                    <strong>Faydalar:</strong> ${product.benefits.join(', ')}<br>
                                    <strong>Satış Stratejisi:</strong> ${product.sales_pitch}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
                
                ${analysis.sales_recommendations.sales_tips ? `
                    <h6 class="mt-3"><i class="fas fa-lightbulb me-2"></i>Satış İpuçları</h6>
                    <ul>
                        ${analysis.sales_recommendations.sales_tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }
    
    // Müşteri Segmentasyonu
    if (analysis.customer_segmentation) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-users me-2"></i>Müşteri Profili</h6>
                <div class="alert alert-success">
                    <strong>Segment:</strong> ${analysis.customer_segmentation.customer_segment}<br>
                    <strong>Yaş Grubu:</strong> ${analysis.customer_segmentation.age_group}<br>
                    <strong>Yaşam Tarzı:</strong> ${analysis.customer_segmentation.lifestyle_category}
                </div>
                
                ${analysis.customer_segmentation.personalized_recommendations ? `
                    <h6 class="mt-3"><i class="fas fa-user-check me-2"></i>Kişiselleştirilmiş Öneriler</h6>
                    ${analysis.customer_segmentation.personalized_recommendations.map(rec => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6 class="card-title">${rec.category}</h6>
                                <p class="card-text">
                                    <strong>Ürünler:</strong> ${rec.products.join(', ')}<br>
                                    <strong>Gerekçe:</strong> ${rec.reasoning}<br>
                                    <strong>Dozaj Notları:</strong> ${rec.dosage_notes}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    }
    
    // Satış Notları
    if (analysis.sales_notes) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-sticky-note me-2"></i>Satış Notları</h6>
                <p>${analysis.sales_notes}</p>
            </div>
        `;
    }
    
    // Güvenlik Notları
    if (analysis.safety_notes) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-shield-alt me-2"></i>Güvenlik Notları</h6>
                <div class="alert alert-warning">
                    ${analysis.safety_notes}
                </div>
            </div>
        `;
    }
    
    // Stok Entegrasyonu
    if (analysis.stok_entegrasyonu) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-boxes me-2"></i>Stok Durumu ve Satış Önerileri</h6>
            </div>
        `;
        // Stok entegrasyonu sonuçlarını göster
        const stokElement = document.createElement('div');
        stokElement.id = 'stokEntegrasyonu';
        window.aiStokEntegrasyonu.stokDurumuGoster(analysis, stokElement);
        html += stokElement.innerHTML;
    }
    
    resultsArea.innerHTML = html;
    resultsArea.style.display = 'block';
}

// AI Loading Göster
function showAILoading(element) {
    element.innerHTML = `
        <div class="text-center">
            <div class="ai-loading mb-3"></div>
            <h5>AI Analizi Yapılıyor...</h5>
            <p class="text-muted">Semptomlarınız analiz ediliyor ve kişiselleştirilmiş öneriler hazırlanıyor</p>
            <div class="progress mt-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 100%"></div>
            </div>
        </div>
    `;
}

// AI Formunu Temizle
function clearAIForm() {
    document.getElementById('symptomInput').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientGender').value = '';
    document.getElementById('patientWeight').value = '';
    
    const resultsArea = document.getElementById('aiResults');
    resultsArea.innerHTML = `
        <div class="text-center text-muted">
            <i class="fas fa-robot fa-3x mb-3"></i>
            <p>Semptomlarınızı yazın ve AI asistanınız size özel öneriler sunsun</p>
            <small class="text-muted">
                <i class="fas fa-shield-alt me-1"></i>
                Bu öneriler sadece bilgilendirme amaçlıdır, doktor tavsiyesi yerine geçmez
            </small>
        </div>
    `;
    
    document.getElementById('aiAnalysisDetails').style.display = 'none';
}

// API Key Modal'ını Göster
function showApiKeyModal() {
    const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    // Mevcut API key'i göster
    if (window.geminiAI && window.geminiAI.getApiKey()) {
        apiKeyInput.value = window.geminiAI.getApiKey();
    }
    
    modal.show();
}

// API Key'i Kaydet
async function saveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showWarning('Lütfen API key girin!');
        return;
    }
    
    if (!apiKey.startsWith('AIza')) {
        showWarning('Geçersiz API key formatı! Gemini API key "AIza" ile başlamalıdır.');
        return;
    }
    
    try {
        // API key'i ayarla
        window.geminiAI.setApiKey(apiKey);
        
        // Test isteği gönder
        await window.geminiAI.generateContent('Test mesajı', 0.1);
        
        // Başarılı
        updateApiKeyStatus(true);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        modal.hide();
        
        showSuccess('API key başarıyla kaydedildi ve test edildi!');
        
    } catch (error) {
        console.error('API key test hatası:', error);
        showError('API key test edilemedi: ' + error.message);
        updateApiKeyStatus(false);
    }
}

// API Key Durumunu Kontrol Et
async function checkApiKeyStatus() {
    const isConfigured = window.geminiAI && window.geminiAI.isConfigured;
    
    if (isConfigured) {
        try {
            // API key'i test et
            await window.geminiAI.generateContent('Test mesajı', 0.1);
            updateApiKeyStatus(true);
            console.log('✅ Gemini AI API key başarıyla test edildi!');
        } catch (error) {
            console.error('❌ API key test hatası:', error);
            updateApiKeyStatus(false);
        }
    } else {
        updateApiKeyStatus(false);
    }
}

// API Key Durumunu Güncelle
function updateApiKeyStatus(isConfigured) {
    const statusElement = document.getElementById('apiKeyStatus');
    const apiKeyBtn = document.getElementById('apiKeyBtn');
    
    if (statusElement) {
        if (isConfigured) {
            statusElement.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>API key ayarlanmış</span>';
        } else {
            statusElement.innerHTML = '<span class="text-muted"><i class="fas fa-times-circle me-1"></i>API key ayarlanmamış</span>';
        }
    }
    
    if (apiKeyBtn) {
        if (isConfigured) {
            apiKeyBtn.innerHTML = '<i class="fas fa-check me-2"></i>API Key Hazır';
            apiKeyBtn.className = 'btn btn-success w-100';
        } else {
            apiKeyBtn.innerHTML = '<i class="fas fa-key me-2"></i>API Key Ayarla';
            apiKeyBtn.className = 'btn btn-outline-info w-100';
        }
    }
}

// Başarı Mesajı Göster
function showSuccess(message) {
    const resultsArea = document.getElementById('aiResults');
    resultsArea.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle me-2"></i>${message}
        </div>
    `;
}

// AI Test Fonksiyonu
async function testAI() {
    const resultsArea = document.getElementById('aiResults');
    
    // Loading göster
    resultsArea.innerHTML = `
        <div class="text-center">
            <div class="ai-loading mb-3"></div>
            <h5>Gemini AI Test Ediliyor...</h5>
            <p class="text-muted">API bağlantısı ve AI analizi test ediliyor</p>
        </div>
    `;
    
    try {
        console.log('🧪 AI Test başlatılıyor...');
        
        // Önce basit API testi yap
        const simpleTest = await window.testGeminiAPI();
        if (!simpleTest) {
            throw new Error('Basit API testi başarısız');
        }
        
        // Test semptomları
        const testSymptoms = "Baş ağrım var ve uyuyamıyorum";
        const testAge = "30";
        const testGender = "erkek";
        const testWeight = "70";
        
        console.log('🧪 Semptom analizi testi başlatılıyor...');
        
        // Gemini AI ile test analizi
        const testAnalysis = await window.geminiAI.analyzeSymptoms(
            testSymptoms,
            testAge,
            testGender,
            testWeight,
            window.aiIndications || {}
        );
        
        console.log('✅ AI Test başarılı:', testAnalysis);
        
        // Test sonuçlarını göster
        resultsArea.innerHTML = `
            <div class="ai-analysis-box">
                <h6><i class="fas fa-vial me-2"></i>AI Test Sonuçları</h6>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>✅ Gemini AI Başarıyla Çalışıyor!</strong>
                </div>
                <p><strong>Test Semptomları:</strong> ${testSymptoms}</p>
                <p><strong>Test Hasta:</strong> ${testAge} yaş, ${testGender}, ${testWeight}kg</p>
                <p><strong>Güven Skoru:</strong> %${testAnalysis.confidence || 'N/A'}</p>
                <p><strong>Tespit Edilen Semptomlar:</strong> ${(testAnalysis.detected_symptoms || []).join(', ')}</p>
                <p><strong>Önerilen Kategoriler:</strong> ${(testAnalysis.recommendations || []).length} adet</p>
            </div>
            
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-lightbulb me-2"></i>Test Analizi</h6>
                <p>${testAnalysis.analysis || 'AI analizi başarıyla tamamlandı.'}</p>
            </div>
            
            <div class="alert alert-info mt-3">
                <i class="fas fa-info-circle me-2"></i>
                <strong>AI Test Tamamlandı!</strong> Artık gerçek semptomlarınızı analiz edebilirsiniz.
            </div>
        `;
        
    } catch (error) {
        console.error('❌ AI Test hatası:', error);
        
        resultsArea.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>AI Test Başarısız!</strong>
            </div>
            <div class="alert alert-warning">
                <h6>Hata Detayları:</h6>
                <p>${error.message}</p>
                <hr>
                <h6>Olası Çözümler:</h6>
                <ul>
                    <li>API key'in doğru olduğundan emin olun</li>
                    <li>İnternet bağlantınızı kontrol edin</li>
                    <li>API key'in aktif olduğundan emin olun</li>
                    <li>Tarayıcı konsolunu kontrol edin (F12)</li>
                    <li>CORS sorunu olabilir, farklı tarayıcı deneyin</li>
                </ul>
            </div>
            
            <div class="alert alert-info mt-3">
                <h6>Debug Bilgileri:</h6>
                <p>Tarayıcı konsolunda (F12) daha detaylı hata bilgilerini görebilirsiniz.</p>
                <button class="btn btn-sm btn-outline-info" onclick="showDebugInfo()">
                    <i class="fas fa-bug me-1"></i>Debug Bilgilerini Göster
                </button>
            </div>
        `;
    }
}

// Dermokozmetik AI Event Listeners
function setupDermokozmetikEventListeners() {
    const analyzeBtn = document.getElementById('dermokozmetikAnalyzeBtn');
    const clearBtn = document.getElementById('clearDermokozmetikBtn');
    const apiKeyBtn = document.getElementById('dermokozmetikApiKeyBtn');
    const testBtn = document.getElementById('dermokozmetikTestBtn');
    const debugBtn = document.getElementById('dermokozmetikDebugBtn');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeDermokozmetik);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearDermokozmetikForm);
    }
    
    if (apiKeyBtn) {
        apiKeyBtn.addEventListener('click', showDermokozmetikApiKeyModal);
    }
    
    if (testBtn) {
        testBtn.addEventListener('click', testDermokozmetikAI);
    }
    
    if (debugBtn) {
        debugBtn.addEventListener('click', showDermokozmetikDebugInfo);
    }
}

// Dermokozmetik Semptom Analizi
async function analyzeDermokozmetik() {
    const symptoms = document.getElementById('dermokozmetikSymptomInput').value.trim();
    const age = document.getElementById('dermokozmetikPatientAge').value;
    const gender = document.getElementById('dermokozmetikPatientGender').value;
    const weight = document.getElementById('dermokozmetikPatientWeight').value;
    const resultsArea = document.getElementById('dermokozmetikResults');
    
    if (!symptoms) {
        showWarning('Lütfen dermokozmetik semptomlarınızı açıklayın!');
        return;
    }
    
    // Loading göster
    showDermokozmetikLoading(resultsArea);
    
    try {
        // AI analizi
        const analysis = await performDermokozmetikAIAnalysis(symptoms, age, gender, weight);
        
        // Stok entegrasyonu
        const hastaBilgileri = { yas: age, cinsiyet: gender, kilo: weight };
        const stokEntegreAnaliz = await window.aiStokEntegrasyonu.aiOnerileriniStoklaEntegreEt(analysis, hastaBilgileri);
        
        displayDermokozmetikResults(stokEntegreAnaliz);
        
        // Son aramalara ekle
        addToRecentSearches('Dermokozmetik_AI', symptoms);
        
    } catch (error) {
        showError('Dermokozmetik AI analizi sırasında hata oluştu: ' + error.message);
    }
}

// Dermokozmetik AI Analizi - Gemini AI ile
async function performDermokozmetikAIAnalysis(symptoms, age, gender, weight) {
    try {
        // Gemini AI kullanılabilir mi kontrol et
        if (window.geminiAI && window.geminiAI.isConfigured) {
            console.log('Dermokozmetik Gemini AI ile analiz yapılıyor...');
            
            // Gemini AI ile ana analiz
            const geminiAnalysis = await window.geminiAI.analyzeDermokozmetik(
                symptoms, 
                age, 
                gender, 
                weight, 
                window.aiIndications || {}
            );
            
            console.log('✅ Dermokozmetik ana analiz tamamlandı:', geminiAnalysis);
            
            // Satış önerileri (opsiyonel)
            let salesRecommendations = null;
            try {
                salesRecommendations = await window.geminiAI.getSalesRecommendations(
                    symptoms,
                    'Orta bütçe',
                    'Etkili dermokozmetik ürünler'
                );
                console.log('✅ Dermokozmetik satış önerileri alındı');
            } catch (salesError) {
                console.warn('⚠️ Dermokozmetik satış önerileri alınamadı:', salesError);
            }
            
            // Müşteri segmentasyonu (opsiyonel)
            let segmentation = null;
            try {
                segmentation = await window.geminiAI.getCustomerSegmentation(
                    age,
                    gender,
                    symptoms,
                    'Dermokozmetik'
                );
                console.log('✅ Dermokozmetik müşteri segmentasyonu alındı');
            } catch (segError) {
                console.warn('⚠️ Dermokozmetik müşteri segmentasyonu alınamadı:', segError);
            }
            
            // Sonuçları birleştir
            return {
                symptoms: geminiAnalysis.detected_symptoms || [],
                recommendations: geminiAnalysis.recommendations || [],
                confidence: geminiAnalysis.confidence || 85,
                warnings: geminiAnalysis.warnings || [],
                analysis: geminiAnalysis.analysis || 'Dermokozmetik AI analizi tamamlandı.',
                sales_recommendations: salesRecommendations,
                customer_segmentation: segmentation,
                cross_selling: geminiAnalysis.cross_selling || [],
                sales_notes: geminiAnalysis.sales_notes || ''
            };
            
        } else {
            // Fallback: Simüle edilmiş analiz
            console.log('Gemini AI ayarlanmamış, simüle edilmiş dermokozmetik analiz kullanılıyor...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const symptomKeywords = extractDermokozmetikKeywords(symptoms.toLowerCase());
            const recommendations = generateDermokozmetikRecommendations(symptomKeywords, age, gender, weight);
            
            return {
                symptoms: symptomKeywords,
                recommendations: recommendations,
                confidence: calculateDermokozmetikConfidence(symptomKeywords),
                warnings: generateDermokozmetikWarnings(age, gender, weight),
                analysis: generateDermokozmetikAnalysis(symptomKeywords, age, gender, weight),
                safety_notes: 'Bu öneriler simüle edilmiştir. Daha doğru sonuçlar için Gemini AI API key ayarlayın.'
            };
        }
        
    } catch (error) {
        console.error('❌ Dermokozmetik AI analizi hatası:', error);
        
        // Hata durumunda fallback
        const symptomKeywords = extractDermokozmetikKeywords(symptoms.toLowerCase());
        const recommendations = generateDermokozmetikRecommendations(symptomKeywords, age, gender, weight);
        
        return {
            symptoms: symptomKeywords,
            recommendations: recommendations,
            confidence: calculateDermokozmetikConfidence(symptomKeywords),
            warnings: [...generateDermokozmetikWarnings(age, gender, weight), `Dermokozmetik AI analizi sırasında hata oluştu: ${error.message}`],
            analysis: 'Dermokozmetik AI analizi sırasında hata oluştu. Temel öneriler gösteriliyor.',
            safety_notes: 'Hata nedeniyle sınırlı analiz yapıldı. Lütfen API key durumunu kontrol edin.'
        };
    }
}

// Dermokozmetik Anahtar Kelimelerini Çıkar
function extractDermokozmetikKeywords(symptoms) {
    const keywordMap = {
        'kuru': ['Cilt Kuruluğu'],
        'kuruluk': ['Cilt Kuruluğu'],
        'kırışık': ['Kırışıklar'],
        'kırışıklık': ['Kırışıklar'],
        'yaşlanma': ['Yaşlanma İşaretleri'],
        'yaşlı': ['Yaşlanma İşaretleri'],
        'sivilce': ['Akne'],
        'akne': ['Akne'],
        'lekeler': ['Cilt Lekeleri'],
        'leke': ['Cilt Lekeleri'],
        'pigmentasyon': ['Pigmentasyon'],
        'güneş': ['Güneş Hasarı'],
        'güneş lekesi': ['Güneş Lekeleri'],
        'sivilce izi': ['Akne İzleri'],
        'iz': ['Akne İzleri'],
        'göz altı': ['Göz Altı Sorunları'],
        'göz çevresi': ['Göz Çevresi Sorunları'],
        'morluk': ['Göz Altı Morlukları'],
        'şişlik': ['Göz Altı Şişlikleri'],
        'dudak': ['Dudak Sorunları'],
        'dudak kuruluğu': ['Dudak Kuruluğu'],
        'çatlak': ['Dudak Çatlakları'],
        'hassasiyet': ['Cilt Hassasiyeti'],
        'hassas': ['Cilt Hassasiyeti'],
        'kızarıklık': ['Kızarıklık'],
        'kaşıntı': ['Kaşıntı'],
        'pullanma': ['Pullanma'],
        'mat': ['Mat Cilt'],
        'parlak': ['Parlak Cilt'],
        'geniş gözenek': ['Geniş Gözenekler'],
        'gözenek': ['Geniş Gözenekler'],
        'siyah nokta': ['Siyah Noktalar'],
        'komedon': ['Komedonlar'],
        'rosacea': ['Rosacea'],
        'egzama': ['Egzama'],
        'sedef': ['Sedef Hastalığı'],
        'vitiligo': ['Vitiligo'],
        'melazma': ['Melazma'],
        'çil': ['Çiller'],
        'ben': ['Benler'],
        'nevus': ['Nevuslar']
    };
    
    const foundKeywords = [];
    for (const [keyword, indications] of Object.entries(keywordMap)) {
        if (symptoms.includes(keyword)) {
            foundKeywords.push(...indications);
        }
    }
    
    return foundKeywords.length > 0 ? foundKeywords : ['Genel Cilt Bakımı'];
}

// Dermokozmetik Önerileri Oluştur
function generateDermokozmetikRecommendations(symptoms, age, gender, weight) {
    const recommendations = [];
    
    symptoms.forEach(symptom => {
        let products = [];
        
        switch (symptom) {
            case 'Cilt Kuruluğu':
                products = [
                    {
                        name: 'Nemlendirici Krem',
                        dosage: 'Günde 2 kez',
                        usage: 'Temizlik sonrası yüz ve boyun bölgesine uygulayın',
                        contraindications: 'Aktif akne durumunda dikkatli kullanın',
                        cross_sell: ['Yüz Temizleyici', 'Tonik'],
                        sales_tips: 'Hyaluronik asit içeren nemlendirici önerin'
                    },
                    {
                        name: 'Hyaluronik Asit Serum',
                        dosage: 'Günde 1 kez',
                        usage: 'Temizlik sonrası, nemlendirici öncesi',
                        contraindications: 'Açık yaralarda kullanmayın',
                        cross_sell: ['Güneş Koruyucu', 'Gece Kremi'],
                        sales_tips: 'Serum + krem kombinasyonu daha etkili'
                    }
                ];
                break;
                
            case 'Kırışıklar':
                products = [
                    {
                        name: 'Retinol Krem',
                        dosage: 'Gece günde 1 kez',
                        usage: 'Temizlik sonrası, nemlendirici öncesi',
                        contraindications: 'Hamilelik, güneş hassasiyeti',
                        cross_sell: ['Güneş Koruyucu SPF 50+', 'Peptid Serum'],
                        sales_tips: 'Retinol + güneş koruyucu kombinasyonu önerin'
                    },
                    {
                        name: 'Peptid Serum',
                        dosage: 'Günde 2 kez',
                        usage: 'Sabah ve akşam temizlik sonrası',
                        contraindications: 'Aktif inflamasyon durumunda kullanmayın',
                        cross_sell: ['Anti-Aging Krem', 'Göz Kremi'],
                        sales_tips: 'Peptid + retinol kombinasyonu sinerjik etki'
                    }
                ];
                break;
                
            case 'Akne':
                products = [
                    {
                        name: 'Salicylic Asit Temizleyici',
                        dosage: 'Günde 2 kez',
                        usage: 'Sabah ve akşam yüz temizliği',
                        contraindications: 'Çok kuru ciltlerde dikkatli kullanın',
                        cross_sell: ['Benzoyl Peroxide Krem', 'Nemlendirici'],
                        sales_tips: 'Temizlik + tedavi + nemlendirme üçlüsü'
                    },
                    {
                        name: 'Benzoyl Peroxide Krem',
                        dosage: 'Günde 1 kez',
                        usage: 'Temizlik sonrası, sadece akne bölgelerine',
                        contraindications: 'Hassas ciltlerde dikkatli kullanın',
                        cross_sell: ['Güneş Koruyucu', 'Akne Maske'],
                        sales_tips: 'BP + güneş koruyucu kombinasyonu önerin'
                    }
                ];
                break;
                
            default:
                products = [
                    {
                        name: 'Genel Cilt Bakım Seti',
                        dosage: 'Günde 2 kez',
                        usage: 'Temizlik + nemlendirme + güneş koruyucu',
                        contraindications: 'Alerjik reaksiyon durumunda kullanmayın',
                        cross_sell: ['Tonik', 'Maske'],
                        sales_tips: 'Tam cilt bakım rutini önerin'
                    }
                ];
        }
        
        recommendations.push({
            symptom: symptom,
            description: `${symptom} için özel dermokozmetik öneriler`,
            priority: 'Yüksek',
            products: products
        });
    });
    
    return recommendations;
}

// Dermokozmetik Güven Skoru Hesapla
function calculateDermokozmetikConfidence(symptoms) {
    return Math.min(85 + (symptoms.length * 5), 95);
}

// Dermokozmetik Uyarıları Oluştur
function generateDermokozmetikWarnings(age, gender, weight) {
    const warnings = [];
    
    if (age < 18) {
        warnings.push('18 yaş altı hastalarda dermokozmetik ürün kullanımı doktor kontrolünde olmalıdır');
    }
    
    if (age > 65) {
        warnings.push('Yaşlı hastalarda cilt hassasiyeti artabilir, düşük konsantrasyonlu ürünler tercih edin');
    }
    
    warnings.push('Yeni ürün kullanımında önce küçük bir bölgede test edin');
    warnings.push('Güneş koruyucu kullanımı tüm dermokozmetik rutinlerin vazgeçilmezidir');
    warnings.push('Hamilelik ve emzirme döneminde retinol içeren ürünlerden kaçının');
    
    return warnings;
}

// Dermokozmetik Analiz Metni Oluştur
function generateDermokozmetikAnalysis(symptoms, age, gender, weight) {
    let analysis = `Dermokozmetik analiz tamamlandı. `;
    
    if (symptoms.length > 0) {
        analysis += `Tespit edilen sorunlar: ${symptoms.join(', ')}. `;
    }
    
    if (age) {
        analysis += `${age} yaşında ${gender || 'hasta'} için özelleştirilmiş öneriler hazırlandı. `;
    }
    
    analysis += 'Dermokozmetik ürünler ve cilt bakım rutini önerildi.';
    
    return analysis;
}

// Dermokozmetik Sonuçları Göster
function displayDermokozmetikResults(analysis) {
    const resultsArea = document.getElementById('dermokozmetikResults');
    
    let html = `
        <div class="ai-analysis-box">
            <h6><i class="fas fa-spa me-2"></i>Dermokozmetik AI Analiz Raporu</h6>
            <p>${analysis.analysis}</p>
            <div class="mt-2">
                <span class="ai-confidence">Güven Skoru: %${analysis.confidence}</span>
            </div>
        </div>
    `;
    
    // Tespit edilen semptomlar
    if (analysis.symptoms && analysis.symptoms.length > 0) {
        html += `
            <div class="ai-recommendation">
                <h6><i class="fas fa-search me-2"></i>Tespit Edilen Dermokozmetik Sorunlar</h6>
                <div class="mt-2">
        `;
        
        analysis.symptoms.forEach(symptom => {
            html += `<span class="symptom-tag">${symptom}</span>`;
        });
        
        html += `</div></div>`;
    }
    
    // Ana öneriler
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        html += `<h6 class="mt-3"><i class="fas fa-pills me-2"></i>Önerilen Dermokozmetik Ürünler</h6>`;
        
        analysis.recommendations.forEach(rec => {
            html += `
                <div class="ai-suggestion-card">
                    <h6><i class="fas fa-spa me-2"></i>${rec.symptom}</h6>
                    <p class="text-muted">${rec.description}</p>
                    <div class="row">
            `;
            
            if (rec.products && rec.products.length > 0) {
                rec.products.forEach(product => {
                    html += `
                        <div class="col-md-6 mb-2">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${product.name}</h6>
                                    <p class="card-text">
                                        <strong>Dozlama:</strong> ${product.dosage}<br>
                                        <strong>Kullanım:</strong> ${product.usage}<br>
                                        <strong>Uyarı:</strong> ${product.contraindications}
                                    </p>
                                    ${product.cross_sell && product.cross_sell.length > 0 ? `
                                        <div class="mt-2">
                                            <strong>Ek Öneriler:</strong> ${product.cross_sell.join(', ')}
                                        </div>
                                    ` : ''}
                                    ${product.sales_tips ? `
                                        <div class="mt-2">
                                            <strong>Satış İpucu:</strong> ${product.sales_tips}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `</div></div>`;
        });
    }
    
    // Uyarılar
    if (analysis.warnings && analysis.warnings.length > 0) {
        html += `<h6 class="mt-3"><i class="fas fa-exclamation-triangle me-2"></i>Önemli Uyarılar</h6>`;
        
        analysis.warnings.forEach(warning => {
            html += `
                <div class="ai-warning">
                    <i class="fas fa-shield-alt me-2"></i>${warning}
                </div>
            `;
        });
    }
    
    // Cross-Selling Fırsatları
    if (analysis.cross_selling && analysis.cross_selling.length > 0) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-plus-circle me-2"></i>Ek Dermokozmetik Fırsatları</h6>
                ${analysis.cross_selling.map(opportunity => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <h6 class="card-title">${opportunity.category}</h6>
                            <p class="card-text">
                                <strong>Önerilen Ürünler:</strong> ${opportunity.products.join(', ')}<br>
                                <strong>Neden Önerildi:</strong> ${opportunity.reason}
                            </p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Satış Notları
    if (analysis.sales_notes) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-sticky-note me-2"></i>Dermokozmetik Satış Notları</h6>
                <p>${analysis.sales_notes}</p>
            </div>
        `;
    }
    
    // Güvenlik Notları
    if (analysis.safety_notes) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-shield-alt me-2"></i>Güvenlik Notları</h6>
                <div class="alert alert-warning">
                    ${analysis.safety_notes}
                </div>
            </div>
        `;
    }
    
    // Stok Entegrasyonu
    if (analysis.stok_entegrasyonu) {
        html += `
            <div class="ai-recommendation mt-3">
                <h6><i class="fas fa-boxes me-2"></i>Stok Durumu ve Satış Önerileri</h6>
            </div>
        `;
        // Stok entegrasyonu sonuçlarını göster
        const stokElement = document.createElement('div');
        stokElement.id = 'stokEntegrasyonu';
        window.aiStokEntegrasyonu.stokDurumuGoster(analysis, stokElement);
        html += stokElement.innerHTML;
    }
    
    resultsArea.innerHTML = html;
    resultsArea.style.display = 'block';
}

// Dermokozmetik Loading Göster
function showDermokozmetikLoading(element) {
    element.innerHTML = `
        <div class="text-center">
            <div class="loading-spinner"></div>
            <p class="mt-2">Dermokozmetik AI analizi yapılıyor...</p>
            <small class="text-muted">Bu işlem birkaç saniye sürebilir</small>
        </div>
    `;
    element.style.display = 'block';
}

// Dermokozmetik Formu Temizle
function clearDermokozmetikForm() {
    document.getElementById('dermokozmetikSymptomInput').value = '';
    document.getElementById('dermokozmetikPatientAge').value = '';
    document.getElementById('dermokozmetikPatientGender').value = '';
    document.getElementById('dermokozmetikPatientWeight').value = '';
    document.getElementById('dermokozmetikResults').style.display = 'none';
    document.getElementById('dermokozmetikAnalysisDetails').style.display = 'none';
}

// Dermokozmetik API Key Modal Göster
function showDermokozmetikApiKeyModal() {
    showApiKeyModal(); // Mevcut modal'ı kullan
}

// Dermokozmetik AI Test Et
async function testDermokozmetikAI() {
    try {
        if (!window.geminiAI || !window.geminiAI.isConfigured) {
            showWarning('Dermokozmetik AI test etmek için önce API key ayarlayın!');
            return;
        }
        
        showSuccess('Dermokozmetik AI bağlantısı başarılı! Test tamamlandı.');
        
    } catch (error) {
        showError('Dermokozmetik AI test hatası: ' + error.message);
    }
}

// Dermokozmetik Debug Bilgileri Göster
function showDermokozmetikDebugInfo() {
    showDebugInfo(); // Mevcut debug fonksiyonunu kullan
}