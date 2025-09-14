import { currentFormation, startingLineup, bench } from './squadAndTacticsView.js';

let gameState = { currentDate: null, nextMatch: null };
let matchState = {
    simulationResult: null,
    narrationTimeout: null,
    currentEventIndex: 0,
    isPaused: false,
    homeGoals: 0,
    awayGoals: 0,
    homeSubsMade: 0,
    awaySubsMade: 0,
    userSubstitutions: []
};

async function updateDateDisplay() {
    const currentDateDisplay = document.getElementById('current-date-display');
    const date = new Date(gameState.currentDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    currentDateDisplay.textContent = date.toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

export async function setInitialGameState(initialState) {
    if (initialState && initialState.current_date) {
        gameState.currentDate = initialState.current_date;
        await updateDateDisplay();
    }
}

export function initGameLoop(showView, refreshData) {
    const btnContinue = document.getElementById('btn-continue');
    const matchupContainer = document.getElementById('matchup-container');
    const btnPlayMatchdayGame = document.getElementById('btn-play-matchday-game');
    const btnFinishMatchday = document.getElementById('btn-finish-matchday');
    const commentaryBox = document.getElementById('matchday-commentary');
    const scoreboard = document.getElementById('matchday-scoreboard');
    const speedControls = document.getElementById('matchday-speed-controls');
    const matchTimer = document.getElementById('match-timer');
    const squadsContainer = document.getElementById('match-squads-container');
    const homeSquadDisplay = document.getElementById('home-squad-display');
    const awaySquadDisplay = document.getElementById('away-squad-display');
    const benchContainer = document.getElementById('bench-container');
    const homeBenchDisplay = document.getElementById('home-bench-display');
    const awayBenchDisplay = document.getElementById('away-bench-display');

    const subModal = document.getElementById('substitution-modal');
    const btnPauseMatch = document.getElementById('btn-pause-match');
    const btnMakeSub = document.getElementById('btn-make-sub');
    const selectPlayerOut = document.getElementById('select-player-out');
    const selectPlayerIn = document.getElementById('select-player-in');
    const btnConfirmSub = document.getElementById('btn-confirm-sub');
    const closeSubModalBtn = document.getElementById('close-sub-modal');

    btnContinue.addEventListener('click', async () => {
        btnContinue.disabled = true;
        btnContinue.textContent = 'Avançando...';
        try {
            const newState = await window.api.advanceTime(gameState.currentDate);
            gameState.currentDate = newState.newDate;
            await updateDateDisplay();
            await refreshData.squad();
            await refreshData.finances();
            if (newState && newState.nextMatch) {
                gameState.nextMatch = newState.nextMatch;
                matchupContainer.innerHTML = `${newState.nextMatch.home_name} <span style="color: #777;">vs</span> ${newState.nextMatch.away_name}`;
                btnPlayMatchdayGame.style.display = 'block';
                btnFinishMatchday.style.display = 'none';
                showView('matchday');
            } else {
                btnContinue.disabled = false;
                btnContinue.textContent = 'Continuar';
            }
        } catch (error) {
            console.error("Ocorreu um erro ao tentar avançar o dia:", error);
            btnContinue.textContent = 'ERRO!';
        }
    });

    function renderSquad(displayElement, teamName, lineup, isBench = false) {
        let html = `<h3>${isBench ? 'Reservas' : teamName}</h3>`;
        lineup.forEach(player => {
            html += `
                <div class="player-line" id="player-${player.id}">
                    <div class="player-info">
                        <span>${player.name.split(' ').slice(0, 2).join(' ')} (${player.position.slice(0,3)})</span>
                        <span class="player-goals"></span>
                    </div>
                    <div class="player-stamina-info">
                        <span class="stamina-percentage">100%</span>
                        <div class="stamina-bar-container">
                            <div class="stamina-bar" style="width: 100%;"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        displayElement.innerHTML = html;
    }

    function narrateEvent(eventIndex) {
        matchState.currentEventIndex = eventIndex;
        if (eventIndex >= matchState.simulationResult.events.length) {
            speedControls.style.display = 'none';
            btnPauseMatch.style.display = 'none';
            btnMakeSub.style.display = 'none';
            btnFinishMatchday.style.display = 'block';
            refreshData.fixtures();
            refreshData.leagueTable();
            return;
        }

        const event = matchState.simulationResult.events[eventIndex];
        const currentSpeed = document.querySelector('input[name="speed"]:checked').value;
        matchTimer.textContent = `${String(event.minute).padStart(2, '0')}:00`;

        const p = document.createElement('p');
        let eventText = `(${event.minute}') ${event.text}`;

        if (event.card === 'yellow') {
            p.style.color = '#e5c07b';
            eventText = `🟨 ${eventText}`;
        } else if (event.card === 'red') {
            p.style.color = '#e06c75';
            p.style.fontWeight = 'bold';
            eventText = `🟥 ${eventText}`;
        } else if (event.injury) {
            p.style.color = '#e06c75';
            eventText = `✚ ${eventText}`;
        }

        if (event.scorer_id) {
            p.style.color = '#98c379';
            p.style.fontWeight = 'bold';
            if (event.team === 'home') matchState.homeGoals++;
            else matchState.awayGoals++;
            const { home_name, away_name } = gameState.nextMatch;
            scoreboard.textContent = `${home_name} ${matchState.homeGoals} x ${matchState.awayGoals} ${away_name}`;
            const scorerLine = document.querySelector(`#player-${event.scorer_id} .player-goals`);
            if (scorerLine) scorerLine.innerHTML += '⚽';
        }

        p.textContent = eventText;
        commentaryBox.appendChild(p);
        commentaryBox.scrollTop = commentaryBox.scrollHeight;

        if (event.player_states) {
            for (const [playerId, stamina] of Object.entries(event.player_states)) {
                const staminaBar = document.querySelector(`#player-${playerId} .stamina-bar`);
                const staminaText = document.querySelector(`#player-${playerId} .stamina-percentage`);
                if (staminaBar && staminaText) {
                    const staminaValue = Math.round(stamina);
                    staminaBar.style.width = `${Math.max(0, staminaValue)}%`;
                    staminaText.textContent = `${staminaValue}%`;
                    if (stamina < 30) staminaBar.style.backgroundColor = '#e06c75';
                    else if (stamina < 60) staminaBar.style.backgroundColor = '#e5c07b';
                    else staminaBar.style.backgroundColor = '#98c379';
                }
            }
        }
        
        if (!matchState.isPaused) {
            matchState.narrationTimeout = setTimeout(() => narrateEvent(eventIndex + 1), currentSpeed);
        }
    }

    async function startMatchSimulation() {
        btnPlayMatchdayGame.style.display = 'none';
        [speedControls, commentaryBox, scoreboard, matchTimer, squadsContainer, benchContainer, btnPauseMatch].forEach(el => el.style.display = 'block');
        btnMakeSub.style.display = 'none';

        const { id, home_club_id, away_club_id, home_name, away_name } = gameState.nextMatch;
        const lineupIsComplete = startingLineup.every(player => player !== null);
        if (!lineupIsComplete) {
            alert("Você precisa escalar 11 jogadores antes de iniciar a partida!");
            btnPlayMatchdayGame.style.display = 'block';
            [speedControls, commentaryBox, scoreboard, matchTimer, squadsContainer, benchContainer, btnPauseMatch].forEach(el => el.style.display = 'none');
            return;
        }

        const lineupPlayerIds = startingLineup.map(p => p.id);
        const benchPlayerIds = bench.map(p => p.id);

        try {
            const result = await window.api.runMatch(id, home_club_id, away_club_id, currentFormation, lineupPlayerIds, benchPlayerIds, matchState.userSubstitutions);
            matchState.simulationResult = result;
            
            matchState.homeGoals = 0;
            matchState.awayGoals = 0;
            scoreboard.textContent = `${home_name} 0 x 0 ${away_name}`;
            commentaryBox.innerHTML = '';
            matchTimer.textContent = "00:00";

            renderSquad(homeSquadDisplay, home_name, result.home_lineup);
            renderSquad(awaySquadDisplay, away_name, result.away_lineup);
            
            const playerClubId = await window.api.getGameState().then(s => s.player_club_id);
            const myTeamIsHome = gameState.nextMatch.home_club_id === playerClubId;
            const homeBench = myTeamIsHome ? bench.filter(p => !p.is_injured && !p.is_suspended) : [];
            const awayBench = !myTeamIsHome ? bench.filter(p => !p.is_injured && !p.is_suspended) : [];
            renderSquad(homeBenchDisplay, "", homeBench, true);
            renderSquad(awayBenchDisplay, "", awayBench, true);
            
            narrateEvent(0);
        } catch(error) {
            commentaryBox.innerHTML = `<p style="color: #e06c75;">Erro: ${error.message}</p>`;
        }
    }

    btnPlayMatchdayGame.addEventListener('click', () => {
        matchState = { ...matchState, userSubstitutions: [], homeSubsMade: 0, isPaused: false };
        startMatchSimulation();
    });
    
    btnPauseMatch.addEventListener('click', () => {
        if (matchState.isPaused) {
            matchState.isPaused = false;
            btnPauseMatch.textContent = 'Pausar';
            btnMakeSub.style.display = 'none';
            narrateEvent(matchState.currentEventIndex);
        } else {
            clearTimeout(matchState.narrationTimeout);
            matchState.isPaused = true;
            btnPauseMatch.textContent = 'Retomar';
            if (matchState.homeSubsMade < 3) {
                 btnMakeSub.style.display = 'inline-block';
            }
        }
    });

    btnMakeSub.addEventListener('click', () => {
        const currentLineup = matchState.simulationResult.home_lineup.length > 11 ? matchState.simulationResult.home_lineup.slice(0, 11) : matchState.simulationResult.home_lineup;
        const currentBench = bench.filter(benchPlayer => !currentLineup.some(lineupPlayer => lineupPlayer.id === benchPlayer.id));

        selectPlayerOut.innerHTML = currentLineup.map(p => `<option value="${p.id}">${p.name} (${p.position})</option>`).join('');
        selectPlayerIn.innerHTML = currentBench.map(p => `<option value="${p.id}">${p.name} (${p.position})</option>`).join('');
        subModal.style.display = 'block';
    });

    closeSubModalBtn.onclick = () => subModal.style.display = 'none';

    btnConfirmSub.addEventListener('click', async () => {
        const playerOutId = parseInt(selectPlayerOut.value);
        const playerInId = parseInt(selectPlayerIn.value);
        const minute = parseInt(matchTimer.textContent.split(':')[0]);

        matchState.userSubstitutions.push({ minute, out: playerOutId, in: playerInId });
        matchState.homeSubsMade++;
        
        clearTimeout(matchState.narrationTimeout);
        await startMatchSimulation();

        subModal.style.display = 'none';
        btnPauseMatch.textContent = 'Pausar';
        btnMakeSub.style.display = 'none';
        matchState.isPaused = false;
    });

    btnFinishMatchday.addEventListener('click', async () => {
        await refreshData.fixtures();
        showView('calendar');
        btnContinue.disabled = false;
        btnContinue.textContent = 'Continuar';
        [commentaryBox, scoreboard, btnFinishMatchday, matchTimer, squadsContainer, speedControls, benchContainer, btnPauseMatch].forEach(el => el.style.display = 'none');
    });
}