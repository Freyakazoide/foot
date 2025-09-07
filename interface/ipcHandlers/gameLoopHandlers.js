const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');
const util = require('util');

const dbPath = path.join(__dirname, '../', 'foot.db');

async function simulateAndSaveMatch(db, fixture) {
    const dbRun = util.promisify(db.run.bind(db));

    // 1. Executa o script Python para obter o resultado do jogo
const dbPath = path.join(__dirname, '../../foot.db'); // Pega o caminho do DB
const scriptPath = path.join(__dirname, '../../run_match.py');
const pythonProcess = spawn('python', [
    '-X', 'utf8', 
    scriptPath, 
    '--home', fixture.home_club_id, 
    '--away', fixture.away_club_id, 
    '--db_path', dbPath
]);
    
    const resultJson = await new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { stderr += data.toString(); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) return reject(new Error(stderr));
            resolve(stdout);
        });
    });
    const result = JSON.parse(resultJson);

    // 2. Atualiza a tabela de jogos (fixtures) com o resultado
    await dbRun(`UPDATE fixtures SET home_goals = ?, away_goals = ?, is_played = 1 WHERE id = ?`, [result.home_goals, result.away_goals, fixture.id]);

    // 3. Prepara os dados para a atualização da tabela de classificação (league_tables)
    let homeUpdate, awayUpdate;

    if (result.home_goals > result.away_goals) { // Vitória do time da casa
        homeUpdate = `played = played + 1, wins = wins + 1, points = points + 3, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}, goal_difference = goal_difference + ${result.home_goals - result.away_goals}`;
        awayUpdate = `played = played + 1, losses = losses + 1, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}, goal_difference = goal_difference + ${result.away_goals - result.home_goals}`;
    } else if (result.away_goals > result.home_goals) { // Vitória do time visitante
        homeUpdate = `played = played + 1, losses = losses + 1, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}, goal_difference = goal_difference + ${result.home_goals - result.away_goals}`;
        awayUpdate = `played = played + 1, wins = wins + 1, points = points + 3, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}, goal_difference = goal_difference + ${result.away_goals - result.home_goals}`;
    } else { // Empate
        homeUpdate = `played = played + 1, draws = draws + 1, points = points + 1, goals_for = goals_for + ${result.home_goals}, goals_against = goals_against + ${result.away_goals}`;
        awayUpdate = `played = played + 1, draws = draws + 1, points = points + 1, goals_for = goals_for + ${result.away_goals}, goals_against = goals_against + ${result.home_goals}`;
    }

    // 4. Executa as atualizações na tabela de classificação
    await dbRun(`UPDATE league_tables SET ${homeUpdate} WHERE club_id = ?`, [fixture.home_club_id]);
    await dbRun(`UPDATE league_tables SET ${awayUpdate} WHERE club_id = ?`, [fixture.away_club_id]);

    return result;
}

async function runMonthlyPlayerDevelopment(db, currentDate) {
    const dbAll = util.promisify(db.all.bind(db));
    const dbRun = util.promisify(db.run.bind(db));

    if (currentDate.getMonth() === 0) {
        await dbRun("UPDATE players SET age = age + 1");
    }

    const players = await dbAll("SELECT * FROM players");
    const updates = [];
    const physicalAttrs = ['pace', 'stamina', 'strength'];
    const allAttrs = [...physicalAttrs, 'finishing', 'passing', 'tackling', 'vision', 'positioning', 'determination'];

    for (const player of players) {
        let changed = false;
        if (player.age < 29) {
            const improvementChance = player.potential / 150;
            if (Math.random() < improvementChance) {
                const attrToImprove = allAttrs[Math.floor(Math.random() * allAttrs.length)];
                if (player[attrToImprove] < 20) {
                    player[attrToImprove]++;
                    changed = true;
                }
            }
        } else if (player.age > 30) {
            const declineChance = (player.age - 30) / 40;
            if (Math.random() < declineChance) {
                const attrToDecline = physicalAttrs[Math.floor(Math.random() * physicalAttrs.length)];
                if (player[attrToDecline] > 5) {
                    player[attrToDecline]--;
                    changed = true;
                }
            }
        }
        if (changed) {
            updates.push(player);
        }
    }
    
    if (updates.length > 0) {
        const stmt = db.prepare(`UPDATE players SET finishing = ?, passing = ?, tackling = ?, vision = ?, positioning = ?, determination = ?, pace = ?, stamina = ?, strength = ? WHERE id = ?`);
        updates.forEach(p => stmt.run(p.finishing, p.passing, p.tackling, p.vision, p.positioning, p.determination, p.pace, p.stamina, p.strength, p.id));
        await new Promise((resolve, reject) => stmt.finalize(err => err ? reject(err) : resolve()));
    }
}

function registerGameLoopHandlers() {
    ipcMain.handle('advance-time', async () => {
        const db = new sqlite3.Database(dbPath);
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = util.promisify(db.run.bind(db));

        try {
            const state = await dbGet("SELECT current_date, player_club_id FROM game_state WHERE id = 1");
            if (!state) throw new Error("Estado do jogo não encontrado.");

            const currentDate = new Date(state.current_date);
            currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
            
            currentDate.setDate(currentDate.getDate() + 1);
            const nextDateStr = currentDate.toISOString().split('T')[0];

            if (currentDate.getDay() === 1) { 
                const wageRow = await dbGet("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [state.player_club_id]);
                const weeklyWages = (wageRow.total_wages || 0) / 4;
                await dbRun("UPDATE clubs SET balance = balance - ? WHERE id = ?", [weeklyWages, state.player_club_id]);
            }

            await dbRun("UPDATE game_state SET current_date = ? WHERE id = 1", [nextDateStr]);
            
            if (currentDate.getDate() === 1) {
                await runMonthlyPlayerDevelopment(db, currentDate);
            }

            const sql = `
                SELECT f.id, f.home_club_id, f.away_club_id, c1.name as home_name, c2.name as away_name
                FROM fixtures f
                JOIN clubs c1 ON f.home_club_id = c1.id
                JOIN clubs c2 ON f.away_club_id = c2.id
                WHERE f.round = (SELECT MIN(round) FROM fixtures WHERE is_played = 0) 
                    AND (f.home_club_id = ? OR f.away_club_id = ?) 
                    AND f.is_played = 0 
                LIMIT 1`;
            const match = await dbGet(sql, [state.player_club_id, state.player_club_id]);

            return { newDate: nextDateStr, nextMatch: match || null };

        } catch (error) {
            console.error('Erro ao avançar o tempo:', error);
            throw error;
        } finally {
            db.close();
        }
    });

    ipcMain.handle('run-match', async (event, { fixtureId, homeId, awayId }) => {
        const db = new sqlite3.Database(dbPath);
        
        const dbGet = util.promisify(db.get.bind(db));
        const dbAll = util.promisify(db.all.bind(db));

        try {
            const playerMatchResult = await simulateAndSaveMatch(db, { id: fixtureId, home_club_id: homeId, away_club_id: awayId });
            const fixtureData = await dbGet("SELECT round FROM fixtures WHERE id = ?", [fixtureId]);
            const currentRound = fixtureData.round;
            const otherFixtures = await dbAll("SELECT id, home_club_id, away_club_id FROM fixtures WHERE round = ? AND is_played = 0", [currentRound]);
            
            for (const fixture of otherFixtures) {
                await simulateAndSaveMatch(db, fixture);
            }

            return playerMatchResult;
        } catch (e) {
            console.error('Erro ao executar a rodada:', e);
            throw e;
        } finally {
            db.close();
        }
    });
}

module.exports = { registerGameLoopHandlers };