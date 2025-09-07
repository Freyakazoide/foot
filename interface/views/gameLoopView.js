import { currentFormation, startingLineup } from './squadAndTacticsView.js';

let gameState = { currentDate: null, nextMatch: null };

async function updateDateDisplay() {
    const currentDateDisplay = document.getElementById('current-date-display');
    const date = new Date(gameState.currentDate);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    currentDateDisplay.textContent = date.toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

export async function loadInitialGameState() {
    const state = await window.api.getGameState();
    gameState.currentDate = state.current_date;
    await updateDateDisplay();
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
            btnPlayMatchdayGame.style.display = 'block';
            btnFinishMatchday.style.display = 'none';
            showView('matchday');
        } else {
            btnContinue.disabled = false;
            btnContinue.textContent = 'Continuar';
        }
    });

    function renderSquad(displayElement, teamName, lineup) {
        let html = `<h3>${teamName}</h3>`;
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

    btnPlayMatchdayGame.addEventListener('click', async () => {
        btnPlayMatchdayGame.style.display = 'none';
        [speedControls, commentaryBox, scoreboard, matchTimer, squadsContainer].forEach(el => el.style.display = 'block');
        
        let homeGoals = 0, awayGoals = 0;
        const { id, home_club_id, away_club_id, home_name, away_name } = gameState.nextMatch;

        scoreboard.textContent = `${home_name} ${homeGoals} x ${awayGoals} ${away_name}`;
        commentaryBox.innerHTML = '';
        matchTimer.textContent = "00:00";
        
        try {
const lineupIsComplete = startingLineup.every(player => player !== null);
const lineupPlayerIds = startingLineup.map(p => p.id); // Agora podemos mapear diretamente

    console.log("[gameLoopView] Escalação completa?", lineupIsComplete);
    console.log("[gameLoopView] Array de IDs enviado:", lineupPlayerIds);
    
if (!lineupIsComplete) {
            alert("Você precisa escalar 11 jogadores antes de iniciar a partida!");
            return;
        }

            const result = await window.api.runMatch(id, home_club_id, away_club_id, currentFormation, lineupPlayerIds);
            
            renderSquad(homeSquadDisplay, home_name, result.home_lineup);
            renderSquad(awaySquadDisplay, away_name, result.away_lineup);

            function narrateEvent(eventIndex) {
                if (eventIndex >= result.events.length) {
                    speedControls.style.display = 'none';
                    btnFinishMatchday.style.display = 'block';
                    refreshData.fixtures();
                    refreshData.leagueTable();
                    return;
                }

                const event = result.events[eventIndex];
                const currentSpeed = document.querySelector('input[name="speed"]:checked').value;

                matchTimer.textContent = `${String(event.minute).padStart(2, '0')}:00`;

                const p = document.createElement('p');
                p.textContent = `(${event.minute}') ${event.text}`;
                
                if (event.scorer_id) {
                    p.style.color = '#98c379';
                    p.style.fontWeight = 'bold';

                    if (event.team === 'home') homeGoals++;
                    else awayGoals++;
                    scoreboard.textContent = `${home_name} ${homeGoals} x ${awayGoals} ${away_name}`;

                    const scorerLine = document.querySelector(`#player-${event.scorer_id} .player-goals`);
                    if(scorerLine) scorerLine.innerHTML += '⚽';
                }
                
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
                
                setTimeout(() => narrateEvent(eventIndex + 1), currentSpeed);
            }

            narrateEvent(0);

        } catch(error) {
            commentaryBox.innerHTML = `<p style="color: #e06c75;">Erro: ${error.message}</p>`;
            btnContinue.disabled = false;
        }
    });

    btnFinishMatchday.addEventListener('click', () => {
        showView('calendar');
        btnContinue.disabled = false;
        btnContinue.textContent = 'Continuar';
        [commentaryBox, scoreboard, btnFinishMatchday, matchTimer, squadsContainer, speedControls].forEach(el => el.style.display = 'none');
    });
}