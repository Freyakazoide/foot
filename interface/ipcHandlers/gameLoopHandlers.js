const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');

async function runMonthlyPlayerDevelopment(db, currentDate) {
    return new Promise(async (resolve, reject) => {
        const isJanuary = currentDate.getMonth() === 0;
        if (isJanuary) {
            await new Promise((res, rej) => db.run("UPDATE players SET age = age + 1", [], err => err ? rej(err) : res()));
        }

        const players = await new Promise((res, rej) => db.all("SELECT * FROM players", [], (err, rows) => err ? rej(err) : res(rows)));

        const updates = [];
        const physicalAttrs = ['pace', 'stamina', 'strength'];
        const allAttrs = [...physicalAttrs, 'finishing', 'passing', 'tackling', 'vision', 'positioning', 'determination'];

        for (const player of players) {
            let changed = false;
            if (player.age < 29) {
                const improvementChance = player.potential / 150;
                if (Math.random() < improvementChance && player[allAttrs[0]] < 20) {
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
            db.serialize(() => {
                const stmt = db.prepare(`UPDATE players SET finishing = ?, passing = ?, tackling = ?, vision = ?, positioning = ?, determination = ?, pace = ?, stamina = ?, strength = ? WHERE id = ?`);
                updates.forEach(p => stmt.run(p.finishing, p.passing, p.tackling, p.vision, p.positioning, p.determination, p.pace, p.stamina, p.strength, p.id));
                stmt.finalize(err => err ? reject(err) : resolve());
            });
        } else {
            resolve();
        }
    });
}

function advanceDateAndCheckFixtures(db, currentDate, playerClubId, resolve, reject) {
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = currentDate.toISOString().split('T')[0];
    
    db.run("UPDATE game_state SET current_date = ? WHERE id = 1", [nextDateStr], async (err) => {
        if (err) return reject(err.message);

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
        db.get(sql, [playerClubId, playerClubId], (err, match) => {
            if (err) return reject(err.message);
            resolve({ newDate: nextDateStr, nextMatch: match || null });
            db.close();
        });
    });
}

function registerGameLoopHandlers() {
    ipcMain.handle('advance-time', async () => {
        const dbPath = path.join(__dirname, '../../foot.db');
        const db = new sqlite3.Database(dbPath);
        return new Promise((resolve, reject) => {
            db.get("SELECT current_date, player_club_id FROM game_state WHERE id = 1", (err, state) => {
                if (err || !state) return reject("Game state or player club not found");
                const currentDate = new Date(state.current_date);
                currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
                const dayOfWeek = currentDate.getDay();

                if (dayOfWeek === 1) {
                    db.get("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [state.player_club_id], (err, wageRow) => {
                        const weeklyWages = (wageRow.total_wages || 0) / 4;
                        db.run("UPDATE clubs SET balance = balance - ? WHERE id = ?", [weeklyWages, state.player_club_id], (err) => {
                            if (err) return reject(err.message);
                            advanceDateAndCheckFixtures(db, currentDate, state.player_club_id, resolve, reject);
                        });
                    });
                } else {
                    advanceDateAndCheckFixtures(db, currentDate, state.player_club_id, resolve, reject);
                }
            });
        });
    });

    ipcMain.handle('run-match', async (event, { fixtureId, homeId, awayId }) => {
        const scriptPath = path.join(__dirname, '../../run_match.py');
        const pythonProcess = spawn('python', ['-X', 'utf8', scriptPath, '--home', homeId, '--away', awayId]);
        return new Promise((resolve, reject) => {
            let resultJson = '';
            let error = '';
            pythonProcess.stdout.on('data', (data) => { resultJson += data.toString(); });
            pythonProcess.stderr.on('data', (data) => { error += data.toString(); });
            pythonProcess.on('close', async (code) => {
                if (error) return reject(error);
                try {
                    const result = JSON.parse(resultJson);
                    const dbPath = path.join(__dirname, '../../foot.db');
                    const db = new sqlite3.Database(dbPath);
                    await new Promise((res, rej) => db.run(`UPDATE fixtures SET home_goals = ?, away_goals = ?, is_played = 1 WHERE id = ?`, [result.home_goals, result.away_goals, fixtureId], (err) => err ? rej(err) : res()));
                    const homeTeamData = await new Promise((res, rej) => db.get(`SELECT * FROM league_tables WHERE club_id = ?`, [homeId], (err, row) => err ? rej(err) : res(row)));
                    const awayTeamData = await new Promise((res, rej) => db.get(`SELECT * FROM league_tables WHERE club_id = ?`, [awayId], (err, row) => err ? rej(err) : res(row)));
                    homeTeamData.played++;
                    awayTeamData.played++;
                    homeTeamData.goals_for += result.home_goals;
                    homeTeamData.goals_against += result.away_goals;
                    awayTeamData.goals_for += result.away_goals;
                    awayTeamData.goals_against += result.home_goals;
                    if (result.home_goals > result.away_goals) { homeTeamData.wins++; homeTeamData.points += 3; awayTeamData.losses++; }
                    else if (result.away_goals > result.home_goals) { awayTeamData.wins++; awayTeamData.points += 3; homeTeamData.losses++; }
                    else { homeTeamData.draws++; homeTeamData.points += 1; awayTeamData.draws++; awayTeamData.points += 1; }
                    const updateQuery = `UPDATE league_tables SET played = ?, wins = ?, draws = ?, losses = ?, goals_for = ?, goals_against = ?, goal_difference = ?, points = ? WHERE club_id = ?`;
                    await new Promise((res, rej) => db.run(updateQuery, [homeTeamData.played, homeTeamData.wins, homeTeamData.draws, homeTeamData.losses, homeTeamData.goals_for, homeTeamData.goals_against, homeTeamData.goals_for - homeTeamData.goals_against, homeTeamData.points, homeId], (err) => err ? rej(err) : res()));
                    await new Promise((res, rej) => db.run(updateQuery, [awayTeamData.played, awayTeamData.wins, awayTeamData.draws, awayTeamData.losses, awayTeamData.goals_for, awayTeamData.goals_against, awayTeamData.goals_for - awayTeamData.goals_against, awayTeamData.points, awayId], (err) => err ? rej(err) : res()));
                    db.close();
                    resolve(result);
                } catch (e) { reject(e.message); }
            });
        });
    });
}

module.exports = { registerGameLoopHandlers };