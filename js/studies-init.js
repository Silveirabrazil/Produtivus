// js/studies-init.js
// Monta as ferramentas de estudo na página Estudos: Timer e Flashcards
(function(){
  function ready(fn){ if (document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    const host = document.getElementById('studies-tools');
    if (!host) return;

  // criar slots (empilhados verticalmente)
  const col1 = document.createElement('div');
  const col2 = document.createElement('div');
    host.appendChild(col1); host.appendChild(col2);

    try { window.pvStudyTimer?.mount(col1); } catch{}
    try { window.pvFlashcards?.mount(col2); } catch{}

    // montar Central de Estudos (Atividades do dia + Cadernos por curso)
    try {
      const hubHost = document.getElementById('studies-hub');
      if (hubHost && window.pvStudiesHub?.mount) window.pvStudiesHub.mount(hubHost);
    } catch{}

    // (Removido) rotina de normalização de botões Bootstrap — design system próprio assume estilos
  });
})();
