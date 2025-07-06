#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import tkinter as tk
from tkinter import messagebox

def test_barkod_processing():
    """Barkod işleme fonksiyonlarını test et"""
    
    # Veri dosyalarını yükle
    try:
        with open('barkod_listesi.json', 'r', encoding='utf-8') as f:
            barkod_listesi = json.load(f)
        print(f"Barkod listesi yüklendi: {len(barkod_listesi)} kayıt")
        
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("Data dosyası yüklendi")
    except Exception as e:
        print(f"Dosya yükleme hatası: {e}")
        return
    
    # Test barkodları
    test_barkodlar = [
        "8699514016908",  # H03AA03 - Tiroid ilacı
        "8699508010752",  # H02AB02 - Kortikosteroid
        "8691234567890",  # Olmayan barkod
    ]
    
    def extract_barkod_from_qr(qr_data):
        if qr_data.startswith('01') and len(qr_data) >= 15:
            barkod = qr_data[2:15]
            return barkod
        return None
    
    def find_cross_sales(atc_kodu):
        if 'capraz_satis' in data:
            for category, info in data['capraz_satis'].items():
                category_code = category.split(' ')[0]
                if (atc_kodu.startswith(category_code) or 
                    category_code in atc_kodu or 
                    atc_kodu in category):
                    result = f"Kategori: {category}\n"
                    if 'Uyarılar' in info:
                        result += f"Uyarı: {info['Uyarılar']}\n\n"
                    if 'Ürünler' in info:
                        result += "Önerilen Ürünler:\n"
                        for urun, detaylar in info['Ürünler'].items():
                            result += f"\n• {urun}\n"
                            for key, value in detaylar.items():
                                result += f"  {key}: {value}\n"
                    return result
        if 'yeni_capraz_satis' in data:
            for category, info in data['yeni_capraz_satis'].items():
                category_code = category.split(' ')[0]
                if (atc_kodu.startswith(category_code) or 
                    category_code in atc_kodu or 
                    atc_kodu in category):
                    result = f"Kategori: {category}\n"
                    if 'Uyarılar' in info:
                        result += f"Uyarı: {info['Uyarılar']}\n\n"
                    if 'Ürünler' in info:
                        result += "Önerilen Ürünler:\n"
                        for urun, detaylar in info['Ürünler'].items():
                            result += f"\n• {urun}\n"
                            for key, value in detaylar.items():
                                result += f"  {key}: {value}\n"
                    return result
        return None
    
    def process_barkod(barkod, original_input):
        print(f"\n=== BARKOD TEST: {barkod} ===")
        if barkod in barkod_listesi:
            barkod_info = barkod_listesi[barkod]
            atc_kodu = barkod_info.get('ATC Kodu', barkod_info.get('atc_kodu', 'Bilinmiyor'))
            urun_adi = barkod_info.get('Ürün Adı', barkod_info.get('urun_adi', 'Bilinmiyor'))
            
            print(f"Orijinal Giriş: {original_input}")
            print(f"Barkod: {barkod}")
            print(f"Ürün Adı: {urun_adi}")
            print(f"ATC Kodu: {atc_kodu}")
            
            capraz_oneriler = find_cross_sales(atc_kodu)
            if capraz_oneriler:
                print(f"\n=== ÇAPRAZ SATIŞ ÖNERİLERİ ===")
                print(capraz_oneriler)
            else:
                print("\nBu ATC kodu için çapraz satış önerisi bulunamadı.")
        else:
            print(f"Barkod '{barkod}' veritabanında bulunamadı.")
            print(f"Orijinal giriş: {original_input}")
    
    # Test işlemleri
    print("=== BARKOD İŞLEME TESTİ ===")
    
    for barkod in test_barkodlar:
        process_barkod(barkod, barkod)
    
    # QR kod testi
    print("\n=== QR KOD TESTİ ===")
    test_qr = "0186995140169081234567890"  # 01 + barkod + ek veri
    extracted = extract_barkod_from_qr(test_qr)
    print(f"QR kod: {test_qr}")
    print(f"Çıkarılan barkod: {extracted}")
    if extracted:
        process_barkod(extracted, test_qr)

if __name__ == "__main__":
    test_barkod_processing() 