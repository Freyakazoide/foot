const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// CAMINHO CORRIGIDO: Procura na pasta pai (interface)
const dbPath = path.join(__dirname, '../', 'foot.db');

function registerPlayerHandlers() {
    ipcMain.handle('search-players', async (event, filters) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            let query = `SELECT p.id, p.name, p.age, p.position, p.wage, c.name as club_name FROM players p JOIN clubs c ON p.club_id = c.id WHERE 1=1`;
            const params = [];
            if (filters.name && filters.name.trim() !== '') {
                query += ` AND p.name LIKE ?`;
                params.push(`%${filters.name}%`);
            }
            if (filters.position && filters.position !== 'all') {
                query += ` AND p.position = ?`;
                params.push(filters.position);
            }
            query += ` ORDER BY p.name LIMIT 100`;
            db.all(query, params, (err, rows) => {
                if (err) reject(err.message); else resolve(rows);
                db.close();
            });
        });
    });

    ipcMain.handle('get-player-details', async (event, { playerId }) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
        return new Promise((resolve, reject) => {
            const query = `SELECT p.*, c.name as club_name FROM players p JOIN clubs c ON p.club_id = c.id WHERE p.id = ?`;
            db.get(query, [playerId], (err, row) => {
                if (err) {
                    reject(err.message);
                } else {
                    if (row) {
                        row.market_value = row.wage * 120;
                    }
                    resolve(row);
                }
                db.close();
            });
        });
    });

    ipcMain.handle('make-transfer-offer', async (event, { playerId, offerAmount }) => {
        const db = new sqlite3.Database(dbPath);
        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    const player = await new Promise((res, rej) => db.get("SELECT name, wage, club_id FROM players WHERE id = ?", [playerId], (err, row) => err ? rej(err) : res(row)));
                    const gameState = await new Promise((res, rej) => db.get("SELECT player_club_id FROM game_state", (err, row) => err ? rej(err) : res(row)));
                    const myClub = await new Promise((res, rej) => db.get("SELECT balance FROM clubs WHERE id = ?", [gameState.player_club_id], (err, row) => err ? rej(err) : res(row)));

                    if (myClub.balance < offerAmount) {
                        return resolve({ success: false, message: "Você não tem saldo suficiente para esta proposta." });
                    }

                    const marketValue = player.wage * 120;
                    const requiredValue = marketValue * 0.9;
                    
                    if (offerAmount < requiredValue) {
                        return resolve({ success: false, message: `Proposta rejeitada! O clube considera o valor muito baixo.` });
                    }

                    const acceptanceChance = Math.min(0.95, (offerAmount / marketValue) * 0.6);

                    if (Math.random() < acceptanceChance) {
                        const demandedWage = Math.round((player.wage * (1.1 + Math.random() * 0.3)) / 100) * 100;
                        const demandedLength = Math.floor(2 + Math.random() * 3);
                        
                        resolve({ 
                            success: true, 
                            message: `Proposta aceita! Inicie a negociação com ${player.name}.`,
                            negotiation: {
                                playerId: playerId,
                                playerName: player.name,
                                sellingClubId: player.club_id,
                                transferFee: offerAmount,
                                demandedWage: demandedWage,
                                demandedLength: demandedLength
                            }
                        });
                    } else {
                        resolve({ success: false, message: "Proposta rejeitada! O clube decidiu não vender o jogador no momento." });
                    }
                } catch (err) {
                    reject(err.message);
                } finally {
                    db.close();
                }
            });
        });
    });

    ipcMain.handle('finalize-transfer', async (event, { negotiationDetails }) => {
        const db = new sqlite3.Database(dbPath);
        return new Promise((resolve, reject) => {
            db.serialize(async () => {
                try {
                    const gameState = await new Promise((res, rej) => db.get("SELECT player_club_id, current_date FROM game_state", (err, row) => err ? rej(err) : res(row)));
                    const myClubId = gameState.player_club_id;
                    
                    await new Promise((res, rej) => db.run("UPDATE clubs SET balance = balance - ? WHERE id = ?", [negotiationDetails.transferFee, myClubId], err => err ? rej(err) : res()));
                    await new Promise((res, rej) => db.run("UPDATE clubs SET balance = balance + ? WHERE id = ?", [negotiationDetails.transferFee, negotiationDetails.sellingClubId], err => err ? rej(err) : res()));

                    const contractEndDate = new Date(gameState.current_date);
                    contractEndDate.setFullYear(contractEndDate.getFullYear() + negotiationDetails.demandedLength);
                    const contractEndDateStr = contractEndDate.toISOString().split('T')[0];

                    await new Promise((res, rej) => db.run(
                        "UPDATE players SET club_id = ?, wage = ?, contract_expires = ? WHERE id = ?",
                        [myClubId, negotiationDetails.demandedWage, contractEndDateStr, negotiationDetails.playerId],
                        err => err ? rej(err) : res()
                    ));

                    resolve({ success: true, message: `${negotiationDetails.playerName} é o novo reforço do seu time!` });

                } catch (err) {
                    reject(err.message);
                } finally {
                    db.close();
                }
            });
        });
    });
}

module.exports = { registerPlayerHandlers };