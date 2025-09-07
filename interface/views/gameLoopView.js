// Variáveis de estado do jogo
let gameState = {
    currentDate: null,
    nextMatch: null,
};

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
    // Seleciona todos os elementos que vamos usar
    const btnContinue = document.getElementById('btn-continue');
    const matchupContainer = document.getElementById('matchup-container');
    const btnPlayMatchdayGame = document.getElementById('btn-play-matchday-game');
    const btnFinishMatchday = document.getElementById('btn-finish-matchday');
    const commentaryBox = document.getElementById('matchday-commentary');
    const scoreboard = document.getElementById('matchday-scoreboard');
    const speedControls = document.getElementById('matchday-speed-controls');

    // Lógica para avançar o tempo (sem alterações)
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
            btnPlayMatchdayGame.style.display = 'block'; // Mostra o botão de jogar
            btnFinishMatchday.style.display = 'none'; // Garante que o de finalizar está escondido
            showView('matchday');
        } else {
            btnContinue.disabled = false;
            btnContinue.textContent = 'Continuar';
        }
    });

    // --- NOVA LÓGICA DA PARTIDA ---
    btnPlayMatchdayGame.addEventListener('click', async () => {
        btnPlayMatchdayGame.style.display = 'none'; // Esconde o botão de jogar
        speedControls.style.display = 'block'; // Mostra os controles de velocidade
        commentaryBox.style.display = 'block';
        scoreboard.style.display = 'block';
        
        // Zera o placar e os comentários
        let homeGoals = 0;
        let awayGoals = 0;
        scoreboard.textContent = `${gameState.nextMatch.home_name} ${homeGoals} x ${awayGoals} ${gameState.nextMatch.away_name}`;
        commentaryBox.innerHTML = 'O juiz apita e a bola rola!';

        const { id, home_club_id, away_club_id, home_name, away_name } = gameState.nextMatch;
        
        try {
            const result = await window.api.runMatch(id, home_club_id, away_club_id);
            
            function displayEvents(index) {
                // Pega a velocidade selecionada a cada lance
                const currentSpeed = document.querySelector('input[name="speed"]:checked').value;

                if (index < result.events.length) {
                    const event = result.events[index];
                    const p = document.createElement('p');
                    p.textContent = event;
                    
                    if (event.includes('GOL!')) {
                        // Verifica qual time marcou para atualizar o placar
                        const lastEvent = result.events[index-1]; // O evento de gol vem depois do chute
                        if (lastEvent) {
                           // Esta é uma simplificação, idealmente o python diria qual time marcou
                           // Vamos assumir que a posse era do time certo (o python já faz isso)
                        }
                        // O placar final já vem do python, vamos usá-lo para atualizar
                        if (event.includes(home_name)) homeGoals++;
                        if (event.includes(away_name)) awayGoals++;
                        
                        p.style.color = '#98c379';
                        p.style.fontWeight = 'bold';
                    }

                    // A cada gol, o placar é atualizado no log. Vamos capturar isso.
                    if (event.startsWith('PLACAR:')) {
                        const scoreLine = event.replace('PLACAR: ', ''); // "Casa 2 x 1 Visitante"
                        const parts = scoreLine.split(' ');
                        homeGoals = parseInt(parts[1]);
                        awayGoals = parseInt(parts[4]);
                        scoreboard.textContent = `${home_name} ${homeGoals} x ${awayGoals} ${away_name}`;
                        p.style.display = 'none'; // Não mostra a linha "PLACAR:"
                    }

                    commentaryBox.appendChild(p);
                    commentaryBox.scrollTop = commentaryBox.scrollHeight;
                    
                    setTimeout(() => displayEvents(index + 1), currentSpeed);
                } else {
                    // Fim da narração
                    speedControls.style.display = 'none'; // Esconde os controles
                    btnFinishMatchday.style.display = 'block'; // Mostra o botão de finalizar
                    
                    gameState.nextMatch = null;
                    refreshData.fixtures();
                    refreshData.leagueTable();
                }
            }
            // Começa a narração após um pequeno atraso inicial
            setTimeout(() => displayEvents(0), 500);

        } catch(error) {
            commentaryBox.innerHTML = `<p style="color: #e06c75;">Erro: ${error.message}</p>`;
            btnContinue.disabled = false;
        }
    });

    // Lógica para o novo botão de finalizar
    btnFinishMatchday.addEventListener('click', () => {
        showView('calendar');
        btnContinue.disabled = false;
        btnContinue.textContent = 'Continuar';
        
        // Limpa a tela da partida para a próxima vez
        commentaryBox.style.display = 'none';
        scoreboard.style.display = 'none';
        btnFinishMatchday.style.display = 'none';
    });
}