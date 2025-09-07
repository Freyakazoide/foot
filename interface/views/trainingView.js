export function initTrainingView() {
    const trainingSelect = document.getElementById('training-focus-select');
    const statusMessage = document.getElementById('training-save-status');
    const reportContent = document.getElementById('training-report-content');

    async function loadTrainingFocus() {
        const focus = await window.api.getTrainingFocus();
        if (focus) {
            trainingSelect.value = focus;
        }
    }

async function displayTrainingReport() {
        const report = await window.api.getLastTrainingReport();
        if (report && report.length > 0) {
            let html = '<ul>';
            report.forEach(item => {
                const ha_change = item.new_ha - item.old_ha;
                const ha_style = ha_change > 0 ? 'color: #98c379;' : 'color: #e06c75;';
                const ha_symbol = ha_change > 0 ? '▲' : '▼';

                html += `<li style="margin-bottom: 10px;"><b>${item.player_name}</b>`;
                html += ` (HA: ${item.old_ha} -> ${item.new_ha} <span style="${ha_style}">${ha_symbol} ${Math.abs(ha_change)}</span>)`;
                
                let changes_detail = item.changes.map(c => {
                    const change_style = c.new_value > c.old_value ? 'color: #98c379;' : 'color: #e06c75;';
                    return `<span style="${change_style}">${c.attribute.charAt(0).toUpperCase() + c.attribute.slice(1)} ${c.new_value}</span>`;
                }).join(', ');

                html += `<br><small style="color: #abb2bf;">${changes_detail}</small></li>`;
            });
            html += '</ul>';
            reportContent.innerHTML = html;
        }
    }

    // Adiciona um listener para o botão de treino para sempre verificar por um novo relatório
    document.getElementById('btn-training').addEventListener('click', displayTrainingReport);

    // Salva o novo foco de treino quando o usuário muda a seleção
    trainingSelect.addEventListener('change', async () => {
        const newFocus = trainingSelect.value;
        const response = await window.api.setTrainingFocus(newFocus);
        if (response.success) {
            statusMessage.textContent = "Foco de treino salvo!";
            setTimeout(() => statusMessage.textContent = "", 2000); // Limpa a mensagem após 2 segundos
        } else {
            statusMessage.textContent = "Erro ao salvar.";
            statusMessage.style.color = '#e06c75';
        }
    });

    loadTrainingFocus();
}