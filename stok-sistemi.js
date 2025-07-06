// Stok Yönetim Sistemi - AI Entegrasyonu
class StokSistemi {
    constructor() {
        this.stokVerisi = {};
        this.barkodVerisi = {};
        this.aiOnerileri = [];
        this.stokGecmisi = [];
        this.init();
    }

    // Sistem başlatma
    async init() {
        try {
            await this.veriYukle();
            console.log('✅ Stok sistemi başlatıldı');
        } catch (error) {
            console.error('❌ Stok sistemi başlatma hatası:', error);
        }
    }

    // Veri yükleme
    async veriYukle() {
        try {
            // Mevcut verileri yükle
            const [dataResponse, barkodResponse] = await Promise.all([
                fetch('data.json'),
                fetch('barkod_listesi.json')
            ]);

            if (dataResponse.ok) {
                this.stokVerisi = await dataResponse.json();
            }

            if (barkodResponse.ok) {
                this.barkodVerisi = await barkodResponse.json();
            }

            // Local storage'dan stok gecmisi yükle
            this.stokGecmisi = JSON.parse(localStorage.getItem('stokGecmisi') || '[]');
            
            console.log('✅ Stok verileri yüklendi');
        } catch (error) {
            console.error('❌ Veri yükleme hatası:', error);
            // Demo veri oluştur
            this.demoVeriOlustur();
        }
    }

    // Demo veri oluşturma (gerçek veri yoksa)
    demoVeriOlustur() {
        this.stokVerisi = {
            "İlaçlar": {
                "Parol": {
                    "barkod": "8690123456789",
                    "stok_miktari": 150,
                    "fiyat": 12.50,
                    "kategori": "Ağrı Kesici",
                    "endikasyon": "Ağrı, Ateş",
                    "min_stok": 20,
                    "son_guncelleme": new Date().toISOString()
                },
                "Aspirin": {
                    "barkod": "8690123456790",
                    "stok_miktari": 80,
                    "fiyat": 8.75,
                    "kategori": "Ağrı Kesici",
                    "endikasyon": "Ağrı, Ateş",
                    "min_stok": 15,
                    "son_guncelleme": new Date().toISOString()
                },
                "Vitamin C": {
                    "barkod": "8690123456791",
                    "stok_miktari": 200,
                    "fiyat": 25.00,
                    "kategori": "Vitamin",
                    "endikasyon": "Bağışıklık Sistemi",
                    "min_stok": 30,
                    "son_guncelleme": new Date().toISOString()
                }
            },
            "Dermokozmetik": {
                "Nemlendirici Krem": {
                    "barkod": "8690123456792",
                    "stok_miktari": 45,
                    "fiyat": 85.00,
                    "kategori": "Cilt Bakımı",
                    "endikasyon": "Cilt Kuruluğu",
                    "min_stok": 10,
                    "son_guncelleme": new Date().toISOString()
                },
                "Güneş Kremi": {
                    "barkod": "8690123456793",
                    "stok_miktari": 60,
                    "fiyat": 120.00,
                    "kategori": "Güneş Koruyucu",
                    "endikasyon": "Güneş Hasarı",
                    "min_stok": 15,
                    "son_guncelleme": new Date().toISOString()
                }
            },
            "Takviyeler": {
                "Omega-3": {
                    "barkod": "8690123456794",
                    "stok_miktari": 120,
                    "fiyat": 95.00,
                    "kategori": "Omega-3",
                    "endikasyon": "Kalp Sağlığı",
                    "min_stok": 25,
                    "son_guncelleme": new Date().toISOString()
                },
                "Magnezyum": {
                    "barkod": "8690123456795",
                    "stok_miktari": 90,
                    "fiyat": 45.00,
                    "kategori": "Mineral",
                    "endikasyon": "Kas Krampları",
                    "min_stok": 20,
                    "son_guncelleme": new Date().toISOString()
                }
            }
        };
    }

