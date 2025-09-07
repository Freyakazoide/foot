const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');

const dbPath = path.join(__dirname, '../', 'foot.db');

function registerTrainingHandlers() {
    ipcMain.handle('get-training-focus', async () => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        const dbGet = util.promisify(db.get.bind(db));
        try {
            const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
            if (!state) throw new Error("Game state not found");
            
            const training = await dbGet("SELECT focus FROM training WHERE club_id = ?", [state.player_club_id]);
            return training ? training.focus : 'geral';
        } finally {
            db.close();
        }
    });

    ipcMain.handle('set-training-focus', async (event, focus) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = util.promisify(db.run.bind(db));
        try {
            const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
            if (!state) throw new Error("Game state not found");

            await dbRun("UPDATE training SET focus = ? WHERE club_id = ?", [focus, state.player_club_id]);
            return { success: true };
        } catch (error) {
            console.error("Failed to set training focus:", error);
            return { success: false, message: error.message };
        }
        finally {
            db.close();
        }
    });
}

module.exports = { registerTrainingHandlers };