import { loadFinanceData } from './views/financesView.js';
import { loadPlayersData, initTacticsView } from './views/squadAndTacticsView.js';
import { loadLeagueTable } from './views/competitionView.js';
import { loadFixtures } from './views/calendarView.js';
import { initMarketView } from './views/marketView.js';
import { loadInitialGameState, initGameLoop } from './views/gameLoopView.js';

document.addEventListener('DOMContentLoaded', () => {
    // Dicionário de todas as telas e botões
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

    // Função central para mostrar a tela correta
    function showView(viewId) {
        Object.values(views).forEach(view => view.style.display = 'none');
        Object.values(buttons).forEach(btn => btn?.classList.remove('active'));
        if (views[viewId]) views[viewId].style.display = 'block';
        if (buttons[viewId]) buttons[viewId].classList.add('active');
    }

    // Função que carrega todos os dados do jogo
    async function initialLoad(playerClubName) {
        const refreshData = {
            squad: () => loadPlayersData(playerClubName, showView),
            finances: loadFinanceData,
            fixtures: loadFixtures,
            leagueTable: loadLeagueTable,
        };

        await Promise.all([
            loadInitialGameState(),
            refreshData.squad(),
            refreshData.leagueTable(),
            refreshData.fixtures(),
            refreshData.finances()
        ]);
        
        // As inicializações foram movidas para o clique do botão
        initTacticsView();
        initMarketView(showView, refreshData);
        initGameLoop(showView, refreshData);

        showView('squad'); // Garante que a tela de elenco seja a primeira
    }

    // Lógica da tela de "Novo Jogo"
    async function initializeNewGameScreen() {
        const clubs = await window.api.getAllClubs();
        clubSelection.innerHTML = clubs.map(club => `<option value="${club.id}">${club.name}</option>`).join('');
        
        btnStartGame.onclick = async () => {
            const selectedClubId = clubSelection.value;
            const selectedClubName = clubSelection.options[clubSelection.selectedIndex].text;
            
            await window.api.startNewGame(selectedClubId);
            
            views.start.style.display = 'none';
            mainGameInterface.style.display = 'flex';
            
            // A inicialização agora ocorre aqui, com o nome do clube correto
            await initialLoad(selectedClubName); 
        };

        btnGenerateWorld.onclick = async () => {
            btnStartGame.disabled = true;
            btnGenerateWorld.disabled = true;
            btnGenerateWorld.textContent = 'Gerando...';

            const response = await window.api.generateNewWorld();
            if (response.success) {
                await initializeNewGameScreen();
            } else {
                alert(`Erro ao gerar o mundo: ${response.message}`);
            }

            btnStartGame.disabled = false;
            btnGenerateWorld.disabled = false;
            btnGenerateWorld.textContent = 'Gerar Novo Mundo';
        };
    }

    // Event Listeners dos botões de navegação
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

    // Inicia a aplicação
    initializeNewGameScreen();
});