    // AI önerilerini stokla eşleştir
    async aiOnerileriniStoklaEslestir(aiOnerileri, hastaBilgileri = {}) {
        try {
            console.log('🔍 AI önerilerini stokla eşleştiriliyor...');
            
            const eslesenUrunler = [];
            const stoktaOlmayanlar = [];
            const alternatifler = [];

            // AI önerilerini işle
            for (const oneri of aiOnerileri) {
                const stokUrunleri = this.stoktaAra(oneri.urun_adi || oneri.symptom);
                
                if (stokUrunleri.length > 0) {
                    // Stokta bulunan ürünler
                    const enUygunUrun = this.enUygunUrunuSec(stokUrunleri, hastaBilgileri);
                    eslesenUrunler.push({
                        ai_oneri: oneri,
                        stok_urun: enUygunUrun,
                        uygunluk_skoru: this.uygunlukSkoruHesapla(enUygunUrun, oneri, hastaBilgileri),
                        stok_durumu: this.stokDurumuKontrol(enUygunUrun)
                    });
                } else {
                    // Stokta olmayan ürünler
                    stoktaOlmayanlar.push(oneri);
                    
                    // Alternatif öneriler
                    const alternatifUrunler = this.alternatifUrunlerBul(oneri);
                    if (alternatifUrunler.length > 0) {
                        alternatifler.push({
                            orijinal_oneri: oneri,
                            alternatifler: alternatifUrunler
                        });
                    }
                }
            }

            return {
                stokta_olanlar: eslesenUrunler,
                stokta_olmayanlar: stoktaOlmayanlar,
                alternatifler: alternatifler,
                stok_ozeti: this.stokOzetiOlustur(eslesenUrunler),
                satis_onerileri: this.satisOnerileriOlustur(eslesenUrunler, hastaBilgileri)
            };

        } catch (error) {
            console.error('❌ AI-stok eşleştirme hatası:', error);
            throw error;
        }
    }

    // Stokta arama
    stoktaAra(urunAdi) {
        const sonuclar = [];
        const arananKelime = urunAdi.toLowerCase().trim();

        // Tüm kategorilerde ara
        for (const [kategori, urunler] of Object.entries(this.stokVerisi)) {
            for (const [urunAdiStok, urunBilgisi] of Object.entries(urunler)) {
                const urunAdiLower = urunAdiStok.toLowerCase();
                const kategoriLower = kategori.toLowerCase();
                const endikasyonLower = (urunBilgisi.endikasyon || '').toLowerCase();

                // Tam eşleşme veya kısmi eşleşme kontrolü
                if (urunAdiLower.includes(arananKelime) || 
                    arananKelime.includes(urunAdiLower) ||
                    endikasyonLower.includes(arananKelime) ||
                    kategoriLower.includes(arananKelime)) {
                    
                    sonuclar.push({
                        kategori: kategori,
                        urun_adi: urunAdiStok,
                        ...urunBilgisi
                    });
                }
            }
        }

        return sonuclar;
    }

    // En uygun ürünü seç
    enUygunUrunuSec(stokUrunleri, hastaBilgileri) {
        if (stokUrunleri.length === 1) return stokUrunleri[0];

        // Skorlama sistemi
        const skorlanmisUrunler = stokUrunleri.map(urun => ({
            ...urun,
            skor: this.urunSkoruHesapla(urun, hastaBilgileri)
        }));

        // En yüksek skorlu ürünü döndür
        return skorlanmisUrunler.sort((a, b) => b.skor - a.skor)[0];
    }

    // Ürün skoru hesapla
    urunSkoruHesapla(urun, hastaBilgileri) {
        let skor = 0;

        // Stok miktarı (daha fazla stok = daha yüksek skor)
        skor += Math.min(urun.stok_miktari / 10, 10);

        // Fiyat uygunluğu (orta fiyat = daha yüksek skor)
        if (urun.fiyat >= 20 && urun.fiyat <= 100) skor += 5;
        else if (urun.fiyat < 20) skor += 3;
        else skor += 2;

        // Yaş uygunluğu
        if (hastaBilgileri.yas) {
            if (hastaBilgileri.yas < 18 && urun.kategori === 'Çocuk') skor += 5;
            else if (hastaBilgileri.yas > 65 && urun.kategori === 'Yaşlı') skor += 5;
        }

        // Cinsiyet uygunluğu
        if (hastaBilgileri.cinsiyet) {
            if (hastaBilgileri.cinsiyet === 'kadin' && urun.kategori === 'Kadın') skor += 3;
            else if (hastaBilgileri.cinsiyet === 'erkek' && urun.kategori === 'Erkek') skor += 3;
        }

        return skor;
    }

