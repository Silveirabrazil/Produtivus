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

    // Normalização: aplicar Bootstrap nos botões dentro de Estudos
    function normalizeStudyButtons(root){
      const scope = root || document;
      const sel = 'button, input[type="button"], input[type="submit"], a[role="button"]';
      const items = (scope instanceof Element ? scope : document).querySelectorAll(sel);
      items.forEach(el=>{
        // pular tabs e controles que não devem ser estilizados como .btn
          if (el.classList.contains('estudos-tab') || el.classList.contains('tab') || el.closest('.estudos-tab, .tabs')) return;
          // pular controles de modal/Bootstrap que usam classes ou atributos próprios
          if (el.classList.contains('btn-close') || el.hasAttribute('data-bs-dismiss') || el.hasAttribute('data-bs-toggle') || el.closest('.modal')) return;
          // se o elemento já tem uma variante de btn (ex.: btn-outline-*, btn-danger) ou 'btn' presente, não sobrescrever
          const hasBtnVariant = Array.from(el.classList).some(c => c === 'btn' || c === 'btn-sm' || c.startsWith('btn-'));
          if (!hasBtnVariant) {
            el.classList.add('btn','btn-sm','btn-primary');
          }
      });
    }

    // aplicar imediatamente e observar mudanças dinâmicas
    try { normalizeStudyButtons(document.getElementById('main-content') || document); } catch {}
    try {
      const obsTarget = document.getElementById('main-content') || document.body;
      const mo = new MutationObserver(muts=>{
        for (const m of muts){
          for (const n of m.addedNodes){ if (n.nodeType === 1) normalizeStudyButtons(n); }
        }
      });
      mo.observe(obsTarget, { childList: true, subtree: true });
    } catch {}
  });
})();
