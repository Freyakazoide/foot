const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const { registerGameSetupHandlers } = require('./ipcHandlers/gameSetupHandlers');
const { registerGameLoopHandlers, registerTrainingReportHandler } = require('./ipcHandlers/gameLoopHandlers');
const { registerDataHandlers } = require('./ipcHandlers/dataHandlers');
const { registerPlayerHandlers } = require('./ipcHandlers/playerHandlers');
const { registerTrainingHandlers } = require('./ipcHandlers/trainingHandlers');

const dbPath = path.join(__dirname, 'foot.db');

// --- MUDANÇA ARQUITETURAL ---
// Criamos a conexão única aqui.
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('ERRO FATAL AO ABRIR DB:', err.message);
    } else {
        console.log('[MAIN DB] Conexão com o banco de dados estabelecida.');
    }
});

// A função de correção agora usa a conexão principal
function forceCorrectDateOnNewWorld() {
    const flagPath = path.join(__dirname, 'new_world.flag');
    if (fs.existsSync(flagPath)) {
        console.log("[MAIN BOOT] Sinalizador 'new_world.flag' encontrado. Forçando correção da data...");
        const initialDate = '2025-01-20';
        db.run("UPDATE game_state SET current_date = ? WHERE id = 1", [initialDate], (err) => {
            if (err) console.error("[MAIN BOOT] ERRO CRÍTICO ao forçar a data:", err.message);
            else console.log(`[MAIN BOOT] SUCESSO! A data no DB foi forçada para ${initialDate}.`);
            fs.unlinkSync(flagPath);
        });
    }
}

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
    forceCorrectDateOnNewWorld();
    createWindow();
    
    ipcMain.on('restart-app', () => {
        console.log('[MAIN] Comando de reinício recebido. Fechando conexão com DB...');
        db.close((err) => {
            if (err) console.error('Erro ao fechar DB antes de reiniciar:', err.message);
            app.relaunch();
            app.quit();
        });
    });

    // Passamos a conexão 'db' para todos os handlers
    registerGameSetupHandlers(db);
    registerGameLoopHandlers(db);
    registerDataHandlers(db);
    registerPlayerHandlers(db);
    registerTrainingHandlers(db);
});

// Garante que o DB seja fechado ao sair
app.on('window-all-closed', () => { 
    if (db) db.close();
    if (process.platform !== 'darwin') app.quit(); 
});