    // Uygunluk skoru hesapla
    uygunlukSkoruHesapla(stokUrun, aiOneri, hastaBilgileri) {
        let skor = 0;

        // İsim benzerliği
        const isimBenzerligi = this.isimBenzerligiHesapla(stokUrun.urun_adi, aiOneri.urun_adi || aiOneri.symptom);
        skor += isimBenzerligi * 40;

        // Endikasyon uygunluğu
        if (stokUrun.endikasyon && aiOneri.symptom) {
            const endikasyonUygunlugu = this.isimBenzerligiHesapla(stokUrun.endikasyon, aiOneri.symptom);
            skor += endikasyonUygunlugu * 30;
        }

        // Kategori uygunluğu
        if (stokUrun.kategori && aiOneri.kategori) {
            const kategoriUygunlugu = this.isimBenzerligiHesapla(stokUrun.kategori, aiOneri.kategori);
            skor += kategoriUygunlugu * 20;
        }

        // Stok durumu
        if (stokUrun.stok_miktari > stokUrun.min_stok) skor += 10;

        return Math.min(skor, 100);
    }

    // İsim benzerliği hesapla (basit algoritma)
    isimBenzerligiHesapla(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const words1 = str1.toLowerCase().split(/\s+/);
        const words2 = str2.toLowerCase().split(/\s+/);
        
        let ortakKelimeler = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1.includes(word2) || word2.includes(word1)) {
                    ortakKelimeler++;
                }
            }
        }
        
        return ortakKelimeler / Math.max(words1.length, words2.length);
    }

    // Stok durumu kontrol
    stokDurumuKontrol(urun) {
        const stokOrani = urun.stok_miktari / urun.min_stok;
        
        if (stokOrani >= 3) return { durum: 'Yüksek', renk: 'success', mesaj: 'Yeterli stok' };
        else if (stokOrani >= 1.5) return { durum: 'Orta', renk: 'warning', mesaj: 'Stok azalıyor' };
        else if (stokOrani >= 1) return { durum: 'Düşük', renk: 'danger', mesaj: 'Kritik stok' };
        else return { durum: 'Tükendi', renk: 'secondary', mesaj: 'Stok tükendi' };
    }

    // Alternatif ürünler bul
    alternatifUrunlerBul(aiOneri) {
        const alternatifler = [];
        const benzerKategoriler = this.benzerKategorilerBul(aiOneri.kategori || aiOneri.symptom);

        for (const kategori of benzerKategoriler) {
            const kategoriUrunleri = this.stokVerisi[kategori] || {};
            for (const [urunAdi, urunBilgisi] of Object.entries(kategoriUrunleri)) {
                if (urunBilgisi.stok_miktari > 0) {
                    alternatifler.push({
                        kategori: kategori,
                        urun_adi: urunAdi,
                        ...urunBilgisi,
                        uygunluk_nedeni: `${kategori} kategorisinde benzer etki`
                    });
                }
            }
        }

        return alternatifler.slice(0, 3); // En fazla 3 alternatif
    }

    // Benzer kategoriler bul
    benzerKategorilerBul(kategori) {
        const kategoriMap = {
            'ağrı': ['İlaçlar', 'Takviyeler'],
            'vitamin': ['Takviyeler', 'İlaçlar'],
            'cilt': ['Dermokozmetik', 'Takviyeler'],
            'kalp': ['Takviyeler', 'İlaçlar'],
            'bağışıklık': ['Takviyeler', 'İlaçlar'],
            'mineral': ['Takviyeler'],
            'omega': ['Takviyeler'],
            'nemlendirici': ['Dermokozmetik'],
            'güneş': ['Dermokozmetik'],
            'anti-aging': ['Dermokozmetik', 'Takviyeler']
        };

        const kategoriLower = kategori.toLowerCase();
        for (const [anahtar, kategoriler] of Object.entries(kategoriMap)) {
            if (kategoriLower.includes(anahtar)) {
                return kategoriler;
            }
        }

        return ['İlaçlar', 'Takviyeler', 'Dermokozmetik']; // Varsayılan
    }

    // Stok özeti oluştur
    stokOzetiOlustur(eslesenUrunler) {
        const ozet = {
            toplam_urun: eslesenUrunler.length,
            toplam_deger: 0,
            kritik_stok: 0,
            kategori_dagilimi: {}
        };

        for (const eslesme of eslesenUrunler) {
            const urun = eslesme.stok_urun;
            ozet.toplam_deger += urun.stok_miktari * urun.fiyat;
            
            if (eslesme.stok_durumu.durum === 'Düşük' || eslesme.stok_durumu.durum === 'Tükendi') {
                ozet.kritik_stok++;
            }

            ozet.kategori_dagilimi[urun.kategori] = (ozet.kategori_dagilimi[urun.kategori] || 0) + 1;
        }

        return ozet;
    }

    // Satış önerileri oluştur
    satisOnerileriOlustur(eslesenUrunler, hastaBilgileri) {
        const oneriler = [];

        // Çapraz satış önerileri
        const kategoriler = [...new Set(eslesenUrunler.map(e => e.stok_urun.kategori))];
        for (const kategori of kategoriler) {
            const kategoriUrunleri = this.stokVerisi[kategori] || {};
            for (const [urunAdi, urunBilgisi] of Object.entries(kategoriUrunleri)) {
                if (urunBilgisi.stok_miktari > urunBilgisi.min_stok && 
                    !eslesenUrunler.find(e => e.stok_urun.urun_adi === urunAdi)) {
                    oneriler.push({
                        tip: 'Çapraz Satış',
                        urun: urunAdi,
                        kategori: kategori,
                        fiyat: urunBilgisi.fiyat,
                        neden: `${kategori} kategorisinde tamamlayıcı ürün`
                    });
                }
            }
        }

        // Bütçe bazlı öneriler
        if (hastaBilgileri.butce) {
            const butceOnerileri = eslesenUrunler
                .filter(e => e.stok_urun.fiyat <= hastaBilgileri.butce)
                .map(e => ({
                    tip: 'Bütçe Uygun',
                    urun: e.stok_urun.urun_adi,
                    fiyat: e.stok_urun.fiyat,
                    neden: 'Bütçenize uygun fiyat'
                }));
            oneriler.push(...butceOnerileri);
        }

        return oneriler.slice(0, 5); // En fazla 5 öneri
    }

    // Stok güncelleme
    stokGuncelle(barkod, miktar, islem = 'cikis') {
        try {
            const urun = this.barkodIleUrunBul(barkod);
            if (!urun) {
                throw new Error('Ürün bulunamadı');
            }

            const eskiMiktar = urun.stok_miktari;
            if (islem === 'cikis') {
                urun.stok_miktari = Math.max(0, urun.stok_miktari - miktar);
            } else if (islem === 'giris') {
                urun.stok_miktari += miktar;
            }

            urun.son_guncelleme = new Date().toISOString();

            // Geçmişe kaydet
            this.stokGecmisi.push({
                tarih: new Date().toISOString(),
                barkod: barkod,
                urun_adi: urun.urun_adi,
                eski_miktar: eskiMiktar,
                yeni_miktar: urun.stok_miktari,
                islem: islem,
                miktar: miktar
            });

            // Local storage'a kaydet
            localStorage.setItem('stokGecmisi', JSON.stringify(this.stokGecmisi));

            console.log(`✅ Stok güncellendi: ${urun.urun_adi} - ${islem}: ${miktar}`);
            return true;

        } catch (error) {
            console.error('❌ Stok güncelleme hatası:', error);
            return false;
        }
    }

    // Barkod ile ürün bul
    barkodIleUrunBul(barkod) {
        for (const [kategori, urunler] of Object.entries(this.stokVerisi)) {
            for (const [urunAdi, urunBilgisi] of Object.entries(urunler)) {
                if (urunBilgisi.barkod === barkod) {
                    return { kategori, urun_adi: urunAdi, ...urunBilgisi };
                }
            }
        }
        return null;
    }

    // Stok raporu oluştur
    stokRaporuOlustur() {
        const rapor = {
            tarih: new Date().toISOString(),
            toplam_urun: 0,
            toplam_deger: 0,
            kritik_stok: [],
            kategori_ozetleri: {},
            son_islemler: this.stokGecmisi.slice(-10) // Son 10 işlem
        };

        for (const [kategori, urunler] of Object.entries(this.stokVerisi)) {
            rapor.kategori_ozetleri[kategori] = {
                urun_sayisi: 0,
                toplam_deger: 0,
                kritik_urunler: 0
            };

            for (const [urunAdi, urunBilgisi] of Object.entries(urunler)) {
                rapor.toplam_urun++;
                rapor.toplam_deger += urunBilgisi.stok_miktari * urunBilgisi.fiyat;

                rapor.kategori_ozetleri[kategori].urun_sayisi++;
                rapor.kategori_ozetleri[kategori].toplam_deger += urunBilgisi.stok_miktari * urunBilgisi.fiyat;

                if (urunBilgisi.stok_miktari <= urunBilgisi.min_stok) {
                    rapor.kritik_stok.push({
                        kategori: kategori,
                        urun_adi: urunAdi,
                        stok_miktari: urunBilgisi.stok_miktari,
                        min_stok: urunBilgisi.min_stok
                    });
                    rapor.kategori_ozetleri[kategori].kritik_urunler++;
                }
            }
        }

        return rapor;
    }

    // Stok uyarıları kontrol
    stokUyarilariKontrol() {
        const uyarilar = [];

        for (const [kategori, urunler] of Object.entries(this.stokVerisi)) {
            for (const [urunAdi, urunBilgisi] of Object.entries(urunler)) {
                if (urunBilgisi.stok_miktari <= urunBilgisi.min_stok) {
                    uyarilar.push({
                        tip: urunBilgisi.stok_miktari === 0 ? 'Tükendi' : 'Kritik Stok',
                        kategori: kategori,
                        urun: urunAdi,
                        mevcut_stok: urunBilgisi.stok_miktari,
                        min_stok: urunBilgisi.min_stok,
                        oncelik: urunBilgisi.stok_miktari === 0 ? 'Yüksek' : 'Orta'
                    });
                }
            }
        }

        return uyarilar;
    }
}

