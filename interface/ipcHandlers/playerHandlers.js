const { ipcMain } = require('electron');
const util = require('util');

// Não precisamos mais de 'path' e 'sqlite3'

function registerPlayerHandlers(db) { // <-- Aceita a conexão 'db'
    const dbGet = util.promisify(db.get.bind(db));
    const dbAll = util.promisify(db.all.bind(db));
    const dbRun = util.promisify(db.run.bind(db));

    ipcMain.handle('search-players', async (event, filters) => {
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
        return await dbAll(query, params);
    });

    ipcMain.handle('get-player-details', async (event, { playerId }) => {
        const query = `SELECT p.*, c.name as club_name FROM players p JOIN clubs c ON p.club_id = c.id WHERE p.id = ?`;
        const row = await dbGet(query, [playerId]);
        if (row) {
            row.market_value = row.wage * 120;
        }
        return row;
    });

    ipcMain.handle('make-transfer-offer', async (event, { playerId, offerAmount }) => {
        const player = await dbGet("SELECT name, wage, club_id FROM players WHERE id = ?", [playerId]);
        const gameState = await dbGet("SELECT player_club_id FROM game_state");
        const myClub = await dbGet("SELECT balance FROM clubs WHERE id = ?", [gameState.player_club_id]);

        if (myClub.balance < offerAmount) {
            return { success: false, message: "Você não tem saldo suficiente para esta proposta." };
        }

        const marketValue = player.wage * 120;
        const requiredValue = marketValue * 0.9;
        
        if (offerAmount < requiredValue) {
            return { success: false, message: `Proposta rejeitada! O clube considera o valor muito baixo.` };
        }

        const acceptanceChance = Math.min(0.95, (offerAmount / marketValue) * 0.6);

        if (Math.random() < acceptanceChance) {
            const demandedWage = Math.round((player.wage * (1.1 + Math.random() * 0.3)) / 100) * 100;
            const demandedLength = Math.floor(2 + Math.random() * 3);
            return { 
                success: true, message: `Proposta aceita! Inicie a negociação com ${player.name}.`,
                negotiation: { playerId, playerName: player.name, sellingClubId: player.club_id, transferFee: offerAmount, demandedWage, demandedLength }
            };
        } else {
            return { success: false, message: "Proposta rejeitada! O clube decidiu não vender o jogador no momento." };
        }
    });

    ipcMain.handle('finalize-transfer', async (event, { negotiationDetails }) => {
        try {
            await dbRun("BEGIN TRANSACTION");
            const gameState = await dbGet("SELECT player_club_id, current_date FROM game_state");
            const myClubId = gameState.player_club_id;
            
            await dbRun("UPDATE clubs SET balance = balance - ? WHERE id = ?", [negotiationDetails.transferFee, myClubId]);
            await dbRun("UPDATE clubs SET balance = balance + ? WHERE id = ?", [negotiationDetails.transferFee, negotiationDetails.sellingClubId]);

            const contractEndDate = new Date(gameState.current_date);
            contractEndDate.setFullYear(contractEndDate.getFullYear() + negotiationDetails.demandedLength);
            const contractEndDateStr = contractEndDate.toISOString().split('T')[0];

            await dbRun("UPDATE players SET club_id = ?, wage = ?, contract_expires = ? WHERE id = ?",
                [myClubId, negotiationDetails.demandedWage, contractEndDateStr, negotiationDetails.playerId]
            );

            await dbRun("COMMIT");
            return { success: true, message: `${negotiationDetails.playerName} é o novo reforço do seu time!` };
        } catch (err) {
            await dbRun("ROLLBACK");
            throw err;
        }
    });
}

module.exports = { registerPlayerHandlers };