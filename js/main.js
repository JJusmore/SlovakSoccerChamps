'use strict';
// Štart hry
window.addEventListener('DOMContentLoaded', () => {
  initUI();
});
window.addEventListener('beforeunload', () => {
  if (G && G.userTid >= 0 && !UI.match) saveGame();
});
