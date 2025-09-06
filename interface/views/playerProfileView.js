const formatCurrency = (value) => value ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
const formatNumberInput = (input) => { let value = input.value.replace(/\D/g, ''); if(value) { value = new Intl.NumberFormat('pt-BR').format(value); } input.value = value; };

export async function showPlayerProfile(playerId, showView) {
    const player = await window.api.getPlayerDetails(playerId);
    const financeData = await window.api.getFinanceData();
    if (!player) return;

    document.getElementById('profile-player-name').textContent = `${player.name} (${player.position})`;
    document.getElementById('profile-club-name').textContent = player.club_name;
    document.getElementById('profile-age').textContent = player.age;
    document.getElementById('profile-position').textContent = player.position;
    document.getElementById('profile-nationality').textContent = player.nationality;
    document.getElementById('profile-wage').textContent = formatCurrency(player.wage);
    document.getElementById('profile-contract').textContent = player.contract_expires;
    document.getElementById('profile-market-value').textContent = formatCurrency(player.market_value);
    document.getElementById('profile-my-balance').textContent = formatCurrency(financeData.balance);
    document.getElementById('profile-finishing').textContent = player.finishing;
    document.getElementById('profile-passing').textContent = player.passing;
    document.getElementById('profile-tackling').textContent = player.tackling;
    document.getElementById('profile-vision').textContent = player.vision;
    document.getElementById('profile-positioning').textContent = player.positioning;
    document.getElementById('profile-determination').textContent = player.determination;
    document.getElementById('profile-pace').textContent = player.pace;
    document.getElementById('profile-stamina').textContent = player.stamina;
    document.getElementById('profile-strength').textContent = player.strength;
    
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
    
    showView('player_profile');
}