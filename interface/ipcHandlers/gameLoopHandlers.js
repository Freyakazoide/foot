const { ipcMain } = require('electron');
const path = require('path');
const util = require('util');
const { spawn } = require('child_process');

const dbPath = path.join(__dirname, '../', 'foot.db');
let lastTrainingReport = null;

function runPythonScript(scriptName, dbPathArg) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../', scriptName);
        const pythonProcess = spawn('python', ['-X', 'utf8', scriptPath, '--db_path', dbPathArg]);
        let stdout = '';
        pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        pythonProcess.stderr.on('data', (data) => console.error(`[${scriptName} stderr]: ${data.toString().trim()}`));
        pythonProcess.on('close', (code) => {
            if (code !== 0) return reject(new Error(`Script ${scriptName} finalizado com código ${code}`));
            resolve(stdout);
        });
    });
}

function registerGameLoopHandlers(db) {
    const dbGet = util.promisify(db.get.bind(db));
    const dbAll = util.promisify(db.all.bind(db));
    const dbRun = util.promisify(db.run.bind(db));

    async function handleEndOfMonthEvents() {
        // ... (esta função permanece a mesma)
        try {
            console.log(`[EVENTOS] Processando eventos de fim de mês.`);
            const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
            if (!state) throw new Error("Game state not found for monthly events.");

            const wageRow = await dbGet("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [state.player_club_id]);
            const totalWages = wageRow ? wageRow.total_wages : 0;
            if (totalWages > 0) {
                await dbRun("UPDATE clubs SET balance = balance - ? WHERE id = ?", [totalWages, state.player_club_id]);
                console.log(`[FINANÇAS] ${totalWages.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em salários foram pagos.`);
            }

            const reportJson = await runPythonScript('update_player_development.py', dbPath);
            lastTrainingReport = JSON.parse(reportJson);
            console.log('[TREINO] Relatório de treino mensal recebido e armazenado.');
        } catch (err) {
            console.error("[ERRO MENSAL] Falha ao processar eventos de fim de mês:", err);
        }
    }

    async function simulateAndSaveMatch(fixture) {
        // ... (a chamada para o script python permanece a mesma)
        const homeSquad = await dbAll('SELECT * FROM players WHERE club_id = ?', [fixture.home_club_id]);
        const awaySquad = await dbAll('SELECT * FROM players WHERE club_id = ?', [fixture.away_club_id]);
        const gameState = await dbGet('SELECT player_club_id, current_date FROM game_state WHERE id = 1');
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
            let stdout = '', stderr = '';
            pythonProcess.stdout.on('data', (data) => { stdout += data.toString(); });
            pythonProcess.stderr.on('data', (data) => { console.error(`[run_match.py DEBUG]: ${data.toString()}`); stderr += data.toString(); });
            pythonProcess.on('close', (code) => {
                if (code !== 0) return reject(new Error(stderr));
                if (stdout.trim() === '') return reject(new Error('O script Python não retornou nenhum resultado.'));
                resolve(stdout);
            });
        });
        
        const result = JSON.parse(resultJson);
        await dbRun(`UPDATE fixtures SET home_goals = ?, away_goals = ?, is_played = 1 WHERE id = ?`, [result.home_goals, result.away_goals, fixture.id]);
        
        // --- MUDANÇA: PROCESSAMENTO DE LESÕES E CARTÕES PÓS-JOGO ---
        if (result.injuries && result.injuries.length > 0) {
            for (const injury of result.injuries) {
                const currentDate = new Date(gameState.current_date);
                currentDate.setDate(currentDate.getDate() + injury.days);
                const returnDate = currentDate.toISOString().split('T')[0];
                await dbRun("UPDATE players SET is_injured = 1, injury_return_date = ? WHERE id = ?", [returnDate, injury.player_id]);
            }
        }

        if (result.red_cards && result.red_cards.length > 0) {
            for (const playerId of result.red_cards) {
                // Suspende por 1 jogo (na prática, 3 dias para garantir que passe a próxima data de jogo)
                await dbRun("UPDATE players SET is_suspended = 1 WHERE id = ?", [playerId]);
            }
        }

        if (result.yellow_cards && result.yellow_cards.length > 0) {
            for (const playerId of result.yellow_cards) {
                await dbRun("UPDATE players SET yellow_cards = yellow_cards + 1 WHERE id = ?", [playerId]);
                const player = await dbGet("SELECT yellow_cards FROM players WHERE id = ?", [playerId]);
                if (player.yellow_cards >= 3) {
                    await dbRun("UPDATE players SET is_suspended = 1, yellow_cards = 0 WHERE id = ?", [playerId]);
                }
            }
        }
        
        // ... (o código para atualizar a tabela da liga permanece o mesmo)
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
    }
    
    ipcMain.handle('advance-time', async (event, { currentDate }) => {
        // --- MUDANÇA: VERIFICAÇÃO DE RETORNO DE LESÃO/SUSPENSÃO ---
        await dbRun("UPDATE players SET is_injured = 0, injury_return_date = NULL WHERE is_injured = 1 AND injury_return_date <= ?", [currentDate]);
        
        // Lógica simples para suspensão: dura apenas uma partida
        const nextMatchForSuspended = await dbGet("SELECT date FROM fixtures WHERE (home_club_id IN (SELECT club_id FROM players WHERE is_suspended = 1) OR away_club_id IN (SELECT club_id FROM players WHERE is_suspended = 1)) AND date > ? ORDER BY date ASC LIMIT 1", [currentDate]);
        if (nextMatchForSuspended) {
            // Se já passamos da data do próximo jogo de um time com jogador suspenso, libera o jogador
             await dbRun("UPDATE players SET is_suspended = 0 WHERE is_suspended = 1");
        }

        const state = await dbGet("SELECT player_club_id FROM game_state WHERE id = 1");
        const previousDate = new Date(`${currentDate}T00:00:00Z`);
        const nextDate = new Date(previousDate);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        if (nextDate.getUTCMonth() !== previousDate.getUTCMonth()) {
            await handleEndOfMonthEvents();
        }

        await dbRun("UPDATE game_state SET current_date = ? WHERE id = 1", [nextDateStr]);
        const findMatchSql = `SELECT f.id, f.home_club_id, f.away_club_id, c1.name as home_name, c2.name as away_name FROM fixtures f JOIN clubs c1 ON f.home_club_id = c1.id JOIN clubs c2 ON f.away_club_id = c2.id WHERE f.date = ? AND (f.home_club_id = ? OR f.away_club_id = ?) AND f.is_played = 0 LIMIT 1`;
        const match = await dbGet(findMatchSql, [nextDateStr, state.player_club_id, state.player_club_id]);
        
        return { newDate: nextDateStr, nextMatch: match || null };
    });

    ipcMain.handle('run-match', async (event, { fixtureId, homeId, awayId, formation, lineup }) => {
        const playerMatchResult = await simulateAndSaveMatch({ id: fixtureId, home_club_id: homeId, away_club_id: awayId, formation: formation, lineup: lineup });
        const fixtureData = await dbGet("SELECT round FROM fixtures WHERE id = ?", [fixtureId]);
        const currentRound = fixtureData.round;
        const otherFixtures = await dbAll("SELECT id, home_club_id, away_club_id FROM fixtures WHERE round = ? AND is_played = 0", [currentRound]);
        for (const fixture of otherFixtures) {
            await simulateAndSaveMatch({ id: fixture.id, home_club_id: fixture.home_club_id, away_club_id: fixture.away_club_id, formation: '442' });
        }
        return playerMatchResult;
    });
}

function registerTrainingReportHandler() {
    ipcMain.handle('get-last-training-report', async () => {
        const report = lastTrainingReport;
        lastTrainingReport = null; 
        return report;
    });
}

module.exports = { registerGameLoopHandlers, registerTrainingReportHandler };