// Global stok sistemi instance'ı
window.stokSistemi = new StokSistemi();

// AI entegrasyonu için yardımcı fonksiyonlar
window.aiStokEntegrasyonu = {
    // AI önerilerini stokla entegre et
    async aiOnerileriniStoklaEntegreEt(aiSonucu, hastaBilgileri) {
        try {
            if (!window.stokSistemi) {
                throw new Error('Stok sistemi başlatılmamış');
            }

            // AI önerilerini al
            const aiOnerileri = aiSonucu.recommendations || [];
            
            // Stokla eşleştir
            const stokSonucu = await window.stokSistemi.aiOnerileriniStoklaEslestir(aiOnerileri, hastaBilgileri);

            // Sonuçları birleştir
            return {
                ...aiSonucu,
                stok_entegrasyonu: stokSonucu,
                stok_ozeti: stokSonucu.stok_ozeti,
                satis_onerileri: stokSonucu.satis_onerileri,
                alternatifler: stokSonucu.alternatifler
            };

        } catch (error) {
            console.error('❌ AI-stok entegrasyon hatası:', error);
            return {
                ...aiSonucu,
                stok_entegrasyonu: null,
                hata: error.message
            };
        }
    },

    // Stok durumu göster
    stokDurumuGoster(sonuclar, hedefElement) {
        if (!sonuclar.stok_entegrasyonu) {
            hedefElement.innerHTML = '<div class="alert alert-warning">Stok entegrasyonu yapılamadı</div>';
            return;
        }

        const stok = sonuclar.stok_entegrasyonu;
        let html = '<div class="stok-entegrasyonu">';

        // Stokta olan ürünler
        if (stok.stokta_olanlar.length > 0) {
            html += '<div class="card mb-3"><div class="card-header bg-success text-white"><h6>✅ Stokta Bulunan Ürünler</h6></div><div class="card-body">';
            
            for (const eslesme of stok.stokta_olanlar) {
                const urun = eslesme.stok_urun;
                const durum = eslesme.stok_durumu;
                
                html += `
                    <div class="row mb-2 p-2 border rounded">
                        <div class="col-md-6">
                            <strong>${urun.urun_adi}</strong><br>
                            <small class="text-muted">${urun.kategori} - ${urun.endikasyon}</small>
                        </div>
                        <div class="col-md-3">
                            <span class="badge bg-${durum.renk}">${durum.durum}</span><br>
                            <small>Stok: ${urun.stok_miktari} adet</small>
                        </div>
                        <div class="col-md-3">
                            <strong class="text-primary">${urun.fiyat} ₺</strong><br>
                            <small>Uygunluk: %${eslesme.uygunluk_skoru}</small>
                        </div>
                    </div>
                `;
            }
            html += '</div></div>';
        }

        // Stokta olmayan ürünler
        if (stok.stokta_olmayanlar.length > 0) {
            html += '<div class="card mb-3"><div class="card-header bg-warning text-dark"><h6>⚠️ Stokta Olmayan Ürünler</h6></div><div class="card-body">';
            
            for (const oneri of stok.stokta_olmayanlar) {
                html += `
                    <div class="mb-2 p-2 border rounded bg-light">
                        <strong>${oneri.urun_adi || oneri.symptom}</strong><br>
                        <small class="text-muted">${oneri.description || 'Açıklama yok'}</small>
                    </div>
                `;
            }
            html += '</div></div>';
        }

        // Alternatifler
        if (stok.alternatifler.length > 0) {
            html += '<div class="card mb-3"><div class="card-header bg-info text-white"><h6>🔄 Alternatif Öneriler</h6></div><div class="card-body">';
            
            for (const alternatif of stok.alternatifler) {
                html += `
                    <div class="mb-3">
                        <strong>${alternatif.orijinal_oneri.urun_adi || alternatif.orijinal_oneri.symptom}</strong> yerine:
                        <div class="ms-3 mt-2">
                `;
                
                for (const alt of alternatif.alternatifler) {
                    html += `
                        <div class="row mb-2 p-2 border rounded">
                            <div class="col-md-6">
                                <strong>${alt.urun_adi}</strong><br>
                                <small class="text-muted">${alt.kategori}</small>
                            </div>
                            <div class="col-md-3">
                                <span class="badge bg-success">Stokta</span><br>
                                <small>Stok: ${alt.stok_miktari} adet</small>
                            </div>
                            <div class="col-md-3">
                                <strong class="text-primary">${alt.fiyat} ₺</strong><br>
                                <small>${alt.uygunluk_nedeni}</small>
                            </div>
                        </div>
                    `;
                }
                
                html += '</div></div>';
            }
            html += '</div></div>';
        }

        // Satış önerileri
        if (stok.satis_onerileri.length > 0) {
            html += '<div class="card mb-3"><div class="card-header bg-primary text-white"><h6>💡 Satış Önerileri</h6></div><div class="card-body">';
            
            for (const oneri of stok.satis_onerileri) {
                html += `
                    <div class="mb-2 p-2 border rounded">
                        <strong>${oneri.urun}</strong> - ${oneri.fiyat} ₺<br>
                        <small class="text-muted">${oneri.tip}: ${oneri.neden}</small>
                    </div>
                `;
            }
            html += '</div></div>';
        }

        // Stok özeti
        if (stok.stok_ozeti) {
            const ozet = stok.stok_ozeti;
            html += `
                <div class="card">
                    <div class="card-header bg-secondary text-white">
                        <h6>📊 Stok Özeti</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h4 class="text-primary">${ozet.toplam_urun}</h4>
                                    <small>Toplam Ürün</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h4 class="text-success">${ozet.toplam_deger.toFixed(2)} ₺</h4>
                                    <small>Toplam Değer</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h4 class="text-warning">${ozet.kritik_stok}</h4>
                                    <small>Kritik Stok</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h4 class="text-info">${Object.keys(ozet.kategori_dagilimi).length}</h4>
                                    <small>Kategori</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        hedefElement.innerHTML = html;
    }
};

console.log('✅ Stok sistemi yüklendi ve AI entegrasyonu hazır'); 