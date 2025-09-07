import { loadFinanceData } from './views/financesView.js';
import { loadPlayersData, initTacticsView } from './views/squadAndTacticsView.js';
import { loadLeagueTable } from './views/competitionView.js';
import { loadFixtures } from './views/calendarView.js';
import { initMarketView } from './views/marketView.js';
import { loadInitialGameState, initGameLoop } from './views/gameLoopView.js';
import { showPlayerProfile } from './views/playerProfileView.js';

document.addEventListener('DOMContentLoaded', () => {
    const views = {
        squad: document.getElementById('squad-view'),
        tactics: document.getElementById('tactics-view'),
        finances: document.getElementById('finances-view'),
        market: document.getElementById('market-view'),
        player_profile: document.getElementById('player-profile-view'),
        negotiation: document.getElementById('negotiation-view'),
        competition: document.getElementById('competition-view'),
        calendar: document.getElementById('calendar-view'),
        matchday: document.getElementById('matchday-view'),
        start: document.getElementById('start-screen-view'),
    };
    const buttons = {
        squad: document.getElementById('btn-squad'),
        tactics: document.getElementById('btn-tactics'),
        finances: document.getElementById('btn-finances'),
        market: document.getElementById('btn-market'),
        competition: document.getElementById('btn-competition'),
        calendar: document.getElementById('btn-calendar'),
    };
    const mainGameInterface = document.getElementById('main-game-interface');
    const clubSelection = document.getElementById('club-selection');
    const btnStartGame = document.getElementById('btn-start-game');
    const btnGenerateWorld = document.getElementById('btn-generate-world');


    function showView(viewId) {
        for (const id in views) {
            if (id !== 'start' && views[id]) {
                views[id].style.display = 'none';
            }
        }
        for (const id in buttons) {
            if (buttons[id]) buttons[id].classList.remove('active');
        }
        if (views[viewId]) {
            views[viewId].style.display = 'block';
        }
        if (buttons[viewId]) {
            buttons[viewId].classList.add('active');
        }
    }
    async function initialLoad() {
        const playerClubName = clubSelection.options[clubSelection.selectedIndex].text;
        const refreshData = {
            squad: () => loadPlayersData(playerClubName, showView),
            finances: loadFinanceData,
            fixtures: loadFixtures,
            leagueTable: loadLeagueTable,
        };
        await loadInitialGameState();
        await refreshData.squad();
        await refreshData.leagueTable();
        await refreshData.fixtures();
        await refreshData.finances();
        initTacticsView();
        initMarketView(showView, refreshData);
        initGameLoop(showView, refreshData);
        showView('squad');
    }
   async function initializeNewGameScreen() {
        const clubs = await window.api.getAllClubs();
        clubSelection.innerHTML = '';
        clubs.forEach(club => { const option = document.createElement('option'); option.value = club.id; option.textContent = club.name; clubSelection.appendChild(option); });
        
        btnStartGame.onclick = async () => { // Alterado para .onclick para evitar múltiplos listeners
            const selectedClubId = clubSelection.value;
            await window.api.startNewGame(selectedClubId);
            views.start.style.display = 'none';
            mainGameInterface.style.display = 'flex';
            initialLoad(); 
        };

        // Adicione este novo listener
        btnGenerateWorld.onclick = async () => { // Alterado para .onclick
            btnStartGame.disabled = true;
            btnGenerateWorld.disabled = true;
            btnGenerateWorld.textContent = 'Gerando...';

            const response = await window.api.generateNewWorld();
            if (response.success) {
                await initializeNewGameScreen(); // Recarrega a lista de clubes
            } else {
                alert(`Erro ao gerar o mundo: ${response.message}`);
            }

            btnStartGame.disabled = false;
            btnGenerateWorld.disabled = false;
            btnGenerateWorld.textContent = 'Gerar Novo Mundo';
        };
    }
    buttons.squad.addEventListener('click', () => showView('squad'));
    buttons.tactics.addEventListener('click', () => showView('tactics'));
    buttons.finances.addEventListener('click', () => showView('finances'));
    buttons.market.addEventListener('click', () => {
        document.getElementById('search-name').value = '';
        document.getElementById('search-results-table').innerHTML = '';
        showView('market');
    });
    buttons.competition.addEventListener('click', () => showView('competition'));
    buttons.calendar.addEventListener('click', () => showView('calendar'));
    initializeNewGameScreen();
});