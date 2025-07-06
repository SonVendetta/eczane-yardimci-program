#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

def test_barkod_search():
    """Barkod arama testi"""
    
    # Dosyaları yükle
    with open('barkod_listesi.json', 'r', encoding='utf-8') as f:
        barkod_listesi = json.load(f)
    
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Test barkodu (Statin - C10AA)
    test_barkod = "8699559090772"
    
    print("=== TEST SONUÇLARI ===")
    print(f"Test Barkod: {test_barkod}")
    
    # Barkod bilgilerini bul
    if test_barkod in barkod_listesi:
        barkod_info = barkod_listesi[test_barkod]
        atc_kodu = barkod_info.get('ATC Kodu', 'Bilinmiyor')
        urun_adi = barkod_info.get('Ürün Adı', 'Bilinmiyor')
        
        print(f"Ürün Adı: {urun_adi}")
        print(f"ATC Kodu: {atc_kodu}")
        
        # Çapraz satış önerilerini bul
        print("\n=== ÇAPRAZ SATIŞ ÖNERİLERİ ===")
        found_cross_sales = False
        
        if 'capraz_satis' in data:
            for category, info in data['capraz_satis'].items():
                # ATC kodu eşleştirme - daha esnek arama
                category_code = category.split(' ')[0]  # "C10AA (Statinler)" -> "C10AA"
                if (atc_kodu.startswith(category_code) or 
                    category_code in atc_kodu or 
                    atc_kodu in category):
                    print(f"Kategori: {category}")
                    if 'Uyarılar' in info:
                        print(f"Uyarı: {info['Uyarılar']}")
                    
                    if 'Ürünler' in info:
                        print("Önerilen Ürünler:")
                        for urun, detaylar in info['Ürünler'].items():
                            print(f"\n• {urun}")
                            for key, value in detaylar.items():
                                print(f"  {key}: {value}")
                    found_cross_sales = True
                    break
        
        if not found_cross_sales:
            print("Bu ATC kodu için çapraz satış önerisi bulunamadı.")
        
        # Endikasyon bazlı önerileri de ekle
        print("\n=== ENDİKASYON BAZLI ÖNERİLER ===")
        indications = []
        
        if 'C10' in atc_kodu:
            indications.extend(['Kolesterol Düşürme', 'Kalp Sağlığı'])
        
        found_indications = False
        if 'endikasyon' in data:
            for indication in indications:
                if indication in data['endikasyon']:
                    info = data['endikasyon'][indication]
                    print(f"\n{indication}:")
                    if 'Açıklama' in info:
                        print(f"Açıklama: {info['Açıklama']}")
                    
                    if 'Ürünler' in info and info['Ürünler']:
                        print("Önerilen Ürünler:")
                        for urun, detaylar in info['Ürünler'].items():
                            print(f"\n• {urun}")
                            for key, value in detaylar.items():
                                print(f"  {key}: {value}")
                    found_indications = True
        
        if not found_indications:
            print("Bu ATC kodu için endikasyon bazlı öneri bulunamadı.")
            
    else:
        print(f"Barkod '{test_barkod}' veritabanında bulunamadı.")

if __name__ == "__main__":
    test_barkod_search() 