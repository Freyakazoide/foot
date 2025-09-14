const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util'); // Adicione se não tiver

const dbPath = path.join(__dirname, '../', 'foot.db');

function registerDataHandlers() { // Não recebe mais 'db'
    ipcMain.handle('get-players', async () => {

        return new Promise((resolve, reject) => {
            db.get("SELECT player_club_id FROM game_state WHERE id = 1", (err, state) => {
                if (err || !state || !state.player_club_id) return reject("Game state or player club not found");
                const sql = `SELECT id, name, position, age, wage, contract_expires, current_ability, potential_ability FROM players WHERE club_id = ? ORDER BY position`;
                db.all(sql, [state.player_club_id], (err, rows) => {
                    if (err) reject(err.message); else resolve(rows);
                    db.close();
                });
            });
        });
    });

    ipcMain.handle('get-league-table', async () => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT lt.*, c.name AS club_name FROM league_tables lt JOIN clubs c ON lt.club_id = c.id ORDER BY lt.points DESC, lt.goal_difference DESC, lt.goals_for DESC`;
            db.all(sql, [], (err, rows) => {
                if(err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('get-fixtures', async () => {
        return new Promise((resolve, reject) => {
            const sql = ` SELECT f.id, f.round, f.date, c1.name AS home_team, c2.name AS away_team, f.home_goals, f.away_goals, f.is_played FROM fixtures f JOIN clubs c1 ON f.home_club_id = c1.id JOIN clubs c2 ON f.away_club_id = c2.id ORDER BY f.round, f.id `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('get-finance-data', async () => {
        return new Promise((resolve, reject) => {
             db.get("SELECT player_club_id FROM game_state WHERE id = 1", (err, state) => {
                if (err || !state) return reject("Game state not found");
                const playerClubId = state.player_club_id;
                const financeData = {};
                db.get("SELECT balance FROM clubs WHERE id = ?", [playerClubId], (err, clubRow) => {
                    if (err) return reject(err.message);
                    financeData.balance = clubRow ? clubRow.balance : 0;
                    db.get("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [playerClubId], (err, wageRow) => {
                        if (err) return reject(err.message);
                        financeData.totalWageBill = wageRow.total_wages || 0;
                        resolve(financeData);
                        db.close();
                    });
                });
            });
        });
    });

ipcMain.handle('get-my-fixtures', async () => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    const dbAll = util.promisify(db.all.bind(db));
    const dbGet = util.promisify(db.get.bind(db));
    try {
        // Agora também buscamos o player_club_id
        const state = await dbGet("SELECT player_club_id, current_date FROM game_state WHERE id = 1");
        if (!state || !state.player_club_id) {
            throw new Error("Estado do jogo ou time do jogador não encontrado.");
        }
        

        const playerClub = await dbGet("SELECT name FROM clubs WHERE id = ?", [state.player_club_id]);

        const sql = `
            SELECT f.id, f.round, f.date, 
                   f.home_club_id, f.away_club_id, -- Pegamos os IDs
                   c1.name AS home_team, c2.name AS away_team, 
                   f.home_goals, f.away_goals, f.is_played
            FROM fixtures f
            JOIN clubs c1 ON f.home_club_id = c1.id
            JOIN clubs c2 ON f.away_club_id = c2.id
            WHERE f.home_club_id = ? OR f.away_club_id = ?
            ORDER BY f.date`;
            
        const fixtures = await dbAll(sql, [state.player_club_id, state.player_club_id]);
        
        // Retornamos um objeto com todas as informações necessárias
        return {
            fixtures: fixtures,
            currentDate: state.current_date,
            playerClubId: state.player_club_id,
            playerClubName: playerClub.name
        };
    } finally {
        db.close();
    }
});
}

module.exports = { registerDataHandlers };