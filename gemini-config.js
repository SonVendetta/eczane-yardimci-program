// Gemini AI Configuration
class GeminiAI {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        this.isConfigured = false;
        this.useProxy = false; // CORS proxy kullanımı
    }

    // API Key'i ayarla
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.isConfigured = true;
        localStorage.setItem('gemini_api_key', apiKey);
        console.log('Gemini API key ayarlandı');
    }

    // API Key'i al
    getApiKey() {
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('gemini_api_key');
            this.isConfigured = !!this.apiKey;
        }
        return this.apiKey;
    }

    // CORS proxy'yi etkinleştir/devre dışı bırak
    setUseProxy(useProxy) {
        this.useProxy = useProxy;
        localStorage.setItem('gemini_use_proxy', useProxy.toString());
        console.log('CORS Proxy durumu:', useProxy ? 'Etkin' : 'Devre dışı');
    }

    // CORS proxy durumunu al
    getUseProxy() {
        if (this.useProxy === undefined) {
            this.useProxy = localStorage.getItem('gemini_use_proxy') === 'true';
        }
        return this.useProxy;
    }

    // Gemini API'ye istek gönder
    async generateContent(prompt, temperature = 0.7) {
        if (!this.isConfigured) {
            throw new Error('Gemini API key ayarlanmamış. Lütfen API key girin.');
        }

        // Farklı model seçenekleri
        const models = [
            'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
            'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
        ];

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: temperature,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        try {
            console.log('🌐 Gemini API isteği gönderiliyor...');
            console.log('Prompt uzunluğu:', prompt.length, 'karakter');
            
            // Farklı modelleri dene
            for (let i = 0; i < models.length; i++) {
                const modelUrl = models[i];
                console.log(`🔄 Model ${i + 1} deneniyor: ${modelUrl.split('/').pop()}`);
                
                // CORS proxy kullanımı (gerekirse)
                let apiUrl = `${modelUrl}?key=${this.apiKey}`;
                let fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'EczaneYardimci/2.0'
                    },
                    body: JSON.stringify(requestBody),
                    mode: 'cors',
                    cache: 'no-cache'
                };
                
                // CORS hatası durumunda proxy kullan
                if (this.getUseProxy()) {
                    apiUrl = `https://cors-anywhere.herokuapp.com/${modelUrl}?key=${this.apiKey}`;
                    console.log('🔄 CORS Proxy kullanılıyor...');
                }
                
                try {
                    const response = await fetch(apiUrl, fetchOptions);
                    console.log('📡 API Yanıt Durumu:', response.status, response.statusText);
                    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

                    if (!response.ok) {
                        let errorText = '';
                        try {
                            errorText = await response.text();
                        } catch (e) {
                            errorText = 'Hata detayları okunamadı';
                        }
                        console.error('❌ Model', i + 1, 'hatası:', errorText);
                        
                        // Son model değilse devam et
                        if (i < models.length - 1) {
                            console.log('🔄 Sonraki model deneniyor...');
                            continue;
                        } else {
                            throw new Error(`Tüm modeller başarısız. Son hata (${response.status}): ${response.statusText} - ${errorText}`);
                        }
                    }

                    const data = await response.json();
                    console.log('📦 API Yanıt Verisi:', data);
                    
                    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                        const result = data.candidates[0].content.parts[0].text;
                        console.log('✅ API Yanıtı başarıyla alındı (Model:', modelUrl.split('/').pop(), ')');
                        console.log('Yanıt uzunluğu:', result.length, 'karakter');
                        return result;
                    } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                        throw new Error(`İçerik engellendi: ${data.promptFeedback.blockReason}`);
                    } else {
                        console.error('❌ Geçersiz API yanıt formatı:', data);
                        if (i < models.length - 1) {
                            console.log('🔄 Sonraki model deneniyor...');
                            continue;
                        } else {
                            throw new Error('Geçersiz API yanıt formatı');
                        }
                    }
                } catch (fetchError) {
                    console.error('❌ Model', i + 1, 'fetch hatası:', fetchError);
                    if (i < models.length - 1) {
                        console.log('🔄 Sonraki model deneniyor...');
                        continue;
                    } else {
                        throw fetchError;
                    }
                }
            }
            
            // Eğer buraya kadar geldiyse, hiçbir model çalışmadı
            throw new Error('Hiçbir model çalışmadı');
            
        } catch (error) {
            console.error('❌ Gemini API Hatası:', error);
            console.error('Hata türü:', error.name);
            console.error('Hata mesajı:', error.message);
            
            // Network hatası kontrolü
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.');
            }
            
            throw error;
        }
    }

    // Semptom analizi için özel prompt
    async analyzeSymptoms(symptoms, age, gender, weight, indications) {
        // Endikasyon verilerini daha fazla kullan
        const limitedIndications = {};
        const indicationKeys = Object.keys(indications).slice(0, 50); // 50 endikasyona çıkar
        indicationKeys.forEach(key => {
            limitedIndications[key] = indications[key];
        });

        const prompt = `
Sen deneyimli bir eczacısın. Hastanın semptomlarını analiz ederek MUTLAKA TAKVİYE ÜRÜNLERİ de içeren kapsamlı öneriler sunacaksın.

HASTA BİLGİLERİ:
- Semptomlar: ${symptoms}
- Yaş: ${age || 'Belirtilmemiş'}
- Cinsiyet: ${gender || 'Belirtilmemiş'}
- Kilo: ${weight || 'Belirtilmemiş'} kg

MEVCUT ÜRÜN VERİTABANI:
${JSON.stringify(limitedIndications, null, 2)}

GÖREVİN:
1. Hastanın semptomlarını analiz et
2. Her semptom için MUTLAKA takviye ürünleri öner (vitamin, mineral, probiyotik vs.)
3. Ana ilaç + takviye ürünü + destek ürünü kombinasyonu yap
4. Cross-selling yap (vitamin, probiyotik, omega-3, koenzim vs.)
5. Yaş ve cinsiyet bazlı dozaj ver
6. Güvenlik uyarılarını belirt

ÖNEMLİ KURALLAR:
- Her semptom için MUTLAKA takviye ürünü öner
- Vitamin, mineral, probiyotik, omega-3, koenzim Q10 gibi takviyeleri unutma
- Cross-selling zorunlu (ana ürün + takviye + destek)
- Dozaj yaş/cinsiyet bazlı olsun
- Güvenlik uyarılarını unutma

TAKVİYE ÜRÜN KATEGORİLERİ:
- Vitaminler (A, B, C, D, E, K)
- Mineraller (Demir, Çinko, Magnezyum, Selenyum)
- Omega-3 yağ asitleri
- Probiyotikler
- Koenzim Q10
- Bitkisel takviyeler (Passiflora, Melisa, Ashwagandha)
- Amino asitler
- Antioksidanlar

YANIT FORMATI:
{
    "analysis": "Kısa semptom analizi",
    "confidence": 85,
    "detected_symptoms": ["Semptom1", "Semptom2"],
    "recommendations": [
        {
            "symptom": "Endikasyon Adı",
            "description": "Kısa açıklama",
            "priority": "Yüksek",
            "products": [
                {
                    "name": "Ana İlaç",
                    "dosage": "Dozaj bilgisi",
                    "usage": "Kullanım şekli",
                    "contraindications": "Uyarılar",
                    "cross_sell": ["Takviye ürünü 1", "Takviye ürünü 2"],
                    "sales_tips": "Satış ipucu"
                },
                {
                    "name": "Takviye Ürünü",
                    "dosage": "Takviye dozajı",
                    "usage": "Takviye kullanımı",
                    "contraindications": "Takviye uyarıları",
                    "cross_sell": ["Ek takviyeler"],
                    "sales_tips": "Takviye satış ipucu"
                }
            ]
        }
    ],
    "cross_selling": [
        {
            "category": "Vitamin/Mineraller",
            "products": ["Ürün1", "Ürün2"],
            "reason": "Neden önerildiği"
        }
    ],
    "warnings": ["Güvenlik uyarıları"],
    "sales_notes": "Satış notları"
}
        `;

        try {
            console.log('🧠 Semptom analizi başlatılıyor...');
            const response = await this.generateContent(prompt, 0.3);
            console.log('📝 AI Yanıtı:', response);
            
            // JSON parsing'i güvenli hale getir
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
                console.log('✅ JSON parsing başarılı:', parsedResponse);
            } catch (parseError) {
                console.error('❌ JSON parsing hatası:', parseError);
                console.error('Ham yanıt:', response);
                
                // JSON parsing başarısız olursa, yanıtı temizle ve tekrar dene
                const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
                try {
                    parsedResponse = JSON.parse(cleanedResponse);
                    console.log('✅ Temizlenmiş JSON parsing başarılı');
                } catch (secondError) {
                    console.error('❌ İkinci JSON parsing denemesi de başarısız:', secondError);
                    throw new Error('AI yanıtı JSON formatında değil: ' + response.substring(0, 100) + '...');
                }
            }
            
            return parsedResponse;
        } catch (error) {
            console.error('❌ Semptom analizi hatası:', error);
            throw new Error('AI analizi sırasında hata oluştu: ' + error.message);
        }
    }

    // Genel sağlık tavsiyesi
    async getHealthAdvice(topic) {
        const prompt = `
Sen bir sağlık danışmanısın. Aşağıdaki konu hakkında kısa ve faydalı bilgi ver:

KONU: ${topic}

Lütfen:
- Bilimsel ve güvenilir bilgi ver
- Pratik öneriler sun
- Türkçe yanıt ver
- 100-200 kelime arasında tut
        `;

        return await this.generateContent(prompt, 0.5);
    }

    // İlaç etkileşim kontrolü
    async checkDrugInteractions(drugs) {
        const prompt = `
Sen bir farmakologsun. Aşağıdaki ilaçlar arasındaki olası etkileşimleri kontrol et:

İLAÇLAR: ${drugs.join(', ')}

Lütfen:
- Olası etkileşimleri belirt
- Güvenlik önerileri ver
- Alternatif öneriler sun
- Türkçe yanıt ver
        `;

        return await this.generateContent(prompt, 0.2);
    }

    // Satış odaklı ürün önerisi
    async getSalesRecommendations(symptoms, budget, preferences) {
        const prompt = `
Sen eczane satış danışmanısın. Müşterinin ihtiyaçlarına göre SATIŞA YÖNELİK ürün önerileri sunacaksın.

MÜŞTERİ BİLGİLERİ:
- Semptomlar: ${symptoms}
- Bütçe: ${budget || 'Belirtilmemiş'}
- Tercihler: ${preferences || 'Belirtilmemiş'}

SATIŞ STRATEJİSİ:
1. Premium ürünler öner (yüksek kaliteli)
2. Ekonomik alternatifler sun
3. Cross-selling yap (ana ürün + destek)
4. Bundle önerileri ver
5. Sezonluk ürünler öner

ÖNEMLİ:
- Her ürün için satış gerekçesi belirt
- Fiyat-performans analizi yap
- Müşteriyi ikna edici açıklamalar yap

YANIT FORMATI:
{
    "sales_strategy": "Kısa satış stratejisi",
    "premium_products": [
        {
            "name": "Ürün Adı",
            "price_range": "Fiyat aralığı",
            "benefits": ["Fayda1", "Fayda2"],
            "sales_pitch": "Satış konuşması"
        }
    ],
    "budget_alternatives": [
        {
            "name": "Ekonomik Ürün",
            "price_range": "Fiyat",
            "benefits": ["Faydalar"],
            "sales_pitch": "Satış stratejisi"
        }
    ],
    "cross_selling": [
        {
            "main_product": "Ana Ürün",
            "add_ons": ["Ek ürün1", "Ek ürün2"],
            "bundle_price": "Paket fiyatı",
            "savings": "Tasarruf miktarı"
        }
    ],
    "sales_tips": ["İpucu1", "İpucu2", "İpucu3"]
}
        `;

        return await this.generateContent(prompt, 0.4);
    }

    // Müşteri segmentasyonu
    async getCustomerSegmentation(age, gender, symptoms, lifestyle) {
        const prompt = `
Sen müşteri analisti olarak müşteriyi segmentlere ayır ve kişiselleştirilmiş öneriler sunacaksın.

MÜŞTERİ BİLGİLERİ:
- Yaş: ${age || 'Belirtilmemiş'}
- Cinsiyet: ${gender || 'Belirtilmemiş'}
- Semptomlar: ${symptoms || 'Belirtilmemiş'}
- Yaşam Tarzı: ${lifestyle || 'Genel'}

SEGMENTASYON:
1. Yaş grubuna göre segmentle
2. Cinsiyet bazlı öneriler ver
3. Semptom bazlı ürün öner
4. Yaşam tarzına uygun öneriler sun

YANIT FORMATI:
{
    "customer_segment": "Segment adı",
    "age_group": "Yaş grubu",
    "lifestyle_category": "Yaşam tarzı",
    "personalized_recommendations": [
        {
            "category": "Kategori",
            "products": ["Ürün1", "Ürün2"],
            "reasoning": "Neden önerildiği",
            "dosage_notes": "Dozaj notları"
        }
    ]
}
        `;

        return await this.generateContent(prompt, 0.3);
    }

    // Dermokozmetik analizi
    async analyzeDermokozmetik(symptoms, age, gender, weight, indications) {
        // Endikasyon verilerini daha fazla kullan
        const limitedIndications = {};
        const indicationKeys = Object.keys(indications).slice(0, 50);
        indicationKeys.forEach(key => {
            limitedIndications[key] = indications[key];
        });

        const prompt = `
Sen deneyimli bir dermatolog ve kozmetik uzmanısın. Hastanın dermokozmetik semptomlarını analiz ederek MUTLAKA DERMOKOZMETİK ÜRÜNLERİ de içeren kapsamlı öneriler sunacaksın.

HASTA BİLGİLERİ:
- Dermokozmetik Semptomlar: ${symptoms}
- Yaş: ${age || 'Belirtilmemiş'}
- Cinsiyet: ${gender || 'Belirtilmemiş'}
- Kilo: ${weight || 'Belirtilmemiş'} kg

MEVCUT ÜRÜN VERİTABANI:
${JSON.stringify(limitedIndications, null, 2)}

GÖREVİN:
1. Hastanın dermokozmetik semptomlarını analiz et
2. Her semptom için MUTLAKA dermokozmetik ürünleri öner (krem, serum, maske vs.)
3. Ana ürün + dermokozmetik ürünü + destek ürünü kombinasyonu yap
4. Cross-selling yap (temizlik + nemlendirme + güneş koruyucu vs.)
5. Yaş ve cinsiyet bazlı dozaj ver
6. Güvenlik uyarılarını belirt

ÖNEMLİ KURALLAR:
- Her semptom için MUTLAKA dermokozmetik ürünü öner
- Temizlik, nemlendirme, güneş koruyucu, anti-aging ürünleri unutma
- Cross-selling zorunlu (ana ürün + dermokozmetik + destek)
- Dozaj yaş/cinsiyet bazlı olsun
- Güvenlik uyarılarını unutma

DERMOKOZMETİK ÜRÜN KATEGORİLERİ:
- Temizlik Ürünleri (Yüz temizleyici, peeling, tonik)
- Nemlendiriciler (Krem, serum, maske)
- Güneş Koruyucular (SPF 30+, SPF 50+)
- Anti-Aging Ürünler (Retinol, peptid, hyaluronik asit)
- Akne Ürünleri (Salicylic asit, benzoyl peroxide)
- Cilt Bakım Serileri (Gündüz/gece bakımı)
- Göz Çevresi Bakımı (Göz kremi, serum)
- Dudak Bakımı (Dudak kremi, balm)

YANIT FORMATI:
{
    "analysis": "Kısa dermokozmetik analizi",
    "confidence": 85,
    "detected_symptoms": ["Semptom1", "Semptom2"],
    "recommendations": [
        {
            "symptom": "Dermokozmetik Endikasyon",
            "description": "Kısa açıklama",
            "priority": "Yüksek",
            "products": [
                {
                    "name": "Ana Dermokozmetik Ürün",
                    "dosage": "Dozaj bilgisi",
                    "usage": "Kullanım şekli",
                    "contraindications": "Uyarılar",
                    "cross_sell": ["Destek ürünü 1", "Destek ürünü 2"],
                    "sales_tips": "Satış ipucu"
                },
                {
                    "name": "Ek Dermokozmetik Ürün",
                    "dosage": "Ek dozaj",
                    "usage": "Ek kullanım",
                    "contraindications": "Ek uyarılar",
                    "cross_sell": ["Ek destek ürünleri"],
                    "sales_tips": "Ek satış ipucu"
                }
            ]
        }
    ],
    "cross_selling": [
        {
            "category": "Dermokozmetik Kategorisi",
            "products": ["Ürün1", "Ürün2"],
            "reason": "Neden önerildiği"
        }
    ],
    "warnings": ["Güvenlik uyarıları"],
    "sales_notes": "Dermokozmetik satış notları"
}
        `;

        try {
            console.log('🧴 Dermokozmetik analizi başlatılıyor...');
            const response = await this.generateContent(prompt, 0.3);
            console.log('📝 Dermokozmetik AI Yanıtı:', response);
            
            // JSON parsing'i güvenli hale getir
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
                console.log('✅ Dermokozmetik JSON parsing başarılı:', parsedResponse);
            } catch (parseError) {
                console.error('❌ Dermokozmetik JSON parsing hatası:', parseError);
                console.error('Ham yanıt:', response);
                
                // JSON parsing başarısız olursa, yanıtı temizle ve tekrar dene
                const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
                try {
                    parsedResponse = JSON.parse(cleanedResponse);
                    console.log('✅ Temizlenmiş dermokozmetik JSON parsing başarılı');
                } catch (secondError) {
                    console.error('❌ İkinci dermokozmetik JSON parsing denemesi de başarısız:', secondError);
                    throw new Error('Dermokozmetik AI yanıtı JSON formatında değil: ' + response.substring(0, 100) + '...');
                }
            }
            
            return parsedResponse;
        } catch (error) {
            console.error('❌ Dermokozmetik analizi hatası:', error);
            throw new Error('Dermokozmetik AI analizi sırasında hata oluştu: ' + error.message);
        }
    }
}

// Global Gemini instance
window.geminiAI = new GeminiAI();

// Varsayılan API key'i ayarla (test için)
window.geminiAI.setApiKey('AIzaSyCl6MV8U5qd0yOHMVHRps5SvMHBu4JNLMw');

// Basit test fonksiyonu
window.testGeminiAPI = async function() {
    try {
        console.log('🧪 Basit API testi başlatılıyor...');
        const response = await window.geminiAI.generateContent('Merhaba, bu bir test mesajıdır.', 0.1);
        console.log('✅ Test başarılı:', response);
        return true;
    } catch (error) {
        console.error('❌ Test başarısız:', error);
        return false;
    }
}; 