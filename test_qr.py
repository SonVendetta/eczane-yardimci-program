#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def extract_barkod_from_qr(qr_data):
    """QR kod verisinden barkod kısmını çıkar"""
    qr_data = str(qr_data).strip()
    # Format 1: 01 + 13 haneli barkod + ek veri
    if qr_data.startswith('01') and len(qr_data) >= 15:
        barkod = qr_data[2:15]
        if barkod.isdigit() and len(barkod) == 13:
            return barkod
    # Format 2: Direkt 13 haneli barkod
    if qr_data.isdigit() and len(qr_data) == 13:
        return qr_data
    # Format 3: Barkod içeren herhangi bir string (13 haneli rakamı, rakamdan sonra harf gelse bile bul)
    import re
    barkod_match = re.search(r'(?<!\d)(\d{13})(?!\d)', qr_data)
    if barkod_match:
        return barkod_match.group(1)
    return None

def test_qr_extraction():
    """QR kod çıkarma fonksiyonunu test et"""
    
    test_cases = [
        # Format 1: 01 + barkod + ek veri
        ("0186995140169081234567890", "8699514016908"),
        ("0186995080107529876543210", "8699508010752"),
        
        # Format 2: Direkt barkod
        ("8699514016908", "8699514016908"),
        ("8699508010752", "8699508010752"),
        
        # Format 3: Karışık formatlar
        ("QR: 8699514016908", "8699514016908"),
        ("Barkod: 8699508010752", "8699508010752"),
        ("01 8699514016908 123", "8699514016908"),
        ("8699514016908abc", "8699514016908"),
        
        # Geçersiz formatlar
        ("123456789", None),
        ("abc123def", None),
        ("", None),
        ("869951401690", None),  # 12 hane
        ("86995140169089", None),  # 14 hane
    ]
    
    print("=== QR KOD ÇIKARMA TESTİ ===")
    for i, (input_data, expected) in enumerate(test_cases, 1):
        result = extract_barkod_from_qr(input_data)
        status = "✅" if result == expected else "❌"
        print(f"{i:2d}. {status} Giriş: '{input_data}' -> Çıktı: '{result}' (Beklenen: '{expected}')")
    
    print(f"\nToplam test: {len(test_cases)}")
    success_count = sum(1 for _, (_, expected) in enumerate(test_cases) if extract_barkod_from_qr(_) == expected)
    print(f"Başarılı: {success_count}/{len(test_cases)}")

if __name__ == "__main__":
    test_qr_extraction() 