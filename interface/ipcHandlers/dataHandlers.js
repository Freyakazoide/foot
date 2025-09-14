const { ipcMain } = require('electron');
const util = require('util');

// Não precisamos mais do 'path' e 'sqlite3' aqui

function registerDataHandlers(db) { // <-- Recebe a conexão 'db'
    const dbGet = util.promisify(db.get.bind(db));
    const dbAll = util.promisify(db.all.bind(db));

    ipcMain.handle('get-players', async () => {
        const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
        if (!state || !state.player_club_id) {
            throw new Error("Game state or player club not found");
        }
        const sql = `SELECT id, name, position, age, wage, contract_expires, current_ability, potential_ability FROM players WHERE club_id = ? ORDER BY position`;
        return await dbAll(sql, [state.player_club_id]);
    });

    ipcMain.handle('get-league-table', async () => {
        const sql = `SELECT lt.*, c.name AS club_name FROM league_tables lt JOIN clubs c ON lt.club_id = c.id ORDER BY lt.points DESC, lt.goal_difference DESC, lt.goals_for DESC`;
        return await dbAll(sql);
    });

    ipcMain.handle('get-fixtures', async () => {
        const sql = ` SELECT f.id, f.round, f.date, c1.name AS home_team, c2.name AS away_team, f.home_goals, f.away_goals, f.is_played FROM fixtures f JOIN clubs c1 ON f.home_club_id = c1.id JOIN clubs c2 ON f.away_club_id = c2.id ORDER BY f.round, f.id `;
        return await dbAll(sql);
    });

    ipcMain.handle('get-finance-data', async () => {
        const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
        if (!state) throw new Error("Game state not found");

        const clubRow = await dbGet("SELECT balance FROM clubs WHERE id = ?", [state.player_club_id]);
        const wageRow = await dbGet("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [state.player_club_id]);

        return {
            balance: clubRow ? clubRow.balance : 0,
            totalWageBill: wageRow ? wageRow.total_wages : 0
        };
    });

    ipcMain.handle('get-my-fixtures', async () => {
        const state = await dbGet("SELECT player_club_id, current_date FROM game_state WHERE id = 1");
        if (!state || !state.player_club_id) {
            throw new Error("Estado do jogo ou time do jogador não encontrado.");
        }
        
        const playerClub = await dbGet("SELECT name FROM clubs WHERE id = ?", [state.player_club_id]);
        const sql = `
            SELECT f.id, f.round, f.date, 
                   f.home_club_id, f.away_club_id,
                   c1.name AS home_team, c2.name AS away_team, 
                   f.home_goals, f.away_goals, f.is_played
            FROM fixtures f
            JOIN clubs c1 ON f.home_club_id = c1.id
            JOIN clubs c2 ON f.away_club_id = c2.id
            WHERE f.home_club_id = ? OR f.away_club_id = ?
            ORDER BY f.date`;
            
        const fixtures = await dbAll(sql, [state.player_club_id, state.player_club_id]);
        
        return {
            fixtures: fixtures,
            currentDate: state.current_date,
            playerClubId: state.player_club_id,
            playerClubName: playerClub.name
        };
    });
}

module.exports = { registerDataHandlers };