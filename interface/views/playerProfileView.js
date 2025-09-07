const formatCurrency = (value) => value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
const formatNumberInput = (input) => { let value = input.value.replace(/\D/g, ''); if(value) { value = new Intl.NumberFormat('pt-BR').format(value); } input.value = value; };

// A função agora aceita um parâmetro 'origin'
export async function showPlayerProfile(playerId, showView, origin = 'market') {
    const player = await window.api.getPlayerDetails(playerId);
    // Oculta a secção de transferências se não viemos do mercado
    const transferSection = document.getElementById('profile-transfer-section');
    if (origin === 'squad') {
        transferSection.style.display = 'none';
    } else {
        transferSection.style.display = 'block';
        const financeData = await window.api.getFinanceData();
        document.getElementById('profile-my-balance').textContent = formatCurrency(financeData.balance);
    }

    if (!player) return;

    document.getElementById('profile-player-name').textContent = `${player.name} (${player.position})`;
    document.getElementById('profile-club-name').textContent = player.club_name;
    document.getElementById('profile-age').textContent = player.age;
    document.getElementById('profile-position').textContent = player.position;
    document.getElementById('profile-nationality').textContent = player.nationality;
    document.getElementById('profile-wage').textContent = formatCurrency(player.wage);
    document.getElementById('profile-contract').textContent = player.contract_expires;
    document.getElementById('profile-market-value').textContent = formatCurrency(player.market_value);
// --- ATRIBUTOS TÉCNICOS ---
document.getElementById('profile-crossing').textContent = player.crossing;
document.getElementById('profile-dribbling').textContent = player.dribbling;
document.getElementById('profile-finishing').textContent = player.finishing;
document.getElementById('profile-free_kicks').textContent = player.free_kicks;
document.getElementById('profile-heading').textContent = player.heading;
document.getElementById('profile-long_shots').textContent = player.long_shots;
document.getElementById('profile-marking').textContent = player.marking;
document.getElementById('profile-tackling').textContent = player.tackling;
document.getElementById('profile-passing').textContent = player.passing;
document.getElementById('profile-penalties').textContent = player.penalties;

// --- ATRIBUTOS MENTAIS ---
document.getElementById('profile-aggression').textContent = player.aggression;
document.getElementById('profile-anticipation').textContent = player.anticipation;
document.getElementById('profile-composure').textContent = player.composure;
document.getElementById('profile-concentration').textContent = player.concentration;
document.getElementById('profile-decisions').textContent = player.decisions;
document.getElementById('profile-determination').textContent = player.determination;
document.getElementById('profile-leadership').textContent = player.leadership;
document.getElementById('profile-positioning').textContent = player.positioning;
document.getElementById('profile-vision').textContent = player.vision;
document.getElementById('profile-work_rate').textContent = player.work_rate;

// --- ATRIBUTOS FÍSICOS ---
document.getElementById('profile-acceleration').textContent = player.acceleration;
document.getElementById('profile-agility').textContent = player.agility;
document.getElementById('profile-balance').textContent = player.balance;
document.getElementById('profile-stamina').textContent = player.stamina;
document.getElementById('profile-strength').textContent = player.strength;
document.getElementById('profile-pace').textContent = player.pace;

    const offerInput = document.getElementById('profile-offer-amount');
    const offerButtonsContainer = document.getElementById('offer-suggestion-buttons');

    offerInput.value = '';
    document.getElementById('offer-response-message').textContent = '';
    offerButtonsContainer.innerHTML = '';

    const valueTiers = [0.8, 1.0, 1.2, 1.5];
    valueTiers.forEach(tier => {
        const offerValue = Math.round(player.market_value * tier);
        const button = document.createElement('button');
        button.textContent = offerValue.toLocaleString('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' });
        button.title = formatCurrency(offerValue);
        button.addEventListener('click', () => {
            offerInput.value = offerValue.toString();
            formatNumberInput(offerInput);
        });
        offerButtonsContainer.appendChild(button);
    });

    // Configura o botão "Voltar"
    const btnBack = document.getElementById('btn-back-from-profile');
    btnBack.onclick = () => showView(origin);

    showView('player_profile');
}