const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerGameSetupHandlers } = require('./ipcHandlers/gameSetupHandlers');
const { registerGameLoopHandlers, registerTrainingReportHandler } = require('./ipcHandlers/gameLoopHandlers'); // ATUALIZADO
const { registerDataHandlers } = require('./ipcHandlers/dataHandlers');
const { registerPlayerHandlers } = require('./ipcHandlers/playerHandlers');
const { registerTrainingHandlers } = require('./ipcHandlers/trainingHandlers');

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
    registerTrainingReportHandler();
    registerPlayerHandlers();
    registerTrainingHandlers();
});

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
});