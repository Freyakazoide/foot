const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const { spawn } = require('child_process');

const dbPath = path.join(__dirname, '../', 'foot.db');

let lastTrainingReport = null;


// --- NOVA FUNÇÃO AUXILIAR PARA RODAR SCRIPTS ---
function runPythonScript(scriptName, dbPathArg) {
 return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../', scriptName);
        console.log(`[PYTHON] Executando script: ${scriptName}`);
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

async function handleEndOfMonthEvents(db, playerClubId) {
    try {
        console.log(`[EVENTOS] Processando eventos de fim de mês para o clube ${playerClubId}.`);
        
        const dbGet = util.promisify(db.get.bind(db));
        const dbRun = util.promisify(db.run.bind(db));

        const wageRow = await dbGet("SELECT SUM(wage) AS total_wages FROM players WHERE club_id = ?", [playerClubId]);
        const totalWages = wageRow ? wageRow.total_wages : 0;
        if (totalWages > 0) {
            await dbRun("UPDATE clubs SET balance = balance - ? WHERE id = ?", [totalWages, playerClubId]);
            console.log(`[FINANÇAS] ${totalWages.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em salários foram pagos.`);
        }
        
        await util.promisify(db.close.bind(db))(); 
        
        // Captura o relatório JSON do script
        const reportJson = await runPythonScript('update_player_development.py', dbPath);
        lastTrainingReport = JSON.parse(reportJson); // Armazena o relatório

    } catch (err) {
        console.error("[ERRO MENSAL] Falha ao processar eventos de fim de mês:", err);
        if (db && db.open) {
            db.close();
        }
    }
}


function registerGameLoopHandlers() {
    ipcMain.handle('advance-time', (event, { currentDate }) => {
        // Envolvemos a lógica principal em uma função async para usar await
        return new Promise(async (resolve, reject) => {
            let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
                if (err) return reject(err);
            });

            try {
                const state = await util.promisify(db.get.bind(db))("SELECT player_club_id FROM game_state WHERE id = 1");
                if (!state) throw new Error("Estado do jogo não encontrado.");

                const previousDate = new Date(`${currentDate}T00:00:00Z`);
                const nextDate = new Date(previousDate);
                nextDate.setUTCDate(nextDate.getUTCDate() + 1);
                
                const nextDateStr = nextDate.toISOString().split('T')[0];
                
                // Verifica se o mês mudou
                if (nextDate.getUTCMonth() !== previousDate.getUTCMonth()) {
                    // Passamos a conexão 'db' para a função. Ela será fechada lá dentro.
                    await handleEndOfMonthEvents(db, state.player_club_id);
                    
                    // Reabre a conexão pois a função handleEndOfMonthEvents a fechou
                    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);
                }

                await util.promisify(db.run.bind(db))("UPDATE game_state SET current_date = ? WHERE id = 1", [nextDateStr]);

                const findMatchSql = `
                    SELECT f.id, f.home_club_id, f.away_club_id, c1.name as home_name, c2.name as away_name
                    FROM fixtures f
                    JOIN clubs c1 ON f.home_club_id = c1.id
                    JOIN clubs c2 ON f.away_club_id = c2.id
                    WHERE f.date = ? AND (f.home_club_id = ? OR f.away_club_id = ?) AND f.is_played = 0
                    LIMIT 1`;
                
                const match = await util.promisify(db.get.bind(db))(findMatchSql, [nextDateStr, state.player_club_id, state.player_club_id]);
                
                db.close((err) => {
                    if (err) return reject(err);
                    resolve({ newDate: nextDateStr, nextMatch: match || null });
                });

            } catch (err) {
                if (db && db.open) db.close();
                reject(err);
            }
        });
    });

    // O restante do arquivo (run-match, simulateAndSaveMatch) permanece igual...
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

function registerTrainingReportHandler() {
    ipcMain.handle('get-last-training-report', async () => {
        // Retorna o relatório armazenado e depois o limpa, para que só seja visto uma vez
        const report = lastTrainingReport;
        lastTrainingReport = null; 
        return report;
    });
}

// Exporta a nova função junto com a existente
module.exports = { registerGameLoopHandlers, registerTrainingReportHandler };