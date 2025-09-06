const financeBalance = document.getElementById('finance-balance');
const financeWages = document.getElementById('finance-wages');

const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function loadFinanceData() {
    const financeData = await window.api.getFinanceData();
    if (financeData) {
        financeBalance.textContent = formatCurrency(financeData.balance);
        financeWages.textContent = formatCurrency(financeData.totalWageBill);
    }
}