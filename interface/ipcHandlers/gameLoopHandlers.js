const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const { spawn } = require('child_process');

const dbPath = path.join(__dirname, '../', 'foot.db');

function registerGameLoopHandlers() {

    ipcMain.handle('advance-time', () => {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                    console.error("Erro CRÍTICO ao abrir o banco de dados:", err.message);
                    return reject(err);
                }
            });

            db.serialize(() => {
                db.get("SELECT current_date, player_club_id FROM game_state WHERE id = 1", [], (err, state) => {
                    if (err) {
                        db.close();
                        return reject(err);
                    }
                    if (!state) {
                        db.close();
                        return reject(new Error("Estado do jogo não encontrado."));
                    }

                    const utcDate = new Date(`${state.current_date}T00:00:00Z`);
                    utcDate.setUTCDate(utcDate.getUTCDate() + 1);
                    const nextDateStr = utcDate.toISOString().split('T')[0];

                    db.run("UPDATE game_state SET current_date = ? WHERE id = 1", [nextDateStr], function(err) {
                        if (err) {
                            db.close();
                            return reject(err);
                        }
                        if (this.changes === 0) {
                            db.close();
                            return reject(new Error("Falha Crítica: O UPDATE no banco de dados não alterou nenhuma linha."));
                        }

                        const findMatchSql = `
                            SELECT f.id, f.home_club_id, f.away_club_id, c1.name as home_name, c2.name as away_name
                            FROM fixtures f
                            JOIN clubs c1 ON f.home_club_id = c1.id
                            JOIN clubs c2 ON f.away_club_id = c2.id
                            WHERE f.date = ? AND (f.home_club_id = ? OR f.away_club_id = ?) AND f.is_played = 0
                            LIMIT 1`;
                        
                        db.get(findMatchSql, [nextDateStr, state.player_club_id, state.player_club_id], (err, match) => {
                            if (err) {
                                db.close();
                                return reject(err);
                            }
                            
                            db.close((err) => {
                                if (err) return reject(err);
                                resolve({ newDate: nextDateStr, nextMatch: match || null });
                            });
                        });
                    });
                });
            });
        });
    });

    ipcMain.handle('run-match', async (event, { fixtureId, homeId, awayId, formation, lineup }) => {
        const db = new sqlite3.Database(dbPath);
        try {
            const playerMatchResult = await simulateAndSaveMatch(db, { id: fixtureId, home_club_id: homeId, away_club_id: awayId, formation: formation, lineup: lineup });
            const fixtureData = await util.promisify(db.get.bind(db))("SELECT round FROM fixtures WHERE id = ?", [fixtureId]);
            const currentRound = fixtureData.round;
            const otherFixtures = await util.promisify(db.all.bind(db))("SELECT id, home_club_id, away_club_id FROM fixtures WHERE round = ? AND is_played = 0", [currentRound]);
            for (const fixture of otherFixtures) {
                await simulateAndSaveMatch(db, { id: fixture.id, home_club_id: fixture.home_club_id, away_club_id: fixture.away_club_id, formation: '442' });
            }
            return playerMatchResult;
        } catch (e) {
            console.error('Erro ao executar a rodada:', e.message);
            throw e;
        } finally {
            db.close();
        }
    });
}

async function simulateAndSaveMatch(db, fixture) {
    const dbRun = util.promisify(db.run.bind(db));
    const dbAll = util.promisify(db.all.bind(db));
    const dbGet = util.promisify(db.get.bind(db));
    const homeSquad = await dbAll('SELECT * FROM players WHERE club_id = ?', [fixture.home_club_id]);
    const awaySquad = await dbAll('SELECT * FROM players WHERE club_id = ?', [fixture.away_club_id]);
    const gameState = await dbGet('SELECT player_club_id FROM game_state WHERE id = 1');
    const playerClubId = gameState.player_club_id;
    let playerTeamSide = null;
    if (fixture.lineup) {
        if (playerClubId === fixture.home_club_id) { playerTeamSide = 'home'; } 
        else if (playerClubId === fixture.away_club_id) { playerTeamSide = 'away'; }
    }
    const scriptPath = path.join(__dirname, '../', 'run_match.py');
    const pythonProcess = spawn('python', ['-X', 'utf8', scriptPath]);
    const matchData = { home_squad: homeSquad, away_squad: awaySquad, formation: fixture.formation, lineup: fixture.lineup || null, player_team: playerTeamSide };
    pythonProcess.stdin.write(JSON.stringify(matchData));
    pythonProcess.stdin.end();
    const resultJson = await new Promise((resolve, reject) => {
        let stdout = ''; let stderr = '';
        pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { console.error(`[run_match.py DEBUG]: ${data.toString()}`); stderr += data.toString(); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr));
            if (stdout.trim() === '') return reject(new Error('O script Python não retornou nenhum resultado.'));
            resolve(stdout);
        });
    });
    try {
        const result = JSON.parse(resultJson);
        await dbRun(`UPDATE fixtures SET home_goals = ?, away_goals = ?, is_played = 1 WHERE id = ?`, [result.home_goals, result.away_goals, fixture.id]);
        let homeUpdate, awayUpdate;
        if (result.home_goals > result.away_goals) {
            homeUpdate = `played = played + 1, wins = wins + 1, points = points + 3, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}, goal_difference = goal_difference + ${result.home_goals - result.away_goals}`;
            awayUpdate = `played = played + 1, losses = losses + 1, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}, goal_difference = goal_difference + ${result.away_goals - result.home_goals}`;
        } else if (result.away_goals > result.home_goals) {
            homeUpdate = `played = played + 1, losses = losses + 1, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}, goal_difference = goal_difference + ${result.home_goals - result.away_goals}`;
            awayUpdate = `played = played + 1, wins = wins + 1, points = points + 3, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}, goal_difference = goal_difference + ${result.away_goals - result.home_goals}`;
        } else {
            homeUpdate = `played = played + 1, draws = draws + 1, points = points + 1, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}`;
            awayUpdate = `played = played + 1, draws = draws + 1, points = points + 1, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}`;
        }
        await dbRun(`UPDATE league_tables SET ${homeUpdate} WHERE club_id = ?`, [fixture.home_club_id]);
        await dbRun(`UPDATE league_tables SET ${awayUpdate} WHERE club_id = ?`, [fixture.away_club_id]);
        return result;
    } catch (e) {
        console.error("Erro ao analisar o JSON do script Python. Saída recebida:", resultJson);
        throw e;
    }
}

module.exports = { registerGameLoopHandlers };