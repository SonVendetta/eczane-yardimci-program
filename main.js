const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    // Ana pencere oluştur
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // İkon varsa
        titleBarStyle: 'default',
        show: false, // Pencere hazır olana kadar gizle
        backgroundColor: '#f8f9fa'
    });

    // HTML dosyasını yükle
    mainWindow.loadFile('index.html');

    // Pencere hazır olduğunda göster
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Geliştirici araçlarını aç (development modunda)
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // Pencere kapatıldığında
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Menü oluştur
    createMenu();
}

// Menü oluşturma
function createMenu() {
    const template = [
        {
            label: 'Dosya',
            submenu: [
                {
                    label: 'Yenile',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Geliştirici Araçları',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Çıkış',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Düzenle',
            submenu: [
                { role: 'undo', label: 'Geri Al' },
                { role: 'redo', label: 'Yinele' },
                { type: 'separator' },
                { role: 'cut', label: 'Kes' },
                { role: 'copy', label: 'Kopyala' },
                { role: 'paste', label: 'Yapıştır' },
                { role: 'selectall', label: 'Tümünü Seç' }
            ]
        },
        {
            label: 'Görünüm',
            submenu: [
                { role: 'reload', label: 'Yenile' },
                { role: 'forceReload', label: 'Zorla Yenile' },
                { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
                { role: 'zoomIn', label: 'Yakınlaştır' },
                { role: 'zoomOut', label: 'Uzaklaştır' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Tam Ekran' }
            ]
        },
        {
            label: 'Yardım',
            submenu: [
                {
                    label: 'Hakkında',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Eczane Yardımcı Programı',
                            message: 'Eczane Yardımcı Programı v2.0',
                            detail: 'Bu program, eczanelerde çapraz satış önerileri için geliştirilmiştir.\n\nÖzellikler:\n• Barkod/QR kod arama\n• Endikasyon bazlı öneriler\n• Çapraz satış kategorileri\n• Modern arayüz\n\nGeliştirici: AI Assistant\nVersiyon: 2.0 (Electron)'
                        });
                    }
                },
                {
                    label: 'Kullanım Kılavuzu',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Kullanım Kılavuzu',
                            message: 'Eczane Yardımcı Programı Kullanımı',
                            detail: '1. Barkod/QR Kod Arama:\n   • 13 haneli barkod numarası girin\n   • QR kod verisini yapıştırın\n   • Enter tuşu ile arama yapın\n\n2. Endikasyon Arama:\n   • Endikasyon adını yazın\n   • Listeden seçin\n   • Önerileri görün\n\n3. İstatistikler:\n   • Veri sayılarını görün\n   • Son aramaları takip edin'
                        });
                    }
                }
            ]
        }
    ];

    // macOS için ek menü öğeleri
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: 'Hakkında' },
                { type: 'separator' },
                { role: 'services', label: 'Hizmetler' },
                { type: 'separator' },
                { role: 'hide', label: 'Gizle' },
                { role: 'hideothers', label: 'Diğerlerini Gizle' },
                { role: 'unhide', label: 'Tümünü Göster' },
                { type: 'separator' },
                { role: 'quit', label: 'Çıkış' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('load-data', async () => {
    try {
        // Barkod listesi yükle
        const barkodPath = path.join(__dirname, 'barkod_listesi.json');
        const barkodData = JSON.parse(fs.readFileSync(barkodPath, 'utf8'));
        
        // Cross-sales verisi yükle
        const dataPath = path.join(__dirname, 'data.json');
        const crossSalesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        console.log(`Barkod listesi yüklendi: ${Object.keys(barkodData).length} kayıt`);
        console.log('Cross-sales verisi yüklendi');
        
        return { barkodData, crossSalesData };
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        throw error;
    }
});

// App events
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Güvenlik: Yeni pencere açılmasını engelle
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
    });
});

// Hata yakalama
process.on('uncaughtException', (error) => {
    console.error('Yakalanmamış hata:', error);
    dialog.showErrorBox('Hata', `Beklenmeyen bir hata oluştu:\n${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('İşlenmeyen Promise reddi:', reason);
    dialog.showErrorBox('Hata', `Promise hatası:\n${reason}`);
}); 