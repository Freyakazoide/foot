const fixturesTable = document.getElementById('fixtures-table');

export async function loadFixtures() {
    const fixturesData = await window.api.getFixtures();
    let html = `<thead><tr><th>Rodada</th><th>Time da Casa</th><th>Placar</th><th>Time Visitante</th></tr></thead><tbody>`;
    let currentRound = 0;
    if (fixturesData) {
        fixturesData.forEach(row => {
            if(row.round > currentRound) {
                currentRound = row.round;
                html += `<tr><td colspan="4" style="background-color: #323842; font-weight: bold; text-align: center;">Rodada ${currentRound}</td></tr>`;
            }
            const score = (row.is_played) ? `${row.home_goals} - ${row.away_goals}` : 'vs';
            const homeWeight = (row.home_goals > row.away_goals) ? 'bold' : 'normal';
            const awayWeight = (row.away_goals > row.home_goals) ? 'bold' : 'normal';
            html += `<tr>
                <td class="center">${row.round}</td>
                <td style="font-weight: ${homeWeight};">${row.home_team}</td>
                <td class="center">${score}</td>
                <td style="font-weight: ${awayWeight};">${row.away_team}</td>
            </tr>`;
        });
    }
    html += `</tbody>`;
    fixturesTable.innerHTML = html;
}