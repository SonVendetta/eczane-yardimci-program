import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import re

class EczaneYardimci:
    def __init__(self, root):
        self.root = root
        self.root.title("Eczane Yardımcı Programı")
        self.root.geometry("900x600")
        
        # Tema değişkeni
        self.dark_mode = tk.BooleanVar(value=False)
        
        # Veri dosyalarını yükle
        self.barkod_listesi = {}
        self.data = {}
        self.load_data()
        
        # Endikasyonlar
        self.selected_endikasyon = tk.StringVar()
        self.all_indications = []
        
        self.setup_ui()
        self.apply_theme()

    def load_data(self):
        try:
            with open('barkod_listesi.json', 'r', encoding='utf-8') as f:
                self.barkod_listesi = json.load(f)
            print(f"Barkod listesi yüklendi: {len(self.barkod_listesi)} kayıt")
            with open('data.json', 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            print("Data dosyası yüklendi")
        except Exception as e:
            messagebox.showerror("Hata", f"Dosya yükleme hatası: {e}")

    def setup_ui(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky="nsew")
        
        # Başlık ve tema değiştirici
        header_frame = ttk.Frame(main_frame)
        header_frame.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        title_label = ttk.Label(header_frame, text="Eczane Yardımcı Programı", font=("Arial", 16, "bold"))
        title_label.pack(side="left")
        
        theme_button = ttk.Button(header_frame, text="🌙 Karanlık Mod", command=self.toggle_theme)
        theme_button.pack(side="right", padx=(10, 0))
        
        # Manuel Barkod Girişi
        manual_frame = ttk.LabelFrame(main_frame, text="Manuel Barkod Girişi", padding="10")
        manual_frame.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(0, 10))
        
        ttk.Label(manual_frame, text="Barkod veya QR Kod Verisi:").grid(row=0, column=0, sticky="w")
        self.barkod_entry = ttk.Entry(manual_frame, width=50)
        self.barkod_entry.grid(row=0, column=1, padx=(10, 0))
        self.barkod_entry.bind("<Return>", lambda event: self.search_barkod())
        ttk.Button(manual_frame, text="Ara", command=self.search_barkod).grid(row=0, column=2, padx=(10, 0))
        
        # Sekmeli Sonuçlar
        tab_frame = ttk.LabelFrame(main_frame, text="Sonuçlar", padding="10")
        tab_frame.grid(row=2, column=0, columnspan=2, sticky="nsew", pady=(0, 10))
        
        self.notebook = ttk.Notebook(tab_frame)
        self.notebook.grid(row=0, column=0, sticky="nsew")
        
        # Barkod bazlı öneriler sekmesi
        self.barkod_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.barkod_tab, text="Barkod Bazlı Öneriler")
        self.barkod_text = scrolledtext.ScrolledText(self.barkod_tab, height=15, width=80)
        self.barkod_text.pack(fill="both", expand=True)
        
        # Endikasyon bazlı öneriler sekmesi
        self.endikasyon_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.endikasyon_tab, text="Endikasyon Bazlı Öneriler")
        
        # Endikasyon arama ve seçim frame
        endikasyon_frame = ttk.Frame(self.endikasyon_tab)
        endikasyon_frame.pack(fill="x", pady=(5, 5))
        
        ttk.Label(endikasyon_frame, text="Endikasyon Ara:").pack(side="left", padx=(0, 10))
        self.search_entry = ttk.Entry(endikasyon_frame, width=30)
        self.search_entry.pack(side="left", padx=(0, 10))
        self.search_entry.bind("<KeyRelease>", self.filter_indications)
        
        ttk.Label(endikasyon_frame, text="Seçin:").pack(side="left", padx=(10, 10))
        self.endikasyon_combo = ttk.Combobox(endikasyon_frame, textvariable=self.selected_endikasyon, state="readonly", width=30)
        self.endikasyon_combo.pack(side="left", padx=(0, 10))
        self.endikasyon_combo.bind("<<ComboboxSelected>>", self.update_endikasyon_text)
        
        self.endikasyon_text = scrolledtext.ScrolledText(self.endikasyon_tab, height=15, width=80)
        self.endikasyon_text.pack(fill="both", expand=True)
        
        self.load_all_indications()
        
        # Grid ayarları
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(2, weight=1)
        tab_frame.columnconfigure(0, weight=1)
        tab_frame.rowconfigure(0, weight=1)

    def toggle_theme(self):
        self.dark_mode.set(not self.dark_mode.get())
        self.apply_theme()

    def apply_theme(self):
        if self.dark_mode.get():
            # Karanlık tema
            self.root.configure(bg='#2b2b2b')
            style = ttk.Style()
            style.theme_use('clam')
            style.configure('TFrame', background='#2b2b2b')
            style.configure('TLabel', background='#2b2b2b', foreground='#ffffff')
            style.configure('TLabelframe', background='#2b2b2b', foreground='#ffffff')
            style.configure('TLabelframe.Label', background='#2b2b2b', foreground='#ffffff')
            style.configure('TButton', background='#404040', foreground='#ffffff')
            style.configure('TEntry', fieldbackground='#404040', foreground='#ffffff')
            style.configure('TCombobox', fieldbackground='#404040', foreground='#ffffff')
            
            # Text widget'ları için karanlık tema
            self.barkod_text.configure(bg='#404040', fg='#ffffff', insertbackground='#ffffff')
            self.endikasyon_text.configure(bg='#404040', fg='#ffffff', insertbackground='#ffffff')
        else:
            # Açık tema (varsayılan)
            self.root.configure(bg='#f0f0f0')
            style = ttk.Style()
            style.theme_use('clam')
            style.configure('TFrame', background='#f0f0f0')
            style.configure('TLabel', background='#f0f0f0', foreground='#000000')
            style.configure('TLabelframe', background='#f0f0f0', foreground='#000000')
            style.configure('TLabelframe.Label', background='#f0f0f0', foreground='#000000')
            style.configure('TButton', background='#e1e1e1', foreground='#000000')
            style.configure('TEntry', fieldbackground='#ffffff', foreground='#000000')
            style.configure('TCombobox', fieldbackground='#ffffff', foreground='#000000')
            
            # Text widget'ları için açık tema
            self.barkod_text.configure(bg='#ffffff', fg='#000000', insertbackground='#000000')
            self.endikasyon_text.configure(bg='#ffffff', fg='#000000', insertbackground='#000000')

    def load_all_indications(self):
        self.all_indications = []
        if 'endikasyon' in self.data:
            self.all_indications.extend(list(self.data['endikasyon'].keys()))
        if 'yeni_endikasyon' in self.data:
            self.all_indications.extend(list(self.data['yeni_endikasyon'].keys()))
        if 'Örnek Endikasyon' in self.all_indications:
            self.all_indications.remove('Örnek Endikasyon')
        self.endikasyon_combo['values'] = self.all_indications
        if self.all_indications:
            self.endikasyon_combo.current(0)
            self.update_endikasyon_text()

    def filter_indications(self, event=None):
        search_term = self.search_entry.get().lower()
        if search_term:
            filtered = [ind for ind in self.all_indications if search_term in ind.lower()]
            self.endikasyon_combo['values'] = filtered
            if filtered:
                self.endikasyon_combo.current(0)
                self.update_endikasyon_text()
        else:
            self.endikasyon_combo['values'] = self.all_indications
            if self.all_indications:
                self.endikasyon_combo.current(0)
                self.update_endikasyon_text()

    def extract_barkod_from_qr(self, qr_data):
        qr_data = str(qr_data).strip()
        if qr_data.startswith('01') and len(qr_data) >= 15:
            barkod = qr_data[2:15]
            if barkod.isdigit() and len(barkod) == 13:
                return barkod
        if qr_data.isdigit() and len(qr_data) == 13:
            return qr_data
        barkod_match = re.search(r'(?<!\d)(\d{13})(?!\d)', qr_data)
        if barkod_match:
            return barkod_match.group(1)
        return None

    def search_barkod(self):
        input_data = self.barkod_entry.get().strip()
        self.barkod_text.delete(1.0, tk.END)
        
        if not input_data:
            messagebox.showwarning("Uyarı", "Lütfen bir barkod veya QR kod verisi girin!")
            return
            
        if len(input_data) > 13:
            barkod = self.extract_barkod_from_qr(input_data)
            if barkod:
                self.process_barkod(barkod, input_data)
            else:
                self.show_helpful_error("Geçersiz QR kod formatı!", input_data)
        else:
            self.process_barkod(input_data, input_data)

    def show_helpful_error(self, error_msg, input_data):
        """Kullanıcı dostu hata mesajları göster"""
        self.barkod_text.insert(tk.END, f"❌ {error_msg}\n\n")
        self.barkod_text.insert(tk.END, f"Girilen veri: {input_data}\n\n")
        self.barkod_text.insert(tk.END, "💡 Öneriler:\n")
        self.barkod_text.insert(tk.END, "• 13 haneli barkod numarasını kontrol edin\n")
        self.barkod_text.insert(tk.END, "• QR kod verisinin doğru kopyalandığından emin olun\n")
        self.barkod_text.insert(tk.END, "• Endikasyon sekmesinden manuel arama yapabilirsiniz\n")
        self.barkod_text.insert(tk.END, "• Barkod listesinde olmayan ürünler için eczacınıza danışın\n")

    def process_barkod(self, barkod, original_input):
        if barkod in self.barkod_listesi:
            barkod_info = self.barkod_listesi[barkod]
            atc_kodu = barkod_info.get('ATC Kodu', barkod_info.get('atc_kodu', 'Bilinmiyor'))
            urun_adi = barkod_info.get('Ürün Adı', barkod_info.get('urun_adi', 'Bilinmiyor'))
            
            barkod_result = f"✅ ÜRÜN BULUNDU\n"
            barkod_result += f"{'='*50}\n"
            barkod_result += f"📦 Ürün Adı: {urun_adi}\n"
            barkod_result += f"🏷️  Barkod: {barkod}\n"
            barkod_result += f"🔬 ATC Kodu: {atc_kodu}\n"
            barkod_result += f"📝 Orijinal Giriş: {original_input}\n\n"
            
            capraz_oneriler = self.find_cross_sales(atc_kodu)
            if capraz_oneriler:
                barkod_result += f"🛒 ÇAPRAZ SATIŞ ÖNERİLERİ\n"
                barkod_result += f"{'='*50}\n"
                barkod_result += capraz_oneriler
            else:
                barkod_result += "ℹ️  Bu ATC kodu için çapraz satış önerisi bulunamadı.\n"
                barkod_result += "💡 Endikasyon sekmesinden manuel arama yapabilirsiniz.\n"
            
            self.barkod_text.insert(tk.END, barkod_result)
        else:
            self.show_helpful_error("Barkod veritabanında bulunamadı!", barkod)

    def update_endikasyon_text(self, event=None):
        self.endikasyon_text.delete(1.0, tk.END)
        selected = self.selected_endikasyon.get()
        if not selected:
            return
            
        info = self.data.get('endikasyon', {}).get(selected)
        if not info:
            info = self.data.get('yeni_endikasyon', {}).get(selected)
        if not info:
            self.endikasyon_text.insert(tk.END, "❌ Seçilen endikasyon için veri bulunamadı.\n")
            return
            
        result = f"🏥 {selected}\n"
        result += f"{'='*50}\n"
        
        if 'Açıklama' in info:
            result += f"📋 Açıklama: {info['Açıklama']}\n\n"
        if 'Uyarılar' in info and info['Uyarılar']:
            result += f"⚠️  Uyarılar: {info['Uyarılar']}\n\n"
        if 'Kontrendikasyonlar' in info and info['Kontrendikasyonlar']:
            result += f"🚫 Kontrendikasyonlar: {info['Kontrendikasyonlar']}\n\n"
            
        if 'Ürünler' in info and info['Ürünler']:
            result += f"💊 ÖNERİLEN ÜRÜNLER\n"
            result += f"{'='*50}\n"
            for urun, detaylar in info['Ürünler'].items():
                result += f"\n💊 {urun}\n"
                for key, value in detaylar.items():
                    result += f"   • {key}: {value}\n"
        
        self.endikasyon_text.insert(tk.END, result)

    def find_cross_sales(self, atc_kodu):
        if 'capraz_satis' in self.data:
            for category, info in self.data['capraz_satis'].items():
                category_code = category.split(' ')[0]
                if (atc_kodu.startswith(category_code) or 
                    category_code in atc_kodu or 
                    atc_kodu in category):
                    result = f"📂 Kategori: {category}\n"
                    if 'Uyarılar' in info:
                        result += f"⚠️  Uyarı: {info['Uyarılar']}\n\n"
                    if 'Ürünler' in info:
                        result += "💊 Önerilen Ürünler:\n"
                        for urun, detaylar in info['Ürünler'].items():
                            result += f"\n💊 {urun}\n"
                            for key, value in detaylar.items():
                                result += f"   • {key}: {value}\n"
                    return result
        if 'yeni_capraz_satis' in self.data:
            for category, info in self.data['yeni_capraz_satis'].items():
                category_code = category.split(' ')[0]
                if (atc_kodu.startswith(category_code) or 
                    category_code in atc_kodu or 
                    atc_kodu in category):
                    result = f"📂 Kategori: {category}\n"
                    if 'Uyarılar' in info:
                        result += f"⚠️  Uyarı: {info['Uyarılar']}\n\n"
                    if 'Ürünler' in info:
                        result += "💊 Önerilen Ürünler:\n"
                        for urun, detaylar in info['Ürünler'].items():
                            result += f"\n💊 {urun}\n"
                            for key, value in detaylar.items():
                                result += f"   • {key}: {value}\n"
                    return result
        return None

def main():
    root = tk.Tk()
    app = EczaneYardimci(root)
    root.mainloop()

if __name__ == "__main__":
    main() 