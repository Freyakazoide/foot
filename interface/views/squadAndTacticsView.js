import { showPlayerProfile } from './playerProfileView.js';

// Variáveis de estado
export let currentFormation = '442';
export let startingLineup = Array(11).fill(null);
let currentSquad = [];
let showViewCallback = null;

// Elementos da DOM
const pitch = document.getElementById('pitch');
const formationSelect = document.getElementById('formation-select');
const squadHeader = document.getElementById('squad-header');
const playerListSquadView = document.getElementById('player-list');
const playerPoolTacticsView = document.getElementById('tactics-player-pool');
const btnClearLineup = document.getElementById('btn-clear-lineup');
const modal = document.getElementById('player-selection-modal');
const modalPlayerList = document.getElementById('modal-player-list');
const closeModalButton = document.getElementById('close-modal-button');

const formationCoordinates = {
    '442': [ { top: '92%', left: '50%' }, { top: '75%', left: '15%' }, { top: '78%', left: '35%' }, { top: '78%', left: '65%' }, { top: '75%', left: '85%' }, { top: '50%', left: '18%' }, { top: '55%', left: '40%' }, { top: '55%', left: '60%' }, { top: '50%', left: '82%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }, ],
    '433': [ { top: '92%', left: '50%' }, { top: '75%', left: '15%' }, { top: '78%', left: '35%' }, { top: '78%', left: '65%' }, { top: '75%', left: '85%' }, { top: '60%', left: '50%' }, { top: '45%', left: '32%' }, { top: '45%', left: '68%' }, { top: '25%', left: '15%' }, { top: '20%', left: '50%' }, { top: '25%', left: '85%' }, ],
    '352': [ { top: '92%', left: '50%' }, { top: '78%', left: '25%' }, { top: '80%', left: '50%' }, { top: '78%', left: '75%' }, { top: '50%', left: '10%' }, { top: '55%', left: '35%' }, { top: '60%', left: '50%' }, { top: '55%', left: '65%' }, { top: '50%', left: '90%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' }, ]
};

function openPlayerSelectionModal(slotIndex) {
    modalPlayerList.innerHTML = '';
    const availablePlayers = currentSquad.filter(p => !startingLineup.some(pl => pl && pl.id === p.id));

    availablePlayers.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name} (${player.position})`;
        li.onclick = () => {
            startingLineup[slotIndex] = player;
            modal.style.display = 'none';
            drawTaticsScreen();
        };
        modalPlayerList.appendChild(li);
    });

    modal.style.display = 'block';
}

function drawTaticsScreen() {
    pitch.innerHTML = '';
    playerPoolTacticsView.innerHTML = '';

    const coordinates = formationCoordinates[currentFormation] || formationCoordinates['442'];
    const availablePlayers = currentSquad.filter(p => !startingLineup.some(pl => pl && pl.id === p.id));

    coordinates.forEach((position, index) => {
        const slot = document.createElement('div');
        slot.classList.add('player-dot');
        slot.dataset.index = index;

        const playerInSlot = startingLineup[index];
        if (playerInSlot) {
            slot.textContent = playerInSlot.name.split(' ')[0];
            slot.title = `${playerInSlot.name} (Clique para trocar, Duplo clique para remover)`;
            slot.style.backgroundColor = '#4fa8e2';
            slot.draggable = true;
            slot.dataset.playerId = playerInSlot.id;
        } else {
            slot.textContent = `Vazio`;
            slot.style.backgroundColor = '#555';
            slot.title = 'Clique para adicionar um jogador';
        }
        
        slot.style.top = position.top;
        slot.style.left = position.left;
        
        slot.addEventListener('click', () => openPlayerSelectionModal(index));
        slot.addEventListener('dblclick', (e) => {
            e.stopPropagation(); // Evita que o modal abra
            if(startingLineup[index]){
                startingLineup[index] = null;
                drawTaticsScreen();
            }
        });

        // Eventos de Drag and Drop
        slot.addEventListener('dragover', (e) => e.preventDefault());
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragstart', handleDragStart);

        pitch.appendChild(slot);
    });

    availablePlayers.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = `${player.name} (${player.position})`;
        listItem.style.cursor = 'grab';
        listItem.draggable = true;
        listItem.dataset.playerId = player.id;
        listItem.addEventListener('dragstart', handleDragStart);
        playerPoolTacticsView.appendChild(listItem);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
}

function handleDrop(e) {
    e.preventDefault();
    const playerId = parseInt(e.dataTransfer.getData('text/plain'));
    const targetSlotIndex = parseInt(e.currentTarget.dataset.index);

    if (isNaN(playerId) || isNaN(targetSlotIndex)) return;

    const playerToMove = currentSquad.find(p => p.id === playerId);
    if (!playerToMove) return;

    const originalSlotIndex = startingLineup.findIndex(p => p && p.id === playerId);
    if (originalSlotIndex === targetSlotIndex) return;

    const displacedPlayer = startingLineup[targetSlotIndex];
    startingLineup[targetSlotIndex] = playerToMove;

    if (originalSlotIndex !== -1) {
        startingLineup[originalSlotIndex] = displacedPlayer;
    }
    
    drawTaticsScreen();
}

export async function loadPlayersData(playerClubName, showViewFunc) {
    showViewCallback = showViewFunc;
    const players = await window.api.getPlayers();
    currentSquad = players;
    
    squadHeader.textContent = `Elenco - ${playerClubName}`;
    playerListSquadView.innerHTML = '';

    if (players && players.length > 0) {
        players.forEach(player => {
            const listItem = document.createElement('li');
            const formattedWage = player.wage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            listItem.textContent = `${player.name} (${player.position}, ${player.age} anos) | HA: ${player.current_ability} / PA: ${player.potential_ability} | ${formattedWage}/mês`;
            listItem.dataset.playerId = player.id;
            listItem.style.cursor = 'pointer';
            listItem.addEventListener('click', () => showPlayerProfile(player.id, showViewCallback, 'squad'));
            playerListSquadView.appendChild(listItem);
        });
        
        startingLineup = players.slice(0, 11);
        drawTaticsScreen();

    } else {
        playerListSquadView.textContent = "Nenhum jogador encontrado.";
    }
}

export function initTacticsView() {
    formationSelect.addEventListener('change', () => {
        currentFormation = formationSelect.value;
        startingLineup = Array(11).fill(null);
        drawTaticsScreen();
    });

    btnClearLineup.addEventListener('click', () => {
        startingLineup.fill(null);
        drawTaticsScreen();
    });

    closeModalButton.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}