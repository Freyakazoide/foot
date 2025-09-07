const formatCurrency = (value) => value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
const formatNumberInput = (input) => { let value = input.value.replace(/\D/g, ''); if(value) { value = new Intl.NumberFormat('pt-BR').format(value); } input.value = value; };

let previousPlayerDataCache = {}; // Usamos um cache para guardar os dados de vários jogadores

const attributeMap = {
    'profile-crossing': 'crossing', 'profile-dribbling': 'dribbling', 'profile-finishing': 'finishing',
    'profile-free_kicks': 'free_kicks', 'profile-heading': 'heading', 'profile-long_shots': 'long_shots',
    'profile-marking': 'marking', 'profile-tackling': 'tackling', 'profile-passing': 'passing',
    'profile-penalties': 'penalties', 'profile-aggression': 'aggression', 'profile-anticipation': 'anticipation',
    'profile-composure': 'composure', 'profile-concentration': 'concentration', 'profile-decisions': 'decisions',
    'profile-determination': 'determination', 'profile-leadership': 'leadership', 'profile-positioning': 'positioning',
    'profile-vision': 'vision', 'profile-work_rate': 'work_rate', 'profile-acceleration': 'acceleration',
    'profile-agility': 'agility', 'profile-balance': 'balance', 'profile-stamina': 'stamina',
    'profile-strength': 'strength', 'profile-pace': 'pace'
};

function setAttribute(elementId, newValue, currentPlayerId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let changeIndicator = '';
    const previousData = previousPlayerDataCache[currentPlayerId];

    if (previousData) {
        const attributeKey = attributeMap[elementId];
        const oldValue = previousData[attributeKey];
        if (newValue > oldValue) {
            changeIndicator = '<span class="attr-change attr-up">▲</span>';
        } else if (newValue < oldValue) {
            changeIndicator = '<span class="attr-change attr-down">▼</span>';
        }
    }
    element.parentElement.innerHTML = `<span id="${elementId}">${newValue}</span>${changeIndicator}`;
}

let currentProfilePlayerId = null;

export async function showPlayerProfile(playerId, showView, origin = 'market') {
    currentProfilePlayerId = parseInt(playerId);
    const player = await window.api.getPlayerDetails(playerId);
    
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
    
    Object.keys(attributeMap).forEach(elementId => {
        setAttribute(elementId, player[attributeMap[elementId]], currentProfilePlayerId);
    });
    
    // --- CORREÇÃO NA LÓGICA DAS SETAS ---
    // Atualiza o cache com os dados atuais DEPOIS de renderizar,
    // para que na PRÓXIMA vez que você abrir, a comparação seja feita contra estes dados.
    previousPlayerDataCache[player.id] = player;

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
    
    const btnBack = document.getElementById('btn-back-from-profile');
    btnBack.onclick = () => showView(origin);

    showView('player_profile');
}