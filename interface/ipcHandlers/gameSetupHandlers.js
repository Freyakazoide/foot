const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const { spawn } = require('child_process');
const fs = require('fs'); // Importe o módulo 'fs'

const dbPath = path.join(__dirname, '../', 'foot.db');
const flagPath = path.join(__dirname, '../', 'new_world.flag'); // Caminho para o nosso arquivo sinalizador


function runPythonScript(scriptName, dbPathArg) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../', scriptName);
        const pythonProcess = spawn('python', ['-X', 'utf8', scriptPath, '--db_path', dbPathArg]);
        pythonProcess.stdout.on('data', (data) => console.log(`[${scriptName}]: ${data}`));
        pythonProcess.stderr.on('data', (data) => console.error(`[${scriptName} stderr]: ${data}`));
        pythonProcess.on('close', (code) => {
            if (code !== 0) return reject(new Error(`Script ${scriptName} finalizado com código ${code}`));
            resolve();
        });
    });
}

function registerGameSetupHandlers(db) { // Recebe 'db'
    ipcMain.handle('debug-get-current-date', async () => {
        const dbGet = util.promisify(db.get.bind(db));
        const state = await dbGet("SELECT current_date FROM game_state WHERE id = 1");
        console.log(`[DEBUG] Leitura direta da DB. Data atual: ${state ? state.current_date : 'NÃO ENCONTRADA'}`);
        return state;
    });

 ipcMain.handle('start-new-game', async (event, { clubId }) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
        const dbRun = util.promisify(db.run.bind(db));
        const dbGet = util.promisify(db.get.bind(db));
        try {
            const initialDate = '2025-01-20';
            console.log(`[HANDLER] Tentando INICIAR JOGO. Gravando data: ${initialDate}`);
            await dbRun("UPDATE game_state SET player_club_id = ?, current_date = ? WHERE id = 1", [clubId, initialDate]);
            const updatedState = await dbGet("SELECT current_date FROM game_state WHERE id = 1");
            console.log(`[HANDLER] JOGO INICIADO. Data confirmada na DB: ${updatedState.current_date}`);
            return { success: true, gameState: updatedState };
        } finally {
            db.close();
        }
    });

    ipcMain.handle('get-game-state', async () => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        const dbGet = util.promisify(db.get.bind(db));
        try {
            return await dbGet("SELECT current_date FROM game_state WHERE id = 1");
        } finally {
            db.close();
        }
    });
    
    ipcMain.handle('generate-new-world', async () => {
        try {
            console.log("[HANDLER] Iniciando script 'generate_new_world.py'...");
            await runPythonScript('generate_new_world.py', dbPath);
            
            // --- A MUDANÇA CRÍTICA ESTÁ AQUI ---
            // Cria um arquivo vazio que sinaliza que um novo mundo foi gerado.
            fs.writeFileSync(flagPath, ''); 
            console.log("[HANDLER] Sinalizador 'new_world.flag' criado.");

            return { success: true };
        } catch (error) {
            console.error('Falha ao gerar novo mundo:', error);
            return { success: false, message: error.message };
        }
    });
}


ipcMain.handle('debug-get-current-date', async () => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    const dbGet = util.promisify(db.get.bind(db));
    try {
        const state = await dbGet("SELECT current_date FROM game_state WHERE id = 1");
        console.log(`[DEBUG] Leitura direta da DB. Data atual: ${state ? state.current_date : 'NÃO ENCONTRADA'}`);
        return state;
    } finally {
        db.close();
    }
});

module.exports = { registerGameSetupHandlers };