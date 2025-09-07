const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerGameSetupHandlers } = require('./ipcHandlers/gameSetupHandlers');
const { registerGameLoopHandlers } = require('./ipcHandlers/gameLoopHandlers');
const { registerDataHandlers } = require('./ipcHandlers/dataHandlers');
const { registerPlayerHandlers } = require('./ipcHandlers/playerHandlers');

function createWindow() {
    const win = new BrowserWindow({ 
        width: 1000, 
        height: 700, 
        webPreferences: { 
            preload: path.join(__dirname, 'preload.js') 
        } 
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    
    // Os handlers agora gerenciam suas próprias conexões novamente
    registerGameSetupHandlers();
    registerGameLoopHandlers();
    registerDataHandlers();
    registerPlayerHandlers();
});

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
});