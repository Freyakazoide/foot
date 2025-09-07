const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function registerDataHandlers() {
    ipcMain.handle('get-players', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            db.get("SELECT player_club_id FROM game_state WHERE id = 1", (err, state) => {
                if (err || !state || !state.player_club_id) return reject("Game state or player club not found");
const sql = `SELECT id, name, position, age, wage, contract_expires FROM players WHERE club_id = ? ORDER BY position`;
                db.all(sql, [state.player_club_id], (err, rows) => {
                    if (err) reject(err.message); else resolve(rows);
                    db.close();
                });
            });
        });
    });

    ipcMain.handle('get-league-table', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            const sql = ` SELECT lt.*, c.name AS club_name FROM league_tables lt JOIN clubs c ON lt.club_id = c.id ORDER BY lt.points DESC, lt.goal_difference DESC, lt.goals_for DESC `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('get-fixtures', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            const sql = ` SELECT f.id, f.round, c1.name AS home_team, c2.name AS away_team, f.home_goals, f.away_goals, f.is_played FROM fixtures f JOIN clubs c1 ON f.home_club_id = c1.id JOIN clubs c2 ON f.away_club_id = c2.id ORDER BY f.round, f.id `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('get-finance-data', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            db.get("SELECT player_club_id FROM game_state WHERE id = 1", (err, state) => {
                if (err || !state || !state.player_club_id) return reject("Game state or player club not found");
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
}

module.exports = { registerDataHandlers };