import { showPlayerProfile } from './playerProfileView.js';

const playerList = document.getElementById('player-list');
const pitch = document.getElementById('pitch');
const formationSelect = document.getElementById('formation-select');
const squadHeader = document.getElementById('squad-header');

let currentSquad = [];

const formationCoordinates = {
    '442': [ { top: '92%', left: '50%' }, { top: '75%', left: '15%' }, { top: '78%', left: '35%' }, { top: '78%', left: '65%' }, { top: '75%', left: '85%' }, { top: '50%', left: '18%' }, { top: '55%', left: '40%' }, { top: '55%', left: '60%' }, { top: '50%', left: '82%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }, ],
    '433': [ { top: '92%', left: '50%' }, { top: '75%', left: '15%' }, { top: '78%', left: '35%' }, { top: '78%', left: '65%' }, { top: '75%', left: '85%' }, { top: '60%', left: '50%' }, { top: '45%', left: '32%' }, { top: '45%', left: '68%' }, { top: '25%', left: '15%' }, { top: '20%', left: '50%' }, { top: '25%', left: '85%' }, ],
    '352': [ { top: '92%', left: '50%' }, { top: '78%', left: '25%' }, { top: '80%', left: '50%' }, { top: '78%', left: '75%' }, { top: '50%', left: '10%' }, { top: '55%', left: '35%' }, { top: '60%', left: '50%' }, { top: '55%', left: '65%' }, { top: '50%', left: '90%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }, ]
};

function drawPlayersOnPitch(players, formation) {
    pitch.innerHTML = '';
    const startingXI = players.slice(0, 11);
    const coordinates = formationCoordinates[formation] || formationCoordinates['442'];
    startingXI.forEach((player, index) => {
        const dot = document.createElement('div');
        dot.classList.add('player-dot');
        dot.textContent = player.position.substring(0, 2);
        dot.title = player.name;
        const position = coordinates[index];
        dot.style.top = position.top;
        dot.style.left = position.left;
        pitch.appendChild(dot);
    });
}

export async function loadPlayersData(playerClubName, showView) {
    const players = await window.api.getPlayers();
    currentSquad = players;
    
    squadHeader.textContent = `Elenco - ${playerClubName}`;
    playerList.innerHTML = '';

    if (players && players.length > 0) {
        players.forEach(player => {
            const listItem = document.createElement('li');
            const formattedWage = player.wage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            listItem.textContent = `${player.name} (${player.position}, ${player.age} anos) - ${formattedWage}/mês - Contrato até: ${player.contract_expires}`;
            
            listItem.dataset.playerId = player.id;
            listItem.style.cursor = 'pointer';
            listItem.addEventListener('click', () => showPlayerProfile(player.id, showView, 'squad'));
            
            playerList.appendChild(listItem);
        });
        drawPlayersOnPitch(players, formationSelect.value);
    } else {
        playerList.textContent = "Nenhum jogador encontrado.";
    }
}

export function initTacticsView() {
    formationSelect.addEventListener('change', () => {
        drawPlayersOnPitch(currentSquad, formationSelect.value)
    });
}