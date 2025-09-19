// Paleta de cores compartilhada (mesmo padrão da página de Planilhas)
// Disponibiliza globalmente para reutilização em menus de cor do editor e outros módulos.
(function(global){
  'use strict';
  const standard = ['#000000','#7f7f7f','#ffffff','#ff0000','#ffa500','#ffff00','#00ff00','#00b050','#00b0f0','#0000ff','#7030a0'];
  const base = [
    '#000000','#404040','#7f7f7f','#bfbfbf','#d9d9d9','#efefef','#ffffff',
    '#ffebee','#ffcdd2','#ef9a9a','#e57373','#ef5350','#f44336','#d32f2f','#b71c1c',
    '#fff3e0','#ffe0b2','#ffcc80','#ffb74d','#ffa726','#ff9800','#f57c00','#e65100',
    '#fffde7','#fff9c4','#fff59d','#fff176','#ffee58','#ffeb3b','#fbc02d','#f57f17',
    '#f1f8e9','#dcedc8','#c5e1a5','#aed581','#9ccc65','#8bc34a','#689f38','#33691e',
    '#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da','#00bcd4','#0097a7','#006064',
    '#e3f2fd','#bbdefb','#90caf9','#64b5f6','#42a5f5','#2196f3','#1976d2','#0d47a1',
    '#ede7f6','#d1c4e9','#b39ddb','#9575cd','#7e57c2','#673ab7','#5e35b1','#311b92'
  ];
  global.PVColorPalette = { base, standard };
})(window);
