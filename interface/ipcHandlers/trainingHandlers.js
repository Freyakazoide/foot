const { ipcMain } = require('electron');
const util = require('util');

// Não precisamos mais de 'path' e 'sqlite3'

function registerTrainingHandlers(db) { // <-- Aceita a conexão 'db'
    const dbGet = util.promisify(db.get.bind(db));
    const dbRun = util.promisify(db.run.bind(db));

    ipcMain.handle('get-training-focus', async () => {
        const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
        if (!state) throw new Error("Game state not found");
        
        const training = await dbGet("SELECT focus FROM training WHERE club_id = ?", [state.player_club_id]);
        return training ? training.focus : 'geral';
    });

    ipcMain.handle('set-training-focus', async (event, focus) => {
        try {
            const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
            if (!state) throw new Error("Game state not found");

            await dbRun("UPDATE training SET focus = ? WHERE club_id = ?", [focus, state.player_club_id]);
            return { success: true };
        } catch (error) {
            console.error("Failed to set training focus:", error);
            return { success: false, message: error.message };
        }
    });
}

module.exports = { registerTrainingHandlers };