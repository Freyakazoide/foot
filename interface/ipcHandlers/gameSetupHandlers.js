const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');
const util = require('util');

const dbPath = path.join(__dirname, '../', 'foot.db');

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

function registerGameSetupHandlers() {
    ipcMain.handle('get-all-clubs', async () => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        const dbAll = util.promisify(db.all.bind(db));
        try {
            return await dbAll("SELECT id, name FROM clubs ORDER BY name");
        } finally {
            db.close();
        }
    });

    ipcMain.handle('start-new-game', async (event, { clubId }) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
        const dbRun = util.promisify(db.run.bind(db));
        try {
            await dbRun("UPDATE game_state SET player_club_id = ? WHERE id = 1", [clubId]);
            return { success: true };
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
            await runPythonScript('generate_new_world.py', dbPath);
            return { success: true };
        } catch (error) {
            console.error('Falha ao gerar novo mundo:', error);
            return { success: false, message: error.message };
        }
    });
}

module.exports = { registerGameSetupHandlers };