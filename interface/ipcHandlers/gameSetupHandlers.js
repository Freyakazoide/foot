const { ipcMain } = require('electron');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');
const fs = require('fs');

const dbPath = path.join(__dirname, '../', 'foot.db');
const flagPath = path.join(__dirname, '../', 'new_world.flag');

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

function registerGameSetupHandlers(db) {
    const dbRun = util.promisify(db.run.bind(db));
    const dbGet = util.promisify(db.get.bind(db));
    const dbAll = util.promisify(db.all.bind(db));

    ipcMain.handle('get-all-clubs', async () => {
        return await dbAll("SELECT id, name FROM clubs ORDER BY name");
    });

    ipcMain.handle('start-new-game', async (event, { clubId }) => {
        const initialDate = '2025-01-20';
        await dbRun("UPDATE game_state SET player_club_id = ?, current_date = ? WHERE id = 1", [clubId, initialDate]);
        const updatedState = await dbGet("SELECT current_date FROM game_state WHERE id = 1");
        return { success: true, gameState: updatedState };
    });
    
    ipcMain.handle('generate-new-world', async () => {
        try {
            await runPythonScript('generate_new_world.py', dbPath);
            fs.writeFileSync(flagPath, '');
            return { success: true };
        } catch (error) {
            console.error('Falha ao gerar novo mundo:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('debug-get-current-date', async () => {
        const state = await dbGet("SELECT current_date FROM game_state WHERE id = 1");
        return state;
    });

    ipcMain.handle('get-game-state', async () => {
        return await dbGet("SELECT current_date FROM game_state WHERE id = 1");
    });
}

module.exports = { registerGameSetupHandlers };