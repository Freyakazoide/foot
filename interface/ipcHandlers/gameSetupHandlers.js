const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process'); 

function runPythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../', scriptName);
        const pythonProcess = spawn('python', [scriptPath]);

        pythonProcess.stdout.on('data', (data) => console.log(`${scriptName}: ${data}`));
        pythonProcess.stderr.on('data', (data) => console.error(`${scriptName} stderr: ${data}`));

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Script ${scriptName} finalizado com código ${code}`));
            }
            resolve();
        });
    });
}

function registerGameSetupHandlers() {

        ipcMain.handle('generate-new-world', async () => {
        try {
            await runPythonScript('generate_world.py');
            await runPythonScript('generate_calendar.py');
            return { success: true };
        } catch (error) {
            console.error('Falha ao gerar novo mundo:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('get-all-clubs', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            db.all("SELECT id, name FROM clubs ORDER BY name", [], (err, rows) => {
                if (err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('start-new-game', async (event, { clubId }) => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath);
        return new Promise((resolve, reject) => {
            db.run("UPDATE game_state SET player_club_id = ? WHERE id = 1", [clubId], (err) => {
                if (err) reject(err.message); else resolve({ success: true });
                db.close();
            });
        });
    });


    
    ipcMain.handle('get-game-state', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            db.get("SELECT current_date FROM game_state WHERE id = 1", (err, row) => {
                if (err) reject(err.message); else resolve(row);
                db.close();
            });
        });

        
    });
}

module.exports = { registerGameSetupHandlers };