const currentDateDisplay = document.getElementById('current-date-display');
const btnContinue = document.getElementById('btn-continue');
const matchdayView = document.getElementById('matchday-view');
const matchupContainer = document.getElementById('matchup-container');
const btnPlayMatchdayGame = document.getElementById('btn-play-matchday-game');
const matchdayResultContainer = document.getElementById('matchday-result-container');

let gameState = {
    currentDate: null,
    nextMatch: null,
};

async function updateDateDisplay() {
    const date = new Date(gameState.currentDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    currentDateDisplay.textContent = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export async function loadInitialGameState() {
    const state = await window.api.getGameState();
    gameState.currentDate = state.current_date;
    await updateDateDisplay();
}

export function initGameLoop(showView, refreshData) {
    btnContinue.addEventListener('click', async () => {
        btnContinue.disabled = true;
        btnContinue.textContent = 'Avançando...';
        
        const newState = await window.api.advanceTime();
        gameState.currentDate = newState.newDate;
        gameState.nextMatch = newState.nextMatch;
        await updateDateDisplay();
        await refreshData.finances();

        if (gameState.nextMatch) {
            matchupContainer.innerHTML = `${newState.nextMatch.home_name} <span style="color: #777;">vs</span> ${newState.nextMatch.away_name}`;
            matchdayResultContainer.innerHTML = '';
            btnPlayMatchdayGame.disabled = false;
            showView('matchday');
        } else {
            btnContinue.disabled = false;
            btnContinue.textContent = 'Continuar';
        }
    });

    btnPlayMatchdayGame.addEventListener('click', async () => {
        btnPlayMatchdayGame.disabled = true;
        matchdayResultContainer.innerHTML = 'Simulando...';
        
        const { id, home_club_id, away_club_id, home_name, away_name } = gameState.nextMatch;
        
        try {
            const result = await window.api.runMatch(id, home_club_id, away_club_id);
            matchdayResultContainer.innerHTML = `<div style="font-size: 2.5em; font-weight: bold;">${home_name} ${result.home_goals} x ${result.away_goals} ${away_name}</div>`;
            gameState.nextMatch = null;
            
            await refreshData.fixtures();
            await refreshData.leagueTable();
            
            setTimeout(() => {
                showView('calendar');
                btnContinue.disabled = false;
                btnContinue.textContent = 'Continuar';
            }, 2000);

        } catch(error) {
            matchdayResultContainer.innerHTML = `<pre style="color: red;">Erro:\n${error}</pre>`;
            btnContinue.disabled = false;
            btnContinue.textContent = 'Continuar';
        }
    });
}