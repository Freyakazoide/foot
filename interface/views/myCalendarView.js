const myFixturesTable = document.getElementById('my-fixtures-table');

function getDaysUntil(currentDateStr, matchDateStr) {
    const current = new Date(currentDateStr);
    const match = new Date(matchDateStr);
    current.setHours(0, 0, 0, 0);
    match.setHours(0, 0, 0, 0);
    
    const diffTime = match - current;
    if (diffTime < 0) return '';
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `<span style="color: #e5c07b;">É hoje!</span>`;
    if (diffDays === 1) return `Amanhã`;
    return `Em ${diffDays} dias`;
}

export async function loadMyFixtures() {
const response = await window.api.getMyFixtures();
    const { fixtures, currentDate, playerClubId, playerClubName } = response;

    let html = `<thead><tr><th>Confronto</th><th>Resultado</th></tr></thead><tbody>`;
    
    if (fixtures) {
        fixtures.forEach(row => {
            const isHome = row.home_club_id === playerClubId;
            const opponentName = isHome ? row.away_team : row.home_team;
            
            // Monta a string do confronto
            let matchupHtml = isHome 
                ? `<b>${playerClubName}</b> vs ${opponentName}`
                : `${opponentName} vs <b>${playerClubName}</b>`;

            const score = row.is_played ? `${row.home_goals} - ${row.away_goals}` : '-';
            
            let scoreStyle = '';
            if (row.is_played) {
                const homeWin = row.home_goals > row.away_goals;
                const awayWin = row.away_goals > row.home_goals;
                // LÓGICA DE VITÓRIA/DERROTA CORRIGIDA
                if ((isHome && homeWin) || (!isHome && awayWin)) {
                    scoreStyle = 'color: #98c379; font-weight: bold;'; // Vitória
                } else if ((isHome && awayWin) || (!isHome && homeWin)) {
                    scoreStyle = 'color: #e06c75;'; // Derrota
                } else {
                    scoreStyle = 'color: #e5c07b;'; // Empate
                }
            }

            const countdown = row.is_played ? '(Finalizado)' : getDaysUntil(currentDate, row.date);
            const date = new Date(row.date);
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            const formattedDate = date.toLocaleDateString('pt-BR');

            html += `
                <tr>
                    <td>
                        <div style="font-size: 0.8em; color: #abb2bf;">${formattedDate} (${isHome ? 'C' : 'F'})</div>
                        <div>${matchupHtml} (${countdown})</div>
                    </td>
                    <td class="center" style="${scoreStyle}; font-size: 1.2em; font-weight: bold;">
                        ${score}
                    </td>
                </tr>`;
        });
    }
    html += `</tbody>`;
    myFixturesTable.innerHTML = html;
}