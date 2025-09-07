const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPlayers: () => ipcRenderer.invoke('get-players'),
  runMatch: (fixtureId, homeId, awayId, formation, lineup) => ipcRenderer.invoke('run-match', { fixtureId, homeId, awayId, formation, lineup }),
  getLeagueTable: () => ipcRenderer.invoke('get-league-table'),
  getFixtures: () => ipcRenderer.invoke('get-fixtures'),
  getGameState: () => ipcRenderer.invoke('get-game-state'),
  advanceTime: () => ipcRenderer.invoke('advance-time'),
  getAllClubs: () => ipcRenderer.invoke('get-all-clubs'),
  startNewGame: (clubId) => ipcRenderer.invoke('start-new-game', { clubId }),
  getFinanceData: () => ipcRenderer.invoke('get-finance-data'),
  searchPlayers: (filters) => ipcRenderer.invoke('search-players', filters),
  getPlayerDetails: (playerId) => ipcRenderer.invoke('get-player-details', { playerId }),
  makeTransferOffer: (playerId, offerAmount) => ipcRenderer.invoke('make-transfer-offer', { playerId, offerAmount }),
  finalizeTransfer: (negotiationDetails) => ipcRenderer.invoke('finalize-transfer', { negotiationDetails }),
  generateNewWorld: () => ipcRenderer.invoke('generate-new-world')

});