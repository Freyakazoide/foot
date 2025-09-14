import { loadFinanceData } from './views/financesView.js';
import { loadPlayersData, initTacticsView } from './views/squadAndTacticsView.js';
import { loadLeagueTable } from './views/competitionView.js';
import { loadFixtures } from './views/calendarView.js';
import { initMarketView } from './views/marketView.js';
// Importa a nova função e remove a antiga que não será mais usada aqui
import { setInitialGameState, initGameLoop } from './views/gameLoopView.js'; 
import { initTrainingView } from './views/trainingView.js';
import { loadMyFixtures } from './views/myCalendarView.js';

document.addEventListener('DOMContentLoaded', () => {
    // Dicionário de todas as telas e botões (sem alterações)
    const views = {
        squad: document.getElementById('squad-view'),
        tactics: document.getElementById('tactics-view'),
        training: document.getElementById('training-view'),
        finances: document.getElementById('finances-view'),
        market: document.getElementById('market-view'),
        player_profile: document.getElementById('player-profile-view'),
        negotiation: document.getElementById('negotiation-view'),
        competition: document.getElementById('competition-view'),
        calendar: document.getElementById('calendar-view'),
        myCalendar: document.getElementById('my-calendar-view'),
        matchday: document.getElementById('matchday-view'),
        start: document.getElementById('start-screen-view'),
    };
    const buttons = {
        squad: document.getElementById('btn-squad'),
        tactics: document.getElementById('btn-tactics'),
        training: document.getElementById('btn-training'), 
        finances: document.getElementById('btn-finances'),
        market: document.getElementById('btn-market'),
        competition: document.getElementById('btn-competition'),
        calendar: document.getElementById('btn-calendar'),
        myCalendar: document.getElementById('btn-my-calendar'),
    };
    const mainGameInterface = document.getElementById('main-game-interface');
    const clubSelection = document.getElementById('club-selection');
    const btnStartGame = document.getElementById('btn-start-game');
    const btnGenerateWorld = document.getElementById('btn-generate-world');

    function showView(viewId) {
        Object.values(views).forEach(view => view.style.display = 'none');
        Object.values(buttons).forEach(btn => btn?.classList.remove('active'));
        if (views[viewId]) views[viewId].style.display = 'block';
        if (buttons[viewId]) buttons[viewId].classList.add('active');
    }

    // Função que carrega todos os dados do jogo
    async function initialLoad(playerClubName, initialGameState) {
        console.log(`[RENDERER] initialLoad chamado. Recebeu a data: ${initialGameState.current_date}`);
        await setInitialGameState(initialGameState);

        const refreshData = {
            squad: () => loadPlayersData(playerClubName, showView),
            finances: loadFinanceData,
            fixtures: loadFixtures,
            myFixtures: loadMyFixtures,
            leagueTable: loadLeagueTable,
        };

        // Removemos a chamada antiga 'loadInitialGameState()' que não é mais necessária.
        await Promise.all([
            refreshData.squad(),
            refreshData.leagueTable(),
            refreshData.fixtures(),
            refreshData.myFixtures(),
            refreshData.finances()
        ]);
        
        initTacticsView();
        initMarketView(showView, refreshData);
        initGameLoop(showView, refreshData);
        initTrainingView();

        showView('squad');
    }

    // Lógica da tela de "Novo Jogo" (agora está correta)
    async function initializeNewGameScreen() {
        const clubs = await window.api.getAllClubs();
        const debugDate = await window.api.debugGetCurrentDate();
        console.log(`[RENDERER] Tela inicial carregada. Data atual na DB: ${debugDate.current_date}`);
        
        clubSelection.innerHTML = clubs.map(club => `<option value="${club.id}">${club.name}</option>`).join('');
        
        btnStartGame.onclick = async () => {
            const selectedClubId = clubSelection.value;
            const selectedClubName = clubSelection.options[clubSelection.selectedIndex].text;
            
            console.log("[RENDERER] Botão 'Iniciar Jogo' clicado.");
            const response = await window.api.startNewGame(selectedClubId);
            
            if (response.success) {
                console.log(`[RENDERER] 'startNewGame' retornou sucesso. Data recebida: ${response.gameState.current_date}`);
                views.start.style.display = 'none';
                mainGameInterface.style.display = 'flex';
                await initialLoad(selectedClubName, response.gameState); 
            } else {
                alert("Houve um erro ao iniciar o novo jogo.");
            }
        };

          btnGenerateWorld.onclick = async () => {
            btnStartGame.disabled = true;
            btnGenerateWorld.disabled = true;
            btnGenerateWorld.textContent = 'Gerando...';

            const response = await window.api.generateNewWorld();
            
            if (response.success) {
                window.api.restartApp();
            } else {
                alert(`Erro ao gerar o mundo: ${response.message}`);
                btnStartGame.disabled = false;
                btnGenerateWorld.disabled = false;
                btnGenerateWorld.textContent = 'Gerar Novo Mundo';
            }
        };
    }

    // Event Listeners (sem alterações)
    buttons.squad.addEventListener('click', () => showView('squad'));
    buttons.tactics.addEventListener('click', () => showView('tactics'));
    buttons.training.addEventListener('click', () => showView('training'));
    buttons.finances.addEventListener('click', () => showView('finances'));
    buttons.market.addEventListener('click', () => {
        document.getElementById('search-name').value = '';
        document.getElementById('search-results-table').innerHTML = '';
        showView('market');
    });
    buttons.competition.addEventListener('click', () => showView('competition'));
    buttons.calendar.addEventListener('click', () => showView('calendar'));
    buttons.myCalendar.addEventListener('click', async () => {
        await loadMyFixtures();
        showView('myCalendar');
    });

    initializeNewGameScreen();
});