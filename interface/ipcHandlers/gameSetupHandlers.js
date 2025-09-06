const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function registerGameSetupHandlers() {
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