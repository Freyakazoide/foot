const leagueTable = document.getElementById('league-table');

export async function loadLeagueTable() {
    const tableData = await window.api.getLeagueTable();
    let html = `<thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>`;
    if (tableData) {
        tableData.forEach((row, index) => {
            html += `<tr>
                <td class="center">${index + 1}</td>
                <td>${row.club_name}</td>
                <td class="center"><b>${row.points}</b></td>
                <td class="center">${row.played}</td>
                <td class="center">${row.wins}</td>
                <td class="center">${row.draws}</td>
                <td class="center">${row.losses}</td>
                <td class="center">${row.goals_for}</td>
                <td class="center">${row.goals_against}</td>
                <td class="center">${row.goal_difference}</td>
            </tr>`;
        });
    }
    html += `</tbody>`;
    leagueTable.innerHTML = html;
}