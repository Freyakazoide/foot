import { showPlayerProfile } from './playerProfileView.js';

let searchNameInput, searchPositionSelect, btnSearchPlayers, searchResultsTable, btnBackToMarket;
let profileOfferAmount, btnMakeOffer, offerResponseMessage, btnAcceptDemands, btnRejectNegotiation;
let currentProfilePlayerId = null;
let currentNegotiation = null;
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumberInput = (input) => { let value = input.value.replace(/\D/g, ''); if(value){ value = new Intl.NumberFormat('pt-BR').format(value); } input.value = value; };

function displaySearchResults(players, showView) {
    let html = `<thead><tr><th>Nome</th><th>Idade</th><th>Posição</th><th>Clube</th><th>Salário</th></tr></thead><tbody>`;
    if (players && players.length > 0) {
        players.forEach(player => {
            html += `<tr class="player-row" data-player-id="${player.id}" style="cursor: pointer;"><td>${player.name}</td><td class="center">${player.age}</td><td>${player.position}</td><td>${player.club_name}</td><td>${formatCurrency(player.wage)}</td></tr>`;
        });
    } else {
        html += `<tr><td colspan="5" class="center">Nenhum jogador encontrado.</td></tr>`;
    }
    html += `</tbody>`;
    searchResultsTable.innerHTML = html;
    document.querySelectorAll('.player-row').forEach(row => {
        row.addEventListener('click', () => {
            showPlayerProfile(row.dataset.playerId, showView);
        });
    });
}

export function initMarketView(showView, refreshData) {
    searchNameInput = document.getElementById('search-name');
    searchPositionSelect = document.getElementById('search-position');
    btnSearchPlayers = document.getElementById('btn-search-players');
    searchResultsTable = document.getElementById('search-results-table');
    btnBackToMarket = document.getElementById('btn-back-to-market');
    profileOfferAmount = document.getElementById('profile-offer-amount');
    btnMakeOffer = document.getElementById('btn-make-offer');
    offerResponseMessage = document.getElementById('offer-response-message');
    btnAcceptDemands = document.getElementById('btn-accept-demands');
    btnRejectNegotiation = document.getElementById('btn-reject-negotiation');

    btnSearchPlayers.addEventListener('click', async () => {
        const filters = { name: searchNameInput.value, position: searchPositionSelect.value };
        searchResultsTable.innerHTML = `<tbody><tr><td colspan="5" class="center">Buscando...</td></tr></tbody>`;
        const players = await window.api.searchPlayers(filters);
        displaySearchResults(players, showView);
    });

    btnBackToMarket.addEventListener('click', () => { showView('market'); });

    profileOfferAmount.addEventListener('input', () => { formatNumberInput(profileOfferAmount); });

    btnMakeOffer.addEventListener('click', async () => {
        const offerAmount = parseFloat(profileOfferAmount.value.replace(/\./g, '').replace(',', '.'));
        if (isNaN(offerAmount) || offerAmount <= 0 || !currentProfilePlayerId) {
            offerResponseMessage.textContent = "Por favor, insira um valor válido.";
            offerResponseMessage.style.color = '#e5c07b';
            return;
        }
        btnMakeOffer.disabled = true;
        offerResponseMessage.textContent = 'Enviando proposta...';
        offerResponseMessage.style.color = '#abb2bf';
        const response = await window.api.makeTransferOffer(currentProfilePlayerId, offerAmount);
        if (response.success) {
            currentNegotiation = response.negotiation;
            document.getElementById('negotiation-player-name').textContent = currentNegotiation.playerName;
            document.getElementById('negotiation-fee').textContent = formatCurrency(currentNegotiation.transferFee);
            document.getElementById('negotiation-wage').textContent = formatCurrency(currentNegotiation.demandedWage) + " / mês";
            document.getElementById('negotiation-length').textContent = `${currentNegotiation.demandedLength} anos`;
            document.getElementById('negotiation-response-message').textContent = '';
            showView('negotiation');
        } else {
            offerResponseMessage.textContent = response.message;
            offerResponseMessage.style.color = '#e06c75';
        }
        btnMakeOffer.disabled = false;
    });

    btnAcceptDemands.addEventListener('click', async () => {
        if (!currentNegotiation) return;
        btnAcceptDemands.disabled = true;
        btnRejectNegotiation.disabled = true;
        const response = await window.api.finalizeTransfer(currentNegotiation);
        const messageEl = document.getElementById('negotiation-response-message');
        messageEl.textContent = response.message;
        messageEl.style.color = response.success ? '#98c379' : '#e06c75';
        if (response.success) {
            await refreshData.squad();
            await refreshData.finances();
        }
        setTimeout(() => {
            btnAcceptDemands.disabled = false;
            btnRejectNegotiation.disabled = false;
            showView('market');
        }, 2500);
    });

    btnRejectNegotiation.addEventListener('click', () => {
        currentNegotiation = null;
        showView('market');
    });
}